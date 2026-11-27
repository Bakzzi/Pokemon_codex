'use strict';
const $=id=>document.getElementById(id),native=window.Android;
let saved,game,progression,active=false,catchingUp=false,updatePaused=false,ready=false,notice='',fatal=false,lastSave=0,panelTab='collection',panelDetail=false,nativeState={touches:0};
try{saved=JSON.parse(native.load());game=new MobileCore.Adventure(saved.game||{});progression=new MobileProgression(game,saved.mobile);}catch(e){fatal=true;notice='저장을 읽지 못했어요. 기존 데이터는 보존돼요. 앱을 다시 열어 주세요.';$('app-notice').textContent=notice;native.reportError(String(e));}
function save(){if(fatal)return false;const ok=native.save(JSON.stringify({format:1,game:game.data,mobile:progression.checkpoint(),savedAt:Date.now()}));if(!ok){fatal=true;active=false;notice='진행을 저장하지 못해 모험을 멈췄어요. 저장 공간을 확인해 주세요.';}if(ok)progression.dirty=false;lastSave=Date.now();return ok;}
function snapshot(){return {...game.panelState(),phase:'working',source:{connected:true},compact:false,pinned:false,demo:false,notice,remote:{connections:[]}};}
function formatUsage(millis){const minutes=Math.floor((Number.isFinite(millis)&&millis>0?millis:0)/60000);return Math.floor(minutes/60).toLocaleString('ko-KR')+'시간 '+minutes%60+'분';}
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
    if(['travel','world-pass','travel-bank','fossil-choice'].includes(action))refreshNative();
    if(['select','slot','evolve','daycare-start','daycare-withdraw','abandon','johto-stay','johto-unlock','device-claim','device-learner','travel','world-pass','travel-bank','fossil-choice','npc-review','story-travel'].includes(action))ok=game.requestAction(action,value);
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
  progression?.observe(nativeState,Date.now());
  const status=nativeState.touchTracking?'터치 기록 · 켜짐':'터치 기록 · 꺼짐';
  $('touch-status').textContent=[status,nativeState.monitorError,nativeState.backgroundError].filter(Boolean).join(' ');
  $('touch-today').textContent=(nativeState.todayTouches||0).toLocaleString('ko-KR')+'회';
  $('touch-month').textContent=(nativeState.monthlyTouches||0).toLocaleString('ko-KR')+'회';
  $('touch-total').textContent=(nativeState.touches||0).toLocaleString('ko-KR')+'회';
  $('usage-today').textContent=formatUsage(nativeState.usageTodayMillis);$('usage-month').textContent=formatUsage(nativeState.usageMonthlyMillis);$('usage-total').textContent=formatUsage(nativeState.usageMillis);
  $('update-status').textContent=nativeState.update;$('update-confirm').hidden=!nativeState.pendingInstall;$('install-permission').hidden=nativeState.canInstall;
  $('update-check').disabled=!!nativeState.updateChecking||!!nativeState.installing;$('version').textContent='Android v'+(nativeState.versionName||MobileConfig.name);
}
window.mobileLifecycle=function(visible,reload=false){
  if(fatal)return;const now=Date.now();
  if(!visible){refreshNative();active=false;progression.pause(now);save();return;}
  if(reload){active=false;try{saved=JSON.parse(native.load());game=new MobileCore.Adventure(saved.game||{},now);progression=new MobileProgression(game,saved.mobile);}catch(e){fatal=true;notice='저장을 읽지 못했어요. 기존 데이터는 보존돼요.';native.reportError(String(e));publish();return;}}
  if(progression.claimMovementFixReward(now)){notice='업데이트 보상으로 이동 자원 1개를 받았어요.';if(!save()){publish();return;}}
  refreshNative();if(applyReadyUpdate())return;
  updatePaused=false;active=true;progression.resume(now);
  catchingUp=true;let actions=0;
  const drain=()=>{
    if(!active||fatal||!native.foreground()){catchingUp=false;return;}
    try{refreshNative();if(applyReadyUpdate()){catchingUp=false;return;}const n=progression.catchUp(nativeState,Date.now(),10);actions+=n;
      if(n){notice='모험 기록을 정리하는 중…';save();publish();setTimeout(drain,25);}
      else{if(progression.dirty){save();publish();}catchingUp=false;if(actions)notice='';publish();}
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
$('accessibility-settings').onclick=()=>native.openAccessibilitySettings();$('install-permission').onclick=()=>native.allowUpdates();$('update-check').onclick=()=>{native.checkUpdate();refreshNative();};$('update-confirm').onclick=()=>{save();native.confirmUpdate();};$('version').textContent='Android v'+MobileConfig.name;
function resize(){const w=$('battle-wrap').clientWidth,scale=w/380;$('battle').style.transform='scale('+scale+')';$('battle-wrap').style.height=500*scale+'px';}window.addEventListener('resize',resize);resize();
installStoryUI();
if(!fatal){ready=true;native.ready();}
