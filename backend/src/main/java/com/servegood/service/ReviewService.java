package com.servegood.service;

import com.servegood.dto.PageResponse;
import com.servegood.dto.ReviewDtos.FoodRatingDto;
import com.servegood.dto.ReviewDtos.ModerationRequest;
import com.servegood.dto.ReviewDtos.ResponseRequest;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.dto.ReviewDtos.ReviewRequest;
import com.servegood.entity.FoodRating;
import com.servegood.entity.MenuItem;
import com.servegood.entity.Restaurant;
import com.servegood.entity.Review;
import com.servegood.entity.ReviewImage;
import com.servegood.entity.ReviewResponse;
import com.servegood.entity.User;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.ReviewMapper;
import com.servegood.repository.MenuItemRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.ReviewRepository;
import com.servegood.security.AuthUser;
import com.servegood.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reviews and their moderation.
 *
 * Rules: one live review per person per restaurant; diners' reviews start
 * PENDING and only VERIFIED reviews count towards ratings or appear publicly;
 * editing a review sends it back to PENDING; owners cannot review their own
 * restaurant; owners respond publicly but cannot change or hide reviews.
 */
@Service
public class ReviewService {

    public enum PublicSort { NEWEST, HIGHEST, LOWEST }

    private final ReviewRepository reviews;
    private final RestaurantRepository restaurants;
    private final MenuItemRepository menuItems;
    private final RestaurantService restaurantService;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final AuditLogService auditLog;

    public ReviewService(ReviewRepository reviews, RestaurantRepository restaurants, MenuItemRepository menuItems,
                         RestaurantService restaurantService, AccessGuard guard, CurrentUser currentUser,
                         NotificationService notifications, AuditLogService auditLog) {
        this.reviews = reviews;
        this.restaurants = restaurants;
        this.menuItems = menuItems;
        this.restaurantService = restaurantService;
        this.guard = guard;
        this.currentUser = currentUser;
        this.notifications = notifications;
        this.auditLog = auditLog;
    }

    // ------------------------------------------------------------------ public

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> publicReviews(Long restaurantId, PublicSort sort, int page, int size) {
        restaurants.findByIdAndDeletedAtIsNull(restaurantId).filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        Sort order = switch (sort == null ? PublicSort.NEWEST : sort) {
            case HIGHEST -> Sort.by(Sort.Direction.DESC, "overallRating", "createdAt");
            case LOWEST -> Sort.by(Sort.Direction.ASC, "overallRating").and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case NEWEST -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        var result = reviews.findByRestaurantIdAndStatusAndDeletedAtIsNull(restaurantId, ReviewStatus.VERIFIED,
                PageRequest.of(page, size, order));
        return PageResponse.of(result, r -> ReviewMapper.toDto(r, false));
    }

    // ------------------------------------------------------------------ consumer

    @Transactional
    public ReviewDto create(Long restaurantId, ReviewRequest request) {
        User user = currentUser.entity();
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId).filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        if (guard.isOwner(restaurantId)) {
            throw ApiException.forbidden("You cannot review a restaurant you manage");
        }
        if (reviews.existsByUserIdAndRestaurantIdAndDeletedAtIsNull(user.getId(), restaurantId)) {
            throw ApiException.conflict("You have already reviewed this restaurant. Edit your existing review instead.");
        }
        Review review = new Review();
        review.setRestaurant(r);
        review.setUser(user);
        // A reviewer writing during an assigned visit is already an accountable, verified source.
        boolean reviewerVisit = user.hasRole(RoleName.REVIEWER) && isAssigned(restaurantId);
        review.setReviewerReview(reviewerVisit);
        apply(review, request);
        review.setStatus(reviewerVisit ? ReviewStatus.VERIFIED : ReviewStatus.PENDING);
        if (reviewerVisit) {
            review.setModeratedAt(Instant.now());
            review.setModeratedBy(user);
        }
        reviews.save(review);
        auditLog.record("REVIEW_CREATED", "REVIEW", review.getId(), "restaurant=" + restaurantId + " status=" + review.getStatus());
        notifications.notify(user, NotificationType.REVIEW_SUBMITTED, "Review received",
                reviewerVisit ? "Your reviewer review of " + r.getName() + " is published."
                        : "Your review of " + r.getName() + " is waiting for moderation. We will let you know when it is published.",
                "/dashboard/reviews");
        if (reviewerVisit) {
            restaurantService.recomputeRatings(restaurantId);
            notifyOwnersOfNewReview(review);
        }
        return ReviewMapper.toDto(review, true);
    }

    private boolean isAssigned(Long restaurantId) {
        try {
            guard.requireAssignedReviewer(restaurantId);
            return true;
        } catch (ApiException e) {
            return false;
        }
    }

    @Transactional
    public ReviewDto update(Long reviewId, ReviewRequest request) {
        // Any status may be edited, including REJECTED: an edit is how a diner fixes a review.
        Review review = ownReview(reviewId);
        boolean wasVerified = review.getStatus() == ReviewStatus.VERIFIED;
        apply(review, request);
        if (!review.isReviewerReview()) {
            review.setStatus(ReviewStatus.PENDING);
            review.setModerationNote(null);
            review.setModeratedAt(null);
            review.setModeratedBy(null);
        }
        auditLog.record("REVIEW_UPDATED", "REVIEW", review.getId(), "status=" + review.getStatus());
        if (wasVerified) {
            restaurantService.recomputeRatings(review.getRestaurant().getId());
        }
        return ReviewMapper.toDto(review, true);
    }

    @Transactional
    public void delete(Long reviewId) {
        AuthUser user = currentUser.require();
        Review review = reviews.findByIdAndDeletedAtIsNull(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        if (!review.getUser().getId().equals(user.id()) && !user.isAdmin()) {
            throw ApiException.forbidden("You can only delete your own reviews");
        }
        boolean wasVerified = review.getStatus() == ReviewStatus.VERIFIED;
        review.setDeletedAt(Instant.now());
        auditLog.record("REVIEW_DELETED", "REVIEW", review.getId(), null);
        if (wasVerified) {
            restaurantService.recomputeRatings(review.getRestaurant().getId());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> mine(int page, int size) {
        var result = reviews.findByUserIdAndDeletedAtIsNull(currentUser.id(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(result, r -> ReviewMapper.toDto(r, true));
    }

    @Transactional(readOnly = true)
    public ReviewDto myReviewFor(Long restaurantId) {
        Long userId = currentUser.id();
        Specification<Review> spec = (root, q, cb) -> cb.and(
                cb.equal(root.get("user").get("id"), userId),
                cb.equal(root.get("restaurant").get("id"), restaurantId),
                cb.isNull(root.get("deletedAt")));
        return reviews.findOne(spec).map(r -> ReviewMapper.toDto(r, true)).orElse(null);
    }

    private Review ownReview(Long reviewId) {
        Review review = reviews.findByIdAndDeletedAtIsNull(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        if (!review.getUser().getId().equals(currentUser.id())) {
            throw ApiException.forbidden("You can only edit your own reviews");
        }
        return review;
    }

    private void apply(Review review, ReviewRequest r) {
        review.setOverallRating(r.overallRating());
        review.setFoodRating(r.foodRating());
        review.setServiceRating(r.serviceRating());
        review.setHygieneRating(r.hygieneRating());
        review.setTitle(r.title() == null || r.title().isBlank() ? null : r.title().trim());
        review.setComment(r.comment().trim());
        review.setVisitDate(r.visitDate());

        review.getImages().clear();
        if (r.imageUrls() != null) {
            for (String url : r.imageUrls()) {
                ReviewImage img = new ReviewImage();
                img.setReview(review);
                img.setUrl(url);
                review.getImages().add(img);
            }
        }
        review.getFoodRatings().clear();
        if (r.foodRatings() != null) {
            for (FoodRatingDto f : r.foodRatings()) {
                FoodRating fr = new FoodRating();
                fr.setReview(review);
                fr.setDishName(f.dishName().trim());
                fr.setRating(f.rating());
                if (f.menuItemId() != null) {
                    MenuItem item = menuItems.findByIdAndDeletedAtIsNull(f.menuItemId())
                            .filter(i -> i.getRestaurant().getId().equals(review.getRestaurant().getId()))
                            .orElseThrow(() -> ApiException.badRequest("Dish is not on this restaurant's menu"));
                    fr.setMenuItem(item);
                }
                review.getFoodRatings().add(fr);
            }
        }
    }

    // ------------------------------------------------------------------ moderation (reviewer/admin)

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> moderationQueue(ReviewStatus status, Long restaurantId, String q, int page, int size) {
        Specification<Review> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isNull(root.get("deletedAt")));
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (restaurantId != null) {
                p.add(cb.equal(root.get("restaurant").get("id"), restaurantId));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("comment")), like),
                        cb.like(cb.lower(root.get("restaurant").get("name")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Sort sort = status == ReviewStatus.PENDING || status == ReviewStatus.FLAGGED
                ? Sort.by(Sort.Direction.ASC, "createdAt")
                : Sort.by(Sort.Direction.DESC, "createdAt");
        return PageResponse.of(reviews.findAll(spec, PageRequest.of(page, size, sort)), r -> ReviewMapper.toDto(r, true));
    }

    @Transactional
    public ReviewDto moderate(Long reviewId, ModerationRequest request) {
        AuthUser moderator = currentUser.require();
        if (!moderator.isAdmin() && !moderator.has(RoleName.REVIEWER)) {
            throw ApiException.forbidden("Only reviewers and admins can moderate reviews");
        }
        if (request.status() == ReviewStatus.PENDING) {
            throw ApiException.badRequest("Choose VERIFIED, REJECTED or FLAGGED");
        }
        if (request.status() != ReviewStatus.VERIFIED && (request.note() == null || request.note().isBlank())) {
            throw ApiException.badRequest("Add a note explaining the decision");
        }
        Review review = reviews.findByIdAndDeletedAtIsNull(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        if (review.getUser().getId().equals(moderator.id())) {
            throw ApiException.forbidden("You cannot moderate your own review");
        }
        ReviewStatus before = review.getStatus();
        review.setStatus(request.status());
        review.setModerationNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        review.setModeratedAt(Instant.now());
        review.setModeratedBy(currentUser.entity());
        auditLog.record("REVIEW_MODERATED", "REVIEW", review.getId(), before + " -> " + review.getStatus());

        if (before == ReviewStatus.VERIFIED || review.getStatus() == ReviewStatus.VERIFIED) {
            restaurantService.recomputeRatings(review.getRestaurant().getId());
        }
        String restaurantName = review.getRestaurant().getName();
        switch (review.getStatus()) {
            case VERIFIED -> {
                notifications.notify(review.getUser(), NotificationType.REVIEW_APPROVED, "Your review is published",
                        "Your review of " + restaurantName + " passed moderation and now counts towards its rating.",
                        "/restaurants/" + review.getRestaurant().getId());
                if (before != ReviewStatus.VERIFIED) {
                    notifyOwnersOfNewReview(review);
                }
            }
            case REJECTED -> notifications.notify(review.getUser(), NotificationType.REVIEW_REJECTED,
                    "Your review was not published",
                    "Your review of " + restaurantName + " was not published: " + review.getModerationNote()
                            + " You can edit it and resubmit.",
                    "/dashboard/reviews");
            case FLAGGED -> notifications.notify(review.getUser(), NotificationType.REVIEW_FLAGGED,
                    "Your review is under review",
                    "Your review of " + restaurantName + " was flagged for a closer look: " + review.getModerationNote(),
                    "/dashboard/reviews");
            default -> { }
        }
        return ReviewMapper.toDto(review, true);
    }

    private void notifyOwnersOfNewReview(Review review) {
        notifications.notifyOwners(review.getRestaurant().getId(), NotificationType.NEW_REVIEW_FOR_RESTAURANT,
                "New " + review.getOverallRating() + "-star review",
                "A verified review of " + review.getRestaurant().getName() + " was published.",
                "/restaurant-dashboard/reviews?restaurant=" + review.getRestaurant().getId());
    }

    // ------------------------------------------------------------------ owner

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> forRestaurant(Long restaurantId, ReviewStatus status, Boolean unanswered, int page, int size) {
        guard.managedRestaurant(restaurantId);
        Specification<Review> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isNull(root.get("deletedAt")));
            p.add(cb.equal(root.get("restaurant").get("id"), restaurantId));
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (Boolean.TRUE.equals(unanswered)) {
                p.add(cb.isNull(root.join("response", jakarta.persistence.criteria.JoinType.LEFT).get("id")));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(reviews.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                r -> ReviewMapper.toDto(r, false));
    }

    /** Owners respond publicly to VERIFIED reviews. Calling again edits the response. */
    @Transactional
    public ReviewDto respond(Long reviewId, ResponseRequest request) {
        Review review = reviews.findByIdAndDeletedAtIsNull(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        guard.managedRestaurant(review.getRestaurant().getId());
        if (review.getStatus() != ReviewStatus.VERIFIED) {
            throw ApiException.badRequest("You can respond once the review is published");
        }
        boolean first = review.getResponse() == null;
        ReviewResponse resp = first ? new ReviewResponse() : review.getResponse();
        resp.setReview(review);
        resp.setResponder(currentUser.entity());
        resp.setBody(request.body().trim());
        review.setResponse(resp);
        auditLog.record(first ? "REVIEW_RESPONSE_CREATED" : "REVIEW_RESPONSE_UPDATED", "REVIEW", review.getId(), null);
        if (first) {
            notifications.notify(review.getUser(), NotificationType.OWNER_RESPONSE,
                    review.getRestaurant().getName() + " replied to your review", truncate(resp.getBody()),
                    "/restaurants/" + review.getRestaurant().getId());
        }
        return ReviewMapper.toDto(review, false);
    }

    @Transactional
    public ReviewDto deleteResponse(Long reviewId) {
        Review review = reviews.findByIdAndDeletedAtIsNull(reviewId).orElseThrow(() -> ApiException.notFound("Review"));
        guard.managedRestaurant(review.getRestaurant().getId());
        review.setResponse(null);
        auditLog.record("REVIEW_RESPONSE_DELETED", "REVIEW", review.getId(), null);
        return ReviewMapper.toDto(review, false);
    }

    private static String truncate(String s) {
        return s.length() > 200 ? s.substring(0, 199) + "…" : s;
    }
}
