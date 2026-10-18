'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('League portraits timed out');}
  const panel=document.getElementById('panel'),doc=panel.contentDocument,$=id=>doc.getElementById(id);
  active=false;game=new MobileCore.Adventure(new MobileCore.Game({},Date.now()).data);progression=new MobileProgression(game);publish();save();openPanel('challenge');
  await until(()=>!$('challenge').hidden&&doc.querySelectorAll('.league-portrait').length===5);
  check(!$('league-details').open,'league retains its collapsed default');$('league-details').open=true;
  panel.contentWindow.buddy.onState(()=>{});await wait(250);check($('league-details').open,'late state listener does not reset an expanded card');
  const cards=[...$('league-team').children],faces=cards.map(c=>c.querySelector('.league-portrait'));
  check(cards.length===5,'four Elite Four cards and one Champion card');
  await until(()=>faces.slice(0,4).every(f=>f.querySelector('img')?.complete&&f.querySelector('img').naturalWidth>0));
  const gym=doc.querySelector('.gym-portrait');$('gym-details').open=true;const faceSize=gym.getBoundingClientRect().width;$('gym-details').open=false;
  for(let i=0;i<4;i++){
    const f=faces[i],r=f.getBoundingClientRect(),image=f.querySelector('img');
    check(r.width===r.height&&r.width===faceSize&&getComputedStyle(f).overflow==='hidden'&&image.getBoundingClientRect().width>r.width,'face crop matches gym portrait '+i);
    check(cards[i].querySelectorAll('.team img').length===game.panelState().bosses[i+8].team.length,'lineup stays present '+i);
  }
  const rects=cards.map(c=>c.getBoundingClientRect());
  check(rects.every(r=>r.left===rects[0].left&&r.width===rects[0].width)&&rects.slice(1).every((r,i)=>r.top>=rects[i].bottom),'five opponents occupy five separate full rows');
  check(doc.documentElement.scrollWidth<=panel.clientWidth,'league cards fit the phone');
  check(faces[4].classList.contains('unknown')&&!faces[4].querySelector('img')&&cards[4].textContent.includes('???')&&!cards[4].textContent.includes('그린'),'undiscovered Champion has no identity or image');
  publish();await wait(150);check(doc.querySelectorAll('.league-portrait').length===5,'state refresh does not duplicate portraits');
  $('league-team').scrollIntoView({block:'start'});await wait(150);
  globalThis.revealLeaguePortrait=async()=>{game.data.leagueBest=4;publish();await until(()=>doc.querySelector('.league-portrait[data-trainer="champion"] img')?.complete);const face=doc.querySelector('.league-portrait[data-trainer="champion"]'),image=face.querySelector('img');check(image.naturalWidth===1680&&face.closest('article').textContent.includes('그린'),'Champion portrait appears only after reveal');save();await wait(300);$('challenge').scrollTop=$('challenge').scrollHeight;};
  globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
