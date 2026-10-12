package com.servegood.dto;

import com.servegood.entity.enums.CategoryKind;
import com.servegood.entity.enums.FilePurpose;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/** Categories, menus and uploaded files. */
public final class CatalogDtos {

    private CatalogDtos() {}

    public record CategoryDto(
            Long id, String name, String slug, CategoryKind kind, String description, boolean active, int sortOrder) {}

    public record CategoryRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 80) @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug may use lowercase letters, digits and hyphens") String slug,
            @NotNull CategoryKind kind,
            @Size(max = 300) String description,
            Boolean active,
            Integer sortOrder) {}

    public record MenuItemDto(
            Long id,
            Long menuId,
            String name,
            String description,
            BigDecimal price,
            String imageUrl,
            boolean available,
            boolean vegetarian,
            int sortOrder) {}

    public record MenuDto(Long id, String name, String description, int sortOrder, List<MenuItemDto> items) {}

    public record MenuRequest(@NotBlank @Size(max = 100) String name, @Size(max = 300) String description, Integer sortOrder) {}

    public record MenuItemRequest(
            @NotNull Long menuId,
            @NotBlank @Size(max = 150) String name,
            @Size(max = 500) String description,
            @NotNull @DecimalMin(value = "0.0", message = "Price cannot be negative") BigDecimal price,
            @Size(max = 500) String imageUrl,
            Boolean available,
            Boolean vegetarian,
            Integer sortOrder) {}

    public record AvailabilityRequest(@NotNull Boolean available) {}

    public record ReorderRequest(@NotNull List<@Valid @NotNull Long> ids) {}

    public record FileDto(Long id, String url, String contentType, long sizeBytes, FilePurpose purpose) {}

    public record DishHitDto(
            Long itemId,
            String name,
            String description,
            BigDecimal price,
            boolean available,
            boolean vegetarian,
            Long restaurantId,
            String restaurantName,
            String locality) {}
}
