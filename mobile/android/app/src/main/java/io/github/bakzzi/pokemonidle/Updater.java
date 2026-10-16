package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.os.Build;
import java.io.*;
import java.net.*;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

final class Updater {
    static final String MANIFEST="https://raw.githubusercontent.com/Bakzzi/Pokemon_codex/mobile/mobile/updates/android.json";
    static volatile Updater current;
    final Context context;
    final ExecutorService worker=Executors.newSingleThreadExecutor();
    volatile String status="새 버전은 자동으로 확인하고 설치해요.";
    volatile boolean ready,busy,installing;
    volatile Intent pending;
    private File candidate;
    private JSONObject expected;
    private int sessionId=-1;
    Updater(Context context){this.context=context.getApplicationContext();current=this;
        try{String saved=context.getSharedPreferences("update",0).getString("pending",null);if(saved!=null){pending=Intent.parseUri(saved,Intent.URI_INTENT_SCHEME);status="시스템 설치 승인이 필요해요. 설정에서 설치 화면을 열어 주세요.";}}catch(Exception ignored){}
    }
    private static HttpURLConnection connect(String url) throws IOException {
        for(int redirects=0;redirects<6;redirects++){
            URL u=new URL(url);String host=u.getHost();
            if(!u.getProtocol().equals("https")||!(host.equals("github.com")||host.equals("raw.githubusercontent.com")||host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com")))throw new IOException("Untrusted update URL");
            HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setRequestProperty("User-Agent","PokemonIdle-Android");int code=c.getResponseCode();
            if(code>=300&&code<400){url=new URL(u,c.getHeaderField("Location")).toString();c.disconnect();continue;}
            return c;
        }throw new IOException("Too many redirects");
    }
    synchronized void check(boolean manual){
        if(busy||ready)return;
        long last=context.getSharedPreferences("update",0).getLong("checked",0);
        if(!manual&&System.currentTimeMillis()-last<6*3600000L)return;
        busy=true;status="새 버전 확인 중…";
        worker.execute(()->{try{
            HttpURLConnection c=connect(MANIFEST);
            if(c.getResponseCode()==404){status="최신 버전이에요.";return;}
            if(c.getResponseCode()!=200)throw new IOException("Manifest HTTP "+c.getResponseCode());
            byte[] bytes;try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){copy(in,out,65536);bytes=out.toByteArray();}finally{c.disconnect();}
            JSONObject manifest=new JSONObject(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));
            long installed=context.getPackageManager().getPackageInfo(context.getPackageName(),0).getLongVersionCode();
            if(manifest.getLong("versionCode")<=installed){status="최신 버전이에요.";return;}
            if(!manifest.getString("package").equals(context.getPackageName()))throw new IOException("Wrong package");
            long size=manifest.getLong("bytes");if(size<=0||size>200_000_000)throw new IOException("Invalid size");
            File dir=new File(context.getCacheDir(),"update");if(!dir.exists()&&!dir.mkdirs())throw new IOException("No update storage");
            File part=new File(dir,"candidate.part"),apk=new File(dir,"candidate.apk");status="업데이트 내려받는 중…";
            HttpURLConnection download=connect(manifest.getString("url"));if(download.getResponseCode()!=200)throw new IOException("APK HTTP "+download.getResponseCode());
            try(InputStream in=download.getInputStream();OutputStream out=new FileOutputStream(part)){byte[] buffer=new byte[65536];long copied=0;for(int n;(n=in.read(buffer))!=-1;){copied+=n;if(copied>size)throw new IOException("APK exceeds size");out.write(buffer,0,n);}if(copied!=size)throw new IOException("Incomplete APK");}finally{download.disconnect();}
            validate(part,manifest);if(apk.exists()&&!apk.delete())throw new IOException("Old update locked");if(!part.renameTo(apk))throw new IOException("Cannot stage update");
            candidate=apk;expected=manifest;ready=true;status="업데이트 준비 완료 · 배틀이 끝나면 적용해요.";
        }catch(Exception e){android.util.Log.w("PokemonUpdate",e.toString());status="업데이트를 확인하지 못했어요. 다음에 다시 시도해요.";}
        finally{busy=false;context.getSharedPreferences("update",0).edit().putLong("checked",System.currentTimeMillis()).apply();}});
    }
    private static void copy(InputStream in,OutputStream out,long limit)throws IOException{byte[] buffer=new byte[65536];long count=0;for(int n;(n=in.read(buffer))!=-1;){count+=n;if(count>limit)throw new IOException("Download too large");out.write(buffer,0,n);}}
    static String sha256(File file)throws Exception{MessageDigest md=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] b=new byte[65536];for(int n;(n=in.read(b))!=-1;)md.update(b,0,n);}StringBuilder text=new StringBuilder();for(byte b:md.digest())text.append(String.format(Locale.ROOT,"%02x",b&255));return text.toString();}
    void validate(File apk,JSONObject manifest)throws Exception{
        if(apk.length()!=manifest.getLong("bytes")||!sha256(apk).equalsIgnoreCase(manifest.getString("sha256")))throw new SecurityException("APK integrity mismatch");
        PackageManager pm=context.getPackageManager();PackageInfo next=pm.getPackageArchiveInfo(apk.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES),installed=pm.getPackageInfo(context.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
        if(next==null||!context.getPackageName().equals(next.packageName)||next.getLongVersionCode()!=manifest.getLong("versionCode")||next.getLongVersionCode()<=installed.getLongVersionCode()||next.applicationInfo.targetSdkVersion<35)throw new SecurityException("Invalid update identity");
        if(next.signingInfo==null||installed.signingInfo==null||!Arrays.equals(next.signingInfo.getApkContentsSigners(),installed.signingInfo.getApkContentsSigners()))throw new SecurityException("Signing identity changed");
    }
    synchronized void install(){
        if(!ready||busy)return;
        if(!context.getPackageManager().canRequestPackageInstalls()){status="설정에서 앱 업데이트 설치를 한 번 허용해 주세요.";return;}
        busy=true;installing=true;worker.execute(()->{try{
            validate(candidate,expected);PackageInstaller installer=context.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);params.setAppPackageName(context.getPackageName());params.setSize(candidate.length());params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            sessionId=installer.createSession(params);context.getSharedPreferences("update",0).edit().putInt("session",sessionId).commit();
            try(PackageInstaller.Session session=installer.openSession(sessionId)){
                try(InputStream in=new FileInputStream(candidate);OutputStream out=session.openWrite("base.apk",0,candidate.length())){copy(in,out,candidate.length());session.fsync(out);}
                Intent callback=new Intent(context,UpdateReceiver.class).setAction(context.getPackageName()+".UPDATE");
                PendingIntent result=PendingIntent.getBroadcast(context,sessionId,callback,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);
                status="모험을 저장하고 업데이트하는 중…";session.commit(result.getIntentSender());
            }ready=false;
        }catch(Exception e){android.util.Log.w("PokemonUpdate",e.toString());ready=false;installing=false;status="설치하지 못했어요. 기존 앱과 모험은 그대로 보존돼요.";if(sessionId>=0)try{context.getPackageManager().getPackageInstaller().abandonSession(sessionId);}catch(RuntimeException ignored){}}
        finally{busy=false;}});
    }
    static void result(Context context,Intent intent){
        int id=intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID,-1);if(id<0||id!=context.getSharedPreferences("update",0).getInt("session",-2))return;
        int result=intent.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);Updater u=current;
        if(result==PackageInstaller.STATUS_PENDING_USER_ACTION){Intent confirmation=intent.getParcelableExtra(Intent.EXTRA_INTENT);if(confirmation!=null)context.getSharedPreferences("update",0).edit().putString("pending",confirmation.toUri(Intent.URI_INTENT_SCHEME)).apply();if(u!=null){u.pending=confirmation;u.installing=false;u.status="이 기기의 시스템 설치 승인이 필요해요. 설정에서 설치 화면을 열어 주세요.";}return;}
        context.getSharedPreferences("update",0).edit().remove("session").remove("pending").apply();if(u!=null){u.pending=null;u.installing=false;u.status=result==PackageInstaller.STATUS_SUCCESS?"업데이트를 적용했어요.":"설치하지 못했어요. 기존 앱과 모험은 그대로 보존돼요.";}
    }
}
