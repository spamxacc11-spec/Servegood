package com.servegood.service;

import com.servegood.config.AppProperties;
import com.servegood.dto.AdDtos.CampaignDecisionRequest;
import com.servegood.dto.AdDtos.CampaignDto;
import com.servegood.dto.AdDtos.CampaignRequest;
import com.servegood.dto.AdDtos.PlacementRequest;
import com.servegood.dto.AdDtos.RateCardDto;
import com.servegood.dto.AdDtos.SponsoredDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.entity.Advertisement;
import com.servegood.entity.AdvertisementCampaign;
import com.servegood.entity.Restaurant;
import com.servegood.entity.enums.AdPlacement;
import com.servegood.entity.enums.CampaignStatus;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.PaymentStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.AdMapper;
import com.servegood.repository.AdvertisementCampaignRepository;
import com.servegood.repository.AdvertisementRepository;
import com.servegood.repository.RestaurantCategoryRepository;
import com.servegood.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Paid placement. A campaign decides only where a restaurant appears, always
 * under a "Sponsored" label and in its own slot. Nothing here reads or writes
 * ratings, reviews or hygiene scores.
 *
 * DRAFT -> PENDING (owner submits) -> ACTIVE or REJECTED (admin) -> PAUSED/ACTIVE
 * (owner) -> EXPIRED (after end date).
 */
@Service
public class AdService {

    private static final Logger log = LoggerFactory.getLogger(AdService.class);
    private static final Set<CampaignStatus> EDITABLE = EnumSet.of(CampaignStatus.DRAFT, CampaignStatus.REJECTED);

    private final AdvertisementCampaignRepository campaigns;
    private final AdvertisementRepository ads;
    private final RestaurantCategoryRepository categories;
    private final RestaurantService restaurantService;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final AuditLogService auditLog;
    private final Clock clock;
    private final AppProperties props;

    public AdService(AdvertisementCampaignRepository campaigns, AdvertisementRepository ads,
                     RestaurantCategoryRepository categories, RestaurantService restaurantService, AccessGuard guard,
                     CurrentUser currentUser, NotificationService notifications, AuditLogService auditLog, Clock clock,
                     AppProperties props) {
        this.campaigns = campaigns;
        this.ads = ads;
        this.categories = categories;
        this.restaurantService = restaurantService;
        this.guard = guard;
        this.currentUser = currentUser;
        this.notifications = notifications;
        this.auditLog = auditLog;
        this.clock = clock;
        this.props = props;
    }

    public RateCardDto rateCard() {
        return new RateCardDto(props.advertising().dailyRates());
    }

    /** Suggested cost: days in the campaign x the sum of the chosen placements' daily rates. */
    public BigDecimal estimate(LocalDate start, LocalDate end, Set<AdPlacement> placements) {
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        int daily = placements.stream().mapToInt(p -> props.advertising().dailyRates().getOrDefault(p, 0)).sum();
        return BigDecimal.valueOf(days * daily);
    }

    private CampaignDto toDto(AdvertisementCampaign c) {
        Set<AdPlacement> placements = c.getAdvertisements().stream().map(Advertisement::getPlacement).collect(Collectors.toSet());
        return AdMapper.toDto(c, estimate(c.getStartDate(), c.getEndDate(), placements));
    }

    // ------------------------------------------------------------------ owner

    @Transactional(readOnly = true)
    public List<CampaignDto> forRestaurant(Long restaurantId) {
        guard.managedRestaurant(restaurantId);
        return campaigns.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream().map(this::toDto).toList();
    }

    @Transactional
    public CampaignDto create(Long restaurantId, CampaignRequest request) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        validate(request, true);
        AdvertisementCampaign c = new AdvertisementCampaign();
        c.setRestaurant(r);
        c.setCreatedBy(currentUser.entity());
        apply(c, request);
        campaigns.save(c);
        auditLog.record("CAMPAIGN_CREATED", "CAMPAIGN", c.getId(), "restaurant=" + restaurantId + " budget=" + c.getBudget());
        return toDto(c);
    }

    @Transactional
    public CampaignDto update(Long id, CampaignRequest request) {
        AdvertisementCampaign c = owned(id);
        if (!EDITABLE.contains(c.getStatus())) {
            throw ApiException.badRequest("Only draft or rejected campaigns can be edited");
        }
        validate(request, true);
        apply(c, request);
        c.setStatus(CampaignStatus.DRAFT);
        c.setStatusReason(null);
        auditLog.record("CAMPAIGN_UPDATED", "CAMPAIGN", c.getId(), null);
        return toDto(c);
    }

    @Transactional
    public CampaignDto submit(Long id) {
        AdvertisementCampaign c = owned(id);
        if (!EDITABLE.contains(c.getStatus())) {
            throw ApiException.badRequest("This campaign has already been submitted");
        }
        if (!c.getRestaurant().isPublic()) {
            throw ApiException.badRequest("The restaurant must be approved and listed before it can advertise");
        }
        if (c.getEndDate().isBefore(LocalDate.now(clock))) {
            throw ApiException.badRequest("The campaign end date has passed. Change the dates first.");
        }
        c.setStatus(CampaignStatus.PENDING);
        auditLog.record("CAMPAIGN_SUBMITTED", "CAMPAIGN", c.getId(), null);
        notifications.notifyRole(RoleName.ADMIN, NotificationType.AD_SUBMITTED, "Campaign awaiting approval",
                c.getRestaurant().getName() + ": " + c.getName(), "/admin/advertisements?status=PENDING");
        return toDto(c);
    }

    @Transactional
    public CampaignDto pause(Long id) {
        AdvertisementCampaign c = owned(id);
        if (c.getStatus() != CampaignStatus.ACTIVE) {
            throw ApiException.badRequest("Only active campaigns can be paused");
        }
        c.setStatus(CampaignStatus.PAUSED);
        auditLog.record("CAMPAIGN_PAUSED", "CAMPAIGN", c.getId(), null);
        return toDto(c);
    }

    @Transactional
    public CampaignDto resume(Long id) {
        AdvertisementCampaign c = owned(id);
        if (c.getStatus() != CampaignStatus.PAUSED) {
            throw ApiException.badRequest("Only paused campaigns can be resumed");
        }
        if (c.getEndDate().isBefore(LocalDate.now(clock))) {
            c.setStatus(CampaignStatus.EXPIRED);
            throw ApiException.badRequest("This campaign has ended and cannot be resumed");
        }
        c.setStatus(CampaignStatus.ACTIVE);
        auditLog.record("CAMPAIGN_RESUMED", "CAMPAIGN", c.getId(), null);
        return toDto(c);
    }

    @Transactional
    public void deleteDraft(Long id) {
        AdvertisementCampaign c = owned(id);
        if (c.getStatus() != CampaignStatus.DRAFT) {
            throw ApiException.badRequest("Only drafts can be deleted");
        }
        campaigns.delete(c);
        auditLog.record("CAMPAIGN_DELETED", "CAMPAIGN", id, null);
    }

    private AdvertisementCampaign owned(Long id) {
        AdvertisementCampaign c = campaigns.findById(id).orElseThrow(() -> ApiException.notFound("Campaign"));
        guard.managedRestaurant(c.getRestaurant().getId());
        return c;
    }

    private void validate(CampaignRequest r, boolean requireFutureStart) {
        if (r.endDate().isBefore(r.startDate())) {
            throw ApiException.badRequest("End date must be on or after the start date");
        }
        if (requireFutureStart && r.startDate().isBefore(LocalDate.now(clock))) {
            throw ApiException.badRequest("Start date cannot be in the past");
        }
        if (ChronoUnit.DAYS.between(r.startDate(), r.endDate()) > 365) {
            throw ApiException.badRequest("Campaigns can run for at most one year");
        }
        Set<AdPlacement> seen = new HashSet<>();
        for (PlacementRequest p : r.placements()) {
            if (!seen.add(p.placement())) {
                throw ApiException.badRequest("Each placement can only be chosen once per campaign");
            }
            if (p.placement() == AdPlacement.CATEGORY_PAGE && p.categoryId() == null) {
                throw ApiException.badRequest("Choose which category page to appear on");
            }
        }
    }

    private void apply(AdvertisementCampaign c, CampaignRequest r) {
        c.setName(r.name().trim());
        c.setTargetLocation(r.targetLocation() == null || r.targetLocation().isBlank() ? null : r.targetLocation().trim());
        c.setStartDate(r.startDate());
        c.setEndDate(r.endDate());
        c.setBudget(r.budget());
        c.getAdvertisements().clear();
        for (PlacementRequest p : r.placements()) {
            Advertisement a = new Advertisement();
            a.setCampaign(c);
            a.setPlacement(p.placement());
            a.setHeadline(p.headline() == null || p.headline().isBlank() ? null : p.headline().trim());
            a.setImageUrl(p.imageUrl() == null || p.imageUrl().isBlank() ? null : p.imageUrl());
            if (p.categoryId() != null) {
                a.setCategory(categories.findById(p.categoryId()).orElseThrow(() -> ApiException.badRequest("Unknown category")));
            }
            c.getAdvertisements().add(a);
        }
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public PageResponse<CampaignDto> adminSearch(CampaignStatus status, int page, int size) {
        Specification<AdvertisementCampaign> spec = (root, q, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            } else {
                p.add(cb.notEqual(root.get("status"), CampaignStatus.DRAFT));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(campaigns.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"))),
                this::toDto);
    }

    @Transactional
    public CampaignDto decide(Long id, CampaignDecisionRequest request) {
        AdvertisementCampaign c = campaigns.findById(id).orElseThrow(() -> ApiException.notFound("Campaign"));
        if (c.getStatus() != CampaignStatus.PENDING) {
            throw ApiException.badRequest("Only pending campaigns can be approved or rejected");
        }
        c.setReviewedAt(Instant.now());
        c.setReviewedBy(currentUser.entity());
        if (Boolean.TRUE.equals(request.approve())) {
            if (c.getEndDate().isBefore(LocalDate.now(clock))) {
                throw ApiException.badRequest("This campaign's end date has passed");
            }
            c.setStatus(CampaignStatus.ACTIVE);
            c.setStatusReason(null);
            auditLog.record("CAMPAIGN_APPROVED", "CAMPAIGN", c.getId(), null);
            notifications.notifyOwners(c.getRestaurant().getId(), NotificationType.AD_ACTIVATED, "Campaign approved",
                    "\"" + c.getName() + "\" is active and runs " + c.getStartDate() + " to " + c.getEndDate()
                            + ". It appears under a Sponsored label.",
                    "/restaurant-dashboard/advertising?restaurant=" + c.getRestaurant().getId());
        } else {
            if (request.reason() == null || request.reason().isBlank()) {
                throw ApiException.badRequest("Give a reason so the restaurant knows what to change");
            }
            c.setStatus(CampaignStatus.REJECTED);
            c.setStatusReason(request.reason().trim());
            auditLog.record("CAMPAIGN_REJECTED", "CAMPAIGN", c.getId(), c.getStatusReason());
            notifications.notifyOwners(c.getRestaurant().getId(), NotificationType.AD_REJECTED, "Campaign not approved",
                    "\"" + c.getName() + "\": " + c.getStatusReason(),
                    "/restaurant-dashboard/advertising?restaurant=" + c.getRestaurant().getId());
        }
        return toDto(c);
    }

    @Transactional
    public CampaignDto setPayment(Long id, PaymentStatus status) {
        AdvertisementCampaign c = campaigns.findById(id).orElseThrow(() -> ApiException.notFound("Campaign"));
        PaymentStatus before = c.getPaymentStatus();
        c.setPaymentStatus(status);
        auditLog.record("CAMPAIGN_PAYMENT_UPDATED", "CAMPAIGN", c.getId(), before + " -> " + status);
        return toDto(c);
    }

    /** Admin can pause or end any campaign, for example after a complaint. */
    @Transactional
    public CampaignDto adminSetStatus(Long id, CampaignStatus status) {
        if (status != CampaignStatus.PAUSED && status != CampaignStatus.EXPIRED && status != CampaignStatus.ACTIVE) {
            throw ApiException.badRequest("Use approve/reject for pending campaigns");
        }
        AdvertisementCampaign c = campaigns.findById(id).orElseThrow(() -> ApiException.notFound("Campaign"));
        CampaignStatus before = c.getStatus();
        c.setStatus(status);
        auditLog.record("CAMPAIGN_STATUS_SET", "CAMPAIGN", c.getId(), before + " -> " + status);
        return toDto(c);
    }

    // ------------------------------------------------------------------ serving

    @Transactional
    public List<SponsoredDto> serve(AdPlacement placement, String location, String categorySlug, int limit) {
        LocalDate today = LocalDate.now(clock);
        List<Advertisement> eligible = new ArrayList<>(ads.findServable(placement, today).stream()
                .filter(a -> matchesLocation(a.getCampaign().getTargetLocation(), location))
                .filter(a -> placement != AdPlacement.CATEGORY_PAGE || categorySlug == null
                        || (a.getCategory() != null && a.getCategory().getSlug().equals(categorySlug)))
                .toList());
        // Rotate fairly among eligible campaigns; one slot per restaurant.
        Collections.shuffle(eligible);
        Set<Long> seenRestaurants = new HashSet<>();
        List<Advertisement> chosen = eligible.stream()
                .filter(a -> seenRestaurants.add(a.getCampaign().getRestaurant().getId()))
                .limit(Math.max(1, Math.min(limit, 6)))
                .toList();
        if (chosen.isEmpty()) {
            return List.of();
        }
        ads.incrementImpressions(chosen.stream().map(Advertisement::getId).toList());
        List<Long> ids = chosen.stream().map(a -> a.getCampaign().getRestaurant().getId()).toList();
        Map<Long, RestaurantSummaryDto> summaries = restaurantService.summaries(ids, null).stream()
                .collect(Collectors.toMap(RestaurantSummaryDto::id, Function.identity()));
        return chosen.stream()
                .filter(a -> summaries.containsKey(a.getCampaign().getRestaurant().getId()))
                .map(a -> new SponsoredDto(a.getId(), a.getCampaign().getId(), a.getPlacement(), a.getHeadline(),
                        a.getImageUrl(), true, summaries.get(a.getCampaign().getRestaurant().getId())))
                .toList();
    }

    @Transactional
    public void click(Long adId) {
        if (ads.incrementClicks(adId) == 0) {
            throw ApiException.notFound("Advertisement");
        }
    }

    private static boolean matchesLocation(String target, String requested) {
        if (target == null || target.isBlank()) {
            return true;
        }
        if (requested == null || requested.isBlank()) {
            return true;
        }
        String t = target.toLowerCase();
        String r = requested.toLowerCase();
        return t.contains(r) || r.contains(t);
    }

    /** Daily: campaigns past their end date become EXPIRED and owners are told. */
    @Scheduled(cron = "0 20 0 * * *", zone = "${app.time-zone}")
    @Transactional
    public void expireCampaigns() {
        LocalDate today = LocalDate.now(clock);
        var ended = campaigns.findByStatusInAndEndDateBefore(EnumSet.of(CampaignStatus.ACTIVE, CampaignStatus.PAUSED), today);
        for (AdvertisementCampaign c : ended) {
            c.setStatus(CampaignStatus.EXPIRED);
            notifications.notifyOwners(c.getRestaurant().getId(), NotificationType.AD_EXPIRED, "Campaign ended",
                    "\"" + c.getName() + "\" finished on " + c.getEndDate() + ".",
                    "/restaurant-dashboard/advertising?restaurant=" + c.getRestaurant().getId());
        }
        if (!ended.isEmpty()) {
            log.info("Expired {} campaign(s)", ended.size());
        }
    }
}
