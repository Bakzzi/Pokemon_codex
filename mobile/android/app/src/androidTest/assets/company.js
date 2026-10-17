'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Company UI timed out');}
  const doc=document.getElementById('panel').contentDocument,step=n=>doc.querySelector('[data-challenge="silph-'+['grunt','duo','giovanni'][n]+'"]');
  function settle(){game.nextTick=0;game.data.switchUntil=0;}
  function pages(){const id=game.presentation()?.id;while(game.presentation()?.mode==='dialogue'&&game.presentation().id===id)document.getElementById('story-next').click();}
  function begin(){pages();game.sceneTick(Date.now()+3000);settle();publish();}
  function win(){const b=game.data.battle;b.foeIndex=game.battleBoss().team.length-1;b.foe.hp=0;game.defeatOpponent(Date.now());publish();pages();settle();}
  async function view(){openPanel('challenge');await until(()=>!doc.getElementById('challenge').hidden);publish();await wait(120);}
  const now=Date.now(),old=new MobileCore.Game({},now);old.data.badges=['brock','misty','surge','erika'];active=false;game=new MobileCore.Adventure(old.data,now);progression=new MobileProgression(game);settle();publish();await view();await until(()=>!!step(0));
  const card=doc.getElementById('silph-details');check(!card.open,'company defaults collapsed');check([0,1,2].every(n=>step(n).disabled),'company locked before Koga');
  game.data.badges.push('koga');publish();await until(()=>!step(0).disabled);card.open=true;
  check(card.querySelectorAll('[data-challenge]').length===3,'company lists exactly three regular opponents');check(!card.textContent.includes('그린'),'company never lists the hidden rival');
  check([...card.querySelectorAll('h3')].map(e=>e.textContent).join('|')==='1. 로켓단 조무래기|2. ???|3. ???','future identities hidden');
  const sabrina=()=>doc.querySelector('[data-challenge="5"]');check(sabrina().disabled&&sabrina().textContent.includes('실프주식회사'),'Sabrina explains the unresolved event');
  step(0).click();await until(()=>game.data.battle?.storyId==='silph-grunt');begin();win();
  check(!!game.data.mobileStory.silph.wins[0],'grunt win registered');save();mobileLifecycle(true,true);active=false;settle();await view();await until(()=>!step(1).disabled);
  check(!game.data.mobileStory.silph.wins[1],'duo has not been defeated');check(card.querySelectorAll('h3')[1].textContent.includes('로이·로사'),'duo is revealed after the grunt');
  card.open=true;step(1).click();await until(()=>game.data.battle?.storyId==='rival-silph');check(document.getElementById('panel-wrap').hidden&&game.presentation().name==='그린','duo challenge unexpectedly starts rival');begin();
  game.endChallenge(false,Date.now());publish();pages();settle();await view();await until(()=>step(1).disabled);
  const retry=()=>doc.querySelector('[data-rival-challenge="rival-silph"]');check(!retry().disabled&&step(1).textContent.includes('그린'),'rival loss enables retry and locks duo');
  save();mobileLifecycle(true,true);active=false;settle();await view();await until(()=>step(1).disabled&&!retry().disabled);check(game.rivalProgress('rival-silph').state==='retry','rival failure survives native reload');
  doc.getElementById('rival-details').open=true;retry().click();await until(()=>game.data.battle?.storyId==='rival-silph');begin();win();await view();await until(()=>!step(1).disabled);
  check(game.data.battle===null&&!game.data.mobileStory.silph.wins[1],'rival win waits for a deliberate duo challenge');
  card.open=true;step(1).click();await until(()=>game.data.battle?.storyId==='silph-duo');begin();win();await view();await until(()=>!step(2).disabled);check(card.querySelectorAll('h3')[2].textContent.includes('비주기'),'final identity revealed only after duo');
  save();mobileLifecycle(true,true);active=false;settle();await view();await until(()=>!step(2).disabled);card.open=true;step(2).click();await until(()=>game.data.battle?.storyId==='silph-giovanni');begin();
  const b=game.data.battle;b.foeIndex=game.battleBoss().team.length-1;b.foe.hp=0;game.defeatOpponent(Date.now());publish();check(!game.data.mobileStory.silph.completedAt,'company result waits for dialogue');pages();settle();await view();await until(()=>!sabrina().disabled);
  check(!!game.data.mobileStory.silph.completedAt,'company complete');check(!card.open,'completed company reopens collapsed');check(card.querySelector('summary').textContent.includes('평화'),'completion description changed');
  save();mobileLifecycle(true,true);active=false;settle();check(game.canChallenge(5),'Sabrina access survives native reload');
  const completedCompany=structuredClone(game.data);
  // Independent collection reward, with no Snorlax completion or early item leak.
  const deviceOld=new MobileCore.Game({},now);deviceOld.data.badges=['brock','misty','surge','erika'];game=new MobileCore.Adventure(deviceOld.data,now);progression=new MobileProgression(game);settle();for(let id=1;id<=49;id++)game.data.caught[id]=now;
  check(!game.offerDevice(Date.now()),'49 unique registrations do not qualify');game.data.caught[50]=now;check(game.offerDevice(Date.now()),'Erika and 50 registrations start aide');publish();
  await until(()=>document.getElementById('story-portrait').complete&&document.getElementById('story-portrait').naturalWidth===64);
  check(game.presentation().name==='오박사의 조수'&&!game.data.trainingDevice.obtainedAt,'aide sprite and dialogue precede reward');save();mobileLifecycle(true,true);active=false;
  check(game.presentation().next==='device-reward'&&!game.data.trainingDevice.obtainedAt,'pending aide dialogue survives native reload');pages();settle();publish();
  check(!!game.data.trainingDevice.obtainedAt&&!game.data.trainingDevice.snorlaxWonAt,'device independent of Snorlax');check(!game.canChallenge(4),'device cannot bypass the road');
  openPanel('daycare');await until(()=>!doc.getElementById('daycare').hidden);publish();await wait(100);
  check(game.panelState().inventory.filter(i=>i.id==='training-device').length===1,'device appears once in bag');
  save();mobileLifecycle(true,true);active=false;check(game.data.journal.filter(e=>e.kind==='device').length===1,'reward never duplicates');
  check(doc.documentElement.scrollWidth<=document.getElementById('panel').clientWidth,'company and bag fit phone width');
  game=new MobileCore.Adventure(completedCompany,Date.now());progression=new MobileProgression(game);settle();publish();await view();card.open=true;card.scrollIntoView({block:'start'});await wait(150);
  globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
