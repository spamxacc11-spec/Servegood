package com.servegood.service;

import com.servegood.dto.CatalogDtos.CategoryDto;
import com.servegood.dto.CatalogDtos.CategoryRequest;
import com.servegood.dto.CatalogDtos.MenuDto;
import com.servegood.dto.CatalogDtos.MenuItemDto;
import com.servegood.dto.CatalogDtos.MenuItemRequest;
import com.servegood.dto.CatalogDtos.MenuRequest;
import com.servegood.entity.Menu;
import com.servegood.entity.MenuItem;
import com.servegood.entity.Restaurant;
import com.servegood.entity.RestaurantCategory;
import com.servegood.exception.ApiException;
import com.servegood.mapper.CatalogMapper;
import com.servegood.repository.MenuItemRepository;
import com.servegood.repository.MenuRepository;
import com.servegood.repository.RestaurantCategoryRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.service.support.Slugs;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Restaurant categories (admin) and menus (owner). */
@Service
public class CatalogService {

    private final RestaurantCategoryRepository categories;
    private final MenuRepository menus;
    private final MenuItemRepository items;
    private final RestaurantRepository restaurants;
    private final AccessGuard guard;
    private final AuditLogService auditLog;

    public CatalogService(RestaurantCategoryRepository categories, MenuRepository menus, MenuItemRepository items,
                          RestaurantRepository restaurants, AccessGuard guard, AuditLogService auditLog) {
        this.categories = categories;
        this.menus = menus;
        this.items = items;
        this.restaurants = restaurants;
        this.guard = guard;
        this.auditLog = auditLog;
    }

    // ------------------------------------------------------------------ categories

    @Transactional(readOnly = true)
    public List<CategoryDto> categories(boolean includeInactive) {
        var list = includeInactive
                ? categories.findAllByOrderByKindAscSortOrderAscNameAsc()
                : categories.findAllByActiveTrueOrderByKindAscSortOrderAscNameAsc();
        return list.stream().map(CatalogMapper::toDto).toList();
    }

    @Transactional
    public CategoryDto createCategory(CategoryRequest request) {
        RestaurantCategory c = new RestaurantCategory();
        String slug = request.slug() == null || request.slug().isBlank() ? Slugs.slugify(request.name()) : request.slug();
        if (categories.existsBySlug(slug)) {
            throw ApiException.conflict("A category with slug '" + slug + "' already exists");
        }
        c.setSlug(slug);
        applyCategory(c, request);
        categories.save(c);
        auditLog.record("CATEGORY_CREATED", "CATEGORY", c.getId(), c.getName());
        return CatalogMapper.toDto(c);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request) {
        RestaurantCategory c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        if (request.slug() != null && !request.slug().isBlank() && !request.slug().equals(c.getSlug())) {
            if (categories.existsBySlug(request.slug())) {
                throw ApiException.conflict("A category with slug '" + request.slug() + "' already exists");
            }
            c.setSlug(request.slug());
        }
        applyCategory(c, request);
        auditLog.record("CATEGORY_UPDATED", "CATEGORY", c.getId(), c.getName() + " active=" + c.isActive());
        return CatalogMapper.toDto(c);
    }

    /** Deleting removes the category from every restaurant that had it. */
    @Transactional
    public void deleteCategory(Long id) {
        RestaurantCategory c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        categories.delete(c);
        auditLog.record("CATEGORY_DELETED", "CATEGORY", id, c.getName());
    }

    private static void applyCategory(RestaurantCategory c, CategoryRequest r) {
        c.setName(r.name().trim());
        c.setKind(r.kind());
        c.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().trim());
        c.setActive(r.active() == null || r.active());
        c.setSortOrder(r.sortOrder() == null ? 0 : r.sortOrder());
    }

    // ------------------------------------------------------------------ menus

    @Transactional(readOnly = true)
    public List<MenuDto> publicMenu(Long restaurantId) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId).filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        return menuTree(r.getId());
    }

    @Transactional(readOnly = true)
    public List<MenuDto> managedMenu(Long restaurantId) {
        guard.managedRestaurant(restaurantId);
        return menuTree(restaurantId);
    }

    private List<MenuDto> menuTree(Long restaurantId) {
        Map<Long, List<MenuItem>> byMenu = items.findByRestaurantIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(restaurantId)
                .stream().collect(Collectors.groupingBy(i -> i.getMenu().getId()));
        return menus.findByRestaurantIdOrderBySortOrderAscIdAsc(restaurantId).stream()
                .map(m -> CatalogMapper.toDto(m, byMenu.getOrDefault(m.getId(), List.of())))
                .toList();
    }

    @Transactional
    public MenuDto createMenu(Long restaurantId, MenuRequest request) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        Menu m = new Menu();
        m.setRestaurant(r);
        m.setName(request.name().trim());
        m.setDescription(blank(request.description()));
        m.setSortOrder(request.sortOrder() == null
                ? menus.findByRestaurantIdOrderBySortOrderAscIdAsc(restaurantId).size()
                : request.sortOrder());
        menus.save(m);
        auditLog.record("MENU_CREATED", "RESTAURANT", restaurantId, m.getName());
        return CatalogMapper.toDto(m, List.of());
    }

    @Transactional
    public MenuDto updateMenu(Long menuId, MenuRequest request) {
        Menu m = ownedMenu(menuId);
        m.setName(request.name().trim());
        m.setDescription(blank(request.description()));
        if (request.sortOrder() != null) {
            m.setSortOrder(request.sortOrder());
        }
        return CatalogMapper.toDto(m, items.findByRestaurantIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(m.getRestaurant().getId())
                .stream().filter(i -> i.getMenu().getId().equals(menuId)).toList());
    }

    @Transactional
    public void deleteMenu(Long menuId) {
        Menu m = ownedMenu(menuId);
        if (items.countByMenuIdAndDeletedAtIsNull(menuId) > 0) {
            throw ApiException.badRequest("Move or delete the items in this section first");
        }
        menus.delete(m);
        auditLog.record("MENU_DELETED", "RESTAURANT", m.getRestaurant().getId(), m.getName());
    }

    @Transactional
    public MenuItemDto createItem(Long restaurantId, MenuItemRequest request) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        Menu menu = menus.findById(request.menuId())
                .filter(m -> m.getRestaurant().getId().equals(restaurantId))
                .orElseThrow(() -> ApiException.badRequest("That menu section does not belong to this restaurant"));
        MenuItem i = new MenuItem();
        i.setRestaurant(r);
        applyItem(i, menu, request);
        items.save(i);
        auditLog.record("MENU_ITEM_CREATED", "RESTAURANT", restaurantId, i.getName() + " " + i.getPrice());
        return CatalogMapper.toDto(i);
    }

    @Transactional
    public MenuItemDto updateItem(Long itemId, MenuItemRequest request) {
        MenuItem i = ownedItem(itemId);
        Long restaurantId = i.getRestaurant().getId();
        Menu menu = menus.findById(request.menuId())
                .filter(m -> m.getRestaurant().getId().equals(restaurantId))
                .orElseThrow(() -> ApiException.badRequest("That menu section does not belong to this restaurant"));
        applyItem(i, menu, request);
        auditLog.record("MENU_ITEM_UPDATED", "RESTAURANT", restaurantId, i.getName() + " " + i.getPrice());
        return CatalogMapper.toDto(i);
    }

    @Transactional
    public MenuItemDto setAvailability(Long itemId, boolean available) {
        MenuItem i = ownedItem(itemId);
        i.setAvailable(available);
        return CatalogMapper.toDto(i);
    }

    /** Soft delete, so dish ratings on older reviews keep their reference. */
    @Transactional
    public void deleteItem(Long itemId) {
        MenuItem i = ownedItem(itemId);
        i.setDeletedAt(Instant.now());
        auditLog.record("MENU_ITEM_DELETED", "RESTAURANT", i.getRestaurant().getId(), i.getName());
    }

    private void applyItem(MenuItem i, Menu menu, MenuItemRequest r) {
        i.setMenu(menu);
        i.setName(r.name().trim());
        i.setDescription(blank(r.description()));
        i.setPrice(r.price());
        i.setImageUrl(blank(r.imageUrl()));
        i.setAvailable(r.available() == null || r.available());
        i.setVegetarian(Boolean.TRUE.equals(r.vegetarian()));
        if (r.sortOrder() != null) {
            i.setSortOrder(r.sortOrder());
        }
    }

    private Menu ownedMenu(Long menuId) {
        Menu m = menus.findById(menuId).orElseThrow(() -> ApiException.notFound("Menu section"));
        guard.managedRestaurant(m.getRestaurant().getId());
        return m;
    }

    private MenuItem ownedItem(Long itemId) {
        MenuItem i = items.findByIdAndDeletedAtIsNull(itemId).orElseThrow(() -> ApiException.notFound("Menu item"));
        guard.managedRestaurant(i.getRestaurant().getId());
        return i;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
