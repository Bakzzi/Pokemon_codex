'use strict';
const $=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString('ko-KR');
const levelText=p=>'Lv.'+p.level;
let serial=0,current=null,switching=false,captureRaf=0,moveRaf=0,faintRaf=0,switchRaf=0,playingMove=null,playingSwitch=null,speechTimer=0;
for(const action of ['pin','compact','hide','close'])$(action).onclick=()=>window.buddy.action(action);
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>window.buddy.action('panel',b.dataset.panel);
function sprite(element,p){const img=$(element),src='assets/'+p.id+'.gif';if(img.getAttribute('src')!==src)img.src=src;img.alt=p.name;}
function clearMove(){
  if(moveRaf)cancelAnimationFrame(moveRaf);moveRaf=0;playingMove=null;
  const canvas=$('attack-fx');canvas.hidden=true;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  for(const id of ['hero','foe']){$(id).style.transform='';$(id).style.opacity='';$(id).style.filter='';}
}
function clearFx(){
  if(faintRaf)cancelAnimationFrame(faintRaf);if(switchRaf)cancelAnimationFrame(switchRaf);faintRaf=0;switchRaf=0;
  clearMove();switching=false;playingSwitch=null;$('ball-fx').style.display='none';$('switch-flash').hidden=true;$('switch-beam').hidden=true;
  for(const id of ['hero-image','foe-image']){$(id).style.opacity='1';$(id).style.transform='';$(id).style.filter='';}
}
function playMove(event){
  playingMove=event;
  const timing=BattlePacing.actionTiming(event),effect={...event,at:event.at+timing.announceMs};
  const canvas=$('attack-fx'),ctx=canvas.getContext('2d');
  canvas.hidden=false;canvas.dataset.move=String(event.moveId);canvas.dataset.family=MoveEffects.profileFor(event.moveId).family;
  const draw=()=>{
    if(playingMove!==event)return;
    const now=Date.now(),frame=MoveEffects.frameFor(effect,now);
    if(now>=event.at+BattlePacing.duration(event)){clearMove();if(current){renderHeroHealth(current);renderFoe(current);renderSpeech(current);}return;}
    canvas.hidden=!event.moveId||!frame.active;
    MoveEffects.drawFrame(ctx,effect,frame);canvas.dataset.phase=now<effect.at?'announce':now>=event.at+timing.resultAt?'result':frame.phase;canvas.dataset.outcome=frame.outcome;
    for(const [id,m] of [[event.actor==='foe'?'foe':'hero',frame.actor],[event.actor==='foe'?'hero':'foe',frame.target]]){
      const hit=BattlePacing.damageReaction(event,id,now);
      $(id).style.transform=`translate(${m.x+hit.x}px,${m.y}px) rotate(${m.rotate}deg) scale(${m.scale})`;$(id).style.opacity=String(m.opacity*hit.opacity);
      $(id).style.filter=hit.active?'brightness(2)':'';
    }
    renderHeroHealth(current);renderFoe(current);renderPartyStatus(current);renderSpeech(current);moveRaf=requestAnimationFrame(draw);
  };draw();
}
function playFaint(event){
  const draw=()=>{
    const age=Date.now()-event.at,t=Math.max(0,Math.min(1,(age-400)/700));
    for(const side of event.sides||[]){$(side).style.transform=`translateY(${(side==='hero'?18:38)*t}px) scaleY(${1-.3*t})`;$(side).style.opacity=String(1-(side==='hero'?.55:1)*t);}
    if(age<BattlePacing.duration(event))faintRaf=requestAnimationFrame(draw);else faintRaf=0;
  };draw();
}
function playSwitch(event){
  switching=true;playingSwitch=event;
  const draw=()=>{
    if(playingSwitch!==event)return;
    const f=BattlePacing.switchFrame(event,Date.now()),ball=$('ball-fx'),hero=$('hero-image'),flash=$('switch-flash');
    if(f.done){clearFx();sprite('hero-image',current.hero);renderHeroHealth(current);renderSpeech(current);return;}
    sprite('hero-image',{id:f.incoming?event.to:event.from,name:f.incoming?event.toName:event.fromName});
    hero.style.transform=`translateY(${f.heroY}px) scaleX(-1) scale(${f.scale})`;hero.style.opacity=String(f.opacity);
    hero.style.filter=f.phase==='absorb'?'brightness(2.8) sepia(1) saturate(5) hue-rotate(290deg)':f.phase==='release'?`brightness(${1+2*f.glow})`:'';
    ball.style.display=f.ballVisible?'block':'none';ball.dataset.phase=f.phase;ball.style.opacity=String(f.ballOpacity);
    ball.style.transform=`translate(${f.x}px,${f.y}px) rotate(${f.angle}deg)`;ball.classList.toggle('opening',f.phase==='open'||f.phase==='release');
    flash.hidden=f.glow<=0;flash.dataset.mode=f.incoming?'release':'recall';flash.style.opacity=String(f.glow);flash.style.transform=`scale(${.5+f.glow})`;
    $('switch-beam').hidden=f.phase!=='absorb';$('switch-beam').style.opacity=String(f.glow);
    renderHeroHealth(current);renderSpeech(current);switchRaf=requestAnimationFrame(draw);
  };draw();
}
const statusLabels={poison:'독',toxic:'독',paralysis:'마비',burn:'화상',sleep:'잠듦',freeze:'얼음'};
function renderHealth(side,p){
  $(side==='hero'?'hero-battle-name':'foe-name').textContent=p.name;
  $(side+'-battle-level').textContent='L'+p.level;
  const label=$(side+'-hp-label'),status=statusLabels[p.status];
  label.textContent=status||'HP';label.title=status?(p.status==='toxic'?'맹독':status):'체력';
  label.setAttribute('aria-label',status?p.name+' · '+label.title:'HP');
  if(status)label.dataset.status=p.status;else delete label.dataset.status;
  const bar=$(side+'-hp');bar.style.width=Math.max(0,Math.min(1,p.hp))*100+'%';
  bar.dataset.health=p.hp<=.2?'low':p.hp<=.5?'mid':'high';
  $(side+'-hp-number').textContent=Number.isFinite(p.maxHp)?`${p.currentHp ?? Math.ceil(p.hp*p.maxHp)} / ${p.maxHp}`:'';
}
function moveHealth(side,p){
  return playingMove?BattlePacing.healthAt(playingMove,side,Date.now(),p):p;
}
function renderHeroHealth(s){
  if(playingSwitch){
    const f=BattlePacing.switchFrame(playingSwitch,Date.now()),p=f.incoming?playingSwitch.toPokemon||s.hero:playingSwitch.fromPokemon||{...s.hero,id:playingSwitch.from,name:playingSwitch.fromName};
    $('hero-hud').hidden=f.opacity===0;renderHealth('hero',p);return;
  }
  $('hero-hud').hidden=false;
  const p=playingMove?.hero?.id===s.hero.id?{...s.hero,...playingMove.hero}:s.hero;renderHealth('hero',moveHealth('hero',p));
}
function eventFx(e){
  if(!e||e.serial===serial)return;serial=e.serial;
  clearFx();if(Date.now()-e.at>BattlePacing.duration(e)){
    if(e.kind==='faint')playFaint(e);
    return;
  }
  if(e.kind==='switch')playSwitch(e);
  else if(e.kind==='attack')playMove(e);
  else if(e.kind==='faint')playFaint(e);
  else if(e.kind==='capture'&&e.leadIn&&Date.now()<e.at)playMove(e.leadIn);
}
function renderFoe(s){
  const capture=s.capture&&Date.now()>=s.capture.at?s.capture:null,shown=capture?{...s.foe,...capture}:playingMove?.foe?{...s.foe,...playingMove.foe}:s.foe||(s.capture&&Date.now()<s.capture.at?s.capture.leadIn?.foe:null),foe=$('foe'),img=$('foe-image'),fx=$('capture-fx');
  foe.hidden=!shown;$('foe-ground').hidden=!shown;$('empty-foe').hidden=!!shown;
  img.style.opacity='1';img.style.transform='';img.style.filter='';
  $('foe-hud').hidden=!shown;fx.hidden=!capture;
  if(shown){sprite('foe-image',shown);renderHealth('foe',capture?shown:moveHealth('foe',shown));}
  if(!capture)return;
  const f=CaptureAnimation.captureFrame(capture,Date.now()),ball=$('capture-ball'),flash=$('capture-flash'),stars=$('capture-sparkles');
  fx.dataset.phase=f.phase;fx.dataset.shake=String(f.shake);
  const clamp=n=>Math.max(0,Math.min(1,n));
  let x=0,y=0,angle=0,opacity=1,brightness=1;
  if(f.age<f.throwMs){
    const t=f.age/f.throwMs;x=-196*(1-t);y=-42*t-64*Math.sin(Math.PI*t);angle=540*t;
  }else if(f.age<f.throwMs+f.absorbMs){
    const t=(f.age-f.throwMs)/f.absorbMs;y=-42;
    img.style.transform=`translateY(${28*t}px) scale(${1-t})`;img.style.opacity=String(1-t);img.style.filter='brightness(3)';
  }else if(f.age<f.throwMs+f.absorbMs+f.landMs){
    const t=(f.age-f.throwMs-f.absorbMs)/f.landMs;
    y=t<.55?-42*(1-(t/.55)**2):-12*Math.sin((t-.55)/.45*Math.PI);
  }else if(f.phase==='shake'){
    const t=(f.age-f.shakeAt-(f.shake-1)*f.shakeEvery)/f.shakeMs;
    if(t<1){angle=24*Math.sin(t*Math.PI*2);x=3*Math.sin(t*Math.PI*2);y=-4*Math.sin(t*Math.PI);}
  }
  const resolving=f.age>=f.resultAt,spark=clamp((f.age-f.resultAt)/650);
  foe.hidden=f.age>=f.throwMs+f.absorbMs&&(!resolving||capture.caught);
  $('foe-hud').hidden=f.age>=f.throwMs&&(!resolving||capture.caught||f.age<f.resultAt+420);
  if(resolving&&!capture.caught){
    const t=clamp((f.age-f.resultAt)/420);opacity=1-clamp(t*2);brightness=4;
    img.style.transform=`translateY(${30*(1-t)-14*Math.sin(t*Math.PI)}px) scale(${.12+.88*t})`;
    img.style.opacity=String(t);img.style.filter=`brightness(${3-2*t})`;
    fx.hidden=t===1;
  }
  ball.style.transform=`translate(${x}px,${y}px) rotate(${angle}deg)`;ball.style.opacity=String(opacity);
  ball.style.filter=`brightness(${brightness})`;ball.classList.toggle('caught',resolving&&capture.caught);
  flash.hidden=!(resolving&&!capture.caught&&f.age<f.resultAt+320);
  flash.style.transform=`scale(${1+2*clamp((f.age-f.resultAt)/320)})`;flash.style.opacity=String(1-clamp((f.age-f.resultAt)/320));
  stars.hidden=!(resolving&&capture.caught&&spark<1);stars.style.opacity=String(Math.sin(Math.PI*spark));
  [...stars.children].forEach((star,i)=>{const a=[[-27,-18],[0,-33],[27,-18],[8,9]][i];star.style.transform=`translate(${a[0]*spark}px,${a[1]*spark}px) scale(${1-.3*spark})`;});
}
function renderSpeech(s){
  clearTimeout(speechTimer);speechTimer=0;
  const now=Date.now(),capture=s.capture,f=capture&&CaptureAnimation.captureFrame(capture,now);
  let event=capture?.leadIn&&now<capture.at?capture.leadIn:s.animation,text='',speaker='scene',expires=0;
  const actionActive=event&&now>=event.at&&now-event.at<BattlePacing.duration(event);
  const quiet=s.workTokens<250&&s.battle?.kind!=='trainer'&&!actionActive&&!f?.locked;
  const checking=quiet&&(s.phase==='unknown'||!s.demo&&s.source?.connected===false);
  const waiting=quiet&&!checking&&(s.phase==='idle'||s.phase==='done');
  if(checking)text='작업 상태 확인 중..';
  else if(waiting)text='작업 대기중..';
  else if(capture&&now>=capture.at&&(f.locked||s.animation?.kind==='capture'))text=f.text;
  else if(actionActive){
    text=event.text;expires=event.at+BattlePacing.duration(event);
    if(event.kind==='attack'&&now-event.at>=BattlePacing.actionTiming(event).resultAt){
      const result=(event.detail||'').split(' · ').find(line=>line&&!line.includes('기절'));
      if(result)text=result;
    }
    if(event.kind==='attack')speaker=event.actor==='foe'?'foe':'hero';
    else if(event.kind==='switch'){
      speaker='hero';
      if(now-event.at>=650||!event.reason){const incoming=BattlePacing.switchFrame(event,now).incoming;text=incoming?event.toName+', 너로 정했다!':event.fromName+(event.reason==='faint'?', 수고했어!':', 돌아와!');}
    }
    else if(event.kind==='encounter')speaker='foe';
    else if(event.kind==='faint'&&event.sides?.length===1)speaker=event.sides[0];
    if(event.kind==='attack'&&now-event.at>=BattlePacing.actionTiming(event).healthAt){
      const causes=BattlePacing.damageMessages(event);
      if(causes.length){text=causes.map(c=>c.text).join(' ');speaker=causes.every(c=>c.side===causes[0].side)?causes[0].side:'scene';}
    }
  }else text=s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.battle?'다음 작업과 함께 배틀을 이어가요':'오늘은 어떤 포켓몬을 만날까?';
  const bubble=$('speech');bubble.dataset.speaker=speaker;bubble.classList.toggle('waiting',waiting||checking);$('speech-text').textContent=text;
  bubble.title=!waiting&&!checking&&event?.detail?[...new Set([text,...event.detail.split(' · ').filter(line=>!text.includes(line))])].join(' '):text;
  // Clear an expired action even when no new state arrives from an idle Codex session.
  if(expires&&!(f?.locked))speechTimer=setTimeout(()=>{if(current)renderSpeech(current);},Math.max(1,expires-now+10));
}
function refreshScene(){
  if(captureRaf)cancelAnimationFrame(captureRaf);captureRaf=0;
  renderHeroHealth(current);renderFoe(current);renderSpeech(current);
  if(current.capture&&CaptureAnimation.captureFrame(current.capture,Date.now()).locked)captureRaf=requestAnimationFrame(refreshScene);
}
function renderPartyStatus(s){
  s.slots.forEach((p,i)=>{
    const b=$('party').children[i];if(!b)return;
    b.classList.toggle('empty',p.empty);b.firstChild.hidden=!!p.empty;
    if(p.empty){b.dataset.id='';b.disabled=false;b.title=(i+1)+'번 빈칸 · 도감에서 동료 배치';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed','false');b.classList.remove('queued','fainted');b.firstChild.removeAttribute('src');b.lastChild.textContent='빈칸';return;}
    const fainted=p.fainted&&!(p.selected&&playingMove?.heroBefore&&moveHealth('hero',playingMove.hero||s.hero).currentHp>0);
    const queued=s.pendingActions.some(a=>a.kind==='select'&&a.uid===p.uid);b.classList.toggle('queued',queued);b.dataset.id=p.uid;b.disabled=queued;b.title=p.name+' '+levelText(p)+(queued?' · 출전 예약됨':p.boarded?' · 키우미집에서 데려온 뒤 출전 예약':fainted?' · 배틀 종료 후 회복·출전 예약':' · 클릭하여 출전');
    b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(p.selected));b.classList.toggle('fainted',fainted);
    const img=b.firstChild;if(img.getAttribute('src')!=='assets/'+p.id+'.gif')img.src='assets/'+p.id+'.gif';b.lastChild.textContent=queued?'예약':p.boarded?'맡김':fainted?'기절':levelText(p);
  });
}
window.buddy.onState(s=>{
  current=s;document.body.classList.toggle('compact',s.compact);document.documentElement.style.setProperty('--accent',s.accent);
  $('pin').setAttribute('aria-pressed',String(s.pinned));$('compact').title=s.compact?'상태창 펼치기':'작게 보기';
  if(!switching)sprite('hero-image',s.hero);
  $('hero-name').textContent=s.hero.name;$('level').textContent=s.level;renderHeroHealth(s);
  $('region').textContent=s.generation===1?'KANTO ADVENTURE':'KANTO + JOHTO';$('exp').textContent=s.level===100?'MAX LEVEL':fmt(s.expCurrent)+' / '+fmt(s.expRequired);
  $('xp-bar').style.width=s.progress*100+'%';$('evolution').textContent=s.evolution.some(e=>e.automatic&&e.ready)?'자동진화 대기 · 배틀 종료 후':s.evolution.some(e=>e.ready)?'진화 가능 · 도감에서 확인':'';
  const boost=s.experienceBoost,pct=boost.percent.toLocaleString('ko-KR',{maximumFractionDigits:2});
  $('xp-boost').textContent='BOOST +'+pct+'%';$('xp-boost').title='누적 도감 '+boost.count+'종 · 1종당 경험치 +1% · 시즌이 바뀌어도 유지';
  $('status').textContent=s.notice||(s.pendingActions.length?'행동 '+s.pendingActions.length+'개 예약 · '+s.pendingActions[0].name:s.pendingChallenge?s.pendingChallenge.name+' 도전 예약 · 배틀 종료 후 시작':s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.phase==='working'?'Codex 작업과 함께 모험 중':s.workTokens>=250?'작업의 여운으로 모험을 이어가는 중':s.phase==='unknown'?'Codex 작업 상태를 확인하는 중':s.phase==='done'?'작업 끝! 모험 기록을 확인해 봐':'다음 코딩을 기다리는 중');
  $('mode-tag').textContent=s.demo?'DEMO':'LIVE';
  $('connection-label').textContent=s.demo?'미리보기':s.source.connected?'Codex 연결됨':'Codex 기다리는 중';
  $('connection-label').parentElement.classList.toggle('live',s.source.connected&&!s.demo);$('connection-label').title=s.demo?'미리보기 · 경험치 별도':s.source.error||'로컬 작업 상태만 읽어요';
  s.limits.forEach((limit,i)=>{const prefix=i===0?'limit-a':'limit-b';$(prefix+'-value').textContent=limit.left===null?'미제공':limit.left+'%';$(prefix+'-bar').style.width=(limit.left??0)+'%';});
  if($('party').dataset.ids!==s.slots.map(p=>p.uid).join(',')){
    $('party').replaceChildren(...s.slots.map((p,i)=>{const b=document.createElement('button');b.dataset.slot=i;b.onclick=()=>b.dataset.id?window.buddy.action('select',Number(b.dataset.id)):window.buddy.action('panel','collection');const img=document.createElement('img');img.alt='';b.append(img,document.createElement('small'));return b;}));$('party').dataset.ids=s.slots.map(p=>p.uid).join(',');
  }
  renderPartyStatus(s);
  document.querySelector('[data-panel="challenge"]').title='획득한 뱃지 '+s.badges.length+' / 8';
  eventFx(s.animation);refreshScene();
});
