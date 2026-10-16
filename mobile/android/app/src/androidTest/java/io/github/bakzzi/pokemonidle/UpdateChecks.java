package io.github.bakzzi.pokemonidle;

import android.content.Context;
import android.os.Bundle;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.JSONObject;

/** Controlled HTTP responses use the same check path as real HTTPS downloads. */
final class UpdateChecks {
    private static void require(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    static void await(Updater u)throws Exception{long deadline=System.currentTimeMillis()+60000;while(u.busy&&System.currentTimeMillis()<deadline)Thread.sleep(50);require(!u.busy,"Update check timed out");}
    static final class Response extends HttpURLConnection {
        final int code;final byte[] bytes;boolean closed;
        Response(URL url,int code,String body){super(url);this.code=code;this.bytes=body.getBytes(StandardCharsets.UTF_8);}
        @Override public int getResponseCode(){return code;}
        @Override public InputStream getInputStream(){return new ByteArrayInputStream(bytes);}
        @Override public void disconnect(){closed=true;}
        @Override public boolean usingProxy(){return false;}
        @Override public void connect(){}
    }
    static final class Replies implements Updater.ConnectionFactory {
        final List<Response> opened=new ArrayList<>();final Queue<Integer> codes=new ArrayDeque<>();final Queue<String> bodies=new ArrayDeque<>();
        Replies reply(int code,String body){codes.add(code);bodies.add(body);return this;}
        @Override public HttpURLConnection open(URL url)throws IOException{if(codes.isEmpty())throw new IOException("Unexpected HTTP request");Response r=new Response(url,codes.remove(),bodies.remove());opened.add(r);return r;}
        void fresh(){for(Response r:opened){require(!r.getUseCaches(),"HTTP cache enabled");require(r.getRequestProperty("Cache-Control").contains("no-store"),"No cache bypass header");require(r.closed,"HTTP response leaked");if(r.getURL().getHost().equals("raw.githubusercontent.com"))require(r.getURL().getQuery()!=null&&r.getURL().getQuery().startsWith("check="),"No fresh manifest query");}}
    }
    static Bundle run(Context c)throws Exception{
        Updater original=Updater.current;long checked=c.getSharedPreferences("update",0).getLong("checked",0);int passed=0;
        try{
            for(int code:new int[]{404,503}){
                Replies r=new Replies().reply(code,"");Updater u=new Updater(c,r);try{u.check(true);await(u);require(!u.ready&&!u.status.contains("최신"),"HTTP "+code+" reported latest");require(c.getSharedPreferences("update",0).getLong("checked",0)==checked,"Failed check suppressed retries");r.fresh();passed++;}finally{u.worker.shutdownNow();}
            }
            Replies malformed=new Replies().reply(200,"not-json");Updater bad=new Updater(c,malformed);try{bad.check(true);await(bad);require(!bad.status.contains("최신"),"Malformed manifest reported latest");malformed.fresh();passed++;}finally{bad.worker.shutdownNow();}
            Replies foreign=new Replies().reply(200,new JSONObject().put("package","another.app").put("versionCode",1).put("versionName","0.0.1").toString());Updater wrong=new Updater(c,foreign);try{wrong.check(true);await(wrong);require(!wrong.status.contains("최신"),"Foreign package reported latest");foreign.fresh();passed++;}finally{wrong.worker.shutdownNow();}
            Updater info=new Updater(c,new Replies());String equal=new JSONObject().put("package",c.getPackageName()).put("versionCode",info.installedCode).put("versionName",info.installedName).toString();info.worker.shutdownNow();
            c.getSharedPreferences("update",0).edit().putLong("checked",0).commit();
            Replies retry=new Replies().reply(404,"").reply(200,equal).reply(200,equal);Updater u=new Updater(c,retry);try{
                u.check(false);await(u);require(!u.status.contains("최신"),"Missing endpoint reported latest");u.check(false);await(u);require(u.status.contains("최신")&&u.status.contains(u.installedName),"Valid equal version was not confirmed");require(retry.opened.size()==2,"Failure was not retried");passed++;
                u.check(false);require(retry.opened.size()==2,"Successful automatic check was not throttled");u.check(true);await(u);require(retry.opened.size()==3,"Manual check used the automatic cooldown");require(!retry.opened.get(1).getURL().equals(retry.opened.get(2).getURL()),"Manual check reused an edge-cache URL");retry.fresh();passed++;
            }finally{u.worker.shutdownNow();}
            Replies older=new Replies().reply(200,new JSONObject().put("package",c.getPackageName()).put("versionCode",1).put("versionName","0.0.1").toString());Updater ahead=new Updater(c,older);try{ahead.check(true);await(ahead);require(!ahead.status.contains("최신")&&ahead.status.contains("배포 버전"),"Older channel misreported equal latest");older.fresh();passed++;}finally{ahead.worker.shutdownNow();}
            String newer=new JSONObject().put("package",c.getPackageName()).put("versionCode",100).put("versionName","99.0.0").put("bytes",100).put("sha256","0".repeat(64)).put("url","https://github.com/Bakzzi/Pokemon_codex/releases/download/fixture/app.apk").toString();
            Replies download=new Replies().reply(200,newer).reply(503,"");Updater available=new Updater(c,download);try{available.check(true);await(available);require(!available.status.contains("최신")&&available.status.contains("99.0.0")&&!available.ready,"New-version download failure reported latest");download.fresh();passed++;}finally{available.worker.shutdownNow();}
            Bundle result=new Bundle();result.putInt("update_checks",passed);result.putString("result","passed");return result;
        }finally{Updater.current=original;c.getSharedPreferences("update",0).edit().putLong("checked",checked).commit();}
    }
}
