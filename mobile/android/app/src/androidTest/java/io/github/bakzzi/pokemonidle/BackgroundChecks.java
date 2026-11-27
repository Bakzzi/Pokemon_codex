package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.os.*;
import java.util.concurrent.TimeUnit;
import org.json.*;

final class BackgroundChecks {
    private static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    private static long consumed(AdventureStore store)throws Exception{return new JSONObject(store.read()).getJSONObject("mobile").optLong("usageConsumed",0);}
    private static JSONObject movement(AdventureStore store)throws Exception{return new JSONObject(store.read()).getJSONObject("game").optJSONObject("mapTravel");}
    private static String gameplay(AdventureStore store)throws Exception{
        JSONObject game=new JSONObject(store.read()).getJSONObject("game");
        JSONObject state=new JSONObject();
        for(String key:new String[]{"activeId","owned","seen","caught","badges","battles","journal","battle"}){
            state.put(key,game.opt(key));
        }
        // Rehydrating the presentation can shift deadlines without advancing a turn.
        JSONObject pending=game.optJSONObject("pendingBattle");
        if(pending!=null){pending.remove("at");state.put("pendingBattle",pending);}
        return state.toString();
    }
    private static void await(BackgroundAdventure runner,AdventureStore store,long expected)throws Exception{
        long end=SystemClock.elapsedRealtime()+45000;
        do{runner.barrier().get(45,TimeUnit.SECONDS);if(consumed(store)==expected)return;Thread.sleep(50);}while(SystemClock.elapsedRealtime()<end);
        check(false,"Paid cursor differs: "+store.read());
    }
    private static void awaitTouches(BackgroundAdventure runner,AdventureStore store,long expected)throws Exception{
        long end=SystemClock.elapsedRealtime()+15000;
        do {
            runner.barrier().get(15,TimeUnit.SECONDS);
            JSONObject account=movement(store);
            if(account!=null&&account.optLong("touchesObserved",-1)==expected)return;
            Thread.sleep(50);
        } while(SystemClock.elapsedRealtime()<end);
        throw new AssertionError("Touch cursor did not reach "+expected+": "+movement(store));
    }
    static Bundle run(Context context)throws Exception{
        AdventureStore store=AdventureStore.get(context);Object owner=new Object();store.claimUi(owner);
        // An existing adventure: a fresh installation now waits for its first dialogue.
        check(store.saveUi(owner,"{\"format\":1,\"game\":{\"version\":1},\"mobile\":{\"consumed\":0},\"savedAt\":0}"),"Fixture save failed");store.releaseUi(owner);
        android.content.SharedPreferences prefs=context.getSharedPreferences("steps",0);prefs.edit().putLong("usageMillis",0).putLong("lockEpoch",0).commit();
        SharedPreferences touches=TouchService.preferences(context);
        touches.edit().putLong("total",0).commit();
        context.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("walking","모험 기록",NotificationManager.IMPORTANCE_LOW));
        BackgroundAdventure runner=BackgroundAdventure.get(context);
        runner.request();awaitTouches(runner,store,0);
        // The legacy loader regenerates version-one saves with automatic travel enabled.
        // Use the migrated save to represent a player without an active destination.
        store.claimUi(owner);
        JSONObject stationary=new JSONObject(store.read());
        JSONObject game=stationary.getJSONObject("game");
        game.put("storyTravel",new JSONObject().put("enabled",false));
        game.getJSONObject("kantoWorld").remove("journey");
        check(store.saveUi(owner,stationary.toString()),"Stationary fixture save failed");
        store.releaseUi(owner);
        touches.edit().putLong("total",9).commit();runner.request();awaitTouches(runner,store,9);
        String before=gameplay(store);touches.edit().putLong("total",10).commit();runner.request();awaitTouches(runner,store,10);check(before.equals(gameplay(store)),"Ten background touches changed battle progress");check(movement(store).getLong("bank")==20,"Idle background touches were not banked: "+movement(store));
        prefs.edit().putLong("usageMillis",19999).commit();runner.request();await(runner,store,0);
        prefs.edit().putLong("usageMillis",20000).commit();runner.request();await(runner,store,20000);check(!new JSONObject(store.read()).getJSONObject("game").isNull("battle"),"No background lock action");
        before=gameplay(store);touches.edit().putLong("total",25).commit();runner.request();awaitTouches(runner,store,25);runner.request();await(runner,store,20000);check(before.equals(gameplay(store)),"Touches advanced a background battle");check(movement(store).getLong("bank")==50,"Battle-time idle touches were lost or replayed");
        prefs.edit().putLong("usageMillis",40000).commit();runner.request();await(runner,store,40000);
        runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);touches.edit().putLong("total",35).commit();runner.request();awaitTouches(runner,store,35);
        prefs.edit().putLong("usageMillis",60000).commit();runner.request();await(runner,store,60000);
        AdventureStore.Snapshot stale=store.backgroundSnapshot();store.claimUi(owner);JSONObject latest=new JSONObject(store.read());latest.getJSONObject("game").put("fixtureMarker","UI retained");check(store.saveUi(owner,latest.toString()),"UI save failed");check(!store.commitBackground(stale,stale.raw),"Background overwrote foreground");
        touches.edit().putLong("total",55).commit();runner.request();await(runner,store,60000);check(touches.getLong("total",-1)==55,"Displayed touch count was lost while UI owned the save");
        String valid=store.read();check(!store.saveUi(owner,"not-json"),"Invalid save accepted");check(valid.equals(store.read()),"Rejected save damaged progress");
        store.releaseUi(owner);check(!store.commitBackground(stale,stale.raw),"Old generation accepted after return");
        touches.edit().putLong("total",65).commit();runner.request();awaitTouches(runner,store,65);touches.edit().putLong("total",75).commit();runner.request();awaitTouches(runner,store,75);
        prefs.edit().putLong("usageMillis",80000).commit();runner.request();await(runner,store,80000);
        check("UI retained".equals(new JSONObject(store.read()).getJSONObject("game").getString("fixtureMarker")),"UI change lost after handoff");
        // A due grant must wake the native runner even with unchanged touch/lock counters.
        store.claimUi(owner);JSONObject daily=new JSONObject(store.read()),account=daily.getJSONObject("game").getJSONObject("mapTravel");
        long dailyAt=System.currentTimeMillis()-2*43200000L-1000,bank=account.getLong("bank");account.put("dailyAt",dailyAt);
        check(!BackgroundAdventure.dailyMovementDue(account,dailyAt+43200000L-1),"Daily reward triggered early");
        check(BackgroundAdventure.dailyMovementDue(account,dailyAt+43200000L),"Daily reward missing at boundary");
        check(!BackgroundAdventure.dailyMovementDue(account,dailyAt-1),"Clock rollback grants a reward");
        check(store.saveUi(owner,daily.toString()),"Daily fixture save failed");store.releaseUi(owner);before=gameplay(store);
        runner.request();runner.barrier().get(45,TimeUnit.SECONDS);JSONObject paid=new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel");
        check(paid.getLong("bank")==bank+4000&&paid.getLong("dailyAt")==dailyAt+2*43200000L,"Daily bank or remainder incorrect");
        check(consumed(store)==80000&&before.equals(gameplay(store)),"Daily grant advanced ordinary gameplay");
        runner.request();runner.barrier().get(45,TimeUnit.SECONDS);check(new JSONObject(store.read()).getJSONObject("game").getJSONObject("mapTravel").getLong("bank")==bank+4000,"Daily grant replayed");
        Bundle result=new Bundle();result.putString("result","passed");result.putInt("backgroundChecks",18);result.putLong("usageConsumed",consumed(store));result.putBoolean("noActivityCreated",!MainActivity.visible);context.getSystemService(NotificationManager.class).cancel(7);runner.closeWhenIdle();runner.barrier().get(10,TimeUnit.SECONDS);return result;
    }
}
