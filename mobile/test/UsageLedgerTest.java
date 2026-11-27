import io.github.bakzzi.pokemonidle.UsageLedger;
public class UsageLedgerTest {
    static void equal(long a,long b){if(a!=b)throw new AssertionError(a+" != "+b);}
    public static void main(String[] args){
        UsageLedger l=new UsageLedger();l.start(false,1000,1);l.sample(false,61000,1);equal(0,l.totalMillis);
        l.sample(true,62000,1);l.sample(true,81999,1);equal(19999,l.totalMillis);
        l.sample(false,82000,1);equal(20000,l.totalMillis);l.sample(false,3600000,1);equal(20000,l.totalMillis);
        l.sample(true,3600001,1);l.sample(true,3600001,1);equal(20000,l.totalMillis);
        l.sample(false,3620001,1);equal(40000,l.totalMillis);
        l.start(true,1000,2);l.sample(true,100,3);equal(40000,l.totalMillis);
        l.start(true,1000,-1);l.sample(true,90000,-1);equal(40000,l.totalMillis);
        l.start(true,1000,3);l.sample(true,500,3);equal(40000,l.totalMillis);
        l.start(false,100000,3);l.sample(false,900000,3);equal(40000,l.totalMillis);
        UsageLedger streak = new UsageLedger();
        streak.start(true, 1000, 1);
        streak.sample(true, 3600999, 1);
        equal(0, streak.bonusActions);
        streak.sample(true, 3601000, 1);
        equal(1, streak.bonusActions);
        streak.sample(false, 7201000, 1);
        streak.sample(false, 7201000, 1);
        equal(2, streak.bonusActions);

        streak.sample(true, 8000000, 1);
        streak.sample(false, 10000000, 1);
        streak.sample(true, 11000000, 1);
        streak.sample(true, 13000000, 1);
        equal(2, streak.bonusActions);
        equal(11200000, streak.totalMillis);

        UsageLedger resumed = new UsageLedger();
        resumed.bonusActions = streak.bonusActions;
        resumed.start(true, 18000000, 1);
        resumed.sample(true, 20000000, 1);
        resumed.sample(true, 1000, 2);
        resumed.sample(true, 2001000, 2);
        equal(2, resumed.bonusActions);
        resumed.sample(true, 3601000, 2);
        equal(3, resumed.bonusActions);
        System.out.println("UsageLedger: active use, locking, exact thresholds, replay, restart, reboot and invalid clocks passed");
    }
}
