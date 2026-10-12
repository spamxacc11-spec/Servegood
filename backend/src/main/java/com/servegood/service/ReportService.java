package com.servegood.service;

import com.servegood.dto.PageResponse;
import com.servegood.dto.ReviewDtos.ReportDto;
import com.servegood.dto.ReviewDtos.ReportRequest;
import com.servegood.dto.ReviewDtos.ResolveReportRequest;
import com.servegood.entity.Restaurant;
import com.servegood.entity.Review;
import com.servegood.entity.ReviewReport;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.ReportStatus;
import com.servegood.entity.enums.ReportType;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.ReviewMapper;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.ReviewReportRepository;
import com.servegood.repository.ReviewRepository;
import com.servegood.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

    private final ReviewReportRepository reports;
    private final RestaurantRepository restaurants;
    private final ReviewRepository reviews;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final AuditLogService auditLog;

    public ReportService(ReviewReportRepository reports, RestaurantRepository restaurants, ReviewRepository reviews,
                         CurrentUser currentUser, NotificationService notifications, AuditLogService auditLog) {
        this.reports = reports;
        this.restaurants = restaurants;
        this.reviews = reviews;
        this.currentUser = currentUser;
        this.notifications = notifications;
        this.auditLog = auditLog;
    }

    @Transactional
    public ReportDto create(ReportRequest request) {
        Restaurant restaurant = restaurants.findByIdAndDeletedAtIsNull(request.restaurantId())
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        Review review = null;
        if (request.reviewId() != null) {
            review = reviews.findByIdAndDeletedAtIsNull(request.reviewId())
                    .filter(r -> r.getRestaurant().getId().equals(restaurant.getId()))
                    .orElseThrow(() -> ApiException.notFound("Review"));
            if (review.getUser().getId().equals(currentUser.id())) {
                throw ApiException.badRequest("You cannot report your own review");
            }
        } else if (request.type() == ReportType.FAKE_REVIEW) {
            throw ApiException.badRequest("Choose the review you are reporting");
        }
        ReviewReport report = new ReviewReport();
        report.setReporter(currentUser.entity());
        report.setReportType(request.type());
        report.setRestaurant(restaurant);
        report.setReview(review);
        report.setDetails(request.details().trim());
        reports.save(report);
        auditLog.record("REPORT_CREATED", "REPORT", report.getId(), request.type() + " restaurant=" + restaurant.getId());
        notifications.notifyRole(RoleName.ADMIN, NotificationType.SYSTEM, "New report: " + label(request.type()),
                restaurant.getName() + ": " + truncate(report.getDetails()), "/admin/reports");
        return ReviewMapper.toDto(report);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReportDto> mine(int page, int size) {
        return PageResponse.of(reports.findByReporterId(currentUser.id(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), ReviewMapper::toDto);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReportDto> search(ReportStatus status, ReportType type, int page, int size) {
        Specification<ReviewReport> spec = (root, q, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (type != null) {
                p.add(cb.equal(root.get("reportType"), type));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(reports.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                ReviewMapper::toDto);
    }

    /**
     * Resolving a fake-review or inappropriate-content report does not change the
     * review by itself; the admin moderates the review separately, and the
     * review is flagged here so it leaves the public page while that happens.
     */
    @Transactional
    public ReportDto resolve(Long id, ResolveReportRequest request, boolean flagReview) {
        if (request.status() == ReportStatus.OPEN) {
            throw ApiException.badRequest("Choose RESOLVED or DISMISSED");
        }
        ReviewReport report = reports.findById(id).orElseThrow(() -> ApiException.notFound("Report"));
        report.setStatus(request.status());
        report.setResolutionNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        report.setResolvedAt(Instant.now());
        report.setResolvedBy(currentUser.entity());
        if (flagReview && report.getReview() != null && report.getReview().getStatus() == ReviewStatus.VERIFIED) {
            report.getReview().setStatus(ReviewStatus.FLAGGED);
            report.getReview().setModerationNote("Flagged after a report: " + truncate(report.getDetails()));
            auditLog.record("REVIEW_FLAGGED_FROM_REPORT", "REVIEW", report.getReview().getId(), "report=" + id);
        }
        auditLog.record("REPORT_" + request.status(), "REPORT", report.getId(), report.getResolutionNote());
        notifications.notify(report.getReporter(), NotificationType.REPORT_RESOLVED, "Thanks for your report",
                "Your report about " + report.getRestaurant().getName() + " was "
                        + request.status().name().toLowerCase() + (report.getResolutionNote() == null ? "." : ": " + report.getResolutionNote()),
                "/restaurants/" + report.getRestaurant().getId());
        return ReviewMapper.toDto(report);
    }

    private static String label(ReportType type) {
        return switch (type) {
            case FAKE_REVIEW -> "fake review";
            case INCORRECT_RESTAURANT_INFO -> "incorrect restaurant information";
            case INAPPROPRIATE_CONTENT -> "inappropriate content";
            case INCORRECT_HYGIENE_INFO -> "incorrect hygiene information";
        };
    }

    private static String truncate(String s) {
        return s.length() > 160 ? s.substring(0, 159) + "…" : s;
    }
}
