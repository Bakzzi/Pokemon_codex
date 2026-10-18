package io.github.bakzzi.pokemonidle;

import android.app.PendingIntent;
import android.content.*;
import android.content.pm.*;
import android.os.Bundle;
import java.util.Map;

/** Native callback and process-replacement checks; only run on an isolated fixture. */
final class UpdateLifecycleChecks {
    private static void require(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    private static Intent result(int session,int status){return new Intent().putExtra(PackageInstaller.EXTRA_SESSION_ID,session).putExtra(PackageInstaller.EXTRA_STATUS,status);}
    static Bundle run(Context c)throws Exception{
        SharedPreferences prefs=c.getSharedPreferences("update",0);Map<String,?> saved=prefs.getAll();Updater previous=Updater.current;Updater.current=null;int passed=0;
        try{
            prefs.edit().clear().putInt("session",1234).commit();
            require(!Updater.result(c,result(4321,PackageInstaller.STATUS_SUCCESS))&&prefs.getInt("session",-1)==1234,"Foreign session consumed an update");passed++;
            require(!Updater.result(c,new Intent())&&prefs.getInt("session",-1)==1234,"Missing result consumed an update");passed++;
            Intent confirm=new Intent("fixture.CONFIRM").setPackage(c.getPackageName());
            require(!Updater.result(c,result(1234,PackageInstaller.STATUS_PENDING_USER_ACTION).putExtra(Intent.EXTRA_INTENT,confirm)),"Pending approval reopened game as completed");
            require(prefs.getInt("session",-1)==1234&&prefs.getString("pending","").contains("fixture.CONFIRM"),"Approval did not survive process replacement");passed++;
            require(!Updater.result(c,result(1234,PackageInstaller.STATUS_FAILURE_ABORTED)),"Cancelled install reopened as success");
            require(!prefs.contains("session")&&!prefs.contains("pending")&&!prefs.getString("notice","").equals("업데이트를 적용했어요."),"Cancelled install left stale state");passed++;
            prefs.edit().putInt("session",1234).putString("pending","stale").commit();
            require(Updater.result(c,result(1234,PackageInstaller.STATUS_SUCCESS)),"Success after process replacement did not reopen");
            require(!prefs.contains("session")&&!prefs.contains("pending")&&prefs.getString("notice","").equals("업데이트를 적용했어요."),"Success state was not persisted before reopening");passed++;
            require(!Updater.result(c,result(1234,PackageInstaller.STATUS_SUCCESS)),"Duplicate success reopened twice");passed++;
            android.app.Notification notice=UpdateCompletion.notification(c);PendingIntent launch=notice.contentIntent;
            require(launch.isActivity()&&launch.isImmutable()&&c.getPackageName().equals(launch.getCreatorPackage()),"Completion notification cannot safely open the app");
            require("업데이트 완료".contentEquals(notice.extras.getCharSequence(android.app.Notification.EXTRA_TITLE)),"Completion notice is missing");passed++;
            ActivityInfo receiver=c.getPackageManager().getReceiverInfo(new ComponentName(c,UpdateReceiver.class),0);
            require(!receiver.exported,"Update receiver is externally callable");
            require(UpdateCompletion.open(c).getComponent().getClassName().equals(MainActivity.class.getName()),"Notification does not return to the game");passed++;
            Bundle out=new Bundle();out.putInt("updateLifecycleChecks",passed);out.putString("result","passed");return out;
        }finally{
            Updater.current=previous;SharedPreferences.Editor restore=prefs.edit().clear();
            for(Map.Entry<String,?> entry:saved.entrySet()){
                Object value=entry.getValue();String key=entry.getKey();
                if(value instanceof String)restore.putString(key,(String)value);
                else if(value instanceof Long)restore.putLong(key,(Long)value);
                else if(value instanceof Integer)restore.putInt(key,(Integer)value);
                else if(value instanceof Boolean)restore.putBoolean(key,(Boolean)value);
                else throw new IllegalStateException("Unexpected update preference type");
            }restore.commit();
        }
    }
}
