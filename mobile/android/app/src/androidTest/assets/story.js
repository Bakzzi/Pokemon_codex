'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(fn){for(let i=0;i<110;i++){if(fn())return;await wait(50);}throw Error('Story UI timed out');}
  const $=id=>document.getElementById(id);
  active=false;game=new MobileCore.Adventure({},Date.now());progression=new MobileProgression(game);publish();
  await until(()=>$('story-portrait').complete&&$('story-portrait').naturalWidth===64);
  check(!$('story-scene').hidden&&$('story-name').textContent==='오박사','Oak appears at the start');
  check($('battle').style.visibility==='hidden','battle and partner card hidden during introduction');
  const before=JSON.stringify(game.data);await wait(700);check(JSON.stringify(game.data)===before,'waiting does not advance dialogue or battle');
  check(progression.catchUp(1000,Date.now())===0&&progression.consumed===0,'dialogue preserves unpaid walking actions');
  const page=game.presentation().index;$('story-next').click();check(game.presentation().index===page+1,'touch advances exactly one page');
  save();mobileLifecycle(true,true);active=false;check(game.presentation().index===1,'saved page resumes after native reload');
  $('story-next').click();check(game.data.mobileStory.giftReceived&&Object.values(game.data.owned).length===1,'first partner is received once');
  while(game.presentation().name==='오박사')$('story-next').click();
  check(game.presentation().name==='그린'&&game.data.battle.foe.id===133,'rival visits after Oak');
  await until(()=>$('story-portrait').complete&&$('story-portrait').naturalWidth===64);
  check($('story-portrait').src.endsWith('/green.png'),'early rival battle sprite loaded');
  while(game.presentation().mode==='dialogue')$('story-next').click();
  check($('story-next').disabled&&game.data.battle.turn===0,'send-out starts before any turn');
  // Sample the real CSS animations at exact timeline positions. A busy emulator
  // can resume a 200 ms timeout after the first send-out has already completed.
  clearInterval(sceneTimer);sceneTimer=0;
  const sendoutAnimations=$('story-scene').getAnimations({subtree:true});
  const sampleSendout=at=>{for(const animation of sendoutAnimations){animation.pause();animation.currentTime=at;}};
  sampleSendout(200);
  check(getComputedStyle($('story-foe')).visibility==='hidden'&&getComputedStyle($('story-hero')).visibility==='hidden','both partners wait inside their balls');
  sampleSendout(900);check(getComputedStyle($('story-foe')).visibility==='visible'&&getComputedStyle($('story-hero')).visibility==='hidden','opponent emerges first');
  sampleSendout(2100);check(getComputedStyle($('story-hero')).visibility==='visible','player partner emerges second without trainer backsprite');
  check(getComputedStyle($('story-hero')).scale==='-1 1','player partner faces its opponent');
  game.presentation().at=Date.now()-2100;for(const animation of sendoutAnimations)animation.play();
  active=true;catchingUp=false;progression.resume(Date.now());await until(()=>!game.presentation());active=false;
  check(game.data.battle.turn===0&&$('story-scene').hidden,'automatic battle waits for send-out to finish');
  // Let the actual battle engine resolve the tutorial, rather than forcing a result.
  let clock=Date.now();for(let i=0;i<180&&!game.presentation();i++){clock+=30000;game.tick(clock);}
  check(game.presentation()?.name==='그린','actual turn engine reaches rival result dialogue');
  publish();
  $('story-next').click();check(game.presentation().name==='오박사'&&game.data.battle===null,'either battle outcome continues with Oak');
  while(game.presentation())$('story-next').click();
  check(game.data.mobileStory.onboarding==='done'&&game.snapshot().hero.hp>0,'tutorial ends with a recovered companion');
  const old=game.data.mobileStory.serial;save();mobileLifecycle(true,true);active=false;
  check(game.presentation()===null&&game.data.mobileStory.serial===old,'completed tutorial stays complete on reload');
  // Verify the real settings buttons, cancellation and atomic reset checkpoint.
  game.addPokemon(150,80,'fixture',Date.now());game.data.badges=['brock'];game.data.inventory[83]=4;save();
  const counts=JSON.parse(Android.status());$('settings-open').click();$('reset-open').click();
  check($('reset-confirm').open&&game.data.caught[150],'opening confirmation does not delete anything');
  $('reset-cancel').click();check(game.data.caught[150]&&!$('reset-confirm').open,'cancel preserves the adventure');
  $('reset-open').click();$('reset-accept').click();active=false;
  check(Object.keys(game.data.caught).join(',')==='25'&&Object.keys(game.data.owned).length===1&&game.data.badges.length===0&&Object.keys(game.data.inventory).length===0,'confirmed reset removes game progress and collection');
  check(game.presentation()?.name==='오박사'&&progression.consumed===counts.steps,'reset restarts Oak without replaying old walking actions');
  const after=JSON.parse(Android.status());check(after.todaySteps===counts.todaySteps&&after.lifetimeSteps===counts.lifetimeSteps&&after.stepsEnabled===counts.stepsEnabled,'pedometer and settings survive game reset');
  save();mobileLifecycle(true,true);active=false;check(game.presentation()?.name==='오박사','reset is persisted through native storage');
  // A migrated game gets regular trainer presentation without onboarding.
  game=new MobileCore.Adventure(new MobileCore.Game({},Date.now()).data);if(game.rivalProgress('rival-brock'))game.rivalProgress('rival-brock').state='won';progression=new MobileProgression(game);game.nextTick=0;game.data.switchUntil=0;publish();action('challenge',0);active=false;
  check(game.presentation()?.sprite==='brock'&&$('panel-wrap').hidden,'challenge opens trainer scene immediately');
  await until(()=>$('story-portrait').complete&&$('story-portrait').naturalWidth===64);
  const r=$('story-scene').getBoundingClientRect(),b=$('story-next').getBoundingClientRect();
  check(r.left>=0&&r.right<=innerWidth&&b.bottom<=r.bottom&&b.top>=r.top,'dialogue fits available phone area');
  check($('story-next').scrollHeight<=$('story-next').clientHeight+2,'dialogue text has no clipping');
  globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
