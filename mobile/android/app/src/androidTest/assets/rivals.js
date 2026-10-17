'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Rival UI timed out');}
  const doc=document.getElementById('panel').contentDocument,badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
  const stages=[{id:'rival-surge',target:2},{id:'rival-middle',target:'tower-grunt-1'},{id:'rival-silph',target:'silph-duo'},{id:'rival-league',target:8}];
  const target=e=>e.target===8?doc.getElementById('league-start'):doc.querySelector('[data-challenge="'+e.target+'"]');
  const retry=()=>doc.getElementById('rival-retry');
  function settle(){game.data.switchUntil=0;game.nextTick=0;}
  function dialogue(){const id=game.presentation()?.id;while(game.presentation()?.mode==='dialogue'&&game.presentation().id===id)document.getElementById('story-next').click();}
  async function challengeView(){openPanel('challenge');await until(()=>!doc.getElementById('challenge').hidden);publish();await wait(120);}
  for(const e of stages){
    active=false;const now=Date.now(),old=new MobileCore.Game({},now);old.data.badges=badges.slice(0,typeof e.target==='number'?e.target:e.target==='silph-duo'?5:4);
    game=new MobileCore.Adventure(old.data,now);if(e.target==='silph-duo')game.data.mobileStory.silph.wins[0]=now;progression=new MobileProgression(game);settle();publish();await challengeView();
    await until(()=>!!retry(e)&&!target(e).disabled);const details=doc.getElementById('rival-details');
    check(!details.open,'rival card defaults collapsed '+e.id);details.open=true;
    check(details.querySelectorAll('.rival-match').length===1&&details.querySelectorAll('.rival-entry').length===0,'one fixed rival match without numbered history '+e.id);
    check(details.querySelector('summary p').textContent.includes('함께 자란 친구이자 라이벌, 그린'),'collapsed card introduces the childhood friend '+e.id);
    check(retry().disabled&&!retry().dataset.rivalChallenge,'waiting button cannot challenge a future rival '+e.id);
    check(!details.querySelector('.team')&&!details.querySelector('.rival-heading').hidden&&details.querySelector('.rival-heading h3').textContent==='그린','waiting card knows Green but hides future teams '+e.id);
    const fixedBlock=details.querySelector('.rival-match');
    target(e).click();await until(()=>game.data.battle?.storyId===e.id);
    check(document.getElementById('panel-wrap').hidden&&game.presentation()?.name==='그린','original challenge is intercepted '+e.id);
    await until(()=>document.getElementById('story-portrait').complete&&document.getElementById('story-portrait').naturalWidth===64);
    check(game.data.battle.kind==='trainer'&&game.captureOpportunity()===null,'rival uses trainer rules '+e.id);
    dialogue();game.sceneTick(Date.now()+3000);settle();publish();
    game.data.battle.party[game.data.activeId].hp=0;game.endChallenge(false,Date.now());publish();dialogue();settle();
    await challengeView();await until(()=>retry(e)&&!retry(e).disabled&&target(e).disabled);
    check(details.querySelector('.rival-match')===fixedBlock&&retry().dataset.rivalChallenge===e.id,'same block selects the current failed rival '+e.id);
    check(details.querySelectorAll('.team img').length===game.rivalState().find(r=>r.id===e.id).team.length,'only current rival lineup is visible '+e.id);
    check(target(e).textContent.includes('그린'),'loss explains target prerequisite '+e.id);
    check(game.challenge(e.target,Date.now())===false,'disabled target is enforced by engine '+e.id);
    check(details.querySelectorAll('button').length===1&&!retry().disabled,'only one rematch button exists '+e.id);
    save();mobileLifecycle(true,true);active=false;settle();await challengeView();
    await until(()=>retry(e)&&!retry(e).disabled&&target(e).disabled);
    check(game.rivalProgress(e.id).state==='retry','loss survives native save reload '+e.id);
    doc.getElementById('rival-details').open=true;retry(e).click();await until(()=>game.data.battle?.storyId===e.id);dialogue();game.sceneTick(Date.now()+3000);settle();publish();
    const battle=game.data.battle;battle.foeIndex=game.battleBoss().team.length-1;battle.foe.hp=0;game.defeatOpponent(Date.now());publish();dialogue();settle();
    await challengeView();await until(()=>!target(e).disabled&&retry(e)?.disabled);
    check(details.querySelector('.rival-match')===fixedBlock&&!details.querySelector('.team')&&!retry().dataset.rivalChallenge,'victory returns same block to waiting '+e.id);
    check(game.rivalProgress(e.id).state==='won'&&game.data.battle===null,'victory waits for another deliberate target click '+e.id);
    target(e).click();await until(()=>game.data.battle?.bossIndex===e.target);
    check(game.data.battle.storyId===(typeof e.target==='string'?e.target:null)&&game.presentation()?.name!=='그린','target works normally after rival win '+e.id);
  }
  // Leave a discovered, rematchable entry visible for a reviewed screenshot.
  active=false;game.data.battle=null;game.data.pendingBattle=null;game.data.mobileStory.scene=null;game.rivalProgress('rival-league').state='retry';settle();publish();await challengeView();doc.getElementById('rival-details').open=true;
  doc.getElementById('rival-details').scrollIntoView({block:'start'});await wait(200);
  check(doc.documentElement.scrollWidth<=document.getElementById('panel').clientWidth,'rival card has no horizontal overflow');
  check(doc.getElementById('rival-details').querySelectorAll('.team').length===1,'one retry lineup replaces all past and future matches');
  save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
