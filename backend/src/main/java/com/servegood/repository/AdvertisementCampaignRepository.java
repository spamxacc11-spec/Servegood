package com.servegood.repository;

import com.servegood.entity.AdvertisementCampaign;
import com.servegood.entity.enums.CampaignStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdvertisementCampaignRepository
        extends JpaRepository<AdvertisementCampaign, Long>, JpaSpecificationExecutor<AdvertisementCampaign> {

    List<AdvertisementCampaign> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);

    List<AdvertisementCampaign> findByStatusInAndEndDateBefore(Collection<CampaignStatus> statuses, LocalDate date);

    long countByStatus(CampaignStatus status);
}
