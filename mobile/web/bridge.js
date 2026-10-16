'use strict';
// Only same-origin bundled frames participate. The Android bridge lives in the host.
window.buddy={
  onState(fn){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.type==='state')fn(e.data.state);});parent.postMessage({type:'ready'},location.origin);},
  onTab(fn){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.type==='tab')fn(e.data.tab);});},
  onKeyFile(){},
  action(action,value){parent.postMessage({type:'action',action,value},location.origin);}
};
