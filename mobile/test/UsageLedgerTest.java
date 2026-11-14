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
        System.out.println("UsageLedger: active use, locking, exact thresholds, replay, restart, reboot and invalid clocks passed");
    }
}
