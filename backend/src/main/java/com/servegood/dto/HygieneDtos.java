package com.servegood.dto;

import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.HygieneCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class HygieneDtos {

    private HygieneDtos() {}

    public record CriterionDto(HygieneCategory category, String label, int weight) {}

    public record AuditItemDto(HygieneCategory category, String label, int weight, int score, String notes) {}

    public record EvidenceDto(Long id, String url, String caption, HygieneCategory category) {}

    public record AuditDto(
            Long id,
            Long restaurantId,
            String restaurantName,
            Long reviewerId,
            String reviewerName,
            Long assignmentId,
            LocalDate auditDate,
            Integer overallScore,
            String tier,
            AuditStatus status,
            String findings,
            String recommendations,
            String decisionNote,
            Instant submittedAt,
            Instant decidedAt,
            LocalDate validUntil,
            List<AuditItemDto> items,
            List<EvidenceDto> evidence,
            Instant createdAt,
            Instant updatedAt) {}

    public record AuditItemRequest(
            @NotNull HygieneCategory category, @NotNull @Min(0) @Max(10) Integer score, @Size(max = 2000) String notes) {}

    public record EvidenceRequest(@NotBlank @Size(max = 500) String url, @Size(max = 250) String caption, HygieneCategory category) {}

    public record AuditRequest(
            @NotNull Long restaurantId,
            Long assignmentId,
            @NotNull @PastOrPresent LocalDate auditDate,
            @NotNull List<@Valid AuditItemRequest> items,
            @Size(max = 10000) String findings,
            @Size(max = 10000) String recommendations,
            @Size(max = 20) List<@Valid EvidenceRequest> evidence) {}

    public record AuditDecisionRequest(@NotNull Boolean approve, @Size(max = 500) String note) {}

    /** What the public restaurant page shows. Only APPROVED or EXPIRED audits appear. */
    public record PublicHygieneDto(
            Integer score,
            String tier,
            boolean verified,
            LocalDate verifiedUntil,
            AuditDto latestAudit,
            List<AuditHistoryEntry> history) {}

    public record AuditHistoryEntry(Long id, LocalDate auditDate, Integer score, AuditStatus status) {}

    public record AssignmentDto(
            Long id,
            Long reviewerId,
            String reviewerName,
            Long restaurantId,
            String restaurantName,
            String locality,
            LocalDate dueDate,
            AssignmentStatus status,
            String notes,
            Instant createdAt) {}

    public record AssignmentRequest(
            @NotNull Long reviewerId, @NotNull Long restaurantId, LocalDate dueDate, @Size(max = 500) String notes) {}

    public record AssignmentStatusRequest(@NotNull AssignmentStatus status) {}
}
