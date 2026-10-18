package io.github.bakzzi.pokemonidle;

/** Monotonic, observed lock time only. Never infer a gap across service restarts. */
public final class LockLedger {
    public long totalMillis, lastElapsed=-1, lastBoot=-1;
    public boolean locked;
    public void start(boolean locked,long elapsed,long boot){this.locked=locked;lastElapsed=elapsed;lastBoot=boot;}
    public void sample(boolean locked,long elapsed,long boot){
        if(elapsed<0)return;
        if(this.locked&&boot>=0&&boot==lastBoot&&lastElapsed>=0&&elapsed>=lastElapsed){
            long delta=elapsed-lastElapsed;
            totalMillis+=Math.min(delta,Long.MAX_VALUE-totalMillis);
        }
        start(locked,elapsed,boot);
    }
}
