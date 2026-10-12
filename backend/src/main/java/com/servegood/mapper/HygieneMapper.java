package com.servegood.mapper;

import com.servegood.dto.HygieneDtos.AssignmentDto;
import com.servegood.dto.HygieneDtos.AuditDto;
import com.servegood.dto.HygieneDtos.AuditItemDto;
import com.servegood.dto.HygieneDtos.EvidenceDto;
import com.servegood.entity.HygieneAudit;
import com.servegood.entity.ReviewerAssignment;
import com.servegood.service.support.HygieneScoring;
import java.util.Comparator;

public final class HygieneMapper {

    private HygieneMapper() {}

    /** @param includeInternal whether reviewer identity and the admin decision note are included. */
    public static AuditDto toDto(HygieneAudit a, boolean includeInternal) {
        return new AuditDto(
                a.getId(),
                a.getRestaurant().getId(),
                a.getRestaurant().getName(),
                includeInternal ? a.getReviewer().getId() : null,
                includeInternal ? a.getReviewer().getFullName() : "ServeGood reviewer",
                a.getAssignment() == null ? null : a.getAssignment().getId(),
                a.getAuditDate(),
                a.getOverallScore(),
                HygieneScoring.tier(a.getOverallScore()),
                a.getStatus(),
                a.getFindings(),
                a.getRecommendations(),
                includeInternal ? a.getDecisionNote() : null,
                a.getSubmittedAt(),
                a.getDecidedAt(),
                a.getValidUntil(),
                a.getItems().stream()
                        .sorted(Comparator.comparing(i -> i.getCategory().ordinal()))
                        .map(i -> new AuditItemDto(i.getCategory(), i.getCategory().label(), i.getWeight(), i.getScore(), i.getNotes()))
                        .toList(),
                a.getEvidence().stream().map(e -> new EvidenceDto(e.getId(), e.getUrl(), e.getCaption(), e.getCategory())).toList(),
                a.getCreatedAt(),
                a.getUpdatedAt());
    }

    public static AssignmentDto toDto(ReviewerAssignment a) {
        var r = a.getRestaurant();
        return new AssignmentDto(a.getId(), a.getReviewer().getId(), a.getReviewer().getFullName(), r.getId(), r.getName(),
                r.getAddress() == null ? null : r.getAddress().getLocality(), a.getDueDate(), a.getStatus(), a.getNotes(),
                a.getCreatedAt());
    }
}
