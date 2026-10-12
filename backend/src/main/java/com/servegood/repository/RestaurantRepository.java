package com.servegood.repository;

import com.servegood.entity.Restaurant;
import com.servegood.entity.enums.RestaurantStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long>, JpaSpecificationExecutor<Restaurant> {

    Optional<Restaurant> findByIdAndDeletedAtIsNull(Long id);

    boolean existsBySlug(String slug);

    long countByStatusAndDeletedAtIsNull(RestaurantStatus status);

    @EntityGraph(attributePaths = {"address", "categories"})
    @Query("select r from Restaurant r where r.id in :ids")
    List<Restaurant> findAllWithSummaryByIdIn(Collection<Long> ids);

    @Modifying
    @Query("update Restaurant r set r.viewCount = r.viewCount + 1 where r.id = :id")
    void incrementViewCount(Long id);
}
