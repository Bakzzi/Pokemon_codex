package io.github.bakzzi.pokemonidle;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

/** One atomic writer and one ownership generation for both execution surfaces. */
final class AdventureStore {
    private static AdventureStore instance;
    static synchronized AdventureStore get(Context context){if(instance==null)instance=new AdventureStore(new File(context.getFilesDir(),"adventure.json"));return instance;}
    final AtomicFile file;
    private Object uiOwner;
    private long generation;
    AdventureStore(File path){file=new AtomicFile(path);}
    synchronized void claimUi(Object owner){uiOwner=owner;generation++;}
    synchronized void releaseUi(Object owner){if(uiOwner==owner){uiOwner=null;generation++;}}
    synchronized String read(){
        if(!file.getBaseFile().exists()&&!new File(file.getBaseFile()+".bak").exists())return "{}";
        try{String raw=new String(file.readFully(),StandardCharsets.UTF_8);validate(raw);return raw;}catch(Exception e){return "INVALID_PRESERVED_SAVE";}
    }
    private static void validate(String raw)throws JSONException{if(raw.length()>20_000_000)throw new JSONException("Save too large");JSONObject data=new JSONObject(raw);if(data.getInt("format")!=1||!data.has("game")||!data.has("mobile"))throw new JSONException("Invalid adventure");}
    private boolean write(String raw){
        FileOutputStream out=null;
        try{validate(raw);out=file.startWrite();out.write(raw.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);generation++;StepService.saved();return true;}
        catch(Exception e){if(out!=null)file.failWrite(out);return false;}
    }
    synchronized boolean saveUi(Object owner,String raw){
        try{validate(raw);}catch(JSONException e){return false;}
        // An old Activity or a delayed pause callback cannot overwrite a new owner.
        if(uiOwner!=owner)return true;
        return write(raw);
    }
    synchronized Snapshot backgroundSnapshot(){return uiOwner==null?new Snapshot(generation,read()):null;}
    synchronized boolean commitBackground(Snapshot before,String raw){if(uiOwner!=null||before.generation!=generation)return false;if(!write(raw))throw new IllegalStateException("Background save failed");return true;}
    static final class Snapshot{final long generation;final String raw;Snapshot(long generation,String raw){this.generation=generation;this.raw=raw;}}
}
