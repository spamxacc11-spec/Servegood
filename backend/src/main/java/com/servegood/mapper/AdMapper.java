package com.servegood.mapper;

import com.servegood.dto.AdDtos.AdDto;
import com.servegood.dto.AdDtos.CampaignDto;
import com.servegood.entity.Advertisement;
import com.servegood.entity.AdvertisementCampaign;
import java.math.BigDecimal;

public final class AdMapper {

    private AdMapper() {}

    public static AdDto toDto(Advertisement a) {
        return new AdDto(a.getId(), a.getPlacement(), a.getHeadline(), a.getImageUrl(),
                a.getCategory() == null ? null : a.getCategory().getId(), a.getImpressions(), a.getClicks());
    }

    public static CampaignDto toDto(AdvertisementCampaign c, BigDecimal estimatedCost) {
        return new CampaignDto(c.getId(), c.getRestaurant().getId(), c.getRestaurant().getName(), c.getName(),
                c.getTargetLocation(), c.getStartDate(), c.getEndDate(), c.getBudget(), estimatedCost, c.getStatus(),
                c.getPaymentStatus(), c.getStatusReason(), c.getAdvertisements().stream().map(AdMapper::toDto).toList(),
                c.getCreatedAt(), c.getReviewedAt());
    }
}
