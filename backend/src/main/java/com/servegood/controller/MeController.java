package com.servegood.controller;

import com.servegood.dto.ApiResponse;
import com.servegood.dto.AuthDtos.ChangePasswordRequest;
import com.servegood.dto.AuthDtos.UpdateProfileRequest;
import com.servegood.dto.AuthDtos.UserDto;
import com.servegood.dto.DashboardDtos.ConsumerOverviewDto;
import com.servegood.dto.DashboardDtos.NotificationDto;
import com.servegood.dto.DashboardDtos.UnreadCountDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.dto.ReviewDtos.ReportDto;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.service.DashboardService;
import com.servegood.service.FavoriteService;
import com.servegood.service.NotificationService;
import com.servegood.service.ReportService;
import com.servegood.service.ReviewService;
import com.servegood.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Everything about the signed-in user, for any role. */
@Tag(name = "Me")
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserService users;
    private final DashboardService dashboard;
    private final FavoriteService favorites;
    private final ReviewService reviews;
    private final ReportService reports;
    private final NotificationService notifications;

    public MeController(UserService users, DashboardService dashboard, FavoriteService favorites, ReviewService reviews,
                        ReportService reports, NotificationService notifications) {
        this.users = users;
        this.dashboard = dashboard;
        this.favorites = favorites;
        this.reviews = reviews;
        this.reports = reports;
        this.notifications = notifications;
    }

    @GetMapping
    public ApiResponse<UserDto> me() {
        return ApiResponse.ok(users.me());
    }

    @PutMapping("/profile")
    public ApiResponse<UserDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(users.updateProfile(request), "Profile saved");
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        users.changePassword(request);
        return ApiResponse.ok(null, "Password changed. Other devices have been signed out.");
    }

    @DeleteMapping
    public ApiResponse<Void> deleteAccount(@RequestBody Map<String, String> body) {
        users.deleteMyAccount(body.get("password"));
        return ApiResponse.ok(null, "Your account has been deleted");
    }

    @GetMapping("/overview")
    public ApiResponse<ConsumerOverviewDto> overview() {
        return ApiResponse.ok(dashboard.consumer());
    }

    @GetMapping("/recently-viewed")
    public ApiResponse<List<RestaurantSummaryDto>> recentlyViewed(@RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(dashboard.recentlyViewed(limit == null ? 12 : Math.max(1, limit)));
    }

    // ---- favorites

    @GetMapping("/favorites")
    public ApiResponse<PageResponse<RestaurantSummaryDto>> favorites(@RequestParam(required = false) Integer page,
                                                                    @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(favorites.mine(Paging.page(page), Paging.size(size, 12)));
    }

    @PutMapping("/favorites/{restaurantId}")
    public ApiResponse<Void> addFavorite(@PathVariable Long restaurantId) {
        favorites.add(restaurantId);
        return ApiResponse.ok(null, "Saved to favourites");
    }

    @DeleteMapping("/favorites/{restaurantId}")
    public ApiResponse<Void> removeFavorite(@PathVariable Long restaurantId) {
        favorites.remove(restaurantId);
        return ApiResponse.ok(null, "Removed from favourites");
    }

    // ---- reviews and reports

    @GetMapping("/reviews")
    public ApiResponse<PageResponse<ReviewDto>> myReviews(@RequestParam(required = false) Integer page,
                                                          @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reviews.mine(Paging.page(page), Paging.size(size, 10)));
    }

    @GetMapping("/reviews/restaurant/{restaurantId}")
    public ApiResponse<ReviewDto> myReviewFor(@PathVariable Long restaurantId) {
        return ApiResponse.ok(reviews.myReviewFor(restaurantId));
    }

    @GetMapping("/reports")
    public ApiResponse<PageResponse<ReportDto>> myReports(@RequestParam(required = false) Integer page,
                                                          @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reports.mine(Paging.page(page), Paging.size(size, 10)));
    }

    // ---- notifications

    @GetMapping("/notifications")
    public ApiResponse<PageResponse<NotificationDto>> notifications(@RequestParam(defaultValue = "false") boolean unread,
                                                                    @RequestParam(required = false) Integer page,
                                                                    @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(notifications.mine(unread, Paging.page(page), Paging.size(size, 20)));
    }

    @GetMapping("/notifications/unread-count")
    public ApiResponse<UnreadCountDto> unreadCount() {
        return ApiResponse.ok(notifications.unreadCount());
    }

    @PostMapping("/notifications/{id}/read")
    public ApiResponse<NotificationDto> markRead(@PathVariable Long id) {
        return ApiResponse.ok(notifications.markRead(id));
    }

    @PostMapping("/notifications/read-all")
    public ApiResponse<Integer> markAllRead() {
        return ApiResponse.ok(notifications.markAllRead());
    }

    @DeleteMapping("/notifications/{id}")
    public ApiResponse<Void> deleteNotification(@PathVariable Long id) {
        notifications.delete(id);
        return ApiResponse.ok(null);
    }
}
