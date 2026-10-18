'use strict';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
let journalTab='summary';
const travelSelection=new Set();
const mobilePanel=document.body.classList.contains('panel-frame');
let state=null,selected=null,memberUid=null,dexListScroll=0,nurserySignature='',tab=new URLSearchParams(location.search).get('tab')||'collection',dexSignature='',detailSignature='',bossSignature='',journalSignature='',storySignature='';
const img=(id,cls='')=>{const e=node('img',cls);e.src='assets/'+id+'.gif';e.alt='';return e;};
const levelText=p=>'Lv.'+p.level+' '+(p.level>=100?'MAX':p.expPercent+'%');
const experienceText=p=>p.level>=100?'최고 레벨에 도달했어요.':'다음 레벨까지 '+(p.expRequired-p.expCurrent).toLocaleString('ko-KR')+' XP · '+p.expCurrent.toLocaleString('ko-KR')+' / '+p.expRequired.toLocaleString('ko-KR')+' XP';
const itemSprites={'poke-flute':'poke-flute','training-device':'exp-share',4:'poke-ball',25:'hyper-potion',27:'full-heal',28:'revive',38:'ether',80:'sun-stone',81:'moon-stone',82:'fire-stone',83:'thunder-stone',84:'water-stone',85:'leaf-stone',110:'oval-stone',198:'kings-rock',210:'metal-coat',212:'dragon-scale',229:'up-grade',885:'ice-stone'};
function inventoryCard(item){
  const card=node('div','inventory-item'),icon=node('img'),body=node('div','inventory-item-body');icon.src='assets/items/'+itemSprites[item.id]+'.png';icon.alt='';
  card.dataset.item=item.id;card.setAttribute('role','listitem');card.title=[item.name+' × '+item.count,item.description,item.automatic&&'도전 배틀에서 필요할 때 자동 사용 · 사용한 턴에는 공격하지 않아요.'].filter(Boolean).join(' · ');body.append(node('b','',item.name),node('small','', '× '+item.count));if(item.description)body.append(node('small','',item.description));card.append(icon,body);return card;
}
// Original image width, then the square viewport's x/y/size in source pixels.
const trainerFaces={brock:[196,52,5,104],misty:[228,61,7,112],surge:[156,22,1,110],erika:[198,22,3,114],koga:[217,113,5,103],sabrina:[216,17,13,112],blaine:[273,24,18,112],giovanni:[179,25,5,112]};
const gymLocations={brock:'회색시티',misty:'블루시티',surge:'갈색시티',erika:'무지개시티',koga:'연분홍시티',sabrina:'노랑시티',blaine:'홍련섬',giovanni:'상록시티'};
const storyFaces={erika:[['erika.png',trainerFaces.erika]],'rocket-grunt':[['rocket-grunts.png',[433,238,0,112]]],'rocket-duo':[['james.png',[150,16,4,112]],['jessie.png',[197,32,10,112]]],'rocket-giovanni':[['giovanni.png',trainerFaces.giovanni]]};
const completedDisclosures=new Map();
function syncDisclosure(id,completed){
  if($(id).classList.contains('challenge-card'))return;
  if(completedDisclosures.get(id)===completed)return;
  completedDisclosures.set(id,completed);$(id).open=!completed;
}
function focusGym(index){
  $('gym-details').open=true;
  const card=$('gyms').children[index];if(!card)return;
  card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  const button=card.querySelector('[data-challenge]');
  if(button&&!button.disabled)button.focus({preventScroll:true});else{card.tabIndex=-1;card.focus({preventScroll:true});}
}
function storyArtwork(requirement){
  const hidden=requirement.revealed===false,art=node('span','rocket-art'+(hidden?' unseen':''));
  art.setAttribute('role','img');art.setAttribute('aria-label',hidden?'아직 만나지 않은 상대':requirement.id==='erika'?'민화의 얼굴과 무지개뱃지':requirement.name.replace('에게 승리','')+' 얼굴 초상화');
  for(const [file,[width,x,y,size]] of storyFaces[requirement.id]||[]){
    const frame=node('span','rocket-portrait'),portrait=node('img','rocket-trainer');portrait.src='assets/trainers/'+file;portrait.alt='';portrait.draggable=false;portrait.style.width=width/size*100+'%';portrait.style.left=-x/size*100+'%';portrait.style.top=-y/size*100+'%';frame.append(portrait);art.append(frame);
  }
  if(requirement.id==='erika')art.append(badgeImage(state.bosses[3],'rocket-badge'+(requirement.done?' earned':'')));
  return art;
}
function dexList(){selected=null;memberUid=null;detailSignature='';render();document.querySelector('.dex-layout').scrollTop=dexListScroll;}
function switchTab(value){
  tab=['collection','challenge','journal','daycare','connections'].includes(value)?value:'collection';
  if(tab==='challenge')for(const card of document.querySelectorAll('.challenge-card'))card.open=false;
  if(tab==='collection'&&!mobilePanel){selected=null;memberUid=null;detailSignature='';}
  if(mobilePanel){
    selected=null;memberUid=null;detailSignature='';dexListScroll=0;window.buddy.dexView(false);
    if(tab==='challenge')for(const card of document.querySelectorAll('.mobile-challenge-card'))card.open=false;
  }
  for(const e of document.querySelectorAll('.page'))e.hidden=e.id!==tab;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));render();if(mobilePanel)$(tab).scrollTop=0;
}
if(mobilePanel)window.buddy.onDexBack(()=>{if(tab==='collection')dexList();});
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>switchTab(b.dataset.tab);
$('search').oninput=()=>{dexSignature='';render();};$('filter').onchange=()=>{dexSignature='';render();};
$('league-start').onclick=()=>window.buddy.action('challenge',8);
$('johto-stay').onclick=()=>window.buddy.action('johto-stay');
$('johto-unlock').onclick=()=>window.buddy.action('johto-unlock',{speciesIds:[...travelSelection]});
$('device-register').onclick=()=>window.buddy.action('device-learner',Number($('device-learner').value));
$('device-withdraw').onclick=()=>window.buddy.action('device-learner',null);
$('device-learner').onchange=()=>renderDevice();
if($('reset-game'))$('reset-game').onclick=()=>window.buddy.action('reset-game');
$('story-open').onclick=()=>window.buddy.action('story-open');
window.buddy.onTab(switchTab);
function renderDex(){
  if(mobilePanel){$('collection').classList.toggle('detail-open',selected!==null);window.buddy.dexView(selected!==null);}
  const signature=JSON.stringify([state.collection.map(p=>[p.id,p.seen,p.caught,p.owned,p.level,p.expPercent,p.count,p.captureReserved,p.acquisition.summary]),$('filter').value,$('search').value]);
  if(signature!==dexSignature){
    dexSignature=signature;const filter=$('filter').value,query=$('search').value.trim().toLowerCase();
    const cards=state.collection.filter(p=>(filter==='all'||(filter==='uncaught'?!p.caught:p[filter]))&&(!query||String(p.id)===query||p.name.toLowerCase().includes(query))).map(p=>{
      const b=node('button','dex-card'+(p.seen?'':' unseen')+(p.caught?' caught':'')+(p.id===selected?' selected':''));b.dataset.id=p.id;
      b.setAttribute('aria-label','No.'+p.id+' '+p.name+(p.caught?' · 포획 완료':''));b.append(img(p.id));
      const label=node('span','label');if(p.caught){const ball=node('i','ball');ball.title='포획 완료';label.append(ball);}label.append(document.createTextNode('No.'+p.id+' '+p.name));b.append(label,node('small','',p.owned?levelText(p)+(p.count>1?' · '+p.count+'마리':''):p.caught?'도감 등록 완료':p.seen?'발견':'미발견'));
      if(p.owned)b.querySelector('small').title=levelText(p)+(p.count>1?' · 가장 높은 레벨·경험치의 개체':'');
      if(!p.owned&&!p.caught){const hint=b.querySelector('small');hint.textContent=p.acquisition.summary;hint.title=p.acquisition.summary;}
      b.onclick=()=>{if(mobilePanel)dexListScroll=document.querySelector('.dex-layout').scrollTop;selected=p.id;detailSignature='';render();if(mobilePanel){document.querySelector('.dex-layout').scrollTop=0;const heading=$('detail').querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}};return b;
    });$('dex-grid').replaceChildren(...cards);
  }
  for(const card of $('dex-grid').children)card.classList.toggle('selected',Number(card.dataset.id)===selected);
  const p=state.collection.find(p=>p.id===selected);if(!p){$('detail').replaceChildren(node('div','placeholder','포켓몬을 눌러 모험의 동료를 골라 봐.'));return;}
  const previousForms=[...new Set(p.acquisition.routes.filter(r=>r.kind==='evolution').map(r=>r.from))].map(id=>state.collection.find(p=>p.id===id)).filter(Boolean);
  const members=state.roster.filter(m=>m.id===p.id);
  if(!members.some(m=>m.uid===memberUid))memberUid=members[0]?.uid;
  const member=members.find(m=>m.uid===memberUid);
  const detailKey=JSON.stringify([p,previousForms.map(p=>[p.id,p.seen,p.name]),members,memberUid,state.slots,state.battle?.kind,state.hero.uid,state.pendingActions,state.trainingDevice]);
  if(detailKey===detailSignature)return;detailSignature=detailKey;
  const root=$('detail');root.replaceChildren(img(p.id,'portrait'+(p.seen?'':' unseen')),node('div','number','No.'+p.id+' · '+(p.caught?'포획 완료':p.seen?'발견':'미발견')),node('h2','',p.name),node('div','types',p.types.join(' / ')),node('p','description',p.description));
  if(previousForms.length){
    const nav=node('nav','previous-evolutions');nav.setAttribute('aria-label','이전 진화체 선택');
    for(const previous of previousForms){
      const button=node('button','previous-evolution');button.dataset.previousPokemon=previous.id;button.title='이전 진화체 · No.'+previous.id+' '+previous.name;button.setAttribute('aria-label',button.title);
      button.append(node('span','','←'),img(previous.id,previous.seen?'':'unseen'),node('span','','No.'+previous.id+' '+previous.name));
      button.onclick=()=>{selected=previous.id;memberUid=null;detailSignature='';render();root.scrollTop=0;const heading=root.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});};nav.append(button);
    }
    root.prepend(nav);
  }
  const hints=node('section','acquisition-hints');hints.setAttribute('aria-label','획득 힌트');hints.append(node('h3','','획득 힌트'));
  const labels={wild:'야생',starter:'스타팅',event:'이벤트',evolution:'진화',hatch:'부화'};
  p.acquisition.routes.forEach((r,i)=>{const row=node('p','');row.append(node('b','',(i?'또는 ':'')+(r.kind==='evolution'&&r.special?'특수진화':labels[r.kind])),document.createTextNode(' · '+r.text));hints.append(row);if(r.note)hints.append(node(r.kind==='wild'?'p':'small','',r.note));});
  if(p.acquisition.note)hints.append(node('small','',p.acquisition.note));root.append(hints);
  if(p.caught&&p.canReserveCapture){
    const box=node('section','capture-reservation'),reserve=node('button','',p.captureReserved?'포획 예약 취소':'만나면 포획하기');
    reserve.dataset.captureReserve=p.id;reserve.setAttribute('aria-pressed',String(!!p.captureReserved));reserve.onclick=()=>window.buddy.action(p.captureReserved?'capture-cancel':'capture-reserve',p.id);
    box.append(reserve,node('p','muted','만나면 자동으로 포획을 시도해요.'));root.append(box);
  }
  if(!p.owned){
    if(p.caught)root.append(node('p','muted','도감 기록은 남아 있어요. '+(p.seasonCaught?'이번 시즌에 등록한 종이에요.':p.acquisition.wildAllowed?'이번 시즌에는 다시 포획할 수 있어요.':'위 획득 경로로 동료를 다시 얻을 수 있어요.')));
    return;
  }
  if(members.length>1){
    const select=node('select','member-select');select.setAttribute('aria-label','보유 개체 선택');
    for(const [i,m] of members.entries()){const o=node('option','',(i+1)+'번째 동료 · '+levelText(m)+gender(m.gender)+(m.origin==='hatch'?' · 부화':''));o.value=m.uid;select.append(o);}select.value=memberUid;
    select.onchange=()=>{memberUid=Number(select.value);detailSignature='';render();};root.append(select);
  }
  root.append(node('p','muted',levelText(member)+gender(member.gender)));
  const queuedSelect=state.pendingActions.some(a=>a.kind==='select'&&a.uid===member.uid);
  const deploy=node('button','deploy',queuedSelect?'출전 예약됨':state.hero.uid===member.uid?'현재 출전 중':member.boarded?'데려온 뒤 출전 예약':'이 포켓몬 출전');deploy.disabled=queuedSelect||state.hero.uid===member.uid;deploy.onclick=()=>window.buddy.action('select',member.uid);root.append(deploy);
  if(state.trainingDevice.obtained){
    const current=state.trainingDevice.learnerUid===member.uid,queued=state.pendingActions.some(a=>a.kind==='device-learner'&&a.uid===member.uid),b=node('button','device-register',current?'학습장치 등록 중 · 경험치 10%':queued?'학습장치 등록 예약됨':'학습장치에 등록 · 경험치 10%');b.disabled=current||queued;b.onclick=()=>window.buddy.action('device-learner',member.uid);root.append(b);
  }
  root.append(node('h3','','빠른 선택 칸에 배치'));
  const assign=node('div','assign');state.slots.forEach((s,i)=>{const queued=state.pendingActions.some(a=>a.kind==='slot'&&a.slot===i&&a.uid===member.uid),b=node('button');b.dataset.assign=i;b.title=(i+1)+'번 칸 · '+s.name+(queued?' · 배치 예약됨':' · 배틀 중에는 종료 후 배치');b.disabled=queued||s.uid===member.uid;b.append(s.empty?node('span','empty-slot','—'):img(s.id),document.createTextNode((i+1)+'번'+(queued?' · 예약':'')));b.onclick=()=>window.buddy.action('slot',{slot:i,id:member.uid});assign.append(b);});root.append(assign);
  const assigned=state.slots.findIndex(s=>s.uid===member.uid);
  if(assigned>=0){const queued=state.pendingActions.some(a=>a.kind==='slot'&&a.slot===assigned&&a.uid===null),remove=node('button','',queued?'칸 비우기 예약됨':'선택 칸에서 빼기');remove.dataset.removeSlot=assigned;remove.disabled=queued||!state.slots.some((s,i)=>i!==assigned&&!s.empty&&!s.boarded);remove.title=remove.disabled&&!queued?'모험할 동료 한 마리는 남겨 주세요.':'배틀 중에는 종료 후 칸을 비워요.';remove.onclick=()=>window.buddy.action('slot',{slot:assigned,id:null});root.append(remove);}
  root.append(node('p','muted','특성 · '+member.ability));
  root.append(node('h3','','기술 '+member.moves.filter(m=>m.active).length+' / '+member.moves.length+'개 활성 · 자동 사용'));
  const list=node('ul','move-list');
  for(const m of member.moves||[]){
    const row=node('li',m.active?'':'locked');row.dataset.move=m.id;
    row.append(node('b','move-name',m.name),node('span','move-type',m.typeName),node('span','move-stats','위력 '+(m.power===null?'—':m.power+(m.stab?'*':''))+' · PP '+m.pp),node('small','',m.active?'Lv.'+m.level:'Lv.'+m.level+' 해금'));list.append(row);
  }
  root.append(list);if(member.moves.some(m=>m.stab))root.append(node('p','muted move-stab-note','* 자속보정'));
  for(const e of member.evolutions){
    if(e.automatic){
      const box=node('div','evolution');box.append(node('h3','',e.name+' 자동진화'),node('p','',e.conditions),node('p','',e.ready?'배틀과 결과 연출이 끝나면 자동으로 진화해요.':member.level>=e.level&&e.waitingForLevelUp?'다음 레벨업 시 자동으로 진화해요.':'조건 레벨 이상에서 레벨업하면 자동으로 진화해요.'));root.append(box);continue;
    }
    const queued=state.pendingActions.some(a=>a.kind==='evolve'&&a.uid===member.uid&&a.to===e.to);
    const box=node('div','evolution'),b=node('button','',(e.trigger===2?'학습장치 · ':'')+e.name+(queued?' 진화 예약됨':e.ready?'로 진화':' 진화 예약'));
    b.dataset.evolve=e.to;b.disabled=queued;b.onclick=()=>window.buddy.action('evolve',{id:member.uid,to:e.to});box.append(b,node('p','',e.conditions||'진화 조건 충족'),node('p','',queued?'예약 목록에서 취소할 수 있어요.':!e.ready?'조건을 충족하고 배틀이 끝나면 자동으로 진화해요.':state.battle?'현재 배틀이 끝나면 진화해요.':'진행 중인 연출이 있으면 끝난 뒤 진화해요.'));
    if(e.trigger===2)box.append(node('p','','이 모습에서 학습장치 경험치로 한 레벨 오르면 배틀·결과 연출 종료 후 자동 진화해요. 최소 레벨 조건은 없고, 필요한 진화 도구는 별도로 준비해요.'));
    root.append(box);
  }
}
function teamMembers(team,showNames=false){
  const row=node('div','team');
  for(const p of team){const mon=node('span');mon.title='No.'+p.id+' · Lv.'+p.level;mon.append(img(p.id));if(showNames)mon.append(node('small','',p.name||'No.'+p.id));mon.append(document.createTextNode('Lv.'+p.level));row.append(mon);}
  return row;
}
function trainerTeam(boss,showNames=false){return boss.revealed===false?node('p','muted','포켓몬 편성 미공개'):teamMembers(boss.team,showNames);}
let shownBadges=null;
function badgeImage(boss,className=''){
  const image=node('img',className);image.src='assets/badges/'+boss.id+'.png';image.alt='';image.draggable=false;return image;
}
function renderBadgeCase(){
  const earned=new Set(state.badges),signature=JSON.stringify([state.badges,state.bosses.slice(0,8).map(b=>b.revealed)]);
  if($('badge-slots').dataset.signature===signature)return;
  $('badge-slots').dataset.signature=signature;
  $('badge-slots').replaceChildren(...state.bosses.slice(0,8).map((boss,i)=>{
    const done=earned.has(boss.id),fresh=done&&shownBadges&&!shownBadges.has(boss.id);
    const slot=node('button','badge-slot'+(done?' earned':' empty')+(fresh?' just-earned':''));slot.dataset.badge=boss.id;
    slot.setAttribute('aria-label',boss.badge+' · '+boss.name+' · '+(done?'획득 완료':'미획득'));slot.title=slot.getAttribute('aria-label');
    const recess=node('span','badge-recess');recess.append(badgeImage(boss,'badge-edge'),badgeImage(boss,'badge-shadow'));
    if(done)recess.append(badgeImage(boss,'badge-art'),node('i','badge-glint'));
    const label=node('span','badge-label');label.append(node('b','',boss.badge),node('small','',done?'획득 완료':boss.name+' · 미획득'));
    slot.append(recess,label);slot.onclick=()=>focusGym(i);return slot;
  }));
  shownBadges=earned;
  $('badge-case-note').textContent=earned.size===8?'관동의 여덟 증표 · 포켓몬 리그로':earned.size+'개의 증표 · 다음 도전을 기다리는 자리';
}
function renderBosses(){
  renderTravel();
  syncDisclosure('gym-details',state.bosses.slice(0,8).every(b=>state.badges.includes(b.id)));
  renderStory();
  renderSpecialEncounters();
  const busy=state.battle?.kind==='trainer',queued=state.pendingChallenge,signature=JSON.stringify([state.badges,state.bosses.map(b=>b.revealed),state.gymAccess,state.trainingDevice.routeOpen,state.battle,queued,state.champion,state.leagueBest,state.johtoUnlocked,state.johtoDeferred,state.johtoUnlockPreview,state.kantoCaughtCount,state.encounterBonus]);if(signature===bossSignature)return;bossSignature=signature;
  $('badges').textContent='뱃지 '+state.badges.length+' / 8';
  renderBadgeCase();
  $('gyms').replaceChildren(...state.bosses.slice(0,8).map((boss,i)=>{
    const done=state.badges.includes(boss.id),card=node('article','gym'+(done?' done':'')),title=node('div','gym-title'),badge=node('span','badge');badge.append(badgeImage(boss,'gym-badge'),document.createTextNode(boss.badge));title.append(node('h3','',(i+1)+'. '+gymLocations[boss.id]+' 체육관 관장 '+boss.name),badge);
    const body=node('div','gym-body'),info=node('div','gym-info'),face=node('div','gym-portrait');face.dataset.trainer=boss.id;
    if(boss.revealed===false){face.classList.add('unknown');face.textContent='?';face.setAttribute('aria-label','아직 만나지 않은 관장');}
    else{const portrait=node('img','gym-trainer'),[width,x,y,size]=trainerFaces[boss.id];portrait.src='assets/trainers/'+boss.id+'.png';portrait.alt=boss.name+' · 원작 얼굴 초상화';portrait.draggable=false;portrait.style.width=width/size*100+'%';portrait.style.left=-x/size*100+'%';portrait.style.top=-y/size*100+'%';face.append(portrait);}
    info.append(title,trainerTeam(boss));body.append(info,face);card.append(body);
    const rocketLocked=i===3&&!state.trainingDevice.rocketWonAt,roadLocked=i===4&&!state.trainingDevice.routeOpen;
    if(i===3&&!done)card.append(node('p','muted',rocketLocked?'민화는 무지개시티에 숨어든 로켓단 때문에 골머리를 앓고 있어요. 아지트의 로켓단을 모두 물리친 뒤 도전해 주세요.':'로켓단 문제가 해결됐어요. 민화가 체육관에서 도전을 기다리고 있어요.'));
    const b=node('button','',done?'뱃지 획득 완료':queued?.index===i?'도전 예약됨':rocketLocked?'로켓단 아지트 격파 시 해금':roadLocked?'길을 막는 잠만보 해결 시 해금':i>state.badges.length?'앞선 체육관 뱃지가 필요해요':'도전하기');b.dataset.challenge=i;b.disabled=done||busy||!!queued||!state.gymAccess[i];b.onclick=()=>window.buddy.action('challenge',i);card.append(b);return card;
  }));
  $('ongoing').hidden=!busy&&!queued;
  if(queued){$('ongoing').replaceChildren(node('span','',queued.name+' 도전 예약 · '+(state.battle?'진행 중인 동작이 끝나면 시작해요.':'마지막 연출이 끝나면 시작해요.')));const b=node('button','','예약 취소');b.dataset.cancelChallenge='';b.onclick=()=>window.buddy.action('challenge-cancel');$('ongoing').append(b);}
  else if(busy){$('ongoing').replaceChildren(node('span','',state.battle.boss+' · '+(state.battle.foeIndex+1)+' / '+state.battle.teamSize+'마리와 배틀 중'));const b=node('button','','도전 그만두기');b.onclick=()=>window.buddy.action('abandon');$('ongoing').append(b);}
  $('league-start').disabled=state.badges.length<8||busy||!!queued;$('league-start').textContent=queued?.index===8?'리그 도전 예약됨':state.champion?'리그 재도전':'리그 도전';
  $('league-team').replaceChildren(...state.bosses.slice(8).map((b,i)=>{const e=node('article','league-member');e.append(node('h3','',(i===4?'챔피언 ':'')+b.name),trainerTeam(b));return e;}));
  $('league-progress').textContent=state.champion?(state.johtoUnlocked?'관동 챔피언 · 성도 지방 해금 완료':'관동 챔피언 · 151종을 모으며 머물거나 원할 때 2세대를 해금하세요.'):'리그 최고 기록 '+state.leagueBest+' / 5 · 챔피언이 되면 출현 보너스와 2세대 해금 선택권을 얻어요.';
  $('johto-choice').hidden=!state.champion;
  if(state.champion){
    const unlocked=state.johtoUnlocked,stay=state.johtoDeferred;
    $('johto-title').textContent=unlocked?'성도 지방이 열렸어요':stay?'관동에서 도감을 완성하는 중':'다음 모험을 선택하세요';
    $('johto-note').textContent='관동 도감 '+state.kantoCaughtCount+' / 151 · '+(unlocked?'관동 151종과 성도 100종을 함께 만날 수 있어요.':stay?'151종 수집을 계속해요. 원할 때 언제든 2세대를 해금할 수 있어요.':'151종을 모을 때까지 관동에 머물러도 좋아요. 2세대를 해금하면 성도 100종이 추가돼요.');
    $('johto-level-notice').hidden=unlocked;
    $('johto-level-notice').textContent='한 번이라도 도감에 등록된 10마리를 선택해 각각 Lv.15 · 경험치 0%로 성도에서 시작해요. Lv.15에서 가능한 진화 단계만 선택할 수 있어요. 기술은 Lv.15에 맞춰 활성화돼요. 배틀 종료 후 성도로 이동합니다.';
    $('champion-bonus').textContent=state.encounterBonus?'챔피언·레벨 보너스는 미포획 포켓몬에만 적용돼요.\n배치한 동료 모두 Lv.71·81·91 이상일수록 효과가 더 강해져요.':'';
    $('johto-stay').hidden=unlocked||stay;$('johto-unlock').hidden=unlocked;
  }
}
function renderTravel(){
  const pending=state.pendingActions.find(a=>a.kind==='johto-unlock'),candidates=(state.johtoUnlockPreview?.candidates||[]).filter(p=>p.eligible),eligible=new Set(candidates.map(p=>p.id));
  if(pending){travelSelection.clear();for(const id of pending.speciesIds||[])travelSelection.add(id);}
  else for(const id of travelSelection)if(!eligible.has(id))travelSelection.delete(id);
  $('travel-picker').hidden=!state.champion||state.johtoUnlocked;
  $('travel-count').textContent='함께 갈 동료 · '+travelSelection.size+' / 10'+(pending?' · 이동 예약됨':'');
  $('johto-unlock').disabled=!!pending||travelSelection.size===0;
  $('johto-unlock').textContent=pending?'성도 이동 예약됨':'선택한 '+travelSelection.size+'마리와 성도로 떠나기';
  const signature=JSON.stringify([candidates,pending?.id,state.johtoUnlocked]),root=$('travel-candidates');
  if(root.dataset.signature===signature){for(const check of root.querySelectorAll('input')){const id=Number(check.dataset.travelSpecies);check.checked=travelSelection.has(id);check.disabled=!!pending||!eligible.has(id)||travelSelection.size>=10&&!check.checked;}return;}
  root.dataset.signature=signature;
  root.replaceChildren(...candidates.map(p=>{
    const label=node('label','travel-candidate'+(p.eligible?'':' unavailable')),check=node('input'),body=node('span');check.type='checkbox';check.dataset.travelSpecies=p.id;check.checked=travelSelection.has(p.id);check.disabled=!!pending||!p.eligible||travelSelection.size>=10&&!check.checked;
    check.onchange=()=>{if(check.checked)travelSelection.add(p.id);else travelSelection.delete(p.id);renderTravel();};body.append(node('b','', 'No.'+p.id+' '+p.name+' · Lv.15'),node('small','',p.reason));label.append(check,img(p.id),body);return label;
  }));
}
function renderSpecialEncounters(){
  const bonus=state.specialEncounters,root=$('special-encounters');root.hidden=!bonus;if(!bonus)return;
  const pct=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:5});
  $('special-encounters-note').textContent='현재 출전 동료 Lv.'+bonus.activeLevel+' · 모두 Lv.50부터 만나요. 추가 확률은 기본 배율 적용 뒤에 더해져요.';
  $('special-encounters-list').replaceChildren(...bonus.entries.map(p=>{const row=node('tr');row.dataset.encounter=p.id;row.append(node('td','',p.name),node('td','','+'+pct(p.extra)+'%p'),node('td','',p.eligible?pct(p.chance)+'%':'출전 Lv.50부터'));return row;}));
}
function renderStory(){
  if(!state)return;const d=state.trainingDevice,busy=state.battle?.kind==='trainer',queued=state.pendingChallenge;
  syncDisclosure('rocket-hideout',d.rocketCompleted===3);
  const road=d.steps.find(s=>s.id==='road-snorlax');syncDisclosure('snorlax-road',!!road.done);
  const signature=JSON.stringify([d.requirements,d.steps,d.rocketUnlocked,busy,state.battle?.storyId,queued?.index,d.fluteObtained,d.snorlaxCaught]);if(signature===storySignature)return;storySignature=signature;
  $('rocket-intro').textContent=d.rocketCompleted===3?'로켓단을 모두 물리쳐 무지개시티에 평화가 돌아왔어요. 민화도 한시름 놓았겠어요.':d.rocketUnlocked?'오렌지배지를 확인한 민화가 도움을 부탁했어요. “게임코너 지하의 로켓단을 물리쳐 주세요. 모두 해결되면 체육관에서 도전을 받을게요.”':'민화는 게임코너 지하에 숨어든 로켓단 때문에 골머리를 앓고 있어요. “오렌지배지가 있다면 당신의 실력을 믿고 아지트 조사를 부탁하고 싶어요.”';
  $('snorlax-intro').textContent=road.done?(d.snorlaxCaught?'잠만보를 깨워 함께 모험하기로 했어요. 연분홍시티로 향하는 길도 활짝 열렸어요.':'잠만보를 물리쳐 연분홍시티로 향하는 길이 열렸어요. 이제 길을 지나갈 수 있어요.'):'연분홍시티로 향하는 길목에 잠만보가 깊이 잠들어 있어요. 아무리 불러도 일어나지 않네요. 깨울 방법을 찾아야겠어요.';
  $('rocket-steps').replaceChildren(...d.requirements.map(r=>{
    const row=node('li','rocket-step'+(r.done?' done':'')),info=node('div','rocket-step-info');row.dataset.requirement=r.id;info.append(node('b','',r.name));row.append(info,storyArtwork(r));
    const step=d.steps.find(s=>s.id===r.id);
    info.append(trainerTeam(step,true));
    const ongoing=state.battle?.storyId===step.id,reserved=queued?.index===step.id;
    const b=node('button','',ongoing?'배틀 중':reserved?'도전 예약됨':step.done?'승리 완료':'도전하기');b.dataset.story=step.id;b.disabled=ongoing||busy||!!queued||!step.available;b.onclick=()=>window.buddy.action('challenge',step.id);row.append(b);return row;
  }));
  const body=node('div','snorlax-body'),ongoing=state.battle?.storyId===road.id,reserved=queued?.index===road.id;
  const b=node('button','',ongoing?'배틀 중':reserved?'피리 사용 예약됨':road.done&&d.snorlaxCaught?'포획 완료':!d.fluteObtained?'깨울 방법이 필요해요':road.done?'다시 포켓몬피리 사용':'포켓몬피리 사용');b.dataset.story=road.id;b.disabled=ongoing||!!queued||!road.available;b.title=busy&&road.available?'현재 관장 배틀이 끝난 뒤 사용하도록 예약해요.':'';b.onclick=()=>window.buddy.action('challenge',road.id);
  body.append(node('b','','잠만보 · Lv.'+road.team[0].level),node('p','muted',d.fluteObtained?'포켓몬피리 · 보유 중':'깊이 잠들어 있어 길을 지나갈 수 없어요.'),b);$('snorlax-encounter').replaceChildren(img(143,'snorlax-sprite'),body);
}
function renderDevice(){
  if(!state)return;const d=state.trainingDevice;
  $('device-note').textContent=d.obtained?'동료 한 마리를 등록해 경험치 학습과 교환 진화를 이용할 수 있어요.':'학습장치를 얻으면 사용할 수 있어요.';
  $('device-locked').hidden=d.obtained;
  $('device-controls').hidden=!d.obtained;if(!d.obtained)return;
  const select=$('device-learner'),current=Number(select.value),signature=JSON.stringify(state.roster.map(p=>[p.uid,p.id,p.level,p.expPercent,p.boarded]));
  if(select.dataset.signature!==signature){
    select.dataset.signature=signature;select.replaceChildren(node('option','','동료 선택'));select.firstChild.value='';
    for(const p of state.roster){const o=node('option','',p.name+' · '+levelText(p)+(p.boarded?' · 키우미집':''));o.value=p.uid;select.append(o);}select.value=current||d.learnerUid||'';
  }
  const chosen=Number(select.value),registration=state.pendingActions.some(a=>a.kind==='device-learner'&&a.uid===chosen),withdrawal=state.pendingActions.some(a=>a.kind==='device-learner'&&a.uid===null);
  $('device-register').disabled=!chosen||chosen===d.learnerUid||registration;$('device-register').textContent=registration?'등록 예약됨':'장치에 등록';
  $('device-withdraw').disabled=!d.learnerUid||withdrawal;$('device-withdraw').textContent=withdrawal?'데려오기 예약됨':'동료 데려오기';
  const root=$('device-current'),learner=state.roster.find(p=>p.uid===d.learnerUid);root.replaceChildren();
  if(!learner){root.append(node('span','','등록된 동료가 없어요. 한 마리를 골라 주세요.'));return;}
  const body=node('div');body.append(node('b','',learner.name+' · '+levelText(learner)),node('div','muted',experienceText(learner)),node('div','muted',learner.boarded?'키우미집에서 돌아오면 학습을 이어가요.':learner.uid===state.hero.uid?'출전 중 · 경험치를 중복 지급하지 않아요.':'대기 동료 · 출전 동료 경험치의 10%를 추가로 받아요.'));
  const evolutions=node('div','device-evolutions');for(const e of learner.evolutions.filter(e=>e.trigger===2)){
    const queuedEvolution=state.pendingActions.some(a=>a.kind==='evolve'&&a.uid===learner.uid&&a.to===e.to),box=node('div'),b=node('button','',e.name+(queuedEvolution?' 진화 예약됨':e.ready?'로 진화':' 진화 예약'));b.dataset.deviceEvolve=e.to;b.disabled=queuedEvolution;b.title=e.conditions;b.onclick=()=>window.buddy.action('evolve',{id:learner.uid,to:e.to});box.append(b,node('div','muted',e.conditions));evolutions.append(box);
  }body.append(evolutions);root.append(img(learner.id),body);
}
function journalRows(entries){
  return entries.map(entry=>{
    const row=node('article','entry'+(entry.kind==='battle'?' battle-entry':''));row.append(entry.id?img(entry.id):node('div','mark',entry.kind==='badge'||entry.kind==='champion'?'◆':'·'));
    const body=node('div');body.append(node('p','',entry.text));const time=node('time','',new Date(entry.at).toLocaleString('ko-KR'));time.dateTime=new Date(entry.at).toISOString();body.append(time);row.append(body);return row;
  });
}
for(const b of document.querySelectorAll('[data-journal-tab]'))b.onclick=()=>{
  journalTab=b.dataset.journalTab;journalSignature='';renderJournal();
};
function renderJournal(){
  if(!state)return;
  const signature=JSON.stringify([state.journal,state.summary,journalTab]);if(signature===journalSignature)return;journalSignature=signature;
  for(const b of document.querySelectorAll('[data-journal-tab]'))b.setAttribute('aria-selected',String(b.dataset.journalTab===journalTab));
  $('journal-summary').hidden=journalTab!=='summary';$('journal-detail').hidden=journalTab!=='detail';
  const s=state.summary,c=s.counts;
  $('summary-since').textContent='이번 시즌 · '+new Date(s.since).toLocaleString('ko-KR');
  const stats=[['wins','배틀 승리'],['catch','새로운 포획'],['level','레벨 상승'],['evolution','진화'],['hatch','부화'],['xp','얻은 경험치']];
  $('summary-stats').replaceChildren(...stats.map(([key,label])=>{const box=node('div','summary-stat');box.append(node('b','',(c[key]||0).toLocaleString('ko-KR')),node('span','',label));return box;}));
  $('summary-note').textContent='새로운 발견 '+(c.encounter||0)+' · 알 발견 '+(c.egg||0)+' · 관장·리그 승리 '+(c.badge||0)+' · 스토리 승리 '+(c.story||0)+' · 도구 발견 '+((c.item||0)+(c.device||0))+' · 패배 '+(c.loss||0);
  $('summary-highlights').replaceChildren(...(s.highlights.length?journalRows(s.highlights):[node('p','muted','아직 기억에 남는 모험이 없어요.')]));
  $('journal-list').replaceChildren(...(state.journal.length?journalRows(state.journal):[node('p','muted','첫 모험을 기다리고 있어요. Codex에서 작업하면 기록이 쌓여요.')]));
}

function render(){
  if(!state)return;
  $('panel-agent-label').textContent='POKÉMON / '+AgentStatus.presentation(state.source).label;
  $('totals').textContent=state.caughtCount+' / '+state.collection.length;$('region').textContent=state.generation===1?'관동 지방 · 1세대':'관동 + 성도 지방 · 2세대 해금';
  const boost=state.experienceBoost;$('xp-boost').textContent='경험치 +'+boost.percent.toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';$('xp-boost').title='누적 도감 '+boost.count+'종 · 1종당 경험치 +1% · 시즌이 바뀌어도 유지';
  $('season-note').textContent=state.season.key.replace('-','.')+' 시즌 · '+(state.season.pending?'현재 배틀 종료 후 새 시즌 시작':'매월 1일 새 모험 · 누적 도감과 부스터 유지');
  $('season-note').title='한국시간 매월 1일 00:00 · 스타팅 Lv.5부터 다시 시작 · 뱃지·지방 해금·스토리·도구 초기화';
  $('seen-count').textContent='발견 '+state.seenCount+' · 동료 '+state.roster.length;$('notice').textContent=state.notice||'';
  renderActions();
  if(tab==='collection')renderDex();else if(tab==='challenge')renderBosses();else if(tab==='daycare')renderNursery();else if(tab==='connections')renderConnections(state.remote);else renderJournal();
  $('story-pending').hidden=mobilePanel||!state.scene;
  document.dispatchEvent(new CustomEvent('panel-rendered',{detail:state}));
}
let actionSignature='';
function renderActions(){
  const actions=state.pendingActions,signature=JSON.stringify(actions);if(signature===actionSignature)return;actionSignature=signature;
  $('action-queue').hidden=!actions.length;$('action-queue-title').textContent='예약한 행동 · '+actions.length+'개';
  $('action-queue-list').replaceChildren(...actions.map(a=>{
    const row=node('div','queued-action'),body=node('div');body.append(node('b','',a.name),node('small','',a.reason));
    const cancel=node('button','','취소');cancel.dataset.cancelAction=a.id;cancel.setAttribute('aria-label',a.name+' 예약 취소');cancel.onclick=()=>window.buddy.action('action-cancel',a.id);row.append(body,cancel);return row;
  }));
}

function gender(value){return value==='female'?' ♀':value==='male'?' ♂':' · 무성';}
function parentChoices(){return [$('parent-a').value,$('parent-b').value].map(Number);}
for(const id of ['parent-a','parent-b'])$(id).onchange=()=>window.buddy.action('daycare-preview',parentChoices());
$('daycare-start').onclick=()=>window.buddy.action('daycare-start',parentChoices());
$('daycare-withdraw').onclick=()=>window.buddy.action('daycare-withdraw');
function progressCard(title,current,required,description,pokemon){
  const box=node('div','nursery-status');if(pokemon)box.append(img(pokemon));
  const body=node('div');body.append(node('h3','',title),node('p','muted',description));
  const track=node('div','nursery-track'),bar=node('i');bar.style.width=Math.min(100,current/required*100)+'%';track.append(bar);
  body.append(track,node('p','muted',Math.floor(current/required*100)+'% · '+Math.max(0,required-current).toLocaleString('ko-KR')+' 모험 걸음 남음'));box.append(body);return box;
}
function renderNursery(){
  $('inventory').replaceChildren(...(state.inventory.length?state.inventory.map(inventoryCard):[node('p','muted','아직 보유한 물품이 없어요.')]));
  renderDevice();
  const d=state.daycare,signature=JSON.stringify(state.roster.map(p=>[p.uid,p.id,p.level,p.expPercent,p.gender,p.boarded]));
  if(nurserySignature!==signature){
    nurserySignature=signature;
    for(const id of ['parent-a','parent-b']){
      const select=$(id),current=select.value;select.replaceChildren();const empty=node('option','','동료 선택');empty.value='';select.append(empty);
      for(const p of state.roster){const option=node('option','',p.name+' · '+levelText(p)+gender(p.gender)+(p.origin==='hatch'?' · 부화':''));option.value=p.uid;select.append(option);}select.value=current;
    }
  }
  ['parent-a','parent-b'].forEach((id,i)=>{$(id).value=d.selection[i]||'';$(id).disabled=!!d.care&&!d.care.produced;});
  const preview=d.preview,root=$('egg-preview');root.replaceChildren(node('span','kicker','예상되는 알'));
  if(preview.compatible){
    const row=node('div','offspring');for(const p of preview.offspring){const card=node('div');card.append(img(p.id),node('h3','',p.name+'의 알'),node('span','muted',preview.offspring.length>1?Math.round(p.chance*100)+'%':'이 포켓몬이 태어나요'));row.append(card);}root.append(row);
    root.append(node('p','muted','알 발견까지 '+preview.eggTokens.toLocaleString('ko-KR')+'걸음 · 부화까지 '+preview.offspring[0].hatchTokens.toLocaleString('ko-KR')+'걸음'));
  }else root.append(node('p','',preview.reason));
  const waiting=!!d.care&&!d.care.produced,queued=state.pendingActions.some(a=>a.kind==='daycare-start'&&a.parents.every((uid,i)=>uid===d.selection[i])),withdrawQueued=state.pendingActions.some(a=>a.kind==='daycare-withdraw');
  $('daycare-start').disabled=!preview.compatible||queued;
  $('daycare-start').textContent=queued?'맡기기 통화 예약됨':waiting||d.egg||d.care?.produced?'다음 알 부탁하기':'전화로 맡기기';
  $('daycare-withdraw').disabled=withdrawQueued;$('daycare-withdraw').textContent=withdrawQueued?'데려오기 통화 예약됨':'전화로 데려오기';
  $('daycare-withdraw').hidden=!d.care;
  $('nursery-progress').replaceChildren();
  if(d.care){
    const names=d.care.parents.map(p=>p.name+' '+levelText(state.roster.find(m=>m.uid===p.uid))).join(' · ');
    if(d.care.produced)$('nursery-progress').append(node('p','muted',names+' · 알 하나를 얻었어요. 동료를 데려오거나 부화 후 다음 알을 기다릴 수 있어요.'));
    else $('nursery-progress').append(progressCard('키우미집에서 알을 기다려요',d.care.progress,d.care.required,names+' · 데려오면 알 발견 진행이 초기화돼요.'));
  }
  $('hatch-progress').replaceChildren();
  if(d.egg)$('hatch-progress').append(progressCard(d.egg.name+'의 알을 품는 중',d.egg.progress,d.egg.required,'코딩을 이어가면 부화해요. 부모를 데려와도 알은 남아요.',d.egg.id));
}

initConnections();switchTab(tab);window.buddy.onState(s=>{state=s;render();});
