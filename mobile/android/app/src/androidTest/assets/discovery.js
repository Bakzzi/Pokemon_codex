'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Discovery UI timed out');}
  const doc=document.getElementById('panel').contentDocument,$=id=>doc.getElementById(id),badges=['brock','misty','surge','erika','koga'];
  function settle(){game.nextTick=0;game.data.switchUntil=0;}
  async function view(){openPanel('challenge');publish();await until(()=>!$('challenge').hidden);await wait(150);}
  async function seed(n){active=false;const old=new MobileCore.Game({},Date.now());old.data.badges=badges.slice(0,n);game=new MobileCore.Adventure(old.data);progression=new MobileProgression(game);settle();await view();}
  await seed(0);
  for(const id of ['rocket-hideout','rescue-details','snorlax-road','silph-details'])check(!$(id).checkVisibility(),id+' is absent before being heard of');
  check(!$('gym-details').hidden&&!$('league-details').hidden,'known gym and league goals stay visible');
  $('gym-details').open=true;
  check(![...$('gyms').querySelectorAll('p,button')].filter(e=>e.checkVisibility()).some(e=>/로켓단|잠만보|실프/.test(e.textContent)),'future gym locks do not leak unknown events');
  $('rival-details').open=true;const head=$('rival-details').querySelector('.rival-heading'),portrait=head.querySelector('img');
  await until(()=>portrait.complete&&portrait.naturalWidth===64);
  check(head.checkVisibility()&&head.textContent==='그린','waiting rival card knows Green');
  check($('rival-details').querySelector('summary p').textContent.includes('함께 자란 친구'),'rival is the childhood friend');
  check(!$('rival-details').querySelector('.team')&&$('rival-retry').disabled,'future timing and teams remain hidden');
  await seed(3);check($('rocket-hideout').checkVisibility()&&!$('rescue-details').checkVisibility()&&!$('snorlax-road').checkVisibility(),'only the newly heard request appears');
  await seed(4);check($('rescue-details').checkVisibility()&&$('snorlax-road').checkVisibility()&&!$('silph-details').checkVisibility(),'rumor and blocked road appear together');
  $('rescue-details').open=true;
  check($('rescue-details').querySelector('h2').textContent==='보라타운의 소문'&&!$('rescue-details').textContent.includes('구출'),'rumor does not announce a kidnapping');
  check($('rescue-details').querySelectorAll('[data-challenge]').length===1&&!$('rescue-details').querySelector('.team'),'investigation does not disclose opponents');
  check($('rescue-details').querySelector('.rescue-heading img').hidden,'unknown elder portrait is absent');
  await seed(5);$('silph-details').open=true;
  check($('silph-details').checkVisibility()&&$('silph-details').querySelector('.rescue-heading img').hidden&&!$('silph-details').textContent.includes('로켓단'),'company rumor conceals the Rocket emblem and culprit');
  check($('silph-details').querySelectorAll('[data-challenge]').length===1,'company starts with an investigation');
  game.challenge('silph-grunt',Date.now());publish();await wait(150);
  check($('silph-details').querySelector('.rescue-heading img').getAttribute('src')==='assets/logos/team-rocket.png'&&!$('silph-details').querySelector('.rescue-heading img').hidden,'entering reveals the culprit');
  check($('silph-details').querySelectorAll('[data-challenge]').length===3,'discovered event reveals the staged challenge');
  check([...$('silph-details').querySelectorAll('h3')].map(e=>e.textContent).join('|')==='1. 로켓단 조무래기|2. ???|3. ???','only the immediate opponent identity is revealed');
  game.data.mobileStory.scene=null;game.data.battle=null;game.resetSeason(new Date(Date.now()).setMonth(new Date().getMonth()+1));settle();await view();
  check(['rocket-hideout','rescue-details','snorlax-road','silph-details'].every(id=>$(id).hidden&&!$(id).open),'new season closes and hides undiscovered events');
  await seed(0);$('rival-details').open=true;save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
