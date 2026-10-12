package com.servegood.service;

import com.servegood.dto.AdDtos.SponsoredDto;
import com.servegood.dto.CatalogDtos.DishHitDto;
import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.entity.enums.AdPlacement;
import com.servegood.mapper.CatalogMapper;
import com.servegood.repository.MenuItemRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The combined search page: restaurants, matching dishes, and a separate sponsored strip. */
@Service
public class SearchService {

    public record SearchResult(
            PageResponse<RestaurantSummaryDto> restaurants, List<DishHitDto> dishes, List<SponsoredDto> sponsored) {}

    private final RestaurantService restaurantService;
    private final MenuItemRepository menuItems;
    private final AdService adService;

    public SearchService(RestaurantService restaurantService, MenuItemRepository menuItems, AdService adService) {
        this.restaurantService = restaurantService;
        this.menuItems = menuItems;
        this.adService = adService;
    }

    @Transactional
    public SearchResult search(RestaurantService.SearchParams params, boolean includeSponsored) {
        PageResponse<RestaurantSummaryDto> restaurants = restaurantService.search(params);
        List<DishHitDto> dishes = List.of();
        if (params.q() != null && params.q().trim().length() >= 2 && params.page() == 0) {
            String pattern = "%" + params.q().trim().toLowerCase(Locale.ROOT).replace("%", "").replace("_", "") + "%";
            dishes = menuItems.searchDishes(pattern, PageRequest.of(0, 12)).stream().map(CatalogMapper::toHit).toList();
        }
        List<SponsoredDto> sponsored = includeSponsored && params.page() == 0
                ? adService.serve(AdPlacement.SEARCH_RESULTS, params.locality(), null, 2)
                : List.of();
        return new SearchResult(restaurants, dishes, sponsored);
    }
}
