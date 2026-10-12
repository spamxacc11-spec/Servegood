package com.servegood.repository;

import com.servegood.entity.RestaurantView;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantViewRepository extends JpaRepository<RestaurantView, Long> {

    long countByRestaurantIdAndCreatedAtAfter(Long restaurantId, Instant after);

    /** Distinct restaurants a user opened, most recent first. Rows are [restaurant_id, last_viewed]. */
    @Query(value = """
            select v.restaurant_id, max(v.created_at) as last_viewed
            from restaurant_views v
            join restaurants r on r.id = v.restaurant_id
            where v.user_id = :userId and r.deleted_at is null and r.status = 'APPROVED'
            group by v.restaurant_id
            order by last_viewed desc
            limit :limit
            """, nativeQuery = true)
    List<Object[]> findRecentlyViewed(Long userId, int limit);

    /** Views per day since a cutoff. Rows are [date, count]. */
    @Query(value = """
            select cast(v.created_at at time zone :zone as date) as day, count(*)
            from restaurant_views v
            where v.restaurant_id = :restaurantId and v.created_at >= :after
            group by day order by day
            """, nativeQuery = true)
    List<Object[]> dailyViews(Long restaurantId, Instant after, String zone);
}
