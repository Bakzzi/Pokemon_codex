'use strict';
(()=>{
 const root=document.createElement('section');root.id='kanto-journey-cases';document.getElementById('kanto-challenges').append(root);
 itemSprites['kanto-fishing-rod']='old-rod';itemSprites['j-fishing-rod']='old-rod';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};let signature='';
 for(const [id,sprite]of Object.entries({parcel:'parcel','ss-ticket':'ss-ticket','lift-key':'lift-key','card-key':'card-key',138:'helix-fossil',140:'dome-fossil'}))itemSprites['kanto-'+id]=sprite;
 document.addEventListener('panel-rendered',({detail:s})=>{
  const key=JSON.stringify([s.kantoStory,s.battle?.kind,s.scene?.id,s.pendingChallenge,s.challengeReadOnly]);if(key===signature)return;signature=key;
  const previous=new Map([...root.children].map(n=>[n.id,n.open]));root.replaceChildren();
  for(const group of s.kantoStory?.cases||[]){const card=el('details','story-board challenge-card');card.id='kanto-case-'+group.id;card.dataset.worldLocation=group.location;card.open=previous.get(card.id)||false;const summary=el('summary');summary.append(el('h2','',group.title),el('p','muted',group.description));card.append(summary);
   for(const [i,row]of group.entries.entries()){const label=row.reviewable?'대화 다시보기':row.done?(row.reward?'획득 완료':row.team.length?'승리 완료':'완료'):row.passed?'지나온 단계':row.readOnly?'모험의 이야기':row.automatic?'모험 중 자동으로 만나요':s.pendingChallenge?.index===row.id?'진행 예약됨':row.ready?row.reward?'화석 선택하기':row.team.length?'도전하기':'살펴보기':row.reason;
    card.append(ChallengeUI.eventStep({id:row.id,number:i+1,name:row.name,sprite:row.sprite,revealed:row.revealed,team:row.team.length?trainerTeam(row):null,reward:row.reward,action:{challenge:row.readOnly?null:row.id,label,disabled:row.readOnly||!!row.automatic||(!row.ready&&!row.reviewable)||s.battle?.kind==='trainer'||!!s.pendingChallenge||!!s.scene||s.challengeReadOnly,run:()=>window.buddy.action(row.reviewable?'npc-review':'challenge',row.id)}}));}
   root.append(card);
  }
 });
})();
