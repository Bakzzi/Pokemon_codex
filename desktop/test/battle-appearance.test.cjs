'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),pacing=require('../battle-pacing.js'),effects=require('../move-effects.js');
const now=Date.parse('2026-10-18T01:00:00Z');
function fixture(hero=132,foe=6,heroMoves=[144],foeMoves=[150]){
  const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(hero,50,'fixture',now),other=g.addPokemon(7,50,'fixture',now);
  g.data.activeId=uid;g.data.slots=[uid,other,null,null,null,null];g.data.owned[uid].moves=heroMoves;g.data.owned[other].moves=[33];g.data.workTokens=100000;g.data.caught[foe]=now;
  const b=g.data.battle={kind:'wild',party:Object.fromEntries([uid,other].map(id=>[id,g.memberCombatant(g.data.owned[id])])),foe:battle.combatant(foe,50,foeMoves),turn:0,captureAttempts:0};
  return {g,b,uid,other,sim:battle.engine(g,b)};
}
function action(f,id,actor='hero'){
  for(let i=0;i<5;i++){const at=Math.max(now,f.g.nextTick,f.g.data.switchUntil);assert.ok(f.g.tick(at));if(f.g.data.animation.moveId===id&&f.g.data.animation.actor===actor)return f.g.data.animation;}
  throw Error('Requested native action did not occur');
}
test('Transform keeps Ditto identity, HP and ownership while exposing the copied appearance at impact',()=>{
  const f=fixture(),e=action(f,144),t=pacing.actionTiming(e),p=f.b.party[f.uid];
  assert.equal(p.id,132);assert.equal(p.appearance.speciesId,6);assert.equal(p.appearance.transformed,true);assert.equal(p.maxHp,e.heroBefore.maxHp);
  assert.equal(f.g.data.owned[f.uid].id,132);assert.deepEqual(f.g.data.owned[f.uid].moves,[144]);assert.equal(f.g.snapshot(e.at).hero.id,132);
  assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt-1,e.hero).speciesId,132);
  assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt,e.hero).speciesId,6);
  assert.ok(p.moves.includes(150));assert.equal(p.pp[150],5);
});
test('opponent Transform exposes the same appearance change on the opponent side',()=>{
  const f=fixture(6,132,[150],[144]),e=action(f,144,'foe');
  assert.equal(f.g.snapshot(e.at).foe.id,132);assert.equal(e.foe.appearance.speciesId,6);assert.equal(e.foeBefore.appearance.speciesId,132);
});
test('transformed appearance survives save/reload and old saves recover it without replaying the move',()=>{
  const f=fixture(),e=action(f,144);const before=JSON.parse(JSON.stringify(f.g.data));
  for(const legacy of [false,true]){
    const saved=structuredClone(before);if(legacy){delete saved.battle.foe.appearance;for(const p of Object.values(saved.battle.party))delete p.appearance;}
    const g=new Game(saved,e.at+100),s=g.snapshot(e.at+100);
    assert.equal(s.hero.appearance.speciesId,6);assert.equal(g.data.eventSerial,before.eventSerial);assert.deepEqual(g.data.battle.sim,before.battle.sim);
  }
});
test('switching a transformed Pokemon out and back restores its own appearance and moves',()=>{
  const f=fixture();action(f,144);const sim=battle.engine(f.g,f.b);
  // Finish the current turn, then submit real native switch choices.
  while(!sim.requestState&&!sim.ended)sim.turnLoop();
  sim.makeChoices('switch 2','move splash');while(!sim.requestState&&!sim.ended)sim.turnLoop();
  sim.makeChoices('switch 2','move splash');while(!sim.requestState&&!sim.ended)sim.turnLoop();
  const p=battle.readMon(sim.p1.active[0]);assert.equal(p.id,132);assert.equal(p.appearance.speciesId,132);assert.equal(p.appearance.transformed,false);assert.deepEqual(p.moves,[144]);
});
test('Substitute persists across turns and reload, and a hit that breaks it changes appearance at impact',()=>{
  const f=fixture(143,129,[164],[150]),e=action(f,164),t=pacing.actionTiming(e);
  assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt-1,e.hero).substitute,false);
  assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt,e.hero).substitute,true);
  const saved=new Game(f.g.data,e.at+100);assert.equal(saved.snapshot().hero.appearance.substitute,true);
  const sim=battle.engine(f.g,f.b),hero=sim.p1.active[0];hero.removeVolatile('substitute');const after=battle.readMon(hero);
  const hit={...e,actor:'foe',hero:{...e.hero,appearance:after.appearance},heroBefore:{...e.hero}};
  assert.equal(pacing.appearanceAt(hit,'hero',hit.at+t.impactAt-1,hit.hero).substitute,true);
  assert.equal(pacing.appearanceAt(hit,'hero',hit.at+t.impactAt,hit.hero).substitute,false);
});
test('Fly and Dig disappear during preparation, stay hidden across actions and return before striking',()=>{
  for(const [id,move,hidden] of [[6,19,'fly'],[51,91,'dig']]){
    const f=fixture(id,129,[move],[150]),e=action(f,move),t=pacing.actionTiming(e);
    assert.equal(e.outcome,'charging');assert.equal(e.hero.appearance.hidden,hidden);
    assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt-1,e.hero).hidden,null);
    assert.equal(pacing.appearanceAt(e,'hero',e.at+t.impactAt,e.hero).hidden,hidden);
    const loaded=new Game(f.g.data,e.at+t.duration);assert.equal(loaded.snapshot().hero.appearance.hidden,hidden);
    const next=action(f,move),nt=pacing.actionTiming(next);assert.notEqual(next.outcome,'charging');assert.equal(next.hero.appearance.hidden,null);
    assert.equal(pacing.appearanceAt(next,'hero',next.at+nt.announceMs,next.hero).hidden,null);
  }
});
test('a decoy reveals its user only while acting, including a called move, without losing the decoy',()=>{
  const a={speciesId:143,substitute:true,hidden:null,transformed:false},e={at:now,actor:'hero',moveId:33,heroBefore:{appearance:a}},after={id:143,appearance:a},t=pacing.actionTiming(e);
  assert.equal(pacing.appearanceAt(e,'hero',now,after).substitute,true);
  assert.equal(pacing.appearanceAt(e,'hero',now+t.announceMs+100,after).substitute,false);
  assert.equal(pacing.appearanceAt(e,'hero',now+t.resultAt,after).substitute,true);
  assert.equal(after.appearance.substitute,true);
});
test('an attack absorbed by Substitute still shows a hit without removing the real Pokemon HP',()=>{
  const event={...battle.movePresentation(['|move|p2a: f0|Tackle|p1a: u1000','|-activate|p1a: u1000|Substitute|[damage]']),moveId:33,at:now,damage:0,heroBefore:{currentHp:80},hero:{currentHp:80}};
  assert.equal(event.hitSubstitute,true);assert.equal(effects.frameFor(event,now+700).impact,true);
  const t=pacing.actionTiming(event);assert.equal(pacing.damageReaction(event,'hero',now+t.impactAt+100).active,true);
  assert.equal(pacing.damageReaction(event,'foe',now+t.impactAt+100).active,false);
  assert.equal(battle.movePresentation(['|move|p1a: u1000|Baton Pass|p1a: u1000','|-end|p1a: u1000|Substitute']).hitSubstitute,undefined);
  const f=fixture(143,129,[164],[150]);
  assert.match(battle.protocol(f.sim,['|-activate|p1a: u143|Substitute|[damage]'])[0],/공격을 대신 받았다/);
  assert.ok(!battle.protocol(f.sim,['|-activate|p1a: u143|Substitute|[damage]'])[0].includes('내보냈다'));
});
test('all stored effect profiles draw without nonfinite geometry in hit, miss, blocked and charging cases',()=>{
  const ctx=new Proxy({}, {set:(o,k,v)=>(o[k]=v,true),get:(o,k)=>o[k]||((...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));})});
  for(const p of Object.values(effects.profiles))for(const outcome of ['success','miss','immune','protected','failed','charging'])for(const u of [.2,.58,.8]){
    const e={moveId:p.id,at:now,actor:'hero',damage:12,outcome,hitCount:3,moveTarget:'opponent'};
    effects.drawFrame(ctx,e,effects.frameFor(e,now+p.duration*u));
  }
  assert.equal(effects.profileFor(144).family,'transform');
  const morph={moveId:144,at:now,outcome:'success'},frame=effects.frameFor(morph,now+effects.profileFor(144).duration*.58);
  assert.ok(frame.actor.scaleX<.5);assert.match(frame.actor.filter,/brightness/);
});
