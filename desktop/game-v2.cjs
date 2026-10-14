'use strict';
const {monthOf,levelOf}=require('./season.cjs');
const {data:db,species,moves,xpAt,levelAt,learnedMoves,view,pickWild,rarity,balance,wildMinimum,statsAt,encounterChances,championBonus}=require('./pokemon.cjs');
const battleEngine=require('./battle.cjs');
const {combatant,tryCatch,abilityFor}=battleEngine;
const journal=require('./journal.cjs');
const {captureTiming,captureText}=require('./capture-animation.js');
const pacing=require('./battle-pacing.js');
const validCount=n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const STARTERS=[1,4,7,25];
const CAPTURE_LIMITS={yellow:2,red:3};
const nursery=require('./daycare.cjs');
function healthView(p){return {hp:p.hp/p.maxHp,currentHp:Math.max(0,Math.ceil(p.hp)),maxHp:p.maxHp,status:p.status||null};}
function captureCounts(b){
  if(!b.captureByHealth){
    // Earlier versions only threw below 10% HP, so existing attempts belong to red HP.
    b.captureByHealth={yellow:0,red:Math.min(3,validCount(b.captureAttempts)?b.captureAttempts:0)};
  }
  return b.captureByHealth;
}
function hasJohtoProgress(data){
  const ids=[...Object.keys(data.seen||{}),...Object.keys(data.caught||{}),...Object.values(data.owned||{}).map(p=>p.id),data.egg?.id,...(data.daycare?.offspring||[])];
  return ids.some(id=>species.get(Number(id))?.generation===2);
}
class Game {
  constructor(saved={},now=Date.now(),{random=Math.random}={}){
    this.random=random;this.sessions=new Map();this.limits={};this.lastEvent=0;this.nextTick=now;
    this.data=saved.version===2?JSON.parse(JSON.stringify(saved)):{version:2,outputTokens:saved.outputTokens||0,totalTokens:saved.totalTokens||0,baselines:saved.baselines||{},owned:{},seen:{},caught:{},slots:[...STARTERS],activeId:25,badges:[],champion:false,leagueBest:0,inventory:{},workTokens:0,battles:0,journal:[],eventSerial:0,animation:null,battle:null,suspendedWild:null,switchUntil:0};
    this.data.nextUid=this.data.nextUid||1000;this.data.daycare=this.data.daycare||null;this.data.egg=this.data.egg||null;this.daycareSelection=null;
    this.data.pendingBattle=this.data.pendingBattle||null;
    // Keep existing Gen II progress available; old champions with no Gen II progress choose now.
    if(typeof this.data.johtoUnlocked!=='boolean')this.data.johtoUnlocked=!!this.data.champion&&hasJohtoProgress(this.data);
    this.data.johtoDeferred=!!this.data.johtoDeferred&&!this.data.johtoUnlocked;
    for(const b of [this.data.battle,this.data.suspendedWild])if(b?.kind==='wild')captureCounts(b);
    const queued=this.data.pendingChallenge;
    this.data.pendingChallenge=queued&&Number.isInteger(queued.index)&&queued.index>=0&&queued.index<=8?queued:null;
    journal.init(this.data,now);
    for(const [uid,p] of Object.entries(this.data.owned)){
      p.uid=Number(uid);p.gender=p.gender||nursery.genderFor(p.id,this.random);
      p.abilitySlot=p.abilitySlot??Math.floor(this.random()*species.get(p.id).abilities.length);p.ability=abilityFor(p.id,p.abilitySlot);
      if(this.data.rulesRevision!==3){
        let recovered=[];
        if(['starter','migration'].includes(p.origin)){
          let child=species.get(p.id),parent=species.get(child.preEvolution);
          while(parent&&parent.generation<=species.get(p.id).generation&&parent.generation<=this.maxGeneration()){const e=parent.evolutions.find(e=>e.to===child.id);recovered=learnedMoves(parent.id,Math.min(p.level,e?.level||p.level),recovered);child=parent;parent=species.get(child.preEvolution);}
        }
        p.moves=learnedMoves(p.id,p.level,[...recovered,...p.moves]);
      }
    }
    if(this.data.rulesRevision!==3)for(const b of [this.data.battle,this.data.suspendedWild].filter(Boolean)){
      for(const [uid,m] of Object.entries(b.party)){const p=this.data.owned[uid];m.moves=[...p.moves];m.ability=p.ability;m.gender=p.gender;for(const id of p.moves)if(m.pp[id]===undefined)m.pp[id]=moves.get(id).pp;}
      delete b.round;battleEngine.invalidate(b);
    }
    this.data.rulesRevision=3;
    for(const id of STARTERS)if(!this.data.caught[id])this.addPokemon(id,5,'starter',now);
    if(saved.version!==2&&saved.family){
      const level=Math.max(5,levelOf((saved.outputTokens||0)/5000));
      const forms={electric:[25,25,26],fire:[4,5,6],water:[7,8,9],grass:[1,2,3]};
      const id=(forms[saved.family]||forms.electric)[level>=36?2:level>=16?1:0];
      const uid=Object.values(this.data.owned).find(p=>p.id===id)?.uid||this.addPokemon(id,level,'migration',now);
      const record=this.data.owned[uid];record.level=level;record.xp=xpAt(id,level);record.moves=learnedMoves(id,level);this.data.activeId=uid;
      if(!this.data.slots.includes(id))this.data.slots[this.data.slots.indexOf((forms[saved.family]||forms.electric)[0])]=id;
    }
    this.data.slots=this.data.slots.filter(id=>this.data.owned[id]&&species.get(this.data.owned[id].id)?.generation<=this.maxGeneration());
    for(const id of Object.keys(this.data.owned).map(Number))if(this.data.slots.length<4&&!this.data.slots.includes(id)&&species.get(this.data.owned[id].id)?.generation<=this.maxGeneration())this.data.slots.push(id);
    if(!this.data.slots.includes(this.data.activeId))this.data.activeId=this.data.slots[0];
  }
  maxGeneration(){return this.data.champion&&this.data.johtoUnlocked?2:1;}
  encounterBonus(){
    if(!this.data.champion)return null;
    const selected=this.data.slots.map(uid=>this.data.owned[uid]).filter(Boolean),minimumLevel=selected.length===4?Math.min(...selected.map(p=>p.level)):0;
    return {...championBonus(minimumLevel),minimumLevel,rates:encounterChances(true,minimumLevel)};
  }
  stayInKanto(now=Date.now()){
    if(!this.data.champion||this.data.johtoUnlocked||this.data.johtoDeferred)return false;
    this.data.johtoDeferred=true;this.log('관동에 머물며 151종 도감 수집을 계속하기로 했다.','region',null,now);return true;
  }
  unlockJohto(now=Date.now()){
    if(!this.data.champion||this.data.johtoUnlocked)return false;
    this.data.johtoUnlocked=true;this.data.johtoDeferred=false;
    this.log('성도 지방을 선택했다! 2세대 100종이 해금되었다.','unlock',null,now);return true;
  }
  isBoarded(uid){return this.data.daycare?.parents.includes(Number(uid))||false;}
  addPokemon(id,level,origin,now=Date.now(),register=true){
    if(!species.has(id)||species.get(id).generation>this.maxGeneration())return false;
    let uid=id;if(this.data.owned[uid]){while(this.data.owned[this.data.nextUid])this.data.nextUid++;uid=this.data.nextUid++;}
    const abilitySlot=Math.floor(this.random()*species.get(id).abilities.length);
    this.data.owned[uid]={uid,id,level,xp:xpAt(id,level),moves:learnedMoves(id,level),abilitySlot,ability:abilityFor(id,abilitySlot),happiness:70,gender:nursery.genderFor(id,this.random),origin,obtainedAt:now};
    this.data.seen[id]=this.data.seen[id]||now;if(register)this.data.caught[id]=this.data.caught[id]||now;return uid;
  }
  log(text,kind='info',id=null,now=Date.now()){journal.record(this.data,{at:now,text,kind,id});}
  acknowledgeJournal(now=Date.now()){journal.acknowledge(this.data,now);return true;}
  memberCombatant(p){return combatant(p.id,p.level,p.moves,p);}
  animate(kind,details={},now=Date.now()){
    if(kind!=='capture'&&this.data.captureAnimation&&!this.data.captureAnimation.caught)this.data.captureAnimation=null;
    this.data.animation={serial:++this.data.eventSerial,kind,at:now,...details};
    if(kind==='switch'){this.data.animation.fromName=species.get(details.from).name;this.data.animation.toName=species.get(details.to).name;}
    if(kind!=='capture'){
      this.data.animation.duration=pacing.duration(this.data.animation);
      this.holdUntil(now+this.data.animation.duration);
    }
  }
  holdUntil(at){this.data.switchUntil=Math.max(this.data.switchUntil||0,at);this.nextTick=Math.max(this.nextTick,at);}
  deferBattle(kind,at){this.data.pendingBattle={kind,at};this.holdUntil(at);}
  showFaint(now){
    const b=this.data.battle,hero=b.party[this.data.activeId],sides=[];
    if(hero.hp<=0)sides.push('hero');if(b.foe.hp<=0)sides.push('foe');
    this.animate('faint',{sides,text:sides.map(side=>species.get(side==='hero'?hero.id:b.foe.id).name+' 기절!').join(' · ')},now);
    this.deferBattle('faint',now+this.data.animation.duration);
  }
  finishBattleEvent(now){
    const pending=this.data.pendingBattle;this.data.pendingBattle=null;
    const b=this.data.battle;if(!b)return false;
    if(pending.kind==='capture'){this.capture(now);return true;}
    if(pending.kind==='capture-result')return this.finishCapture(pending,now);
    if(pending.kind==='after-action'){this.showFaint(now);return true;}
    if(pending.kind==='draw'){
      this.log('긴 배틀을 마치고 회복했다','draw',null,now);
      if(b.kind==='trainer')this.endChallenge(false,now);else{this.data.battle=null;this.animate('result',{text:'긴 배틀을 마치고 잠시 쉬어가요.'},now);}
      return true;
    }
    const hero=b.party[this.data.activeId];
    if(hero.hp<=0&&b.kind==='trainer'&&!this.availablePartners().length){this.endChallenge(false,now);return true;}
    if(b.foe.hp<=0){
      this.defeatOpponent(now);if(this.data.battle!==b)return true;
      if(b.simBoss!==b.bossIndex)battleEngine.invalidate(b);
      if(hero.hp<=0)this.deferBattle('replace',this.data.switchUntil);
    }else if(hero.hp<=0)this.handleFaint(now);
    return true;
  }
  availablePartners(){
    const b=this.data.battle;
    return this.data.slots.filter(uid=>{
      const p=this.data.owned[uid];
      return p&&species.get(p.id).generation<=this.maxGeneration()&&!this.isBoarded(uid)&&
        (!b||(b.party[uid]?b.party[uid].hp>0:b.kind==='wild'));
    });
  }
  switchToLowest(reason,now){
    const available=this.availablePartners();if(!available.length)return false;
    const levels=available.map(uid=>this.data.owned[uid].level),lowest=Math.min(...levels);
    if(reason==='balance'&&(this.data.battle||Math.max(...levels)-lowest<5))return false;
    const from=this.data.owned[this.data.activeId];
    // Keep an already-lowest partner; otherwise break ties by the user's slot order.
    const next=available.includes(from.uid)&&from.level===lowest?from.uid:available.find(uid=>this.data.owned[uid].level===lowest);
    if(!this.select(next,now))return false;
    const to=this.data.owned[next],text=reason==='faint'?
      `${species.get(from.id).name} 기절 · ${species.get(to.id).name} Lv.${to.level} 출전`:
      `레벨 균형 · ${species.get(from.id).name} Lv.${from.level} → ${species.get(to.id).name} Lv.${to.level}`;
    this.data.animation.reason=reason;this.data.animation.text=text;
    this.log(text,'switch',to.id,now);return true;
  }
  handleFaint(now){
    if(this.switchToLowest('faint',now))return;
    const b=this.data.battle;
    if(b.kind==='trainer')this.endChallenge(false,now);
    else{const text=`${species.get(b.foe.id).name}에게 패배 · 동료들을 회복했다`;this.log(text,'loss',null,now);this.data.battle=null;this.animate('result',{text},now);}
  }
  select(id,now=Date.now()){
    id=Number(id);
    if(!this.data.owned[id]||species.get(this.data.owned[id].id).generation>this.maxGeneration()||this.isBoarded(id)||id===this.data.activeId||this.data.pendingBattle||now<this.data.switchUntil)return false;
    const battle=this.data.battle;
    if(battle&&(battle.party[id]?.hp<=0||(battle.kind==='trainer'&&!battle.party[id])))return false;
    if(battle&&!battleEngine.canSwitch(this,battle,id))return false;
    if(!this.data.slots.includes(id)){if(battle?.kind==='trainer')return false;this.data.slots[this.data.slots.indexOf(this.data.activeId)]=id;}
    const from=this.data.activeId,fromPokemon=this.snapshot(now).hero;this.data.activeId=id;
    if(battle){if(!battle.party[id]){battle.party[id]=this.memberCombatant(this.data.owned[id]);battleEngine.invalidate(battle);}battle.pendingSwitch=id;}
    this.animate('switch',{from:this.data.owned[from].id,to:this.data.owned[id].id,fromPokemon,toPokemon:this.snapshot(now).hero,text:`${species.get(this.data.owned[id].id).name}, 너로 정했다!`},now);return true;
  }
  setSlot(slot,id,now=Date.now()){
    slot=Number(slot);id=Number(id);
    if(!Number.isInteger(slot)||slot<0||slot>3||!this.data.owned[id]||species.get(this.data.owned[id].id).generation>this.maxGeneration()||this.isBoarded(id)||this.data.battle?.kind==='trainer'||this.data.pendingBattle||now<this.data.switchUntil)return false;
    const old=this.data.slots[slot],other=this.data.slots.indexOf(id);if(old===id)return true;
    if(old===this.data.activeId){if(!this.select(id,now))return false;this.data.slots[slot]=id;if(other>=0)this.data.slots[other]=old;}
    else {this.data.slots[slot]=id;if(other>=0)this.data.slots[other]=old;}return true;
  }
  evolutions(id,now=Date.now()){
    const p=this.data.owned[id];if(!p)return [];
    return species.get(p.id).evolutions.filter(e=>species.get(e.to)?.generation<=this.maxGeneration()).map(e=>{
      const hour=new Date(now+9*3600000).getUTCHours(),day=hour>=4&&hour<18;
      let ready=(!e.level||p.level>=e.level)&&(!e.happiness||p.happiness>=e.happiness)&&(!e.item||(this.data.inventory[e.item]||0)>0)&&(!e.time||(e.time==='day'?day:!day));
      if(e.relativeStats!==null){const s=combatant(p.id,p.level,p.moves).stats;ready=ready&&Math.sign(s[2]-s[3])===e.relativeStats;}
      const item=db.items.find(i=>i.id===e.item);
      const conditions=[e.level&&`Lv.${e.level}`,e.happiness&&`친밀도 ${p.happiness}/${e.happiness}`,e.time==='day'&&'낮',e.time==='night'&&'밤',item&&`${item.name} ${(this.data.inventory[e.item]||0)}개`,e.trigger===2&&'교환소에서 교환'].filter(Boolean).join(' · ');
      return {...e,name:species.get(e.to).name,ready:ready&&!this.isBoarded(id),conditions};
    });
  }
  evolve(uid,to,now=Date.now()){
    uid=Number(uid);to=Number(to);if(this.data.battle?.kind==='trainer'||this.data.pendingBattle||now<this.data.switchUntil||this.isBoarded(uid))return false;
    const rule=this.evolutions(uid,now).find(e=>e.to===to&&e.ready);if(!rule)return false;
    const p=this.data.owned[uid],from=p.id,fromPokemon=this.snapshot(now).hero;if(rule.item)this.data.inventory[rule.item]--;
    p.id=to;p.ability=abilityFor(to,p.abilitySlot);p.moves=learnedMoves(to,p.level,p.moves,p.level-1);p.xp=xpAt(to,p.level)+Math.max(0,p.xp-xpAt(from,p.level));
    this.data.seen[to]=this.data.seen[to]||now;this.data.caught[to]=this.data.caught[to]||now;
    const old=this.data.battle?.party[uid];
    if(old){const fresh=this.memberCombatant(p);fresh.hp=old.hp>0?Math.max(1,Math.round(fresh.maxHp*old.hp/old.maxHp)):0;this.data.battle.party[uid]=fresh;battleEngine.invalidate(this.data.battle);}
    this.log(species.get(from).name+' → '+species.get(to).name+' 진화!','evolution',to,now);
    if(this.data.activeId===uid)this.animate('switch',{from,to,fromPokemon,toPokemon:this.snapshot(now).hero,text:species.get(to).name+'로 진화했다!'},now);return true;
  }
  newWild(now){
    this.data.pendingBattle=null;
    this.data.captureAnimation=null;
    const hero=this.data.owned[this.data.activeId],id=pickWild(this.maxGeneration(),this.random,hero.level,{champion:this.data.champion,caught:this.data.caught,minimumLevel:this.encounterBonus()?.minimumLevel||0}),p=species.get(id);
    const level=Math.max(wildMinimum(p),Math.min(100,hero.level-5+Math.floor(this.random()*11)));
    const party=Object.fromEntries(this.data.slots.filter(uid=>!this.isBoarded(uid)).map(uid=>[uid,this.memberCombatant(this.data.owned[uid])]));
    this.data.battle={kind:'wild',foe:combatant(id,level,null,{abilitySlot:Math.floor(this.random()*p.abilities.length),gender:nursery.genderFor(id,this.random)}),party,turn:0,captureAttempts:0,captureByHealth:{yellow:0,red:0},startedAt:now};
    const first=!this.data.seen[id];this.data.seen[id]=this.data.seen[id]||now;
    this.animate('encounter',{text:`야생 ${p.name} Lv.${level} 등장!`,id},now);
    if(first||p.legendary||p.mythical)this.log(`${p.name} Lv.${level} 발견`,'encounter',id,now);
  }
  canChallenge(index){
    return Number.isInteger(index)&&index>=0&&index<=8&&(index===8?this.data.badges.length>=8:index<=this.data.badges.length&&!this.data.badges.includes(db.bosses[index].id));
  }
  challengeName(index){return index===8?'포켓몬 리그':db.bosses[index].name+' 체육관';}
  challenge(index,now=Date.now()){
    index=Number(index);
    if(!this.canChallenge(index)||this.data.battle?.kind==='trainer')return false;
    if(this.data.pendingChallenge)return this.data.pendingChallenge.index===index;
    if(this.data.battle||this.data.pendingBattle||now<this.data.switchUntil||now<this.nextTick){
      this.data.pendingChallenge={index,queuedAt:now};
      this.log(this.challengeName(index)+' 도전 예약 · 현재 배틀 종료 후 시작','challenge',null,now);return true;
    }
    return this.startChallenge(index,now);
  }
  cancelChallenge(now=Date.now()){
    if(!this.data.pendingChallenge)return false;
    this.log(this.challengeName(this.data.pendingChallenge.index)+' 도전 예약 취소','challenge',null,now);
    this.data.pendingChallenge=null;return true;
  }
  startChallenge(index,now){
    if(!this.canChallenge(index)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
    this.data.pendingChallenge=null;
    this.data.captureAnimation=null;
    this.data.suspendedWild=null;
    const party=Object.fromEntries(this.data.slots.filter(id=>!this.isBoarded(id)).map(id=>{const p=this.data.owned[id];return [id,this.memberCombatant(p)];}));
    this.data.battle={kind:'trainer',bossIndex:index,foeIndex:0,party,turn:0,captureAttempts:0,startedAt:now};
    this.nextTrainer(now);
    this.log(this.challengeName(index)+' 도전 시작','challenge',null,now);return true;
  }
  nextTrainer(now){
    const b=this.data.battle,boss=db.bosses[b.bossIndex],enemy=boss.team[b.foeIndex];
    b.foe=combatant(enemy.id,enemy.level,enemy.moves);b.turn=0;
    this.data.seen[enemy.id]=this.data.seen[enemy.id]||now;this.animate('encounter',{id:enemy.id,text:`${boss.name}의 ${species.get(enemy.id).name}!`},now);
  }
  abandon(now=Date.now()){
    if(this.data.battle?.kind!=='trainer')return false;
    this.data.pendingBattle=null;
    this.log('도전을 마치고 모험으로 돌아왔다','challenge',null,now);this.endChallenge(true,now);return true;
  }
  endChallenge(won,now){
    const b=this.data.battle,boss=db.bosses[b.bossIndex];if(!won)this.log(`${boss.name}에게 패배 · 포켓몬들이 회복했다`,'loss',null,now);
    this.data.pendingBattle=null;
    this.data.battle=this.data.suspendedWild;this.data.suspendedWild=null;
    if(this.data.battle&&!this.data.battle.party[this.data.activeId]){const p=this.data.owned[this.data.activeId];this.data.battle.party[p.uid]=this.memberCombatant(p);battleEngine.invalidate(this.data.battle);}
    if(this.data.animation?.kind!=='champion')this.animate('result',{text:won?(this.data.badges.includes(boss.id)?boss.badge+' 획득!':'모험으로 돌아왔어!'):'포켓몬들이 기절했다. 잠시 쉬고 다시 도전하자!'},now);
  }
  awardXp(foe,trainer,now){
    const p=this.data.owned[this.data.activeId],before=p.level;
    const gained=Math.max(1,Math.floor(species.get(foe.id).baseExperience*foe.level/7*(trainer?1.5:1)));
    journal.increment(this.data,'xp',Math.min(gained,xpAt(p.id,100)-p.xp));
    p.xp=Math.min(xpAt(p.id,100),p.xp+gained);p.level=levelAt(p.id,p.xp);p.happiness=Math.min(255,p.happiness+3);
    if(p.level>before){
      p.moves=learnedMoves(p.id,p.level,p.moves,before);this.log(`${species.get(p.id).name} Lv.${before} → Lv.${p.level}`,'level',p.id,now);
      const mon=this.data.battle?.party[p.uid];if(mon){const fresh=combatant(p.id,p.level,p.moves),diff=fresh.maxHp-mon.maxHp;mon.level=p.level;mon.stats=fresh.stats;mon.maxHp=fresh.maxHp;mon.hp=Math.min(mon.maxHp,mon.hp+diff);mon.moves=[...p.moves];for(const id of p.moves)if(mon.pp[id]===undefined)mon.pp[id]=moves.get(id).pp;}
    }return gained;
  }
  defeatOpponent(now,captured=false){
    const b=this.data.battle,foe=b.foe;this.awardXp(foe,b.kind==='trainer',now);this.data.battles++;journal.increment(this.data,'wins');
    if(b.kind==='wild'){
      if(!captured)this.log(`${species.get(foe.id).name}와의 배틀 승리`,'win',foe.id,now);
      if(this.random()<0.015){
        const candidates=[...new Set(db.pokemon.filter(p=>p.generation<=this.maxGeneration()).flatMap(p=>p.evolutions.filter(e=>species.get(e.to)?.generation<=this.maxGeneration()).map(e=>e.item)).filter(Boolean))];
        const id=candidates[Math.floor(this.random()*candidates.length)];if(id){this.data.inventory[id]=(this.data.inventory[id]||0)+1;this.log(`${db.items.find(i=>i.id===id)?.name||'진화 도구'} 발견`,'item',null,now);}
      }
      this.data.battle=null;if(!captured)this.animate('result',{text:species.get(foe.id).name+'와의 배틀 승리!'},now);return;
    }
    b.foeIndex++;
    if(b.foeIndex<db.bosses[b.bossIndex].team.length){this.nextTrainer(now);return;}
    const boss=db.bosses[b.bossIndex];this.log(`${boss.name}에게 승리!${boss.badge?' '+boss.badge+' 획득':''}`,'badge',null,now);
    if(b.bossIndex<8){if(!this.data.badges.includes(boss.id))this.data.badges.push(boss.id);this.endChallenge(true,now);}
    else if(b.bossIndex<12){this.data.leagueBest=Math.max(this.data.leagueBest,b.bossIndex-7);b.bossIndex++;b.foeIndex=0;this.nextTrainer(now);}
    else {
      const first=!this.data.champion;this.data.champion=true;this.data.leagueBest=5;
      this.log(first?'관동 챔피언 달성! 출현 보너스를 얻었다. 성도 지방은 원할 때 선택할 수 있다.':'관동 챔피언 타이틀을 지켰다!','champion',null,now);
      this.animate('champion',{text:first?'관동 챔피언! 출현 보너스 획득!':'관동 챔피언 타이틀 방어!'},now);this.endChallenge(true,now);
    }
  }
  damageFoe(amount){
    const b=this.data.battle;b.foe.hp=Math.max(0,b.foe.hp-amount);
  }
  captureOpportunity(b=this.data.battle){
    if(!b||b.kind!=='wild'||b.foe.hp<=0||this.data.caught[b.foe.id])return null;
    const hp=b.foe.hp/b.foe.maxHp,band=hp<=.2?'red':hp<=.5?'yellow':null;
    if(!band)return null;
    const used=captureCounts(b)[band],limit=CAPTURE_LIMITS[band];
    return used<limit?{band,used,limit}:null;
  }
  capture(now){
    const b=this.data.battle,opportunity=this.captureOpportunity(b),playing=this.data.captureAnimation;
    if(!opportunity||this.data.pendingBattle?.kind==='capture-result'||playing&&now<playing.at+captureTiming(playing).duration)return false;
    const outcome=tryCatch(species.get(b.foe.id).catchRate,b.foe.hp,b.foe.maxHp,b.foe.status,this.random);b.captureAttempts++;
    const bandAttempt=++captureCounts(b)[opportunity.band],quota={band:opportunity.band,bandAttempt,bandLimit:opportunity.limit};
    const previous=this.data.animation,leadIn=previous?.kind==='attack'&&previous.moveId&&previous.at===now?previous:null;
    const startsAt=now+(leadIn?pacing.duration(leadIn):0);
    this.animate('capture',{id:b.foe.id,name:species.get(b.foe.id).name,level:b.foe.level,...healthView(b.foe),caught:outcome.caught,shakes:outcome.shakes,attempt:b.captureAttempts,...quota,leadIn,text:captureText(quota)},startsAt);
    this.data.captureAnimation={...this.data.animation};
    const finishedAt=startsAt+captureTiming(outcome).duration;
    if(outcome.caught){
      // Persist the rolled result, but keep HP, ownership and rewards unchanged until playback ends.
      this.deferBattle('capture-result',finishedAt);this.data.pendingBattle.serial=this.data.captureAnimation.serial;
    }else{
      this.holdUntil(finishedAt);
    }
    return outcome.caught;
  }
  finishCapture(pending,now){
    const b=this.data.battle,c=this.data.captureAnimation;
    if(!b||b.kind!=='wild'||!c?.caught||c.serial!==pending.serial||c.id!==b.foe.id||c.attempt!==b.captureAttempts||this.data.caught[b.foe.id])return false;
    const uid=this.addPokemon(b.foe.id,b.foe.level,'catch',now),p=this.data.owned[uid];
    p.ability=b.foe.ability||p.ability;p.abilitySlot=Math.max(0,species.get(p.id).abilities.indexOf(p.ability));p.gender=b.foe.gender||p.gender;
    this.log(`${species.get(b.foe.id).name} Lv.${b.foe.level} 포획! (${b.captureAttempts}번째 몬스터볼)`,'catch',b.foe.id,now);
    this.defeatOpponent(now,true);return true;
  }
  tick(now=Date.now()){
    if(now<this.nextTick||now<this.data.switchUntil)return false;let b=this.data.battle;
    if(this.data.pendingBattle){
      if(now<this.data.pendingBattle.at)return false;
      if(this.data.pendingBattle.kind==='replace'){this.data.pendingBattle=null;this.handleFaint(now);return true;}
      return this.finishBattleEvent(now);
    }
    if(!b&&this.data.pendingChallenge){
      const index=this.data.pendingChallenge.index;
      if(this.startChallenge(index,now))return true;
      this.cancelChallenge(now);
    }
    // Rotation is free and waits until the previous battle's result has been shown.
    // The next wild encounter is then scaled to the newly selected partner.
    if(!b&&this.switchToLowest('balance',now))return true;
    if(b&&(b.party[this.data.activeId]?.hp<=0||b.foe.hp<=0)){this.showFaint(now);return true;}
    if(b?.kind!=='trainer'){
      if(this.data.workTokens<balance.tokensPerAction)return false;this.data.workTokens-=balance.tokensPerAction;
      if(!b){this.newWild(now);return true;}
    }
    if(!b.party[this.data.activeId]){const p=this.data.owned[this.data.activeId];b.party[p.uid]=this.memberCombatant(p);battleEngine.invalidate(b);}
    const previousHero=this.data.activeId,fromPokemon=this.snapshot(now).hero,heroBefore=healthView(b.party[previousHero]),foeBefore=healthView(b.foe),action=battleEngine.step(this,b);b.turn++;
    const hero=b.party[this.data.activeId],foe=b.foe,move=action.move&&moves.get(action.move);
    if(action.switched&&previousHero!==this.data.activeId){
      this.animate('switch',{from:this.data.owned[previousHero].id,to:hero.id,fromPokemon,toPokemon:this.snapshot(now).hero,text:species.get(hero.id).name+', 출전!'},now);
      this.log(species.get(hero.id).name+' 출전','switch',hero.id,now);
    }else{
      const text=move?species.get(action.id||hero.id).name+'의 '+move.name+'!':action.lines[0]||'배틀을 이어가고 있어.';
      this.animate('attack',{actor:action.actor||'hero',id:action.id||hero.id,move:move?.name,moveId:move?.id,moveType:move?.type,moveTarget:action.moveTarget,outcome:action.outcome,hitCount:action.hitCount,damage:move?.damageClass===1?0:action.damage||0,damageCauses:action.damageCauses,hero:{...view(hero.id),level:hero.level,...healthView(hero)},heroBefore,foeBefore,foe:{...view(foe.id),level:foe.level,...healthView(foe)},text,detail:action.lines.filter(line=>line!==text).join(' · ')},now);
    }
    if(action.lines.length)this.log(action.lines.join(' · '),'battle',action.id||hero.id,now);
    const finishedAt=now+this.data.animation.duration;
    if(foe.hp<=0||hero.hp<=0)this.deferBattle('after-action',finishedAt);
    else if(this.captureOpportunity(b))this.deferBattle('capture',finishedAt);
    else if(b.turn>=300)this.deferBattle('draw',finishedAt);
    return true;
  }
  observe(id,event,{baseline=false,now=Date.now()}={}){
    const at=Date.parse(event.timestamp);if(!Number.isFinite(at)||at>now+60000||event.type!=='event_msg')return;const p=event.payload||{};
    if(p.type==='token_count'){
      const counters=p.info?.total_token_usage;
      if(counters&&validCount(counters.output_tokens)&&validCount(counters.total_tokens)){
        const prev=this.data.baselines[id];if(!baseline&&prev&&at>=prev.at){const delta=Math.max(0,counters.output_tokens-prev.output);this.data.outputTokens+=delta;this.data.workTokens+=delta;nursery.advance(this,delta,now);this.data.totalTokens+=Math.max(0,counters.total_tokens-prev.total);}
        if(!prev||at>=prev.at)this.data.baselines[id]={output:counters.output_tokens,total:counters.total_tokens,at};
      }
      if(p.rate_limits&&at>=(this.limits.at||0)){this.limits={at};for(const key of ['primary','secondary']){const l=p.rate_limits[key];if(l&&typeof l.used_percent==='number'&&Number.isFinite(l.used_percent))this.limits[key]={used:Math.max(0,Math.min(100,l.used_percent)),minutes:l.window_minutes,resetsAt:l.resets_at};}}
    }
    this.lastEvent=Math.max(this.lastEvent,at);const s=this.sessions.get(id)||{phase:'idle',at:0};if(at<s.at)return;
    const phases={task_started:'working',task_complete:'done',task_completed:'done',turn_aborted:'idle',error:'error'};
    const phase=phases[p.type]||(p.type==='token_count'?'working':null);
    if(phase){s.phase=baseline&&(phase==='done'||phase==='working'&&now-at>=600000)?'idle':phase;s.at=at;this.sessions.set(id,s);}
  }
  snapshot(now=Date.now()){
    const p=this.data.owned[this.data.activeId],b=this.data.battle,hero=b?.party[p.uid],next=xpAt(p.id,Math.min(100,p.level+1)),floor=xpAt(p.id,p.level),maxHp=hero?.maxHp||statsAt(p.id,p.level)[1];
    const active=[...this.sessions.values()].filter(s=>s.phase==='working'&&now-s.at<600000),recent=[...this.sessions.values()].sort((a,b)=>b.at-a.at)[0];
    const uncertain=[...this.sessions.values()].some(s=>s.phase==='working'&&now-s.at>=600000);
    const phase=active.length?'working':uncertain?'unknown':recent&&now-recent.at<16000?recent.phase:'idle',available=[this.limits.primary,this.limits.secondary].filter(Boolean);
    const limits=[300,10080].map(minutes=>{const l=available.find(x=>x.minutes===minutes),fresh=l&&l.resetsAt*1000>now;return {label:minutes===300?'5시간':'주간',left:fresh?Math.round(100-l.used):null,resetsAt:fresh?l.resetsAt:null};});
    return {version:2,phase,active:active.length,hero:{...view(p.id),uid:p.uid,level:p.level,...healthView(hero||{hp:maxHp,maxHp}),status:hero?.status},level:p.level,accent:view(p.id).accent,xp:p.xp,expCurrent:p.xp-floor,expRequired:next-floor,progress:p.level===100?1:(p.xp-floor)/(next-floor),foe:b?{...view(b.foe.id),level:b.foe.level,...healthView(b.foe),status:b.foe.status}:null,slots:this.data.slots.map(uid=>({...view(this.data.owned[uid].id),uid,level:this.data.owned[uid].level,selected:uid===p.uid,boarded:this.isBoarded(uid),fainted:!!b&&b.party[uid]?.hp<=0})),battle:b?{kind:b.kind,turn:b.turn,captureAttempts:b.captureAttempts,boss:b.kind==='trainer'?db.bosses[b.bossIndex].name:null,foeIndex:b.foeIndex,teamSize:b.kind==='trainer'?db.bosses[b.bossIndex].team.length:null}:null,pendingChallenge:this.data.pendingChallenge?{...this.data.pendingChallenge,name:this.challengeName(this.data.pendingChallenge.index)}:null,animation:this.data.animation,capture:this.data.captureAnimation||null,limits,outputTokens:this.data.outputTokens,workTokens:this.data.workTokens,generation:this.maxGeneration(),caughtCount:Object.keys(this.data.caught).filter(id=>Number(id)<=(this.maxGeneration()===1?151:251)).length,seenCount:Object.keys(this.data.seen).length,badges:this.data.badges,champion:this.data.champion,battles:this.data.battles,evolution:this.evolutions(p.uid,now),month:monthOf(now).key};
  }
  panelState(now=Date.now()){
    const roster=Object.values(this.data.owned).map(p=>({...view(p.id),uid:p.uid,level:p.level,xp:p.xp,gender:p.gender,origin:p.origin,boarded:this.isBoarded(p.uid),moves:p.moves.map(id=>({id,name:moves.get(id).name,type:moves.get(id).type})),ability:db.abilities.find(a=>a.id===p.ability)?.name,evolutions:this.evolutions(p.uid,now)}));
    return {...this.snapshot(now),roster,daycare:nursery.snapshot(this),johtoUnlocked:this.maxGeneration()===2,johtoDeferred:this.data.johtoDeferred,
      kantoCaughtCount:Object.keys(this.data.caught).filter(id=>species.get(Number(id))?.generation===1).length,
      encounterBonus:this.encounterBonus(),
      collection:db.pokemon.filter(p=>p.generation<=this.maxGeneration()).map(p=>{const owned=roster.filter(m=>m.id===p.id);return {id:p.id,seen:!!this.data.seen[p.id],caught:!!this.data.caught[p.id],name:this.data.seen[p.id]?p.name:'???',owned:owned.length>0,count:owned.length,level:owned.length?Math.max(...owned.map(m=>m.level)):null,types:this.data.seen[p.id]?view(p.id).types:[],description:this.data.seen[p.id]?p.description:'아직 만나지 않은 포켓몬',rarity:rarity(p)};}),
      bosses:db.bosses,leagueBest:this.data.leagueBest,journal:[...this.data.journal,...(this.data.battleJournal||[])].sort((a,b)=>b.at-a.at),summary:journal.summary(this.data),inventory:Object.entries(this.data.inventory).filter(([,n])=>n>0).map(([id,count])=>({id:Number(id),name:db.items.find(i=>i.id===Number(id))?.name,count}))};
  }
}
module.exports={Game,STARTERS};
