package com.servegood.repository;

import com.servegood.entity.ReviewReport;
import com.servegood.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long>, JpaSpecificationExecutor<ReviewReport> {

    long countByStatus(ReportStatus status);

    Page<ReviewReport> findByReporterId(Long reporterId, Pageable pageable);
}
