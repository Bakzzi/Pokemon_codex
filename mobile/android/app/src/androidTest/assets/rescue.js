'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Rescue UI timed out');}
  const doc=document.getElementById('panel').contentDocument,$=id=>document.getElementById(id),step=n=>doc.querySelector('[data-challenge="tower-grunt-'+n+'"]');
  const retry=()=>doc.querySelector('[data-rival-challenge="rival-middle"]');
  function settle(){game.data.switchUntil=0;game.nextTick=0;}
  function pages(){const id=game.presentation()?.id;while(game.presentation()?.mode==='dialogue'&&game.presentation().id===id)$('story-next').click();}
  function begin(){pages();game.sceneTick(Date.now()+3000);settle();publish();}
  function win(){const b=game.data.battle;b.foeIndex=game.battleBoss().team.length-1;b.foe.hp=0;game.defeatOpponent(Date.now());publish();pages();settle();}
  async function view(){openPanel('challenge');await until(()=>!doc.getElementById('challenge').hidden);publish();await wait(120);}
  active=false;const now=Date.now(),old=new MobileCore.Game({},now);old.data.badges=['brock','misty','surge'];old.data.trainingDevice.rocketWonAt=now;
  game=new MobileCore.Adventure(old.data,now);progression=new MobileProgression(game);settle();publish();await view();await until(()=>!!step(1));
  check(!doc.getElementById('rescue-details').open,'rescue defaults collapsed');
  check([1,2,3].every(n=>step(n).disabled),'all rescue fights locked before Erika');
  check(!doc.getElementById('rescue-details').textContent.includes('피리'),'reward not disclosed before rescue');
  const elder=doc.querySelector('.rescue-heading img');await until(()=>elder.complete&&elder.naturalWidth===16);check(elder.naturalHeight===32,'original elder sprite is loaded');
  doc.querySelector('[data-challenge="3"]').click();await until(()=>game.data.battle?.bossIndex===3);begin();win();
  check(game.data.badges.includes('erika')&&!game.data.trainingDevice.fluteObtainedAt,'Erika awards badge without flute');
  check(!game.data.animation.text.includes('피리'),'Erika result does not claim old reward');
  await view();doc.getElementById('rescue-details').open=true;await until(()=>!step(1).disabled);
  check(step(1).checkVisibility()&&step(2).disabled&&step(3).disabled,'only first grunt is visibly available');
  step(1).click();await until(()=>game.data.battle?.storyId==='rival-middle');
  check($('panel-wrap').hidden&&game.presentation().name==='그린','first grunt challenge triggers rival instead');begin();
  game.endChallenge(false,Date.now());publish();pages();settle();await view();
  await until(()=>step(1).disabled&&!retry().disabled);
  check(step(1).textContent.includes('그린'),'failed rival is the rescue prerequisite');
  check(!doc.querySelector('[data-challenge="4"]').textContent.includes('그린'),'rival no longer blocks Koga directly');
  save();mobileLifecycle(true,true);active=false;settle();await view();await until(()=>step(1).disabled&&!retry().disabled);
  check(game.rivalProgress('rival-middle').state==='retry','rival loss persists in native save');
  doc.getElementById('rival-details').open=true;retry().click();await until(()=>game.data.battle?.storyId==='rival-middle');begin();win();
  check(game.rivalProgress('rival-middle').state==='won'&&!game.data.trainingDevice.fluteObtainedAt,'rival victory alone gives no flute');
  for(let n=1;n<=3;n++){
    await view();doc.getElementById('rescue-details').open=true;await until(()=>!step(n).disabled);step(n).click();await until(()=>game.data.battle?.storyId==='tower-grunt-'+n);
    check(game.data.battle.kind==='trainer'&&game.captureOpportunity()===null,'grunt cannot be captured '+n);begin();win();
    check(!!game.data.mobileStory.rescue.wins[n-1],'grunt victory recorded '+n);
    check(!game.data.trainingDevice.fluteObtainedAt,'no early reward after grunt '+n);
    if(n<3){save();mobileLifecycle(true,true);active=false;settle();check(!!game.data.mobileStory.rescue.wins[n-1],'grunt progress survives reload '+n);}
  }
  check(game.presentation()?.name==='보라타운 촌장'&&game.presentation().next==='rescue-reward','elder speaks after all three victories');
  await until(()=>$('story-portrait').complete&&$('story-portrait').naturalWidth===16);
  save();mobileLifecycle(true,true);active=false;check(game.presentation().next==='rescue-reward'&&!game.data.trainingDevice.fluteObtainedAt,'pending elder reward survives reload');
  pages();settle();check(!!game.data.trainingDevice.fluteObtainedAt&&game.data.mobileStory.rescue.completedAt,'reward granted after elder dialogue');
  check(game.canChallenge('road-snorlax'),'reward enables Snorlax encounter');
  check(game.panelState().inventory.filter(i=>i.id==='poke-flute').length===1,'flute appears once in bag');
  save();mobileLifecycle(true,true);active=false;settle();await view();
  check(!doc.getElementById('rescue-details').open,'completed rescue reopens collapsed');
  doc.getElementById('rescue-details').open=true;await until(()=>[1,2,3].every(n=>step(n).disabled));
  check(game.data.journal.filter(j=>j.text==='보라타운 촌장에게 포켓몬피리를 받았다!').length===1,'reload never duplicates the reward');
  const r=doc.getElementById('rescue-details').getBoundingClientRect();check(r.left>=0&&r.right<=document.getElementById('panel').clientWidth,'rescue card fits phone width');
  doc.getElementById('rescue-details').scrollIntoView({block:'start'});save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
