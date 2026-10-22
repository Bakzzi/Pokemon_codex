package io.github.bakzzi.pokemonidle;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Read-only projection of slot one, never the current battler or a different occupied slot. */
final class NotificationPartner {
    private static JSONObject catalog;
    private static synchronized JSONObject catalog(Context c)throws Exception {
        if(catalog==null)try(InputStream in=c.getAssets().open("notification/catalog.json");ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] bytes=new byte[8192];for(int n;(n=in.read(bytes))!=-1;)out.write(bytes,0,n);
            catalog=new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
        }
        return catalog;
    }
    static State read(Context c,String raw) {
        try {
            JSONObject game=new JSONObject(raw).optJSONObject("game");
            JSONArray slots=game==null?null:game.optJSONArray("slots");
            JSONObject owned=game==null?null:game.optJSONObject("owned");
            String uid=slots==null||slots.isNull(0)?"":slots.optString(0,"");
            JSONObject p=owned==null?null:owned.optJSONObject(uid);
            if(p==null)return State.EMPTY;
            int id=p.getInt("id"),level=Math.max(1,Math.min(100,p.getInt("level")));
            JSONObject data=catalog(c),species=data.getJSONObject("pokemon").getJSONObject(Integer.toString(id));
            JSONArray xp=data.getJSONObject("experience").getJSONArray(Integer.toString(species.getInt("growth")));
            long current=Math.max(0,p.getLong("xp")-xp.getLong(level-1));
            int percent=level==100?100:(int)Math.min(99,current*100/Math.max(1,xp.getLong(level)-xp.getLong(level-1)));
            return new State(id,species.getString("name"),level,percent,p.optBoolean("shiny"));
        }catch(Exception e){return State.EMPTY;}
    }
    static RemoteViews view(Context c,String steps,State state) {
        RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.notification_partner);
        view.setTextViewText(R.id.notification_partner_steps,steps);
        view.setTextViewText(R.id.notification_partner_name,state.id==0?"1번 슬롯이 비어 있어요":state.name+" · Lv."+state.level);
        view.setTextViewText(R.id.notification_partner_xp,"경험치 "+state.percent+"%");
        view.setViewVisibility(R.id.notification_partner_xp,state.id==0?View.GONE:View.VISIBLE);
        view.setViewVisibility(R.id.notification_partner_sprite,state.id==0?View.GONE:View.VISIBLE);
        view.setImageViewResource(R.id.notification_partner_sprite,state.sprite);
        return view;
    }
    static final class State {
        static final State EMPTY=new State(0,"",0,0,false);
        final int id,level,percent,sprite;
        final String name;
        State(int id,String name,int level,int percent,boolean shiny){this.id=id;this.name=name;this.level=level;this.percent=percent;this.sprite=PartnerSprites.drawable(id,shiny);}
        String key(){return id+":"+sprite+":"+level+":"+percent;}
    }
}
