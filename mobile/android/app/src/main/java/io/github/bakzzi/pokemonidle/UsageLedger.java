package io.github.bakzzi.pokemonidle;

/** Observed phone-use time only; never infer time across service restarts. */
public final class UsageLedger {
    public long totalMillis, lastElapsed=-1, lastBoot=-1;
    public boolean active;
    public void start(boolean active,long elapsed,long boot){this.active=active;lastElapsed=elapsed;lastBoot=boot;}
    public void sample(boolean active,long elapsed,long boot){
        if(elapsed<0)return;
        if(this.active&&boot>=0&&boot==lastBoot&&lastElapsed>=0&&elapsed>=lastElapsed){
            totalMillis+=Math.min(elapsed-lastElapsed,Long.MAX_VALUE-totalMillis);
        }
        start(active,elapsed,boot);
    }
}
