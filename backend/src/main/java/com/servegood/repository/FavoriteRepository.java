package com.servegood.repository;

import com.servegood.entity.Favorite;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByUserIdAndRestaurantId(Long userId, Long restaurantId);

    boolean existsByUserIdAndRestaurantId(Long userId, Long restaurantId);

    @Query("select f from Favorite f join f.restaurant r where f.user.id = :userId and r.deletedAt is null")
    Page<Favorite> findByUserId(Long userId, Pageable pageable);

    @Query("select f.restaurant.id from Favorite f where f.user.id = :userId and f.restaurant.id in :restaurantIds")
    List<Long> findFavoritedIds(Long userId, Collection<Long> restaurantIds);

    long countByRestaurantId(Long restaurantId);

    long countByUserId(Long userId);
}
