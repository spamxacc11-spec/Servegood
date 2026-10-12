package com.servegood.dto;

import com.servegood.entity.enums.ReportStatus;
import com.servegood.entity.enums.ReportType;
import com.servegood.entity.enums.ReviewStatus;
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

public final class ReviewDtos {

    private ReviewDtos() {}

    public record FoodRatingDto(Long menuItemId, @NotBlank @Size(max = 150) String dishName, @NotNull @Min(1) @Max(5) Integer rating) {}

    public record ResponseDto(Long id, String body, String responderName, Instant createdAt, Instant updatedAt) {}

    public record ReviewDto(
            Long id,
            Long restaurantId,
            String restaurantName,
            Long authorId,
            String authorName,
            int overallRating,
            int foodRating,
            int serviceRating,
            int hygieneRating,
            String title,
            String comment,
            LocalDate visitDate,
            ReviewStatus status,
            boolean reviewerReview,
            String moderationNote,
            List<String> images,
            List<FoodRatingDto> foodRatings,
            ResponseDto response,
            Instant createdAt,
            Instant updatedAt) {}

    public record ReviewRequest(
            @NotNull @Min(1) @Max(5) Integer overallRating,
            @NotNull @Min(1) @Max(5) Integer foodRating,
            @NotNull @Min(1) @Max(5) Integer serviceRating,
            @NotNull @Min(1) @Max(5) Integer hygieneRating,
            @Size(max = 150) String title,
            @NotBlank @Size(min = 20, max = 4000, message = "Review must be 20 to 4000 characters") String comment,
            @PastOrPresent LocalDate visitDate,
            @Size(max = 6, message = "Up to 6 photos") List<@NotBlank @Size(max = 500) String> imageUrls,
            @Size(max = 10) List<@Valid FoodRatingDto> foodRatings) {}

    public record ModerationRequest(@NotNull ReviewStatus status, @Size(max = 500) String note) {}

    public record ResponseRequest(@NotBlank @Size(max = 2000) String body) {}

    public record ReportRequest(
            @NotNull ReportType type,
            @NotNull Long restaurantId,
            Long reviewId,
            @NotBlank @Size(min = 10, max = 2000, message = "Please describe the problem in 10 to 2000 characters") String details) {}

    public record ReportDto(
            Long id,
            ReportType type,
            Long restaurantId,
            String restaurantName,
            Long reviewId,
            String reviewExcerpt,
            String reporterName,
            String details,
            ReportStatus status,
            String resolutionNote,
            Instant createdAt,
            Instant resolvedAt) {}

    public record ResolveReportRequest(@NotNull ReportStatus status, @Size(max = 500) String note) {}
}
