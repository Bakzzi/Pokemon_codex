package io.github.bakzzi.pokemonidle;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.AnimatedImageDrawable;
import android.os.*;
import android.view.*;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.*;

/** Isolated-emulator fixture: exercises the signed app's actual SystemUI RemoteViews. */
final class NotificationPartnerChecks {
    private static void require(boolean ok,String message){if(!ok)throw new AssertionError(message);}
    private static String save(int id,int level,long xp,boolean empty)throws Exception {
        return new JSONObject().put("format",1).put("mobile",new JSONObject().put("consumed",0).put("lockConsumed",0))
            .put("game",new JSONObject().put("activeId","other").put("slots",new JSONArray().put(empty?JSONObject.NULL:"first").put("other"))
                .put("owned",new JSONObject().put("first",new JSONObject().put("id",id).put("level",level).put("xp",xp))
                    .put("other",new JSONObject().put("id",25).put("level",40).put("xp",64000)))).toString();
    }
    private static View apply(Instrumentation t,Notification n) {
        View[] result={null};t.runOnMainSync(()->result[0]=n.bigContentView.apply(t.getTargetContext(),new FrameLayout(t.getTargetContext())));return result[0];
    }
    private static boolean text(View view,int id,String expected){return expected.contentEquals(((TextView)view.findViewById(id)).getText());}
    private static void await(Instrumentation t,String name,String xp)throws Exception {
        NotificationManager nm=t.getTargetContext().getSystemService(NotificationManager.class);
        String actual="no notification";
        // Android may defer a newly started foreground service's notification for ten seconds.
        for(int i=0;i<200;i++) {
            for(android.service.notification.StatusBarNotification row:nm.getActiveNotifications())if(row.getId()==7) {
                View v=apply(t,row.getNotification());
                actual=((TextView)v.findViewById(R.id.notification_partner_name)).getText()+" / "+((TextView)v.findViewById(R.id.notification_partner_xp)).getText();
                if(text(v,R.id.notification_partner_name,name)&&(xp==null||text(v,R.id.notification_partner_xp,xp)))return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Notification did not refresh: "+name+" / "+xp+"; actual="+actual+"; service="+(StepService.instance!=null));
    }
    private static void shell(Instrumentation t,String command)throws Exception {
        try(ParcelFileDescriptor p=t.getUiAutomation().executeShellCommand(command);InputStream in=new FileInputStream(p.getFileDescriptor())){byte[] b=new byte[1024];while(in.read(b)!=-1){}}
    }
    private static Rect find(AccessibilityNodeInfo node,String text) {
        if(node==null)return null;
        if(text.contentEquals(node.getText()==null?"":node.getText())){Rect r=new Rect();node.getBoundsInScreen(r);return r;}
        for(int i=0;i<node.getChildCount();i++){Rect r=find(node.getChild(i),text);if(r!=null)return r;}
        return null;
    }
    private static void screenshot(Instrumentation t,String name,Bitmap b)throws Exception {
        try(OutputStream out=new FileOutputStream(new File(t.getTargetContext().getExternalFilesDir(null),name))){b.compress(Bitmap.CompressFormat.PNG,100,out);}
    }
    static Bundle run(Instrumentation t)throws Exception {
        Context c=t.getTargetContext();int checks=0;
        String raw=save(25,7,428,false);
        NotificationPartner.State p=NotificationPartner.read(c,raw);
        require(p.id==25&&p.level==7&&p.percent==50&&p.name.equals("피카츄"),"Slot UID, shared XP or Korean name mismatch");checks++;
        require(NotificationPartner.read(c,save(25,7,428,true)).id==0,"Empty first slot used the active battler");checks++;
        require(NotificationPartner.read(c,"{}").id==0&&NotificationPartner.read(c,"INVALID_PRESERVED_SAVE").id==0,"Missing/corrupt save did not fail closed");checks++;
        require(NotificationPartner.read(c,save(25,100,1000000,false)).percent==100,"Max-level percentage mismatch");checks++;
        require(NotificationPartner.read(c,save(25,7,999999,false)).percent==99&&NotificationPartner.read(c,save(25,7,0,false)).percent==0,"XP percentage bounds mismatch");checks++;
        require(NotificationPartner.read(c,save(26,8,512,false)).id==26,"Evolution did not change sprite identity");checks++;
        JSONObject alternate=new JSONObject(save(130,5,0,false));alternate.getJSONObject("game").getJSONObject("owned").getJSONObject("first").put("shiny",true);
        require(NotificationPartner.read(c,alternate.toString()).sprite!=PartnerSprites.drawable(130),"Existing alternate sprite was lost");checks++;
        for(int id=1;id<=251;id++) {
            NotificationPartner.State state=NotificationPartner.read(c,save(id,5,0,false));
            require(state.id==id&&!state.name.isEmpty(),"Species metadata missing: "+id);
            require(c.getDrawable(PartnerSprites.drawable(id)) instanceof AnimatedImageDrawable,"Original animated sprite missing: "+id);
        }checks+=251;
        Notification n;
        // Build from the atomic fixture below before inspecting a full expanded row.
        c.getSharedPreferences("update",0).edit().putLong("checked",System.currentTimeMillis()).commit();
        t.startActivitySync(new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        for(int i=0;i<60&&StepService.instance==null;i++)Thread.sleep(100);
        require(StepService.instance!=null,"Walking service did not start");
        t.waitForIdleSync();
        AdventureStore store=AdventureStore.get(c);Object owner=new Object();store.claimUi(owner);
        require(store.saveUi(owner,raw),"Fixture save failed");await(t,"피카츄 · Lv.7","경험치 50%");checks++;
        n=StepService.notification(c,3539);View expanded=apply(t,n);
        require(n.contentView==null&&"오늘 3,539걸음".contentEquals(n.extras.getCharSequence(Notification.EXTRA_TEXT)),"Collapsed notification changed");checks++;
        require(text(expanded,R.id.notification_partner_name,"피카츄 · Lv.7")&&text(expanded,R.id.notification_partner_xp,"경험치 50%"),"Expanded stats mismatch");checks++;
        AnimatedImageDrawable sprite=(AnimatedImageDrawable)((ImageView)expanded.findViewById(R.id.notification_partner_sprite)).getDrawable();
        require(sprite.isRunning()&&sprite.getRepeatCount()==AnimatedImageDrawable.REPEAT_INFINITE,"Sprite did not auto-start and loop");checks++;
        String before=store.read();apply(t,n);require(before.equals(store.read()),"Rendering mutated game data");checks++;
        require(store.saveUi(owner,save(25,7,428,true)),"Empty-slot save failed");await(t,"1번 슬롯이 비어 있어요",null);
        View empty=apply(t,StepService.notification(c,0));require(empty.findViewById(R.id.notification_partner_sprite).getVisibility()==View.GONE&&empty.findViewById(R.id.notification_partner_xp).getVisibility()==View.GONE,"Empty slot retained stale art or XP");checks++;
        require(store.saveUi(owner,save(26,8,512,false)),"Evolution save failed");await(t,"라이츄 · Lv.8","경험치 0%");checks++;
        store.releaseUi(owner);AdventureStore.Snapshot snapshot=store.backgroundSnapshot();
        require(store.commitBackground(snapshot,raw),"Background commit failed");await(t,"피카츄 · Lv.7","경험치 50%");checks++;
        require(!store.commitBackground(snapshot,save(25,99,999999,false)),"Stale background commit accepted");checks++;
        require(store.saveUi(owner,save(25,99,999999,false))&&store.read().equals(raw),"Stale UI save overwrote slot state");checks++;
        c.getSystemService(NotificationManager.class).notify(7,StepService.notification(c,3539));
        shell(t,"input keyevent KEYCODE_HOME");Thread.sleep(800);
        shell(t,"input swipe 540 0 540 1050 400");Thread.sleep(1200);
        Bitmap initial=t.getUiAutomation().takeScreenshot();screenshot(t,"notification-initial.png",initial);initial.recycle();
        Rect title=find(t.getUiAutomation().getRootInActiveWindow(),"포켓몬 작은 모험");
        if(find(t.getUiAutomation().getRootInActiveWindow(),"피카츄 · Lv.7")==null&&title!=null){
            shell(t,"input tap 965 "+title.centerY());Thread.sleep(700);
        }
        Bitmap debug=t.getUiAutomation().takeScreenshot();screenshot(t,"notification-before-frames.png",debug);debug.recycle();
        Rect label=find(t.getUiAutomation().getRootInActiveWindow(),"피카츄 · Lv.7");
        require(label!=null&&label.width()>0,"Expanded partner was not visible in actual SystemUI");checks++;
        Set<Integer> frames=new HashSet<>();
        for(int i=0;i<14;i++) {
            Bitmap shot=t.getUiAutomation().takeScreenshot();require(shot!=null,"System screenshot unavailable");
            int top=Math.max(0,label.top-50),height=Math.min(shot.getHeight()-top,180);
            Bitmap crop=Bitmap.createBitmap(shot,0,top,Math.max(1,label.left-8),height);
            int[] pixels=new int[crop.getWidth()*crop.getHeight()];crop.getPixels(pixels,0,crop.getWidth(),0,0,crop.getWidth(),crop.getHeight());frames.add(Arrays.hashCode(pixels));
            if(i<4){screenshot(t,"notification-expanded-"+i+".png",shot);screenshot(t,"notification-sprite-"+i+".png",crop);}
            crop.recycle();shot.recycle();Thread.sleep(160);
        }
        require(frames.size()>1,"Actual SystemUI displayed a frozen sprite");checks++;
        require(store.read().equals(raw),"Showing the notification advanced the game");checks++;
        Bundle out=new Bundle();out.putInt("notificationPartnerChecks",checks);out.putInt("distinctSystemUiFrames",frames.size());out.putString("result","passed");return out;
    }
}
