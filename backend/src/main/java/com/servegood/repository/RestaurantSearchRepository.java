package com.servegood.repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Public restaurant search, as one native query with only the filters that were
 * supplied. Returns ids in order plus distance; entities are then loaded in bulk.
 *
 * Sponsored placements never pass through here: ordering is by genuine data only.
 */
@Repository
public class RestaurantSearchRepository {

    public enum Sort { RELEVANCE, RATING, FOOD, HYGIENE, PRICE_ASC, PRICE_DESC, DISTANCE, REVIEWS, NEWEST }

    public record Criteria(
            String q,
            List<String> categories,
            Integer minPrice,
            Integer maxPrice,
            BigDecimal minRating,
            BigDecimal minFoodRating,
            Integer minHygiene,
            boolean verifiedOnly,
            boolean deliveryOnly,
            boolean openNow,
            String locality,
            Double lat,
            Double lng,
            Double radiusKm,
            Sort sort,
            LocalDate today,
            LocalDateTime now) {}

    public record Hit(long id, Double distanceKm) {}

    public record Result(List<Hit> hits, long total) {}

    private final NamedParameterJdbcTemplate jdbc;

    public RestaurantSearchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Result search(Criteria c, int page, int size) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        List<String> where = new ArrayList<>();
        where.add("r.deleted_at IS NULL");
        where.add("r.status = 'APPROVED'");
        params.addValue("today", Date.valueOf(c.today()));

        boolean geo = c.lat() != null && c.lng() != null;
        String distance = "NULL::double precision";
        if (geo) {
            params.addValue("lat", c.lat());
            params.addValue("lng", c.lng());
            distance = """
                    (6371 * acos(least(1.0, greatest(-1.0,
                        cos(radians(:lat)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(:lng))
                        + sin(radians(:lat)) * sin(radians(a.latitude))))))""";
        }

        boolean hasText = c.q() != null && !c.q().isBlank();
        if (hasText) {
            String term = c.q().trim().toLowerCase(Locale.ROOT);
            params.addValue("q", "%" + escapeLike(term) + "%");
            params.addValue("qraw", term);
            where.add("""
                    (lower(r.name) LIKE :q OR lower(coalesce(r.description, '')) LIKE :q
                     OR lower(a.locality) LIKE :q OR lower(a.city) LIKE :q
                     OR EXISTS (SELECT 1 FROM restaurant_category_assignments x
                                JOIN restaurant_categories cat ON cat.id = x.category_id
                                WHERE x.restaurant_id = r.id AND lower(cat.name) LIKE :q)
                     OR EXISTS (SELECT 1 FROM menu_items mi
                                WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND lower(mi.name) LIKE :q))""");
        }
        if (c.categories() != null && !c.categories().isEmpty()) {
            params.addValue("categories", c.categories());
            where.add("""
                    EXISTS (SELECT 1 FROM restaurant_category_assignments x
                            JOIN restaurant_categories cat ON cat.id = x.category_id
                            WHERE x.restaurant_id = r.id AND cat.slug IN (:categories))""");
        }
        if (c.minPrice() != null) {
            params.addValue("minPrice", c.minPrice());
            where.add("r.price_level >= :minPrice");
        }
        if (c.maxPrice() != null) {
            params.addValue("maxPrice", c.maxPrice());
            where.add("r.price_level <= :maxPrice");
        }
        if (c.minRating() != null) {
            params.addValue("minRating", c.minRating());
            where.add("r.avg_overall >= :minRating");
        }
        if (c.minFoodRating() != null) {
            params.addValue("minFood", c.minFoodRating());
            where.add("r.avg_food >= :minFood");
        }
        if (c.minHygiene() != null) {
            params.addValue("minHygiene", c.minHygiene());
            where.add("r.hygiene_score >= :minHygiene AND r.hygiene_verified_until >= :today");
        }
        if (c.verifiedOnly()) {
            where.add("r.hygiene_score IS NOT NULL AND r.hygiene_verified_until >= :today");
        }
        if (c.deliveryOnly()) {
            where.add("""
                    EXISTS (SELECT 1 FROM restaurant_delivery_options o JOIN delivery_providers p ON p.id = o.provider_id
                            WHERE o.restaurant_id = r.id AND o.available AND p.active)""");
        }
        if (c.openNow()) {
            int dow = c.now().getDayOfWeek().getValue();
            params.addValue("dow", dow);
            params.addValue("prevDow", dow == 1 ? 7 : dow - 1);
            params.addValue("t", Time.valueOf(c.now().toLocalTime().withNano(0)));
            where.add("""
                    EXISTS (SELECT 1 FROM restaurant_opening_hours h WHERE h.restaurant_id = r.id AND (
                        (h.day_of_week = :dow AND h.opens_at <= :t AND (h.closes_at > :t OR h.closes_at <= h.opens_at))
                        OR (h.day_of_week = :prevDow AND h.closes_at <= h.opens_at AND h.closes_at > :t)))""");
        }
        if (c.locality() != null && !c.locality().isBlank()) {
            params.addValue("locality", "%" + escapeLike(c.locality().trim().toLowerCase(Locale.ROOT)) + "%");
            where.add("(lower(a.locality) LIKE :locality OR lower(a.city) LIKE :locality)");
        }
        if (geo && c.radiusKm() != null) {
            params.addValue("radius", c.radiusKm());
            where.add("a.latitude IS NOT NULL AND " + distance + " <= :radius");
        }

        String order = switch (c.sort() == null ? Sort.RELEVANCE : c.sort()) {
            case RATING -> "r.avg_overall DESC NULLS LAST, r.review_count DESC";
            case FOOD -> "r.avg_food DESC NULLS LAST, r.review_count DESC";
            case HYGIENE -> "(CASE WHEN r.hygiene_verified_until >= :today THEN r.hygiene_score END) DESC NULLS LAST";
            case PRICE_ASC -> "r.price_level ASC, r.cost_for_two ASC NULLS LAST";
            case PRICE_DESC -> "r.price_level DESC, r.cost_for_two DESC NULLS LAST";
            case DISTANCE -> geo ? "distance_km ASC NULLS LAST" : "r.avg_overall DESC NULLS LAST";
            case REVIEWS -> "r.review_count DESC, r.avg_overall DESC NULLS LAST";
            case NEWEST -> "r.created_at DESC";
            case RELEVANCE -> hasText
                    ? "(lower(r.name) = :qraw) DESC, similarity(lower(r.name), :qraw) DESC, r.avg_overall DESC NULLS LAST"
                    : "r.avg_overall DESC NULLS LAST, r.review_count DESC";
        };

        String sql = """
                SELECT r.id, %s AS distance_km, count(*) OVER () AS total
                FROM restaurants r
                LEFT JOIN restaurant_addresses a ON a.restaurant_id = r.id
                WHERE %s
                ORDER BY %s, r.id ASC
                LIMIT :limit OFFSET :offset
                """.formatted(distance, String.join("\n  AND ", where), order);
        params.addValue("limit", size);
        params.addValue("offset", (long) page * size);

        List<Hit> hits = new ArrayList<>();
        long[] total = {0};
        jdbc.query(sql, params, rs -> {
            double d = rs.getDouble("distance_km");
            Double dist = rs.wasNull() ? null : Math.round(d * 10) / 10.0;
            hits.add(new Hit(rs.getLong("id"), dist));
            total[0] = rs.getLong("total");
        });
        if (hits.isEmpty() && page > 0) {
            // Past the last page: still report the real total.
            total[0] = count(c);
        }
        return new Result(hits, total[0]);
    }

    private long count(Criteria c) {
        Result first = search(c, 0, 1);
        return first.total();
    }

    /** Distances for a known set of restaurants, used when a page of results is loaded by id. */
    public Map<Long, Double> distances(List<Long> ids, double lat, double lng) {
        Map<Long, Double> out = new LinkedHashMap<>();
        if (ids.isEmpty()) {
            return out;
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("ids", ids).addValue("lat", lat).addValue("lng", lng);
        jdbc.query("""
                SELECT a.restaurant_id,
                       6371 * acos(least(1.0, greatest(-1.0,
                           cos(radians(:lat)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(:lng))
                           + sin(radians(:lat)) * sin(radians(a.latitude))))) AS d
                FROM restaurant_addresses a
                WHERE a.restaurant_id IN (:ids) AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
                """, params, rs -> {
            out.put(rs.getLong(1), Math.round(rs.getDouble(2) * 10) / 10.0);
        });
        return out;
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
