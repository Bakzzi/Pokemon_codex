package io.github.bakzzi.pokemonidle;

import java.time.ZoneId;

/** Counts accessibility actions without retaining event payloads. */
final class TouchLedger {
    private static final long SCROLL_GAP_MILLIS = 350;
    long total, today, monthTotal;
    String day = "", month = "";
    private long lastScroll = -1;
    private int scrollWindow;

    boolean record(boolean scroll, int window, long eventTime, long now, ZoneId zone) {
        if (scroll) {
            boolean repeats = lastScroll >= 0 && window == scrollWindow
                    && eventTime >= lastScroll && eventTime - lastScroll < SCROLL_GAP_MILLIS;
            if (lastScroll >= 0 && eventTime < lastScroll) return false;
            lastScroll = eventTime;
            scrollWindow = window;
            if (repeats) return false;
        }
        String currentDay = WalkingCounter.dayKey(now, zone);
        String currentMonth = WalkingCounter.monthKey(now, zone);
        if (!currentDay.equals(day)) { day = currentDay; today = 0; }
        if (!currentMonth.equals(month)) { month = currentMonth; monthTotal = 0; }
        total++;
        today++;
        monthTotal++;
        return true;
    }
}
