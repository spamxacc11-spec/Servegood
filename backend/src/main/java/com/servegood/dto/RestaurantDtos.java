package com.servegood.dto;

import com.servegood.entity.enums.CategoryKind;
import com.servegood.entity.enums.RestaurantStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class RestaurantDtos {

    private RestaurantDtos() {}

    private static final String TIME = "^([01]\\d|2[0-3]):[0-5]\\d$";

    public record CategoryRef(Long id, String name, String slug, CategoryKind kind) {}

    public record AddressDto(
            @NotBlank @Size(max = 200) String line1,
            @Size(max = 200) String line2,
            @NotBlank @Size(max = 100) String locality,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @Size(max = 12) String postalCode,
            @Size(max = 60) String country,
            @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
            @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude) {}

    public record OpeningHoursDto(
            @NotNull @Min(1) @Max(7) Integer dayOfWeek,
            @NotBlank @Pattern(regexp = TIME, message = "Use HH:mm") String opensAt,
            @NotBlank @Pattern(regexp = TIME, message = "Use HH:mm") String closesAt) {}

    public record ImageDto(Long id, @NotBlank @Size(max = 500) String url, @Size(max = 250) String altText, Integer sortOrder) {}

    /** Genuine ratings from VERIFIED reviews. Null averages mean no verified reviews yet. */
    public record RatingSummary(
            BigDecimal overall, BigDecimal food, BigDecimal service, BigDecimal hygieneReported, int reviewCount) {}

    /** Audited hygiene, separate from diner ratings. */
    public record HygieneSummary(
            Integer score, String tier, boolean verified, LocalDate verifiedUntil, LocalDate lastAuditDate) {}

    public record RestaurantSummaryDto(
            Long id,
            String name,
            String slug,
            String coverImageUrl,
            String locality,
            String city,
            List<CategoryRef> categories,
            int priceLevel,
            Integer costForTwo,
            RatingSummary ratings,
            HygieneSummary hygiene,
            Boolean openNow,
            boolean deliveryAvailable,
            BigDecimal cheapestTotal,
            String cheapestProvider,
            Double distanceKm,
            Boolean favorite) {}

    public record RestaurantDetailDto(
            Long id,
            String name,
            String slug,
            String description,
            String phone,
            String email,
            String website,
            int priceLevel,
            Integer costForTwo,
            String coverImageUrl,
            String comparisonBasket,
            RestaurantStatus status,
            AddressDto address,
            List<CategoryRef> categories,
            List<OpeningHoursDto> openingHours,
            List<ImageDto> images,
            RatingSummary ratings,
            Map<Integer, Long> ratingDistribution,
            HygieneSummary hygiene,
            Boolean openNow,
            Boolean favorite,
            Instant createdAt) {}

    public record RestaurantRequest(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 5000) String description,
            @Size(max = 30) String phone,
            @Email @Size(max = 255) String email,
            @Size(max = 300) @Pattern(regexp = "^$|^https?://.+", message = "Website must start with http:// or https://") String website,
            @NotNull @Min(1) @Max(4) Integer priceLevel,
            @Min(0) Integer costForTwo,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 300) String comparisonBasket,
            @NotNull @Valid AddressDto address,
            List<Long> categoryIds,
            List<@Valid OpeningHoursDto> openingHours,
            List<@Valid ImageDto> images) {}

    public record OwnerRef(Long userId, String fullName, String email) {}

    public record AdminRestaurantDto(
            RestaurantSummaryDto restaurant,
            RestaurantStatus status,
            String statusReason,
            List<OwnerRef> owners,
            long viewCount,
            Instant createdAt) {}

    public record StatusChangeRequest(@NotNull RestaurantStatus status, @Size(max = 500) String reason) {}

    public record AssignOwnerRequest(@NotBlank @Email String email) {}
}
