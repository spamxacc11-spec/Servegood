package com.servegood.dto;

import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.entity.enums.AdPlacement;
import com.servegood.entity.enums.CampaignStatus;
import com.servegood.entity.enums.PaymentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class AdDtos {

    private AdDtos() {}

    public record AdDto(
            Long id, AdPlacement placement, String headline, String imageUrl, Long categoryId, long impressions, long clicks) {}

    public record CampaignDto(
            Long id,
            Long restaurantId,
            String restaurantName,
            String name,
            String targetLocation,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal budget,
            BigDecimal estimatedCost,
            CampaignStatus status,
            PaymentStatus paymentStatus,
            String statusReason,
            List<AdDto> placements,
            Instant createdAt,
            Instant reviewedAt) {}

    public record PlacementRequest(
            @NotNull AdPlacement placement, @Size(max = 120) String headline, @Size(max = 500) String imageUrl, Long categoryId) {}

    public record CampaignRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 120) String targetLocation,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotNull @DecimalMin("0.0") BigDecimal budget,
            @NotEmpty List<@Valid PlacementRequest> placements) {}

    public record CampaignDecisionRequest(@NotNull Boolean approve, @Size(max = 500) String reason) {}

    public record PaymentStatusRequest(@NotNull PaymentStatus paymentStatus) {}

    /** A served ad. Always rendered with a visible "Sponsored" label. */
    public record SponsoredDto(
            Long adId, Long campaignId, AdPlacement placement, String headline, String imageUrl, boolean sponsored,
            RestaurantSummaryDto restaurant) {}

    public record RateCardDto(Map<AdPlacement, Integer> dailyRates) {}
}
