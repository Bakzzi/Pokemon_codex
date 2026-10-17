'use strict';
let sceneKey='',sceneTimer=0;
function renderScene(state){
  const scene=state.scene,root=$('story-scene'),button=$('story-next');
  root.hidden=!scene;$('battle').style.visibility=scene?'hidden':'';
  if(!scene){clearInterval(sceneTimer);sceneTimer=0;sceneKey='';return;}
  const key=scene.id+':'+(scene.index||0),sendout=scene.mode==='sendout';
  $('adventure').hidden=false;$('panel-wrap').hidden=true;
  root.dataset.mode=scene.mode;
  root.dataset.kind=scene.kind;
  root.dataset.gift=String(scene.kind==='oak'&&scene.next==='rival'&&scene.index>=2);
  if(root.dataset.gift==='true')$('story-hero').src='assets/'+state.hero.id+'.gif';
  $('story-name').textContent=scene.name;
  $('story-portrait').src=scene.sprite.startsWith('pokemon:')?'assets/'+scene.sprite.slice(8)+'.gif':scene.sprite.startsWith('item:')?'assets/items/'+scene.sprite.slice(5)+'.png':'assets/trainers/battle/'+scene.sprite+'.png';
  root.dataset.revealed=String(scene.kind!=='ghost'||scene.index>0||scene.next==='win'||scene.next==='loss');
  $('story-portrait').alt=scene.name;
  button.disabled=sendout;
  $('story-hint').textContent=sendout?'':'터치해서 계속 ▼';
  if(!sendout)$('story-text').textContent=scene.pages[scene.index];
  // Capture the page identity: a queued second tap cannot skip the next page.
  button.onclick=()=>action('scene-next',key);
  if(sceneKey===key)return;
  sceneKey=key;clearInterval(sceneTimer);sceneTimer=0;
  if(sendout){
    const hero=$('story-hero'),foe=$('story-foe');
    hero.src='assets/'+state.hero.id+'.gif';foe.src='assets/'+state.foe.id+'.gif';
    const draw=()=>{
      const current=game.presentation?.();
      if(!current||current.id!==scene.id){clearInterval(sceneTimer);sceneTimer=0;return;}
      const elapsed=Math.max(0,Date.now()-current.at);
      for(const animation of root.getAnimations({subtree:true}))animation.currentTime=elapsed;
      $('story-text').textContent=elapsed<1350?(scene.kind==='ghost-sendout'?'텅구리의 유령이 길을 막았다!':scene.name+'의 '+state.foe.name+'!'):state.hero.name+', 너로 정했다!';
    };
    draw();sceneTimer=setInterval(draw,120);
  }
}
function installStoryUI(){
  $('reset-open').onclick=()=>$('reset-confirm').showModal();
  $('reset-cancel').onclick=()=>$('reset-confirm').close();
  $('reset-accept').onclick=()=>{
    const now=Date.now();active=false;catchingUp=false;refreshNative();
    game=new MobileCore.Adventure({},now);
    // Preserve the pedometer but discard old, unpaid game activity too.
    progression=new MobileProgression(game,{consumed:nativeState.steps,pausedAt:now},MobileConfig.stepsPerAction);
    fatal=false;notice='';
    if(!save()){publish();return;}
    $('reset-confirm').close();$('settings').close();
    $('adventure').hidden=false;$('panel-wrap').hidden=true;panelDetail=false;panelTab='collection';
    $('panel').src='panels.html';
    active=true;progression.resume(now);publish();
  };
}
