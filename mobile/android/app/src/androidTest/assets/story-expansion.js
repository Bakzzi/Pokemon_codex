'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<120;i++){if(fn())return;await wait(50);}throw Error('Expanded story UI timed out');}
  const doc=document.getElementById('panel').contentDocument,$=id=>doc.getElementById(id),badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'],fixtures={};
  function settle(){game.nextTick=0;game.data.switchUntil=0;}
  function pages(){const id=game.presentation()?.id;while(game.presentation()?.mode==='dialogue'&&game.presentation().id===id)document.getElementById('story-next').click();}
  async function view(id){openPanel('challenge');publish();await until(()=>!$('challenge').hidden);await wait(180);if(id){$(id).open=true;$(id).scrollIntoView({block:'start'});await wait(100);}}
  function seed(n,random=()=>.5){active=false;const old=new MobileCore.Game({},Date.now());old.data.badges=badges.slice(0,n);game=new MobileCore.Adventure(old.data,Date.now(),{random});progression=new MobileProgression(game);settle();publish();}
  seed(0);await view();check($('safari-details').hidden&&$('mansion-details').hidden,'new places are undisclosed at the start');
  const exclusive=[29,30,32,33,46,47,102,104,111,113,114,115,123,128,131],collection=game.panelState().collection;
  check(collection.filter(p=>exclusive.includes(p.id)).every(p=>!p.acquisition.wildAllowed&&!p.acquisition.routes.some(r=>r.kind==='wild')),'exclusive encounters have no ordinary wild route');
  openPanel('collection');publish();await until(()=>!$('collection').hidden);await wait(150);
  check(doc.querySelector('.dex-card[data-id="128"] small').textContent==='사파리존','Safari acquisition label appears in the dex list');
  doc.querySelector('.dex-card[data-id="131"]').click();await until(()=>$('collection').classList.contains('detail-open'));
  check($('detail').querySelector('.acquisition-hints').textContent.includes('이벤트')&&!$('detail').querySelector('.acquisition-hints').textContent.includes('확률로 야생'),'Lapras detail shows an event without a false wild chance');
  seed(3);game.data.trainingDevice.gruntWonAt=Date.now();game.data.trainingDevice.duoWonAt=Date.now();game.challenge('rocket-giovanni',Date.now());publish();pages();game.sceneTick(Date.now()+3000);settle();
  game.data.battle.foeIndex=game.battleBoss().team.length-1;game.data.battle.foe.hp=0;game.defeatOpponent(Date.now());publish();pages();
  check(game.presentation()?.next==='scope-reward'&&!game.data.mobileStory.scopeObtainedAt,'scope discovery precedes the item award');
  await until(()=>document.getElementById('story-portrait').complete&&document.getElementById('story-portrait').src.endsWith('/silph-scope.png'));check(document.getElementById('story-portrait').naturalWidth>0,'scope uses the real item sprite');pages();settle();
  check(game.panelState().inventory.some(i=>i.id==='silph-scope'),'scope enters the bag after dialogue');
  seed(4);game.data.mobileStory.rescue.wins[0]=Date.now();game.rivalProgress('rival-middle').state='won';await view('rescue-details');
  await until(()=>!!doc.querySelector('[data-challenge="tower-grunt-2"]'));check($('rescue-details').querySelectorAll('h3')[1].textContent.includes('텅구리'),'ghost replaces the second grunt');
  doc.querySelector('[data-challenge="tower-grunt-2"]').click();await until(()=>game.presentation()?.kind==='ghost');fixtures.ghost=structuredClone(game.data);
  await until(()=>document.getElementById('story-portrait').complete&&document.getElementById('story-portrait').src.endsWith('/105.gif'));
  check(document.getElementById('story-scene').dataset.revealed==='false','ghost first appears as an unknown spirit');
  document.getElementById('story-next').click();check(document.getElementById('story-scene').dataset.revealed==='true','scope reveals the mother Marowak');pages();
  check(game.presentation()?.kind==='ghost-sendout'&&getComputedStyle(document.getElementById('story-foe-ball')).display==='none','ghost never comes out of an opponent ball');
  game.sceneTick(Date.now()+3000);settle();check(game.captureOpportunity()===null,'ghost cannot be captured');game.data.battle.foe.hp=0;game.defeatOpponent(Date.now());publish();
  check(game.presentation().pages.join('').includes('안식'),'ghost has a story outcome instead of a trainer boast');pages();settle();check(!game.registeredThisSeason(105)&&game.data.mobileStory.rescue.wins[1],'calmed spirit is separate from Pokemon ownership');
  seed(5);game.data.mobileStory.silph.wins[0]=Date.now();game.rivalProgress('rival-silph').state='won';const slots=[...game.data.slots];check(game.offerLapras(Date.now()),'employee appears after the company rival');publish();check(!game.registeredThisSeason(131),'Lapras is not granted before speaking');
  save();mobileLifecycle(true,true);active=false;check(game.presentation()?.next==='lapras-gift'&&!game.registeredThisSeason(131),'pending gift survives reload');pages();settle();
  check(game.data.owned[game.data.mobileStory.laprasUid]?.level===15,'employee gives a level fifteen Lapras');check(JSON.stringify(game.data.slots)===JSON.stringify(slots),'gift never fills an empty party slot');check(!game.offerLapras(Date.now()),'employee cannot duplicate the gift');
  check(!game.canReserveCapture(131),'event-only Lapras does not offer an impossible wild capture reservation');
  seed(6);await view('mansion-details');check(!$('mansion-details').hidden&&!$('mansion-start').disabled,'mansion can be investigated after Sabrina');check(!game.canChallenge(6),'locked gym waits for the investigation');
  check(!$('mansion-details').textContent.includes('뮤츠')&&!$('mansion-details').textContent.includes('비밀열쇠'),'unread findings and reward stay secret');
  $('mansion-start').click();await until(()=>game.presentation()?.next==='mansion-begin');pages();settle();
  check(!!game.data.mobileStory.mansion.startedAt,'investigation begins after the introduction');
  for(let i=1;i<=6;i++){
    game.newWild(Date.now());game.data.battle.foe.hp=0;game.defeatOpponent(Date.now());settle();publish();
    if(i%2===0){check(game.offerMansion(Date.now()),'diary found after actual adventure '+i);publish();check(game.panelState().mansion.entries.length===i/2-1,'unread page is not published early '+i);pages();settle();}
  }
  check(game.canChallenge(6)&&game.data.mobileStory.mansion.completedAt,'reading the final finding opens Blaine');fixtures.mansion=structuredClone(game.data);await view('mansion-details');
  check($('mansion-details').querySelectorAll('.mansion-records article').length===3,'discovered diary pages remain readable');
  check(game.panelState().inventory.some(i=>i.id==='secret-key'),'key appears in the bag after discovery');check(!doc.querySelector('[data-challenge="6"]').disabled,'Blaine button follows the key');
  seed(5,()=>0);await view('safari-details');check(!$('safari-details').hidden&&!$('safari-start').disabled,'walking expedition is available at Fuchsia');
  $('safari-start').click();await until(()=>game.presentation()?.next==='safari-depart');pages();settle();progression.resume(Date.now());
  check(!!game.data.mobileStory.safari.trip,'expedition departs after briefing');const xp=game.data.owned[game.data.activeId].xp;
  check(progression.live(Date.now())&&game.data.mobileStory.safari.trip.steps===0,'foreground adventure does not invent Safari steps');
  const battle=JSON.stringify(game.data.battle);check(progression.catchUp(50,Date.now())===5,'fifty steps pay five recorded walking actions');
  check(game.data.mobileStory.safari.trip.caught.length===1,'automatic encounter can recruit a companion');check(JSON.stringify(game.data.battle)===battle&&game.data.owned[game.data.activeId].xp===xp,'Safari walking leaves the ordinary battle and XP untouched');
  progression.catchUp(1500,Date.now(),200);publish();await view('safari-details');
  check(!game.data.mobileStory.safari.trip&&game.data.mobileStory.safari.last.encounters.length===30,'finite expedition returns automatically');
  await until(()=>$('safari-details').querySelector('.expedition-catches img')?.complete);check($('safari-details').querySelector('.expedition-catches img').naturalWidth>0,'return report displays actual caught Pokemon sprites');
  check($('safari-details').querySelector('.expedition-result').textContent.includes('포획'),'return report summarizes the expedition');
  check(doc.documentElement.scrollWidth<=document.getElementById('panel').clientWidth,'expanded story cards fit the phone');fixtures.safari=structuredClone(game.data);
  seed(8);game.data.leagueBest=4;check(game.panelState().bosses[12].team.at(-1).id===135,'Champion keeps the evolved rival starter');
  game.resetSeason(new Date().setMonth(new Date().getMonth()+1));settle();await view();check($('mansion-details').hidden&&$('safari-details').hidden,'new season hides undiscovered places again');
  globalThis.previewExpansion=async name=>{active=false;game=new MobileCore.Adventure(structuredClone(fixtures[name]),Date.now());progression=new MobileProgression(game);settle();publish();if(name!=='ghost')await view(name==='safari'?'safari-details':'mansion-details');};
  globalThis.prepareSafariBackground=()=>{seed(5);game.challenge('safari-start',Date.now());publish();pages();settle();progression.resume(Date.now());active=false;progression.pause(Date.now());save();};
  await previewExpansion('safari');save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
