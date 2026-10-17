'use strict';
(()=>{
  function createCard(id,anchor,stateKey){
  const details=document.createElement('details'),summary=document.createElement('summary'),head=document.createElement('div'),title=document.createElement('h2'),image=document.createElement('img'),note=document.createElement('p'),list=document.createElement('div');
  details.id=id;details.hidden=true;image.hidden=true;details.className='story-board mobile-challenge-card';head.className='rescue-heading';head.append(title,image);summary.append(head,note);details.append(summary,list);document.getElementById(anchor).after(details);
  let signature='';
  window.buddy.onState(s=>{
    const r=s[stateKey];details.hidden=!r?.visible;if(details.hidden){details.open=false;signature='';title.textContent='';note.textContent='';image.hidden=true;image.removeAttribute('src');list.replaceChildren();return;}
    const key=JSON.stringify([r,s.battle?.kind,s.pendingChallenge,s.scene?.id,s.rivalLocks]);if(signature===key)return;signature=key;
    title.textContent=r.title;image.hidden=!r.sprite;if(r.sprite){image.src=r.sprite;image.alt=r.title;}else{image.removeAttribute('src');image.alt='';}
    note.textContent=r.description;list.replaceChildren();
    const steps=r.investigated?r.steps:[{...r.steps[0],name:r.inquiry,sprite:null,revealed:false}];
    for(const step of steps){
      const row=document.createElement('article');row.className='rival-entry';row.dataset[stateKey]=step.id;
      const heading=document.createElement('div');heading.className='rival-heading';const name=document.createElement('h3'),face=document.createElement('img');
      name.textContent=(r.investigated?(step.stage+1)+'. ':'')+step.name;if(step.sprite){face.src=step.sprite.startsWith('pokemon:')?'assets/'+step.sprite.slice(8)+'.gif':'assets/trainers/battle/'+step.sprite+'.png';face.alt=step.revealed?step.name:'아직 만나지 않은 상대';face.className=step.revealed?'':'unknown-rival';heading.append(name,face);}else heading.append(name);row.append(heading);
      if(step.revealed)row.append(trainerTeam(step));
      const button=document.createElement('button');button.dataset.challenge=step.id;
      button.textContent=s.pendingChallenge?.index===step.id?'도전 예약됨':s.rivalLocks?.[step.id]||(!r.investigated&&step.canChallenge?'조사하기':step.reason);
      button.disabled=!step.canChallenge||s.battle?.kind==='trainer'||!!s.pendingChallenge||!!s.scene;
      button.onclick=()=>window.buddy.action('challenge',step.id);row.append(button);list.append(row);
    }
  });
  }
  createCard('rescue-details','rocket-hideout','rescue');
  createCard('silph-details','snorlax-road','silph');
  window.buddy.onState(s=>{
    for(const [id,known] of [['rocket-hideout',s.discovery?.rocket],['snorlax-road',s.discovery?.road]]){
      const card=document.getElementById(id);card.hidden=!known;if(!known)card.open=false;
    }
    for(const [index,known] of [[3,s.discovery?.rocket],[4,s.discovery?.road]]){
      const button=document.querySelector('[data-challenge="'+index+'"]');if(!button)continue;
      const note=button.parentElement.querySelector(':scope > p.muted');
      if(known||s.badges.includes(s.bosses[index].id)){
        if(button.dataset.unheardText){button.textContent=button.dataset.unheardText;delete button.dataset.unheardText;}
        if(note)note.hidden=false;continue;
      }
      button.dataset.unheardText ||= button.textContent;
      button.textContent='앞선 체육관 뱃지가 필요해요';button.disabled=true;
      if(note)note.hidden=true;
    }
    for(const [index,text] of Object.entries(s.mobileGymHints||{})){
      const button=document.querySelector('[data-challenge="'+index+'"]');
      if(button){button.textContent=text;button.disabled=true;}
    }
  });
})();
