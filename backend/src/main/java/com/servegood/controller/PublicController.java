package com.servegood.controller;

import com.servegood.dto.AdDtos.SponsoredDto;
import com.servegood.dto.ApiResponse;
import com.servegood.dto.CatalogDtos.CategoryDto;
import com.servegood.dto.CatalogDtos.FileDto;
import com.servegood.dto.DashboardDtos.PlatformStatsDto;
import com.servegood.dto.DeliveryDtos.ProviderDto;
import com.servegood.dto.HygieneDtos.CriterionDto;
import com.servegood.entity.enums.AdPlacement;
import com.servegood.entity.enums.FilePurpose;
import com.servegood.service.AdService;
import com.servegood.service.CatalogService;
import com.servegood.service.FileService;
import com.servegood.service.HygieneService;
import com.servegood.service.RestaurantService;
import com.servegood.service.SearchService;
import com.servegood.service.delivery.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Public catalogue")
@RestController
public class PublicController {

    private final SearchService search;
    private final CatalogService catalog;
    private final DeliveryService delivery;
    private final HygieneService hygiene;
    private final AdService ads;
    private final RestaurantService restaurants;
    private final FileService files;

    public PublicController(SearchService search, CatalogService catalog, DeliveryService delivery, HygieneService hygiene,
                            AdService ads, RestaurantService restaurants, FileService files) {
        this.search = search;
        this.catalog = catalog;
        this.delivery = delivery;
        this.hygiene = hygiene;
        this.ads = ads;
        this.restaurants = restaurants;
        this.files = files;
    }

    @Operation(summary = "Search restaurants, dishes and locations, plus a separately labelled sponsored strip")
    @GetMapping("/api/search")
    public ApiResponse<SearchService.SearchResult> search(
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
            @RequestParam(defaultValue = "true") boolean sponsored,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        var params = RestaurantController.params(q, category, minPrice, maxPrice, minRating, minFoodRating, minHygiene,
                verified, delivery, openNow, locality, lat, lng, radiusKm, sort, page, size);
        return ApiResponse.ok(search.search(params, sponsored));
    }

    @GetMapping("/api/categories")
    public ApiResponse<List<CategoryDto>> categories() {
        return ApiResponse.ok(catalog.categories(false));
    }

    @GetMapping("/api/delivery-providers")
    public ApiResponse<List<ProviderDto>> providers() {
        return ApiResponse.ok(delivery.providers(false));
    }

    @GetMapping("/api/hygiene/criteria")
    public ApiResponse<List<CriterionDto>> criteria() {
        return ApiResponse.ok(hygiene.criteria());
    }

    @GetMapping("/api/platform/stats")
    public ApiResponse<PlatformStatsDto> stats() {
        return ApiResponse.ok(restaurants.platformStats());
    }

    @Operation(summary = "Sponsored placements for a slot. Always rendered with a Sponsored label.")
    @GetMapping("/api/ads")
    public ApiResponse<List<SponsoredDto>> ads(@RequestParam AdPlacement placement,
                                               @RequestParam(required = false) String location,
                                               @RequestParam(required = false) String category,
                                               @RequestParam(defaultValue = "2") int limit) {
        return ApiResponse.ok(ads.serve(placement, location, category, limit));
    }

    @PostMapping("/api/ads/{id}/click")
    public ApiResponse<Void> click(@PathVariable Long id) {
        ads.click(id);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "Upload an image (JPEG, PNG or WebP, up to 5 MB). Returns its public URL.")
    @PostMapping(value = "/api/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FileDto> upload(@RequestPart("file") MultipartFile file, @RequestParam FilePurpose purpose) {
        return ApiResponse.ok(files.upload(file, purpose), "Uploaded");
    }
}
