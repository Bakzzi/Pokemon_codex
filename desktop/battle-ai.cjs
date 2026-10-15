'use strict';
// Tactical planning runs only on detached Gen III battles. Never inspect the
// live PRNG or execute a hypothetical action against the player's battle.
const {Battle}=require('@pkmn/sim');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const forecastSeed=[17011,29123,41317,52709];
function model(state){
  // toJSON contains shared arrays (including logs). fromJSON alone is not an
  // isolation boundary: every branch needs its own deep serialized snapshot.
  const sim=Battle.fromJSON(JSON.parse(JSON.stringify(state)));sim.resetRNG(forecastSeed);
  sim.randomizer=damage=>Math.floor(damage*.925);
  return sim;
}
function legal(mon){return mon.getMoves().filter(m=>!m.disabled&&m.pp>0).map(m=>mon.battle.dex.moves.get(m.id));}
function accuracy(sim,actor,target,move){
  if(move.accuracy===true||move.alwaysHit||move.target==='self')return 1;
  if(move.ohko)return actor.level<target.level?0:clamp((30+actor.level-target.level)/100,0,1);
  let value=sim.runEvent('ModifyAccuracy',target,actor,move,move.accuracy);
  if(value===true)return 1;
  const boost=[1,4/3,5/3,2,7/3,8/3,3],a=clamp(actor.boosts.accuracy,-6,6),e=clamp(target.boosts.evasion,-6,6);
  if(!move.ignoreAccuracy)value*=a>=0?boost[a]:1/boost[-a];
  if(!move.ignoreEvasion)value*=e>=0?1/boost[e]:boost[-e];
  value=sim.runEvent('Accuracy',target,actor,move,value);
  return value===true?1:clamp(value/100,0,1);
}
function blocked(actor,target,move){
  if(move.category==='Status')return false;
  const ability=target.ability;
  return !target.runImmunity(move.type)||
    (move.type==='Ground'&&ability==='levitate')||(move.type==='Water'&&ability==='waterabsorb')||
    (move.type==='Electric'&&ability==='voltabsorb')||(move.type==='Fire'&&ability==='flashfire')||
    (move.flags.sound&&ability==='soundproof')||
    (ability==='wonderguard'&&actor.battle.dex.getEffectiveness(move.type,target)<=0&&move.id!=='struggle')||
    (move.ohko&&(actor.level<target.level||ability==='sturdy'))||
    (move.id==='dreameater'&&target.status!=='slp')||(move.id==='snore'&&actor.status!=='slp');
}
function damage(sim,actor,target,move){
  if(move.category==='Status'||blocked(actor,target,move))return 0;
  const active=sim.dex.getActiveMove(move);active.willCrit=false;
  let value=sim.actions.getDamage(actor,target,active,true);
  if(typeof value!=='number'||!Number.isFinite(value))return 0;
  if(move.multihit)value*=Array.isArray(move.multihit)?3:move.multihit;
  return Math.max(0,value);
}
function expectedDamage(sim,actor,target,move){
  return damage(sim,actor,target,move)*accuracy(sim,actor,target,move);
}
function bestAttack(sim,actor,target){
  const options=legal(actor),pool=options.length?options:[sim.dex.moves.get('struggle')];
  if(actor.status==='slp'&&actor.statusState.time>(actor.ability==='earlybird'?2:1)){
    const snore=pool.find(m=>m.id==='snore'),talk=pool.find(m=>m.id==='sleeptalk');
    const called=actor.moveSlots.map(s=>({move:sim.dex.moves.get(s.id),pp:s.pp})).filter(s=>!s.move.flags.nosleeptalk&&!s.move.flags.charge);
    const average=talk?called.reduce((sum,s)=>sum+(s.pp?expectedDamage(sim,actor,target,s.move):0),0)/Math.max(1,called.length):0;
    return Math.max(average,snore?expectedDamage(sim,actor,target,snore):0);
  }
  return Math.max(0,...pool.map(m=>{
    let value=expectedDamage(sim,actor,target,m);
    if(m.flags.charge&&!(m.id==='solarbeam'&&sim.field.weather==='sunnyday')&&!actor.volatiles.twoturnmove)value*=.5;
    if(m.selfdestruct)value*=.35;
    if(m.id==='hyperbeam'&&value<target.hp)value*=.5;
    return value;
  }));
}
function statusCost(sim,mon){
  const list=legal(mon),sleepUsable=list.some(m=>['sleeptalk','snore'].includes(m.id));
  return ({slp:sleepUsable?5:22,frz:35,par:9,brn:5,psn:7,tox:12}[mon.status]||0)+
    (mon.volatiles.confusion?7:0)+(mon.volatiles.leechseed?10:0)+
    (mon.volatiles.yawn?14:0)+
    (mon.volatiles.perishsong?30/(mon.volatiles.perishsong.duration||1):0);
}
function position(sim,n,initial){
  const side=sim.sides[n],other=side.foe,a=side.active[0],b=other.active[0];
  const lost=side.pokemon.filter(p=>p.fainted||!p.hp).length-initial[n];
  const won=other.pokemon.filter(p=>p.fainted||!p.hp).length-initial[1-n];
  let value=(won-lost)*240;
  value+=90*(a.hp/a.maxhp-b.hp/b.maxhp);
  // Preserve the rest of the selected party as well as the current combatant.
  value+=12*(side.pokemon.reduce((s,p)=>s+p.hp/p.maxhp,0)-other.pokemon.reduce((s,p)=>s+p.hp/p.maxhp,0));
  if(!a.hp||!b.hp||sim.ended)return value;
  const dealt=bestAttack(sim,a,b),taken=bestAttack(sim,b,a);
  const kill=clamp(b.hp/Math.max(1,dealt),.25,12),survive=clamp(a.hp/Math.max(1,taken),.25,12);
  const faster=a.getStat('spe')>=b.getStat('spe')?.25:-.25;
  value+=65*clamp((survive-kill+faster)/Math.max(1,kill,survive),-1,1);
  value+=25*(Math.min(1.5,dealt/b.maxhp)-Math.min(1.5,taken/a.maxhp));
  value+=statusCost(sim,b)-statusCost(sim,a);
  if(a.volatiles.mustrecharge)value-=22;
  if(b.volatiles.mustrecharge)value+=22;
  return value;
}
function rankMove(sim,actor,target,move){
  if(move.id==='recharge')return 1;
  if(move.id==='sleeptalk'){
    if(actor.status!=='slp')return -100;
    const pool=actor.moveSlots.map(s=>sim.dex.moves.get(s.id)).filter(m=>!m.flags.nosleeptalk&&!m.flags.charge);
    return 20+pool.reduce((s,m)=>s+expectedDamage(sim,actor,target,m)/target.maxhp*100,0)/Math.max(1,pool.length);
  }
  if(['snore'].includes(move.id)&&actor.status!=='slp')return -100;
  if(move.category!=='Status'){
    const hit=damage(sim,actor,target,move),chance=accuracy(sim,actor,target,move);
    let score=100*Math.min(target.hp,hit)*chance/target.maxhp;
    if(hit>=target.hp)score+=70*chance;
    if(move.priority>0&&bestAttack(sim,target,actor)>=actor.hp)score+=30;
    if(move.drain)score+=Math.min(actor.maxhp-actor.hp,hit*move.drain[0]/move.drain[1])/actor.maxhp*65;
    if(move.recoil)score-=hit*move.recoil[0]/move.recoil[1]/actor.maxhp*50;
    if(move.selfdestruct)score-=actor.hp/actor.maxhp*90;
    if((move.flags.charge&&!(move.id==='solarbeam'&&sim.field.weather==='sunnyday'))||(move.id==='hyperbeam'&&hit<target.hp))score*=.5;
    return score;
  }
  if(move.heal||move.id==='rest'){
    if(move.id==='rest'&&(actor.status==='slp'||actor.hp===actor.maxhp&&!actor.status))return -100;
    return (1-actor.hp/actor.maxhp)*100+(actor.status&&move.id==='rest'?15:0)-(move.id==='rest'?15:0);
  }
  if(move.status){
    if(target.status||!target.runStatusImmunity(move.status)||!target.runImmunity(move.type))return -100;
    return ({slp:48,par:35,tox:35,brn:30,psn:22}[move.status]||20)*accuracy(sim,actor,target,move);
  }
  if(move.boosts){
    const receiver=move.target==='self'?actor:target,beforeOut=bestAttack(sim,actor,target),beforeIn=bestAttack(sim,target,actor),old={...receiver.boosts};
    for(const [stat,value] of Object.entries(move.boosts))receiver.boosts[stat]=clamp(receiver.boosts[stat]+value,-6,6);
    const gain=(bestAttack(sim,actor,target)-beforeOut)/target.maxhp+(beforeIn-bestAttack(sim,target,actor))/actor.maxhp;
    const speedGain=Object.keys(move.boosts).includes('spe')?((actor.getStat('spe')>=target.getStat('spe'))?8:0):0;
    receiver.boosts=old;
    return gain*170+speedGain;
  }
  if(move.sideCondition){
    const side=move.target==='foeSide'?target.side:actor.side;
    if(side.sideConditions[move.sideCondition])return -100;
    if(['reflect','lightscreen'].includes(move.sideCondition))return legal(target).some(m=>m.category===(move.sideCondition==='reflect'?'Physical':'Special'))?32:-100;
    return move.target==='foeSide'?8:12;
  }
  if(move.weather)return sim.field.weather===move.weather?-100:22;
  if(move.volatileStatus){
    const receiver=move.target==='self'?actor:target;
    if(receiver.volatiles[move.volatileStatus])return -100;
    if(['protect','endure'].includes(move.volatileStatus))return !actor.volatiles.stall&&(target.status==='tox'||target.status==='psn'||target.status==='brn'||target.volatiles.perishsong)?18:-20;
    return 24;
  }
  if(['splash','teleport','snore'].includes(move.id))return -100;
  return 5;
}
function ranked(sim,n){
  const actor=sim.sides[n].active[0],target=actor.side.foe.active[0];let list=legal(actor);
  if(actor.status==='slp'&&actor.statusState.time>(actor.ability==='earlybird'?2:1)){
    const sleeping=list.filter(m=>m.sleepUsable);if(sleeping.length)list=sleeping;
  }
  if(!list.length)return [{action:'move struggle',score:0,move:sim.dex.moves.get('struggle')}];
  return list.map(move=>({action:'move '+move.id,score:rankMove(sim,actor,target,move),move}))
    .sort((a,b)=>b.score-a.score||a.move.num-b.move.num);
}
function roots(sim,n){
  const list=ranked(sim,n),attacks=list.filter(x=>x.move.category!=='Status').slice(0,4),support=list.filter(x=>x.move.category==='Status'&&x.score>0).slice(0,10);
  // Reactive damage needs the opponent's action to evaluate correctly (for
  // example Counter); it must not vanish behind four ordinary damage moves.
  const reactive=list.filter(x=>x.move.category!=='Status'&&x.move.damageCallback);
  const selected=[...new Set([...attacks,...reactive,...support])];return selected.length?selected:[list[0]];
}
function forecast(state,n,action,response,hits){
  const sim=model(state),initial=sim.sides.map(s=>s.pokemon.filter(p=>p.fainted||!p.hp).length);
  // Only branch the root accuracy check. Ability/type/protection checks and all
  // damage/status mechanics still execute in the simulator. Random primary
  // effects use an independent seed, never the real battle's future results.
  const runEvent=sim.runEvent,checked=[false,false];
  sim.runEvent=function(event,target,source,effect,...args){
    if(event==='Accuracy'&&source?.side&&this.turn===state.turn&&!checked[source.side.n]){
      checked[source.side.n]=true;return hits[source.side.n]?true:0;
    }
    return runEvent.call(this,event,target,source,effect,...args);
  };
  // Do not prefer a weak move just because one forecast happened to roll a
  // critical hit, freeze or flinch. Primary effects still execute normally.
  const getDamage=sim.actions.getDamage;
  sim.actions.getDamage=function(a,b,move,...args){if(typeof move==='object')move.willCrit=false;return getDamage.call(this,a,b,move,...args);};
  sim.actions.secondaries=()=>{};
  const choices=n===0?[action,response]:[response,action];
  sim.makeChoices(...choices);
  // The leaf compares the remaining damage race, statuses, recovery cost and
  // persistent boosts. Do not roll a single lucky imaginary future to victory.
  return position(sim,n,initial);
}
function plan(live,n,{allowSwitch=false,eligible=null}={}){
  const state=live.toJSON(),sim=model(state),side=sim.sides[n],actor=side.active[0],target=side.foe.active[0];
  const options=roots(sim,n),responses=roots(sim,1-n).sort((a,b)=>b.score-a.score).slice(0,2);
  if(allowSwitch&&!actor.trapped&&!actor.volatiles.mustrecharge){
    const initial=sim.sides.map(s=>s.pokemon.filter(p=>p.fainted||!p.hp).length),current=side.active[0];
    const switches=side.pokemon.filter(p=>!p.isActive&&!p.fainted&&p.hp>0&&(!eligible||eligible.includes(p.name))).map(p=>{
      side.active[0]=p;const score=position(sim,n,initial);side.active[0]=current;
      return {action:'switch '+(side.pokemon.indexOf(p)+1),score,move:null};
    }).sort((a,b)=>b.score-a.score).slice(0,2);
    options.push(...switches);
  }
  let best=null,stay=-Infinity,forecasts=0;const evaluations=[];
  for(const option of options){
    const chance=option.move?accuracy(sim,actor,target,option.move):1;
    const values=responses.map(response=>{
      const otherChance=accuracy(sim,target,actor,response.move),branches=p=>p>=.999?[[true,1]]:p<=0?[[false,1]]:[[true,p],[false,1-p]];
      let value=0;
      for(const [hit,p] of branches(chance))for(const [otherHit,q] of branches(otherChance)){
        const hits=n===0?[hit,otherHit]:[otherHit,hit];
        value+=p*q*forecast(state,n,option.action,response.action,hits);forecasts++;
      }
      // Expected secondary benefits are small tie breakers, never lucky
      // deterministic forecast outcomes that outrank guaranteed damage.
      if(option.move?.secondaries)for(const secondary of option.move.secondaries){
        if(!target.status&&secondary.status)value+=(secondary.chance||100)/100*8*chance;
        if(secondary.volatileStatus==='flinch'&&actor.getStat('spe')>target.getStat('spe'))value+=(secondary.chance||100)/100*5*chance;
      }
      return value;
    });
    // Compare likely counterplay, with extra weight on the worse response.
    const value=values.reduce((s,v)=>s+v,0)/values.length*.6+Math.min(...values)*.4;
    const result={action:option.action,value,forecasts};
    evaluations.push({action:option.action,value});
    if(option.move)stay=Math.max(stay,value);
    if(!best||value>best.value+1e-6)best=result;
  }
  if(best.action.startsWith('switch ')&&best.value<stay+18){
    // Switching spends a turn and must offer a substantial improvement.
    return plan(live,n,{allowSwitch:false,eligible});
  }
  return {...best,forecasts,evaluations};
}
module.exports={plan,rankMove,damage,accuracy,model,position};
