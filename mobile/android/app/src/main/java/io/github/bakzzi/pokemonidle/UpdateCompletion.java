package io.github.bakzzi.pokemonidle;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;

/** Keep a way back when Android blocks opening an activity after replacement. */
final class UpdateCompletion {
    static final int NOTICE_ID=9;
    static Intent open(Context c){return new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);}
    static Notification notification(Context c){
        c.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("update-complete","업데이트 완료",NotificationManager.IMPORTANCE_DEFAULT));
        PendingIntent launch=PendingIntent.getActivity(c,0,open(c),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(c,"update-complete").setSmallIcon(android.R.drawable.stat_sys_download_done).setContentTitle("업데이트 완료").setContentText("눌러서 모험을 이어가세요.").setContentIntent(launch).setAutoCancel(true).build();
    }
    static void dismissNotice(Context c){c.getSystemService(NotificationManager.class).cancel(NOTICE_ID);}
    static void reopen(Context c){
        NotificationManager manager=c.getSystemService(NotificationManager.class);
        if((Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&manager.areNotificationsEnabled()){
            try{manager.notify(NOTICE_ID,notification(c));}catch(RuntimeException e){android.util.Log.w("PokemonUpdate","Cannot show completion notification",e);}
        }
        try{c.startActivity(open(c));}catch(RuntimeException e){android.util.Log.w("PokemonUpdate","Cannot reopen after update",e);}
    }
}
