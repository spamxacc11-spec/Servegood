package com.servegood.controller;

import com.servegood.dto.ApiResponse;
import com.servegood.dto.DashboardDtos.ReviewerOverviewDto;
import com.servegood.dto.HygieneDtos.AssignmentDto;
import com.servegood.dto.HygieneDtos.AssignmentStatusRequest;
import com.servegood.dto.HygieneDtos.AuditDto;
import com.servegood.dto.HygieneDtos.AuditRequest;
import com.servegood.dto.PageResponse;
import com.servegood.dto.ReviewDtos.ModerationRequest;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.service.DashboardService;
import com.servegood.service.HygieneService;
import com.servegood.service.ReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Reviewer dashboard API: assignments, hygiene audits and review moderation. */
@Tag(name = "Reviewer")
@RestController
@RequestMapping("/api/reviewer")
public class ReviewerController {

    private final HygieneService hygiene;
    private final ReviewService reviews;
    private final DashboardService dashboard;

    public ReviewerController(HygieneService hygiene, ReviewService reviews, DashboardService dashboard) {
        this.hygiene = hygiene;
        this.reviews = reviews;
        this.dashboard = dashboard;
    }

    @GetMapping("/overview")
    public ApiResponse<ReviewerOverviewDto> overview() {
        return ApiResponse.ok(dashboard.reviewer());
    }

    @GetMapping("/assignments")
    public ApiResponse<PageResponse<AssignmentDto>> assignments(@RequestParam(defaultValue = "true") boolean open,
                                                                @RequestParam(required = false) Integer page,
                                                                @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(hygiene.myAssignments(open, Paging.page(page), Paging.size(size, 20)));
    }

    @PatchMapping("/assignments/{id}/status")
    public ApiResponse<AssignmentDto> assignmentStatus(@PathVariable Long id, @Valid @RequestBody AssignmentStatusRequest request) {
        return ApiResponse.ok(hygiene.updateAssignmentStatus(id, request.status()));
    }

    @GetMapping("/audits")
    public ApiResponse<PageResponse<AuditDto>> audits(@RequestParam(required = false) AuditStatus status,
                                                      @RequestParam(required = false) Integer page,
                                                      @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(hygiene.myAudits(status, Paging.page(page), Paging.size(size, 10)));
    }

    @GetMapping("/audits/{id}")
    public ApiResponse<AuditDto> audit(@PathVariable Long id) {
        return ApiResponse.ok(hygiene.get(id));
    }

    @PostMapping("/audits")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuditDto> createAudit(@Valid @RequestBody AuditRequest request) {
        return ApiResponse.ok(hygiene.createAudit(request), "Draft saved");
    }

    @PutMapping("/audits/{id}")
    public ApiResponse<AuditDto> updateAudit(@PathVariable Long id, @Valid @RequestBody AuditRequest request) {
        return ApiResponse.ok(hygiene.updateAudit(id, request), "Draft saved");
    }

    @PostMapping("/audits/{id}/submit")
    public ApiResponse<AuditDto> submit(@PathVariable Long id) {
        return ApiResponse.ok(hygiene.submit(id), "Submitted for approval");
    }

    @DeleteMapping("/audits/{id}")
    public ApiResponse<Void> deleteDraft(@PathVariable Long id) {
        hygiene.deleteDraft(id);
        return ApiResponse.ok(null, "Draft deleted");
    }

    @GetMapping("/reviews")
    public ApiResponse<PageResponse<ReviewDto>> moderationQueue(@RequestParam(required = false) ReviewStatus status,
                                                                @RequestParam(required = false) String q,
                                                                @RequestParam(required = false) Integer page,
                                                                @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reviews.moderationQueue(status == null ? ReviewStatus.PENDING : status, null, q,
                Paging.page(page), Paging.size(size, 10)));
    }

    @PatchMapping("/reviews/{id}/moderation")
    public ApiResponse<ReviewDto> moderate(@PathVariable Long id, @Valid @RequestBody ModerationRequest request) {
        return ApiResponse.ok(reviews.moderate(id, request), "Decision saved");
    }
}
