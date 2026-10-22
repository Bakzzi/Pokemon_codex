package io.github.bakzzi.pokemonidle;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
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
    private LockLedger locks;
    private android.content.SharedPreferences prefs;
    private long boot;
    private long lockEpoch;
    private final Handler clock=new Handler(Looper.getMainLooper());
    private final Runnable midnight=()->refreshClock();
    private final Runnable pulse=()->observeLock(null);
    private final BroadcastReceiver dateChanged=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){observeLock(Intent.ACTION_SCREEN_OFF.equals(i.getAction())?Boolean.TRUE:Intent.ACTION_USER_PRESENT.equals(i.getAction())?Boolean.FALSE:null);refreshClock();}};
    private boolean clockRegistered,sensorRegistered;
    static boolean locked(Context c){return !c.getSystemService(PowerManager.class).isInteractive()||c.getSystemService(KeyguardManager.class).isKeyguardLocked();}
    static long today(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return WalkingCounter.dayKey(System.currentTimeMillis(),ZoneId.systemDefault()).equals(p.getString("walkingDay",""))?p.getLong("walkingToday",0):0;}
    static long lifetime(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return p.getLong("walkingTotal",p.getLong("total",0));}
    static Notification notification(Context c,long today){
        PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(c,"walking").setSmallIcon(R.drawable.ic_stat_pokeball).setContentTitle("포켓몬 작은 모험").setContentText("오늘 "+NumberFormat.getIntegerInstance(Locale.KOREA).format(today)+"걸음").setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).build();
    }
    static boolean supported(Context c) { return ((SensorManager)c.getSystemService(SENSOR_SERVICE)).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null; }
    static void start(Context c) {
        try { c.startForegroundService(new Intent(c,StepService.class)); } catch (RuntimeException e) { c.getSharedPreferences("steps",0).edit().putString("monitorError","잠금 모험을 시작하려면 앱을 다시 열어 주세요.").apply(); }
    }
    static void visibility(boolean foreground) { StepService s=instance;if(s!=null)s.changeMode(foreground); }
    @Override public void onCreate() {
        super.onCreate();prefs=getSharedPreferences("steps",0);
        ledger=new StepLedger();ledger.total=prefs.getLong("total",0);
        walking=new WalkingCounter();walking.total=lifetime(this);walking.today=prefs.getLong("walkingToday",0);walking.day=prefs.getString("walkingDay","");walking.lastCount=prefs.getLong("walkingCount",-1);walking.lastBoot=prefs.getLong("walkingBoot",-1);walking.lastSample=prefs.getLong("walkingSample",-1);walking.rollover(System.currentTimeMillis(),ZoneId.systemDefault());
        boot=Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        locks=new LockLedger();locks.totalMillis=prefs.getLong("lockMillis",0);locks.start(locked(this),SystemClock.elapsedRealtime(),boot);
        lockEpoch=prefs.getLong("lockEpoch",0)+(locks.locked?1:0);
        ledger.mode(!locks.locked,SystemClock.elapsedRealtimeNanos());
        // Unknown boot identity cannot safely reuse cumulative readings.
        if(boot<0){ledger.resetBaseline();walking.resetBaseline();}
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("walking","걸음 모험",NotificationManager.IMPORTANCE_LOW));
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        refreshSensor();prefs.edit().remove("monitorError").apply();instance=this;persist();
        IntentFilter dates=new IntentFilter();dates.addAction(Intent.ACTION_DATE_CHANGED);dates.addAction(Intent.ACTION_TIME_CHANGED);dates.addAction(Intent.ACTION_TIMEZONE_CHANGED);dates.addAction(Intent.ACTION_SCREEN_ON);dates.addAction(Intent.ACTION_SCREEN_OFF);dates.addAction(Intent.ACTION_USER_PRESENT);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(dateChanged,dates,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(dateChanged,dates);
        clockRegistered=true;scheduleMidnight();clock.postDelayed(pulse,10000);BackgroundAdventure.get(this).request();
    }
    synchronized void changeMode(boolean foreground) { observeLock(null); }
    private synchronized void observeLock(Boolean forced){recordLock(forced==null?locked(this):forced,SystemClock.elapsedRealtime());clock.removeCallbacks(pulse);clock.postDelayed(pulse,locks.locked?10000:60000);}
    synchronized void recordLock(boolean locked,long elapsed){
        if(locked&&!locks.locked)lockEpoch++;
        locks.sample(locked,elapsed,boot);ledger.mode(!locked,elapsed*1000000);persist();BackgroundAdventure.get(this).request();
    }
    private synchronized void refreshSensor(){
        boolean enabled=prefs.getBoolean("enabled",false)&&checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)==PackageManager.PERMISSION_GRANTED;
        int types=Build.VERSION.SDK_INT>=34?ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE:0;
        if(enabled)types|=ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH;
        startForeground(7,notification(this,walking.today),types);
        if(sensorRegistered&&!enabled){sensors.unregisterListener(this);sensorRegistered=false;ledger.resetBaseline();walking.resetBaseline();}
        if(enabled&&!sensorRegistered){
            Sensor counter=sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            ledger.resetBaseline();walking.resetBaseline();
            sensorRegistered=counter!=null&&sensors.registerListener(this,counter,SensorManager.SENSOR_DELAY_NORMAL,0);
            if(!sensorRegistered)prefs.edit().putString("error","걸음 기록을 사용할 수 없어요. 잠금 시간으로 모험할 수 있어요.").apply();else prefs.edit().remove("error").apply();
        }
    }
    @Override public synchronized void onSensorChanged(SensorEvent event) {
        if(event.sensor.getType()!=Sensor.TYPE_STEP_COUNTER)return;
        long now=System.currentTimeMillis(),eventTime=now-Math.max(0,(SystemClock.elapsedRealtimeNanos()-event.timestamp)/1000000);
        recordSample((long)event.values[0],event.timestamp,eventTime,now);
    }
    synchronized void recordSample(long count,long elapsed,long eventTime,long now){ledger.sample(count,boot,elapsed);walking.sample(count,boot,elapsed,eventTime,now,ZoneId.systemDefault());persist();getSystemService(NotificationManager.class).notify(7,notification(this,walking.today));BackgroundAdventure.get(this).request();}
    private void scheduleMidnight(){clock.removeCallbacks(midnight);clock.postDelayed(midnight,Math.max(1000,WalkingCounter.nextMidnight(System.currentTimeMillis(),ZoneId.systemDefault())-System.currentTimeMillis()));}
    private synchronized void refreshClock(){walking.rollover(System.currentTimeMillis(),ZoneId.systemDefault());persist();getSystemService(NotificationManager.class).notify(7,notification(this,walking.today));scheduleMidnight();}
    private void persist(){prefs.edit().putLong("total",ledger.total).putLong("lockMillis",locks.totalMillis).putLong("lockEpoch",lockEpoch).putLong("count",ledger.lastCount).putLong("boot",ledger.lastBoot).putLong("sample",ledger.lastSample).putLong("transition",ledger.transitionAt).putBoolean("foreground",ledger.foreground).putLong("walkingTotal",walking.total).putLong("walkingToday",walking.today).putString("walkingDay",walking.day).putLong("walkingCount",walking.lastCount).putLong("walkingBoot",walking.lastBoot).putLong("walkingSample",walking.lastSample).commit();}
    @Override public void onAccuracyChanged(Sensor s,int a) {}
    @Override public int onStartCommand(Intent i,int f,int id) { refreshSensor();observeLock(null);return START_STICKY; }
    @Override public void onDestroy() { observeLock(null);instance=null;clock.removeCallbacksAndMessages(null);if(clockRegistered)unregisterReceiver(dateChanged);if(sensors!=null)sensors.unregisterListener(this);super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
