package io.github.bakzzi.pokemonidle;

import java.time.Instant;
import java.time.ZoneId;

/** Observed phone-use time only; never infer time across service restarts. */
public final class UsageLedger {
    public long totalMillis, lastElapsed=-1, lastBoot=-1;
    public long todayMillis, monthMillis;
    public String day="",month="",monthSince="";
    public boolean monthPartial;
    public boolean active;
    public void start(boolean active,long elapsed,long boot){this.active=active;lastElapsed=elapsed;lastBoot=boot;}
    public void sample(boolean active,long elapsed,long boot){
        if(elapsed<0)return;
        if(this.active&&boot>=0&&boot==lastBoot&&lastElapsed>=0&&elapsed>=lastElapsed){
            totalMillis+=Math.min(elapsed-lastElapsed,Long.MAX_VALUE-totalMillis);
        }
        start(active,elapsed,boot);
    }
    public void rollover(long now,ZoneId zone){
        String current=WalkingCounter.dayKey(now,zone),currentMonth=WalkingCounter.monthKey(now,zone);
        if(!day.equals(current)){day=current;todayMillis=0;}
        if(month.isEmpty()){month=currentMonth;monthSince=current;monthPartial=totalMillis>0;}
        else if(currentMonth.compareTo(month)>0){month=currentMonth;monthMillis=0;monthSince=currentMonth+"-01";monthPartial=false;}
    }
    public void sample(boolean active,long elapsed,long boot,long now,ZoneId zone){
        rollover(now,zone);long before=totalMillis;sample(active,elapsed,boot);long delta=totalMillis-before;
        if(delta<=0)return;
        var date=Instant.ofEpochMilli(now).atZone(zone).toLocalDate();
        todayMillis+=Math.min(delta,Math.max(0,now-date.atStartOfDay(zone).toInstant().toEpochMilli()));
        if(month.equals(WalkingCounter.monthKey(now,zone)))monthMillis+=Math.min(delta,Math.max(0,now-date.withDayOfMonth(1).atStartOfDay(zone).toInstant().toEpochMilli()));
    }
}
