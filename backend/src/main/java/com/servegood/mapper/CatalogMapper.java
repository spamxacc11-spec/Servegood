package com.servegood.mapper;

import com.servegood.dto.CatalogDtos.CategoryDto;
import com.servegood.dto.CatalogDtos.DishHitDto;
import com.servegood.dto.CatalogDtos.MenuDto;
import com.servegood.dto.CatalogDtos.MenuItemDto;
import com.servegood.dto.RestaurantDtos.CategoryRef;
import com.servegood.entity.Menu;
import com.servegood.entity.MenuItem;
import com.servegood.entity.RestaurantCategory;
import java.util.List;

public final class CatalogMapper {

    private CatalogMapper() {}

    public static CategoryDto toDto(RestaurantCategory c) {
        return new CategoryDto(c.getId(), c.getName(), c.getSlug(), c.getKind(), c.getDescription(), c.isActive(),
                c.getSortOrder());
    }

    public static CategoryRef toRef(RestaurantCategory c) {
        return new CategoryRef(c.getId(), c.getName(), c.getSlug(), c.getKind());
    }

    public static MenuItemDto toDto(MenuItem i) {
        return new MenuItemDto(i.getId(), i.getMenu().getId(), i.getName(), i.getDescription(), i.getPrice(),
                i.getImageUrl(), i.isAvailable(), i.isVegetarian(), i.getSortOrder());
    }

    public static MenuDto toDto(Menu m, List<MenuItem> items) {
        return new MenuDto(m.getId(), m.getName(), m.getDescription(), m.getSortOrder(),
                items.stream().map(CatalogMapper::toDto).toList());
    }

    public static DishHitDto toHit(MenuItem i) {
        var r = i.getRestaurant();
        return new DishHitDto(i.getId(), i.getName(), i.getDescription(), i.getPrice(), i.isAvailable(), i.isVegetarian(),
                r.getId(), r.getName(), r.getAddress() == null ? null : r.getAddress().getLocality());
    }
}
