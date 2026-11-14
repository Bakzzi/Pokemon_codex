import io.github.bakzzi.pokemonidle.WalkingCounter;
import java.time.Instant;
import java.time.ZoneId;
public class WalkingMonthTest {
    static final ZoneId Z=ZoneId.of("Asia/Seoul");
    static long at(String s){return Instant.parse(s).toEpochMilli();}
    static void equal(long expected,long actual){if(expected!=actual)throw new AssertionError(expected+" != "+actual);}
    static void check(boolean ok){if(!ok)throw new AssertionError("Monthly walking invariant failed");}
    public static void main(String[] args){
        long now=at("2026-11-15T03:00:00Z"),tomorrow=now+86400000;
        WalkingCounter c=new WalkingCounter();c.total=103444;c.today=71;c.day=WalkingCounter.dayKey(now,Z);c.rollover(now,Z);
        equal(71,c.thisMonth);equal(103444,c.total);check(c.monthPartial&&c.monthSince.equals("2026-11-15"));
        c.rollover(now,Z);equal(71,c.thisMonth);c.sample(1000,1,1,now,now,Z);c.sample(1029,1,2,now,now,Z);
        equal(100,c.thisMonth);equal(100,c.today);equal(103473,c.total);
        c.rollover(tomorrow,Z);equal(100,c.thisMonth);equal(0,c.today);
        c.sample(1034,1,3,now,tomorrow,Z);equal(105,c.thisMonth);equal(0,c.today);
        WalkingCounter restored=new WalkingCounter();restored.total=c.total;restored.today=c.today;restored.day=c.day;restored.month=c.month;restored.thisMonth=c.thisMonth;restored.monthSince=c.monthSince;restored.monthPartial=c.monthPartial;restored.lastCount=c.lastCount;restored.lastBoot=c.lastBoot;restored.lastSample=c.lastSample;
        restored.rollover(tomorrow,Z);equal(105,restored.thisMonth);check(restored.monthPartial);
        restored.sample(1034,1,3,now,tomorrow,Z);equal(105,restored.thisMonth);
        long december=at("2026-11-30T15:00:00Z"),lifetime=restored.total;
        restored.rollover(december,Z);equal(0,restored.thisMonth);equal(lifetime,restored.total);check(!restored.monthPartial&&restored.month.equals("2026-12"));
        restored.sample(1044,1,4,december-1000,december,Z);equal(0,restored.thisMonth);equal(0,restored.today);equal(lifetime+10,restored.total);
        restored.sample(1054,1,5,december,december,Z);equal(10,restored.thisMonth);equal(10,restored.today);
        restored.rollover(now,Z);equal(10,restored.thisMonth);restored.rollover(december,Z);equal(10,restored.thisMonth);
        restored.resetBaseline();restored.sample(9000,2,1,december,december,Z);equal(10,restored.thisMonth);restored.sample(9003,2,2,december,december,Z);equal(13,restored.thisMonth);
        WalkingCounter stale=new WalkingCounter();stale.total=103444;stale.today=700;stale.day="2026-11-14";stale.rollover(now,Z);equal(0,stale.thisMonth);equal(103444,stale.total);check(stale.monthPartial);
        WalkingCounter fresh=new WalkingCounter();fresh.rollover(now,Z);equal(0,fresh.thisMonth);check(!fresh.monthPartial);
        check(WalkingCounter.monthKey(december,Z).equals("2026-12")&&WalkingCounter.monthKey(december,ZoneId.of("America/New_York")).equals("2026-11"));
        System.out.println("WalkingMonth: migration, daily/monthly rollover, delayed samples, reload, replay, rollback, reboot, disabled interval and local timezone passed");
    }
}
