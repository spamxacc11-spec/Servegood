package com.servegood.entity;

import com.servegood.entity.enums.IntegrationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "delivery_providers")
public class DeliveryProvider extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(name = "website_url", length = 300)
    private String websiteUrl;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    /** MANUAL until a real provider API is connected. Never shown as "live" while MANUAL. */
    @Enumerated(EnumType.STRING)
    @Column(name = "integration_type", nullable = false, length = 20)
    private IntegrationType integrationType = IntegrationType.MANUAL;

    /** The restaurant's own ordering channel rather than an aggregator. */
    @Column(name = "direct_channel", nullable = false)
    private boolean directChannel;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
