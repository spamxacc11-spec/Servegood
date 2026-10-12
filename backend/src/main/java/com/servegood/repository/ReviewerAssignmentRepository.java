package com.servegood.repository;

import com.servegood.entity.ReviewerAssignment;
import com.servegood.entity.enums.AssignmentStatus;
import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ReviewerAssignmentRepository
        extends JpaRepository<ReviewerAssignment, Long>, JpaSpecificationExecutor<ReviewerAssignment> {

    Page<ReviewerAssignment> findByReviewerIdAndStatusIn(Long reviewerId, Collection<AssignmentStatus> statuses, Pageable pageable);

    boolean existsByReviewerIdAndRestaurantIdAndStatusIn(Long reviewerId, Long restaurantId, Collection<AssignmentStatus> statuses);

    long countByReviewerIdAndStatusIn(Long reviewerId, Collection<AssignmentStatus> statuses);
}
