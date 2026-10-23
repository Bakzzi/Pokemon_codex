package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.os.*;
import java.lang.reflect.Field;
import java.util.concurrent.TimeUnit;
import org.json.*;

final class BackgroundChecks {
    private static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    private static void set(Object object,String name,Object value)throws Exception{Field f=object.getClass().getDeclaredField(name);f.setAccessible(true);f.set(object,value);}
    private static long consumed(AdventureStore store)throws Exception{return new JSONObject(store.read()).getJSONObject("mobile").optLong("lockConsumed",0);}
    private static String gameplay(AdventureStore store)throws Exception{JSONObject game=new JSONObject(store.read()).getJSONObject("game");game.remove("mapTravel");return game.toString();}
    private static void await(BackgroundAdventure runner,AdventureStore store,long expected)throws Exception{
        long end=SystemClock.elapsedRealtime()+45000;
        do{runner.barrier().get(45,TimeUnit.SECONDS);if(consumed(store)==expected)return;Thread.sleep(50);}while(SystemClock.elapsedRealtime()<end);
        check(false,"Paid cursor differs: "+store.read());
    }
    static Bundle run(Context context)throws Exception{
        AdventureStore store=AdventureStore.get(context);Object owner=new Object();store.claimUi(owner);
        // An existing adventure: a fresh installation now waits for its first dialogue.
        check(store.saveUi(owner,"{\"format\":1,\"game\":{\"version\":1},\"mobile\":{\"consumed\":0},\"savedAt\":0}"),"Fixture save failed");store.releaseUi(owner);
        android.content.SharedPreferences prefs=context.getSharedPreferences("steps",0);prefs.edit().putLong("total",0).putLong("lockMillis",0).putLong("lockEpoch",0).commit();
        StepService service=new StepService();java.lang.reflect.Method attach=ContextWrapper.class.getDeclaredMethod("attachBaseContext",Context.class);attach.setAccessible(true);attach.invoke(service,context);
        StepLedger ledger=new StepLedger();WalkingCounter walking=new WalkingCounter();set(service,"ledger",ledger);set(service,"walking",walking);set(service,"locks",new LockLedger());set(service,"prefs",prefs);set(service,"boot",1L);
        context.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("walking","걸음 모험",NotificationManager.IMPORTANCE_LOW));
        BackgroundAdventure runner=BackgroundAdventure.get(context);long now=System.currentTimeMillis();
        runner.request();await(runner,store,0);service.recordSample(0,100,now,now);service.recordSample(9,200,now,now);await(runner,store,0);
        String before=gameplay(store);service.recordSample(10,300,now,now);await(runner,store,0);check(before.equals(gameplay(store)),"Ten background steps changed battle progress");check(new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel").getLong("bank")==10,"Idle background steps were not banked");
        prefs.edit().putLong("lockMillis",19999).commit();runner.request();await(runner,store,0);
        prefs.edit().putLong("lockMillis",20000).commit();runner.request();await(runner,store,20000);check(!new JSONObject(store.read()).getJSONObject("game").isNull("battle"),"No background lock action");
        before=gameplay(store);service.recordSample(25,400,now,now);await(runner,store,20000);service.recordSample(25,400,now,now);await(runner,store,20000);check(before.equals(gameplay(store)),"Steps advanced a background battle");check(new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel").getLong("bank")==25,"Battle-time idle steps were lost or replayed");
        prefs.edit().putLong("lockMillis",40000).commit();runner.request();await(runner,store,40000);
        runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);service.recordSample(35,500,now,now);await(runner,store,40000);
        prefs.edit().putLong("lockMillis",60000).commit();runner.request();await(runner,store,60000);
        AdventureStore.Snapshot stale=store.backgroundSnapshot();store.claimUi(owner);JSONObject latest=new JSONObject(store.read());latest.getJSONObject("game").put("fixtureMarker","UI retained");check(store.saveUi(owner,latest.toString()),"UI save failed");check(!store.commitBackground(stale,stale.raw),"Background overwrote foreground");
        ledger.mode(true,550);service.recordSample(55,600,now,now);await(runner,store,60000);check(prefs.getLong("total",-1)==55&&prefs.getLong("walkingTotal",-1)==55,"Displayed steps were lost while UI owned the save");
        String valid=store.read();check(!store.saveUi(owner,"not-json"),"Invalid save accepted");check(valid.equals(store.read()),"Rejected save damaged progress");
        store.releaseUi(owner);check(!store.commitBackground(stale,stale.raw),"Old generation accepted after return");
        ledger.mode(false,650);service.recordSample(65,700,now,now);await(runner,store,60000);service.recordSample(75,800,now,now);await(runner,store,60000);
        prefs.edit().putLong("lockMillis",80000).commit();runner.request();await(runner,store,80000);
        check("UI retained".equals(new JSONObject(store.read()).getJSONObject("game").getString("fixtureMarker")),"UI change lost after handoff");
        // A due grant must wake the native runner even with unchanged sensor/lock counters.
        store.claimUi(owner);JSONObject daily=new JSONObject(store.read()),account=daily.getJSONObject("game").getJSONObject("mapTravel");
        long dailyAt=System.currentTimeMillis()-2*86400000L-1000,bank=account.getLong("bank");account.put("dailyAt",dailyAt);
        check(!BackgroundAdventure.dailyMovementDue(account,dailyAt+86400000L-1),"Daily reward triggered early");
        check(BackgroundAdventure.dailyMovementDue(account,dailyAt+86400000L),"Daily reward missing at boundary");
        check(!BackgroundAdventure.dailyMovementDue(account,dailyAt-1),"Clock rollback grants a reward");
        check(store.saveUi(owner,daily.toString()),"Daily fixture save failed");store.releaseUi(owner);before=gameplay(store);
        runner.request();runner.barrier().get(45,TimeUnit.SECONDS);JSONObject paid=new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel");
        check(paid.getLong("bank")==bank+4000&&paid.getLong("dailyAt")==dailyAt+2*86400000L,"Daily bank or remainder incorrect");
        check(consumed(store)==80000&&before.equals(gameplay(store)),"Daily grant advanced ordinary gameplay");
        runner.request();runner.barrier().get(45,TimeUnit.SECONDS);check(new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel").getLong("bank")==bank+4000,"Daily grant replayed");
        Bundle result=new Bundle();result.putString("result","passed");result.putInt("backgroundChecks",18);result.putLong("lockConsumed",consumed(store));result.putBoolean("noActivityCreated",!MainActivity.visible);context.getSystemService(NotificationManager.class).cancel(7);runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);return result;
    }
}
