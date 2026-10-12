package com.servegood.controller;

import com.servegood.dto.ApiResponse;
import com.servegood.dto.ReviewDtos.ReportDto;
import com.servegood.dto.ReviewDtos.ReportRequest;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.dto.ReviewDtos.ReviewRequest;
import com.servegood.service.ReportService;
import com.servegood.service.ReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Reviews and reports")
@RestController
public class ReviewController {

    private final ReviewService reviews;
    private final ReportService reports;

    public ReviewController(ReviewService reviews, ReportService reports) {
        this.reviews = reviews;
        this.reports = reports;
    }

    /** Authors edit their own review; an edit sends it back to moderation. */
    @PutMapping("/api/reviews/{id}")
    public ApiResponse<ReviewDto> update(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return ApiResponse.ok(reviews.update(id, request), "Review updated and sent for moderation");
    }

    @DeleteMapping("/api/reviews/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        reviews.delete(id);
        return ApiResponse.ok(null, "Review deleted");
    }

    @PostMapping("/api/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReportDto> report(@Valid @RequestBody ReportRequest request) {
        return ApiResponse.ok(reports.create(request), "Thanks. Our team will look into it.");
    }
}
