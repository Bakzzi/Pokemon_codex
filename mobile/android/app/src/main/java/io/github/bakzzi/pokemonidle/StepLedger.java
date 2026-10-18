package io.github.bakzzi.pokemonidle;

/** Recorded steps are eligible in every screen state and checkpointed once. */
public final class StepLedger {
    public long total, lastCount = -1, lastBoot = -1, lastSample = -1, transitionAt = -1;
    public boolean foreground;
    // Legacy screen-state fields remain readable, but do not gate walking rewards.
    public void mode(boolean unlocked, long elapsed) {
        if (foreground != unlocked) { foreground = unlocked; transitionAt = elapsed; }
    }
    public void sample(long count, long boot, long elapsed) {
        if (count < 0 || elapsed < 0) return;
        if (boot == lastBoot && elapsed <= lastSample) return;
        if (boot != lastBoot) transitionAt = elapsed;
        if (boot == lastBoot && lastCount >= 0 && count >= lastCount && elapsed > lastSample) {
            long delta = count - lastCount;
            if (delta <= 1000000) total += delta;
        }
        lastCount = count; lastBoot = boot; lastSample = elapsed;
    }
    public void resetBaseline() { lastCount = -1; lastSample = -1; }
}
