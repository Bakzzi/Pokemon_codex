'use strict';

// On Windows, Electron's floating level reorders behind Shell_TrayWnd on
// activation. Inserting after a non-topmost HWND demotes the widget too.
// pop-up-menu avoids that shell-dependent ordering.
function attach(win,{pinned=true,powerMonitor,screen,platform=process.platform,
  setTimeout:later=setTimeout,clearTimeout:cancel=clearTimeout,onError=console.error}={}){
  const level=platform==='win32'?'pop-up-menu':'floating',listeners=[];
  let wanted=!!pinned,pending=null,applying=false,closed=false;
  function clear(){if(pending!==null){cancel(pending);pending=null;}}
  function apply(){
    if(closed||win.isDestroyed())return;
    applying=true;
    try{
      win.setAlwaysOnTop(wanted,level);
    }finally{applying=false;}
  }
  function reconcile(){
    if(closed||!wanted||applying)return;
    clear();pending=later(()=>{
      pending=null;
      if(closed||!wanted||win.isDestroyed()||!win.isVisible()||win.isMinimized())return;
      try{apply();}catch(error){onError(error);}
    },120);
    pending?.unref?.();
  }
  function listen(target,event,handler){if(target){target.on(event,handler);listeners.push([target,event,handler]);}}
  function dispose(){closed=true;clear();for(const [target,event,handler] of listeners)target.removeListener(event,handler);}
  for(const event of ['blur','show','restore'])listen(win,event,reconcile);
  listen(win,'always-on-top-changed',()=>{if(!applying)reconcile();});
  for(const event of ['resume','unlock-screen'])listen(powerMonitor,event,reconcile);
  for(const event of ['display-added','display-removed','display-metrics-changed'])listen(screen,event,reconcile);
  listen(win,'closed',dispose);
  apply();
  return {setPinned(value){wanted=!!value;clear();apply();},dispose};
}
module.exports={attach};
