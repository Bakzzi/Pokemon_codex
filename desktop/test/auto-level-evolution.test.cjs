'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{xpAt}=require('../pokemon.cjs'),{combatant}=require('../battle.cjs');
const now=Date.parse('2026-10-15T03:00:00Z');
const fixture=()=>new Game({},now,{random:()=>.73});
function level(g,uid,n){const p=g.data.owned[uid];p.level=n;p.xp=xpAt(p.id,n);}
function advance(g){return g.tick(Math.max(now,g.nextTick,g.data.switchUntil));}

test('reaching a level threshold evolves each source automatically with no click and preserves its UID and level',()=>{
  for(const [from,threshold,to] of [[1,16,2],[4,16,5],[7,16,8],[5,36,6],[11,10,12],[16,18,17]]){
    const g=fixture(),uid=g.data.owned[from]?from:g.addPokemon(from,threshold-1,'catch',now);g.data.activeId=uid;
    if(!g.data.slots.includes(uid))g.data.slots[1]=uid;
    level(g,uid,threshold-1);g.data.owned[uid].xp=xpAt(from,threshold)-1;
    g.gainXp(uid,1,now);assert.equal(g.data.owned[uid].id,from);assert.equal(g.data.pendingActions.length,0);
    assert.ok(advance(g));const p=g.data.owned[uid];assert.equal(p.id,to);assert.equal(p.uid,uid);assert.equal(p.level,threshold);assert.ok(g.data.caught[from]&&g.data.caught[to]);
    assert.equal(g.data.journal.filter(e=>e.kind==='evolution'&&e.id===to).length,1);
  }
});

test('battle, final result and evolution playback finish in order before a reserved gym starts',()=>{
  const g=fixture();g.data.activeId=4;level(g,4,15);g.data.owned[4].xp=xpAt(4,16)-1;
  g.newWild(now);g.data.battle.foe=combatant(19,10,[150]);g.data.caught[19]=now;assert.ok(g.challenge(0,now));
  g.defeatOpponent(g.data.switchUntil);assert.equal(g.data.owned[4].level,16);assert.equal(g.data.owned[4].id,4);
  const end=g.data.switchUntil;assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[4].id,4);
  assert.ok(g.tick(end));assert.equal(g.data.owned[4].id,5);assert.equal(g.data.battle,null);assert.ok(g.data.pendingChallenge);
  assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(advance(g));assert.equal(g.data.battle.kind,'trainer');
});

test('older saves and high-level captures catch up through consecutive level evolutions after each animation',()=>{
  let g=fixture();g.data.activeId=4;level(g,4,40);const uid=4;g=new Game(g.data,now);
  assert.equal(g.data.owned[uid].id,4);assert.ok(advance(g));assert.equal(g.data.owned[uid].id,5);
  g=new Game(g.data,g.data.switchUntil-1);assert.equal(g.tick(g.data.switchUntil-1),false);assert.equal(g.data.owned[uid].id,5);
  assert.ok(advance(g));assert.equal(g.data.owned[uid].id,6);assert.equal(g.data.owned[uid].level,40);assert.ok(g.data.caught[4]&&g.data.caught[5]&&g.data.caught[6]);
  advance(g);assert.equal(g.data.journal.filter(e=>e.kind==='evolution').length,2);
});

test('trainer rounds and boarded companions wait until the battle ends and the companion returns',()=>{
  const g=fixture();level(g,4,16);g.data.daycare={parents:[4],produced:true};assert.equal(g.autoLevelEvolution(now),false);
  g.data.daycare=null;g.challenge(0,now);assert.equal(g.autoLevelEvolution(g.data.switchUntil),false);assert.equal(g.data.owned[4].id,4);
  g.abandon(g.data.switchUntil);assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(advance(g));assert.equal(g.data.owned[4].id,5);
});

test('stones, friendship and trade paths retain their own conditions, while a level branch respects its stat condition',()=>{
  const g=fixture();level(g,25,40);g.data.inventory[83]=1;
  const kadabra=g.addPokemon(64,40,'catch',now),eevee=g.addPokemon(133,40,'catch',now);g.data.champion=true;g.data.johtoUnlocked=true;g.data.owned[eevee].happiness=255;
  assert.equal(g.autoLevelEvolution(now),false);assert.equal(g.data.owned[25].id,25);assert.equal(g.data.owned[kadabra].id,64);assert.equal(g.data.owned[eevee].id,133);assert.equal(g.data.inventory[83],1);
  const tyrogue=g.addPokemon(236,20,'hatch',now);assert.ok(g.autoLevelEvolution(now));assert.equal(g.data.owned[tyrogue].id,237);
});

test('manual requests still run once, and a season reset clears old high-level evolution eligibility',()=>{
  const g=fixture();level(g,4,16);assert.ok(g.requestAction('evolve',{id:4,to:5},now));advance(g);assert.equal(g.data.journal.filter(e=>e.kind==='evolution').length,1);
  const loaded=new Game(g.data,Date.parse('2026-11-01T00:00:00+09:00'));assert.equal(loaded.data.owned[25].level,5);assert.equal(loaded.data.owned[4],undefined);assert.equal(loaded.autoLevelEvolution(loaded.data.switchUntil),false);
});
