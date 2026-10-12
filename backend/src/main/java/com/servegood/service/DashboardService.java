package com.servegood.service;

import com.servegood.config.AppProperties;
import com.servegood.dto.DashboardDtos.ActivityItem;
import com.servegood.dto.DashboardDtos.AdminStatsDto;
import com.servegood.dto.DashboardDtos.ConsumerOverviewDto;
import com.servegood.dto.DashboardDtos.DailyCount;
import com.servegood.dto.DashboardDtos.OwnerOverviewDto;
import com.servegood.dto.DashboardDtos.ReviewerOverviewDto;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.Restaurant;
import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.CampaignStatus;
import com.servegood.entity.enums.ReportStatus;
import com.servegood.entity.enums.RestaurantStatus;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.mapper.ReviewMapper;
import com.servegood.repository.AdvertisementCampaignRepository;
import com.servegood.repository.FavoriteRepository;
import com.servegood.repository.HygieneAuditRepository;
import com.servegood.repository.NotificationRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.RestaurantViewRepository;
import com.servegood.repository.ReviewReportRepository;
import com.servegood.repository.ReviewRepository;
import com.servegood.repository.ReviewerAssignmentRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.CurrentUser;
import com.servegood.service.support.HygieneScoring;
import java.sql.Date;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private final RestaurantRepository restaurants;
    private final RestaurantViewRepository views;
    private final ReviewRepository reviews;
    private final HygieneAuditRepository audits;
    private final FavoriteRepository favorites;
    private final AdvertisementCampaignRepository campaigns;
    private final NotificationRepository notifications;
    private final ReviewReportRepository reports;
    private final ReviewerAssignmentRepository assignments;
    private final UserRepository users;
    private final RestaurantService restaurantService;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final AppProperties props;

    public DashboardService(RestaurantRepository restaurants, RestaurantViewRepository views, ReviewRepository reviews,
                            HygieneAuditRepository audits, FavoriteRepository favorites,
                            AdvertisementCampaignRepository campaigns, NotificationRepository notifications,
                            ReviewReportRepository reports, ReviewerAssignmentRepository assignments,
                            UserRepository users, RestaurantService restaurantService, AccessGuard guard,
                            CurrentUser currentUser, Clock clock, AppProperties props) {
        this.restaurants = restaurants;
        this.views = views;
        this.reviews = reviews;
        this.audits = audits;
        this.favorites = favorites;
        this.campaigns = campaigns;
        this.notifications = notifications;
        this.reports = reports;
        this.assignments = assignments;
        this.users = users;
        this.restaurantService = restaurantService;
        this.guard = guard;
        this.currentUser = currentUser;
        this.clock = clock;
        this.props = props;
    }

    // ------------------------------------------------------------------ consumer

    @Transactional(readOnly = true)
    public ConsumerOverviewDto consumer() {
        Long id = currentUser.id();
        return new ConsumerOverviewDto(reviews.countByUserIdAndDeletedAtIsNull(id), favorites.countByUserId(id),
                notifications.countByUserIdAndReadAtIsNull(id),
                reports.findByReporterId(id, PageRequest.of(0, 1)).getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<RestaurantSummaryDto> recentlyViewed(int limit) {
        List<Long> ids = views.findRecentlyViewed(currentUser.id(), Math.min(limit, 30)).stream()
                .map(row -> ((Number) row[0]).longValue())
                .toList();
        return restaurantService.summaries(ids, null);
    }

    // ------------------------------------------------------------------ reviewer

    @Transactional(readOnly = true)
    public ReviewerOverviewDto reviewer() {
        Long id = currentUser.id();
        return new ReviewerOverviewDto(
                assignments.countByReviewerIdAndStatusIn(id, EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS)),
                audits.countByReviewerIdAndStatus(id, AuditStatus.DRAFT),
                audits.countByReviewerIdAndStatus(id, AuditStatus.PENDING),
                audits.countByReviewerIdAndStatus(id, AuditStatus.APPROVED),
                reviews.countByUserIdAndDeletedAtIsNull(id));
    }

    // ------------------------------------------------------------------ owner

    @Transactional(readOnly = true)
    public OwnerOverviewDto owner(Long restaurantId) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        LocalDate today = LocalDate.now(clock);
        Instant since = today.minusDays(29).atStartOfDay(props.zone()).toInstant();

        Map<LocalDate, Long> perDay = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            perDay.put(today.minusDays(i), 0L);
        }
        views.dailyViews(restaurantId, since, props.timeZone()).forEach(row -> {
            LocalDate day = row[0] instanceof Date d ? d.toLocalDate() : LocalDate.parse(row[0].toString());
            perDay.put(day, ((Number) row[1]).longValue());
        });
        List<DailyCount> daily = perDay.entrySet().stream().map(e -> new DailyCount(e.getKey(), e.getValue())).toList();
        long views30 = daily.stream().mapToLong(DailyCount::count).sum();

        var recent = reviews.findAll((root, q, cb) -> cb.and(
                        cb.equal(root.get("restaurant").get("id"), restaurantId), cb.isNull(root.get("deletedAt"))),
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<ReviewDto> recentReviews = recent.getContent().stream().map(rv -> ReviewMapper.toDto(rv, false)).toList();
        long unanswered = reviews.findAll((root, q, cb) -> cb.and(
                cb.equal(root.get("restaurant").get("id"), restaurantId),
                cb.equal(root.get("status"), ReviewStatus.VERIFIED),
                cb.isNull(root.get("deletedAt")),
                cb.isNull(root.join("response", jakarta.persistence.criteria.JoinType.LEFT).get("id")))).size();

        List<ActivityItem> activity = new ArrayList<>();
        recent.getContent().forEach(rv -> activity.add(new ActivityItem("REVIEW",
                rv.getOverallRating() + "-star review (" + rv.getStatus().name().toLowerCase() + ")",
                rv.getTitle() != null ? rv.getTitle() : abbreviate(rv.getComment()),
                "/restaurant-dashboard/reviews?restaurant=" + restaurantId, rv.getCreatedAt())));
        audits.findByRestaurantIdOrderByAuditDateDescIdDesc(restaurantId).stream()
                .filter(a -> a.getStatus() != AuditStatus.DRAFT).limit(3)
                .forEach(a -> activity.add(new ActivityItem("HYGIENE_AUDIT",
                        "Hygiene audit " + a.getStatus().name().toLowerCase(),
                        a.getOverallScore() == null ? null : "Score " + a.getOverallScore() + "/100",
                        "/restaurant-dashboard/hygiene?restaurant=" + restaurantId,
                        a.getDecidedAt() != null ? a.getDecidedAt() : a.getUpdatedAt())));
        campaigns.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream().limit(3)
                .forEach(c -> activity.add(new ActivityItem("CAMPAIGN",
                        "Campaign \"" + c.getName() + "\" " + c.getStatus().name().toLowerCase(), null,
                        "/restaurant-dashboard/advertising?restaurant=" + restaurantId, c.getUpdatedAt())));
        activity.sort(Comparator.comparing(ActivityItem::at, Comparator.nullsLast(Comparator.reverseOrder())));

        long activeCampaigns = campaigns.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream()
                .filter(c -> c.getStatus() == CampaignStatus.ACTIVE).count();
        boolean verified = r.isHygieneVerified(today);

        return new OwnerOverviewDto(
                r.getId(), r.getName(), r.getStatus().name(), views30, r.getViewCount(), daily,
                reviews.countByRestaurantIdAndDeletedAtIsNull(restaurantId),
                reviews.countByRestaurantIdAndStatusAndDeletedAtIsNull(restaurantId, ReviewStatus.PENDING),
                unanswered,
                r.getAvgOverall(), r.getAvgFood(), r.getAvgService(), r.getAvgHygiene(),
                r.getHygieneScore(), verified ? HygieneScoring.tier(r.getHygieneScore()) : null, verified,
                favorites.countByRestaurantId(restaurantId), activeCampaigns, recentReviews,
                activity.stream().limit(10).toList());
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public AdminStatsDto admin() {
        Map<RoleName, Long> byRole = new EnumMap<>(RoleName.class);
        for (RoleName role : RoleName.values()) {
            byRole.put(role, users.countByRole(role));
        }
        long totalUsers = users.count((root, q, cb) -> cb.isNull(root.get("deletedAt")));
        return new AdminStatsDto(
                totalUsers,
                byRole,
                restaurants.countByStatusAndDeletedAtIsNull(RestaurantStatus.APPROVED),
                restaurants.countByStatusAndDeletedAtIsNull(RestaurantStatus.PENDING_APPROVAL),
                reviews.countByStatusAndDeletedAtIsNull(ReviewStatus.PENDING),
                reviews.countByStatusAndDeletedAtIsNull(ReviewStatus.FLAGGED),
                audits.countByStatus(AuditStatus.PENDING),
                reports.countByStatus(ReportStatus.OPEN),
                campaigns.countByStatus(CampaignStatus.PENDING),
                campaigns.countByStatus(CampaignStatus.ACTIVE));
    }

    private static String abbreviate(String s) {
        return s == null ? null : s.length() > 90 ? s.substring(0, 89) + "…" : s;
    }
}
