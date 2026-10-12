package com.servegood.entity;

import com.servegood.entity.enums.OwnerRole;
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

/** Links an owner account to a restaurant it may manage. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "restaurant_owners")
public class RestaurantOwner extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_role", nullable = false, length = 20)
    private OwnerRole ownerRole = OwnerRole.OWNER;
}
