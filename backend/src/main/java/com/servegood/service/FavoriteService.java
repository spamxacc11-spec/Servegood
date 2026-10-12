package com.servegood.service;

import com.servegood.dto.PageResponse;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.entity.Favorite;
import com.servegood.entity.Restaurant;
import com.servegood.exception.ApiException;
import com.servegood.repository.FavoriteRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.security.CurrentUser;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteService {

    private final FavoriteRepository favorites;
    private final RestaurantRepository restaurants;
    private final RestaurantService restaurantService;
    private final CurrentUser currentUser;

    public FavoriteService(FavoriteRepository favorites, RestaurantRepository restaurants,
                           RestaurantService restaurantService, CurrentUser currentUser) {
        this.favorites = favorites;
        this.restaurants = restaurants;
        this.restaurantService = restaurantService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<RestaurantSummaryDto> mine(int page, int size) {
        var result = favorites.findByUserId(currentUser.id(), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Long> ids = result.getContent().stream().map(f -> f.getRestaurant().getId()).toList();
        return PageResponse.of(restaurantService.summaries(ids, null), page, size, result.getTotalElements());
    }

    /** Idempotent: favouriting twice is not an error. */
    @Transactional
    public void add(Long restaurantId) {
        Long userId = currentUser.id();
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId).filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        if (!favorites.existsByUserIdAndRestaurantId(userId, restaurantId)) {
            Favorite f = new Favorite();
            f.setUser(currentUser.entity());
            f.setRestaurant(r);
            favorites.save(f);
        }
    }

    @Transactional
    public void remove(Long restaurantId) {
        favorites.findByUserIdAndRestaurantId(currentUser.id(), restaurantId).ifPresent(favorites::delete);
    }
}
