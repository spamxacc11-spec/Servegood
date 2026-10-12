package com.servegood.repository;

import com.servegood.entity.Advertisement;
import com.servegood.entity.enums.AdPlacement;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AdvertisementRepository extends JpaRepository<Advertisement, Long> {

    /** Ads that may be served today: campaign ACTIVE, inside its dates, restaurant publicly listed. */
    @Query("""
            select a from Advertisement a
            join fetch a.campaign c join fetch c.restaurant r
            where a.placement = :placement and c.status = 'ACTIVE'
              and c.startDate <= :today and c.endDate >= :today
              and r.status = 'APPROVED' and r.deletedAt is null
            """)
    List<Advertisement> findServable(AdPlacement placement, LocalDate today);

    @Modifying
    @Query("update Advertisement a set a.impressions = a.impressions + 1 where a.id in :ids")
    void incrementImpressions(Collection<Long> ids);

    @Modifying
    @Query("update Advertisement a set a.clicks = a.clicks + 1 where a.id = :id")
    int incrementClicks(Long id);
}
