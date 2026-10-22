'use strict';
(()=>{
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const root=el('details','story-board challenge-card mobile-challenge-card world-card');root.id='kanto-world';
 const summary=el('summary'),heading=el('h2','','관동 타운맵'),caption=el('p','muted');summary.append(heading,caption);
 const layout=el('div','world-layout'),map=el('div','world-map'),controls=el('div','world-controls');map.setAttribute('aria-label','길이나 마을을 눌러 레드 이동');map.tabIndex=0;
 const selected=el('h3'),range=el('p','muted'),note=el('p','muted'),cards=el('div','world-links');note.setAttribute('role','status');controls.append(selected,range,note,cards);layout.append(map,controls);root.append(summary,layout);
 document.getElementById('kanto-challenges').prepend(root);
 let state=null,choice=null,shapeKey='',stateKey='',actor=null,sprite=null,raf=0,localNotice='';const markers=new Map();
 function focusCard(id){const target=document.getElementById(id);if(!target||target.hidden)return;target.open=true;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 function draw(){
  raf=0;if(!state||!actor)return;const walk=state.walk,frame=walk?MapWalk.frame(walk,Date.now()):{...state.position,walking:false,direction:state.facing,sprite:{up:1,left:2,right:2}[state.facing]||0};
  actor.style.left=frame.x/state.map.width*100+'%';actor.style.top=frame.y/state.map.height*100+'%';actor.dataset.x=frame.x;actor.dataset.y=frame.y;actor.classList.toggle('walking',frame.walking);
  sprite.style.backgroundPositionX=-frame.sprite*16+'px';sprite.style.transform=frame.direction==='right'?'scaleX(-1)':'';map.dataset.moving=String(frame.walking);
  caption.textContent=state.name+' · '+(!state.active?'지나온 길':frame.walking?'이동 중':'탐험 중');
  note.textContent=localNotice||(!state.active?'관동에서 지나온 길의 기록이에요.':state.pending?(frame.walking?'목적지에 도착하면 다음 장소로 이동해요.':'배틀이 끝나면 선택한 곳으로 이동해요.'):frame.walking?'레드가 길을 따라 이동하고 있어요.':'지도에서 길이나 마을을 눌러 이동해요.');
  if(frame.walking)raf=requestAnimationFrame(draw);
 }
 function pick(id,position){
  const p=state?.places.find(p=>p.id===id);if(!p)return;choice=id;localNotice='';renderChoice();
  if(!state.active)return;
  if(!p.open){localNotice=p.reason;draw();return;}
  const to=position||state.map.points[id],here=state.position;
  if(p.current&&to.x===here.x&&to.y===here.y)return;
  localNotice=state.walk?'목적지에 도착한 뒤 선택한 곳으로 이동해요.':'이동할 곳을 선택했어요.';draw();
  window.buddy.action('travel',position?{location:id,position}:id);
 }
 function renderChoice(){
  if(!state)return;const p=state.places.find(p=>p.id===choice)||state.places.find(p=>p.current);choice=p.id;
  selected.textContent=p.name;range.textContent=p.open?'주변 야생 · Lv.'+p.levels.min+'–'+p.levels.max:p.reason;
  map.querySelector('.world-close').disabled=!state.active;
  for(const [id,m] of markers){const item=state.places.find(p=>p.id===id);m.disabled=!state.active;m.classList.toggle('chosen',choice===id);m.classList.toggle('current',item.current);m.classList.toggle('locked',!item.open);m.setAttribute('aria-pressed',String(choice===id));m.title=item.name+(item.current?' · 현재 위치':item.open?'':' · '+item.reason);}
  cards.replaceChildren();if(p.open){
   const links=[];if(p.activity?.startsWith('gym:'))links.push(['체육관 보기',()=>focusGym(Number(p.activity.slice(4)))]);
   const targets={rescue:['포켓몬타워 보기','rescue-details'],road:['길을 막는 잠만보 보기','snorlax-road'],safari:['사파리존 보기','safari-details'],mansion:['저택 조사 보기','mansion-details'],league:['포켓몬리그 보기','league-details']};
   if(targets[p.activity]){const [text,id]=targets[p.activity];if(!document.getElementById(id)?.hidden)links.push([text,()=>focusCard(id)]);}
   if(p.id==='celadon'&&!document.getElementById('rocket-hideout').hidden)links.push(['무지개시티의 사건 보기',()=>focusCard('rocket-hideout')]);
   if(p.id==='saffron'&&!document.getElementById('silph-details')?.hidden)links.push(['실프주식회사 보기',()=>focusCard('silph-details')]);
   const point=state.map.points[p.id];for(const other of state.places){const q=state.map.points[other.id];if(other.id!==p.id&&q.x===point.x&&q.y===point.y)links.push([other.name,()=>pick(other.id)]);}
   for(const [text,handler] of links){const b=el('button','',text);b.onclick=handler;cards.append(b);}
  }
  if(raf)cancelAnimationFrame(raf);draw();
 }
 map.onclick=e=>{
  if(!state||e.target.closest('button'))return;const r=map.getBoundingClientRect(),x=(e.clientX-r.left-map.clientLeft)/map.clientWidth*state.map.width,y=(e.clientY-r.top-map.clientTop)/map.clientHeight*state.map.height;
  const cell=state.map.roads.reduce((best,p)=>!best||Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best,null);
  if(cell&&Math.hypot(cell.x-x,cell.y-y)<=7)pick(cell.place,{x:cell.x,y:cell.y});else{localNotice='지도에 표시된 길이나 마을을 눌러 주세요.';draw();}
 };
 map.onkeydown=e=>{
  const delta={ArrowUp:[0,-8],ArrowRight:[8,0],ArrowDown:[0,8],ArrowLeft:[-8,0]}[e.key];if(!delta||!state?.active)return;e.preventDefault();
  const p=state.position,cell=state.map.roads.find(c=>c.x===p.x+delta[0]&&c.y===p.y+delta[1]);if(cell)pick(cell.place,{x:cell.x,y:cell.y});
 };
 document.addEventListener('panel-rendered',({detail:s})=>{
  state=s.kantoWorld;root.hidden=!state;if(!state)return;state={...state,active:state.active&&!s.challengeReadOnly};
  const key=JSON.stringify([state,s.challengeReadOnly,s.discovery,s.rescue?.visible,s.silph?.visible]);if(key===stateKey)return;stateKey=key;localNotice='';
  if(!choice||!state.places.some(p=>p.id===choice)||state.location!==root.dataset.location){choice=state.location;root.dataset.location=state.location;}
  if(shapeKey!==JSON.stringify(state.map)){
   shapeKey=JSON.stringify(state.map);map.replaceChildren();markers.clear();
   const art=el('img','world-art');art.src=state.map.image;art.alt='파이어레드·리프그린 관동 타운맵';art.width=state.map.width;art.height=state.map.height;art.draggable=false;map.append(art);
   for(const p of state.places){const point=state.map.points[p.id],b=el('button','world-marker'+(p.activity?.startsWith('gym:')?' landmark':''));b.style.left=point.x/state.map.width*100+'%';b.style.top=point.y/state.map.height*100+'%';b.setAttribute('aria-label',p.name);b.onclick=e=>{e.stopPropagation();pick(p.id);};map.append(b);markers.set(p.id,b);}
   actor=el('div','world-player');actor.setAttribute('role','img');actor.setAttribute('aria-label','주인공 레드');sprite=el('span');actor.append(sprite);map.append(actor);
   const close=el('button','world-close');close.setAttribute('aria-label','지도 접기');close.title='지도 접기';close.onclick=e=>{e.stopPropagation();root.open=false;summary.focus({preventScroll:true});};map.append(close);
  }
  renderChoice();
 });
})();
