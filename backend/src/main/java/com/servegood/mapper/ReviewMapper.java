package com.servegood.mapper;

import com.servegood.dto.ReviewDtos.FoodRatingDto;
import com.servegood.dto.ReviewDtos.ReportDto;
import com.servegood.dto.ReviewDtos.ResponseDto;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.Review;
import com.servegood.entity.ReviewImage;
import com.servegood.entity.ReviewReport;
import com.servegood.entity.ReviewResponse;

public final class ReviewMapper {

    private ReviewMapper() {}

    /**
     * @param includeModeration whether the moderation note is shown. Only the author,
     *     the restaurant's owners and staff see why a review was held back.
     */
    public static ReviewDto toDto(Review r, boolean includeModeration) {
        ReviewResponse resp = r.getResponse();
        return new ReviewDto(
                r.getId(),
                r.getRestaurant().getId(),
                r.getRestaurant().getName(),
                r.getUser().getId(),
                r.isReviewerReview() ? DashboardMapper.publicName(r.getUser()) + " · ServeGood reviewer"
                        : DashboardMapper.publicName(r.getUser()),
                r.getOverallRating(),
                r.getFoodRating(),
                r.getServiceRating(),
                r.getHygieneRating(),
                r.getTitle(),
                r.getComment(),
                r.getVisitDate(),
                r.getStatus(),
                r.isReviewerReview(),
                includeModeration ? r.getModerationNote() : null,
                r.getImages().stream().map(ReviewImage::getUrl).toList(),
                r.getFoodRatings().stream()
                        .map(f -> new FoodRatingDto(f.getMenuItem() == null ? null : f.getMenuItem().getId(), f.getDishName(),
                                f.getRating()))
                        .toList(),
                resp == null ? null : new ResponseDto(resp.getId(), resp.getBody(), r.getRestaurant().getName(),
                        resp.getCreatedAt(), resp.getUpdatedAt()),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    public static ReportDto toDto(ReviewReport r) {
        String excerpt = null;
        if (r.getReview() != null) {
            String c = r.getReview().getComment();
            excerpt = c.length() > 160 ? c.substring(0, 159) + "…" : c;
        }
        return new ReportDto(r.getId(), r.getReportType(), r.getRestaurant().getId(), r.getRestaurant().getName(),
                r.getReview() == null ? null : r.getReview().getId(), excerpt, DashboardMapper.publicName(r.getReporter()),
                r.getDetails(), r.getStatus(), r.getResolutionNote(), r.getCreatedAt(), r.getResolvedAt());
    }
}
