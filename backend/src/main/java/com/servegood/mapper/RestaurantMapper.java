package com.servegood.mapper;

import com.servegood.dto.RestaurantDtos.AddressDto;
import com.servegood.dto.RestaurantDtos.CategoryRef;
import com.servegood.dto.RestaurantDtos.HygieneSummary;
import com.servegood.dto.RestaurantDtos.ImageDto;
import com.servegood.dto.RestaurantDtos.OpeningHoursDto;
import com.servegood.dto.RestaurantDtos.RatingSummary;
import com.servegood.dto.RestaurantDtos.RestaurantDetailDto;
import com.servegood.dto.RestaurantDtos.RestaurantSummaryDto;
import com.servegood.entity.Restaurant;
import com.servegood.entity.RestaurantAddress;
import com.servegood.service.support.HygieneScoring;
import com.servegood.service.support.OpeningHoursRules;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class RestaurantMapper {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private RestaurantMapper() {}

    /** Cheapest current delivery quote for a restaurant, used on cards. */
    public record DeliveryHighlight(boolean available, BigDecimal cheapestTotal, String cheapestProvider) {}

    /**
     * Per-request facts the entity cannot know: the time, who is asking, delivery
     * prices and distances computed in bulk for the whole page.
     */
    public record Context(
            LocalDate today,
            LocalDateTime now,
            Set<Long> favoriteIds,
            Map<Long, DeliveryHighlight> delivery,
            Map<Long, Double> distances) {

        Boolean favorite(Long id) {
            return favoriteIds == null ? null : favoriteIds.contains(id);
        }
    }

    public static RatingSummary ratings(Restaurant r) {
        return new RatingSummary(r.getAvgOverall(), r.getAvgFood(), r.getAvgService(), r.getAvgHygiene(), r.getReviewCount());
    }

    public static HygieneSummary hygiene(Restaurant r, LocalDate today, LocalDate lastAuditDate) {
        boolean verified = r.isHygieneVerified(today);
        // An expired audit keeps its score on record but stops counting as verified.
        return new HygieneSummary(r.getHygieneScore(), verified ? HygieneScoring.tier(r.getHygieneScore()) : null, verified,
                r.getHygieneVerifiedUntil(), lastAuditDate);
    }

    public static List<CategoryRef> categories(Restaurant r) {
        return r.getCategories().stream()
                .sorted(Comparator.comparing((com.servegood.entity.RestaurantCategory c) -> c.getKind())
                        .thenComparing(c -> c.getSortOrder()))
                .map(CatalogMapper::toRef)
                .toList();
    }

    public static RestaurantSummaryDto toSummary(Restaurant r, Context ctx) {
        RestaurantAddress a = r.getAddress();
        DeliveryHighlight d = ctx.delivery() == null ? null : ctx.delivery().get(r.getId());
        return new RestaurantSummaryDto(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getCoverImageUrl(),
                a == null ? null : a.getLocality(),
                a == null ? null : a.getCity(),
                categories(r),
                r.getPriceLevel(),
                r.getCostForTwo(),
                ratings(r),
                hygiene(r, ctx.today(), null),
                OpeningHoursRules.isOpen(r.getOpeningHours(), ctx.now()),
                d != null && d.available(),
                d == null ? null : d.cheapestTotal(),
                d == null ? null : d.cheapestProvider(),
                ctx.distances() == null ? null : ctx.distances().get(r.getId()),
                ctx.favorite(r.getId()));
    }

    public static RestaurantDetailDto toDetail(Restaurant r, Context ctx, Map<Integer, Long> distribution,
                                               LocalDate lastAuditDate) {
        return new RestaurantDetailDto(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getPhone(),
                r.getEmail(),
                r.getWebsite(),
                r.getPriceLevel(),
                r.getCostForTwo(),
                r.getCoverImageUrl(),
                r.getComparisonBasket(),
                r.getStatus(),
                toDto(r.getAddress()),
                categories(r),
                r.getOpeningHours().stream()
                        .map(h -> new OpeningHoursDto(h.getDayOfWeek(), h.getOpensAt().format(HHMM), h.getClosesAt().format(HHMM)))
                        .toList(),
                r.getImages().stream().map(i -> new ImageDto(i.getId(), i.getUrl(), i.getAltText(), i.getSortOrder())).toList(),
                ratings(r),
                distribution,
                hygiene(r, ctx.today(), lastAuditDate),
                OpeningHoursRules.isOpen(r.getOpeningHours(), ctx.now()),
                ctx.favorite(r.getId()),
                r.getCreatedAt());
    }

    public static AddressDto toDto(RestaurantAddress a) {
        if (a == null) {
            return null;
        }
        return new AddressDto(a.getLine1(), a.getLine2(), a.getLocality(), a.getCity(), a.getState(), a.getPostalCode(),
                a.getCountry(), a.getLatitude(), a.getLongitude());
    }
}
