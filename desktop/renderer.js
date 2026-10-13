'use strict';
const $=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString('ko-KR');
let serial=0,current=null,switching=false,timers=[],animations=[],captureRaf=0,moveRaf=0,playingMove=null,speechTimer=0;
for(const action of ['pin','compact','hide','close'])$(action).onclick=()=>window.buddy.action(action);
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>window.buddy.action('panel',b.dataset.panel);
function sprite(element,p){const img=$(element),src='assets/'+p.id+'.gif';if(img.getAttribute('src')!==src)img.src=src;img.alt=p.name;}
function later(fn,ms){timers.push(setTimeout(fn,ms));}
function animate(element,frames,options){const a=element.animate(frames,{fill:'none',...options});animations.push(a);return a;}
function clearMove(){
  if(moveRaf)cancelAnimationFrame(moveRaf);moveRaf=0;playingMove=null;
  const canvas=$('attack-fx');canvas.hidden=true;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  for(const id of ['hero','foe']){$(id).style.transform='';$(id).style.opacity='';}
}
function clearFx(){timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];clearMove();switching=false;$('ball-fx').style.display='none';$('hero-image').style.opacity='1';$('foe-image').style.opacity='1';}
function playMove(event){
  if(!event.moveId)return;playingMove=event;
  const canvas=$('attack-fx'),ctx=canvas.getContext('2d');
  canvas.hidden=false;canvas.dataset.move=String(event.moveId);canvas.dataset.family=MoveEffects.profileFor(event.moveId).family;
  const draw=()=>{
    if(playingMove!==event)return;
    const frame=MoveEffects.frameFor(event,Date.now());
    if(!frame.active){clearMove();if(current){renderHealth('hero',current.hero);renderFoe(current);}return;}
    MoveEffects.drawFrame(ctx,event,frame);canvas.dataset.phase=frame.phase;canvas.dataset.outcome=frame.outcome;
    for(const [id,m] of [[event.actor==='foe'?'foe':'hero',frame.actor],[event.actor==='foe'?'hero':'foe',frame.target]]){
      $(id).style.transform=`translate(${m.x}px,${m.y}px) rotate(${m.rotate}deg) scale(${m.scale})`;$(id).style.opacity=String(m.opacity);
    }
    renderHeroHealth(current);renderFoe(current);moveRaf=requestAnimationFrame(draw);
  };draw();
}
function renderHealth(side,p){
  $(side==='hero'?'hero-battle-name':'foe-name').textContent=p.name;
  $(side+'-battle-level').textContent='L'+p.level;
  const bar=$(side+'-hp');bar.style.width=Math.max(0,Math.min(1,p.hp))*100+'%';
  bar.dataset.health=p.hp<=.2?'low':p.hp<=.5?'mid':'high';
  $(side+'-hp-number').textContent=Number.isFinite(p.maxHp)?`${p.currentHp ?? Math.ceil(p.hp*p.maxHp)} / ${p.maxHp}`:'';
}
function moveHealth(side,p){
  return playingMove?.[side+'Before']&&MoveEffects.frameFor(playingMove,Date.now()).u<.58?{...p,...playingMove[side+'Before']}:p;
}
function renderHeroHealth(s){
  const p=playingMove?.hero?.id===s.hero.id?playingMove.hero:s.hero;renderHealth('hero',moveHealth('hero',p));
}
function eventFx(e){
  if(!e||e.serial===serial)return;serial=e.serial;
  clearFx();if(Date.now()-e.at>2200)return;
  const ball=$('ball-fx'),hero=$('hero-image'),foe=$('foe-image');
  if(e.kind==='switch'){
    switching=true;sprite('hero-image',{id:e.from,name:''});ball.style.display='block';
    animate(ball,[{transform:'translate(-65px,-40px) rotate(0deg)',opacity:0},{transform:'translate(-25px,-70px) rotate(180deg)',opacity:1,offset:.45},{transform:'translate(8px,0) rotate(360deg)',opacity:1}],{duration:280});
    later(()=>animate(hero,[{transform:'scaleX(-1) scale(1)',filter:'brightness(2)'},{transform:'scaleX(-1) scale(0)',opacity:0}],{duration:240,fill:'forwards'}),230);
    later(()=>animate(ball,[{transform:'translate(8px,0)',opacity:1},{transform:'translate(-65px,-20px) rotate(-300deg)',opacity:0}],{duration:200}),470);
    later(()=>{hero.style.opacity='0';sprite('hero-image',current.hero);animate(ball,[{transform:'translate(-65px,-30px)',opacity:0},{transform:'translate(-15px,-85px) rotate(200deg)',opacity:1,offset:.45},{transform:'translate(8px,0) rotate(400deg)',opacity:1}],{duration:300});},670);
    later(()=>{ball.style.display='none';hero.style.opacity='1';animate(hero,[{transform:'scaleX(-1) scale(.1)',filter:'brightness(3)',opacity:0},{transform:'scaleX(-1) scale(1.08)',filter:'brightness(1.7)',opacity:1,offset:.7},{transform:'scaleX(-1) scale(1)',filter:'none',opacity:1}],{duration:280,fill:'forwards'});},980);
    later(()=>{clearFx();sprite('hero-image',current.hero);},1290);
  }else if(e.kind==='attack'&&e.moveId)playMove(e);
  else if(e.kind==='capture'&&e.leadIn&&Date.now()<e.at)playMove(e.leadIn);
}
function renderFoe(s){
  const capture=s.capture&&Date.now()>=s.capture.at?s.capture:null,shown=capture||playingMove?.foe||s.foe||(s.capture&&Date.now()<s.capture.at?s.capture.leadIn?.foe:null),foe=$('foe'),img=$('foe-image'),fx=$('capture-fx');
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
  if(capture&&now>=capture.at&&(f.locked||s.animation?.kind==='capture'))text=f.text;
  else if(event&&now>=event.at&&now-event.at<2400){
    text=event.text;expires=event.at+2400;
    if(event.kind==='attack')speaker=event.actor==='foe'?'foe':'hero';
    else if(event.kind==='switch')speaker='hero';
    else if(event.kind==='encounter')speaker='foe';
  }else text=s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.battle?'다음 작업과 함께 배틀을 이어가요':'오늘은 어떤 포켓몬을 만날까?';
  const bubble=$('speech');bubble.dataset.speaker=speaker;$('speech-text').textContent=text;
  bubble.title=event?.detail?text+' · '+event.detail:text;
  // Clear an expired action even when no new state arrives from an idle Codex session.
  if(expires&&!(f?.locked))speechTimer=setTimeout(()=>{if(current)renderSpeech(current);},Math.max(1,expires-now+10));
}
function refreshScene(){
  if(captureRaf)cancelAnimationFrame(captureRaf);captureRaf=0;
  renderFoe(current);renderSpeech(current);
  if(current.capture&&CaptureAnimation.captureFrame(current.capture,Date.now()).locked)captureRaf=requestAnimationFrame(refreshScene);
}
window.buddy.onState(s=>{
  current=s;document.body.classList.toggle('compact',s.compact);document.documentElement.style.setProperty('--accent',s.accent);
  $('pin').setAttribute('aria-pressed',String(s.pinned));$('compact').title=s.compact?'상태창 펼치기':'작게 보기';
  if(!switching)sprite('hero-image',s.hero);
  $('hero-name').textContent=s.hero.name;$('level').textContent=s.level;renderHeroHealth(s);
  $('region').textContent=s.generation===1?'KANTO ADVENTURE':'KANTO + JOHTO';$('exp').textContent=s.level===100?'MAX LEVEL':fmt(s.expCurrent)+' / '+fmt(s.expRequired);
  $('xp-bar').style.width=s.progress*100+'%';$('evolution').textContent=s.evolution.some(e=>e.ready)?'진화 가능 · 도감에서 확인':'';
  $('status').textContent=s.notice||(s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.phase==='working'?'Codex 작업과 함께 모험 중':s.workTokens>=250?'작업의 여운으로 모험을 이어가는 중':s.phase==='done'?'작업 끝! 모험 기록을 확인해 봐':'다음 코딩을 기다리는 중');
  $('mode-tag').textContent=s.demo?'DEMO':'LIVE';
  $('connection-label').textContent=s.demo?'미리보기':s.source.connected?'Codex 연결됨':'Codex 기다리는 중';
  $('connection-label').parentElement.classList.toggle('live',s.source.connected&&!s.demo);$('connection-label').title=s.demo?'미리보기 · 경험치 별도':s.source.error||'로컬 작업 상태만 읽어요';
  s.limits.forEach((limit,i)=>{const prefix=i===0?'limit-a':'limit-b';$(prefix+'-value').textContent=limit.left===null?'미제공':limit.left+'%';$(prefix+'-bar').style.width=(limit.left??0)+'%';});
  if($('party').dataset.ids!==s.slots.map(p=>p.uid).join(',')){
    $('party').replaceChildren(...s.slots.map((p,i)=>{const b=document.createElement('button');b.dataset.slot=i;b.onclick=()=>window.buddy.action('select',Number(b.dataset.id));const img=document.createElement('img');img.alt='';b.append(img,document.createElement('small'));return b;}));$('party').dataset.ids=s.slots.map(p=>p.uid).join(',');
  }
  s.slots.forEach((p,i)=>{const b=$('party').children[i];b.dataset.id=p.uid;b.disabled=p.boarded||p.fainted;b.title=p.name+' Lv.'+p.level+(p.boarded?' · 키우미집':p.fainted?' · 기절':' · 클릭하여 출전');b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(p.selected));b.classList.toggle('fainted',p.fainted);const img=b.firstChild;if(img.getAttribute('src')!=='assets/'+p.id+'.gif')img.src='assets/'+p.id+'.gif';b.lastChild.textContent=p.boarded?'맡김':p.fainted?'기절':'Lv.'+p.level;});
  $('caught-count').textContent=s.caughtCount+' / '+(s.generation===1?151:251);$('badge-count').textContent=s.badges.length+' / 8';
  eventFx(s.animation);refreshScene();
});
