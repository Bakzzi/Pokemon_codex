'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('UI state timed out');}
  const panel=document.getElementById('panel'),doc=panel.contentDocument,frame=panel.contentWindow,$=id=>doc.getElementById(id),visible=e=>e.checkVisibility();
  async function open(tab){
    const applied=new Promise(resolve=>{const onTab=e=>{if(e.source===window&&e.origin===location.origin&&e.data.type==='tab'&&e.data.tab===tab){frame.removeEventListener('message',onTab);resolve();}};frame.addEventListener('message',onTab);});
    openPanel(tab);await applied;
  }
  // Layout checks start in a playable save, independently of a prior dialogue.
  active=false;game=new MobileCore.Adventure(new MobileCore.Game({},Date.now()).data);progression=new MobileProgression(game);publish();save();await open('collection');
  await until(()=>!$('collection').hidden&&!$('collection').classList.contains('detail-open'));
  check(!doc.querySelector('.dex-card.selected')&&!visible($('detail')),'dex starts with no selection or detail');
  const cards=[...doc.querySelectorAll('.dex-card')],rects=cards.slice(0,5).map(e=>e.getBoundingClientRect());
  check(frame.getComputedStyle($('dex-grid')).gridTemplateColumns.split(' ').length===4&&rects.slice(0,4).every(r=>r.top===rects[0].top)&&rects[4].top>rects[0].top,'four Pokemon per row');
  check(doc.documentElement.scrollWidth<=panel.clientWidth,'dex fits viewport');
  doc.querySelector('.dex-card[data-id="25"]').click();
  await until(()=>panelDetail&&document.getElementById('back').textContent==='‹ 도감 목록');
  check(visible($('detail'))&&!visible($('dex-grid'))&&!visible(doc.querySelector('.tools')),'detail replaces list and filters '+JSON.stringify({classes:$('collection').className,displays:[$('detail'),$('dex-grid'),doc.querySelector('.tools')].map(e=>[frame.getComputedStyle(e).display,e.getClientRects().length])}));
  check(window.mobileBack(),'Android back handled');
  await until(()=>!$('collection').classList.contains('detail-open'));
  check(!document.getElementById('panel-wrap').hidden&&visible($('dex-grid'))&&!doc.querySelector('.dex-card.selected'),'Android back returns to unselected list');
  doc.querySelector('.dex-card[data-id="19"]').click();await until(()=>panelDetail);
  document.getElementById('back').click();await until(()=>!$('collection').classList.contains('detail-open'));
  check(visible($('dex-grid')),'top-left button returns to list');
  doc.querySelector('.dex-card[data-id="25"]').click();await until(()=>panelDetail);
  await open('daycare');await until(()=>!$('daycare').hidden);await open('collection');await until(()=>!$('collection').hidden);
  check(!doc.querySelector('.dex-card.selected')&&!visible($('detail')),'reopening dex starts at list');
  await open('challenge');await until(()=>!$('challenge').hidden&&$('badge-slots').children.length===8);
  const disclosures=[...doc.querySelectorAll('.mobile-challenge-card')];
  check(disclosures.length===6&&disclosures.every(e=>!e.open),'all challenge groups initially collapsed');
  check($('gym-details').contains($('badge-slots'))&&$('gym-details').contains($('gyms'))&&$('gym-details').querySelector('#kanto-gyms-title'),'gym heading badges and trainers share one card');
  check(!visible($('badge-slots'))&&!visible($('gyms'))&&!visible($('league-team')),'collapsed groups hide their contents');
  for(const id of ['gym-details','rocket-hideout','snorlax-road','league-details']){
    const card=$(id);card.querySelector('summary').click();check(card.open,id+' expands');publish();await wait(100);check(card.open,id+' stays expanded after state refresh');
    card.querySelector('summary').click();check(!card.open,id+' collapses');
  }
  $('gym-details').querySelector('summary').click();doc.querySelector('.badge-slot').click();await wait(100);
  check($('gym-details').open&&visible($('gyms')),'badge opens its trainer card');
  await open('collection');await until(()=>!$('collection').hidden);await open('challenge');await until(()=>!$('challenge').hidden);
  check(disclosures.every(e=>!e.open),'reopening challenge resets groups to collapsed');
  check(doc.documentElement.scrollWidth<=panel.clientWidth,'challenge fits viewport');
  game=new MobileCore.Game({},Date.now(),{random:()=>.73});const uid=game.addPokemon(19,5,'fixture');publish();await open('collection');
  await until(()=>!$('collection').hidden&&doc.querySelector('.dex-card[data-id="19"]').classList.contains('caught'));
  doc.querySelector('.dex-card[data-id="19"]').click();await until(()=>!!doc.querySelector('[data-assign="0"]'));
  doc.querySelector('[data-assign="0"]').click();await until(()=>game.data.activeId===uid);
  await until(()=>[...document.getElementById('battle').contentDocument.querySelectorAll('#party button')].some(b=>b.dataset.id===String(uid)));
  check(game.data.slots.filter(id=>id===uid).length===1&&game.data.slots.slice(1).every(id=>id===null),'slot replacement stores one placement');
  const party=[...document.getElementById('battle').contentDocument.querySelectorAll('#party button')];
  check(party.filter(b=>b.dataset.id===String(uid)).length===1&&party.filter(b=>b.classList.contains('empty')).length===5,'slot replacement immediately displays one placement');
  document.getElementById('back').click();await until(()=>!$('collection').classList.contains('detail-open'));
  save();globalThis.layoutResult={passed:checks.length,checks,viewport:panel.clientWidth};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
