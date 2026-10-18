import io.github.bakzzi.pokemonidle.LockLedger;
public class LockLedgerTest {
    static void equal(long a,long b){if(a!=b)throw new AssertionError(a+" != "+b);}
    public static void main(String[] args){
        LockLedger l=new LockLedger();l.start(false,1000,1);l.sample(false,61000,1);equal(0,l.totalMillis);
        l.sample(true,62000,1);l.sample(true,71999,1);equal(9999,l.totalMillis);
        l.sample(false,72000,1);equal(10000,l.totalMillis);l.sample(false,72000,1);equal(10000,l.totalMillis);
        l.sample(false,3600000,1);equal(10000,l.totalMillis);
        l.sample(true,3600001,1);l.sample(false,7200001,1);equal(3610000,l.totalMillis); // delayed Doze sample
        l.sample(true,7200002,1);l.sample(true,100,2);equal(3610000,l.totalMillis); // reboot
        l.start(false,1000000,2);l.sample(false,2000000,2);equal(3610000,l.totalMillis); // unknown restart gap
        l.start(true,2000000,-1);l.sample(true,3000000,-1);equal(3610000,l.totalMillis); // unknown boot
        l.start(true,1000,3);l.sample(true,500,3);equal(3610000,l.totalMillis); // rollback
        System.out.println("LockLedger: unlock, exact threshold, replay, Doze gap, reboot, restart, unknown boot and rollback passed");
    }
}
