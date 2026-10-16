package io.github.bakzzi.pokemonidle;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.hardware.*;
import android.os.*;
import android.provider.Settings;
import java.time.ZoneId;
import java.text.NumberFormat;
import java.util.Locale;

public final class StepService extends Service implements SensorEventListener {
    static volatile StepService instance;
    private SensorManager sensors;
    private StepLedger ledger;
    private WalkingCounter walking;
    private android.content.SharedPreferences prefs;
    private long boot;
    private final Handler clock=new Handler(Looper.getMainLooper());
    private final Runnable midnight=()->refreshClock();
    private final BroadcastReceiver dateChanged=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){refreshClock();}};
    private boolean clockRegistered;
    static long today(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return WalkingCounter.dayKey(System.currentTimeMillis(),ZoneId.systemDefault()).equals(p.getString("walkingDay",""))?p.getLong("walkingToday",0):0;}
    static long lifetime(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return p.getLong("walkingTotal",p.getLong("total",0));}
    static Notification notification(Context c,long today){
        PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(c,"walking").setSmallIcon(android.R.drawable.ic_menu_compass).setContentTitle("포켓몬 작은 모험").setContentText("오늘 "+NumberFormat.getIntegerInstance(Locale.KOREA).format(today)+"걸음").setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).build();
    }
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
        walking=new WalkingCounter();walking.total=lifetime(this);walking.today=prefs.getLong("walkingToday",0);walking.day=prefs.getString("walkingDay","");walking.lastCount=prefs.getLong("walkingCount",-1);walking.lastBoot=prefs.getLong("walkingBoot",-1);walking.lastSample=prefs.getLong("walkingSample",-1);walking.rollover(System.currentTimeMillis(),ZoneId.systemDefault());
        boot=Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        ledger.mode(MainActivity.visible,SystemClock.elapsedRealtimeNanos());
        // Unknown boot identity cannot safely reuse cumulative readings.
        if(boot<0){ledger.resetBaseline();walking.resetBaseline();}
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("walking","걸음 모험",NotificationManager.IMPORTANCE_LOW));
        startForeground(7,notification(this,walking.today));
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        Sensor counter=sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if(checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)!=PackageManager.PERMISSION_GRANTED || counter==null || !sensors.registerListener(this,counter,SensorManager.SENSOR_DELAY_NORMAL,0)) { prefs.edit().putString("error","이 기기에서는 걸음 기록을 사용할 수 없어요.").apply();stopSelf();return; }
        prefs.edit().remove("error").apply();instance=this;persist();
        IntentFilter dates=new IntentFilter();dates.addAction(Intent.ACTION_DATE_CHANGED);dates.addAction(Intent.ACTION_TIME_CHANGED);dates.addAction(Intent.ACTION_TIMEZONE_CHANGED);dates.addAction(Intent.ACTION_SCREEN_ON);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(dateChanged,dates,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(dateChanged,dates);
        clockRegistered=true;scheduleMidnight();BackgroundAdventure.get(this).request();
    }
    synchronized void changeMode(boolean foreground) { ledger.mode(foreground,SystemClock.elapsedRealtimeNanos());refreshClock(); }
    @Override public synchronized void onSensorChanged(SensorEvent event) {
        if(event.sensor.getType()!=Sensor.TYPE_STEP_COUNTER)return;
        long now=System.currentTimeMillis(),eventTime=now-Math.max(0,(SystemClock.elapsedRealtimeNanos()-event.timestamp)/1000000);
        recordSample((long)event.values[0],event.timestamp,eventTime,now);
    }
    synchronized void recordSample(long count,long elapsed,long eventTime,long now){ledger.sample(count,boot,elapsed);walking.sample(count,boot,elapsed,eventTime,now,ZoneId.systemDefault());persist();getSystemService(NotificationManager.class).notify(7,notification(this,walking.today));BackgroundAdventure.get(this).request();}
    private void scheduleMidnight(){clock.removeCallbacks(midnight);clock.postDelayed(midnight,Math.max(1000,WalkingCounter.nextMidnight(System.currentTimeMillis(),ZoneId.systemDefault())-System.currentTimeMillis()));}
    private synchronized void refreshClock(){walking.rollover(System.currentTimeMillis(),ZoneId.systemDefault());persist();getSystemService(NotificationManager.class).notify(7,notification(this,walking.today));scheduleMidnight();}
    private void persist(){prefs.edit().putLong("total",ledger.total).putLong("count",ledger.lastCount).putLong("boot",ledger.lastBoot).putLong("sample",ledger.lastSample).putLong("transition",ledger.transitionAt).putBoolean("foreground",ledger.foreground).putLong("walkingTotal",walking.total).putLong("walkingToday",walking.today).putString("walkingDay",walking.day).putLong("walkingCount",walking.lastCount).putLong("walkingBoot",walking.lastBoot).putLong("walkingSample",walking.lastSample).commit();}
    @Override public void onAccuracyChanged(Sensor s,int a) {}
    @Override public int onStartCommand(Intent i,int f,int id) { return START_STICKY; }
    @Override public void onDestroy() { instance=null;clock.removeCallbacks(midnight);if(clockRegistered)unregisterReceiver(dateChanged);if(sensors!=null)sensors.unregisterListener(this);super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
