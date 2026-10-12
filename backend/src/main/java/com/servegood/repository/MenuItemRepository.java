package com.servegood.repository;

import com.servegood.entity.MenuItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByRestaurantIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(Long restaurantId);

    Optional<MenuItem> findByIdAndDeletedAtIsNull(Long id);

    long countByMenuIdAndDeletedAtIsNull(Long menuId);

    /** Dishes matching a search term at publicly listed restaurants. */
    @Query("""
            select i from MenuItem i join fetch i.restaurant r left join fetch r.address
            where i.deletedAt is null and r.deletedAt is null and r.status = 'APPROVED'
              and (lower(i.name) like :pattern or lower(i.description) like :pattern)
            order by i.available desc, i.name asc
            """)
    List<MenuItem> searchDishes(String pattern, Pageable pageable);
}
