package com.servegood.repository;

import com.servegood.entity.RestaurantDeliveryOption;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantDeliveryOptionRepository extends JpaRepository<RestaurantDeliveryOption, Long> {

    @Query("select o from RestaurantDeliveryOption o join fetch o.provider p where o.restaurant.id = :restaurantId order by p.sortOrder, p.name")
    List<RestaurantDeliveryOption> findByRestaurantIdWithProvider(Long restaurantId);

    Optional<RestaurantDeliveryOption> findByRestaurantIdAndProviderId(Long restaurantId, Long providerId);

    @Query("select o from RestaurantDeliveryOption o join fetch o.provider p where o.restaurant.id in :restaurantIds and o.available = true and p.active = true")
    List<RestaurantDeliveryOption> findAvailableForRestaurants(java.util.Collection<Long> restaurantIds);
}
