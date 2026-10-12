package com.servegood.repository;

import com.servegood.entity.HygieneAudit;
import com.servegood.entity.enums.AuditStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface HygieneAuditRepository extends JpaRepository<HygieneAudit, Long>, JpaSpecificationExecutor<HygieneAudit> {

    List<HygieneAudit> findByRestaurantIdAndStatusInOrderByAuditDateDescIdDesc(Long restaurantId, Collection<AuditStatus> statuses);

    List<HygieneAudit> findByRestaurantIdOrderByAuditDateDescIdDesc(Long restaurantId);

    Optional<HygieneAudit> findFirstByRestaurantIdAndStatusOrderByAuditDateDescIdDesc(Long restaurantId, AuditStatus status);

    Page<HygieneAudit> findByReviewerId(Long reviewerId, Pageable pageable);

    List<HygieneAudit> findByStatusAndValidUntilBefore(AuditStatus status, LocalDate date);

    long countByStatus(AuditStatus status);

    long countByReviewerIdAndStatus(Long reviewerId, AuditStatus status);
}
