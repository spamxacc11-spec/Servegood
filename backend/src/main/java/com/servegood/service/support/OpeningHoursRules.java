package com.servegood.service.support;

import com.servegood.entity.OpeningHours;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;

/** Decides whether a restaurant is open, including intervals that run past midnight. */
public final class OpeningHoursRules {

    private OpeningHoursRules() {}

    /** Null when the restaurant has published no hours, so the UI can say "hours not listed". */
    public static Boolean isOpen(Collection<OpeningHours> hours, LocalDateTime now) {
        if (hours == null || hours.isEmpty()) {
            return null;
        }
        int today = now.getDayOfWeek().getValue();
        int yesterday = today == 1 ? 7 : today - 1;
        LocalTime t = now.toLocalTime();
        for (OpeningHours h : hours) {
            boolean overnight = !h.getClosesAt().isAfter(h.getOpensAt());
            if (h.getDayOfWeek() == today && !t.isBefore(h.getOpensAt()) && (overnight || t.isBefore(h.getClosesAt()))) {
                return true;
            }
            if (h.getDayOfWeek() == yesterday && overnight && t.isBefore(h.getClosesAt())) {
                return true;
            }
        }
        return false;
    }
}
