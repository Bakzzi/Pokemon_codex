'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{Adventure:Desktop}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs');
const battle=require('../battle.cjs');
const now=Date.parse('2026-10-19T02:00:00Z');
function fixture(Type=Game,{hp=.5,foe=144,foeMoves=[33],heroMoves=[55]}={}){
  const saved=new Game({},now,{random:()=>.73}).data,g=new Type(saved,now,{random:()=>.73});
  if(g.data.mobileStory){g.data.mobileStory.scene=null;g.data.mobileStory.onboarding='done';}
  const uid=g.addPokemon(9,50,'fixture',now);g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;g.data.owned[uid].moves=heroMoves;
  const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(g.data.owned[uid])},foe:battle.combatant(foe,50,foeMoves),turn:0,captureAttempts:0};
  b.foe.hp=Math.max(1,Math.floor(b.foe.maxHp*hp));g.data.workTokens=50000;
  // Seed the native battle independently, then force failed balls without
  // controlling the simulator's damage/accuracy/status RNG.
  battle.engine(g,b);g.random=()=>.999999;return {g,b,uid};
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}
for(const [platform,Type]of [['PC',Desktop],['Android',Mobile]])test(platform+' spends one player action per ball and lets a faster opponent retaliate after each failed throw',()=>{
  const {g,b,uid}=fixture(Type),sim=battle.engine(g,b),hero=sim.p1.active[0],foe=sim.p2.active[0];
  assert.ok(foe.getStat('spe')>hero.getStat('spe'));const hp=hero.hp,pp=hero.moveSlots[0].pp,foePp=foe.moveSlots[0].pp;
  advance(g);assert.equal(g.data.animation.kind,'capture');assert.equal(b.captureAttempts,1);assert.equal(b.party[uid].hp,hp);
  assert.equal(b.foe.pp[33],foePp);assert.equal(b.party[uid].pp[55],pp);
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);
  assert.equal(g.data.animation.actor,'foe');assert.equal(b.captureAttempts,1);assert.ok(b.party[uid].hp<hp);assert.equal(b.foe.pp[33],foePp-1);
  for(let i=0;b.captureAttempts<2;i++){assert.ok(i<4);advance(g);}
  assert.equal(b.foe.pp[33],foePp-1);assert.equal(b.party[uid].pp[55],pp);
});
test('a failed ball survives reload with the opponent action still queued and no extra ball',()=>{
  let {g,b,uid}=fixture();advance(g);const c=structuredClone(g.data.captureAnimation),hp=b.party[uid].hp,pp=b.foe.pp[33];
  g=new Game(g.data,c.at+100,{random:()=>.999999});b=g.data.battle;
  assert.equal(g.tick(g.data.switchUntil-1),false);assert.deepEqual(g.data.captureAnimation,c);advance(g);
  assert.equal(b.captureAttempts,1);assert.ok(b.party[uid].hp<hp);assert.equal(b.foe.pp[33],pp-1);
});
test('a successful native ball ends the battle only after playback, before retaliation or HP recovery',()=>{
  const {g,b,uid}=fixture();g.random=()=>0;b.party[uid].hp=50;battle.invalidate(b);const pp=b.foe.pp[33];
  advance(g);assert.equal(g.data.captureAnimation.caught,true);assert.equal(b.foe.pp[33],pp);assert.equal(b.party[uid].hp,50);assert.ok(!g.data.caught[144]);
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);
  assert.ok(g.data.caught[144]);assert.equal(g.data.battle,null);assert.equal(b.foe.pp[33],pp);
});
test('poison can knock out a target after a failed ball; capture does not clamp HP or cancel residuals',()=>{
  const {g,b}=fixture(Game,{hp:.01,foe:144,foeMoves:[150]});b.foe.status='poison';battle.invalidate(b);
  advance(g);assert.equal(b.captureAttempts,1);assert.equal(g.data.animation.kind,'capture');assert.ok(b.foe.hp>0);
  for(let i=0;g.data.battle;i++){assert.ok(i<8);advance(g);}
  assert.equal(b.foe.hp,0);assert.ok(!g.data.caught[144]);assert.equal(b.captureAttempts,1);
});
test('mandatory faint replacement is free and preserves capture focus and quota for the next partner',()=>{
  const {g,b,uid}=fixture(Game,{foeMoves:[98]}),reserve=g.addPokemon(143,50,'fixture',now);g.data.slots[1]=reserve;b.party[reserve]=g.memberCombatant(g.data.owned[reserve]);
  b.party[uid].hp=1;battle.invalidate(b);advance(g);assert.equal(b.captureAttempts,1);advance(g);assert.equal(b.party[uid].hp,0);
  for(let i=0;g.data.activeId===uid;i++){assert.ok(i<8);advance(g);}
  assert.equal(g.data.activeId,reserve);assert.equal(b.captureAttempts,1);assert.ok(b.captureStarted);
  for(let i=0;b.captureAttempts<2;i++){assert.ok(i<8);advance(g);}
  assert.equal(b.captureAttempts,2);assert.equal(b.party[reserve].hp,b.party[reserve].maxHp);
});
test('healing over half HP after the first ball keeps using the same quota',()=>{
  const {g,b}=fixture(Game,{foe:150,foeMoves:[105],hp:.45});advance(g);advance(g);
  assert.ok(b.foe.hp>b.foe.maxHp*.5);assert.equal(b.captureAttempts,1);assert.ok(g.captureOpportunity());
  for(let i=0;b.captureAttempts<2;i++){assert.ok(i<4);advance(g);}assert.equal(b.captureAttempts,2);
});
test('caught wild Pokemon are attacked unless another capture has been reserved',()=>{
  for(const reserved of [false,true]){
    const {g,b}=fixture(Game,{foe:19,foeMoves:[150]});g.data.caught[19]=now;if(reserved)assert.ok(g.reserveCapture(19,1,now));
    advance(g);assert.equal(g.data.animation.kind,reserved?'capture':'attack');assert.equal(b.captureAttempts,reserved?1:0);
  }
});
test('an old pending free throw is acknowledged without rolling or consuming a quota',()=>{
  const {g,b}=fixture();g.data.pendingBattle={kind:'capture',at:now};advance(g);
  assert.equal(b.captureAttempts,0);assert.equal(g.data.captureAnimation||null,null);assert.equal(g.data.pendingBattle,null);
  advance(g);assert.equal(b.captureAttempts,1);assert.equal(g.data.workTokens,49750);
});
test('crossing half HP waits until the next player choice instead of adding a free throw after an attack',()=>{
  const {g,b}=fixture(Game,{hp:.65,heroMoves:[69],foeMoves:[150]});
  for(let i=0;b.foe.hp/b.foe.maxHp>.5;i++){assert.ok(i<4);advance(g);}
  assert.equal(b.captureAttempts,0);assert.equal(g.data.pendingBattle,null);const hp=b.foe.hp;
  for(let i=0;b.captureAttempts===0;i++){assert.ok(i<5);advance(g);}
  assert.equal(b.captureAttempts,1);assert.equal(b.foe.hp,hp);assert.equal(battle.engine(g,b).turn,2);
});
test('throwing is the trainer action even when the partner is asleep and has no PP',()=>{
  const {g,b,uid}=fixture();b.party[uid].status='sleep';b.party[uid].pp[55]=0;battle.invalidate(b);
  const hp=b.party[uid].hp;advance(g);assert.equal(b.captureAttempts,1);assert.equal(b.party[uid].hp,hp);
  assert.equal(b.party[uid].pp[55],0);assert.equal(g.data.animation.kind,'capture');
});
test('a committed two-turn technique finishes before the next legal capture choice',()=>{
  const {g,b}=fixture(Game,{hp:1,heroMoves:[76],foeMoves:[150]}),sim=battle.engine(g,b);
  sim.makeChoices('move solarbeam','move splash');
  for(let n=0;!sim.requestState&&!sim.ended;n++){assert.ok(n<8);sim.turnLoop();}
  assert.equal(sim.p1.active[0].getLockedMove(),'solarbeam');sim.p2.active[0].hp=Math.floor(sim.p2.active[0].maxhp*.5);b.foe.hp=sim.p2.active[0].hp;
  for(let n=0;sim.p1.active[0].getLockedMove();n++){assert.ok(n<5);advance(g);assert.equal(b.captureAttempts,0);}
  assert.ok(b.foe.hp>0);for(let n=0;b.captureAttempts===0;n++){assert.ok(n<5);advance(g);}
  assert.equal(b.captureAttempts,1);
});
