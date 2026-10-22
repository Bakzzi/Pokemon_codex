'use strict';
const storyPresentation=StoryPresentation.create({advance:key=>action('scene-next',key),choose:value=>action('fossil-choice',value)});
function renderScene(state){
  storyPresentation.render(state);$('battle').style.visibility=state.scene?'hidden':'';
  if(state.scene){$('adventure').hidden=false;$('panel-wrap').hidden=true;}
}
function installStoryUI(){
  $('reset-open').onclick=()=>$('reset-confirm').showModal();
  $('reset-cancel').onclick=()=>$('reset-confirm').close();
  $('reset-accept').onclick=()=>{
    const now=Date.now();active=false;catchingUp=false;refreshNative();
    game=new MobileCore.Adventure({},now);
    // Preserve the pedometer but discard old, unpaid game activity too.
    progression=new MobileProgression(game,{consumed:nativeState.steps,lockConsumed:nativeState.lockMillis||0,pausedAt:now},MobileConfig.stepsPerAction);
    fatal=false;notice='';
    if(!save()){publish();return;}
    $('reset-confirm').close();$('settings').close();
    $('adventure').hidden=false;$('panel-wrap').hidden=true;panelDetail=false;panelTab='collection';
    $('panel').src='panels.html';
    active=true;progression.resume(now);publish();
  };
}
