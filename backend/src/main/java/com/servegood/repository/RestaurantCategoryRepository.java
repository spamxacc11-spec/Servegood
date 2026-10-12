package com.servegood.repository;

import com.servegood.entity.RestaurantCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RestaurantCategoryRepository extends JpaRepository<RestaurantCategory, Long> {

    Optional<RestaurantCategory> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<RestaurantCategory> findAllByOrderByKindAscSortOrderAscNameAsc();

    List<RestaurantCategory> findAllByActiveTrueOrderByKindAscSortOrderAscNameAsc();
}
