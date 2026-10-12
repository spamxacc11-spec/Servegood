package com.servegood.repository;

import com.servegood.entity.DeliveryPrice;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DeliveryPriceRepository extends JpaRepository<DeliveryPrice, Long> {

    /** The newest price for each of the given options. */
    @Query("""
            select p from DeliveryPrice p
            where p.option.id in :optionIds
              and p.recordedAt = (select max(p2.recordedAt) from DeliveryPrice p2 where p2.option.id = p.option.id)
            """)
    List<DeliveryPrice> findLatestForOptions(Collection<Long> optionIds);

    Page<DeliveryPrice> findByOptionIdOrderByRecordedAtDesc(Long optionId, Pageable pageable);
}
