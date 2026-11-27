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
    // The displayed totals survive a full reset without paying for old touches twice.
    game.data.mapTravel={credit:0,bank:0,touchesObserved:nativeState.touches||0};
    progression=new MobileProgression(game,{lockConsumed:nativeState.lockMillis||0,usageConsumed:nativeState.usageMillis||0,usageBonusConsumed:nativeState.usageBonusActions||0,usageMillis:nativeState.usageMillis||0,usageAt:now,pausedAt:now,movementFixRewardClaimed:progression.checkpoint().movementFixRewardClaimed});
    fatal=false;notice='';
    if(!save()){publish();return;}
    $('reset-confirm').close();$('settings').close();
    $('adventure').hidden=false;$('panel-wrap').hidden=true;panelDetail=false;panelTab='collection';
    $('panel').src='panels.html';
    active=true;progression.resume(now);publish();
  };
}
