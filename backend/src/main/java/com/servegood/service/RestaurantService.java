package com.servegood.service;

import com.servegood.dto.DashboardDtos.PlatformStatsDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.AdminRestaurantDto;
import com.servegood.dto.RestaurantDtos.ImageDto;
import com.servegood.dto.RestaurantDtos.OpeningHoursDto;
import com.servegood.dto.RestaurantDtos.OwnerRef;
import com.servegood.dto.RestaurantDtos.RestaurantDetailDto;
import com.servegood.dto.RestaurantDtos.RestaurantRequest;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.dto.RestaurantDtos.StatusChangeRequest;
import com.servegood.entity.HygieneAudit;
import com.servegood.entity.OpeningHours;
import com.servegood.entity.Restaurant;
import com.servegood.entity.RestaurantAddress;
import com.servegood.entity.RestaurantCategory;
import com.servegood.entity.RestaurantImage;
import com.servegood.entity.RestaurantOwner;
import com.servegood.entity.RestaurantView;
import com.servegood.entity.User;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.RestaurantStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.RestaurantMapper;
import com.servegood.mapper.RestaurantMapper.Context;
import com.servegood.repository.FavoriteRepository;
import com.servegood.repository.HygieneAuditRepository;
import com.servegood.repository.RestaurantCategoryRepository;
import com.servegood.repository.RestaurantOwnerRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.RestaurantSearchRepository;
import com.servegood.repository.RestaurantSearchRepository.Criteria;
import com.servegood.repository.RestaurantViewRepository;
import com.servegood.repository.ReviewRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.AuthUser;
import com.servegood.security.CurrentUser;
import com.servegood.service.delivery.DeliveryService;
import com.servegood.service.support.Slugs;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantService {

    private final RestaurantRepository restaurants;
    private final RestaurantSearchRepository search;
    private final RestaurantCategoryRepository categories;
    private final RestaurantOwnerRepository owners;
    private final RestaurantViewRepository views;
    private final ReviewRepository reviews;
    private final HygieneAuditRepository audits;
    private final FavoriteRepository favorites;
    private final UserRepository users;
    private final DeliveryService delivery;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final AuditLogService auditLog;
    private final Clock clock;

    public RestaurantService(RestaurantRepository restaurants, RestaurantSearchRepository search,
                             RestaurantCategoryRepository categories, RestaurantOwnerRepository owners,
                             RestaurantViewRepository views, ReviewRepository reviews, HygieneAuditRepository audits,
                             FavoriteRepository favorites, UserRepository users, DeliveryService delivery,
                             AccessGuard guard, CurrentUser currentUser, NotificationService notifications,
                             AuditLogService auditLog, Clock clock) {
        this.restaurants = restaurants;
        this.search = search;
        this.categories = categories;
        this.owners = owners;
        this.views = views;
        this.reviews = reviews;
        this.audits = audits;
        this.favorites = favorites;
        this.users = users;
        this.delivery = delivery;
        this.guard = guard;
        this.currentUser = currentUser;
        this.notifications = notifications;
        this.auditLog = auditLog;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ public

    @Transactional(readOnly = true)
    public PageResponse<RestaurantSummaryDto> search(SearchParams p) {
        LocalDateTime now = LocalDateTime.now(clock);
        Criteria criteria = new Criteria(p.q(), p.categories(), p.minPrice(), p.maxPrice(), p.minRating(),
                p.minFoodRating(), p.minHygiene(), p.verified(), p.delivery(), p.openNow(), p.locality(), p.lat(), p.lng(),
                p.radiusKm(), p.sort(), now.toLocalDate(), now);
        var result = search.search(criteria, p.page(), p.size());
        List<Long> ids = result.hits().stream().map(RestaurantSearchRepository.Hit::id).toList();
        Map<Long, Double> distances = result.hits().stream()
                .filter(h -> h.distanceKm() != null)
                .collect(Collectors.toMap(RestaurantSearchRepository.Hit::id, RestaurantSearchRepository.Hit::distanceKm));
        List<RestaurantSummaryDto> content = summaries(ids, distances);
        return PageResponse.of(content, p.page(), p.size(), result.total());
    }

    /** Public search parameters, already validated and clamped by the controller. */
    public record SearchParams(
            String q, List<String> categories, Integer minPrice, Integer maxPrice, BigDecimal minRating,
            BigDecimal minFoodRating, Integer minHygiene, boolean verified, boolean delivery, boolean openNow,
            String locality, Double lat, Double lng, Double radiusKm, RestaurantSearchRepository.Sort sort,
            int page, int size) {}

    /** Loads restaurants by id, keeping the given order, and maps them with full context. */
    @Transactional(readOnly = true)
    public List<RestaurantSummaryDto> summaries(List<Long> ids, Map<Long, Double> distances) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Restaurant> byId = restaurants.findAllWithSummaryByIdIn(ids).stream()
                .collect(Collectors.toMap(Restaurant::getId, Function.identity()));
        Context ctx = context(ids, distances);
        return ids.stream().map(byId::get).filter(r -> r != null).map(r -> RestaurantMapper.toSummary(r, ctx)).toList();
    }

    public Context context(Collection<Long> ids, Map<Long, Double> distances) {
        LocalDateTime now = LocalDateTime.now(clock);
        Set<Long> favs = currentUser.optional()
                .map(u -> (Set<Long>) new HashSet<>(favorites.findFavoritedIds(u.id(), ids)))
                .orElse(null);
        return new Context(now.toLocalDate(), now, favs, delivery.highlights(ids), distances);
    }

    @Transactional
    public RestaurantDetailDto getPublic(String idOrSlug) {
        Restaurant r = resolve(idOrSlug);
        boolean canSeeUnpublished = currentUser.optional()
                .map(u -> u.isAdmin() || guard.isOwner(r.getId()))
                .orElse(false);
        if (!r.isPublic() && !canSeeUnpublished) {
            throw ApiException.notFound("Restaurant");
        }
        if (r.isPublic()) {
            recordView(r);
        }
        return detail(r);
    }

    private Restaurant resolve(String idOrSlug) {
        if (idOrSlug.chars().allMatch(Character::isDigit)) {
            return restaurants.findByIdAndDeletedAtIsNull(Long.valueOf(idOrSlug))
                    .orElseThrow(() -> ApiException.notFound("Restaurant"));
        }
        Specification<Restaurant> bySlug = (root, q, cb) ->
                cb.and(cb.equal(root.get("slug"), idOrSlug), cb.isNull(root.get("deletedAt")));
        return restaurants.findOne(bySlug).orElseThrow(() -> ApiException.notFound("Restaurant"));
    }

    private void recordView(Restaurant r) {
        RestaurantView v = new RestaurantView();
        v.setRestaurant(r);
        currentUser.optional().ifPresent(u -> v.setUser(users.getReferenceById(u.id())));
        views.save(v);
        restaurants.incrementViewCount(r.getId());
    }

    RestaurantDetailDto detail(Restaurant r) {
        Map<Integer, Long> distribution = new TreeMap<>();
        for (int stars = 1; stars <= 5; stars++) {
            distribution.put(stars, 0L);
        }
        reviews.ratingDistribution(r.getId()).forEach(row -> distribution.put(((Number) row[0]).intValue(), (Long) row[1]));
        LocalDate lastAudit = audits
                .findByRestaurantIdAndStatusInOrderByAuditDateDescIdDesc(r.getId(), List.of(AuditStatus.APPROVED, AuditStatus.EXPIRED))
                .stream().findFirst().map(HygieneAudit::getAuditDate).orElse(null);
        return RestaurantMapper.toDetail(r, context(List.of(r.getId()), null), distribution, lastAudit);
    }

    @Transactional(readOnly = true)
    public PlatformStatsDto platformStats() {
        LocalDate today = LocalDate.now(clock);
        Specification<Restaurant> live = (root, q, cb) ->
                cb.and(cb.equal(root.get("status"), RestaurantStatus.APPROVED), cb.isNull(root.get("deletedAt")));
        List<Restaurant> all = restaurants.findAll(live);
        long verified = all.stream().filter(r -> r.isHygieneVerified(today)).count();
        long verifiedReviews = reviews.countByStatusAndDeletedAtIsNull(com.servegood.entity.enums.ReviewStatus.VERIFIED);
        List<String> localities = all.stream()
                .map(Restaurant::getAddress).filter(a -> a != null).map(RestaurantAddress::getLocality)
                .distinct().sorted().toList();
        return new PlatformStatsDto(all.size(), verified, verifiedReviews, localities);
    }

    // ------------------------------------------------------------------ owner / admin management

    @Transactional(readOnly = true)
    public List<RestaurantSummaryDto> mine() {
        List<Long> ids = owners.findByUserIdWithRestaurant(currentUser.id()).stream()
                .map(o -> o.getRestaurant().getId()).toList();
        return summaries(ids, null);
    }

    @Transactional(readOnly = true)
    public List<AdminRestaurantDto> mineWithStatus() {
        return owners.findByUserIdWithRestaurant(currentUser.id()).stream()
                .map(o -> adminDto(o.getRestaurant()))
                .toList();
    }

    @Transactional(readOnly = true)
    public RestaurantDetailDto getManaged(Long id) {
        return detail(guard.managedRestaurant(id));
    }

    @Transactional
    public RestaurantDetailDto create(RestaurantRequest request) {
        AuthUser user = currentUser.require();
        if (!user.isAdmin() && !user.has(RoleName.RESTAURANT_OWNER)) {
            throw ApiException.forbidden("Only restaurant owners can add restaurants");
        }
        Restaurant r = new Restaurant();
        r.setSlug(Slugs.unique(request.name(), restaurants::existsBySlug));
        apply(r, request);
        // Owners' listings wait for admin approval; admins publish directly.
        r.setStatus(user.isAdmin() ? RestaurantStatus.APPROVED : RestaurantStatus.PENDING_APPROVAL);
        restaurants.save(r);
        if (user.has(RoleName.RESTAURANT_OWNER)) {
            RestaurantOwner link = new RestaurantOwner();
            link.setRestaurant(r);
            link.setUser(users.getReferenceById(user.id()));
            owners.save(link);
        }
        auditLog.record("RESTAURANT_CREATED", "RESTAURANT", r.getId(), r.getName() + " status=" + r.getStatus());
        if (r.getStatus() == RestaurantStatus.PENDING_APPROVAL) {
            notifications.notifyRole(RoleName.ADMIN, NotificationType.SYSTEM, "New restaurant awaiting approval",
                    r.getName() + " was submitted for listing.", "/admin/restaurants?status=PENDING_APPROVAL");
        }
        return detail(r);
    }

    @Transactional
    public RestaurantDetailDto update(Long id, RestaurantRequest request) {
        Restaurant r = guard.managedRestaurant(id);
        apply(r, request);
        auditLog.record("RESTAURANT_UPDATED", "RESTAURANT", r.getId(), r.getName());
        return detail(r);
    }

    @Transactional
    public void delete(Long id) {
        Restaurant r = guard.managedRestaurant(id);
        r.setDeletedAt(Instant.now());
        auditLog.record("RESTAURANT_DELETED", "RESTAURANT", r.getId(), r.getName());
    }

    private void apply(Restaurant r, RestaurantRequest req) {
        r.setName(req.name().trim());
        r.setDescription(blank(req.description()));
        r.setPhone(blank(req.phone()));
        r.setEmail(blank(req.email()));
        r.setWebsite(blank(req.website()));
        r.setPriceLevel(req.priceLevel());
        r.setCostForTwo(req.costForTwo());
        r.setCoverImageUrl(blank(req.coverImageUrl()));
        r.setComparisonBasket(blank(req.comparisonBasket()));

        RestaurantAddress a = r.getAddress() == null ? new RestaurantAddress() : r.getAddress();
        var ad = req.address();
        a.setLine1(ad.line1().trim());
        a.setLine2(blank(ad.line2()));
        a.setLocality(ad.locality().trim());
        a.setCity(ad.city().trim());
        a.setState(ad.state().trim());
        a.setPostalCode(blank(ad.postalCode()));
        a.setCountry(ad.country() == null || ad.country().isBlank() ? "India" : ad.country().trim());
        a.setLatitude(scale6(ad.latitude()));
        a.setLongitude(scale6(ad.longitude()));
        r.setAddress(a);

        if (req.categoryIds() != null) {
            List<RestaurantCategory> found = categories.findAllById(req.categoryIds());
            if (found.size() != new HashSet<>(req.categoryIds()).size()) {
                throw ApiException.badRequest("One or more categories do not exist");
            }
            r.getCategories().clear();
            r.getCategories().addAll(found);
        }

        if (req.openingHours() != null) {
            r.getOpeningHours().clear();
            for (OpeningHoursDto h : req.openingHours()) {
                LocalTime opens = LocalTime.parse(h.opensAt());
                LocalTime closes = LocalTime.parse(h.closesAt());
                if (opens.equals(closes)) {
                    throw ApiException.badRequest("Opening and closing time cannot be the same");
                }
                OpeningHours oh = new OpeningHours();
                oh.setRestaurant(r);
                oh.setDayOfWeek(h.dayOfWeek());
                oh.setOpensAt(opens);
                oh.setClosesAt(closes);
                r.getOpeningHours().add(oh);
            }
        }

        if (req.images() != null) {
            if (req.images().size() > 12) {
                throw ApiException.badRequest("Up to 12 photos per restaurant");
            }
            r.getImages().clear();
            int order = 0;
            for (ImageDto i : req.images()) {
                RestaurantImage img = new RestaurantImage();
                img.setRestaurant(r);
                img.setUrl(i.url());
                img.setAltText(blank(i.altText()));
                img.setSortOrder(i.sortOrder() == null ? order : i.sortOrder());
                order++;
                r.getImages().add(img);
            }
            if (r.getCoverImageUrl() == null && !r.getImages().isEmpty()) {
                r.setCoverImageUrl(r.getImages().get(0).getUrl());
            }
        }
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public PageResponse<AdminRestaurantDto> adminSearch(String q, RestaurantStatus status, int page, int size) {
        Specification<Restaurant> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isNull(root.get("deletedAt")));
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                Join<Restaurant, RestaurantAddress> a = root.join("address", JoinType.LEFT);
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(a.get("locality")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        var result = restaurants.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(result, this::adminDto);
    }

    private AdminRestaurantDto adminDto(Restaurant r) {
        Context ctx = context(List.of(r.getId()), null);
        List<OwnerRef> ownerRefs = owners.findByRestaurantIdWithUser(r.getId()).stream()
                .map(o -> new OwnerRef(o.getUser().getId(), o.getUser().getFullName(), o.getUser().getEmail()))
                .toList();
        return new AdminRestaurantDto(RestaurantMapper.toSummary(r, ctx), r.getStatus(), r.getStatusReason(), ownerRefs,
                r.getViewCount(), r.getCreatedAt());
    }

    @Transactional
    public AdminRestaurantDto changeStatus(Long id, StatusChangeRequest request) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> ApiException.notFound("Restaurant"));
        if ((request.status() == RestaurantStatus.REJECTED || request.status() == RestaurantStatus.SUSPENDED)
                && (request.reason() == null || request.reason().isBlank())) {
            throw ApiException.badRequest("Give a reason so the owner knows what to fix");
        }
        RestaurantStatus before = r.getStatus();
        r.setStatus(request.status());
        r.setStatusReason(blank(request.reason()));
        auditLog.record("RESTAURANT_STATUS_CHANGED", "RESTAURANT", r.getId(), before + " -> " + r.getStatus());
        switch (request.status()) {
            case APPROVED -> notifications.notifyOwners(r.getId(), NotificationType.RESTAURANT_APPROVED,
                    r.getName() + " is now listed", "Your restaurant is approved and visible to diners.",
                    "/restaurants/" + r.getId());
            case REJECTED, SUSPENDED -> notifications.notifyOwners(r.getId(), NotificationType.RESTAURANT_REJECTED,
                    r.getName() + " was " + request.status().name().toLowerCase(), request.reason(),
                    "/restaurant-dashboard/profile?restaurant=" + r.getId());
            default -> { }
        }
        return adminDto(r);
    }

    @Transactional
    public AdminRestaurantDto assignOwner(Long id, String email) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> ApiException.notFound("Restaurant"));
        User user = users.findByEmailIgnoreCase(AuthService.normalizeEmail(email))
                .filter(User::isActive)
                .orElseThrow(() -> ApiException.notFound("User with that email"));
        if (!user.hasRole(RoleName.RESTAURANT_OWNER)) {
            throw ApiException.badRequest("That account is not a restaurant owner account");
        }
        if (!owners.existsByRestaurantIdAndUserId(id, user.getId())) {
            RestaurantOwner link = new RestaurantOwner();
            link.setRestaurant(r);
            link.setUser(user);
            owners.save(link);
            auditLog.record("RESTAURANT_OWNER_ADDED", "RESTAURANT", id, user.getEmail());
        }
        return adminDto(r);
    }

    // ------------------------------------------------------------------ ratings

    /**
     * Recomputes the genuine rating aggregates from VERIFIED reviews. This is the
     * only writer of these columns; advertising code never calls it.
     */
    @Transactional
    public void recomputeRatings(Long restaurantId) {
        Restaurant r = restaurants.findById(restaurantId).orElseThrow();
        Object[] row = reviews.verifiedAggregates(restaurantId);
        Object[] agg = row.length == 1 && row[0] instanceof Object[] nested ? nested : row;
        long count = agg[4] == null ? 0 : ((Number) agg[4]).longValue();
        r.setReviewCount((int) count);
        r.setAvgOverall(count == 0 ? null : avg(agg[0]));
        r.setAvgFood(count == 0 ? null : avg(agg[1]));
        r.setAvgService(count == 0 ? null : avg(agg[2]));
        r.setAvgHygiene(count == 0 ? null : avg(agg[3]));
    }

    private static BigDecimal avg(Object v) {
        return v == null ? null : BigDecimal.valueOf(((Number) v).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal scale6(BigDecimal v) {
        return v == null ? null : v.setScale(6, RoundingMode.HALF_UP);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
