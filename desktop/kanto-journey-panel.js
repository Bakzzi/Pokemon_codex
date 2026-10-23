'use strict';
(()=>{
 const root=document.createElement('section');root.id='kanto-journey-cases';document.getElementById('kanto-challenges').append(root);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};let signature='';
 for(const [id,sprite]of Object.entries({parcel:'parcel','ss-ticket':'ss-ticket','lift-key':'lift-key','card-key':'card-key',138:'helix-fossil',140:'dome-fossil'}))itemSprites['kanto-'+id]=sprite;
 document.addEventListener('panel-rendered',({detail:s})=>{
  const key=JSON.stringify([s.kantoStory,s.battle?.kind,s.scene?.id,s.pendingChallenge,s.challengeReadOnly]);if(key===signature)return;signature=key;
  const previous=new Map([...root.children].map(n=>[n.id,n.open]));root.replaceChildren();
  for(const group of s.kantoStory?.cases||[]){const card=el('details','story-board challenge-card');card.id='kanto-case-'+group.id;card.dataset.worldLocation=group.location;card.open=previous.get(card.id)||false;const summary=el('summary');summary.append(el('h2','',group.title),el('p','muted',group.description));card.append(summary);
   for(const row of group.entries){const entry=el('article','rival-entry'),head=el('div','rival-heading');head.append(el('h3','',row.name));if(row.sprite){const face=el('img',row.revealed?'':'unknown-rival');face.src='assets/trainers/battle/'+row.sprite+'.png';face.alt=row.revealed?row.name:'아직 만나지 않은 상대';head.append(face);}entry.append(head);if(row.team.length)entry.append(trainerTeam(row));
    if(row.readOnly){if(row.done)entry.append(el('p','muted','승부를 마쳤어요.'));card.append(entry);continue;}
    const button=el('button','',row.done?'완료':row.automatic?'모험 중 자동으로 만나요':s.pendingChallenge?.index===row.id?'진행 예약됨':row.ready?row.team.length?'도전하기':'살펴보기':row.reason);button.dataset.challenge=row.id;button.disabled=!!row.automatic||!row.ready||s.battle?.kind==='trainer'||!!s.pendingChallenge||!!s.scene||s.challengeReadOnly;button.onclick=()=>window.buddy.action('challenge',row.id);entry.append(button);card.append(entry);}
   root.append(card);
  }
 });
})();
