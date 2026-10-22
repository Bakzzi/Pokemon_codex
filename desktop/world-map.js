'use strict';
(()=>{
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const root=el('details','story-board challenge-card mobile-challenge-card world-card');root.id='kanto-world';
 const summary=el('summary'),heading=el('h2','','관동 타운맵'),caption=el('p','muted');summary.append(heading,caption);
 const layout=el('div','world-layout'),map=el('div','world-map'),controls=el('div','world-controls');map.setAttribute('aria-label','관동 지방 모험 지도');
 const label=el('label','','탐험할 장소'),select=el('select'),selected=el('h3'),range=el('p','muted'),action=el('button','','이곳에서 모험하기'),note=el('p','muted'),cards=el('div','world-links');
 select.id='world-place';label.htmlFor=select.id;controls.append(label,select,selected,range,action,note,cards);layout.append(map,controls);root.append(summary,layout);
 document.getElementById('kanto-challenges').prepend(root);
 let state=null,choice=null,shapeKey='',stateKey='';const markers=new Map();
 function focusCard(id){const target=document.getElementById(id);if(!target||target.hidden)return;target.open=true;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 function renderChoice(){
  if(!state)return;const p=state.places.find(p=>p.id===choice)||state.places.find(p=>p.current);choice=p.id;select.value=choice;
  selected.textContent=p.name;range.textContent=p.open?'주변 야생 · Lv.'+p.levels.min+'–'+p.levels.max:p.reason;
  action.disabled=!state.active||!p.open||p.current||state.pending===p.id;action.textContent=p.current?'지금 탐험 중':state.pending===p.id?'이동 예약됨':'이곳에서 모험하기';
  note.textContent=!state.active?'관동에서 지나온 길의 기록이에요.':state.pending?'배틀과 결과 연출이 끝나면 예약한 곳으로 이동해요.':'열린 장소는 언제든 다시 갈 수 있어요. 다음 길은 체육관과 사건을 해결하면 열려요.';
  for(const [id,m] of markers){const item=state.places.find(p=>p.id===id);m.disabled=!state.active;m.classList.toggle('chosen',choice===id);m.classList.toggle('current',item.current);m.classList.toggle('locked',!item.open);m.classList.toggle('visited',item.visited);m.setAttribute('aria-pressed',String(choice===id));m.title=item.name+(item.current?' · 현재 위치':item.open?'': ' · '+item.reason);}
  cards.replaceChildren();if(!p.open)return;
  const links=[];if(p.activity?.startsWith('gym:'))links.push(['체육관 보기',()=>focusGym(Number(p.activity.slice(4)))]);
  const targets={rescue:['포켓몬타워 보기','rescue-details'],road:['길을 막는 잠만보 보기','snorlax-road'],safari:['사파리존 보기','safari-details'],mansion:['저택 조사 보기','mansion-details'],league:['포켓몬리그 보기','league-details']};
  if(targets[p.activity]){const [text,id]=targets[p.activity];if(!document.getElementById(id)?.hidden)links.push([text,()=>focusCard(id)]);}
  if(p.id==='celadon'&&!document.getElementById('rocket-hideout').hidden)links.push(['무지개시티의 사건 보기',()=>focusCard('rocket-hideout')]);
  if(p.id==='saffron'&&!document.getElementById('silph-details')?.hidden)links.push(['실프주식회사 보기',()=>focusCard('silph-details')]);
  for(const [text,handler] of links){const b=el('button','',text);b.onclick=handler;cards.append(b);}
 }
 select.onchange=()=>{choice=select.value;renderChoice();};
 action.onclick=()=>{if(!action.disabled)window.buddy.action('travel',choice);};
 document.addEventListener('panel-rendered',({detail:s})=>{
  state=s.kantoWorld;root.hidden=!state;if(!state)return;
  state={...state,active:state.active&&!s.challengeReadOnly};
  const key=JSON.stringify([state,s.challengeReadOnly,s.discovery,s.rescue?.visible,s.silph?.visible]);if(key===stateKey)return;stateKey=key;
  if(!choice||!state.places.some(p=>p.id===choice)||state.location!==root.dataset.location){choice=state.location;root.dataset.location=state.location;}
  caption.textContent=state.name+' · '+(state.active?'탐험 중':'지나온 길');
  if(shapeKey!==JSON.stringify(state.map)){
   shapeKey=JSON.stringify(state.map);map.replaceChildren();markers.clear();
   const art=el('img','world-art');art.src=state.map.image;art.alt='파이어레드·리프그린 관동 타운맵';art.width=state.map.width;art.height=state.map.height;art.draggable=false;map.append(art);
   for(const p of state.places){const point=state.map.points[p.id],b=el('button','world-marker'+(p.activity?.startsWith('gym:')?' landmark':''));b.style.left=point.x/state.map.width*100+'%';b.style.top=point.y/state.map.height*100+'%';b.setAttribute('aria-label',p.name);b.onclick=()=>{choice=p.id;renderChoice();};map.append(b);markers.set(p.id,b);}
  }
  select.replaceChildren(...state.places.map(p=>{const o=el('option','',p.name+(p.current?' · 현재 위치':!p.open?' · 미개방':''));o.value=p.id;return o;}));renderChoice();
 });
})();
