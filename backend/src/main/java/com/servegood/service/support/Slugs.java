package com.servegood.service.support;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class Slugs {

    private Slugs() {}

    public static String slugify(String input) {
        String normalized = Normalizer.normalize(input == null ? "" : input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace("&", " and ")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        return normalized.isEmpty() ? "item" : normalized.substring(0, Math.min(normalized.length(), 150));
    }

    /** Appends -2, -3 ... until {@code taken} reports the slug is free. */
    public static String unique(String base, Predicate<String> taken) {
        String slug = slugify(base);
        String candidate = slug;
        int n = 2;
        while (taken.test(candidate)) {
            candidate = slug + "-" + n++;
        }
        return candidate;
    }
}
