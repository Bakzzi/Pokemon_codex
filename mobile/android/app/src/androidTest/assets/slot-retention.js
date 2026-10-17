'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Slot UI timed out');}
  active=false;const now=Date.now();game=new MobileCore.Game({},now);progression=new MobileProgression(game);
  const other=game.addPokemon(19,10,'fixture',now);game.setSlot(1,other,now);game.data.badges.push('brock');game.awardStarterGift('brock',now);
  game.addPokemon(132,10,'fixture',now);publish();
  const battle=document.getElementById('battle').contentDocument,panel=document.getElementById('panel'),doc=panel.contentDocument;
  let epoch=0;
  async function flush(){const marker='slot-fixture-'+(++epoch);notice=marker;publish();await until(()=>battle.getElementById('status').textContent===marker&&doc.getElementById('notice').textContent===marker);}
  async function openCollection(){
    const frame=panel.contentWindow,applied=new Promise(resolve=>{const listener=e=>{if(e.source===window&&e.origin===location.origin&&e.data.type==='tab'&&e.data.tab==='collection'){frame.removeEventListener('message',listener);resolve();}};frame.addEventListener('message',listener);});
    openPanel('collection');await applied;
  }
  await flush();await until(()=>battle.querySelectorAll('#party button').length===6&&battle.querySelector('#party button[data-slot="1"]').dataset.id===String(other));
  check(game.data.slots[2]===null&&battle.querySelector('#party button[data-slot="2"]').classList.contains('empty'),'new companion does not fill the third slot '+JSON.stringify({slots:game.data.slots,visual:[...battle.querySelectorAll('#party button')].map(b=>b.dataset.id)}));
  check(game.data.owned[1]&&game.data.caught[1],'new companion remains owned and registered');
  await openCollection();await flush();await until(()=>!doc.getElementById('collection').hidden);doc.querySelector('.dex-card[data-id="1"]').click();await until(()=>!!doc.querySelector('[data-assign="2"]'));
  doc.querySelector('[data-assign="2"]').click();await until(()=>game.data.slots[2]===1&&battle.querySelector('#party button[data-slot="2"]').dataset.id==='1');
  check(game.data.slots.filter(uid=>uid===1).length===1,'manual placement fills only the chosen slot');
  action('daycare-start',[1,132]);await until(()=>!!game.data.daycare);await flush();await until(()=>doc.querySelector('.deploy').textContent.includes('데려온'));
  doc.querySelector('.deploy').click();await until(()=>game.data.pendingActions.some(a=>a.kind==='select'&&a.uid===1));
  check(game.data.pendingActions.some(a=>a.kind==='select'&&a.uid===1),'reproducing an older waiting selection');
  doc.querySelector('[data-remove-slot="2"]').click();await until(()=>game.data.slots[2]===null&&battle.querySelector('#party button[data-slot="2"]').classList.contains('empty'));
  check(!game.data.pendingActions.some(a=>a.uid===1&&['select','slot'].includes(a.kind)),'removal cancels conflicting old placement requests');
  action('daycare-withdraw');await until(()=>game.data.daycare===null);for(let i=0;i<4;i++)game.processActions(Date.now());publish();
  check(game.data.slots[2]===null&&game.data.activeId===25,'withdrawal cannot reinsert the removed companion');
  save();window.mobileLifecycle(true,true);active=false;publish();await wait(150);
  check(game.data.slots[2]===null&&game.data.owned[1]&&battle.querySelector('#party button[data-slot="2"]').classList.contains('empty'),'save and native reload retain the empty third slot');
  const original={game,progression};
  for(let slot=0;slot<6;slot++){
    const at=Date.now();game=new MobileCore.Game({},at);const bulba=game.addPokemon(1,10,'fixture',at),ditto=game.addPokemon(132,10,'fixture',at),others=[25,...[19,16,21,23].map(id=>game.addPokemon(id,10,'fixture',at))];
    game.data.slots=Array.from({length:6},(_,i)=>i===slot?bulba:others.shift());game.data.activeId=25;progression=new MobileProgression(game);const expected=[...game.data.slots];expected[slot]=null;
    await openCollection();await flush();await until(()=>!doc.getElementById('collection').classList.contains('detail-open'));doc.querySelector('.dex-card[data-id="1"]').click();await until(()=>!!doc.querySelector('[data-remove-slot="'+slot+'"]'));
    action('daycare-start',[bulba,ditto]);await until(()=>!!game.data.daycare);await flush();await until(()=>doc.querySelector('.deploy').textContent.includes('데려온'));doc.querySelector('.deploy').click();await until(()=>game.data.pendingActions.some(a=>a.kind==='select'&&a.uid===bulba));
    doc.querySelector('[data-remove-slot="'+slot+'"]').click();await until(()=>game.data.slots[slot]===null&&battle.querySelector('#party button[data-slot="'+slot+'"]').classList.contains('empty'));
    check(JSON.stringify(game.data.slots)===JSON.stringify(expected)&&!game.data.pendingActions.some(a=>a.uid===bulba),'slot '+(slot+1)+' removal preserves every other position and cancels the old selection');
    action('daycare-withdraw');await until(()=>game.data.daycare===null);for(let i=0;i<3;i++)game.processActions(Date.now());
    check(JSON.stringify(game.data.slots)===JSON.stringify(expected),'slot '+(slot+1)+' stays empty after withdrawal');
    save();window.mobileLifecycle(true,true);active=false;publish();await wait(100);
    check(JSON.stringify(game.data.slots)===JSON.stringify(expected),'slot '+(slot+1)+' stays empty after native reload');
  }
  game=original.game;progression=original.progression;notice='';publish();
  back();back();save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>globalThis.layoutError=e.stack||String(e));
