'use strict';
(()=>{
  const details=document.createElement('details'),summary=document.createElement('summary'),head=document.createElement('div'),title=document.createElement('h2'),image=document.createElement('img'),note=document.createElement('p'),list=document.createElement('div');
  details.id='rescue-details';details.className='story-board mobile-challenge-card';head.className='rescue-heading';title.textContent='보라타운 촌장 구출';image.src='assets/trainers/battle/mr-fuji.png';image.alt='보라타운 촌장';head.append(title,image);summary.append(head,note);details.append(summary,list);document.getElementById('rocket-hideout').after(details);
  let signature='';
  window.buddy.onState(s=>{
    const r=s.rescue;if(!r){details.hidden=true;return;}details.hidden=false;
    const key=JSON.stringify([r,s.battle?.kind,s.pendingChallenge,s.scene?.id,s.rivalLocks]);if(signature===key)return;signature=key;
    note.textContent=r.description;list.replaceChildren();
    for(const step of r.steps){
      const row=document.createElement('article');row.className='rival-entry';row.dataset.rescue=step.id;
      const heading=document.createElement('div');heading.className='rival-heading';const name=document.createElement('h3'),face=document.createElement('img');
      name.textContent=(step.stage+1)+'. 로켓단 조무래기';face.src='assets/trainers/battle/rocket-grunt.png';face.alt=step.revealed?'로켓단 조무래기':'아직 만나지 않은 조무래기';face.className=step.revealed?'':'unknown-rival';heading.append(name,face);row.append(heading);
      if(step.revealed)row.append(trainerTeam(step));
      const button=document.createElement('button');button.dataset.challenge=step.id;
      button.textContent=s.pendingChallenge?.index===step.id?'도전 예약됨':s.rivalLocks?.[step.id]||step.reason;
      button.disabled=!step.canChallenge||s.battle?.kind==='trainer'||!!s.pendingChallenge||!!s.scene;
      button.onclick=()=>window.buddy.action('challenge',step.id);row.append(button);list.append(row);
    }
  });
})();
