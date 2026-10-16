package io.github.bakzzi.pokemonidle;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.util.AtomicFile;
import android.webkit.*;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

public final class MainActivity extends Activity {
    static volatile boolean visible;
    static final String ORIGIN="https://game.pokemon.local/";
    private WebView web;
    private AtomicFile saveFile;
    private boolean jsReady;
    private Updater updater;
    private final Handler updateHandler=new Handler(Looper.getMainLooper());
    private final Runnable updatePoll=new Runnable(){@Override public void run(){if(visible&&updater!=null){updater.check(false);updateHandler.postDelayed(this,60000);}}};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setDecorFitsSystemWindows(false);
        getWindow().setStatusBarColor(0xff17231e);getWindow().setNavigationBarColor(0xff17231e);
        saveFile=new AtomicFile(new File(getFilesDir(),"adventure.json"));updater=new Updater(this);
        FrameLayout safeArea=new FrameLayout(this);safeArea.setBackgroundColor(0xff17231e);
        web=new WebView(this);web.setBackgroundColor(0xff17231e);
        safeArea.addView(web,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
        // Inset the WebView's actual bounds. WebView padding does not reliably move HTML.
        // This is the only inset owner, including the keyboard and rotated camera cutouts.
        safeArea.setOnApplyWindowInsetsListener((v,insets)->{
            android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());
            v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            return WindowInsets.CONSUMED;
        });
        setContentView(safeArea);safeArea.requestApplyInsets();
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(false);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setSupportMultipleWindows(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if(getPreferences(0).getLong("webAssetsVersion",-1)!=updater.installedCode){web.clearCache(true);getPreferences(0).edit().putLong("webAssetsVersion",updater.installedCode).apply();}
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags&android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0);
        web.addJavascriptInterface(new Bridge(),"Android");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                Uri u=r.getUrl();String p=u.getPath();
                if(!"https".equals(u.getScheme())||!"game.pokemon.local".equals(u.getHost())||p==null||p.contains("..")||!r.getMethod().equals("GET"))return denied();
                try{String file=p.equals("/")?"index.html":p.substring(1);String mime=file.endsWith(".js")?"application/javascript":file.endsWith(".css")?"text/css":file.endsWith(".html")?"text/html":file.endsWith(".png")?"image/png":file.endsWith(".gif")?"image/gif":file.endsWith(".svg")?"image/svg+xml":"application/octet-stream";return new WebResourceResponse(mime,"UTF-8",200,"OK",java.util.Map.of("Cache-Control","no-store","X-Content-Type-Options","nosniff"),getAssets().open("web/"+file));}catch(IOException e){return denied();}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(ORIGIN);}
        });
        web.setWebChromeClient(new WebChromeClient(){@Override public boolean onConsoleMessage(ConsoleMessage m){if(m.messageLevel()==ConsoleMessage.MessageLevel.ERROR)android.util.Log.e("PokemonWeb",m.message()+" @"+m.lineNumber());return true;}});
        web.loadUrl(ORIGIN);StepService.start(this);updater.check(false);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
    }
    private static WebResourceResponse denied(){return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",java.util.Map.of(),new ByteArrayInputStream(new byte[0]));}
    @Override protected void onResume(){super.onResume();visible=true;StepService.visibility(true);if(web!=null){web.onResume();if(jsReady)web.evaluateJavascript("window.mobileLifecycle(true)",null);}StepService.start(this);if(updater!=null)updater.check(false);updateHandler.removeCallbacks(updatePoll);updateHandler.postDelayed(updatePoll,60000);}
    @Override protected void onPause(){visible=false;updateHandler.removeCallbacks(updatePoll);StepService.visibility(false);if(jsReady)web.evaluateJavascript("window.mobileLifecycle(false)",value->{if(!visible)web.onPause();});else web.onPause();super.onPause();}
    @Override protected void onDestroy(){updateHandler.removeCallbacks(updatePoll);if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
    private void handleBack(){web.evaluateJavascript("window.mobileBack&&window.mobileBack()",value->{if(!"true".equals(value))moveTaskToBack(true);});}
    // API 31-32 use this fallback. API 33+ registers the platform predictive-back API above.
    @android.annotation.SuppressLint("GestureBackNavigation") @SuppressWarnings("deprecation") @Override public void onBackPressed(){handleBack();}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==42&&checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)==PackageManager.PERMISSION_GRANTED){getSharedPreferences("steps",0).edit().putBoolean("enabled",true).putLong("count",-1).putLong("walkingCount",-1).commit();StepService.start(this);}}
    private synchronized String readSave(){
        if(!saveFile.getBaseFile().exists()&&!new File(saveFile.getBaseFile()+".bak").exists())return "{}";
        try{String data=new String(saveFile.readFully(),StandardCharsets.UTF_8);new JSONObject(data);return data;}catch(Exception e){return "INVALID_PRESERVED_SAVE";}
    }
    private synchronized boolean writeSave(String text){
        FileOutputStream out=null;
        try{if(text.length()>20_000_000)return false;JSONObject data=new JSONObject(text);if(data.getInt("format")!=1||!data.has("game")||!data.has("mobile"))return false;
            out=saveFile.startWrite();out.write(text.getBytes(StandardCharsets.UTF_8));saveFile.finishWrite(out);return true;
        }catch(Exception e){if(out!=null)saveFile.failWrite(out);return false;}
    }
    public final class Bridge {
        @JavascriptInterface public String load(){return readSave();}
        @JavascriptInterface public boolean save(String text){return writeSave(text);}
        @JavascriptInterface public boolean foreground(){return visible;}
        @JavascriptInterface public void ready(){runOnUiThread(()->{jsReady=true;web.evaluateJavascript("window.mobileLifecycle("+visible+")",null);});}
        @JavascriptInterface public String status(){try{android.content.SharedPreferences p=getSharedPreferences("steps",0);boolean enabled=p.getBoolean("enabled",false);boolean supported=StepService.supported(MainActivity.this);return new JSONObject().put("steps",p.getLong("total",0)).put("todaySteps",StepService.today(MainActivity.this)).put("lifetimeSteps",StepService.lifetime(MainActivity.this)).put("stepsEnabled",enabled).put("sensorSupported",supported).put("tracking",enabled&&StepService.instance!=null).put("sensor",!supported?"걸음 센서가 없는 기기예요. 켜 둔 모험을 이용할 수 있어요.":p.getString("error",enabled?"걸음 기록이 켜져 있어요. 강제 종료·절전 설정에 따라 기록이 멈출 수 있어요.":"권한을 허용하면 걸음 기록 알림이 표시돼요.")).put("versionName",updater.installedName).put("versionCode",updater.installedCode).put("updateChecking",updater.busy).put("update",updater.status).put("updateReady",updater.ready).put("installing",updater.installing).put("pendingInstall",updater.pending!=null).put("canInstall",getPackageManager().canRequestPackageInstalls()).toString();}catch(JSONException e){throw new IllegalStateException(e);}}
        @JavascriptInterface public void enableSteps(){runOnUiThread(()->{if(!StepService.supported(MainActivity.this))return;requestPermissions(Build.VERSION.SDK_INT>=33?new String[]{Manifest.permission.ACTIVITY_RECOGNITION,Manifest.permission.POST_NOTIFICATIONS}:new String[]{Manifest.permission.ACTIVITY_RECOGNITION},42);});}
        @JavascriptInterface public void disableSteps(){runOnUiThread(()->{getSharedPreferences("steps",0).edit().putBoolean("enabled",false).putLong("count",-1).putLong("walkingCount",-1).commit();stopService(new Intent(MainActivity.this,StepService.class));});}
        @JavascriptInterface public void allowUpdates(){runOnUiThread(()->startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName()))));}
        @JavascriptInterface public void checkUpdate(){updater.check(true);}
        @JavascriptInterface public void installUpdate(){updater.install();}
        @JavascriptInterface public void confirmUpdate(){runOnUiThread(()->{if(updater.pending!=null){startActivity(updater.pending);updater.pending=null;}});}
        @JavascriptInterface public void reportError(String message){android.util.Log.e("PokemonWeb",message);}
    }
}
