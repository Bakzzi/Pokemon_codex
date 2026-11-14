import io.github.bakzzi.pokemonidle.UsageLedger;
import java.time.Instant;
import java.time.ZoneId;
public class UsagePeriodTest {
    static final ZoneId Z=ZoneId.of("Asia/Seoul");
    static long at(String s){return Instant.parse(s).toEpochMilli();}
    static void equal(long expected,long actual){if(expected!=actual)throw new AssertionError(expected+" != "+actual);}
    static void check(boolean ok){if(!ok)throw new AssertionError("Usage period invariant failed");}
    public static void main(String[] args){
        long now=at("2026-11-15T03:00:00Z");UsageLedger old=new UsageLedger();old.totalMillis=7200000;old.rollover(now,Z);
        equal(7200000,old.totalMillis);equal(0,old.todayMillis);equal(0,old.monthMillis);check(old.monthPartial&&old.monthSince.equals("2026-11-15"));
        old.start(true,100000,1);old.sample(true,161000,1,now+61000,Z);equal(7261000,old.totalMillis);equal(61000,old.todayMillis);equal(61000,old.monthMillis);
        old.sample(false,221000,1,now+121000,Z);old.sample(false,3821000,1,now+3721000,Z);equal(7321000,old.totalMillis);equal(121000,old.todayMillis);equal(121000,old.monthMillis);
        UsageLedger restored=new UsageLedger();restored.totalMillis=old.totalMillis;restored.day=old.day;restored.todayMillis=old.todayMillis;restored.month=old.month;restored.monthMillis=old.monthMillis;restored.monthSince=old.monthSince;restored.monthPartial=old.monthPartial;
        restored.rollover(now+7200000,Z);restored.start(true,100,2);restored.sample(true,60100,2,now+7260000,Z);equal(7381000,restored.totalMillis);equal(181000,restored.todayMillis);equal(181000,restored.monthMillis);
        restored.sample(true,60100,2,now+7260000,Z);equal(7381000,restored.totalMillis);
        long boundary=at("2026-11-30T15:00:00Z");UsageLedger cross=new UsageLedger();cross.rollover(boundary-30000,Z);cross.start(true,0,1);cross.sample(true,60000,1,boundary+30000,Z);
        equal(60000,cross.totalMillis);equal(30000,cross.todayMillis);equal(30000,cross.monthMillis);check(!cross.monthPartial&&cross.month.equals("2026-12"));
        cross.rollover(boundary+86400000,Z);equal(0,cross.todayMillis);equal(30000,cross.monthMillis);equal(60000,cross.totalMillis);
        cross.rollover(at("2026-12-31T15:00:00Z"),Z);equal(0,cross.monthMillis);equal(60000,cross.totalMillis);check(cross.month.equals("2027-01"));
        cross.start(true,100,-1);cross.sample(true,100000,-1,at("2026-12-31T15:01:00Z"),Z);equal(60000,cross.totalMillis);equal(0,cross.monthMillis);
        System.out.println("UsagePeriod: legacy migration, phone use vs lock, exact periods, month boundary split, daily reset, reload, replay, reboot and unknown boot passed");
    }
}
