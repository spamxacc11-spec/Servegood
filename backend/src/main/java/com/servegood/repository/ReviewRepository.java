package com.servegood.repository;

import com.servegood.entity.Review;
import com.servegood.entity.enums.ReviewStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

    Optional<Review> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByUserIdAndRestaurantIdAndDeletedAtIsNull(Long userId, Long restaurantId);

    Page<Review> findByRestaurantIdAndStatusAndDeletedAtIsNull(Long restaurantId, ReviewStatus status, Pageable pageable);

    Page<Review> findByUserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    long countByStatusAndDeletedAtIsNull(ReviewStatus status);

    long countByRestaurantIdAndDeletedAtIsNull(Long restaurantId);

    long countByRestaurantIdAndStatusAndDeletedAtIsNull(Long restaurantId, ReviewStatus status);

    long countByUserIdAndDeletedAtIsNull(Long userId);

    /** [avgOverall, avgFood, avgService, avgHygiene, count] over VERIFIED reviews only. */
    @Query("""
            select avg(r.overallRating), avg(r.foodRating), avg(r.serviceRating), avg(r.hygieneRating), count(r)
            from Review r
            where r.restaurant.id = :restaurantId and r.status = 'VERIFIED' and r.deletedAt is null
            """)
    Object[] verifiedAggregates(Long restaurantId);

    /** Count of VERIFIED reviews per overall star, rows are [stars, count]. */
    @Query("""
            select r.overallRating, count(r) from Review r
            where r.restaurant.id = :restaurantId and r.status = 'VERIFIED' and r.deletedAt is null
            group by r.overallRating
            """)
    java.util.List<Object[]> ratingDistribution(Long restaurantId);
}
