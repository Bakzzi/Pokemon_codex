import io.github.bakzzi.pokemonidle.WalkingCounter;
import io.github.bakzzi.pokemonidle.StepLedger;
import java.time.Instant;
import java.time.ZoneId;
public class WalkingCounterTest {
    private static void equal(long expected,long actual){if(expected!=actual)throw new AssertionError(expected+" != "+actual);}
    public static void main(String[] args){
        ZoneId zone=ZoneId.of("Asia/Seoul");long before=Instant.parse("2026-10-16T14:59:00Z").toEpochMilli(),after=before+61000;
        WalkingCounter c=new WalkingCounter();c.sample(100,1,100,before,before,zone);c.sample(110,1,200,before,before,zone);equal(10,c.total);equal(10,c.today);
        c.sample(110,1,200,before,before,zone);c.sample(105,1,150,before,before,zone);c.sample(115,1,300,before,before,zone);equal(15,c.total);equal(15,c.today); // duplicate and stale samples
        StepLedger rewards=new StepLedger();rewards.mode(true,0);rewards.sample(115,1,300);rewards.sample(125,1,400);c.sample(125,1,400,before,before,zone);equal(0,rewards.total);equal(25,c.total); // foreground walking is display-only
        c.rollover(after,zone);equal(0,c.today);equal(25,c.total);equal(0,rewards.total);
        c.sample(130,1,500,before,after,zone);equal(30,c.total);equal(0,c.today); // delayed yesterday samples do not enter today
        c.sample(140,1,600,after,after,zone);equal(40,c.total);equal(10,c.today);
        c.sample(3,2,10,after,after,zone);c.sample(8,2,20,after,after,zone);equal(45,c.total);equal(15,c.today);
        c.resetBaseline();c.sample(1000,2,30,after,after,zone);c.sample(1007,2,40,after,after,zone);equal(52,c.total);equal(22,c.today); // disabled interval excluded
        WalkingCounter restored=new WalkingCounter();restored.total=c.total;restored.today=c.today;restored.day=c.day;restored.lastCount=c.lastCount;restored.lastBoot=c.lastBoot;restored.lastSample=c.lastSample;restored.sample(1007,2,40,after,after,zone);restored.sample(1009,2,50,after,after,zone);equal(54,restored.total);equal(24,restored.today);
        restored.rollover(after+86400000,zone);equal(0,restored.today);equal(54,restored.total);
        long dst=Instant.parse("2026-03-08T05:00:00Z").toEpochMilli();equal(23*3600000L,WalkingCounter.nextMidnight(dst,ZoneId.of("America/New_York"))-dst);
        if(!WalkingCounter.dayKey(before,zone).equals("2026-10-16")||!WalkingCounter.dayKey(after,zone).equals("2026-10-17"))throw new AssertionError("Local midnight not respected");
        System.out.println("WalkingCounter: 10 scenarios passed (display totals, stale samples, foreground, midnight, delayed samples, reboot, disabled interval, restore, lifetime, local timezone/DST)");
    }
}
