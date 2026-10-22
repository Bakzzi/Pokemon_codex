'use strict';
(()=>{
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;},$=id=>document.getElementById(id);
 const shell=el('section','world-shell'),nav=el('nav','world-tabs'),status=el('div','ongoing world-status'),root=el('section','story-board world-card'),badges=el('section','world-badges'),badgeHost=el('div'),extraBadges=el('div');
 shell.id='world-shell';root.id='kanto-world';badges.id='world-badge-view';badgeHost.id='world-badge-host';badges.append(el('h2','','배지함'),badgeHost,extraBadges);badgeHost.append(document.querySelector('#kanto-gyms .badge-case'));
 const mapButton=el('button','','지도'),badgeButton=el('button','','배지함');nav.setAttribute('aria-label','지도와 배지함');nav.append(mapButton,badgeButton);
 const caption=el('p','muted'),zoneNav=el('nav','world-regions'),layout=el('div','world-layout'),map=el('div','world-map'),controls=el('div','world-controls'),selected=el('h3'),range=el('p','muted'),note=el('p','muted'),cards=el('div','world-links'),local=el('div','world-local');note.setAttribute('role','status');map.setAttribute('aria-label','길이나 마을을 눌러 레드 이동');map.tabIndex=0;controls.append(selected,range,note,local,cards);layout.append(map,controls);root.append(caption,zoneNav,layout);shell.append(nav,status,root,badges);$('challenge').insertBefore(shell,$('kanto-challenges'));
 const store=el('div','world-content-store');store.hidden=true;store.id='world-content-store';$('challenge').append(store);store.append($('kanto-challenges'),$('johto-challenges'));
 const daycare=el('details','story-board challenge-card'),daycareHeading=el('summary'),daycareNote=el('p','muted'),daycareOpen=el('button','','키우미집 이용하기');daycare.id='world-daycare';daycareHeading.append(el('h2','','키우미집'));daycare.append(daycareHeading,daycareNote,daycareOpen);store.append(daycare);
 daycareOpen.onclick=()=>{document.querySelector('[data-tab=daycare]').click();$('daycare-contact').scrollIntoView({block:'start'});$('parent-a').focus({preventScroll:true});};
 const dialog=el('dialog','world-place-dialog'),dialogHead=el('div','world-dialog-heading'),title=el('h2'),close=el('button','','지도로'),content=el('div','world-place-content');dialog.id='world-place-dialog';dialogHead.append(title,close);dialog.append(dialogHead,content);document.body.append(dialog);
 let state=null,world=null,zone=null,pane='map',choice=null,shapeKey='',placeKey='',actor,sprite,guard,raf=0,arrival=null,context=null,npcIndex=0,npcKey='',badgeSignature='',contextScroll=0;const markers=new Map(),homes=new WeakMap(),folds=new Map();let mounted=[],inlineMounted=[];
 function showPane(value){pane=value;root.hidden=value!=='map';badges.hidden=value!=='badges';mapButton.setAttribute('aria-selected',String(value==='map'));badgeButton.setAttribute('aria-selected',String(value==='badges'));}
 mapButton.onclick=()=>showPane('map');badgeButton.onclick=()=>showPane('badges');showPane('map');
 function restoreList(list){for(const n of list){const home=homes.get(n);if(home?.parent.isConnected)home.parent.insertBefore(n,home.next?.parentNode===home.parent?home.next:null);}}
 function restoreDialog(){contextScroll=content.scrollTop;restoreList(mounted);mounted=[];}
 function restoreInline(){for(const n of local.children)if(n.tagName==='DETAILS'&&n.dataset.foldKey)folds.set(n.dataset.foldKey,n.open);restoreList(inlineMounted);inlineMounted=[];}
 function restore(){restoreDialog();restoreInline();}
 function mount(n,target=content,inline=target===local){if(!n)return;if(!homes.has(n))homes.set(n,{parent:n.parentElement,next:n.nextSibling});(inline?inlineMounted:mounted).push(n);n.hidden=false;if(n.tagName==='DETAILS'&&!inline)n.open=true;target.append(n);}
 function fold(n,key){n.classList.add('world-event');n.dataset.foldKey=state.season.startedAt+':'+state.generation+':'+world.location+':'+key;n.open=folds.get(n.dataset.foldKey)||false;return n;}
 function prepareEntry(entry,id){if(!entry.johto)return;for(const b of entry.node.querySelectorAll('[data-challenge]')){const row=b.closest('.gym,.johto-event-entry,.rival-entry');if(row)row.hidden=world.locations[b.dataset.challenge]!==id;else b.hidden=world.locations[b.dataset.challenge]!==id;}for(const badge of entry.node.querySelectorAll('.badge-case'))badge.hidden=true;}
 function hideDialog(){restoreDialog();dialog.close();context=null;map.focus({preventScroll:true});}
 close.onclick=hideDialog;dialog.addEventListener('cancel',e=>{e.preventDefault();hideDialog();});
 const button=(text,fn)=>{const b=el('button','',text);b.onclick=fn;return b;};
 function activities(id){
  if(!state||state.challengeReadOnly)return [];const p=world.places.find(p=>p.id===id);if(!p)return [];
  const facilities=state.daycare?.access.locationId===id?[{key:'world-daycare',title:'키우미집',ready:state.daycare.access.atLocation,node:daycare}]:[];
  if(state.johto?.active){const result=[...facilities],nodes=new Set([...$('johto-challenges').children,...inlineMounted.filter(n=>homes.get(n)?.parent===$('johto-challenges'))]);for(const n of nodes){if(n.classList.contains('ongoing'))continue;const rows=[...n.querySelectorAll('[data-challenge]')].filter(b=>world.locations[b.dataset.challenge]===id);if(rows.length)result.push({key:n.id,title:n.querySelector('h2')?.textContent||p.name,node:n,johto:true});}return result;}
  const a=[...facilities],add=(key,title,ready=true)=>{const n=$(key);if(n&&!n.hidden)a.push({key,title,ready,node:n});};
  for(const n of document.querySelectorAll('#kanto-journey-cases > [data-world-location],.world-local > [data-world-location]'))if(n.dataset.worldLocation===id)a.push({key:n.id,title:n.querySelector('h2').textContent,ready:!!n.querySelector('button:not(:disabled)'),node:n});
  if(p.activity?.startsWith('gym:')){const i=Number(p.activity.slice(4));add('kanto-gyms','체육관',state.gymAccess[i]);if(a.length)a.at(-1).gym=i;}
  if(id==='celadon'&&state.discovery?.rocket)add('rocket-hideout','게임코너 지하',state.trainingDevice.steps.some(p=>p.available&&p.id!=='road-snorlax'));
  if(id==='tower'&&state.rescue?.visible)add('rescue-details','포켓몬타워',state.rescue.steps.some(p=>p.canChallenge));
  if(id==='saffron'&&state.silph?.visible)add('silph-details','실프주식회사',state.silph.steps.some(p=>p.canChallenge));
  if(['route-12','route-16'].includes(id)&&state.discovery?.road)add('snorlax-road','길을 막는 잠만보',state.trainingDevice.steps.some(p=>p.id==='road-snorlax'&&p.available));
  if(id==='safari'&&state.safari?.visible)add('safari-details','사파리존',state.safari.canStart);
  if(id==='mansion'&&state.mansion?.visible)add('mansion-details','폐저택 조사',state.mansion.canStart);
  if(id==='indigo'){add('pokemon-league','포켓몬리그',state.badges.length>=8);if(state.champion&&!state.johtoUnlocked)add('johto-choice','다음 지방으로');}
  const retry=(state.rivals||[]).find(r=>r.state==='retry'||r.canRetry&&r.state==='unseen'),places={'rival-brock':state.kantoStory&&!state.kantoStory.legacy?'route-22':'pewter','rival-surge':state.kantoStory&&!state.kantoStory.legacy?'ss-anne':'vermilion','rival-middle':'tower','rival-silph':'saffron','rival-league':state.kantoStory&&!state.kantoStory.legacy?'route-22':'indigo'};
  if(retry&&places[retry.id]===id)add('rival-details','그린과 다시 승부하기');return a;
 }
 function knownNotice(p){return p.notice??(p.open&&activities(p.id).some(a=>a.ready));}
 function currentMap(){return world.maps?.[zone]||world.map;}
 function draw(){
  raf=0;if(!world||!actor)return;const ownZone=!world.maps||zone===world.zone,walk=ownZone?world.walk:null,frame=walk?MapWalk.frame(walk,Date.now()):{...world.position,walking:false,direction:world.facing,sprite:{up:1,left:2,right:2}[world.facing]||0};
  actor.hidden=!ownZone;actor.classList.toggle('walking',frame.walking);actor.style.left=frame.x/currentMap().width*100+'%';actor.style.top=frame.y/currentMap().height*100+'%';actor.dataset.x=frame.x;actor.dataset.y=frame.y;map.dataset.moving=String(frame.walking);
  const c=world.checkpoint;guard.hidden=!ownZone||!c||!!frame.walking;if(c){const p=c.gatePosition||world.position;guard.style.left=p.x/currentMap().width*100+'%';guard.style.top=p.y/currentMap().height*100+'%';guard.setAttribute('aria-label',c.name);guard.dataset.kind=c.sprite.startsWith('pokemon:')?'pokemon':'npc';guard.style.backgroundImage=c.sprite.startsWith('pokemon:')?'url(assets/'+c.sprite.slice(8)+'.gif)':'';}
  caption.textContent=world.name+' · '+(!world.active?'지나온 길':frame.walking?'이동 중':world.stepProgress?'다음 칸까지 '+world.stepProgress.completed.toLocaleString('ko-KR')+' / 2,000걸음':world.roadProgress?'야생 만남 '+world.roadProgress.completed+' / '+world.roadProgress.required:'현재 위치');if(frame.walking)raf=requestAnimationFrame(draw);
 }
 function pick(id,position){
  const p=world?.places.find(p=>p.id===id);if(!p)return;choice=id;showPane('map');renderChoice();if(!world.active||world.manualTravel===false)return;
  const to=position||currentMap().points[id],here=world.position;
  if(p.current&&to.x===here.x&&to.y===here.y&&!world.checkpoint&&!world.journey)return;
  if(dialog.open)hideDialog();arrival=id;window.buddy.action('travel',position?{location:id,position}:id);
 }
 function renderNPC(){
  const c=world.checkpoint;if(!c)return;const key=c.at+':'+c.location;if(npcKey!==key){npcKey=key;npcIndex=0;}title.textContent=c.name;
  const image=el('img','world-npc');image.src=c.sprite.startsWith('pokemon:')?'assets/'+c.sprite.slice(8)+'.gif':'assets/trainers/battle/'+c.sprite+'.png';image.alt=c.name;content.append(image,el('p','world-npc-dialogue',c.pages[Math.min(npcIndex,c.pages.length-1)]));
  if(npcIndex<c.pages.length-1)content.append(button('다음',()=>{npcIndex++;content.replaceChildren();renderNPC();}));
  else if(c.canPass){const b=button('통과하기',()=>{const target=c.location;hideDialog();arrival=target;window.buddy.action('world-pass',target);});b.dataset.worldPass=c.location;content.append(b);}
  else {content.append(button('지도로',hideDialog));if(c.nearby&&$(c.nearby)&&!$(c.nearby).hidden)content.append(button('가까이 살펴보기',()=>{restoreDialog();content.replaceChildren();title.textContent='길을 막는 잠만보';mount($(c.nearby));}));}
 }
 function renderContext(){
  if(!context)return;restoreDialog();content.replaceChildren();if(context.npc){if(!world.checkpoint){hideDialog();return;}renderNPC();return;}
  const p=world.places.find(p=>p.id===context.id);title.textContent=p.name;const items=activities(p.id),entry=items.find(a=>a.key===context.key);
  if(entry){content.append(button('‹ '+p.name,()=>{context.key=null;renderContext();}));
   if(entry.gym!==undefined){[...$('gyms').children].forEach((n,i)=>n.hidden=i!==entry.gym);$('gym-details').open=true;}
   prepareEntry(entry,p.id);
   mount(entry.node);content.scrollTop=contextScroll;return;
  }
  if(items.length){for(const a of items)content.append(button(a.title,()=>{context.key=a.key;renderContext();}));}else content.append(el('p','muted','주변을 둘러보며 동료와 모험하고 있어요.'));
 }
 function localGym(p){
  if(!world.active||!p?.current||world.walk||world.maps&&zone!==world.zone)return null;
  if(state.johto?.active){const row=[...state.johto.gyms,...state.johto.kantoGyms].find(r=>world.locations[r.id]===p.id);if(!row)return null;return {row,card:document.querySelector('[data-challenge="'+row.id+'"]')?.closest('.gym')};}
  if(!p.activity?.startsWith('gym:'))return null;const i=Number(p.activity.slice(4));return {row:state.bosses[i],card:$('gyms').children[i]};
 }
 function renderChoice(){
  if(!world)return;const p=world.places.find(p=>p.id===choice)||world.places.find(p=>p.id===world.location);choice=p.id;selected.textContent=p.name;range.textContent=p.current?'현재 머무는 곳':p.visited?'다녀온 곳':'';
  note.textContent=state.challengeReadOnly?'이전 모험은 모험 기록에서 볼 수 있어요.':world.pending?'진행 중인 배틀이 끝나면 이동해요.':world.journey?world.journey.name+'로 모험 중 · '+(world.travelMode==='steps'?'한 칸마다 2,000걸음씩 이동해요.':'지나치는 도로의 풀숲에서 야생 포켓몬을 만날 수 있어요!'):world.walk?'레드가 길을 따라 이동하고 있어요.':'지나치는 도로의 풀숲에서 야생 포켓몬을 만날 수 있어요!';
  restoreInline();local.replaceChildren();const gym=localGym(p);note.hidden=!!gym&&!world.pending&&!world.journey;
  const entries=world.active&&p.current&&!world.walk?activities(p.id).filter(a=>a.gym===undefined&&!['johto-gym-details','johto-kanto-gyms'].includes(a.key)):[];
  if(gym?.card){range.textContent='';const heading=gym.card.querySelector('.gym-title h3');if(heading)heading.textContent='관장 '+gym.row.name;const title=p.name.replace(/(?:시티|마을|섬)$/,'')+'체육관',section=fold(ChallengeUI.section('world-local-gym',el('h2','',title)),'gym:'+gym.row.id);local.append(section);mount(gym.card,section,true);}
  for(const entry of entries){prepareEntry(entry,p.id);if(entry.node.tagName==='DETAILS'){fold(entry.node,entry.key);mount(entry.node,local);}else{const section=fold(ChallengeUI.section('world-local-'+entry.key,el('h2','',entry.title)),entry.key);local.append(section);mount(entry.node,section,true);}}
  cards.replaceChildren();if(world.active&&p.current&&!world.walk&&world.checkpoint)cards.append(button('길목 살펴보기',()=>{context={npc:true};renderContext();if(!dialog.open)dialog.showModal();}));
  for(const [id,m]of markers){const q=world.places.find(p=>p.id===id);m.disabled=!world.active||world.manualTravel===false;m.classList.toggle('chosen',choice===id);m.classList.toggle('current',q.current);m.classList.toggle('locked',!q.open);m.classList.toggle('has-event',world.active&&knownNotice(q));m.textContent=world.active&&knownNotice(q)?'!':'';m.title=q.name+(world.active&&knownNotice(q)?' · 새로운 소식':'');m.setAttribute('aria-pressed',String(choice===id));}
  if(raf)cancelAnimationFrame(raf);draw();
 }
 map.onclick=e=>{if(!world||e.target.closest('button'))return;const r=map.getBoundingClientRect(),m=currentMap(),x=(e.clientX-r.left-map.clientLeft)/map.clientWidth*m.width,y=(e.clientY-r.top-map.clientTop)/map.clientHeight*m.height,cell=m.roads.reduce((a,b)=>!a||Math.hypot(b.x-x,b.y-y)<Math.hypot(a.x-x,a.y-y)?b:a,null);if(cell&&Math.hypot(cell.x-x,cell.y-y)<=7)pick(cell.place,{x:cell.x,y:cell.y});};
 map.onkeydown=e=>{const d={ArrowUp:[0,-8],ArrowRight:[8,0],ArrowDown:[0,8],ArrowLeft:[-8,0]}[e.key];if(!d||!world?.active||world.manualTravel===false||world.maps&&zone!==world.zone)return;e.preventDefault();const p=world.position,c=currentMap().roads.find(c=>c.x===p.x+d[0]&&c.y===p.y+d[1]);if(c)pick(c.place,{x:c.x,y:c.y});};
 function renderBadges(){
  badgeHost.hidden=!!state.johto?.active;const signature=JSON.stringify([state.johto?.active,state.johto?.badges,state.johto?.kantoBadges]);if(signature===badgeSignature)return;badgeSignature=signature;extraBadges.replaceChildren();if(!state.johto?.active)return;
  for(const id of ['johto-badge-slots','johto-kanto-badge-slots']){const holder=$(id)?.closest('.badge-case');if(holder){const clone=holder.cloneNode(true);for(const n of clone.querySelectorAll('[id]'))n.removeAttribute('id');for(const n of clone.querySelectorAll('canvas[data-badge-sprite]'))n.replaceWith(ChallengeUI.badgeImage(n.dataset.badgeSprite,n.className,n.getAttribute('aria-label')));clone.hidden=false;extraBadges.append(clone);}}
 }
 function render(s){
  state=s;world=s.johto?.active?s.johtoWorld:s.kantoWorld;if(!world)return;world={...world,active:world.active&&!s.challengeReadOnly};
  daycareNote.textContent=s.daycare.access.reason;daycareOpen.disabled=!s.daycare.access.atLocation;
  if(world.active&&world.journey)arrival=world.journey.destination;
  const identity=(s.johto?.active?'2:':'1:')+world.location+':'+s.season.startedAt;if(identity!==placeKey){placeKey=identity;if(!arrival)choice=world.location;}
  if(!world.maps)zone=null;else if(!zone||!(zone in world.maps)||arrival&&world.location===arrival)zone=world.zone;
  const geometry=currentMap();if(!geometry)return;zoneNav.replaceChildren();zoneNav.hidden=!world.maps;if(world.maps)for(const [id,name]of [['johto','성도'],['kanto','관동']]){const b=button(name,()=>{zone=id;choice=world.places.find(p=>p.zone===zone)?.id;shapeKey='';render(state);});b.disabled=!world.places.some(p=>p.zone===id&&p.open);b.setAttribute('aria-selected',String(zone===id));zoneNav.append(b);}
  const shape=(s.johto?.active?'johto:':'kanto:')+geometry.image;
  if(shapeKey!==shape){shapeKey=shape;map.replaceChildren();markers.clear();map.style.aspectRatio=geometry.width+'/'+geometry.height;map.style.setProperty('--map-width',geometry.width);const art=el('img','world-art');art.src=geometry.image;art.alt=world.maps&&zone==='johto'?'크리스탈 성도 타운맵':'파이어레드·리프그린 관동 타운맵';art.draggable=false;map.append(art);
   for(const p of world.places.filter(p=>!!geometry.points[p.id])){const point=geometry.points[p.id],b=el('button','world-marker');b.style.left=point.x/geometry.width*100+'%';b.style.top=point.y/geometry.height*100+'%';b.setAttribute('aria-label',p.name);b.onclick=e=>{e.stopPropagation();pick(p.id);};map.append(b);markers.set(p.id,b);}
   actor=el('div','world-player');actor.setAttribute('role','img');actor.setAttribute('aria-label','주인공 레드');sprite=el('span');actor.append(sprite);map.append(actor);guard=el('button','world-guard');guard.onclick=e=>{e.stopPropagation();context={npc:true};renderContext();if(!dialog.open)dialog.showModal();};map.append(guard);
  }
  if(!choice||!geometry.points[choice])choice=geometry.points[world.location]?world.location:world.places.find(p=>geometry.points[p.id])?.id;
  renderBadges();renderChoice();status.replaceChildren();status.hidden=!s.pendingChallenge&&s.battle?.kind!=='trainer';if(!status.hidden)status.append(el('span','',s.pendingChallenge?s.pendingChallenge.name+' · 도전 예약':s.battle.boss+'와 배틀 중'),button(s.pendingChallenge?'예약 취소':'배틀 보기',()=>window.buddy.action(s.pendingChallenge?'challenge-cancel':'story-open')));
  if(context&&dialog.open){if(!world.active||context.id&&context.id!==world.location||context.npc&&!world.checkpoint)hideDialog();else renderContext();}
  if(arrival&&!world.journey&&!world.walk&&!world.pending){if(world.checkpoint){choice=world.location;renderChoice();context={npc:true};renderContext();if(!dialog.open)dialog.showModal();arrival=null;}else if(world.location===arrival){arrival=null;choice=world.location;renderChoice();}}
 }
 document.addEventListener('panel-rendered',({detail:s})=>render(s));
 globalThis.WorldMap={beforeRender:restore,pick,badge(id){const slot=document.querySelector('[data-badge="'+id+'"]');if(slot){restoreDialog();title.textContent='배지함';content.replaceChildren(el('p','',slot.getAttribute('aria-label')));context=null;if(!dialog.open)dialog.showModal();}},show(){showPane('map');},close:hideDialog};
})();
