package com.servegood.service.support;

import com.servegood.entity.HygieneAuditItem;
import com.servegood.entity.enums.HygieneCategory;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The one place the hygiene score and tier are calculated.
 *
 * Score: each of the eight categories is scored 0-10 and carries a weight; the
 * weights sum to 100, so overall = round(sum(score / 10 * weight)).
 * Tier (matching the landing page): 85+ Verified Clean, 70-84 Standard Good,
 * below 70 Needs Attention.
 */
public final class HygieneScoring {

    public static final String VERIFIED_CLEAN = "Verified Clean";
    public static final String STANDARD_GOOD = "Standard Good";
    public static final String NEEDS_ATTENTION = "Needs Attention";

    private HygieneScoring() {}

    public static int overallScore(Collection<HygieneAuditItem> items) {
        double total = 0;
        int weights = 0;
        for (HygieneAuditItem item : items) {
            total += item.getScore() / 10.0 * item.getWeight();
            weights += item.getWeight();
        }
        if (weights == 0) {
            return 0;
        }
        // Normalise in case a historical weight set did not sum to exactly 100.
        return (int) Math.round(total * 100.0 / weights);
    }

    public static String tier(Integer score) {
        if (score == null) {
            return null;
        }
        if (score >= 85) {
            return VERIFIED_CLEAN;
        }
        return score >= 70 ? STANDARD_GOOD : NEEDS_ATTENTION;
    }

    public static Set<HygieneCategory> missing(Collection<HygieneAuditItem> items) {
        Set<HygieneCategory> present = items.stream().map(HygieneAuditItem::getCategory).collect(Collectors.toSet());
        Set<HygieneCategory> missing = EnumSet.allOf(HygieneCategory.class);
        missing.removeAll(present);
        return missing;
    }
}
