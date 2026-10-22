'use strict';
const $=id=>document.getElementById(id),native=window.Android;
let saved,game,progression,active=false,catchingUp=false,updatePaused=false,ready=false,notice='',fatal=false,lastSave=0,panelTab='collection',panelDetail=false,nativeState={steps:0};
try{saved=JSON.parse(native.load());game=new MobileCore.Adventure(saved.game||{});progression=new MobileProgression(game,saved.mobile,MobileConfig.stepsPerAction);}catch(e){fatal=true;notice='저장을 읽지 못했어요. 기존 데이터는 보존돼요. 앱을 다시 열어 주세요.';$('app-notice').textContent=notice;native.reportError(String(e));}
function save(){if(fatal)return false;const ok=native.save(JSON.stringify({format:1,game:game.data,mobile:progression.checkpoint(),savedAt:Date.now()}));if(!ok){fatal=true;active=false;notice='진행을 저장하지 못해 모험을 멈췄어요. 저장 공간을 확인해 주세요.';}lastSave=Date.now();return ok;}
function snapshot(){return {...game.panelState(),phase:'working',source:{connected:true},compact:false,pinned:false,demo:false,notice,remote:{connections:[]}};}
function publish(){if(fatal){$('app-notice').textContent=notice;return;}const s=snapshot();for(const id of ['battle','panel'])$(id).contentWindow.postMessage({type:'state',state:s},location.origin);renderScene(s);$('app-notice').textContent=notice;}
function openPanel(tab){panelTab=tab;panelDetail=false;$('back').textContent='‹ 모험으로';$('adventure').hidden=true;$('panel-wrap').hidden=false;$('panel').contentWindow.postMessage({type:'tab',tab},location.origin);publish();}
function back(){if($('reset-confirm').open){$('reset-confirm').close();return true;}if($('settings').open){$('settings').close();return true;}if(!$('panel-wrap').hidden){if(panelDetail){panelDetail=false;$('back').textContent='‹ 모험으로';$('panel').contentWindow.postMessage({type:'dex-back'},location.origin);return true;}$('adventure').hidden=false;$('panel-wrap').hidden=true;return true;}return false;}
window.mobileBack=back;
function action(action,value){
  if(fatal||updatePaused)return;
  if(action==='panel'){openPanel(value);return;}
  if(action==='story-open'){$('adventure').hidden=false;$('panel-wrap').hidden=true;return;}
  let ok=true;
  try{
    if(['select','slot','evolve','daycare-start','daycare-withdraw','abandon','johto-stay','johto-unlock','device-claim','device-learner','travel','world-pass'].includes(action))ok=game.requestAction(action,value);
    else if(action==='action-cancel')ok=game.cancelAction(value);
    else if(action==='capture-reserve')ok=game.reserveCapture(value,1);
    else if(action==='capture-cancel')ok=game.reserveCapture(value,0);
    else if(action==='challenge'){ok=game.challenge(value);if(ok){$('adventure').hidden=false;$('panel-wrap').hidden=true;}}
    else if(action==='scene-next'){if(!game.advanceScene(value))return;}
    else if(action==='challenge-cancel')ok=game.cancelChallenge();
    else if(action==='safari-return')ok=game.returnSafari();
    else if(action==='daycare-preview')game.daycareSelection=Array.isArray(value)?value.slice(0,2).map(Number):[];
    else return;
    notice=ok===false?'지금은 예약할 수 없어요. 동료와 도전 조건을 확인해 주세요.':'';
    save();publish();
  }catch(e){native.reportError(String(e));notice='이 행동을 처리하지 못했어요. 다시 선택해 주세요.';publish();}
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||!['battle','panel'].some(id=>$(id).contentWindow===e.source))return;if(e.data.type==='ready'){publish();if(e.source===$('panel').contentWindow)e.source.postMessage({type:'tab',tab:panelTab},location.origin);}else if(e.data.type==='dex-view'&&e.source===$('panel').contentWindow){panelDetail=!!e.data.detail;$('back').textContent=panelDetail?'‹ 도감 목록':'‹ 모험으로';}else if(e.data.type==='action')action(e.data.action,e.data.value);});
function refreshNative(){
  nativeState=JSON.parse(native.status());
  progression?.observe(nativeState);
  const toggle=$('steps-toggle');toggle.setAttribute('aria-checked',String(!!nativeState.stepsEnabled));toggle.disabled=!nativeState.sensorSupported&&!nativeState.stepsEnabled;$('steps-toggle-state').textContent=nativeState.stepsEnabled?'켜짐':'꺼짐';
  $('sensor-status').textContent=nativeState.sensor+(nativeState.monitorError?' '+nativeState.monitorError:'')+(nativeState.backgroundError?' '+nativeState.backgroundError:'');$('walk-status').textContent='모험의 발걸음';
  $('walk-today').textContent=(nativeState.todaySteps||0).toLocaleString('ko-KR')+'걸음';
  $('walk-total').textContent=(nativeState.lifetimeSteps||0).toLocaleString('ko-KR')+'걸음';
  $('walk-note').textContent=game?.data.mobileStory?.safari?.trip?'사파리 탐험 중 · 10걸음마다 탐험을 이어가요.':nativeState.tracking?'10걸음마다 모험해요. 폰을 잠그면 10초마다 한 번 더!':'폰을 잠그면 10초마다 모험해요. 걸음 기록을 켜면 걸은 만큼 더 모험해요.';
  $('update-status').textContent=nativeState.update;$('update-confirm').hidden=!nativeState.pendingInstall;$('install-permission').hidden=nativeState.canInstall;
  $('update-check').disabled=!!nativeState.updateChecking||!!nativeState.installing;$('version').textContent='Android v'+(nativeState.versionName||MobileConfig.name);
}
window.mobileLifecycle=function(visible,reload=false){
  if(fatal)return;const now=Date.now();
  if(!visible){active=false;progression.pause(now);save();return;}
  if(reload){active=false;try{saved=JSON.parse(native.load());game=new MobileCore.Adventure(saved.game||{},now);progression=new MobileProgression(game,saved.mobile,MobileConfig.stepsPerAction);}catch(e){fatal=true;notice='저장을 읽지 못했어요. 기존 데이터는 보존돼요.';native.reportError(String(e));publish();return;}}
  refreshNative();if(applyReadyUpdate())return;
  updatePaused=false;active=true;progression.resume(now);
  catchingUp=true;let actions=0;
  const drain=()=>{
    if(!active||fatal||!native.foreground()){catchingUp=false;return;}
    try{refreshNative();if(applyReadyUpdate()){catchingUp=false;return;}const n=progression.catchUp(nativeState,Date.now(),10);actions+=n;
      if(n){notice='잠든 동안의 모험을 정리하는 중…';save();publish();setTimeout(drain,25);}
      else{catchingUp=false;if(actions)notice='잠든 동안의 모험을 기록했어요.';publish();}
    }catch(e){fatal=true;active=false;notice='모험을 처리하지 못했어요. 기존 저장은 보존돼요.';native.reportError(String(e));publish();}
  };drain();
};
function applyReadyUpdate(){
  if(nativeState.installing||nativeState.pendingInstall){
    if(!updatePaused){active=false;updatePaused=true;progression.pause(Date.now());save();}
    return true;
  }
  if(!nativeState.updateReady||!nativeState.canInstall)return false;
  active=false;updatePaused=true;progression.pause(Date.now());
  if(save())native.installUpdate();return true;
}
setInterval(()=>{
  if(fatal||!native.foreground())return;
  try{refreshNative();if(applyReadyUpdate())return;if(updatePaused){updatePaused=false;window.mobileLifecycle(true);return;}if(!active||catchingUp)return;const changed=progression.live(Date.now(),nativeState);if(changed){save();publish();}else if(Date.now()-lastSave>15000)save();}catch(e){active=false;native.reportError(String(e));notice='모험을 잠시 멈췄어요. 앱을 다시 열어 주세요.';publish();}
},250);
$('back').onclick=back;$('settings-open').onclick=()=>{refreshNative();$('settings').showModal();};$('settings-close').onclick=()=>$('settings').close();
$('steps-toggle').onclick=()=>{refreshNative();if(nativeState.stepsEnabled)native.disableSteps();else native.enableSteps();};$('install-permission').onclick=()=>native.allowUpdates();$('update-check').onclick=()=>{native.checkUpdate();refreshNative();};$('update-confirm').onclick=()=>{save();native.confirmUpdate();};$('version').textContent='Android v'+MobileConfig.name;
function resize(){const w=$('battle-wrap').clientWidth,scale=w/380;$('battle').style.transform='scale('+scale+')';$('battle-wrap').style.height=500*scale+'px';}window.addEventListener('resize',resize);resize();
installStoryUI();
if(!fatal){ready=true;native.ready();}
