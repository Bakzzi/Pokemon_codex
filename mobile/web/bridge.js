'use strict';
// Only same-origin bundled frames participate. The Android bridge lives in the host.
let initialStateRequested=false;
function requestInitialState(){if(initialStateRequested)return;initialStateRequested=true;parent.postMessage({type:'ready'},location.origin);}
document.addEventListener('DOMContentLoaded',requestInitialState,{once:true});
window.buddy={
  onState(fn){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.type==='state')fn(e.data.state);});if(document.readyState!=='loading')requestInitialState();},
  onTab(fn){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.type==='tab')fn(e.data.tab);});},
  onDexBack(fn){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.type==='dex-back')fn();});},
  dexView(detail){parent.postMessage({type:'dex-view',detail},location.origin);},
  onKeyFile(){},
  action(action,value){parent.postMessage({type:'action',action,value},location.origin);}
};
