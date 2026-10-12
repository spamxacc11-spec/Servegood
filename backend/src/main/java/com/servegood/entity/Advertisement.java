package com.servegood.entity;

import com.servegood.entity.enums.AdPlacement;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One placement within a campaign. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "advertisements")
public class Advertisement extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id")
    private AdvertisementCampaign campaign;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AdPlacement placement;

    @Column(length = 120)
    private String headline;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** Only meaningful for CATEGORY_PAGE placements. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private RestaurantCategory category;

    @Column(nullable = false)
    private long impressions;

    @Column(nullable = false)
    private long clicks;
}
