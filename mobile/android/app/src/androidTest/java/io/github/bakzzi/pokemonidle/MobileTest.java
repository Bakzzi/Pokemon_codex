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
    private String js(String code)throws Exception{
        CountDownLatch done=new CountDownLatch(1);String[] value={null};
        runOnMainSync(()->web.evaluateJavascript(code,result->{value[0]=result;done.countDown();}));
        require(done.await(20,TimeUnit.SECONDS),"JS timeout");return value[0];
    }
    private void waitReady()throws Exception{
        for(int i=0;i<100;i++){if("true".equals(js("typeof game!=='undefined' && !!game && !fatal")))return;Thread.sleep(200);}
        throw new AssertionError("Game failed to initialize");
    }
    private String readSave()throws Exception{try(InputStream in=new FileInputStream(new File(getTargetContext().getFilesDir(),"adventure.json"));ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];for(int n;(n=in.read(b))!=-1;)out.write(b,0,n);return out.toString("UTF-8");}}
    @Override public void onStart(){
        Bundle result=new Bundle();
        try{
            activity=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            Field field=MainActivity.class.getDeclaredField("web");field.setAccessible(true);web=(WebView)field.get(activity);waitReady();Thread.sleep(1500);
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
                    updater.ready=true;updater.install();result.putString("update_submitted","true");
                }
            }
            result.putString("result","passed");finish(Activity.RESULT_OK,result);
        }catch(Throwable e){android.util.Log.e("PokemonTest","Failed",e);result.putString("result","FAILED "+e);finish(Activity.RESULT_CANCELED,result);}
    }
}
