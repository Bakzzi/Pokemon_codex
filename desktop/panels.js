'use strict';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
let journalTab='summary';
let state=null,selected=25,memberUid=null,nurserySignature='',tab=new URLSearchParams(location.search).get('tab')||'collection',dexSignature='',detailSignature='',bossSignature='',journalSignature='';
const img=(id,cls='')=>{const e=node('img',cls);e.src='assets/'+id+'.gif';e.alt='';return e;};
function switchTab(value){tab=['collection','challenge','journal','daycare'].includes(value)?value:'collection';for(const e of document.querySelectorAll('.page'))e.hidden=e.id!==tab;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));render();}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>switchTab(b.dataset.tab);
$('search').oninput=()=>{dexSignature='';render();};$('filter').onchange=()=>{dexSignature='';render();};
$('league-start').onclick=()=>window.buddy.action('challenge',8);
$('johto-stay').onclick=()=>window.buddy.action('johto-stay');
$('johto-unlock').onclick=()=>window.buddy.action('johto-unlock');
window.buddy.onTab(switchTab);
function renderDex(){
  const signature=JSON.stringify([state.collection.map(p=>[p.id,p.seen,p.caught,p.owned,p.level,p.count]),selected,$('filter').value,$('search').value]);
  if(signature!==dexSignature){
    dexSignature=signature;const filter=$('filter').value,query=$('search').value.trim().toLowerCase();
    const cards=state.collection.filter(p=>(filter==='all'||p[filter])&&(!query||String(p.id)===query||p.name.toLowerCase().includes(query))).map(p=>{
      const b=node('button','dex-card'+(p.seen?'':' unseen')+(p.caught?' caught':'')+(p.id===selected?' selected':''));b.dataset.id=p.id;
      b.setAttribute('aria-label','No.'+p.id+' '+p.name+(p.caught?' · 포획 완료':''));b.append(img(p.id));
      const label=node('span','label');if(p.caught){const ball=node('i','ball');ball.title='포획 완료';label.append(ball);}label.append(document.createTextNode('No.'+p.id+' '+p.name));b.append(label,node('small','',p.owned?'Lv.'+p.level+(p.count>1?' · '+p.count+'마리':''):p.caught?'도감 등록 완료':p.seen?'발견':'미발견'));
      b.onclick=()=>{selected=p.id;detailSignature='';render();};return b;
    });$('dex-grid').replaceChildren(...cards);
  }
  const p=state.collection.find(p=>p.id===selected);if(!p)return;
  const members=state.roster.filter(m=>m.id===p.id);
  if(!members.some(m=>m.uid===memberUid))memberUid=members[0]?.uid;
  const member=members.find(m=>m.uid===memberUid);
  const detailKey=JSON.stringify([p,members,memberUid,state.slots,state.battle?.kind,state.hero.uid]);
  if(detailKey===detailSignature)return;detailSignature=detailKey;
  const root=$('detail');root.replaceChildren(img(p.id,'portrait'+(p.seen?'':' unseen')),node('div','number','No.'+p.id+' · '+(p.caught?'포획 완료':p.seen?'발견':'미발견')),node('h2','',p.name),node('div','types',p.types.join(' / ')),node('p','description',p.description));
  if(!p.owned){
    if(p.caught)root.append(node('p','muted','도감 기록은 남아 있어요. 현재 동료 목록에는 없는 포켓몬이에요.'));
    return;
  }
  if(members.length>1){
    const select=node('select','member-select');select.setAttribute('aria-label','보유 개체 선택');
    for(const [i,m] of members.entries()){const o=node('option','',(i+1)+'번째 동료 · Lv.'+m.level+gender(m.gender)+(m.origin==='hatch'?' · 부화':''));o.value=m.uid;select.append(o);}select.value=memberUid;
    select.onchange=()=>{memberUid=Number(select.value);detailSignature='';render();};root.append(select);
  }
  root.append(node('p','muted','Lv.'+member.level+gender(member.gender)+' · 누적 경험치 '+member.xp.toLocaleString('ko-KR')+(member.boarded?' · 키우미집에 맡긴 동료':'')));
  const deploy=node('button','deploy',member.boarded?'키우미집에서 쉬는 중':state.hero.uid===member.uid?'현재 출전 중':'이 포켓몬 출전');deploy.disabled=member.boarded||state.hero.uid===member.uid;deploy.onclick=()=>window.buddy.action('select',member.uid);root.append(deploy);
  root.append(node('h3','','빠른 선택 칸에 배치'));
  const assign=node('div','assign');state.slots.forEach((s,i)=>{const b=node('button');b.dataset.assign=i;b.title=(i+1)+'번 칸 · '+s.name;b.disabled=member.boarded||state.battle?.kind==='trainer';b.append(img(s.id),document.createTextNode((i+1)+'번'));b.onclick=()=>window.buddy.action('slot',{slot:i,id:member.uid});assign.append(b);});root.append(assign);
  root.append(node('p','muted','특성 · '+member.ability));
  root.append(node('h3','','배운 기술 '+member.moves.length+'개 · 자동 사용'));const list=node('ul','move-list');for(const m of member.moves||[])list.append(node('li','',m.name));root.append(list);
  for(const e of member.evolutions){
    const box=node('div','evolution'),b=node('button','',(e.trigger===2?'교환소 · ':'')+e.name+'로 진화');
    b.disabled=!e.ready||state.battle?.kind==='trainer';b.onclick=()=>window.buddy.action('evolve',{id:member.uid,to:e.to});box.append(b,node('p','',e.conditions||'진화 조건 충족'));
    if(e.trigger===2)box.append(node('p','','혼자 즐기는 교환소에서 교환 후 되돌려 받아요.'));
    root.append(box);
  }
}
function teamMembers(team){
  const row=node('div','team');
  for(const p of team){const mon=node('span');mon.title='No.'+p.id+' · Lv.'+p.level;mon.append(img(p.id),document.createTextNode('Lv.'+p.level));row.append(mon);}
  return row;
}
let shownBadges=null;
function badgeImage(boss,className=''){
  const image=node('img',className);image.src='assets/badges/'+boss.id+'.png';image.alt='';image.draggable=false;return image;
}
function renderBadgeCase(){
  const earned=new Set(state.badges),signature=state.badges.join(',');
  if($('badge-slots').dataset.signature===signature)return;
  $('badge-slots').dataset.signature=signature;
  $('badge-slots').replaceChildren(...state.bosses.slice(0,8).map((boss,i)=>{
    const done=earned.has(boss.id),fresh=done&&shownBadges&&!shownBadges.has(boss.id);
    const slot=node('button','badge-slot'+(done?' earned':' empty')+(fresh?' just-earned':''));slot.dataset.badge=boss.id;
    slot.setAttribute('aria-label',boss.badge+' · '+boss.name+' · '+(done?'획득 완료':'미획득'));slot.title=slot.getAttribute('aria-label');
    const recess=node('span','badge-recess');recess.append(badgeImage(boss,'badge-edge'),badgeImage(boss,'badge-shadow'));
    if(done)recess.append(badgeImage(boss,'badge-art'),node('i','badge-glint'));
    const label=node('span','badge-label');label.append(node('b','',boss.badge),node('small','',done?'획득 완료':boss.name+' · 미획득'));
    slot.append(recess,label);slot.onclick=()=>{const card=$('gyms').children[i];card?.scrollIntoView({behavior:'smooth',block:'center'});card?.querySelector('button')?.focus({preventScroll:true});};return slot;
  }));
  shownBadges=earned;
  $('badge-case-note').textContent=earned.size===8?'관동의 여덟 증표 · 포켓몬 리그로':earned.size+'개의 증표 · 다음 도전을 기다리는 자리';
}
function renderBosses(){
  const busy=state.battle?.kind==='trainer',queued=state.pendingChallenge,signature=JSON.stringify([state.badges,state.battle,queued,state.champion,state.leagueBest,state.johtoUnlocked,state.johtoDeferred,state.kantoCaughtCount,state.encounterBonus]);if(signature===bossSignature)return;bossSignature=signature;
  $('badges').textContent='뱃지 '+state.badges.length+' / 8';
  renderBadgeCase();
  $('gyms').replaceChildren(...state.bosses.slice(0,8).map((boss,i)=>{
    const done=state.badges.includes(boss.id),card=node('article','gym'+(done?' done':'')),title=node('div','gym-title'),badge=node('span','badge');badge.append(badgeImage(boss,'gym-badge'),document.createTextNode(boss.badge));title.append(node('h3','',(i+1)+'. '+boss.name),badge);card.append(title,teamMembers(boss.team));
    const b=node('button','',done?'뱃지 획득 완료':queued?.index===i?'도전 예약됨':i>state.badges.length?'앞선 체육관 뱃지가 필요해요':'도전하기');b.dataset.challenge=i;b.disabled=done||busy||!!queued||i>state.badges.length;b.onclick=()=>window.buddy.action('challenge',i);card.append(b);return card;
  }));
  $('ongoing').hidden=!busy&&!queued;
  if(queued){$('ongoing').replaceChildren(node('span','',queued.name+' 도전 예약 · '+(state.battle?'현재 야생 배틀이 끝나면 시작해요.':'마지막 연출이 끝나면 시작해요.')));const b=node('button','','예약 취소');b.dataset.cancelChallenge='';b.onclick=()=>window.buddy.action('challenge-cancel');$('ongoing').append(b);}
  else if(busy){$('ongoing').replaceChildren(node('span','',state.battle.boss+' · '+(state.battle.foeIndex+1)+' / '+state.battle.teamSize+'마리와 배틀 중'));const b=node('button','','도전 그만두기');b.onclick=()=>window.buddy.action('abandon');$('ongoing').append(b);}
  $('league-start').disabled=state.badges.length<8||busy||!!queued;$('league-start').textContent=queued?.index===8?'리그 도전 예약됨':state.champion?'리그 재도전':'리그 도전';
  $('league-team').replaceChildren(...state.bosses.slice(8).map((b,i)=>{const e=node('article','league-member');e.append(node('h3','',(i===4?'챔피언 ':'')+b.name),teamMembers(b.team));return e;}));
  $('league-progress').textContent=state.champion?(state.johtoUnlocked?'관동 챔피언 · 성도 지방 해금 완료':'관동 챔피언 · 151종을 모으며 머물거나 원할 때 2세대를 해금하세요.'):'리그 최고 기록 '+state.leagueBest+' / 5 · 챔피언이 되면 출현 보너스와 2세대 해금 선택권을 얻어요.';
  $('johto-choice').hidden=!state.champion;
  if(state.champion){
    const unlocked=state.johtoUnlocked,stay=state.johtoDeferred;
    $('johto-title').textContent=unlocked?'성도 지방이 열렸어요':stay?'관동에서 도감을 완성하는 중':'다음 모험을 선택하세요';
    $('johto-note').textContent='관동 도감 '+state.kantoCaughtCount+' / 151 · '+(unlocked?'관동 151종과 성도 100종을 함께 만날 수 있어요.':stay?'151종 수집을 계속해요. 원할 때 언제든 2세대를 해금할 수 있어요.':'151종을 모을 때까지 관동에 머물러도 좋아요. 2세대를 해금하면 성도 100종이 추가돼요.');
    const bonus=state.encounterBonus,pct=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:3})+'%';
    $('champion-bonus').textContent=bonus?'챔피언 보너스 · 희귀 '+pct(bonus.rates.rare)+' · 전설 '+pct(bonus.rates.legendary)+' · 환상 '+pct(bonus.rates.mythical)+'\n같은 범주에서는 미등록 포켓몬을 '+bonus.uncaughtWeight+'배 우대해요. 출전 레벨 조건을 충족한 종에 적용돼요.':'';
    $('johto-stay').hidden=unlocked||stay;$('johto-unlock').hidden=unlocked;
  }
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
$('journal-ack').onclick=()=>window.buddy.action('journal-ack');
function renderJournal(){
  if(!state)return;
  const signature=JSON.stringify([state.journal,state.inventory,state.summary,journalTab]);if(signature===journalSignature)return;journalSignature=signature;
  $('inventory').replaceChildren(...state.inventory.map(i=>node('span','',i.name+' × '+i.count)));
  for(const b of document.querySelectorAll('[data-journal-tab]'))b.setAttribute('aria-selected',String(b.dataset.journalTab===journalTab));
  $('journal-summary').hidden=journalTab!=='summary';$('journal-detail').hidden=journalTab!=='detail';
  const s=state.summary,c=s.counts;
  $('summary-since').textContent=(s.first?'기록을 시작한 뒤':'지난 확인 이후')+' · '+new Date(s.since).toLocaleString('ko-KR');
  const stats=[['wins','배틀 승리'],['catch','새로운 포획'],['level','레벨 상승'],['evolution','진화'],['hatch','부화'],['xp','얻은 경험치']];
  $('summary-stats').replaceChildren(...stats.map(([key,label])=>{const box=node('div','summary-stat');box.append(node('b','',(c[key]||0).toLocaleString('ko-KR')),node('span','',label));return box;}));
  $('summary-note').textContent='새로운 발견 '+(c.encounter||0)+' · 알 발견 '+(c.egg||0)+' · 관장·리그 승리 '+(c.badge||0)+' · 도구 발견 '+(c.item||0)+' · 패배 '+(c.loss||0);
  $('summary-highlights').replaceChildren(...(s.highlights.length?journalRows(s.highlights):[node('p','muted','새로운 모험을 기다리고 있어요. 확인하기 전까지 결과를 모아 둘게요.')]));
  $('journal-ack').disabled=!Object.values(c).some(v=>v>0);
  $('journal-list').replaceChildren(...(state.journal.length?journalRows(state.journal):[node('p','muted','첫 모험을 기다리고 있어요. Codex에서 작업하면 기록이 쌓여요.')]));
}

function render(){
  if(!state)return;$('totals').textContent=state.caughtCount+' / '+state.collection.length;$('region').textContent=state.generation===1?'관동 지방 · 1세대':'관동 + 성도 지방 · 2세대 해금';
  $('seen-count').textContent='발견 '+state.seenCount+' · 동료 '+state.roster.length;$('notice').textContent=state.notice||'';
  if(tab==='collection')renderDex();else if(tab==='challenge')renderBosses();else if(tab==='daycare')renderNursery();else renderJournal();
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
  const d=state.daycare,signature=JSON.stringify(state.roster.map(p=>[p.uid,p.id,p.level,p.gender,p.boarded]));
  if(nurserySignature!==signature){
    nurserySignature=signature;
    for(const id of ['parent-a','parent-b']){
      const select=$(id),current=select.value;select.replaceChildren();const empty=node('option','','동료 선택');empty.value='';select.append(empty);
      for(const p of state.roster){const option=node('option','',p.name+' · Lv.'+p.level+gender(p.gender)+(p.origin==='hatch'?' · 부화':''));option.value=p.uid;select.append(option);}select.value=current;
    }
  }
  ['parent-a','parent-b'].forEach((id,i)=>{$(id).value=d.selection[i]||'';$(id).disabled=!!d.care&&!d.care.produced;});
  const preview=d.preview,root=$('egg-preview');root.replaceChildren(node('span','kicker','예상되는 알'));
  if(preview.compatible){
    const row=node('div','offspring');for(const p of preview.offspring){const card=node('div');card.append(img(p.id),node('h3','',p.name+'의 알'),node('span','muted',preview.offspring.length>1?Math.round(p.chance*100)+'%':'이 포켓몬이 태어나요'));row.append(card);}root.append(row);
    root.append(node('p','muted','알 발견까지 '+preview.eggTokens.toLocaleString('ko-KR')+'걸음 · 부화까지 '+preview.offspring[0].hatchTokens.toLocaleString('ko-KR')+'걸음'));
  }else root.append(node('p','',preview.reason));
  const waiting=!!d.care&&!d.care.produced,busy=state.battle?.kind==='trainer';
  $('daycare-start').disabled=!preview.compatible||waiting||!!d.egg||busy;
  $('daycare-start').textContent=waiting?'알을 기다리는 중':d.egg?'현재 알이 부화하는 중':d.care?.produced?'다음 알 기다리기':'두 마리 맡기기';
  $('daycare-withdraw').hidden=!d.care;
  $('nursery-progress').replaceChildren();
  if(d.care){
    const names=d.care.parents.map(p=>p.name).join(' · ');
    if(d.care.produced)$('nursery-progress').append(node('p','muted',names+' · 알 하나를 얻었어요. 동료를 데려오거나 부화 후 다음 알을 기다릴 수 있어요.'));
    else $('nursery-progress').append(progressCard('키우미집에서 알을 기다려요',d.care.progress,d.care.required,names+' · 데려오면 알 발견 진행이 초기화돼요.'));
  }
  $('hatch-progress').replaceChildren();
  if(d.egg)$('hatch-progress').append(progressCard(d.egg.name+'의 알을 품는 중',d.egg.progress,d.egg.required,'코딩을 이어가면 부화해요. 부모를 데려와도 알은 남아요.',d.egg.id));
}

switchTab(tab);window.buddy.onState(s=>{state=s;render();});
