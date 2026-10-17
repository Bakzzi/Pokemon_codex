package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.os.*;
import android.webkit.WebView;
import org.json.*;
import java.io.*;
import java.lang.reflect.Field;
import java.util.concurrent.*;

/** Runs only from the separately signed test APK on an isolated emulator. */
public final class MobileTest extends Instrumentation {
    private Bundle arguments;
    private MainActivity activity;
    private WebView web;
    @Override public void onCreate(Bundle args){arguments=args;super.onCreate(args);start();}
    private void require(boolean condition,String message){if(!condition)throw new AssertionError(message);}
    private void walkingNotification(NotificationManager manager,String expected)throws Exception{
        for(int i=0;i<50;i++){if(java.util.Arrays.stream(manager.getActiveNotifications()).anyMatch(n->n.getId()==7&&expected.contentEquals(n.getNotification().extras.getCharSequence(Notification.EXTRA_TEXT,""))))return;Thread.sleep(100);}
        throw new AssertionError("Walking notification did not become: "+expected);
    }
    private String js(String code)throws Exception{
        CountDownLatch done=new CountDownLatch(1);String[] value={null};
        runOnMainSync(()->web.evaluateJavascript(code,result->{value[0]=result;done.countDown();}));
        require(done.await(20,TimeUnit.SECONDS),"JS timeout");return value[0];
    }
    private void waitReady()throws Exception{
        for(int i=0;i<100;i++){if("true".equals(js("typeof game!=='undefined' && !!game && !fatal && document.getElementById('battle').contentDocument.querySelectorAll('#party button').length===6 && document.getElementById('panel').contentDocument.querySelectorAll('.dex-card').length===151")))return;Thread.sleep(200);}
        throw new AssertionError("Game failed to initialize");
    }
    private String readSave()throws Exception{try(InputStream in=new FileInputStream(new File(getTargetContext().getFilesDir(),"adventure.json"));ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];for(int n;(n=in.read(b))!=-1;)out.write(b,0,n);return out.toString("UTF-8");}}
    private void screenshot(String name)throws Exception{
        try(OutputStream out=new FileOutputStream(new File(getTargetContext().getExternalFilesDir(null),name))){getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
    }
    private String layoutChecks()throws Exception{return layoutChecks("ui-layout.js");}
    private String layoutChecks(String asset)throws Exception{
        try(InputStream in=getContext().getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] bytes=new byte[4096];for(int n;(n=in.read(bytes))!=-1;)out.write(bytes,0,n);js(out.toString("UTF-8"));
        }
        for(int i=0;i<200;i++){
            String error=js("globalThis.layoutError||''");require("\"\"".equals(error),"Layout check: "+error);
            if("true".equals(js("!!globalThis.layoutResult")))return js("JSON.stringify(globalThis.layoutResult)");
            Thread.sleep(100);
        }throw new AssertionError("Layout check timed out");
    }
    private String checkInsets()throws Exception{
        String[] geometry={null};Throwable[] failure={null};
        runOnMainSync(()->{
            try{
            android.view.View parent=(android.view.View)web.getParent();
            android.view.WindowInsets insets=parent.getRootWindowInsets();
            require(insets!=null,"Missing window insets");
            android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout()|android.view.WindowInsets.Type.ime());
            int[] screen=new int[2];parent.getLocationOnScreen(screen);int[] position=new int[2];web.getLocationOnScreen(position);
            require(web.getTop()>=bars.top&&web.getLeft()>=bars.left,"Web content intersects status bar or cutout");
            require(web.getRight()<=parent.getWidth()-bars.right&&web.getBottom()<=parent.getHeight()-bars.bottom,"Web content intersects navigation bar or keyboard");
            require(web.getPaddingTop()==0&&web.getPaddingBottom()==0,"Insets applied twice inside WebView");
            geometry[0]="insets="+bars+", web="+web.getLeft()+","+web.getTop()+","+web.getRight()+","+web.getBottom()+", parent="+parent.getWidth()+"x"+parent.getHeight()+", screen="+position[0]+","+position[1];
            }catch(Throwable e){failure[0]=e;}
        });
        if(failure[0]!=null)throw new AssertionError(failure[0]);
        require("true".equals(js("(()=>{const h=document.querySelector('.app-header').getBoundingClientRect(),b=document.getElementById('settings-open').getBoundingClientRect();return h.top>=0&&b.top>=h.top&&b.bottom<=h.bottom&&b.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()")),"Header or settings button is clipped");
        return geometry[0];
    }
    @Override public void onStart(){
        Bundle result=new Bundle();
        try{
            if("background".equals(arguments.getString("mode"))){finish(Activity.RESULT_OK,BackgroundChecks.run(getTargetContext()));return;}
            if("update-checks".equals(arguments.getString("mode"))){finish(Activity.RESULT_OK,UpdateChecks.run(getTargetContext()));return;}
            if("update-battle-preserved".equals(arguments.getString("mode"))){
                JSONObject stored=new JSONObject(readSave());android.content.SharedPreferences p=getTargetContext().getSharedPreferences("verify",0);
                require(stored.getJSONObject("game").toString().equals(p.getString("immediateGame","")),"Update changed the saved battle or party");require(stored.getJSONObject("mobile").getLong("consumed")==p.getLong("immediateConsumed",-1),"Update changed the walking cursor");require(stored.getJSONObject("mobile").getLong("pausedAt")>0,"Update did not save the pause checkpoint");
                result.putLong("installed_code",getTargetContext().getPackageManager().getPackageInfo(getTargetContext().getPackageName(),0).getLongVersionCode());result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("update-checkpoint".equals(arguments.getString("mode"))){
                File file=new File(getTargetContext().getFilesDir(),"adventure.json");require(file.isFile(),"No saved adventure to checkpoint");getTargetContext().getSharedPreferences("verify",0).edit().putString("updateSaveSha",Updater.sha256(file)).commit();result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("update-preserved".equals(arguments.getString("mode"))){
                File file=new File(getTargetContext().getFilesDir(),"adventure.json");String expected=getTargetContext().getSharedPreferences("verify",0).getString("updateSaveSha","");require(!expected.isEmpty()&&expected.equals(Updater.sha256(file)),"Update changed saved adventure");
                result.putLong("installed_code",getTargetContext().getPackageManager().getPackageInfo(getTargetContext().getPackageName(),0).getLongVersionCode());result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("update-live".equals(arguments.getString("mode")))getTargetContext().getSharedPreferences("update",0).edit().putLong("checked",System.currentTimeMillis()).commit();
            activity=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            Field field=MainActivity.class.getDeclaredField("web");field.setAccessible(true);web=(WebView)field.get(activity);
            if("inspect".equals(arguments.getString("mode"))){Thread.sleep(5000);result.putString("diagnostic",js("(()=>{try{return JSON.stringify({document:document.readyState,ready:typeof ready,game:typeof game,active:typeof active,phase:typeof active!=='undefined'?active:null,party:document.getElementById('battle')?.contentDocument.querySelectorAll('#party button').length,call:(()=>{try{window.mobileLifecycle(true);return 'ok'}catch(e){return e.stack}})()})}catch(e){return e.stack}})()"));finish(Activity.RESULT_OK,result);return;}
            waitReady();Thread.sleep(1500);
            if("slot-retention".equals(arguments.getString("mode"))){
                getTargetContext().getSharedPreferences("steps",0).edit().putLong("total",0).commit();
                result.putString("slots",layoutChecks("slot-retention.js"));screenshot("slot-retention.png");
                runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));Thread.sleep(800);require(!MainActivity.visible,"Activity did not pause");
                AdventureStore slotStore=AdventureStore.get(getTargetContext());for(int i=0;i<100&&slotStore.backgroundSnapshot()==null;i++)Thread.sleep(50);require(slotStore.backgroundSnapshot()!=null,"UI save ownership was not released");
                long target=new JSONObject(readSave()).getJSONObject("mobile").getLong("consumed")+40;
                getTargetContext().getSharedPreferences("steps",0).edit().putLong("total",target).commit();BackgroundAdventure runner=BackgroundAdventure.get(getTargetContext());runner.request();
                long deadline=SystemClock.elapsedRealtime()+45000;JSONObject savedSlots;
                do{runner.barrier().get(45,TimeUnit.SECONDS);savedSlots=new JSONObject(readSave());if(savedSlots.getJSONObject("mobile").getLong("consumed")==target)break;Thread.sleep(50);}while(SystemClock.elapsedRealtime()<deadline);
                require(savedSlots.getJSONObject("mobile").getLong("consumed")==target,"Background fixture did not finish: "+savedSlots.getJSONObject("mobile")+" target="+target);
                require(savedSlots.getJSONObject("game").getJSONArray("slots").isNull(2),"Background refilled slot three");require(savedSlots.getJSONObject("game").getJSONObject("owned").has("1"),"Removed companion was lost");
                // Return through the system launcher identity, like a user opening
                // the app; an app starting itself from the background can be denied.
                try(InputStream launch=new ParcelFileDescriptor.AutoCloseInputStream(getUiAutomation().executeShellCommand("am start -W -n io.github.bakzzi.pokemonidle/.MainActivity"))){String output=new String(launch.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);require(output.contains("Status: ok"),"Fixture launch failed: "+output);}
                for(int i=0;i<100&&!MainActivity.visible;i++)Thread.sleep(50);require(MainActivity.visible,"Fixture did not return to foreground");Thread.sleep(500);
                require("true".equals(js("active=false;game.data.slots[2]===null&&game.data.owned[1]&&document.getElementById('battle').contentDocument.querySelector('#party button[data-slot=\"2\"]').classList.contains('empty')")),"Return restored the removed companion to a slot");
                result.putInt("backgroundAndReturnChecks",4);result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("move-details".equals(arguments.getString("mode"))){
                result.putString("moves",layoutChecks("move-details.js"));screenshot("move-details.png");result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("background-return".equals(arguments.getString("mode"))){
                require("true".equals(js("active=false;progression.pause(Date.now());save();progression.consumed===40&&game.data.fixtureMarker==='UI retained'")),"UI did not load completed background results");
                String current=readSave();JSONObject stale=new JSONObject(current);stale.getJSONObject("mobile").put("consumed",0);Field loaded=MainActivity.class.getDeclaredField("uiLoaded");loaded.setAccessible(true);loaded.set(activity,false);
                require("true".equals(js("Android.save("+JSONObject.quote(stale.toString())+")")),"Unloaded UI save was not ignored");require(current.equals(readSave()),"A timer saved stale UI data before resume reload");js("Android.load()");
                runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));Thread.sleep(800);require(!MainActivity.visible,"Activity did not leave foreground");
                getTargetContext().getSharedPreferences("steps",0).edit().putLong("total",50).commit();BackgroundAdventure runner=BackgroundAdventure.get(getTargetContext());runner.request();runner.barrier().get(45,TimeUnit.SECONDS);
                require(new JSONObject(readSave()).getJSONObject("mobile").getLong("consumed")==50,"No action completed while Activity was paused");
                runOnMainSync(()->getTargetContext().startActivity(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));Thread.sleep(1000);
                require("true".equals(js("progression.consumed===50&&game.data.fixtureMarker==='UI retained'")),"Foreground return lost background progress");
                js("active=false;mobileLifecycle(true,true);active=false");require("true".equals(js("progression.consumed===50")),"Foreground paid walking actions again");
                result.putInt("returnChecks",5);result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("update-immediate".equals(arguments.getString("mode"))){
                js("active=false;game=new MobileCore.Game({},Date.now());progression=new MobileProgression(game);progression.resume(Date.now());game.newWild(Date.now());game.nextTick=Date.now()+60000;game.data.switchUntil=game.nextTick;active=true;catchingUp=false;save()");
                JSONObject before=new JSONObject(readSave());getTargetContext().getSharedPreferences("verify",0).edit().putString("immediateGame",before.getJSONObject("game").toString()).putLong("immediateConsumed",before.getJSONObject("mobile").getLong("consumed")).commit();
                Updater u=Updater.current;File apk=new File(getTargetContext().getCacheDir(),"verify-update.apk");try(InputStream in=getContext().getAssets().open("update.apk");OutputStream out=new FileOutputStream(apk)){byte[] b=new byte[65536];for(int n;(n=in.read(b))!=-1;)out.write(b,0,n);}
                android.content.pm.PackageInfo info=getTargetContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),0);JSONObject manifest=new JSONObject().put("versionCode",info.getLongVersionCode()).put("bytes",apk.length()).put("sha256",Updater.sha256(apk));u.validate(apk,manifest);
                Field candidate=Updater.class.getDeclaredField("candidate");candidate.setAccessible(true);candidate.set(u,apk);Field expected=Updater.class.getDeclaredField("expected");expected.setAccessible(true);expected.set(u,manifest);
                long started=SystemClock.elapsedRealtime();u.ready=true;while(!u.installing&&u.pending==null&&SystemClock.elapsedRealtime()-started<5000)Thread.sleep(25);
                require(u.installing||u.pending!=null,"App waited for battle completion before installing");result.putLong("installSubmittedMs",SystemClock.elapsedRealtime()-started);require(new JSONObject(readSave()).getJSONObject("game").toString().equals(before.getJSONObject("game").toString()),"An extra battle action ran before update");
                result.putString("result","submitted during active battle");sendStatus(1,result);UpdateChecks.await(u);Thread.sleep(1500);finish(Activity.RESULT_OK,result);return;
            }
            if("pending-ui".equals(arguments.getString("mode"))){
                js("active=false;progression.pause(Date.now());save();back()");
                android.content.SharedPreferences p=getTargetContext().getSharedPreferences("steps",0);
                p.edit().putLong("total",730).putLong("walkingTotal",12345).putLong("walkingToday",234).putString("walkingDay",WalkingCounter.dayKey(System.currentTimeMillis(),java.time.ZoneId.systemDefault())).commit();
                require("true".equals(js("refreshNative();document.getElementById('walk-status').textContent==='모험의 발걸음'&&document.getElementById('walk-today').textContent==='234걸음'&&document.getElementById('walk-total').textContent==='12,345걸음'")),"Walking card is incorrect");
                require("true".equals(js("['battle','panel'].every(id=>!document.getElementById(id).contentDocument.body.textContent.includes('momozzing'))")),"Credits still appear outside Settings");
                require("true".equals(js("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.walk-card').getBoundingClientRect().right<=innerWidth")),"Walking card overflows");screenshot("walking-card.png");
                js("document.getElementById('settings-open').click()");require("true".equals(js("document.getElementById('settings').querySelector('.credit').checkVisibility()&&document.getElementById('settings').textContent.includes('모모찡 · momozzing')")),"Settings credit missing");js("document.getElementById('settings-close').click()");
                require("true".equals(js("(()=>{const n=Date.now(),old=n-3600000,g=new MobileCore.Game({},old),reopened=new MobileCore.Game(JSON.parse(JSON.stringify(g.data)),n),p=new MobileProgression(reopened,{consumed:0,pausedAt:old});p.resume(n);return reopened.nextTick<=n&&p.live(n+10000)&&!!reopened.data.battle})()")),"Reopened game waits through offline time again");
                NotificationManager nm=getTargetContext().getSystemService(NotificationManager.class);nm.createNotificationChannel(new NotificationChannel("walking","걸음 모험",NotificationManager.IMPORTANCE_LOW));
                nm.notify(7,StepService.notification(getTargetContext(),StepService.today(getTargetContext())));Thread.sleep(200);
                walkingNotification(nm,"오늘 234걸음");
                StepService service=new StepService();java.lang.reflect.Method attach=ContextWrapper.class.getDeclaredMethod("attachBaseContext",Context.class);attach.setAccessible(true);attach.invoke(service,getTargetContext());
                WalkingCounter counter=new WalkingCounter();counter.total=12345;counter.today=234;counter.day="2000-01-01";StepLedger rewards=new StepLedger();rewards.total=730;
                for(String name:new String[]{"walking","ledger","prefs"}){Field f=StepService.class.getDeclaredField(name);f.setAccessible(true);f.set(service,name.equals("walking")?counter:name.equals("ledger")?rewards:p);}
                java.lang.reflect.Method rollover=StepService.class.getDeclaredMethod("refreshClock");rollover.setAccessible(true);rollover.invoke(service);Field clock=StepService.class.getDeclaredField("clock");clock.setAccessible(true);((Handler)clock.get(service)).removeCallbacksAndMessages(null);Thread.sleep(200);
                require(p.getLong("walkingToday",-1)==0&&p.getLong("walkingTotal",0)==12345&&p.getLong("total",0)==730,"Daily rollover changed lifetime or offline rewards");
                walkingNotification(nm,"오늘 0걸음");
                require("true".equals(js("refreshNative();document.getElementById('walk-today').textContent==='0걸음'&&document.getElementById('walk-total').textContent==='12,345걸음'")),"Daily rollover is not reflected in the app");
                nm.cancel(7);result.putInt("pendingChecks",9);result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("journal".equals(arguments.getString("mode"))){
                js("active=false;game=new MobileCore.Game({},Date.now());game.log('꼬렛 포획!','catch',19);game.data.adventure.totals.wins=12;game.data.adventure.totals.xp=620;game.data.adventure.checkpoint={at:Date.now()+1,totals:{...game.data.adventure.totals}};progression=new MobileProgression(game);save();openPanel('journal')");
                Thread.sleep(400);
                require("true".equals(js("(()=>{const d=document.getElementById('panel').contentDocument;return !d.getElementById('journal').hidden&&!d.getElementById('journal-ack')&&d.getElementById('summary-since').textContent.includes('이번 시즌')&&d.getElementById('summary-stats').textContent.includes('620')&&d.getElementById('summary-highlights').textContent.includes('꼬렛 포획!')})()")),"Season summary or removed button is incorrect");
                screenshot("journal-summary.png");
                js("document.getElementById('panel').contentDocument.querySelector('[data-journal-tab=detail]').click()");
                require("true".equals(js("(()=>{const d=document.getElementById('panel').contentDocument;return !d.getElementById('journal-detail').hidden&&d.getElementById('journal-list').textContent.includes('꼬렛 포획!')})()")),"Detail records lost");
                js("game=new MobileCore.Game(JSON.parse(Android.load()).game,Date.now());progression=new MobileProgression(game);publish()");
                require("true".equals(js("game.panelState().summary.counts.wins===12&&game.panelState().summary.counts.xp===620&&game.panelState().summary.highlights.some(e=>e.text==='꼬렛 포획!')")),"Legacy checkpoint affected reloaded summary");
                result.putInt("journalChecks",3);result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("ui-layout".equals(arguments.getString("mode"))){
                result.putString("layout",layoutChecks());result.putString("geometry",checkInsets());screenshot("dex-list.png");
                js("document.getElementById('panel').contentDocument.querySelector('.dex-card[data-id=\"19\"]').click()");Thread.sleep(200);screenshot("dex-detail.png");
                js("openPanel('challenge')");Thread.sleep(200);screenshot("challenge-collapsed.png");
                js("back();document.getElementById('settings-open').click()");
                require("true".equals(js("document.querySelectorAll('[role=switch]').length===1&&!document.getElementById('steps-enable')&&!document.getElementById('steps-disable')")),"Walking controls are not one switch");
                getTargetContext().getSharedPreferences("steps",0).edit().putBoolean("enabled",true).commit();
                require("true".equals(js("refreshNative();document.getElementById('steps-toggle').getAttribute('aria-checked')==='true'")),"Enabled walking state missing");
                js("document.getElementById('steps-toggle').click()");Thread.sleep(400);
                require(!getTargetContext().getSharedPreferences("steps",0).getBoolean("enabled",true),"Walking switch did not disable native setting");
                require("true".equals(js("refreshNative();document.getElementById('steps-toggle').getAttribute('aria-checked')==='false'")),"Disabled walking state missing");screenshot("settings-toggle.png");
                result.putInt("walkingSwitchChecks",4);result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("update-live".equals(arguments.getString("mode"))){
                js("active=false;progression.pause(Date.now());save();document.getElementById('settings-open').click();document.getElementById('update-check').click()");Updater u=Updater.current;UpdateChecks.await(u);Thread.sleep(400);
                require(u.ready&&!u.status.contains("최신"),"Live newer release was not downloaded: "+u.status);
                require("true".equals(js("document.getElementById('version').textContent==='Android v'+JSON.parse(Android.status()).versionName&&document.getElementById('update-status').textContent===JSON.parse(Android.status()).update")),"UI version or update status differs from installed APK");
                File save=new File(getTargetContext().getFilesDir(),"adventure.json");getTargetContext().getSharedPreferences("verify",0).edit().putString("updateSaveSha",Updater.sha256(save)).commit();
                result.putString("download",u.status);result.putLong("installed_code",u.installedCode);result.putString("result","passed");sendStatus(1,result);
                if("true".equals(arguments.getString("install"))){u.install();UpdateChecks.await(u);result.putString("install_session",u.status);}
                finish(Activity.RESULT_OK,result);return;
            }
            if("insets".equals(arguments.getString("mode"))){
                result.putString("geometry",checkInsets());
                js("document.getElementById('settings-open').click()");
                require("true".equals(js("(()=>{const d=document.getElementById('settings'),r=d.getBoundingClientRect();return d.open&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()")),"Settings dialog intersects system UI");
                js("document.getElementById('settings-close').click();openPanel('collection')");
                require("true".equals(js("!document.getElementById('panel-wrap').hidden&&document.getElementById('back').getBoundingClientRect().top>=0")),"Panel back button intersects status bar");
                js("back()");
                File screenshot=new File(getTargetContext().getExternalFilesDir(null),"insets.png");
                try(OutputStream out=new FileOutputStream(screenshot)){getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
                result.putString("screenshot",screenshot.getAbsolutePath());result.putString("result","passed");finish(Activity.RESULT_OK,result);return;
            }
            if("preserved".equals(arguments.getString("mode"))){
                JSONObject save=new JSONObject(readSave());require(save.getJSONObject("mobile").getLong("consumed")>=1000,"Consumed step cursor lost");require(getTargetContext().getSharedPreferences("verify",0).getString("marker","").equals("preserved"),"Native data lost");result.putString("preserved","passed");
            }else{
                require("true".equals(js("document.getElementById('battle').contentDocument.querySelectorAll('#party button').length===6")),"Party missing");
                require("true".equals(js("document.getElementById('battle').contentDocument.getElementById('hero-image').naturalWidth>0")),"Sprite failed");
                require("true".equals(js("game.data.eventSerial>0")),"Foreground game does not advance");
                js("openPanel('collection')");Thread.sleep(400);
                require("true".equals(js("document.getElementById('panel').contentDocument.querySelectorAll('.dex-card').length===151")),"Dex missing");
                require("true".equals(js("document.getElementById('panel').contentDocument.documentElement.scrollWidth<=document.getElementById('panel').clientWidth+1")),"Horizontal overflow");
                js("openPanel('challenge')");Thread.sleep(300);require("true".equals(js("document.getElementById('panel').contentDocument.querySelectorAll('.badge-slot').length===8")),"Badges missing");
                js("openPanel('daycare')");Thread.sleep(300);require("true".equals(js("!document.getElementById('panel').contentDocument.getElementById('daycare').hidden")),"Bag inaccessible");
                js("back();save()");
                runOnMainSync(()->activity.startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));
                Thread.sleep(800);String before=readSave();Thread.sleep(1800);require(before.equals(readSave()),"Background grew without activity");
                runOnMainSync(()->getTargetContext().startActivity(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));
                Thread.sleep(500);
                require("false".equals(js("Android.save('not-json')")),"Invalid save accepted");
                long target=new JSONObject(readSave()).getJSONObject("mobile").getLong("consumed")+1000;
                // Feed a recorded total fixture; this is not evidence of real walking.
                getTargetContext().getSharedPreferences("steps",0).edit().putLong("total",target).commit();js("window.mobileLifecycle(true)");Thread.sleep(2500);
                require("true".equals(js("progression.consumed==="+target)),"Offline steps not processed");
                js("active=false;progression.pause(Date.now());save()");
                JSONObject save=new JSONObject(readSave());require(save.getJSONObject("mobile").getLong("consumed")==target,"Cursor not saved atomically");
                js("window.mobileLifecycle(true)");Thread.sleep(300);require("true".equals(js("progression.consumed==="+target)),"Step replay");
                js("active=false;progression.pause(Date.now());save()");
                getTargetContext().getSharedPreferences("verify",0).edit().putString("marker","preserved").commit();
                result.putString("ui_progression","passed");
                if("update".equals(arguments.getString("mode"))){
                    Updater updater=Updater.current;File apk=new File(getTargetContext().getCacheDir(),"verify-update.apk");
                    try(InputStream in=getContext().getAssets().open("update.apk");OutputStream out=new FileOutputStream(apk)){byte[] b=new byte[65536];for(int n;(n=in.read(b))!=-1;)out.write(b,0,n);}
                    android.content.pm.PackageInfo info=getTargetContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),0);
                    JSONObject manifest=new JSONObject().put("versionCode",info.getLongVersionCode()).put("bytes",apk.length()).put("sha256",Updater.sha256(apk));
                    JSONObject bad=new JSONObject(manifest.toString()).put("sha256","0".repeat(64));boolean rejected=false;try{updater.validate(apk,bad);}catch(SecurityException expected){rejected=true;}require(rejected,"Corrupt update accepted");require(new JSONObject(readSave()).getJSONObject("mobile").getLong("consumed")==target,"Rejected update damaged save");
                    updater.validate(apk,manifest);
                    Field candidate=Updater.class.getDeclaredField("candidate");candidate.setAccessible(true);candidate.set(updater,apk);
                    Field expected=Updater.class.getDeclaredField("expected");expected.setAccessible(true);expected.set(updater,manifest);
                    updater.ready=true;updater.install();for(int i=0;i<200&&updater.busy;i++)Thread.sleep(50);require(!updater.busy,"Install session timed out");result.putString("update_submitted",updater.status);sendStatus(1,result);
                }
            }
            result.putString("result","passed");finish(Activity.RESULT_OK,result);
        }catch(Throwable e){android.util.Log.e("PokemonTest","Failed",e);result.putString("result","FAILED "+e);finish(Activity.RESULT_CANCELED,result);}
    }
}
