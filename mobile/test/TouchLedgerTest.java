package io.github.bakzzi.pokemonidle;

import java.time.Instant;
import java.time.ZoneId;

public final class TouchLedgerTest {
    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }

    public static void main(String[] args) {
        TouchLedger count = new TouchLedger();
        ZoneId zone = ZoneId.of("Asia/Seoul");
        long midnight = Instant.parse("2026-12-01T15:00:00Z").toEpochMilli();
        check(count.record(true, 1, 1000, midnight - 1, zone), "First scroll missing");
        check(!count.record(true, 1, 1100, midnight - 1, zone), "Duplicate scrolling counted");
        check(!count.record(true, 1, 1400, midnight - 1, zone), "Continuing scroll counted again");
        check(count.record(true, 1, 1800, midnight - 1, zone), "New scroll not counted");
        check(count.record(true, 2, 1850, midnight - 1, zone), "Another window's scroll was hidden");
        check(count.record(false, 2, 1860, midnight, zone) && count.today == 1 && count.monthTotal == 4,
                "Daily counters reset the whole month or masked a click");
        long nextMonth = Instant.parse("2026-12-31T15:00:00Z").toEpochMilli();
        check(count.record(false, 2, 1900, nextMonth, zone) && count.day.equals("2027-01-01")
                && count.today == 1 && count.monthTotal == 1 && count.total == 5, "Monthly rollover lost the lifetime total");
        System.out.println("Touch ledger checks passed");
    }
}
