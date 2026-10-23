'use strict';
(async()=>{
 globalThis.layoutResult=null;globalThis.layoutError='';
 const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Friendship UI timed out');}
 active=false;const now=Date.now();game=new MobileCore.Adventure(new MobileCore.Game({},now).data,now);game.data.mobileStory.onboarding='done';game.data.mobileStory.scene=null;game.data.animation=null;game.data.switchUntil=0;game.nextTick=now;progression=new MobileProgression(game);
 const uid=game.data.activeId,p=game.data.owned[uid],panel=document.getElementById('panel'),doc=panel.contentDocument,battleDoc=document.getElementById('battle').contentDocument;
 openPanel('collection');await wait(150);await until(()=>doc.querySelector('.dex-card[data-id="25"]'));doc.querySelector('.dex-card[data-id="25"]').click();
 for(const [value,reaction] of [[70,'watch'],[150,'hop'],[255,'heart']]){
  p.happiness=value;publish();await until(()=>doc.querySelector('.friendship-label')?.title==='친밀도 '+value+' / 255');
  const label=doc.querySelector('.friendship-label');check(label.textContent.includes(game.panelState().roster.find(m=>m.uid===uid).friendship.label),'bond stage '+value);
  const owned=JSON.stringify(game.data.owned),tokens=game.data.workTokens;doc.querySelector('.friendship-portrait').click();
  check(doc.querySelector('.friendship-portrait').dataset.reaction===reaction&&doc.querySelector('.friendship-status').textContent.includes('피카츄'),'dex reaction '+reaction);
  check(JSON.stringify(game.data.owned)===owned&&game.data.workTokens===tokens,'touch never awards growth '+value);
 }
 await until(()=>battleDoc.getElementById('hero').title.includes('둘도 없는 단짝'));battleDoc.getElementById('hero').click();
 check(battleDoc.getElementById('hero').dataset.reaction==='heart'&&battleDoc.getElementById('speech-text').textContent.includes('애정을 표현'),'battle frame receives bond and renders its own reaction');
 check(battleDoc.defaultView.getComputedStyle(battleDoc.querySelector('#hero>.friendship-heart')).display!=='none','pixel heart visible');
 game.animate('encounter',{text:'배틀 연출 확인'},Date.now());publish();await until(()=>battleDoc.getElementById('hero').getAttribute('aria-disabled')==='true');battleDoc.getElementById('hero').click();
 check(!battleDoc.getElementById('hero').classList.contains('friendship-reacting')&&battleDoc.getElementById('speech-text').textContent==='배틀 연출 확인','battle presentation suppresses touch reaction');
 game.data.animation=null;game.data.switchUntil=0;publish();await until(()=>battleDoc.getElementById('hero').getAttribute('aria-disabled')==='false');
 doc.querySelector('.friendship-portrait').click();await wait(1900);check(!doc.querySelector('.friendship-portrait').classList.contains('friendship-reacting'),'reaction ends without another game tick');
 check(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,'mobile detail has no horizontal overflow');
 doc.getElementById('detail').scrollIntoView({block:'start'});
 globalThis.layoutResult={checks:checks.length,passed:checks,viewport:panel.clientWidth};
})().catch(e=>globalThis.layoutError=e.stack||String(e));
