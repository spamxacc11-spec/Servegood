package com.servegood.controller;

import com.servegood.dto.AdDtos.CampaignDecisionRequest;
import com.servegood.dto.AdDtos.CampaignDto;
import com.servegood.dto.AdDtos.PaymentStatusRequest;
import com.servegood.dto.ApiResponse;
import com.servegood.dto.AuthDtos.UserDto;
import com.servegood.dto.CatalogDtos.CategoryDto;
import com.servegood.dto.CatalogDtos.CategoryRequest;
import com.servegood.dto.DashboardDtos.AdminStatsDto;
import com.servegood.dto.DashboardDtos.AuditLogDto;
import com.servegood.dto.DashboardDtos.BroadcastRequest;
import com.servegood.dto.DashboardDtos.CreateStaffRequest;
import com.servegood.dto.DashboardDtos.UserAdminUpdate;
import com.servegood.dto.DeliveryDtos.DeliveryComparisonDto;
import com.servegood.dto.DeliveryDtos.DeliveryOptionDto;
import com.servegood.dto.DeliveryDtos.OptionRequest;
import com.servegood.dto.DeliveryDtos.PriceDto;
import com.servegood.dto.DeliveryDtos.PriceRequest;
import com.servegood.dto.DeliveryDtos.ProviderDto;
import com.servegood.dto.DeliveryDtos.ProviderRequest;
import com.servegood.dto.HygieneDtos.AssignmentDto;
import com.servegood.dto.HygieneDtos.AssignmentRequest;
import com.servegood.dto.HygieneDtos.AssignmentStatusRequest;
import com.servegood.dto.HygieneDtos.AuditDecisionRequest;
import com.servegood.dto.HygieneDtos.AuditDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.AdminRestaurantDto;
import com.servegood.dto.RestaurantDtos.AssignOwnerRequest;
import com.servegood.dto.RestaurantDtos.RestaurantDetailDto;
import com.servegood.dto.RestaurantDtos.StatusChangeRequest;
import com.servegood.dto.ReviewDtos.ModerationRequest;
import com.servegood.dto.ReviewDtos.ReportDto;
import com.servegood.dto.ReviewDtos.ResolveReportRequest;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.CampaignStatus;
import com.servegood.entity.enums.ReportStatus;
import com.servegood.entity.enums.ReportType;
import com.servegood.entity.enums.RestaurantStatus;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.entity.enums.UserStatus;
import com.servegood.service.AdService;
import com.servegood.service.AuditLogService;
import com.servegood.service.CatalogService;
import com.servegood.service.DashboardService;
import com.servegood.service.HygieneService;
import com.servegood.service.NotificationService;
import com.servegood.service.ReportService;
import com.servegood.service.RestaurantService;
import com.servegood.service.ReviewService;
import com.servegood.service.UserService;
import com.servegood.service.delivery.DeliveryRefreshService;
import com.servegood.service.delivery.DeliveryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
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

/** Platform administration. Every route here requires ADMIN. */
@Tag(name = "Admin")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final DashboardService dashboard;
    private final UserService users;
    private final RestaurantService restaurants;
    private final ReviewService reviews;
    private final HygieneService hygiene;
    private final ReportService reports;
    private final DeliveryService delivery;
    private final DeliveryRefreshService deliveryRefresh;
    private final AdService ads;
    private final CatalogService catalog;
    private final NotificationService notifications;
    private final AuditLogService auditLogs;

    public AdminController(DashboardService dashboard, UserService users, RestaurantService restaurants,
                           ReviewService reviews, HygieneService hygiene, ReportService reports, DeliveryService delivery,
                           DeliveryRefreshService deliveryRefresh, AdService ads, CatalogService catalog,
                           NotificationService notifications, AuditLogService auditLogs) {
        this.dashboard = dashboard;
        this.users = users;
        this.restaurants = restaurants;
        this.reviews = reviews;
        this.hygiene = hygiene;
        this.reports = reports;
        this.delivery = delivery;
        this.deliveryRefresh = deliveryRefresh;
        this.ads = ads;
        this.catalog = catalog;
        this.notifications = notifications;
        this.auditLogs = auditLogs;
    }

    @GetMapping("/stats")
    public ApiResponse<AdminStatsDto> stats() {
        return ApiResponse.ok(dashboard.admin());
    }

    // ---- users

    @GetMapping("/users")
    public ApiResponse<PageResponse<UserDto>> users(@RequestParam(required = false) String q,
                                                    @RequestParam(required = false) RoleName role,
                                                    @RequestParam(required = false) UserStatus status,
                                                    @RequestParam(required = false) Integer page,
                                                    @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(users.search(q, role, status, Paging.page(page), Paging.size(size, 20)));
    }

    @GetMapping("/users/reviewers")
    public ApiResponse<List<UserDto>> reviewers() {
        return ApiResponse.ok(users.reviewers());
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserDto> createUser(@Valid @RequestBody CreateStaffRequest request) {
        return ApiResponse.ok(users.createStaff(request), "User created");
    }

    @PutMapping("/users/{id}")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @Valid @RequestBody UserAdminUpdate request) {
        return ApiResponse.ok(users.adminUpdate(id, request), "User updated");
    }

    // ---- restaurants

    @GetMapping("/restaurants")
    public ApiResponse<PageResponse<AdminRestaurantDto>> restaurants(@RequestParam(required = false) String q,
                                                                     @RequestParam(required = false) RestaurantStatus status,
                                                                     @RequestParam(required = false) Integer page,
                                                                     @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(restaurants.adminSearch(q, status, Paging.page(page), Paging.size(size, 20)));
    }

    /** Full details of any restaurant, whatever its status, without counting a page view. */
    @GetMapping("/restaurants/{id}")
    public ApiResponse<RestaurantDetailDto> restaurant(@PathVariable Long id) {
        return ApiResponse.ok(restaurants.getManaged(id));
    }

    @PatchMapping("/restaurants/{id}/status")
    public ApiResponse<AdminRestaurantDto> restaurantStatus(@PathVariable Long id, @Valid @RequestBody StatusChangeRequest request) {
        return ApiResponse.ok(restaurants.changeStatus(id, request), "Status updated");
    }

    @PostMapping("/restaurants/{id}/owners")
    public ApiResponse<AdminRestaurantDto> addOwner(@PathVariable Long id, @Valid @RequestBody AssignOwnerRequest request) {
        return ApiResponse.ok(restaurants.assignOwner(id, request.email()), "Owner linked");
    }

    // ---- reviews

    @GetMapping("/reviews")
    public ApiResponse<PageResponse<ReviewDto>> reviews(@RequestParam(required = false) ReviewStatus status,
                                                        @RequestParam(required = false) Long restaurantId,
                                                        @RequestParam(required = false) String q,
                                                        @RequestParam(required = false) Integer page,
                                                        @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reviews.moderationQueue(status, restaurantId, q, Paging.page(page), Paging.size(size, 20)));
    }

    @PatchMapping("/reviews/{id}/moderation")
    public ApiResponse<ReviewDto> moderate(@PathVariable Long id, @Valid @RequestBody ModerationRequest request) {
        return ApiResponse.ok(reviews.moderate(id, request), "Decision saved");
    }

    @DeleteMapping("/reviews/{id}")
    public ApiResponse<Void> deleteReview(@PathVariable Long id) {
        reviews.delete(id);
        return ApiResponse.ok(null, "Review removed");
    }

    // ---- hygiene

    @GetMapping("/audits")
    public ApiResponse<PageResponse<AuditDto>> audits(@RequestParam(required = false) AuditStatus status,
                                                      @RequestParam(required = false) Long restaurantId,
                                                      @RequestParam(required = false) Integer page,
                                                      @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(hygiene.adminSearch(status, restaurantId, Paging.page(page), Paging.size(size, 20)));
    }

    @GetMapping("/audits/{id}")
    public ApiResponse<AuditDto> audit(@PathVariable Long id) {
        return ApiResponse.ok(hygiene.get(id));
    }

    @PostMapping("/audits/{id}/decision")
    public ApiResponse<AuditDto> decide(@PathVariable Long id, @Valid @RequestBody AuditDecisionRequest request) {
        return ApiResponse.ok(hygiene.decide(id, request), Boolean.TRUE.equals(request.approve()) ? "Audit approved" : "Audit sent back");
    }

    @GetMapping("/assignments")
    public ApiResponse<PageResponse<AssignmentDto>> assignments(@RequestParam(required = false) AssignmentStatus status,
                                                                @RequestParam(required = false) Long reviewerId,
                                                                @RequestParam(required = false) Integer page,
                                                                @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(hygiene.allAssignments(status, reviewerId, Paging.page(page), Paging.size(size, 20)));
    }

    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AssignmentDto> assign(@Valid @RequestBody AssignmentRequest request) {
        return ApiResponse.ok(hygiene.assign(request), "Reviewer assigned");
    }

    @PatchMapping("/assignments/{id}/status")
    public ApiResponse<AssignmentDto> assignmentStatus(@PathVariable Long id, @Valid @RequestBody AssignmentStatusRequest request) {
        return ApiResponse.ok(hygiene.updateAssignmentStatus(id, request.status()));
    }

    // ---- reports

    @GetMapping("/reports")
    public ApiResponse<PageResponse<ReportDto>> reports(@RequestParam(required = false) ReportStatus status,
                                                        @RequestParam(required = false) ReportType type,
                                                        @RequestParam(required = false) Integer page,
                                                        @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reports.search(status, type, Paging.page(page), Paging.size(size, 20)));
    }

    @PostMapping("/reports/{id}/resolve")
    public ApiResponse<ReportDto> resolve(@PathVariable Long id, @Valid @RequestBody ResolveReportRequest request,
                                          @RequestParam(defaultValue = "false") boolean flagReview) {
        return ApiResponse.ok(reports.resolve(id, request, flagReview), "Report updated");
    }

    // ---- delivery providers and pricing

    @GetMapping("/delivery-providers")
    public ApiResponse<List<ProviderDto>> providers() {
        return ApiResponse.ok(delivery.providers(true));
    }

    @PostMapping("/delivery-providers")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProviderDto> createProvider(@Valid @RequestBody ProviderRequest request) {
        return ApiResponse.ok(delivery.createProvider(request), "Provider added");
    }

    @PutMapping("/delivery-providers/{id}")
    public ApiResponse<ProviderDto> updateProvider(@PathVariable Long id, @Valid @RequestBody ProviderRequest request) {
        return ApiResponse.ok(delivery.updateProvider(id, request), "Provider saved");
    }

    @GetMapping("/restaurants/{id}/delivery")
    public ApiResponse<DeliveryComparisonDto> restaurantDelivery(@PathVariable Long id) {
        return ApiResponse.ok(delivery.manageView(id));
    }

    @PutMapping("/restaurants/{id}/delivery-options")
    public ApiResponse<DeliveryOptionDto> saveOption(@PathVariable Long id, @Valid @RequestBody OptionRequest request) {
        return ApiResponse.ok(delivery.upsertOption(id, request), "Delivery option saved");
    }

    @DeleteMapping("/delivery-options/{optionId}")
    public ApiResponse<Void> deleteOption(@PathVariable Long optionId) {
        delivery.deleteOption(optionId);
        return ApiResponse.ok(null, "Delivery option removed");
    }

    @PostMapping("/delivery-options/{optionId}/prices")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PriceDto> recordPrice(@PathVariable Long optionId, @Valid @RequestBody PriceRequest request) {
        return ApiResponse.ok(delivery.recordPrice(optionId, request), "Price recorded");
    }

    @GetMapping("/delivery-options/{optionId}/prices")
    public ApiResponse<PageResponse<PriceDto>> priceHistory(@PathVariable Long optionId,
                                                            @RequestParam(required = false) Integer page,
                                                            @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(delivery.priceHistory(optionId, Paging.page(page), Paging.size(size, 10)));
    }

    @PostMapping("/restaurants/{id}/delivery/refresh")
    public ApiResponse<DeliveryRefreshService.RefreshResult> refreshPrices(@PathVariable Long id) {
        var result = deliveryRefresh.refresh(id);
        return ApiResponse.ok(result, result.message());
    }

    // ---- advertising

    @GetMapping("/campaigns")
    public ApiResponse<PageResponse<CampaignDto>> campaigns(@RequestParam(required = false) CampaignStatus status,
                                                            @RequestParam(required = false) Integer page,
                                                            @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(ads.adminSearch(status, Paging.page(page), Paging.size(size, 20)));
    }

    @PostMapping("/campaigns/{id}/decision")
    public ApiResponse<CampaignDto> decideCampaign(@PathVariable Long id, @Valid @RequestBody CampaignDecisionRequest request) {
        return ApiResponse.ok(ads.decide(id, request), Boolean.TRUE.equals(request.approve()) ? "Campaign approved" : "Campaign rejected");
    }

    @PatchMapping("/campaigns/{id}/payment")
    public ApiResponse<CampaignDto> payment(@PathVariable Long id, @Valid @RequestBody PaymentStatusRequest request) {
        return ApiResponse.ok(ads.setPayment(id, request.paymentStatus()), "Payment status updated");
    }

    @PatchMapping("/campaigns/{id}/status")
    public ApiResponse<CampaignDto> campaignStatus(@PathVariable Long id, @RequestParam CampaignStatus status) {
        return ApiResponse.ok(ads.adminSetStatus(id, status), "Campaign updated");
    }

    // ---- categories

    @GetMapping("/categories")
    public ApiResponse<List<CategoryDto>> categories() {
        return ApiResponse.ok(catalog.categories(true));
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryDto> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(catalog.createCategory(request), "Category added");
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<CategoryDto> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(catalog.updateCategory(id, request), "Category saved");
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        catalog.deleteCategory(id);
        return ApiResponse.ok(null, "Category deleted");
    }

    // ---- notifications and audit logs

    @PostMapping("/notifications/broadcast")
    public ApiResponse<Integer> broadcast(@Valid @RequestBody BroadcastRequest request) {
        int sent = notifications.broadcast(request);
        return ApiResponse.ok(sent, "Sent to " + sent + " user(s)");
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PageResponse<AuditLogDto>> auditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(auditLogs.search(action, entityType, entityId, actor, from, to, Paging.page(page),
                Paging.size(size, 50)));
    }
}
