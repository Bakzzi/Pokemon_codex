package io.github.bakzzi.pokemonidle;
import android.content.*;
public final class UpdateReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i){if((c.getPackageName()+".UPDATE").equals(i.getAction())&&Updater.result(c,i))UpdateCompletion.reopen(c);}
}
