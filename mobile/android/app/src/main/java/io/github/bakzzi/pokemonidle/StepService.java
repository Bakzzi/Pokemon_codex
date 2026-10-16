package io.github.bakzzi.pokemonidle;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.hardware.*;
import android.os.*;
import android.provider.Settings;

public final class StepService extends Service implements SensorEventListener {
    static volatile StepService instance;
    private SensorManager sensors;
    private StepLedger ledger;
    private android.content.SharedPreferences prefs;
    private long boot;
    static boolean supported(Context c) { return ((SensorManager)c.getSystemService(SENSOR_SERVICE)).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null; }
    static void start(Context c) {
        if (c.getSharedPreferences("steps",0).getBoolean("enabled",false) && supported(c) && c.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)==PackageManager.PERMISSION_GRANTED) {
            try { c.startForegroundService(new Intent(c,StepService.class)); } catch (RuntimeException e) { c.getSharedPreferences("steps",0).edit().putString("error","걸음 기록을 다시 켜 주세요.").apply(); }
        }
    }
    static void visibility(boolean foreground) { StepService s=instance;if(s!=null)s.changeMode(foreground); }
    @Override public void onCreate() {
        super.onCreate();prefs=getSharedPreferences("steps",0);
        ledger=new StepLedger();ledger.total=prefs.getLong("total",0);ledger.lastCount=prefs.getLong("count",-1);ledger.lastBoot=prefs.getLong("boot",-1);ledger.lastSample=prefs.getLong("sample",-1);ledger.transitionAt=prefs.getLong("transition",-1);ledger.foreground=prefs.getBoolean("foreground",false);
        boot=Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        ledger.mode(MainActivity.visible,SystemClock.elapsedRealtimeNanos());
        // Unknown boot identity cannot safely reuse cumulative readings.
        if(boot<0)ledger.resetBaseline();
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("walking","걸음 모험",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(this,"walking").setSmallIcon(android.R.drawable.ic_menu_compass).setContentTitle("포켓몬 작은 모험").setContentText("꺼 둔 동안의 걸음 수를 기록해요.").setContentIntent(open).setOngoing(true).build();
        startForeground(7,notification);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        Sensor counter=sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if(checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)!=PackageManager.PERMISSION_GRANTED || counter==null || !sensors.registerListener(this,counter,SensorManager.SENSOR_DELAY_NORMAL,0)) { prefs.edit().putString("error","이 기기에서는 걸음 기록을 사용할 수 없어요.").apply();stopSelf();return; }
        prefs.edit().remove("error").apply();instance=this;persist();
    }
    synchronized void changeMode(boolean foreground) { ledger.mode(foreground,SystemClock.elapsedRealtimeNanos());persist(); }
    @Override public synchronized void onSensorChanged(SensorEvent event) { if(event.sensor.getType()!=Sensor.TYPE_STEP_COUNTER)return;ledger.sample((long)event.values[0],boot,event.timestamp);persist(); }
    private void persist(){prefs.edit().putLong("total",ledger.total).putLong("count",ledger.lastCount).putLong("boot",ledger.lastBoot).putLong("sample",ledger.lastSample).putLong("transition",ledger.transitionAt).putBoolean("foreground",ledger.foreground).commit();}
    @Override public void onAccuracyChanged(Sensor s,int a) {}
    @Override public int onStartCommand(Intent i,int f,int id) { return START_STICKY; }
    @Override public void onDestroy() { instance=null;if(sensors!=null)sensors.unregisterListener(this);super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
