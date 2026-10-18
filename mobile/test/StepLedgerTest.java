import io.github.bakzzi.pokemonidle.StepLedger;
public class StepLedgerTest {
    private static void equal(long expected,long actual){if(expected!=actual)throw new AssertionError(expected+" != "+actual);}
    public static void main(String[] args){
        StepLedger l=new StepLedger();l.sample(100,1,100);l.sample(110,1,200);equal(10,l.total);
        l.sample(110,1,200);equal(10,l.total); // replay
        l.mode(true,250);l.sample(120,1,300);l.sample(150,1,400);equal(50,l.total); // unlocked/foreground included
        l.mode(false,450);l.sample(160,1,500);equal(60,l.total); // crossing a lock transition still counts once
        l.sample(180,1,600);equal(80,l.total);
        l.sample(160,1,500);l.sample(180,1,600);equal(80,l.total); // stale sample cannot move the baseline back
        l.sample(3,2,10);equal(80,l.total);l.sample(13,2,20);equal(90,l.total); // reboot baseline
        l.sample(1,2,30);equal(90,l.total);l.sample(11,2,40);equal(100,l.total); // counter rollback
        l.resetBaseline();l.sample(1000,2,50);equal(100,l.total); // disabled interval not backfilled
        System.out.println("StepLedger: replay, unlocked walking, lock transition, stale sample, reboot, rollback, disabled interval passed");
    }
}
