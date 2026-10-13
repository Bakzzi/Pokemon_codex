'use strict';
// Pinned simulator: @pkmn/sim 0.10.11, Gen III rules, entirely offline.
const {Battle,Dex}=require('@pkmn/sim');
const {data,species,moves,statsAt,learnedMoves}=require('./pokemon.cjs');
const dex=Dex.forGen(3);
const simMoves=new Map(data.moves.map(m=>[m.id,dex.moves.get(m.identifier)]));
const abilities=new Map(data.abilities.map(a=>[a.id,a]));
const abilityIds=new Map(data.abilities.map(a=>[a.identifier.replaceAll('-',''),a.id]));
const statKeys={1:'hp',2:'atk',3:'def',4:'spa',5:'spd',6:'spe',7:'accuracy',8:'evasion'};
const statusCodes={sleep:'slp',freeze:'frz',paralysis:'par',burn:'brn',poison:'psn',toxic:'tox'};
const statusNames=Object.fromEntries(Object.entries(statusCodes).map(([k,v])=>[v,k]));
const cache=new WeakMap();
const clone=v=>JSON.parse(JSON.stringify(v));
function abilityFor(id,slot=0){const list=species.get(id).abilities;return list[slot%list.length]||list[0];}
function combatant(id,level,known,options={}){
  const stats=statsAt(id,level),list=[...new Set(known?.length?known:learnedMoves(id,level))];
  return {id,level,stats,maxHp:stats[1],hp:stats[1],moves:list,pp:Object.fromEntries(list.map(id=>[id,simMoves.get(id)?.pp||moves.get(id)?.pp||10])),status:null,statusTurns:0,stages:{},ability:options.ability||abilityFor(id,options.abilitySlot),gender:options.gender||'male',happiness:options.happiness??70};
}
function setFor(mon,name){
  return {name,species:species.get(mon.id).identifier,level:mon.level,ability:abilities.get(mon.ability||abilityFor(mon.id)).identifier,
    gender:mon.gender==='female'?'F':['genderless','none'].includes(mon.gender)?'N':'M',nature:'Serious',happiness:mon.happiness??70,
    moves:mon.moves.map(id=>simMoves.get(id)?.id).filter(Boolean),ivs:{hp:15,atk:15,def:15,spa:15,spd:15,spe:15},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}};
}
function readMon(mon){
  return {id:mon.baseSpecies.num,level:mon.level,hp:mon.hp,maxHp:mon.maxhp,stats:{1:mon.maxhp,...Object.fromEntries(Object.entries(statKeys).filter(([n])=>n>1&&n<7).map(([n,k])=>[n,mon.storedStats[k]]))},
    moves:mon.moveSlots.map(s=>dex.moves.get(s.id).num),pp:Object.fromEntries(mon.moveSlots.map(s=>[dex.moves.get(s.id).num,s.pp])),
    status:statusNames[mon.status]||null,statusTurns:mon.statusState.time||0,stages:Object.fromEntries(Object.entries(statKeys).filter(([n])=>n>1).map(([n,k])=>[n,mon.boosts[k]||0])),
    ability:abilityIds.get(mon.baseAbility),gender:mon.gender==='F'?'female':mon.gender==='M'?'male':'none',happiness:mon.happiness};
}
function restoreMon(mon,saved){
  if(!saved)return;
  mon.hp=Math.max(0,Math.min(mon.maxhp,saved.hp/ saved.maxHp*mon.maxhp));
  for(const s of mon.moveSlots){const id=dex.moves.get(s.id).num;s.maxpp=dex.moves.get(s.id).pp;s.pp=Math.min(s.maxpp,saved.pp[id]??s.maxpp);}
  if(saved.status){mon.status=statusCodes[saved.status]||'';mon.statusState=mon.battle.initEffectState({id:mon.status,target:mon,time:saved.statusTurns||2});}
  for(const [n,k] of Object.entries(statKeys))if(n>1&&saved.stages[n]!==undefined)mon.boosts[k]=saved.stages[n];
  if(!mon.hp){mon.fainted=true;mon.side.pokemonLeft--;}
}
// Yield after one move or switch. Native queue order, residuals and requests remain intact.
function pump(){
  if(this.requestState)this.requestState='';
  if(!this.midTurn){this.queue.insertChoice({choice:'beforeTurn'});this.queue.addChoice({choice:'residual'});this.midTurn=true;}
  let acted=false;
  while(this.queue.list.length){
    const action=this.queue.peek(),visible=['move','switch','instaswitch'].includes(action.choice);
    if(acted&&visible)return;
    this.queue.shift();this.runAction(action);if(visible)acted=true;
    if(this.requestState||this.ended)return;
  }
  this.endTurn();this.midTurn=false;this.queue.clear();
}
function captureFloor(game,b,mon){
  if(b.kind!=='wild'||game.data.caught[mon.baseSpecies.num]||b.captureAttempts>=10)return 0;
  return mon.maxhp*(10-b.captureAttempts)/100;
}
function attach(game,b,sim){
  Object.defineProperty(sim,'turnLoop',{value:pump,configurable:true});
  if(b.kind==='wild')for(const mon of sim.p2.pokemon){
    const originalDamage=Object.getPrototypeOf(mon).damage,originalFaint=Object.getPrototypeOf(mon).faint;
    Object.defineProperty(mon,'damage',{configurable:true,value:function(d,source,effect){
      const floor=captureFloor(game,b,this);
      if(floor&&this.hp>0&&Number.isFinite(d)&&d>0&&this.hp-Math.max(1,Math.trunc(d))<floor){
        const lost=Math.max(0,this.hp-floor);this.hp=Math.max(this.hp-lost,floor);return lost;
      }
      return originalDamage.call(this,d,source,effect);
    }});
    // Self-destruct, Perish Song, Destiny Bond and OHKO also honor the ten-ball rule.
    Object.defineProperty(mon,'faint',{configurable:true,value:function(source,effect){
      const floor=captureFloor(game,b,this);
      if(floor){const lost=Math.max(0,this.hp-floor);this.hp=Math.max(floor,this.hp-lost);this.faintQueued=false;return lost;}
      return originalFaint.call(this,source,effect);
    }});
  }
  cache.set(b,sim);return sim;
}
function engine(game,b){
  let sim=cache.get(b);
  const boss=b.kind==='trainer'?b.bossIndex:null;
  if(sim&&b.simBoss===boss)return sim;
  if(b.sim&&b.simBoss===boss)return attach(game,b,Battle.fromJSON(b.sim));
  const active=game.data.activeId,keys=Object.keys(b.party).map(Number).sort((a,c)=>Number(c===active)-Number(a===active));
  const foes=b.kind==='trainer'?data.bosses[b.bossIndex].team.map((p,i)=>({p,i})).slice(b.foeIndex):[{p:b.foe,i:0}];
  sim=new Battle({formatid:'gen3customgame',seed:Array.from({length:4},()=>Math.floor(game.random()*65536)),p1:{name:'동료',team:keys.map(uid=>setFor(b.party[uid],'u'+uid))},
    p2:{name:b.kind==='wild'?'야생':data.bosses[b.bossIndex].name,team:foes.map(({p,i})=>setFor(i===(b.foeIndex||0)?b.foe:combatant(p.id,p.level,p.moves),'f'+i))}});
  // Use ordinary PP (no PP Ups), neutral nature, IV15 / EV0, as in previous saves.
  for(const side of sim.sides)for(const mon of side.pokemon)for(const s of mon.moveSlots){s.pp=s.maxpp=dex.moves.get(s.id).pp;}
  for(const mon of sim.p1.pokemon)restoreMon(mon,b.party[Number(mon.name.slice(1))]);
  restoreMon(sim.p2.active[0],b.foe);
  sim.makeRequest('move');sim.log=[];sim.sentLogPos=0;sim.inputLog=[];
  b.simBoss=boss;return attach(game,b,sim);
}
function persist(b,sim){
  // Protocol is rendered into our bounded Korean journal; don't grow the save indefinitely.
  sim.log=sim.log.slice(-40);sim.sentLogPos=sim.log.length;sim.inputLog=[];b.sim=sim.toJSON();
}
function refreshOwned(game,sim){
  for(const mon of sim.p1.pokemon){
    const p=game.data.owned[Number(mon.name.slice(1))];if(!p)continue;
    mon.happiness=p.happiness;
    if(mon.level!==p.level){const old=mon.maxhp;mon.level=mon.set.level=p.level;mon.setSpecies(mon.baseSpecies);mon.baseMaxhp=mon.maxhp=statsAt(p.id,p.level)[1];mon.hp=Math.min(mon.maxhp,mon.hp+mon.maxhp-old);}
    for(const id of p.moves){const m=simMoves.get(id);if(!m||mon.baseMoveSlots.some(s=>s.id===m.id))continue;
      const slot={move:m.name,id:m.id,pp:m.pp,maxpp:m.pp,target:m.target,disabled:false,disabledSource:'',used:false};
      mon.baseMoveSlots.push(slot);if(mon.moveSlots!==mon.baseMoveSlots&&!mon.transformed)mon.moveSlots.push({...slot});mon.set.moves.push(m.id);
    }
  }
}
function scoreMove(sim,actor,target,move){
  if(move.id==='recharge')return 1000;
  if(actor.status==='slp'&&['sleeptalk','snore'].includes(move.id))return 1000;
  if(['sleeptalk','snore'].includes(move.id)&&actor.status!=='slp')return 0;
  if(move.category!=='Status'){
    if(!target.runImmunity(move.type))return 0;
    const ability=target.ability;
    if((move.type==='Ground'&&ability==='levitate')||(move.type==='Water'&&ability==='waterabsorb')||(move.type==='Electric'&&ability==='voltabsorb')||(move.type==='Fire'&&ability==='flashfire')||(move.flags.sound&&ability==='soundproof'))return 0;
    if(move.id==='dreameater'&&target.status!=='slp')return 0;
    let power=move.basePower|| (move.damage==='level'?actor.level:typeof move.damage==='number'?move.damage:move.ohko?60:50);
    if(move.multihit)power*=Array.isArray(move.multihit)?3:move.multihit;
    const type=2**sim.dex.getEffectiveness(move.type,target);
    const physical=sim.getCategory(move)==='Physical',stat=physical?'atk':'spa',def=physical?'def':'spd';
    let result=power*type*(actor.hasType(move.type)?1.5:1)*(move.accuracy===true?1:(move.accuracy||100)/100)*actor.getStat(stat)/target.getStat(def);
    if(move.selfdestruct&&actor.hp>actor.maxhp*.3)result*=.15;
    if(actor.lastMove?.id===move.id)result*=.65;
    return Math.max(1,result);
  }
  if(move.heal||move.id==='rest')return actor.hp<actor.maxhp*.55?110:0;
  if(move.status)return !target.status&&target.runStatusImmunity(move.status)?40:0;
  if(move.boosts){const receiver=['self','allySide','allies'].includes(move.target)?actor:target;return Object.entries(move.boosts).some(([s,n])=>n>0?receiver.boosts[s]<4:receiver.boosts[s]>-4)?24:0;}
  if(move.sideCondition)return !actor.side.sideConditions[move.sideCondition]?22:0;
  if(move.volatileStatus){const receiver=move.target==='self'?actor:target;return receiver.volatiles[move.volatileStatus]?0:24;}
  if(move.weather)return sim.field.weather===move.weather?0:22;
  if(move.id==='splash'||move.id==='teleport')return 0;
  if(move.id==='transform')return actor.transformed?0:80;
  return 16;
}
function choose(sim,side,random,preferred){
  const mon=side.active[0];
  if(side.activeRequest?.forceSwitch){
    const living=side.pokemon.filter(p=>!p.isActive&&p.hp>0&&!p.fainted);
    const pick=living.find(p=>p.name==='u'+preferred)||living[0];
    return pick?'switch '+(side.pokemon.indexOf(pick)+1):'pass';
  }
  if(side.activeRequest?.wait)return null;
  if(preferred&&mon.name!=='u'+preferred){const pick=side.pokemon.find(p=>p.name==='u'+preferred&&p.hp>0);if(pick&&!mon.trapped)return 'switch '+(side.pokemon.indexOf(pick)+1);}
  const available=mon.getMoves().filter(m=>!m.disabled&&m.pp>0);
  if(!available.length)return 'move struggle';
  const target=side.foe.active[0],scores=available.map(m=>scoreMove(sim,mon,target,dex.moves.get(m.id)));
  const total=scores.reduce((a,b)=>a+b,0);
  if(!total)return 'move '+available[Math.floor(random()*available.length)].id;
  let roll=random()*total;for(let i=0;i<available.length;i++){roll-=scores[i];if(roll<=0)return 'move '+available[i].id;}
  return 'move '+available.at(-1).id;
}
const names={slp:'잠듦',frz:'얼음',par:'마비',brn:'화상',psn:'독',tox:'맹독',confusion:'혼란',leechseed:'씨뿌리기',substitute:'대타출동',reflect:'리플렉터',lightscreen:'빛의장막',protect:'방어',mustrecharge:'반동으로 움직일 수 없음',sunnyday:'쾌청',raindance:'비',sandstorm:'모래바람',hail:'싸라기눈',atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드',accuracy:'명중률',evasion:'회피율'};
function effectName(value=''){
  const id=value.replace(/^(move|ability):\s*/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const a=abilityIds.get(id);if(a)return abilities.get(a).name;
  const m=dex.moves.get(id);return moves.get(m.num)?.name||names[id]||value;
}
function protocol(sim,lines){
  const who=ref=>{const name=(ref||'').split(': ')[1],mon=sim.sides.flatMap(s=>s.pokemon).find(p=>p.name===name);return mon?species.get(mon.baseSpecies.num)?.name||mon.species.name:'';};
  const output=[],seen=new Set();
  for(const line of lines){
    if(seen.has(line))continue;seen.add(line);const [,kind,a,b,c]=line.split('|');let text='';
    if(kind==='move')text=who(a)+'의 '+effectName(b)+'!';
    if(kind==='-supereffective')text=who(a)+'에게 효과가 굉장했다.';
    if(kind==='-resisted')text=who(a)+'에게 효과가 별로였다.';
    if(kind==='-immune')text=who(a)+'에게 효과가 없었다.';
    if(kind==='-crit')text='급소에 맞았다!';
    if(kind==='-miss')text=who(a)+'의 공격이 빗나갔다.';
    if(kind==='-status')text=who(a)+' · '+effectName(b);
    if(kind==='-curestatus')text=who(a)+'의 '+effectName(b)+'이 풀렸다.';
    if(kind==='-boost'||kind==='-unboost')text=who(a)+'의 '+effectName(b)+' '+c+'단계 '+(kind==='-boost'?'상승':'하락');
    if(kind==='-ability')text=who(a)+'의 특성 '+effectName(b)+' 발동';
    if(kind==='-activate'||kind==='-start'||kind==='-end')text=who(a)+' · '+effectName(b)+(kind==='-end'?' 종료':'');
    if(kind==='-sidestart'||kind==='-sideend')text=(a?.startsWith('p1')?'동료':'상대')+' · '+effectName(b)+(kind==='-sideend'?' 종료':'');
    if(kind==='-weather'&&a!=='none')text='날씨 · '+effectName(a);
    if(kind==='-prepare')text=who(a)+' · '+effectName(b)+' 준비';
    if(kind==='-mustrecharge')text=who(a)+'는 다음 행동에 쉬어야 한다.';
    if(kind==='cant')text=who(a)+' · '+effectName(b)+' 때문에 행동하지 못했다.';
    if(kind==='-fail')text=who(a)+'의 기술은 실패했다.';
    if(kind==='-heal')text=who(a)+'의 체력이 회복되었다.';
    if(kind==='-hitcount')text=c||b?who(a)+'에게 '+b+'번 맞았다.':'';
    if(kind==='faint')text=who(a)+' 기절';
    if(kind==='-damage'&&c?.startsWith('[from]'))text=who(a)+' · '+effectName(c.replace('[from] ',''))+' 대미지';
    const via=line.match(/\[from\] ability: ([^|]+)/)?.[1];if(via&&text)text+=' (특성 '+effectName(via)+')';
    if(text&&!output.includes(text))output.push(text);
  }
  return output;
}
function sync(game,b,sim){
  for(const mon of sim.p1.pokemon)b.party[Number(mon.name.slice(1))]=readMon(mon);
  const current=sim.p1.active[0];if(current.hp>0){game.data.activeId=Number(current.name.slice(1));if(b.pendingSwitch===game.data.activeId)delete b.pendingSwitch;}
  const foe=sim.p2.active[0];b.foe=readMon(foe);
  b.field={weather:sim.field.weather,turn:sim.turn};
}
function movePresentation(lines){
  // Called moves (Metronome, Sleep Talk, Mirror Move) show the move actually executed.
  const line=lines.findLast(l=>l.startsWith('|move|'));
  if(!line)return {};
  const parts=line.split('|'),m=dex.moves.get(parts[3]),actor=parts[2].startsWith('p2')?'foe':'hero';
  const actionLines=lines.slice(lines.lastIndexOf(line));
  const charging=actionLines.some(l=>l.startsWith('|-prepare|'));
  const outcome=charging?'charging':actionLines.some(l=>l.startsWith('|-miss|'))||line.includes('[miss]')?'miss':
    actionLines.some(l=>l.startsWith('|-activate|')&&/move: (Protect|Detect)/.test(l))?'protected':
    actionLines.some(l=>l.startsWith('|-immune|'))?'immune':actionLines.some(l=>l.startsWith('|-fail|'))?'failed':'success';
  const hit=actionLines.find(l=>l.startsWith('|-hitcount|'));
  const moveTarget=['all','allAdjacent','foeSide'].includes(m.target)?'field':parts[4]===parts[2]||['self','allySide','allies'].includes(m.target)?'self':'opponent';
  return {actor,move:m.num,moveTarget,outcome,hitCount:hit?Number(hit.split('|')[3])||1:1};
}
function step(game,b){
  const sim=engine(game,b);refreshOwned(game,sim);const start=sim.log.length,heroBefore=sim.p1.active[0].name,foeBefore=sim.p2.active[0].hp,heroHpBefore=sim.p1.active[0].hp;
  if(b.pendingSwitch&&!sim.requestState){
    const old=sim.p1.active[0],next=sim.p1.pokemon.find(p=>p.name==='u'+b.pendingSwitch);
    if(next&&next!==old&&next.hp&&!old.trapped){sim.queue.cancelMove(old);sim.queue.insertChoice({choice:'switch',pokemon:old,target:next});}
  }
  if(sim.ended){sync(game,b,sim);return {lines:[],ended:true};}
  if(sim.requestState){
    const choices=sim.sides.map(s=>choose(sim,s,game.random,s.n===0?b.pendingSwitch:null));
    for(let i=0;i<choices.length;i++)if(choices[i]&&!sim.sides[i].choose(choices[i]))sim.sides[i].autoChoose();
    sim.commitChoices();
  }else sim.turnLoop();
  const lines=sim.log.slice(start),presentation=movePresentation(lines),actor=presentation.actor||'hero',changed=heroBefore!==sim.p1.active[0].name;
  const messages=protocol(sim,lines);sync(game,b,sim);persist(b,sim);
  return {...presentation,actor,id:actor==='hero'?b.party[game.data.activeId].id:b.foe.id,damage:Math.max(0,actor==='hero'?foeBefore-sim.p2.active[0].hp:heroHpBefore-sim.p1.active[0].hp),lines:messages,switched:changed,ended:sim.ended};
}
function canSwitch(game,b,uid){
  const sim=cache.get(b)||(b.sim?engine(game,b):null);
  if(!sim)return true;
  const current=sim.p1.active[0];return !current.hp||!current.trapped;
}
function invalidate(b){if(!b)return;cache.delete(b);delete b.sim;delete b.simBoss;}
function catchValue(catchRate,hp,maxHp,status){
  const bonus=['sleep','freeze'].includes(status)?2.5:['poison','toxic','burn','paralysis'].includes(status)?1.5:1;
  return Math.max(0,(3*maxHp-2*hp)*catchRate/(3*maxHp)*bonus);
}
function tryCatch(rate,hp,maxHp,status,random=Math.random){
  const a=catchValue(rate,hp,maxHp,status);if(a>=255)return {caught:true,shakes:3,a};
  const threshold=Math.round(65535*Math.pow(a/255,.25));let checks=0;
  while(checks<4&&Math.floor(random()*65536)<threshold)checks++;
  return {caught:checks===4,shakes:Math.min(checks,3),a};
}
module.exports={combatant,abilityFor,step,canSwitch,invalidate,catchValue,tryCatch,engine,readMon,scoreMove,movePresentation,dex};
