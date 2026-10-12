package com.servegood.repository;

import com.servegood.entity.DeliveryProvider;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryProviderRepository extends JpaRepository<DeliveryProvider, Long> {

    boolean existsBySlug(String slug);

    List<DeliveryProvider> findAllByOrderBySortOrderAscNameAsc();
}
