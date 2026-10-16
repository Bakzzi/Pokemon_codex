'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),pacing=require('../battle-pacing.js');
const now=Date.parse('2026-10-16T00:00:00Z');
function fixture(hero=25,foe=143,known=[33],foeMoves=[33]){
  const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(hero,50,'fixture',now),other=g.addPokemon(149,50,'fixture',now);
  g.data.activeId=uid;g.data.slots=[uid,other,null,null,null,null];g.data.owned[uid].moves=known;g.data.owned[other].moves=[33];g.data.workTokens=100000;g.data.caught[foe]=now;
  const b=g.data.battle={kind:'wild',party:Object.fromEntries([uid,other].map(id=>[id,g.memberCombatant(g.data.owned[id])])),foe:battle.combatant(foe,50,foeMoves),turn:0,captureAttempts:0};
  return {g,b,uid,other,sim:battle.engine(g,b)};
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}

test('ordinary moves follow effective Speed, rather than a fixed hero-first alternation',()=>{
  for(const [hero,foe,first] of [[25,143,'hero'],[143,25,'foe']]){
    const {g,b,sim}=fixture(hero,foe);
    assert.equal(battle.step(g,b).actor,first);assert.equal(sim.turn,1);
    assert.equal(battle.step(g,b).actor,first==='hero'?'foe':'hero');assert.equal(sim.turn,2);
    assert.equal(battle.step(g,b).actor,first);
  }
});
test('move priority outranks Speed; paralysis and Speed stages change order on the next turn',()=>{
  let f=fixture(143,25,[98]);assert.ok(f.sim.p1.active[0].getStat('spe')<f.sim.p2.active[0].getStat('spe'));assert.equal(battle.step(f.g,f.b).actor,'hero');
  for(const debuff of ['paralysis','stage']){
    f=fixture(77,143);battle.step(f.g,f.b);battle.step(f.g,f.b);
    const hero=f.sim.p1.active[0];if(debuff==='paralysis')hero.setStatus('par');else hero.boosts.spe=-6;
    // Native move requests update effective Speed and preserve the turn's RNG.
    f.sim.makeRequest('move');assert.ok(hero.getActionSpeed()<f.sim.p2.active[0].getActionSpeed());
    assert.equal(battle.step(f.g,f.b).actor,'foe',debuff);
  }
});
test('waking and confusion recovery play before the move, without early damage or duplicate result text',()=>{
  for(const recovery of ['sleep','freeze','confusion']){
    const {g,b,sim}=fixture(25,143,recovery==='freeze'?[172]:[33]),hero=sim.p1.active[0];
    if(recovery==='sleep'){hero.setStatus('slp');hero.statusState.time=1;}
    else if(recovery==='freeze'){hero.status='frz';hero.statusState=sim.initEffectState({id:'frz',target:hero});}
    else {hero.addVolatile('confusion');hero.volatiles.confusion.time=1;}
    b.party[g.data.activeId]=battle.readMon(hero);const at=advance(g),e=g.data.animation,t=pacing.actionTiming(e);
    assert.equal(e.actor,'hero');assert.equal(e.moveId,recovery==='freeze'?172:33);assert.equal(e.beforeMove.length,1);
    assert.match(e.beforeMove[0].text,recovery==='sleep'?/잠에서 깨어났다/:recovery==='freeze'?/얼어붙은 상태에서 풀려났다/:/혼란이 풀렸다/);
    assert.ok(!e.detail.includes(e.beforeMove[0].text));assert.equal(pacing.beforeMoveAt(e,at+700).text,e.beforeMove[0].text);
    assert.equal(pacing.beforeMoveAt(e,at+t.beforeMoveMs),null);assert.equal(t.beforeMoveMs,1500);
    assert.equal(pacing.healthAt(e,'foe',at+t.beforeMoveMs,e.foe).currentHp,e.foeBefore.currentHp);
    if(recovery==='sleep'){
      assert.equal(pacing.healthAt(e,'hero',at+500,e.hero).status,'sleep');
      assert.equal(pacing.healthAt(e,'hero',at+t.beforeMoveMs,e.hero).status,null);
    }
    const serial=g.data.eventSerial,pp=b.party[g.data.activeId].pp[33];
    const loaded=new Game(g.data,at+700);assert.equal(loaded.tick(at+t.duration-1),false);
    assert.equal(loaded.data.eventSerial,serial);assert.equal(loaded.data.battle.party[g.data.activeId].pp[33],pp);
    assert.ok(loaded.tick(at+t.duration));assert.equal(loaded.data.animation.actor,'foe');
  }
});
test('a manual request between attacks waits for the turn, spends its next action on switching, and survives reload',()=>{
  let {g,b,uid,other}=fixture();advance(g);assert.equal(g.data.animation.actor,'hero');
  assert.ok(g.requestAction('select',other,g.data.animation.at+100));
  assert.match(g.pendingActions(g.data.switchUntil)[0].reason,/이번 턴/);
  advance(g);assert.equal(g.data.activeId,uid);assert.equal(g.data.animation.actor,'foe');
  g=new Game(g.data,g.data.animation.at+100,{random:()=>.73});b=g.data.battle;
  const hp=b.party[uid].hp;advance(g);assert.equal(g.data.activeId,other);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.pendingActions.length,0);
  const serial=g.data.eventSerial;advance(g);assert.equal(g.data.eventSerial,serial,'native switch acknowledgement has no extra animation');
  const incoming=b.party[other].hp;advance(g);assert.equal(g.data.animation.actor,'foe');assert.ok(b.party[other].hp<incoming);assert.equal(b.party[uid].hp,hp);
});
test('every native result message has its own ordered readable phase and affected-side speaker',()=>{
  const {sim}=fixture();const messages=battle.protocol(sim,['|move|p1a: u1000|Tackle|p2a: f0','|-crit|p2a: f0','|-status|p2a: f0|par','|-unboost|p1a: u1000|def|1'],true).filter(m=>m.kind!=='move');
  const e={kind:'attack',at:now,moveId:33,afterMove:messages},t=pacing.actionTiming(e);
  assert.equal(messages.length,3);assert.deepEqual(messages.map(m=>m.actor),['foe','foe','hero']);
  for(let i=0;i<messages.length;i++)assert.equal(pacing.afterMoveAt(e,now+t.resultAt+i*1350+100),messages[i]);
  assert.equal(t.duration,t.resultAt+4050);assert.equal(pacing.afterMoveAt(e,now+t.resultAt-1),null);
});
test('a nursery reservation exposes its blocker during playback and deploys once after withdrawal',()=>{
  const {g,b,uid,other,sim}=fixture();delete b.party[other];battle.invalidate(b);g.data.daycare={parents:[other,uid],produced:true,offspring:[147],progress:100,required:100};
  advance(g);assert.ok(g.requestAction('select',other,g.data.animation.at+100));
  assert.match(g.pendingActions(g.data.animation.at+100)[0].reason,/키우미집/);
  assert.ok(g.requestAction('daycare-withdraw',undefined,g.data.animation.at+101));
  advance(g);assert.equal(g.data.daycare,null);assert.equal(g.data.activeId,uid);
  advance(g);assert.equal(g.data.animation.actor,'foe');const native=battle.engine(g,b),turn=native.turn,pp=b.foe.pp[33];
  advance(g);assert.equal(g.data.activeId,other);assert.equal(battle.engine(g,b),native);assert.equal(native.turn,turn);assert.equal(b.foe.pp[33],pp);
  assert.equal(g.data.pendingActions.length,0);assert.equal(b.pendingSwitch,other);advance(g);assert.equal(native.p1.active[0].name,'u'+other);
  const restored=new Game(g.data,g.data.switchUntil);assert.equal(battle.engine(restored,restored.data.battle).p1.active[0].name,'u'+other);
});
