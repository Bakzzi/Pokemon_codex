package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import android.provider.Settings;
import java.time.ZoneId;
import java.text.NumberFormat;
import java.util.Locale;

public final class StepService extends Service {
    static volatile StepService instance;
    private LockLedger locks;
    private UsageLedger usage;
    private android.content.SharedPreferences prefs;
    private long boot;
    private long lockEpoch;
    private final Handler clock=new Handler(Looper.getMainLooper());
    private final java.util.concurrent.ExecutorService notificationWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
    private final java.util.concurrent.atomic.AtomicBoolean notificationQueued=new java.util.concurrent.atomic.AtomicBoolean();
    private String notificationKey="";
    private final Runnable refreshNotification=()->{
        if(instance!=this)return;
        notificationQueued.set(false);
        notificationWorker.execute(()->{
            NotificationPartner.State state=NotificationPartner.read(this,AdventureStore.get(this).read());
            long count=TouchService.today(this);
            clock.post(()->{
                if(instance!=this)return;
                String key=count+":"+TouchService.monthly(this)+":"+usageToday(this)/60000+":"+state.key();
                if(key.equals(notificationKey))return;
                getSystemService(NotificationManager.class).notify(7,notification(this,count,state));
                notificationKey=key;
            });
        });
    };
    private final Runnable midnight=()->refreshClock();
    private final Runnable pulse=()->observeLock(null);
    private final BroadcastReceiver dateChanged=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){observeLock(Intent.ACTION_SCREEN_OFF.equals(i.getAction())?Boolean.TRUE:Intent.ACTION_USER_PRESENT.equals(i.getAction())?Boolean.FALSE:null);refreshClock();}};
    private boolean clockRegistered;
    static boolean locked(Context c){return !c.getSystemService(PowerManager.class).isInteractive()||c.getSystemService(KeyguardManager.class).isKeyguardLocked();}
    static boolean usingPhone(Context c){return c.getSystemService(PowerManager.class).isInteractive()&&(!c.getSystemService(KeyguardManager.class).isKeyguardLocked()||MainActivity.visible);}
    static void sampleUsage(){StepService s=instance;if(s!=null)s.recordLock(locked(s),SystemClock.elapsedRealtime());}
    static long usageToday(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return WalkingCounter.dayKey(System.currentTimeMillis(),ZoneId.systemDefault()).equals(p.getString("usageDay",""))?p.getLong("usageTodayMillis",0):0;}
    static long usageMonthly(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return WalkingCounter.monthKey(System.currentTimeMillis(),ZoneId.systemDefault()).equals(p.getString("usageMonth",""))?p.getLong("usageMonthMillis",0):0;}
    static String usageSince(Context c){android.content.SharedPreferences p=c.getSharedPreferences("steps",0);return p.getBoolean("usageMonthPartial",false)&&WalkingCounter.monthKey(System.currentTimeMillis(),ZoneId.systemDefault()).equals(p.getString("usageMonth",""))?p.getString("usageMonthSince",""):"";}
    static String usageLabel(long millis){long minutes=Math.max(0,millis)/60000;return NumberFormat.getIntegerInstance(Locale.KOREA).format(minutes/60)+"시간 "+minutes%60+"분";}
    static Notification notification(Context c,long today){
        return notification(c,today,NotificationPartner.read(c,AdventureStore.get(c).read()));
    }
    private static Notification notification(Context c,long today,NotificationPartner.State state){
        PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        String touches="오늘 터치 "+NumberFormat.getIntegerInstance(Locale.KOREA).format(today)+"회";
        return new Notification.Builder(c,"walking").setSmallIcon(R.drawable.ic_stat_pokeball).setContentTitle("포켓몬 작은 모험").setContentText(touches).setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .setStyle(new Notification.DecoratedCustomViewStyle()).setCustomBigContentView(NotificationPartner.view(c,touches+" · 이번 달 "+NumberFormat.getIntegerInstance(Locale.KOREA).format(TouchService.monthly(c))+"회",state)).build();
    }
    // Queue only after an atomic save; no game actions or polling are used for this presentation.
    static void saved(){StepService service=instance;if(service!=null)service.queueNotification();}
    private void queueNotification(){if(notificationQueued.compareAndSet(false,true))clock.postDelayed(refreshNotification,250);}
    static void start(Context c) {
        try { c.startForegroundService(new Intent(c,StepService.class)); } catch (RuntimeException e) { c.getSharedPreferences("steps",0).edit().putString("monitorError","모험 기록을 시작하려면 앱을 다시 열어 주세요.").apply(); }
    }
    static void visibility(boolean foreground) { StepService s=instance;if(s!=null)s.changeMode(foreground); }
    @Override public void onCreate() {
        super.onCreate();prefs=getSharedPreferences("steps",0);
        boot=Settings.Global.getInt(getContentResolver(),Settings.Global.BOOT_COUNT,-1);
        locks=new LockLedger();locks.totalMillis=prefs.getLong("lockMillis",0);locks.start(locked(this),SystemClock.elapsedRealtime(),boot);
        usage=new UsageLedger();usage.totalMillis=prefs.getLong("usageMillis",0);usage.day=prefs.getString("usageDay","");usage.todayMillis=prefs.getLong("usageTodayMillis",0);usage.month=prefs.getString("usageMonth","");usage.monthMillis=prefs.getLong("usageMonthMillis",0);usage.monthSince=prefs.getString("usageMonthSince","");usage.monthPartial=prefs.getBoolean("usageMonthPartial",false);usage.rollover(System.currentTimeMillis(),ZoneId.systemDefault());usage.start(usingPhone(this),SystemClock.elapsedRealtime(),boot);
        lockEpoch=prefs.getLong("lockEpoch",0)+(locks.locked?1:0);
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("walking","모험 기록",NotificationManager.IMPORTANCE_LOW));
        int types=Build.VERSION.SDK_INT>=34?ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE:0;
        startForeground(7,notification(this,TouchService.today(this)),types);
        prefs.edit().remove("monitorError").apply();instance=this;persist();
        IntentFilter dates=new IntentFilter();dates.addAction(Intent.ACTION_DATE_CHANGED);dates.addAction(Intent.ACTION_TIME_CHANGED);dates.addAction(Intent.ACTION_TIMEZONE_CHANGED);dates.addAction(Intent.ACTION_SCREEN_ON);dates.addAction(Intent.ACTION_SCREEN_OFF);dates.addAction(Intent.ACTION_USER_PRESENT);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(dateChanged,dates,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(dateChanged,dates);
        clockRegistered=true;scheduleMidnight();clock.postDelayed(pulse,10000);BackgroundAdventure.get(this).request();
    }
    synchronized void changeMode(boolean foreground) { observeLock(null); }
    private synchronized void observeLock(Boolean forced){recordLock(forced==null?locked(this):forced,SystemClock.elapsedRealtime());clock.removeCallbacks(pulse);clock.postDelayed(pulse,usage.active?1000:10000);}
    synchronized void recordLock(boolean locked,long elapsed){
        if(locked&&!locks.locked)lockEpoch++;
        long oldMinute=usage.todayMillis/60000;
        locks.sample(locked,elapsed,boot);usage.sample(!locked||usingPhone(this),elapsed,boot,System.currentTimeMillis(),ZoneId.systemDefault());persist();if(oldMinute!=usage.todayMillis/60000)queueNotification();BackgroundAdventure.get(this).request();
    }
    private void scheduleMidnight(){clock.removeCallbacks(midnight);clock.postDelayed(midnight,Math.max(1000,WalkingCounter.nextMidnight(System.currentTimeMillis(),ZoneId.systemDefault())-System.currentTimeMillis()));}
    private synchronized void refreshClock(){long now=System.currentTimeMillis();usage.rollover(now,ZoneId.systemDefault());persist();queueNotification();scheduleMidnight();}
    private void persist(){prefs.edit().putLong("lockMillis",locks.totalMillis).putLong("lockEpoch",lockEpoch).putLong("usageMillis",usage.totalMillis).putString("usageDay",usage.day).putLong("usageTodayMillis",usage.todayMillis).putString("usageMonth",usage.month).putLong("usageMonthMillis",usage.monthMillis).putString("usageMonthSince",usage.monthSince).putBoolean("usageMonthPartial",usage.monthPartial).commit();}
    @Override public int onStartCommand(Intent i,int f,int id) { observeLock(null);return START_STICKY; }
    @Override public void onDestroy() { observeLock(null);instance=null;clock.removeCallbacksAndMessages(null);notificationWorker.shutdown();if(clockRegistered)unregisterReceiver(dateChanged);super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
