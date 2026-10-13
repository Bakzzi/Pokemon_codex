'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs');
const {xpAt,learnedMoves}=require('../pokemon.cjs');
const now=Date.parse('2026-10-13T08:00:00Z');
function levels(g,values){
  for(const [uid,level] of Object.entries(values)){
    const p=g.data.owned[uid];p.level=level;p.xp=xpAt(p.id,level);p.moves=learnedMoves(p.id,level);
  }
}
function fixture(){
  const g=new Game({},now,{random:()=>.73});levels(g,{1:18,4:24,7:5,25:11});g.data.activeId=4;
  g.newWild(now);const b=g.data.battle;
  b.foe=battle.combatant(18,50,[98]);b.foe.hp=Math.floor(b.foe.maxHp*.8);b.captureAttempts=3;
  b.party[4].hp=1;b.party[7].hp-=2;b.party[7].pp[33]=4;b.party[7].status='paralysis';
  g.data.workTokens=2500;
  return {g,b};
}

test('rotation starts at a 15-level gap, uses only selected slots and costs no work or XP',()=>{
  const g=new Game({},now,{random:()=>.73});levels(g,{1:11,4:24,7:10,25:12});g.data.activeId=4;
  const outside=g.addPokemon(133,1,'hatch',now),slots=[...g.data.slots];
  assert.equal(g.tick(now),false);assert.equal(g.data.activeId,4); // gap 14
  levels(g,{7:9});const owned=structuredClone(g.data.owned);
  assert.equal(g.tick(now+1),true);assert.equal(g.data.activeId,7);assert.notEqual(g.data.activeId,outside);
  assert.deepEqual(g.data.slots,slots);assert.deepEqual(g.data.owned,owned);assert.equal(g.data.workTokens,0);
  assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.animation.reason,'balance');
  assert.equal(g.data.animation.from,4);assert.equal(g.data.animation.to,7);assert.equal(g.data.battle,null);
  const serial=g.data.eventSerial;
  assert.equal(g.tick(now+1000),false);assert.equal(g.tick(now+1400),false);assert.equal(g.data.eventSerial,serial);
  g.data.workTokens=250;assert.ok(g.tick(now+2000));assert.equal(g.data.workTokens,0);
  assert.ok(g.data.battle.foe.level>=6&&g.data.battle.foe.level<=12);
});

test('ties keep an already-lowest partner, then follow slot order; boarded partners are excluded',()=>{
  const g=new Game({},now);levels(g,{4:24});g.data.activeId=7;
  assert.equal(g.tick(now),false);assert.equal(g.data.activeId,7);
  levels(g,{7:6});assert.ok(g.tick(now+1));assert.equal(g.data.activeId,1);
  g.data.activeId=4;g.data.switchUntil=0;levels(g,{25:9});g.data.daycare={parents:[1,7]};
  assert.ok(g.tick(now+2000));assert.equal(g.data.activeId,25);assert.deepEqual(g.data.slots,[1,4,7,25]);
});

test('level balancing waits for wild battle results and does not override a trainer lineup',()=>{
  const g=new Game({},now,{random:()=>.73});levels(g,{4:24});g.data.activeId=4;g.newWild(now);
  assert.equal(g.tick(now),false);assert.equal(g.data.activeId,4);
  const before=Object.fromEntries(Object.values(g.data.owned).map(p=>[p.uid,p.xp]));
  g.defeatOpponent(now);assert.equal(g.data.activeId,4);assert.ok(g.data.owned[4].xp>before[4]);
  for(const uid of [1,7,25])assert.equal(g.data.owned[uid].xp,before[uid]);
  assert.equal(g.tick(now+2100),false);assert.ok(g.tick(now+2200));assert.equal(g.data.activeId,1);
  g.data.activeId=4;g.data.switchUntil=0;assert.ok(g.challenge(0,now+5000));
  assert.ok(g.tick(now+7000));assert.equal(g.data.activeId,4);assert.equal(g.data.battle.kind,'trainer');
});

test('wild fainting selects the lowest living slot and preserves opponent, PP and capture progress after reload',()=>{
  const {g,b}=fixture(),slots=[...g.data.slots],foe=structuredClone(b.foe),reserve=structuredClone(b.party[7]);
  assert.ok(g.tick(now));assert.equal(b.party[4].hp,0);assert.equal(g.data.activeId,7);assert.equal(b.pendingSwitch,7);
  assert.equal(g.data.battle,b);assert.equal(b.captureAttempts,3);assert.equal(b.foe.hp,foe.hp);
  assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.animation.reason,'faint');
  assert.ok(g.snapshot(now).slots.find(p=>p.uid===4).fainted);
  assert.equal(g.select(4,now+2000),false);assert.equal(g.setSlot(2,4,now+2000),false);
  assert.deepEqual(g.data.slots,slots);
  const reloaded=new Game(g.data,now+1,{random:()=>.73});assert.equal(reloaded.tick(now+1000),false);
  assert.ok(reloaded.tick(now+2000));const restored=reloaded.data.battle;
  assert.equal(reloaded.data.activeId,7);assert.equal(restored.pendingSwitch,undefined);assert.ok(restored.sim);
  assert.equal(restored.party[4].hp,0);assert.equal(restored.party[7].hp,reserve.hp);
  assert.equal(restored.party[7].status,reserve.status);assert.equal(restored.party[7].pp[33],reserve.pp[33]);
  assert.equal(restored.foe.id,foe.id);assert.equal(restored.foe.hp,foe.hp);
  assert.equal(restored.foe.pp[98],foe.pp[98]-1);assert.equal(restored.captureAttempts,3);
  assert.deepEqual(reloaded.data.slots,slots);assert.ok(!reloaded.data.journal.some(e=>e.kind==='loss'));
});

test('faint replacements ignore fainted, boarded and unselected Pokemon, including former battle participants',()=>{
  const {g,b}=fixture();b.party[7].hp=0;g.data.daycare={parents:[25]};
  const outside=g.addPokemon(133,1,'hatch',now);b.party[outside]=g.memberCombatant(g.data.owned[outside]);
  assert.ok(g.tick(now));assert.equal(g.data.activeId,1);assert.equal(b.pendingSwitch,1);
  assert.ok(g.tick(now+2000));assert.equal(g.data.activeId,1);assert.ok(!g.data.slots.includes(outside));
});

test('trainer fainting also picks the lowest survivor, irrespective of the 15-level gap',()=>{
  const g=new Game({},now,{random:()=>.73});levels(g,{1:9,4:8,7:5,25:6});g.data.activeId=4;
  assert.ok(g.challenge(0,now));g.data.battle.party[4].hp=0; // also models a saved faint before replacement
  assert.ok(g.tick(now+2000));assert.equal(g.data.activeId,7);assert.equal(g.data.battle.pendingSwitch,7);
  assert.equal(g.data.animation.reason,'faint');assert.deepEqual(g.data.badges,[]);
});

test('only defeat of all available picked slots ends a battle; unselected reserves cannot rescue it',()=>{
  for(const trainer of [false,true]){
    const g=new Game({},now,{random:()=>.73}),outside=g.addPokemon(133,1,'hatch',now);
    if(trainer)g.challenge(0,now);else g.newWild(now);
    for(const p of Object.values(g.data.battle.party))p.hp=0;
    g.data.battle.party[outside]=g.memberCombatant(g.data.owned[outside]);
    assert.ok(g.tick(now+2000));assert.equal(g.data.battle,null);assert.deepEqual(g.data.badges,[]);
    assert.ok(g.data.journal.some(e=>e.kind==='loss'));assert.deepEqual(g.data.slots,[1,4,7,25]);
    g.data.workTokens=250;assert.ok(g.tick(now+5000));
    assert.ok(Object.values(g.data.battle.party).every(p=>p.hp===p.maxHp));
  }
});

test('a fainted evolved partner stays fainted until the wild battle ends',()=>{
  const {g,b}=fixture();levels(g,{7:16});b.party[7].hp=0;
  assert.ok(g.evolve(7,8,now));assert.equal(b.party[7].hp,0);assert.equal(g.select(7,now+2000),false);
});
