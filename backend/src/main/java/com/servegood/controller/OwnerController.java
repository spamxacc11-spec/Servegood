package com.servegood.controller;

import com.servegood.dto.AdDtos.CampaignDto;
import com.servegood.dto.AdDtos.CampaignRequest;
import com.servegood.dto.AdDtos.RateCardDto;
import com.servegood.dto.ApiResponse;
import com.servegood.dto.CatalogDtos.AvailabilityRequest;
import com.servegood.dto.CatalogDtos.MenuDto;
import com.servegood.dto.CatalogDtos.MenuItemDto;
import com.servegood.dto.CatalogDtos.MenuItemRequest;
import com.servegood.dto.CatalogDtos.MenuRequest;
import com.servegood.dto.DashboardDtos.OwnerOverviewDto;
import com.servegood.dto.DeliveryDtos.DeliveryComparisonDto;
import com.servegood.dto.DeliveryDtos.DeliveryOptionDto;
import com.servegood.dto.DeliveryDtos.OptionRequest;
import com.servegood.dto.DeliveryDtos.PriceDto;
import com.servegood.dto.DeliveryDtos.PriceRequest;
import com.servegood.dto.HygieneDtos.AuditDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.AdminRestaurantDto;
import com.servegood.dto.RestaurantDtos.RestaurantDetailDto;
import com.servegood.dto.ReviewDtos.ResponseRequest;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.service.AdService;
import com.servegood.service.CatalogService;
import com.servegood.service.DashboardService;
import com.servegood.service.HygieneService;
import com.servegood.service.RestaurantService;
import com.servegood.service.ReviewService;
import com.servegood.service.delivery.DeliveryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

/**
 * Restaurant-owner dashboard API. URL access needs RESTAURANT_OWNER; every
 * service call additionally checks the owner is linked to that restaurant.
 */
@Tag(name = "Restaurant owner")
@RestController
@RequestMapping("/api/owner")
public class OwnerController {

    private final RestaurantService restaurants;
    private final DashboardService dashboard;
    private final CatalogService catalog;
    private final ReviewService reviews;
    private final HygieneService hygiene;
    private final DeliveryService delivery;
    private final AdService ads;

    public OwnerController(RestaurantService restaurants, DashboardService dashboard, CatalogService catalog,
                           ReviewService reviews, HygieneService hygiene, DeliveryService delivery, AdService ads) {
        this.restaurants = restaurants;
        this.dashboard = dashboard;
        this.catalog = catalog;
        this.reviews = reviews;
        this.hygiene = hygiene;
        this.delivery = delivery;
        this.ads = ads;
    }

    @GetMapping("/restaurants")
    public ApiResponse<List<AdminRestaurantDto>> myRestaurants() {
        return ApiResponse.ok(restaurants.mineWithStatus());
    }

    @GetMapping("/restaurants/{id}")
    public ApiResponse<RestaurantDetailDto> restaurant(@PathVariable Long id) {
        return ApiResponse.ok(restaurants.getManaged(id));
    }

    @GetMapping("/restaurants/{id}/overview")
    public ApiResponse<OwnerOverviewDto> overview(@PathVariable Long id) {
        return ApiResponse.ok(dashboard.owner(id));
    }

    // ---- menu

    @GetMapping("/restaurants/{id}/menus")
    public ApiResponse<List<MenuDto>> menus(@PathVariable Long id) {
        return ApiResponse.ok(catalog.managedMenu(id));
    }

    @PostMapping("/restaurants/{id}/menus")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MenuDto> createMenu(@PathVariable Long id, @Valid @RequestBody MenuRequest request) {
        return ApiResponse.ok(catalog.createMenu(id, request), "Section added");
    }

    @PutMapping("/menus/{menuId}")
    public ApiResponse<MenuDto> updateMenu(@PathVariable Long menuId, @Valid @RequestBody MenuRequest request) {
        return ApiResponse.ok(catalog.updateMenu(menuId, request), "Section saved");
    }

    @DeleteMapping("/menus/{menuId}")
    public ApiResponse<Void> deleteMenu(@PathVariable Long menuId) {
        catalog.deleteMenu(menuId);
        return ApiResponse.ok(null, "Section deleted");
    }

    @PostMapping("/restaurants/{id}/menu-items")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MenuItemDto> createItem(@PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
        return ApiResponse.ok(catalog.createItem(id, request), "Item added");
    }

    @PutMapping("/menu-items/{itemId}")
    public ApiResponse<MenuItemDto> updateItem(@PathVariable Long itemId, @Valid @RequestBody MenuItemRequest request) {
        return ApiResponse.ok(catalog.updateItem(itemId, request), "Item saved");
    }

    @PatchMapping("/menu-items/{itemId}/availability")
    public ApiResponse<MenuItemDto> availability(@PathVariable Long itemId, @Valid @RequestBody AvailabilityRequest request) {
        return ApiResponse.ok(catalog.setAvailability(itemId, request.available()));
    }

    @DeleteMapping("/menu-items/{itemId}")
    public ApiResponse<Void> deleteItem(@PathVariable Long itemId) {
        catalog.deleteItem(itemId);
        return ApiResponse.ok(null, "Item deleted");
    }

    // ---- reviews

    @GetMapping("/restaurants/{id}/reviews")
    public ApiResponse<PageResponse<ReviewDto>> reviews(@PathVariable Long id,
                                                       @RequestParam(required = false) ReviewStatus status,
                                                       @RequestParam(required = false) Boolean unanswered,
                                                       @RequestParam(required = false) Integer page,
                                                       @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reviews.forRestaurant(id, status, unanswered, Paging.page(page), Paging.size(size, 10)));
    }

    @PutMapping("/reviews/{reviewId}/response")
    public ApiResponse<ReviewDto> respond(@PathVariable Long reviewId, @Valid @RequestBody ResponseRequest request) {
        return ApiResponse.ok(reviews.respond(reviewId, request), "Response published");
    }

    @DeleteMapping("/reviews/{reviewId}/response")
    public ApiResponse<ReviewDto> deleteResponse(@PathVariable Long reviewId) {
        return ApiResponse.ok(reviews.deleteResponse(reviewId), "Response removed");
    }

    // ---- hygiene (read-only for owners)

    @GetMapping("/restaurants/{id}/hygiene")
    public ApiResponse<List<AuditDto>> hygiene(@PathVariable Long id) {
        return ApiResponse.ok(hygiene.forOwner(id));
    }

    // ---- delivery

    @GetMapping("/restaurants/{id}/delivery")
    public ApiResponse<DeliveryComparisonDto> delivery(@PathVariable Long id) {
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

    // ---- advertising

    @GetMapping("/ads/rate-card")
    public ApiResponse<RateCardDto> rateCard() {
        return ApiResponse.ok(ads.rateCard());
    }

    @GetMapping("/restaurants/{id}/campaigns")
    public ApiResponse<List<CampaignDto>> campaigns(@PathVariable Long id) {
        return ApiResponse.ok(ads.forRestaurant(id));
    }

    @PostMapping("/restaurants/{id}/campaigns")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CampaignDto> createCampaign(@PathVariable Long id, @Valid @RequestBody CampaignRequest request) {
        return ApiResponse.ok(ads.create(id, request), "Campaign saved as draft");
    }

    @PutMapping("/campaigns/{campaignId}")
    public ApiResponse<CampaignDto> updateCampaign(@PathVariable Long campaignId, @Valid @RequestBody CampaignRequest request) {
        return ApiResponse.ok(ads.update(campaignId, request), "Campaign saved");
    }

    @PostMapping("/campaigns/{campaignId}/submit")
    public ApiResponse<CampaignDto> submit(@PathVariable Long campaignId) {
        return ApiResponse.ok(ads.submit(campaignId), "Submitted for approval");
    }

    @PostMapping("/campaigns/{campaignId}/pause")
    public ApiResponse<CampaignDto> pause(@PathVariable Long campaignId) {
        return ApiResponse.ok(ads.pause(campaignId), "Campaign paused");
    }

    @PostMapping("/campaigns/{campaignId}/resume")
    public ApiResponse<CampaignDto> resume(@PathVariable Long campaignId) {
        return ApiResponse.ok(ads.resume(campaignId), "Campaign resumed");
    }

    @DeleteMapping("/campaigns/{campaignId}")
    public ApiResponse<Void> deleteCampaign(@PathVariable Long campaignId) {
        ads.deleteDraft(campaignId);
        return ApiResponse.ok(null, "Draft deleted");
    }
}
