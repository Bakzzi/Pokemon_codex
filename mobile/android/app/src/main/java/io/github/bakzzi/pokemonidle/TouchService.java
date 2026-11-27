package io.github.bakzzi.pokemonidle;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityManager;
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
        ComponentName ours = new ComponentName(context, TouchService.class);
        AccessibilityManager manager = context.getSystemService(AccessibilityManager.class);
        for (AccessibilityServiceInfo info : manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
            ComponentName component = ComponentName.unflattenFromString(info.getId());
            if (ours.equals(component)) return true;
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
