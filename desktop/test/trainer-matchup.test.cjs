'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),battle=require('../battle.cjs');
const {xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-15T08:00:00Z');
function fixture(){
  const g=new Game({},now,{random:()=>.73});
  for(const [uid,move] of [[1,202],[4,52],[7,55],[25,85]]){
    const p=g.data.owned[uid];p.level=30;p.xp=xpAt(p.id,30);p.moves=[move];
  }
  g.data.owned[4].level=5;g.data.activeId=4;g.challenge(0,now);
  return g;
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}

test('trainer opening waits for the encounter then sends a counter from picked slots without work or healing',()=>{
  const g=fixture(),b=g.data.battle,before=structuredClone(b.party),slots=[...g.data.slots];
  assert.equal(battle.bestPartner(g,b),7);assert.equal(g.data.animation.kind,'encounter');
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);
  assert.equal(g.data.activeId,7);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.animation.reason,'matchup');
  assert.deepEqual(b.party,before);assert.deepEqual(g.data.slots,slots);assert.equal(g.data.workTokens,0);
  const serial=g.data.eventSerial;assert.equal(g.tick(g.data.switchUntil-1),false);assert.equal(g.data.eventSerial,serial);
  advance(g);assert.ok(b.sim);assert.equal(b.pendingSwitch,undefined);assert.equal(g.data.activeId,7);
});

test('matchups reevaluate on the next foe and preserve the native party and PP',()=>{
  const g=fixture(),b=g.data.battle;advance(g);advance(g);
  g.data.pendingBattle=null;b.foe.hp=0;g.defeatOpponent(g.data.switchUntil); // model completed faint/result playback
  b.foe=battle.combatant(7,30,[55]); // a new water opponent favors Pikachu over Grass/Poison
  b.party[1].pp[202]=0;
  const hp=b.party[1].hp;assert.equal(battle.bestPartner(g,b),25);advance(g);
  assert.equal(g.data.activeId,25);assert.equal(g.data.animation.reason,'matchup');
  assert.equal(b.party[1].hp,hp);assert.equal(b.party[1].pp[202],0);assert.ok(b.sim);
});

test('only selected, living, non-boarded partners qualify; equal matchups keep the active partner',()=>{
  const g=fixture(),b=g.data.battle,outside=g.addPokemon(150,100,'event',now);b.party[outside]=g.memberCombatant(g.data.owned[outside]);
  b.party[1].hp=0;g.data.daycare={parents:[7]};assert.equal(battle.bestPartner(g,b),4);
  g.data.slots=[25,null,null,null,null,null];assert.equal(battle.bestPartner(g,b),25);
  const same=g.addPokemon(25,30,'event',now);b.party[same]=structuredClone(b.party[25]);g.data.slots=[same,25,null,null,null,null];g.data.activeId=25;
  assert.equal(battle.bestPartner(g,b),25);
});

test('PP exhaustion and remaining HP affect the choice, and real type/ability immunities beat raw power',()=>{
  const foe=battle.combatant(7,30,[55]),electric=battle.combatant(25,30,[85]),normal=battle.combatant(128,30,[33]);
  assert.ok(battle.matchupScore(electric,foe)>battle.matchupScore(normal,foe));electric.pp[85]=0;
  assert.ok(battle.matchupScore(electric,foe)<battle.matchupScore(normal,foe));
  const healthy=battle.combatant(7,30,[55]),weak=structuredClone(healthy);weak.hp=1;
  assert.ok(battle.matchupScore(healthy,foe)>battle.matchupScore(weak,foe));
  const ground=battle.combatant(51,30,[89]),ghost=battle.combatant(94,30,[101],{ability:26});
  assert.equal(battle.matchupScore(ground,ghost),.01); // Levitate blocks Earthquake
  electric.pp[85]=1;assert.equal(battle.matchupScore(electric,battle.combatant(74,30,[33])),.01); // Ground typing blocks Thunderbolt
});

test('faint replacement uses matchup, not lowest level, and survives reload without a second evaluation',()=>{
  const g=fixture(),b=g.data.battle;b.party[4].hp=0;
  advance(g);assert.equal(g.data.animation.kind,'faint');advance(g);
  assert.equal(g.data.activeId,7);assert.equal(g.data.animation.reason,'faint');
  const saved=structuredClone(g.data),loaded=new Game(saved,g.data.switchUntil,{random:()=>.73});
  assert.equal(loaded.data.battle.matchupPending,undefined);advance(loaded);assert.equal(loaded.data.activeId,7);
  assert.equal(loaded.data.battle.party[4].hp,0);
});

test('a voluntary manual selection is honored for the current foe; old trainer saves get one deferred evaluation',()=>{
  const g=fixture(),at=g.data.switchUntil;assert.ok(g.select(7,at));assert.equal(g.data.battle.matchupPending,undefined);
  advance(g);assert.equal(g.data.activeId,7);
  const saved=structuredClone(g.data);delete saved.battle.matchupRevision;
  const loaded=new Game(saved,g.data.switchUntil,{random:()=>.73});assert.equal(loaded.data.battle.matchupPending,true);
  assert.equal(loaded.data.battle.matchupRevision,1);assert.equal(loaded.data.battle.party[7].hp,saved.battle.party[7].hp);
});

test('trapping prevents an illegal automatic switch without stopping turns, then retries after release',()=>{
  const g=fixture(),b=g.data.battle;delete b.matchupPending;
  const sim=battle.engine(g,b);sim.p1.active[0].trapped=true;b.matchupPending=true;
  const hp=b.party[4].hp;advance(g);assert.equal(g.data.activeId,4);assert.ok(b.turn>0);assert.equal(b.matchupPending,true);
  assert.ok(b.party[4].hp<=hp);sim.p1.active[0].trapped=false;
  // Let any already-presented attack/faint result finish before attempting the switch.
  for(let i=0;i<5&&g.data.activeId===4;i++)advance(g);
  assert.equal(g.data.activeId,7);
});

test('a flute encounter remains capturable wild combat and does not enable trainer matchup rotation',()=>{
  const g=fixture();g.data.battle=null;g.data.switchUntil=0;g.nextTick=0;
  g.data.trainingDevice.fluteObtainedAt=now;assert.ok(g.challenge('road-snorlax',now));
  assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.battle.matchupPending,undefined);
});
