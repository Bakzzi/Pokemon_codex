'use strict';
globalThis.JohtoPanel=(()=>{
 const open=new Map(),completed=new Map();let signature='';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const path=sprite=>sprite?.startsWith('pokemon:')?'assets/'+sprite.slice(8)+'.gif':sprite?.startsWith('item:')?'assets/items/'+sprite.slice(5)+'.png':'assets/trainers/battle/'+sprite+'.png';
 function portrait(boss){
  if(!boss.portrait||boss.revealed===false)return null;
  const key=boss.portrait,entry=globalThis.JohtoPortraits?.[key];return {name:boss.name,src:'assets/trainers/battle/'+key+'.png',crop:entry||trainerFaces[key]};
 }
 function disclosure(id,title,description,done=false,header={}){
  if(done&&completed.get(id)===false)open.set(id,false);completed.set(id,done);
  let heading;if(header.count!==undefined){const intro=el('div','intro'),body=el('div');body.append(el('h2','',title),el('p','',description));intro.append(body,el('b','',header.count));heading=intro;}
  else heading=[...(header.kicker?[el('span','kicker',header.kicker)]:[]),el('h2','',title),el('p','muted',description)];
  const d=ChallengeUI.section(id,heading);d.open=open.get(id)||false;d.addEventListener('toggle',()=>open.set(id,d.open));return d;
 }
 function button(row,s){const b=el('button','',s.pendingChallenge?.index===row.id?'도전 예약됨':row.canChallenge?row.button:row.hint||'앞선 모험을 마치면 도전할 수 있어요.');b.dataset.challenge=row.id;b.disabled=!row.canChallenge||!!s.pendingChallenge||!!s.scene||!!s.battle&&(s.battle.kind==='trainer'||s.battle.johtoId);b.onclick=()=>window.buddy.action('challenge',row.id);return b;}
 function battleCard(row,s,index,league=false){
  const title=(index!==undefined?(index+1)+'. ':'')+(row.location?row.location+' 체육관 관장 ':'')+row.name;
  const card=ChallengeUI.trainerCard({id:row.id,title,team:trainerTeam(row),portrait:portrait(row),unknown:row.revealed===false,done:row.done,league,badge:row.badge?{name:row.badge,src:badgePath(row)}:null});
  if(!league)card.append(button(row.done&&row.badge?{...row,hint:'뱃지 획득 완료'}:row,s));
  if(row.preparation)card.append(el('p','muted',row.preparation.description),button(row.preparation,s));return card;
 }
 function badgePath(row){const key=row.id.startsWith('j-k-')?row.id.slice(4):row.id;return 'assets/badges/'+(key==='janine'?'koga':key==='blue'?'giovanni':key)+'.png';}
 function badgeCase(rows,earned,id){
  return ChallengeUI.badgeHolder({id,rows:rows.map(row=>({...row,src:badgePath(row)})),earned,region:id==='johto-badge-slots'?'JOHTO':'KANTO',onPick:row=>{const b=document.querySelector('#johto-challenges [data-challenge="'+row.id+'"]'),card=b?.closest('.gym');if(card){card.scrollIntoView({behavior:'smooth',block:'center'});if(!b.disabled)b.focus({preventScroll:true});}}});
 }
 function render(s){
  const root=document.getElementById('johto-challenges');if(!root)return;root.hidden=!s.johto?.active;if(root.hidden){signature='';return;}
  const key=JSON.stringify([s.johto,s.pendingChallenge,s.battle,s.scene?.id]);if(key===signature)return;signature=key;root.replaceChildren();
  const j=s.johto;
  if(s.pendingChallenge||s.battle?.johtoId){const box=el('div','ongoing');box.append(el('span','',s.pendingChallenge?s.pendingChallenge.name+' 도전 예약':s.battle.boss+'와 배틀 중'));const cancel=el('button','',s.pendingChallenge?'예약 취소':'도전 그만두기');cancel.onclick=()=>window.buddy.action(s.pendingChallenge?'challenge-cancel':'abandon');box.append(cancel);root.append(box);}
  const gyms=disclosure('johto-gym-details','성도 체육관','배치한 동료로 순서대로 도전해요. 야생 배틀 중 누르면 진행 중인 동작을 마친 뒤 시작해요.',j.badges.length===8,{count:'뱃지 '+j.badges.length+' / 8'}),list=el('div','gym-grid');j.gyms.forEach((row,i)=>list.append(battleCard(row,s,i)));gyms.append(badgeCase(j.gyms,j.badges,'johto-badge-slots'),list);root.append(gyms);
  if(j.rival){const r=j.rival,d=disclosure('johto-rival','라이벌 매치','모험길에서 마주친 라이벌, 실버. 서로 얼마나 강해졌는지 겨루며 각자의 길을 걸어요.'),match=el('div','rival-match'),head=el('div','rival-heading'),image=el('img');image.src=path(r.sprite||'j-silver');image.alt='실버';head.append(el('h3','','실버'),image);match.append(head,trainerTeam(r),el('p','muted',r.state==='retry'?'동료를 준비하고 실버에게 다시 도전해 보세요.':'실버와 다시 만날 날을 기다리고 있어요.'),button({...r,button:'실버에게 재도전',hint:'다음 만남을 기다리는 중'},s));d.append(match);root.append(d);}
  function eventCard(card){const d=disclosure(card.id,card.title,card.description,card.done);for(const row of card.steps){
    const item=el('article','rival-entry johto-event-entry'),head=el('div','rival-heading'),name=el('h3','',row.title);head.append(name);
    if(row.sprite){const image=el('img',row.revealed?'':'unknown-rival');image.src=path(row.sprite);image.alt=row.revealed?row.name:'아직 만나지 않은 상대';head.append(image);}item.append(head);
    if(row.revealed&&row.team?.length)item.append(trainerTeam(row));item.append(button(row,s));d.append(item);
   }return d;}
  function specialCard(row){const d=disclosure(row.id+'-event',row.title,row.done?'이곳에서 함께했던 모험이 기록에 남아 있어요.':'동료와 함께 주변을 살펴보세요.');
   const entry=el('article','rival-entry'),head=el('div','rival-heading');head.append(el('h3','',row.title));if(row.sprite){const image=el('img');image.src=path(row.sprite);image.alt=row.title;head.append(image);}entry.append(head);if(row.team?.length)entry.append(trainerTeam(row));entry.append(button(row,s));d.append(entry);return d;
  }
  const postgame=new Set(['j-ship-route','j-power-plant','j-kanto-road']);
  for(const card of j.cards.filter(c=>!postgame.has(c.id)))root.append(eventCard(card));
  for(const row of j.special.filter(r=>!['j-red','j-gs-ball','j-shrine'].includes(r.id)))root.append(specialCard(row));
  const league=disclosure('johto-league','사천왕, 그리고 챔피언','뱃지 8개를 모으면 도전할 수 있어요. 사천왕부터 챔피언까지 다섯 경기를 이어서 치러요.',false,{kicker:'POKÉMON LEAGUE'});
  if(j.leaguePreparation)league.append(el('p','muted',j.leaguePreparation.description),button(j.leaguePreparation,s));
  const start=button({id:'j-league',canChallenge:j.leagueReady,button:j.champion?'리그 재도전':'리그 도전',hint:'성도의 뱃지를 모두 모아 주세요.'},s);start.className='challenge-start';league.append(start);
  const leaders=el('div','league-team');for(const [i,row]of j.league.entries())leaders.append(battleCard({...row,name:(i===4?'챔피언 ':'')+row.name},s,undefined,true));league.append(leaders,el('p','muted',j.champion?'성도 챔피언 · 미포획 포켓몬과 만날 기회가 늘었어요.':'동료와 함께 마지막 도전을 준비하세요.'));root.append(league);
  if(j.kantoGyms.length){const d=disclosure('johto-kanto-gyms','관동 체육관 재방문','시간이 흐른 관동에서 익숙한 얼굴들과 새로운 관장을 만나요.',j.kantoBadges.length===8,{count:'뱃지 '+j.kantoBadges.length+' / 8'}),list=el('div','gym-grid');d.append(badgeCase(j.kantoGyms,j.kantoBadges,'johto-kanto-badge-slots'));j.kantoGyms.forEach((row,i)=>list.append(battleCard(row,s,i)));d.append(list);root.append(d);}
  for(const card of j.cards.filter(c=>postgame.has(c.id)))root.append(eventCard(card));
  for(const row of j.special.filter(r=>['j-red','j-gs-ball','j-shrine'].includes(r.id)))root.append(specialCard(row));
 }
 document.addEventListener('panel-rendered',({detail:s})=>render(s));return {render,collapse(){open.clear();for(const d of document.querySelectorAll('#johto-challenges details'))d.open=false;}};
})();
