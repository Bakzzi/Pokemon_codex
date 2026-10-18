'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Move detail timed out');}
  active=false;game=new MobileCore.Game({},Date.now());
  const pikachu=game.data.owned[game.data.activeId];pikachu.level=20;
  // Reopening derives active techniques from this individual's real level.
  game.addPokemon(64,30,'fixture');game.addPokemon(148,30,'fixture');game.addPokemon(133,15,'fixture');
  game=new MobileCore.Game(game.data,Date.now());progression=new MobileProgression(game);save();
  const panel=document.getElementById('panel'),doc=panel.contentDocument;
  async function select(id){openPanel('collection');await until(()=>!doc.getElementById('collection').classList.contains('detail-open'));await until(()=>doc.querySelector('.dex-card[data-id="'+id+'"]'));doc.querySelector('.dex-card[data-id="'+id+'"]').click();await until(()=>doc.getElementById('collection').classList.contains('detail-open'));}
  const row=id=>doc.querySelector('[data-move="'+id+'"]');
  await select(25);
  check(row(84).querySelector('.move-type').textContent==='전기'&&row(84).querySelector('.move-stats').textContent==='위력 60* · PP 30','same-type power and real engine PP');
  check(row(98).querySelector('.move-type').textContent==='노말'&&row(98).querySelector('.move-stats').textContent==='위력 40 · PP 30','other-type power remains unchanged');
  check(row(87).classList.contains('locked')&&row(87).textContent.includes('해금'),'locked techniques keep their unlock level');
  check(doc.querySelector('.move-stab-note').textContent==='* 자속보정','single short STAB legend');
  check([...doc.querySelectorAll('.move-list li')].every(e=>e.getBoundingClientRect().width>0&&e.scrollWidth<=e.clientWidth+1)&&doc.documentElement.scrollWidth<=panel.clientWidth,'move cards fit the viewport');
  await select(64);check(row(105).querySelector('.move-stats').textContent==='위력 — · PP 20','status move has no invented power');
  await select(148);check(row(82).querySelector('.move-stats').textContent==='위력 — · PP 10','fixed damage never receives STAB power');
  await select(133);check(row(33).querySelector('.move-stats').textContent==='위력 52.5* · PP 35','fractional STAB power is preserved');
  await select(25);doc.querySelector('.move-list').scrollIntoView({block:'start'});
  globalThis.layoutResult={checks:checks.length,passed:checks,viewport:panel.clientWidth};
})().catch(e=>globalThis.layoutError=e.stack||String(e));
