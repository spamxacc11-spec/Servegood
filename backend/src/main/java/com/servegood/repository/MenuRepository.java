package com.servegood.repository;

import com.servegood.entity.Menu;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuRepository extends JpaRepository<Menu, Long> {
    List<Menu> findByRestaurantIdOrderBySortOrderAscIdAsc(Long restaurantId);
}
