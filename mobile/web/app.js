'use strict';
const $=id=>document.getElementById(id),native=window.Android;
let saved,game,progression,active=false,catchingUp=false,ready=false,notice='',fatal=false,lastSave=0,panelTab='collection',nativeState={steps:0};
try{saved=JSON.parse(native.load());game=new MobileCore.Game(saved.game||{});progression=new MobileProgression(game,saved.mobile,MobileConfig.stepsPerAction);}catch(e){fatal=true;notice='저장을 읽지 못했어요. 기존 데이터는 보존돼요. 앱을 다시 열어 주세요.';$('app-notice').textContent=notice;native.reportError(String(e));}
function save(){if(fatal)return false;const ok=native.save(JSON.stringify({format:1,game:game.data,mobile:progression.checkpoint(),savedAt:Date.now()}));if(!ok){fatal=true;active=false;notice='진행을 저장하지 못해 모험을 멈췄어요. 저장 공간을 확인해 주세요.';}lastSave=Date.now();return ok;}
function snapshot(){return {...game.panelState(),phase:'working',source:{connected:true},compact:false,pinned:false,demo:false,notice,remote:{connections:[]}};}
function publish(){if(fatal){$('app-notice').textContent=notice;return;}const s=snapshot();for(const id of ['battle','panel'])$(id).contentWindow.postMessage({type:'state',state:s},location.origin);$('app-notice').textContent=notice;}
function openPanel(tab){panelTab=tab;$('adventure').hidden=true;$('panel-wrap').hidden=false;$('panel').contentWindow.postMessage({type:'tab',tab},location.origin);publish();}
function back(){if($('settings').open){$('settings').close();return true;}if(!$('panel-wrap').hidden){$('adventure').hidden=false;$('panel-wrap').hidden=true;return true;}return false;}
window.mobileBack=back;
function action(action,value){
  if(fatal)return;
  if(action==='panel'){openPanel(value);return;}
  let ok=true;
  try{
    if(['select','slot','evolve','daycare-start','daycare-withdraw','abandon','johto-stay','johto-unlock','device-claim','device-learner'].includes(action))ok=game.requestAction(action,value);
    else if(action==='action-cancel')ok=game.cancelAction(value);
    else if(action==='capture-reserve')ok=game.reserveCapture(value,1);
    else if(action==='capture-cancel')ok=game.reserveCapture(value,0);
    else if(action==='challenge')ok=game.challenge(value);
    else if(action==='challenge-cancel')ok=game.cancelChallenge();
    else if(action==='journal-ack')ok=game.acknowledgeJournal();
    else if(action==='daycare-preview')game.daycareSelection=Array.isArray(value)?value.slice(0,2).map(Number):[];
    else return;
    notice=ok===false?'지금은 예약할 수 없어요. 동료와 도전 조건을 확인해 주세요.':'';
    save();publish();
  }catch(e){native.reportError(String(e));notice='이 행동을 처리하지 못했어요. 다시 선택해 주세요.';publish();}
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||!['battle','panel'].some(id=>$(id).contentWindow===e.source))return;if(e.data.type==='ready'){publish();if(e.source===$('panel').contentWindow)e.source.postMessage({type:'tab',tab:panelTab},location.origin);}else if(e.data.type==='action')action(e.data.action,e.data.value);});
function refreshNative(){nativeState=JSON.parse(native.status());$('sensor-status').textContent=nativeState.sensor;$('walk-status').textContent=nativeState.tracking?'돌아온 걸음 · '+nativeState.steps.toLocaleString('ko-KR')+'걸음':'화면을 켜 두고 함께 모험 중';$('walk-note').textContent=nativeState.tracking?'걸음 기록 중 · 앱을 꺼도 걸은 만큼 모험해요.':'설정에서 걸음 기록을 켜면 꺼 둔 동안에도 걸음이 쌓여요.';$('update-status').textContent=nativeState.update;$('update-confirm').hidden=!nativeState.pendingInstall;$('install-permission').hidden=nativeState.canInstall;$('update-check').disabled=!!nativeState.updateChecking||!!nativeState.installing;$('version').textContent='Android v'+(nativeState.versionName||MobileConfig.name);}
window.mobileLifecycle=function(visible){
  if(fatal)return;const now=Date.now();
  if(!visible){active=false;progression.pause(now);save();return;}
  active=true;refreshNative();progression.resume(now);
  catchingUp=true;let actions=0;
  const drain=()=>{
    if(!active||fatal||!native.foreground()){catchingUp=false;return;}
    try{const n=progression.catchUp(nativeState.steps,Date.now(),10);actions+=n;
      if(n){notice='걸어 둔 만큼 모험을 이어가는 중…';save();publish();setTimeout(drain,25);}
      else{catchingUp=false;if(actions)notice='걸어 둔 만큼 모험을 이어갔어요. 모험 기록을 확인해 보세요.';publish();}
    }catch(e){fatal=true;active=false;notice='모험을 처리하지 못했어요. 기존 저장은 보존돼요.';native.reportError(String(e));publish();}
  };drain();
};
function safeForUpdate(){const now=Date.now();return !game.data.battle&&!game.data.pendingBattle&&now>=game.nextTick&&now>=(game.data.switchUntil||0);}
setInterval(()=>{
  if(fatal||!native.foreground())return;
  try{refreshNative();if(!active||catchingUp||nativeState.installing)return;if(nativeState.updateReady&&nativeState.canInstall&&safeForUpdate()){if(save())native.installUpdate();return;}const changed=progression.live(Date.now());if(changed){save();publish();}else if(Date.now()-lastSave>15000)save();}catch(e){active=false;native.reportError(String(e));notice='모험을 잠시 멈췄어요. 앱을 다시 열어 주세요.';publish();}
},250);
$('back').onclick=back;$('settings-open').onclick=()=>{refreshNative();$('settings').showModal();};$('settings-close').onclick=()=>$('settings').close();
$('steps-enable').onclick=()=>native.enableSteps();$('steps-disable').onclick=()=>{native.disableSteps();refreshNative();};$('install-permission').onclick=()=>native.allowUpdates();$('update-check').onclick=()=>{native.checkUpdate();refreshNative();};$('update-confirm').onclick=()=>{save();native.confirmUpdate();};$('version').textContent='Android v'+MobileConfig.name;
function resize(){const w=$('battle-wrap').clientWidth,scale=w/380;$('battle').style.transform='scale('+scale+')';$('battle-wrap').style.height=500*scale+'px';}window.addEventListener('resize',resize);resize();
if(!fatal){ready=true;native.ready();}
