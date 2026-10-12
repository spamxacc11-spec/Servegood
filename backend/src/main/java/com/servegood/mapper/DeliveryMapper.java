package com.servegood.mapper;

import com.servegood.dto.DeliveryDtos.DeliveryOptionDto;
import com.servegood.dto.DeliveryDtos.PriceDto;
import com.servegood.dto.DeliveryDtos.ProviderDto;
import com.servegood.entity.DeliveryPrice;
import com.servegood.entity.DeliveryProvider;
import com.servegood.entity.RestaurantDeliveryOption;
import com.servegood.entity.enums.PriceSource;

public final class DeliveryMapper {

    private DeliveryMapper() {}

    public static ProviderDto toDto(DeliveryProvider p) {
        return new ProviderDto(p.getId(), p.getName(), p.getSlug(), p.getWebsiteUrl(), p.getLogoUrl(), p.getIntegrationType(),
                p.isDirectChannel(), p.isActive(), p.getSortOrder());
    }

    public static PriceDto toDto(DeliveryPrice p) {
        if (p == null) {
            return null;
        }
        return new PriceDto(p.getId(), p.getBasketDescription(), p.getFoodSubtotal(), p.getDeliveryFee(), p.getPlatformFee(),
                p.getOtherFees(), p.getDiscount(), p.getFinalTotal(), p.getSource(),
                p.getSource() == PriceSource.PROVIDER_API,
                p.getRecordedBy() == null ? null : DashboardMapper.publicName(p.getRecordedBy()), p.getRecordedAt());
    }

    public static DeliveryOptionDto toDto(RestaurantDeliveryOption o, DeliveryPrice price, boolean cheapest) {
        return new DeliveryOptionDto(o.getId(), o.getRestaurant().getId(), toDto(o.getProvider()), o.getOrderingUrl(),
                o.isAvailable(), o.getNotes(), toDto(price), cheapest);
    }
}
