package io.github.bakzzi.pokemonidle;

import java.time.Instant;
import java.time.ZoneId;

/** Displayed walking counts are independent of the offline adventure reward cursor. */
public final class WalkingCounter {
    public long total, today, lastCount = -1, lastBoot = -1, lastSample = -1;
    public String day = "";
    public static String dayKey(long now, ZoneId zone) { return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().toString(); }
    public static long nextMidnight(long now, ZoneId zone) { return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(); }
    public void rollover(long now, ZoneId zone) { String current=dayKey(now,zone);if(!current.equals(day)){day=current;today=0;} }
    public void sample(long count, long boot, long elapsed, long eventTime, long now, ZoneId zone) {
        rollover(now,zone);
        if(count<0||elapsed<0)return;
        if(boot==lastBoot&&elapsed<=lastSample)return;
        if(boot==lastBoot&&lastCount>=0&&count>=lastCount&&elapsed>lastSample){
            long delta=count-lastCount;
            if(delta<=1000000){total+=delta;if(day.equals(dayKey(eventTime,zone)))today+=delta;}
        }
        lastCount=count;lastBoot=boot;lastSample=elapsed;
    }
    public void resetBaseline(){lastCount=-1;lastSample=-1;}
}
