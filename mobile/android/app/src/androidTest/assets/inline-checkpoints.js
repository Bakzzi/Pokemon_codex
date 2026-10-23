'use strict';
(async()=>{
 globalThis.layoutResult=null;globalThis.layoutError='';
 const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(fn){for(let i=0;i<120;i++){if(fn())return;await wait(50);}throw Error('Inline checkpoint UI timed out');}
 active=false;const now=Date.now();game=new MobileCore.Adventure(new MobileCore.Game({},now).data,now);game.data.mobileStory.onboarding='done';game.data.mobileStory.scene=null;game.data.battle=null;game.data.pendingBattle=null;game.data.switchUntil=0;game.nextTick=now;progression=new MobileProgression(game);
 game.data.badges=['brock','misty'];const w=game.data.kantoWorld,map=game.panelState().kantoWorld.map;w.location='route-5';w.position={...map.points['route-5']};w.blocked={location:'saffron',checkpoint:'saffron',position:{...map.points.saffron},gatePosition:{...map.points.saffron},at:now};
 const doc=document.getElementById('panel').contentDocument;openPanel('challenge');await wait(150);await until(()=>doc.getElementById('world-checkpoint')?.querySelector('h2')?.textContent==='노랑시티 경비원');
 check(!doc.querySelector('.world-place-dialog')&&!doc.querySelector('dialog[open]'),'no map popup on arrival');
 check(!doc.querySelector('.world-guard')&&doc.querySelectorAll('.world-player').length===1,'only Red is added to the map');
 check(doc.getElementById('world-daycare')?.checkVisibility()&&doc.getElementById('world-checkpoint').checkVisibility(),'Route 5 keeps the Day Care and guard as separate local cards');
 check(!doc.getElementById('world-checkpoint').open,'named guard card starts collapsed');
 doc.querySelector('#world-checkpoint>summary').click();check(doc.querySelector('.world-npc-dialogue').textContent.includes('핑크배지'),'guard dialogue appears inside the card');
 check(!doc.querySelector('[data-world-pass=saffron]'),'missing prerequisites never expose passage');
 const progress=()=>JSON.stringify([game.data.owned,game.data.slots,game.data.badges,game.data.caught,game.data.inventory,game.data.workTokens,game.data.outputTokens,game.data.battle]);
 const saved=progress();publish();await wait(150);check(doc.getElementById('world-checkpoint').open&&progress()===saved,'refresh preserves an expanded card without mutating progress');
 doc.querySelector('#world-checkpoint>summary').click();for(let i=0;i<3;i++){publish();await wait(60);}check(!doc.getElementById('world-checkpoint').open&&!doc.querySelector('dialog[open]'),'repeated refresh preserves collapse and never reopens a popup');
 game.data.badges=['brock','misty','surge','erika','koga'];publish();await until(()=>doc.querySelector('[data-world-pass=saffron]'));
 check(!doc.getElementById('world-checkpoint').open,'unlocking passage does not force the card open');doc.querySelector('#world-checkpoint>summary').click();doc.querySelector('[data-world-pass=saffron]').click();await until(()=>game.data.kantoWorld.journey?.destination==='saffron');
 check(game.data.kantoWorld.location==='route-5'&&game.data.workTokens===0,'inline passage uses the real journey and does not teleport or spend activity');
 game.data.kantoWorld.journey=null;game.data.kantoWorld.walk=null;game.data.kantoWorld.blocked=null;game.data.champion=true;check(game.unlockJohto(now,[25]),'regional transfer fixture');game.data.switchUntil=0;game.nextTick=now;
 const j=game.data.johtoWorld,jMap=game.panelState().johtoWorld.maps.johto;j.blocked={location:'j-violet',checkpoint:'j-violet',position:{...jMap.points['j-violet']},at:now};publish();await until(()=>doc.querySelector('#world-checkpoint h2')?.textContent==='도라지시티 안내원');
 check(!doc.getElementById('world-checkpoint').open&&!doc.querySelector('.world-place-dialog')&&!doc.querySelector('.world-guard'),'Johto uses the same collapsed inline checkpoint with no map NPC or popup');
 check(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'mobile checkpoint layout fits the viewport');
 // Leave the photographed Kanto card open without borrowing any real save.
 game=new MobileCore.Adventure(new MobileCore.Game({},now).data,now);game.data.mobileStory.onboarding='done';game.data.mobileStory.scene=null;game.data.badges=['brock','misty'];game.data.kantoWorld.location='route-5';game.data.kantoWorld.position={...map.points['route-5']};game.data.kantoWorld.blocked={location:'saffron',checkpoint:'saffron',position:{...map.points.saffron},at:now};progression=new MobileProgression(game);publish();await until(()=>doc.querySelector('#world-checkpoint h2')?.textContent==='노랑시티 경비원');
 doc.querySelector('.world-tabs button:nth-child(2)').click();doc.querySelector('#badge-slots .badge-slot').click();check(doc.getElementById('world-badge-detail').checkVisibility()&&!doc.querySelector('dialog[open]'),'badge inspection also stays inline');doc.querySelector('.world-tabs button:first-child').click();
 if(!doc.getElementById('world-checkpoint').open)doc.querySelector('#world-checkpoint>summary').click();doc.getElementById('world-checkpoint').scrollIntoView({block:'center'});
 globalThis.layoutResult={checks:checks.length,passed:checks,viewport:document.getElementById('panel').clientWidth};
})().catch(e=>globalThis.layoutError=e.stack||String(e));
