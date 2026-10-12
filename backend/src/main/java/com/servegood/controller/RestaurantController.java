package com.servegood.controller;

import com.servegood.dto.ApiResponse;
import com.servegood.dto.CatalogDtos.MenuDto;
import com.servegood.dto.DeliveryDtos.DeliveryComparisonDto;
import com.servegood.dto.HygieneDtos.PublicHygieneDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.RestaurantDetailDto;
import com.servegood.dto.RestaurantDtos.RestaurantRequest;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.dto.ReviewDtos.ReviewDto;
import com.servegood.dto.ReviewDtos.ReviewRequest;
import com.servegood.repository.RestaurantSearchRepository;
import com.servegood.service.CatalogService;
import com.servegood.service.HygieneService;
import com.servegood.service.RestaurantService;
import com.servegood.service.ReviewService;
import com.servegood.service.delivery.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Restaurants")
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService restaurants;
    private final CatalogService catalog;
    private final ReviewService reviews;
    private final HygieneService hygiene;
    private final DeliveryService delivery;

    public RestaurantController(RestaurantService restaurants, CatalogService catalog, ReviewService reviews,
                                HygieneService hygiene, DeliveryService delivery) {
        this.restaurants = restaurants;
        this.catalog = catalog;
        this.reviews = reviews;
        this.hygiene = hygiene;
        this.delivery = delivery;
    }

    @Operation(summary = "Search and filter publicly listed restaurants. Sponsored placements are never mixed in here.")
    @GetMapping
    public ApiResponse<PageResponse<RestaurantSummaryDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) BigDecimal minFoodRating,
            @RequestParam(required = false) Integer minHygiene,
            @RequestParam(defaultValue = "false") boolean verified,
            @RequestParam(defaultValue = "false") boolean delivery,
            @RequestParam(defaultValue = "false") boolean openNow,
            @RequestParam(required = false) String locality,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(restaurants.search(params(q, category, minPrice, maxPrice, minRating, minFoodRating,
                minHygiene, verified, delivery, openNow, locality, lat, lng, radiusKm, sort, page, size)));
    }

    static RestaurantService.SearchParams params(String q, List<String> category, Integer minPrice, Integer maxPrice,
                                                 BigDecimal minRating, BigDecimal minFoodRating, Integer minHygiene,
                                                 boolean verified, boolean delivery, boolean openNow, String locality,
                                                 Double lat, Double lng, Double radiusKm, String sort, Integer page,
                                                 Integer size) {
        RestaurantSearchRepository.Sort s;
        try {
            s = sort == null || sort.isBlank() ? RestaurantSearchRepository.Sort.RELEVANCE
                    : RestaurantSearchRepository.Sort.valueOf(sort.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            s = RestaurantSearchRepository.Sort.RELEVANCE;
        }
        boolean geo = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        return new RestaurantService.SearchParams(
                q == null || q.isBlank() ? null : q.trim().substring(0, Math.min(q.trim().length(), 100)),
                category == null ? null : category.stream().filter(c -> !c.isBlank()).limit(20).toList(),
                clamp(minPrice, 1, 4), clamp(maxPrice, 1, 4), minRating, minFoodRating, clamp(minHygiene, 0, 100),
                verified, delivery, openNow,
                locality == null || locality.isBlank() ? null : locality.trim(),
                geo ? lat : null, geo ? lng : null,
                geo && radiusKm != null ? Math.max(0.5, Math.min(radiusKm, 50)) : null,
                s, Paging.page(page), Paging.size(size, 12));
    }

    private static Integer clamp(Integer v, int min, int max) {
        return v == null ? null : Math.max(min, Math.min(max, v));
    }

    @Operation(summary = "Restaurant details by numeric id or slug")
    @GetMapping("/{idOrSlug}")
    public ApiResponse<RestaurantDetailDto> get(@PathVariable String idOrSlug) {
        return ApiResponse.ok(restaurants.getPublic(idOrSlug));
    }

    @GetMapping("/{id}/menu")
    public ApiResponse<List<MenuDto>> menu(@PathVariable Long id) {
        return ApiResponse.ok(catalog.publicMenu(id));
    }

    @Operation(summary = "Published (VERIFIED) reviews only")
    @GetMapping("/{id}/reviews")
    public ApiResponse<PageResponse<ReviewDto>> reviews(@PathVariable Long id,
                                                        @RequestParam(required = false) ReviewService.PublicSort sort,
                                                        @RequestParam(required = false) Integer page,
                                                        @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(reviews.publicReviews(id, sort, Paging.page(page), Paging.size(size, 10)));
    }

    @GetMapping("/{id}/hygiene")
    public ApiResponse<PublicHygieneDto> hygiene(@PathVariable Long id) {
        return ApiResponse.ok(hygiene.publicHygiene(id));
    }

    @Operation(summary = "All available delivery options, totals, the cheapest option and when prices were last updated")
    @GetMapping("/{id}/delivery-options")
    public ApiResponse<DeliveryComparisonDto> deliveryOptions(@PathVariable Long id) {
        return ApiResponse.ok(delivery.comparison(id));
    }

    @Operation(summary = "Create a restaurant (owner: pending approval; admin: published)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RestaurantDetailDto> create(@Valid @RequestBody RestaurantRequest request) {
        return ApiResponse.ok(restaurants.create(request), "Restaurant saved");
    }

    @PutMapping("/{id}")
    public ApiResponse<RestaurantDetailDto> update(@PathVariable Long id, @Valid @RequestBody RestaurantRequest request) {
        return ApiResponse.ok(restaurants.update(id, request), "Restaurant updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        restaurants.delete(id);
        return ApiResponse.ok(null, "Restaurant removed");
    }

    @PostMapping("/{id}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReviewDto> review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return ApiResponse.ok(reviews.create(id, request), "Review submitted for moderation");
    }
}
