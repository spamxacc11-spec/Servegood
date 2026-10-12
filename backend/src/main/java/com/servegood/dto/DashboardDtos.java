package com.servegood.dto;

import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.RoleName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class DashboardDtos {

    private DashboardDtos() {}

    public record NotificationDto(
            Long id, NotificationType type, String title, String body, String link, boolean read, Instant createdAt) {}

    public record UnreadCountDto(long unread) {}

    public record BroadcastRequest(
            RoleName role, @NotBlank @Size(max = 150) String title, @Size(max = 1000) String body, @Size(max = 300) String link) {}

    public record AuditLogDto(
            Long id, Long actorId, String actorEmail, String action, String entityType, Long entityId, String details,
            String ipAddress, Instant createdAt) {}

    public record ActivityItem(String kind, String title, String detail, String link, Instant at) {}

    public record DailyCount(LocalDate day, long count) {}

    public record OwnerOverviewDto(
            Long restaurantId,
            String restaurantName,
            String status,
            long views30d,
            long viewsTotal,
            List<DailyCount> dailyViews,
            long totalReviews,
            long pendingReviews,
            long unansweredReviews,
            BigDecimal avgOverall,
            BigDecimal avgFood,
            BigDecimal avgService,
            BigDecimal avgHygieneReported,
            Integer hygieneScore,
            String hygieneTier,
            boolean hygieneVerified,
            long favorites,
            long activeCampaigns,
            List<ReviewDto> recentReviews,
            List<ActivityItem> recentActivity) {}

    public record ConsumerOverviewDto(long reviews, long favorites, long unreadNotifications, long reportsFiled) {}

    public record ReviewerOverviewDto(long openAssignments, long draftAudits, long pendingAudits, long approvedAudits, long reviewsWritten) {}

    public record AdminStatsDto(
            long users,
            Map<RoleName, Long> usersByRole,
            long restaurantsApproved,
            long restaurantsPending,
            long reviewsPending,
            long reviewsFlagged,
            long auditsPending,
            long reportsOpen,
            long campaignsPending,
            long campaignsActive) {}

    public record PlatformStatsDto(long restaurants, long verifiedRestaurants, long verifiedReviews, List<String> localities) {}

    public record UserAdminUpdate(@NotNull List<RoleName> roles, @NotNull com.servegood.entity.enums.UserStatus status) {}

    public record CreateStaffRequest(
            @NotBlank @jakarta.validation.constraints.Email String email,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotNull List<RoleName> roles) {}
}
