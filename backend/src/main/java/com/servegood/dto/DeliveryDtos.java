package com.servegood.dto;

import com.servegood.entity.enums.IntegrationType;
import com.servegood.entity.enums.PriceSource;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DeliveryDtos {

    private DeliveryDtos() {}

    private static final String URL = "^$|^https?://.+";

    public record ProviderDto(
            Long id,
            String name,
            String slug,
            String websiteUrl,
            String logoUrl,
            IntegrationType integrationType,
            boolean directChannel,
            boolean active,
            int sortOrder) {}

    public record ProviderRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 80) @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug may use lowercase letters, digits and hyphens") String slug,
            @Size(max = 300) @Pattern(regexp = URL, message = "Must start with http:// or https://") String websiteUrl,
            @Size(max = 500) String logoUrl,
            IntegrationType integrationType,
            Boolean directChannel,
            Boolean active,
            Integer sortOrder) {}

    /**
     * {@code live} is true only for prices fetched from a connected provider API.
     * Manually entered prices are never presented as live.
     */
    public record PriceDto(
            Long id,
            String basketDescription,
            BigDecimal foodSubtotal,
            BigDecimal deliveryFee,
            BigDecimal platformFee,
            BigDecimal otherFees,
            BigDecimal discount,
            BigDecimal finalTotal,
            PriceSource source,
            boolean live,
            String recordedByName,
            Instant recordedAt) {}

    public record DeliveryOptionDto(
            Long optionId,
            Long restaurantId,
            ProviderDto provider,
            String orderingUrl,
            boolean available,
            String notes,
            PriceDto currentPrice,
            boolean cheapest) {}

    public record DeliveryComparisonDto(
            Long restaurantId,
            String restaurantName,
            String basket,
            List<DeliveryOptionDto> options,
            DeliveryOptionDto cheapest,
            BigDecimal savingVsHighest,
            Instant lastUpdated,
            boolean liveData,
            String disclaimer) {}

    public record OptionRequest(
            @NotNull Long providerId,
            @Size(max = 500) @Pattern(regexp = URL, message = "Ordering link must start with http:// or https://") String orderingUrl,
            Boolean available,
            @Size(max = 300) String notes) {}

    public record PriceRequest(
            @NotBlank @Size(max = 300) String basketDescription,
            @NotNull @DecimalMin("0.0") BigDecimal foodSubtotal,
            @DecimalMin("0.0") BigDecimal deliveryFee,
            @DecimalMin("0.0") BigDecimal platformFee,
            @DecimalMin("0.0") BigDecimal otherFees,
            @DecimalMin("0.0") BigDecimal discount) {}
}
