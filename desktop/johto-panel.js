'use strict';
globalThis.JohtoPanel=(()=>{
 const open=new Map();let signature='';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const path=sprite=>sprite?.startsWith('pokemon:')?'assets/'+sprite.slice(8)+'.gif':sprite?.startsWith('item:')?'assets/items/'+sprite.slice(5)+'.png':'assets/trainers/battle/'+sprite+'.png';
 function portrait(boss){
  const frame=el('div','gym-portrait johto-portrait');
  if(!boss.portrait||boss.revealed===false){frame.classList.add('unknown');frame.textContent='?';return frame;}
  const image=el('img','gym-trainer'),key=boss.portrait,entry=globalThis.JohtoPortraits?.[key],crop=entry||trainerFaces[key];
  image.src=entry?'assets/trainers/portraits/'+key+'.png':'assets/trainers/'+key+'.png';image.alt=boss.name+' 얼굴';image.draggable=false;
  const [width,x,y,size]=crop;image.style.width=width/size*100+'%';image.style.left=-x/size*100+'%';image.style.top=-y/size*100+'%';frame.append(image);return frame;
 }
 function disclosure(id,title,description){
  const d=el('details','story-board challenge-card johto-section'),summary=el('summary'),head=el('div','johto-heading');d.id=id;d.open=open.get(id)||false;head.append(el('h2','',title));summary.append(head,el('p','muted',description));d.append(summary);d.addEventListener('toggle',()=>open.set(id,d.open));return d;
 }
 function button(row,s){const b=el('button','',s.pendingChallenge?.index===row.id?'도전 예약됨':row.canChallenge?row.button:row.hint||'앞선 모험을 마치면 도전할 수 있어요.');b.dataset.challenge=row.id;b.disabled=!row.canChallenge||!!s.pendingChallenge||!!s.scene||!!s.battle&&(s.battle.kind==='trainer'||s.battle.johtoId);b.onclick=()=>window.buddy.action('challenge',row.id);return b;}
 function battleCard(row,s,index){
  const card=el('article','gym johto-opponent'+(row.done?' done':'')),body=el('div','gym-body'),info=el('div','gym-info');
  const title=(index!==undefined?(index+1)+'. ':'')+(row.location?row.location+' 체육관 관장 ':'')+row.name;
  info.append(el('h3','',title),trainerTeam(row));if(row.badge)info.append(el('p','muted',row.badge));body.append(info,portrait(row));card.append(body,button(row,s));return card;
 }
 function badgeCase(rows,earned,id){
  const box=el('div','badge-case'),inlay=el('div','case-inlay'),slots=el('div','badge-slots');slots.id=id;
  for(const row of rows){const done=earned.includes(row.id),slot=el('div','badge-slot'+(done?' earned':' empty')),recess=el('span','badge-recess');
   const key=row.id.startsWith('j-k-')?row.id.slice(4):row.id;
   for(const cls of ['badge-edge','badge-shadow',...(done?['badge-art']:[])]){const art=el('img',cls);art.src='assets/badges/'+(key==='janine'?'koga':key==='blue'?'giovanni':key)+'.png';art.alt=row.badge;recess.append(art);}
   const label=el('span','badge-label');label.append(el('b','',row.badge),el('small','',done?'획득 완료':'미획득'));slot.append(recess,label);slots.append(slot);
  }inlay.append(slots);box.append(inlay);return box;
 }
 function render(s){
  const root=document.getElementById('johto-challenges');if(!root)return;root.hidden=!s.johto?.active;if(root.hidden){signature='';return;}
  const key=JSON.stringify([s.johto,s.pendingChallenge,s.battle,s.scene?.id]);if(key===signature)return;signature=key;root.replaceChildren();
  const j=s.johto,heading=el('div','johto-intro');heading.append(el('h2','',j.region),el('p','muted',j.completed?'성도와 관동을 지나 은빛산까지, 동료와 함께 긴 모험을 마쳤어요.':'새로운 지방에서 만난 동료들과 이야기를 이어 가요.'));root.append(heading);
  if(s.pendingChallenge||s.battle?.johtoId){const box=el('div','ongoing johto-ongoing');box.append(el('p','',s.pendingChallenge?s.pendingChallenge.name+' 도전 예약':s.battle.boss+'와 배틀 중'));const cancel=el('button','',s.pendingChallenge?'예약 취소':'도전 그만두기');cancel.onclick=()=>window.buddy.action(s.pendingChallenge?'challenge-cancel':'abandon');box.append(cancel);root.append(box);}
  const gyms=disclosure('johto-gym-details','성도 체육관','여덟 도시의 관장들이 도전을 기다리고 있어요.');gyms.querySelector('summary').append(badgeCase(j.gyms,j.badges,'johto-badge-slots'));const list=el('div','gyms johto-gym-list');j.gyms.forEach((row,i)=>list.append(battleCard(row,s,i)));gyms.append(list);root.append(gyms);
  if(j.rival){const r=j.rival,d=disclosure('johto-rival','실버와의 승부','성도에서 마주친 실버도 자신만의 길을 걷고 있어요. 패배한 승부는 여기서 다시 도전할 수 있어요.');d.append(battleCard({...r,portrait:'j-silver',revealed:true,button:'실버에게 재도전',hint:r.state==='retry'?'':'다음 만남을 기다리는 중'},s));root.append(d);}
  function eventCard(card){const d=disclosure(card.id,card.title,card.description);for(const row of card.steps){
    const item=el('article','rival-entry johto-event-entry'),head=el('div','rival-heading'),name=el('h3','',row.title);head.append(name);
    if(row.sprite){const image=el('img',row.revealed?'':'unknown-rival');image.src=path(row.sprite);image.alt=row.revealed?row.name:'아직 만나지 않은 상대';head.append(image);}item.append(head);
    if(row.revealed&&row.team?.length)item.append(trainerTeam(row));item.append(button(row,s));d.append(item);
   }return d;}
  function specialCard(row){const d=disclosure(row.id+'-event',row.title,row.done?'이곳에서 함께했던 모험이 기록에 남아 있어요.':'동료와 함께 주변을 살펴보세요.');
   if(row.type==='trainer')d.append(battleCard(row,s));else{if(row.sprite){const image=el('img','johto-event-image');image.src=path(row.sprite);image.alt=row.title;d.append(image);}d.append(button(row,s));}return d;
  }
  const postgame=new Set(['j-ship-route','j-power-plant','j-kanto-road']);
  for(const card of j.cards.filter(c=>!postgame.has(c.id)))root.append(eventCard(card));
  for(const row of j.special.filter(r=>!['j-red','j-gs-ball','j-shrine'].includes(r.id)))root.append(specialCard(row));
  const league=disclosure('johto-league','성도 포켓몬 리그','여덟 개의 뱃지를 모아 도전해요. 사천왕부터 챔피언까지 다섯 승부를 이어서 치러요.');
  league.append(button({id:'j-league',canChallenge:j.leagueReady,button:j.champion?'리그 재도전':'리그 도전',hint:'성도의 뱃지를 모두 모아 주세요.'},s));
  const leaders=el('div','league-team johto-league-team');for(const row of j.league){const card=battleCard({...row,button:'',canChallenge:false,hint:'리그 도전으로 이어서 배틀해요.'},s);card.lastElementChild.remove();leaders.append(card);}league.append(leaders,el('p','muted',j.champion?'성도 챔피언 · 미포획 포켓몬과 만날 기회가 늘었어요.':'동료와 함께 마지막 도전을 준비하세요.'));root.append(league);
  if(j.kantoGyms.length){const d=disclosure('johto-kanto-gyms','관동 체육관 재방문','시간이 흐른 관동에서 익숙한 얼굴들과 새로운 관장을 만나요.');d.querySelector('summary').append(badgeCase(j.kantoGyms,j.kantoBadges,'johto-kanto-badge-slots'));j.kantoGyms.forEach((row,i)=>d.append(battleCard(row,s,i)));root.append(d);}
  for(const card of j.cards.filter(c=>postgame.has(c.id)))root.append(eventCard(card));
  for(const row of j.special.filter(r=>['j-red','j-gs-ball','j-shrine'].includes(r.id)))root.append(specialCard(row));
 }
 document.addEventListener('panel-rendered',({detail:s})=>render(s));return {render};
})();
