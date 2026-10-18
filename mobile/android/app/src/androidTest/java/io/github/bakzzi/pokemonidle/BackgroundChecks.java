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
    private static long consumed(AdventureStore store)throws Exception{return new JSONObject(store.read()).getJSONObject("mobile").optLong("consumed",0);}
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
        service.recordSample(0,100,now,now);service.recordSample(9,200,now,now);await(runner,store,0);
        service.recordSample(10,300,now,now);await(runner,store,10);check(new JSONObject(store.read()).getJSONObject("game").has("battle"),"No background game action");
        service.recordSample(25,400,now,now);await(runner,store,20);service.recordSample(25,400,now,now);await(runner,store,20);
        runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);service.recordSample(35,500,now,now);await(runner,store,30);
        AdventureStore.Snapshot stale=store.backgroundSnapshot();store.claimUi(owner);JSONObject latest=new JSONObject(store.read());latest.getJSONObject("game").put("fixtureMarker","UI retained");check(store.saveUi(owner,latest.toString()),"UI save failed");check(!store.commitBackground(stale,stale.raw),"Background overwrote foreground");
        ledger.mode(true,550);service.recordSample(55,600,now,now);await(runner,store,30);check(prefs.getLong("total",-1)==35&&prefs.getLong("walkingTotal",-1)==55,"Foreground walking paid twice");
        String valid=store.read();check(!store.saveUi(owner,"not-json"),"Invalid save accepted");check(valid.equals(store.read()),"Rejected save damaged progress");
        store.releaseUi(owner);check(!store.commitBackground(stale,stale.raw),"Old generation accepted after return");
        ledger.mode(false,650);service.recordSample(65,700,now,now);await(runner,store,30);service.recordSample(75,800,now,now);await(runner,store,40);
        check("UI retained".equals(new JSONObject(store.read()).getJSONObject("game").getString("fixtureMarker")),"UI change lost after handoff");
        Bundle result=new Bundle();result.putString("result","passed");result.putInt("backgroundChecks",10);result.putLong("consumed",consumed(store));result.putBoolean("noActivityCreated",!MainActivity.visible);context.getSystemService(NotificationManager.class).cancel(7);runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);return result;
    }
}
