package io.github.bakzzi.pokemonidle;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.view.accessibility.AccessibilityEvent;
import java.time.ZoneId;

public final class TouchService extends AccessibilityService {
    private TouchLedger ledger;

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("touches", MODE_PRIVATE);
    }

    static long total(Context context) { return preferences(context).getLong("total", 0); }

    static long today(Context context) {
        SharedPreferences prefs = preferences(context);
        String key = WalkingCounter.dayKey(System.currentTimeMillis(), ZoneId.systemDefault());
        return key.equals(prefs.getString("day", "")) ? prefs.getLong("today", 0) : 0;
    }

    static long monthly(Context context) {
        SharedPreferences prefs = preferences(context);
        String key = WalkingCounter.monthKey(System.currentTimeMillis(), ZoneId.systemDefault());
        return key.equals(prefs.getString("month", "")) ? prefs.getLong("monthTotal", 0) : 0;
    }

    static boolean enabled(Context context) {
        // Show the user's setting even while Android is connecting the service.
        String enabled = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName ours = new ComponentName(context, TouchService.class);
        for (String component : enabled.split(":")) {
            if (ours.equals(ComponentName.unflattenFromString(component))) return true;
        }
        return false;
    }

    @Override protected void onServiceConnected() {
        SharedPreferences prefs = preferences(this);
        ledger = new TouchLedger();
        ledger.total = prefs.getLong("total", 0);
        ledger.today = prefs.getLong("today", 0);
        ledger.monthTotal = prefs.getLong("monthTotal", 0);
        ledger.day = prefs.getString("day", "");
        ledger.month = prefs.getString("month", "");
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (ledger == null || event.isPassword() || StepService.locked(this)) return;
        int type = event.getEventType();
        if (type != AccessibilityEvent.TYPE_VIEW_CLICKED && type != AccessibilityEvent.TYPE_VIEW_SCROLLED
                && type != AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) return;
        // Retain only counters. Never query the source view, text, or event coordinates.
        if (!ledger.record(type == AccessibilityEvent.TYPE_VIEW_SCROLLED, event.getWindowId(),
                event.getEventTime(), System.currentTimeMillis(), ZoneId.systemDefault())) return;
        preferences(this).edit().putLong("total", ledger.total).putLong("today", ledger.today)
                .putLong("monthTotal", ledger.monthTotal).putString("day", ledger.day).putString("month", ledger.month).apply();
        StepService.saved();
        BackgroundAdventure.get(this).request();
    }

    @Override public void onInterrupt() {}
}
