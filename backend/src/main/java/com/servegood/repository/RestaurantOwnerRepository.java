package com.servegood.repository;

import com.servegood.entity.RestaurantOwner;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantOwnerRepository extends JpaRepository<RestaurantOwner, Long> {

    boolean existsByRestaurantIdAndUserId(Long restaurantId, Long userId);

    @Query("select o from RestaurantOwner o join fetch o.restaurant r where o.user.id = :userId and r.deletedAt is null order by r.name")
    List<RestaurantOwner> findByUserIdWithRestaurant(Long userId);

    @Query("select o from RestaurantOwner o join fetch o.user where o.restaurant.id = :restaurantId")
    List<RestaurantOwner> findByRestaurantIdWithUser(Long restaurantId);
}
