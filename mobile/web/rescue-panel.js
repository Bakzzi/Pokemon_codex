'use strict';
(()=>{
  function createCard(id,titleText,sprite,anchor,stateKey){
  const details=document.createElement('details'),summary=document.createElement('summary'),head=document.createElement('div'),title=document.createElement('h2'),image=document.createElement('img'),note=document.createElement('p'),list=document.createElement('div');
  details.id=id;details.className='story-board mobile-challenge-card';head.className='rescue-heading';title.textContent=titleText;image.src=sprite;image.alt=titleText;head.append(title,image);summary.append(head,note);details.append(summary,list);document.getElementById(anchor).after(details);
  let signature='';
  window.buddy.onState(s=>{
    const r=s[stateKey];if(!r){details.hidden=true;return;}details.hidden=false;
    const key=JSON.stringify([r,s.battle?.kind,s.pendingChallenge,s.scene?.id,s.rivalLocks]);if(signature===key)return;signature=key;
    note.textContent=r.description;list.replaceChildren();
    for(const step of r.steps){
      const row=document.createElement('article');row.className='rival-entry';row.dataset[stateKey]=step.id;
      const heading=document.createElement('div');heading.className='rival-heading';const name=document.createElement('h3'),face=document.createElement('img');
      name.textContent=(step.stage+1)+'. '+step.name;face.src='assets/trainers/battle/'+step.sprite+'.png';face.alt=step.revealed?step.name:'아직 만나지 않은 상대';face.className=step.revealed?'':'unknown-rival';heading.append(name,face);row.append(heading);
      if(step.revealed)row.append(trainerTeam(step));
      const button=document.createElement('button');button.dataset.challenge=step.id;
      button.textContent=s.pendingChallenge?.index===step.id?'도전 예약됨':s.rivalLocks?.[step.id]||step.reason;
      button.disabled=!step.canChallenge||s.battle?.kind==='trainer'||!!s.pendingChallenge||!!s.scene;
      button.onclick=()=>window.buddy.action('challenge',step.id);row.append(button);list.append(row);
    }
  });
  }
  createCard('rescue-details','보라타운 촌장 구출','assets/trainers/battle/mr-fuji.png','rocket-hideout','rescue');
  createCard('silph-details','실프주식회사','assets/logos/team-rocket.png','snorlax-road','silph');
  window.buddy.onState(s=>{
    for(const [index,text] of Object.entries(s.mobileGymHints||{})){
      const button=document.querySelector('[data-challenge="'+index+'"]');
      if(button){button.textContent=text;button.disabled=true;}
    }
  });
})();
