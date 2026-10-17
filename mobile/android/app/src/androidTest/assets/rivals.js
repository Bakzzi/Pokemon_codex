'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Rival UI timed out');}
  const doc=document.getElementById('panel').contentDocument,badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
  const stages=[{id:'rival-surge',target:2},{id:'rival-middle',target:'tower-grunt-1'},{id:'rival-league',target:8}];
  const target=e=>e.target===8?doc.getElementById('league-start'):doc.querySelector('[data-challenge="'+e.target+'"]');
  const retry=e=>doc.querySelector('[data-rival-challenge="'+e.id+'"]');
  function settle(){game.data.switchUntil=0;game.nextTick=0;}
  function dialogue(){const id=game.presentation()?.id;while(game.presentation()?.mode==='dialogue'&&game.presentation().id===id)document.getElementById('story-next').click();}
  async function challengeView(){openPanel('challenge');await until(()=>!doc.getElementById('challenge').hidden);publish();await wait(120);}
  for(const e of stages){
    active=false;const now=Date.now(),old=new MobileCore.Game({},now);old.data.badges=badges.slice(0,typeof e.target==='number'?e.target:4);
    game=new MobileCore.Adventure(old.data,now);progression=new MobileProgression(game);settle();publish();await challengeView();
    await until(()=>!!retry(e)&&!target(e).disabled);const details=doc.getElementById('rival-details');
    check(!details.open,'rival card defaults collapsed '+e.id);details.open=true;
    check(details.querySelectorAll('.rival-entry').length===4,'four entries share one rival card '+e.id);
    check([...doc.querySelectorAll('[data-rival-challenge]')].every(b=>b.disabled),'all future rematches initially disabled '+e.id);
    check(doc.querySelector('[data-rival="'+e.id+'"] .unknown-rival')&&!doc.querySelector('[data-rival="'+e.id+'"] .team'),'unseen opponent hides its team '+e.id);
    target(e).click();await until(()=>game.data.battle?.storyId===e.id);
    check(document.getElementById('panel-wrap').hidden&&game.presentation()?.name==='그린','original challenge is intercepted '+e.id);
    await until(()=>document.getElementById('story-portrait').complete&&document.getElementById('story-portrait').naturalWidth===64);
    check(game.data.battle.kind==='trainer'&&game.captureOpportunity()===null,'rival uses trainer rules '+e.id);
    dialogue();game.sceneTick(Date.now()+3000);settle();publish();
    game.data.battle.party[game.data.activeId].hp=0;game.endChallenge(false,Date.now());publish();dialogue();settle();
    await challengeView();await until(()=>retry(e)&&!retry(e).disabled&&target(e).disabled);
    check(target(e).textContent.includes('그린'),'loss explains target prerequisite '+e.id);
    check(game.challenge(e.target,Date.now())===false,'disabled target is enforced by engine '+e.id);
    check([...doc.querySelectorAll('[data-rival-challenge]')].filter(b=>!b.disabled).length===1,'only this rematch enabled '+e.id);
    save();mobileLifecycle(true,true);active=false;settle();await challengeView();
    await until(()=>retry(e)&&!retry(e).disabled&&target(e).disabled);
    check(game.rivalProgress(e.id).state==='retry','loss survives native save reload '+e.id);
    doc.getElementById('rival-details').open=true;retry(e).click();await until(()=>game.data.battle?.storyId===e.id);dialogue();game.sceneTick(Date.now()+3000);settle();publish();
    const battle=game.data.battle;battle.foeIndex=game.battleBoss().team.length-1;battle.foe.hp=0;game.defeatOpponent(Date.now());publish();dialogue();settle();
    await challengeView();await until(()=>!target(e).disabled&&retry(e)?.disabled);
    check(game.rivalProgress(e.id).state==='won'&&game.data.battle===null,'victory waits for another deliberate target click '+e.id);
    target(e).click();await until(()=>game.data.battle?.bossIndex===e.target);
    check(game.data.battle.storyId===(typeof e.target==='string'?e.target:null)&&game.presentation()?.name!=='그린','target works normally after rival win '+e.id);
  }
  // Leave a discovered, rematchable entry visible for a reviewed screenshot.
  active=false;game.data.battle=null;game.data.pendingBattle=null;game.data.mobileStory.scene=null;game.rivalProgress('rival-league').state='retry';settle();publish();await challengeView();doc.getElementById('rival-details').open=true;
  doc.getElementById('rival-details').scrollIntoView({block:'start'});await wait(200);
  check(doc.documentElement.scrollWidth<=document.getElementById('panel').clientWidth,'rival card has no horizontal overflow');
  check(doc.getElementById('rival-details').querySelectorAll('.unknown-rival').length===0,'already progressed rivals remain visible');
  save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
