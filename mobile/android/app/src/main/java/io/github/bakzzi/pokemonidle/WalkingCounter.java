package io.github.bakzzi.pokemonidle;

import java.time.Instant;
import java.time.ZoneId;

/** Displayed walking counts are independent of the offline adventure reward cursor. */
public final class WalkingCounter {
    public long total, today, thisMonth, lastCount = -1, lastBoot = -1, lastSample = -1;
    public String day = "", month = "", monthSince = "";
    public boolean monthPartial;
    public static String dayKey(long now, ZoneId zone) { return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().toString(); }
    public static String monthKey(long now, ZoneId zone) { return dayKey(now,zone).substring(0,7); }
    public static long nextMidnight(long now, ZoneId zone) { return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(); }
    public void rollover(long now, ZoneId zone) {
        String current=dayKey(now,zone),currentMonth=monthKey(now,zone);
        if(month.isEmpty()){
            // Older versions retain only today's count, never a monthly history.
            thisMonth=current.equals(day)?today:0;
            month=currentMonth;monthSince=current;monthPartial=total>thisMonth;
        }else if(currentMonth.compareTo(month)>0){
            month=currentMonth;thisMonth=0;monthSince=currentMonth+"-01";monthPartial=false;
        }
        if(!current.equals(day)){day=current;today=0;}
    }
    public void sample(long count, long boot, long elapsed, long eventTime, long now, ZoneId zone) {
        rollover(now,zone);
        if(count<0||elapsed<0)return;
        if(boot==lastBoot&&elapsed<=lastSample)return;
        if(boot==lastBoot&&lastCount>=0&&count>=lastCount&&elapsed>lastSample){
            long delta=count-lastCount;
            if(delta<=1000000){total+=delta;if(day.equals(dayKey(eventTime,zone)))today+=delta;if(month.equals(monthKey(eventTime,zone)))thisMonth+=delta;}
        }
        lastCount=count;lastBoot=boot;lastSample=elapsed;
    }
    public void resetBaseline(){lastCount=-1;lastSample=-1;}
}
