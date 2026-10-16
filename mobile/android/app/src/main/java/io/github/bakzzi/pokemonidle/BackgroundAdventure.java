package io.github.bakzzi.pokemonidle;

import android.content.Context;
import android.os.PowerManager;
import androidx.javascriptengine.JavaScriptSandbox;
import androidx.javascriptengine.JavaScriptIsolate;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.*;

/** Runs only recorded walking actions; no Activity, WebView, animation or idle loop. */
final class BackgroundAdventure {
    private static BackgroundAdventure instance;
    static synchronized BackgroundAdventure get(Context c){if(instance==null)instance=new BackgroundAdventure(c.getApplicationContext());return instance;}
    private final Context context;
    private final AdventureStore store;
    private final ScheduledExecutorService worker=Executors.newSingleThreadScheduledExecutor();
    private final AtomicBoolean queued=new AtomicBoolean();
    private final AtomicBoolean requested=new AtomicBoolean();
    private JavaScriptSandbox sandbox;
    private JavaScriptIsolate isolate;
    private ScheduledFuture<?> idle;
    volatile boolean busy;
    private BackgroundAdventure(Context c){context=c;store=AdventureStore.get(c);}
    void request(){requested.set(true);if(!queued.compareAndSet(false,true))return;worker.execute(this::drain);}
    private long total(){return context.getSharedPreferences("steps",0).getLong("total",0);}
    private void drain(){
        boolean retry=false;PowerManager.WakeLock wake=null;busy=true;requested.set(false);
        try{
            AdventureStore.Snapshot before=store.backgroundSnapshot();
            if(before==null)return;
            JSONObject save=new JSONObject(before.raw);long consumed=save.optJSONObject("mobile")==null?0:save.getJSONObject("mobile").optLong("consumed",0);
            if(total()-consumed<10)return;
            if(idle!=null)idle.cancel(false);
            wake=context.getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"PokemonIdle:walking");wake.acquire(45000);
            ensureEngine();
            int completed=0;
            for(int batch=0;batch<32;batch++){
                before=store.backgroundSnapshot();if(before==null)break;
                long count=total(),now=System.currentTimeMillis();
                String code="MobileBackground.run("+JSONObject.quote(before.raw)+","+count+","+now+")";
                JSONObject result=new JSONObject(isolate.evaluateJavaScriptAsync(code).get(30,TimeUnit.SECONDS));
                if(result.getInt("used")==0)break;
                if(!store.commitBackground(before,result.getJSONObject("save").toString()))break;
                completed++;
                context.getSharedPreferences("steps",0).edit().remove("backgroundError").apply();
            }
            AdventureStore.Snapshot remaining=store.backgroundSnapshot();
            if(completed==32&&remaining!=null){JSONObject m=new JSONObject(remaining.raw).optJSONObject("mobile");retry=total()-(m==null?0:m.optLong("consumed",0))>=10;}
        }catch(Exception e){closeEngine();context.getSharedPreferences("steps",0).edit().putString("backgroundError","백그라운드 모험이 잠시 멈췄어요. 앱을 열면 기록한 걸음으로 이어가요.").apply();android.util.Log.e("PokemonBackground","Walking action not committed",e);}
        finally{if(wake!=null&&wake.isHeld())wake.release();busy=false;queued.set(false);if(isolate!=null){if(idle!=null)idle.cancel(false);idle=worker.schedule(this::closeEngine,60,TimeUnit.SECONDS);}if(retry||requested.get())request();}
    }
    private String asset(String name)throws IOException{try(InputStream in=context.getAssets().open("web/"+name);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[65536];for(int n;(n=in.read(b))!=-1;)out.write(b,0,n);return out.toString("UTF-8");}}
    private void ensureEngine()throws Exception{
        if(isolate!=null)return;
        if(!JavaScriptSandbox.isSupported())throw new IllegalStateException("JavaScript sandbox unavailable");
        sandbox=JavaScriptSandbox.createConnectedInstanceAsync(context).get(30,TimeUnit.SECONDS);
        if(!sandbox.isFeatureSupported(JavaScriptSandbox.JS_FEATURE_EVALUATE_WITHOUT_TRANSACTION_LIMIT))throw new IllegalStateException("JavaScript sandbox needs an update");
        isolate=sandbox.createIsolate();
        // The library streams evaluations and results beyond Binder transaction limits.
        isolate.evaluateJavaScriptAsync(asset("game.bundle.js")+"\n;''").get(30,TimeUnit.SECONDS);
        isolate.evaluateJavaScriptAsync(asset("config.js")+"\n"+asset("progression.js")+"\n"+asset("background.js")+"\n;''").get(30,TimeUnit.SECONDS);
    }
    private void closeEngine(){if(idle!=null){idle.cancel(false);idle=null;}if(isolate!=null){isolate.close();isolate=null;}if(sandbox!=null){sandbox.close();sandbox=null;}}
    void closeWhenIdle(){worker.execute(this::closeEngine);}
    Future<?> barrier(){return worker.submit(()->{});}
}
