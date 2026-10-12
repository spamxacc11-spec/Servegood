package com.servegood.service.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.servegood.entity.HygieneAuditItem;
import com.servegood.entity.OpeningHours;
import com.servegood.entity.enums.HygieneCategory;
import com.servegood.service.delivery.DeliveryService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class BusinessRulesTest {

    private static List<HygieneAuditItem> items(int... scores) {
        HygieneCategory[] cats = HygieneCategory.values();
        List<HygieneAuditItem> list = new ArrayList<>();
        for (int i = 0; i < scores.length; i++) {
            HygieneAuditItem item = new HygieneAuditItem();
            item.setCategory(cats[i]);
            item.setScore(scores[i]);
            item.setWeight(cats[i].weight());
            list.add(item);
        }
        return list;
    }

    @Test
    void hygieneWeightsSumToOneHundred() {
        assertThat(Arrays.stream(HygieneCategory.values()).mapToInt(HygieneCategory::weight).sum()).isEqualTo(100);
    }

    @Test
    void perfectAuditScoresOneHundred() {
        assertThat(HygieneScoring.overallScore(items(10, 10, 10, 10, 10, 10, 10, 10))).isEqualTo(100);
    }

    @Test
    void scoreIsTheWeightedPercentage() {
        // kitchen, storage, handling, staff, pest (15 each), equipment 10, waste 8, premises 7:
        // 13.5 + 13.5 + 15 + 13.5 + 13.5 + 9 + 6.4 + 6.3 = 90.7 -> 91
        assertThat(HygieneScoring.overallScore(items(9, 9, 10, 9, 9, 9, 8, 9))).isEqualTo(91);
    }

    @Test
    void tiersMatchTheLandingPage() {
        assertThat(HygieneScoring.tier(87)).isEqualTo("Verified Clean");
        assertThat(HygieneScoring.tier(85)).isEqualTo("Verified Clean");
        assertThat(HygieneScoring.tier(84)).isEqualTo("Standard Good");
        assertThat(HygieneScoring.tier(70)).isEqualTo("Standard Good");
        assertThat(HygieneScoring.tier(69)).isEqualTo("Needs Attention");
        assertThat(HygieneScoring.tier(null)).isNull();
    }

    @Test
    void missingCategoriesAreReported() {
        assertThat(HygieneScoring.missing(items(9, 9))).hasSize(6).doesNotContain(HygieneCategory.KITCHEN_CLEANLINESS);
    }

    @Test
    void finalTotalFollowsTheFormula() {
        BigDecimal total = DeliveryService.finalTotal(new BigDecimal("545"), new BigDecimal("35"), new BigDecimal("45"),
                new BigDecimal("5"), new BigDecimal("40"));
        assertThat(total).isEqualByComparingTo("590");
        assertThat(DeliveryService.finalTotal(new BigDecimal("100"), null, null, null, null)).isEqualByComparingTo("100");
    }

    private static OpeningHours hours(int day, String opens, String closes) {
        OpeningHours h = new OpeningHours();
        h.setDayOfWeek(day);
        h.setOpensAt(LocalTime.parse(opens));
        h.setClosesAt(LocalTime.parse(closes));
        return h;
    }

    @Test
    void openNowHandlesNormalAndOvernightHours() {
        // 2026-10-07 is a Wednesday (ISO day 3).
        LocalDateTime wedNoon = LocalDateTime.of(2026, 10, 7, 12, 30);
        LocalDateTime wedEarly = LocalDateTime.of(2026, 10, 7, 0, 15);
        assertThat(OpeningHoursRules.isOpen(List.of(hours(3, "12:00", "23:00")), wedNoon)).isTrue();
        assertThat(OpeningHoursRules.isOpen(List.of(hours(3, "13:00", "23:00")), wedNoon)).isFalse();
        // Tuesday 12:00 to 00:30 still covers Wednesday 00:15.
        assertThat(OpeningHoursRules.isOpen(List.of(hours(2, "12:00", "00:30")), wedEarly)).isTrue();
        assertThat(OpeningHoursRules.isOpen(List.of(), wedNoon)).isNull();
    }

    @Test
    void slugsAreUrlSafeAndUnique() {
        assertThat(Slugs.slugify("Chakala Tiffin Room")).isEqualTo("chakala-tiffin-room");
        assertThat(Slugs.slugify("Four Bungalows Tandoor & Grill")).isEqualTo("four-bungalows-tandoor-and-grill");
        assertThat(Slugs.unique("Dosa", s -> s.equals("dosa") || s.equals("dosa-2"))).isEqualTo("dosa-3");
    }

    @Test
    void tokensAreRandomAndHashed() {
        String a = Tokens.newToken();
        String b = Tokens.newToken();
        assertThat(a).isNotEqualTo(b);
        assertThat(Tokens.hash(a)).hasSize(64).isEqualTo(Tokens.hash(a)).isNotEqualTo(a);
    }
}
