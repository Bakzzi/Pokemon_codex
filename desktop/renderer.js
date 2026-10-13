'use strict';
const $=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString('ko-KR');
let serial=0,current=null,switching=false,timers=[],animations=[];
for(const action of ['pin','compact','hide','close'])$(action).onclick=()=>window.buddy.action(action);
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>window.buddy.action('panel',b.dataset.panel);
function sprite(element,p){const img=$(element),src='assets/'+p.id+'.gif';if(img.getAttribute('src')!==src)img.src=src;img.alt=p.name;}
function later(fn,ms){timers.push(setTimeout(fn,ms));}
function animate(element,frames,options){const a=element.animate(frames,{fill:'none',...options});animations.push(a);return a;}
function clearFx(){timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];switching=false;$('ball-fx').style.display='none';$('attack-fx').style.display='none';$('hero-image').style.opacity='1';$('foe-image').style.opacity='1';}
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
  }else if(e.kind==='capture'){
    ball.style.left='74px';ball.style.display='block';
    animate(ball,[{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:'translate(90px,-65px) rotate(260deg)',opacity:1,offset:.5},{transform:'translate(186px,0) rotate(540deg)',opacity:1}],{duration:350,fill:'forwards'});
    later(()=>{animate(foe,[{transform:'scale(1)',filter:'brightness(2)'},{transform:'scale(0)',opacity:0}],{duration:180,fill:'forwards'});},250);
    later(()=>animate(ball,[{transform:'translate(186px,0) rotate(-20deg)'},{transform:'translate(186px,0) rotate(20deg)'},{transform:'translate(186px,0) rotate(0deg)'}],{duration:180,iterations:Math.max(1,e.shakes),fill:'forwards'}),450);
    later(()=>{clearFx();renderFoe(current);},1250);
  }else if(e.kind==='attack'&&e.move){
    const attacker=e.actor==='hero'?$('hero'):$('foe'),target=e.actor==='hero'?$('foe'):$('hero'),sign=e.actor==='hero'?1:-1;
    animate(attacker,[{translate:'0 0'},{translate:(sign*11)+'px -3px',offset:.4},{translate:'0 0'}],{duration:380});
    const styles={10:['♨','#ff9471'],11:['●','#75c9ee'],12:['❧','#9cda75'],13:['ϟ','#f6db63'],14:['◎','#f3a9cf'],15:['❄','#a9eff1'],8:['◉','#b49de6'],4:['●','#bd8fd8'],16:['◆','#b9a4f7'],5:['▰','#c9af7d'],6:['◆','#c8b58e'],3:['≋','#b8c6e9'],2:['✦','#f4bb84']};
    const [shape,color]=styles[e.moveType]||['✦','#eee5c9'],fx=$('attack-fx');fx.textContent=shape;fx.style.color=color;fx.style.left=e.actor==='hero'?'135px':'215px';fx.style.display='block';
    animate(fx,[{transform:'translateX(0) scale(.4)',opacity:0},{transform:'translateX('+(sign*35)+'px) scale(1)',opacity:1,offset:.45},{transform:'translateX('+(sign*70)+'px) scale(1.2)',opacity:0}],{duration:480});
    if(e.damage>0)later(()=>animate(target,[{translate:'0 0',opacity:1},{translate:(sign*5)+'px 0',opacity:.4},{translate:'0 0',opacity:1}],{duration:220}),250);
    later(()=>{$('attack-fx').style.display='none';},500);
  }
}
function renderFoe(s){
  const capture=s.animation?.kind==='capture'&&s.animation.caught&&Date.now()-s.animation.at<1300;
  $('foe').hidden=!s.foe&&!capture;$('foe-ground').hidden=!s.foe&&!capture;$('empty-foe').hidden=!!s.foe||capture;
  if(s.foe){sprite('foe-image',s.foe);$('foe-name').textContent=s.foe.name+' Lv.'+s.foe.level;$('foe-hp').style.width=Math.max(0,s.foe.hp*100)+'%';}
}
window.buddy.onState(s=>{
  current=s;document.body.classList.toggle('compact',s.compact);document.documentElement.style.setProperty('--accent',s.accent);
  $('pin').setAttribute('aria-pressed',String(s.pinned));$('compact').title=s.compact?'상태창 펼치기':'작게 보기';
  if(!switching)sprite('hero-image',s.hero);renderFoe(s);
  $('hero-name').textContent=s.hero.name;$('level').textContent=s.level;$('hero-hp').style.width=Math.max(0,s.hero.hp*100)+'%';
  $('region').textContent=s.generation===1?'KANTO ADVENTURE':'KANTO + JOHTO';$('exp').textContent=s.level===100?'MAX LEVEL':fmt(s.expCurrent)+' / '+fmt(s.expRequired);
  $('xp-bar').style.width=s.progress*100+'%';$('evolution').textContent=s.evolution.some(e=>e.ready)?'진화 가능 · 도감에서 확인':'';
  $('status').textContent=s.notice||(s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.phase==='working'?'Codex 작업과 함께 모험 중':s.workTokens>=250?'작업의 여운으로 모험을 이어가는 중':s.phase==='done'?'작업 끝! 모험 기록을 확인해 봐':'다음 코딩을 기다리는 중');
  const recent=s.animation&&Date.now()-s.animation.at<5000;
  $('speech').textContent=recent?s.animation.text:s.battle?.kind==='trainer'?s.battle.boss+'에게 도전 중':s.battle?'다음 작업과 함께 배틀을 이어가요':'오늘은 어떤 포켓몬을 만날까?';
  $('speech').title=s.animation?.detail||$('speech').textContent;$('mode-tag').textContent=s.demo?'DEMO':'LIVE';
  $('connection-label').textContent=s.demo?'미리보기 · 경험치 별도':s.source.connected?'Codex 연결됨':'Codex 기다리는 중';
  $('connection-label').parentElement.classList.toggle('live',s.source.connected&&!s.demo);$('connection-label').title=s.source.error||'로컬 작업 상태만 읽어요';
  s.limits.forEach((limit,i)=>{const prefix=i===0?'limit-a':'limit-b';$(prefix+'-value').textContent=limit.left===null?'미제공':limit.left+'%';$(prefix+'-bar').style.width=(limit.left??0)+'%';});
  if($('party').dataset.ids!==s.slots.map(p=>p.uid).join(',')){
    $('party').replaceChildren(...s.slots.map((p,i)=>{const b=document.createElement('button');b.dataset.slot=i;b.onclick=()=>window.buddy.action('select',Number(b.dataset.id));const img=document.createElement('img');img.alt='';b.append(img,document.createElement('small'));return b;}));$('party').dataset.ids=s.slots.map(p=>p.uid).join(',');
  }
  s.slots.forEach((p,i)=>{const b=$('party').children[i];b.dataset.id=p.uid;b.disabled=p.boarded;b.title=p.name+' Lv.'+p.level+(p.boarded?' · 키우미집':' · 클릭하여 출전');b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(p.selected));b.classList.toggle('fainted',p.fainted);const img=b.firstChild;if(img.getAttribute('src')!=='assets/'+p.id+'.gif')img.src='assets/'+p.id+'.gif';b.lastChild.textContent=p.boarded?'맡김':'Lv.'+p.level;});
  $('caught-count').textContent=s.caughtCount+' / '+(s.generation===1?151:251);$('badge-count').textContent=s.badges.length+' / 8';
  eventFx(s.animation);
});
