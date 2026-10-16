'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),training=require('../training-device.cjs'),{combatant}=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-14T11:00:00Z');
function fixture(id=64,level=16){const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(id,level,'fixture',now);g.data.trainingDevice.obtainedAt=now;g.requestAction('device-learner',uid,now);return {g,uid};}
function boundary(g,uid){const p=g.data.owned[uid];p.xp=xpAt(p.id,p.level+1)-1;}
function advance(g){return g.tick(Math.max(now,g.data.switchUntil,g.nextTick));}
function wild(g){g.newWild(now);g.data.battle.foe=combatant(19,20,[150]);return g.data.battle;}

test('all four Kanto trade forms auto-evolve after one device level, at any legal source level and after result playback',()=>{
  for(const [from,to,level] of [[64,65,16],[67,68,28],[75,76,25],[93,94,25]]){
    const {g,uid}=fixture(from,level),sibling=g.addPokemon(from,level,'hatch',now);boundary(g,uid);wild(g);g.defeatOpponent(g.data.switchUntil);
    assert.equal(g.data.owned[uid].id,from);assert.equal(g.data.owned[uid].level,level+1);assert.equal(g.data.owned[sibling].id,from);assert.equal(g.data.pendingActions.filter(a=>a.kind==='evolve').length,1);assert.equal(g.data.trainingDevice.learnerUid,uid);
    assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(advance(g));assert.equal(g.data.owned[uid].id,to);assert.ok(g.data.caught[from]&&g.data.caught[to]);assert.equal(g.data.pendingActions.length,0);assert.equal(g.data.owned[uid].deviceLevelUp,undefined);assert.equal(g.data.trainingDevice.learnerUid,uid);
    assert.equal(g.data.journal.filter(e=>e.kind==='evolution').length,1);
  }
});

test('registration, XP without a level, direct battling and earlier forms cannot unlock trade evolution',()=>{
  const {g,uid}=fixture();assert.equal(g.evolutions(uid)[0].ready,false);g.awardXp(combatant(19,5),false,now);assert.equal(g.data.owned[uid].level,16);assert.equal(g.data.pendingActions.length,0);
  boundary(g,uid);g.gainXp(uid,1,now);assert.equal(g.data.owned[uid].level,17);assert.equal(g.evolve(uid,65,now),false);assert.equal(g.data.owned[uid].deviceLevelUp,undefined);
  g.data.slots[0]=uid;g.data.activeId=uid;boundary(g,uid);g.awardXp(combatant(19,20),false,now);assert.equal(g.data.owned[uid].level,18);assert.equal(g.evolve(uid,65,now),false);
  const abra=g.addPokemon(63,15,'fixture',now);g.data.activeId=25;g.requestAction('device-learner',abra,now);boundary(g,abra);g.awardXp(combatant(19,20),false,now);assert.equal(g.data.owned[abra].level,16);assert.ok(g.evolve(abra,64,now));assert.equal(g.evolve(abra,65,now),false);assert.equal(g.data.owned[abra].deviceLevelUp,undefined);
});

test('capture awards and automatic evolution wait through success playback and survive a saved restart exactly once',()=>{
  let {g,uid}=fixture();boundary(g,uid);const b=wild(g);b.foe.hp=1;g.random=()=>0;const xp=g.data.owned[uid].xp;assert.ok(g.capture(g.data.switchUntil));const end=g.data.switchUntil;
  g=new Game(g.data,end-1);assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[uid].xp,xp);assert.equal(g.data.owned[uid].deviceLevelUp,undefined);assert.equal(g.data.pendingActions.length,0);
  assert.ok(g.tick(end));assert.equal(g.data.owned[uid].id,64);assert.equal(g.data.owned[uid].level,17);assert.equal(g.data.pendingActions.length,1);
  g=new Game(g.data,g.data.switchUntil);assert.ok(advance(g));assert.equal(g.data.owned[uid].id,65);const evolved=structuredClone(g.data.owned[uid]);g=new Game(g.data,g.data.switchUntil);advance(g);assert.deepEqual(g.data.owned[uid],evolved);assert.equal(g.data.journal.filter(e=>e.kind==='evolution'&&e.id===65).length,1);
});

test('earned evolution remains per individual when changing learners; cancellation lasts until a new device level-up',()=>{
  let {g,uid}=fixture();boundary(g,uid);wild(g);g.awardXp(combatant(19,20),false,g.data.switchUntil);const proof=structuredClone(g.data.owned[uid].deviceLevelUp),other=g.addPokemon(64,20,'fixture',now);
  assert.ok(g.requestAction('device-learner',other,g.data.switchUntil));const action=g.data.pendingActions.find(a=>a.kind==='evolve');assert.ok(g.cancelAction(action.id,g.data.switchUntil));g=new Game(g.data,g.data.switchUntil);g.data.battle=null;assert.ok(advance(g));assert.equal(g.data.trainingDevice.learnerUid,other);assert.deepEqual(g.data.owned[uid].deviceLevelUp,proof);assert.equal(g.evolutions(uid)[0].ready,true);assert.equal(g.evolutions(other)[0].ready,false);advance(g);assert.equal(g.data.owned[uid].id,64);
  g.requestAction('device-learner',uid,g.data.switchUntil);boundary(g,uid);g.awardXp(combatant(19,20),false,g.data.switchUntil);assert.equal(g.data.owned[uid].id,65);assert.equal(g.data.owned[other].id,64);
});

test('held-item trade paths keep the learned level through the Johto gate and wait for the original item',()=>{
  for(const [from,to,item] of [[61,186,198],[79,199,198],[95,208,210],[117,230,212],[123,212,210],[137,233,229]]){
    let {g,uid}=fixture(from,35);boundary(g,uid);g.awardXp(combatant(19,20),false,now);assert.equal(g.data.owned[uid].id,from);assert.equal(g.data.owned[uid].level,36);assert.equal(g.data.pendingActions.length,0);
    g=new Game(g.data,now);g.data.champion=true;g.data.johtoUnlocked=true;assert.ok(advance(g));assert.equal(g.data.pendingActions.length,1);assert.equal(g.evolve(uid,to,now),false);assert.equal(advance(g),false);g.data.inventory[item]=1;assert.ok(advance(g));assert.equal(g.data.owned[uid].id,to);assert.equal(g.data.inventory[item],0);assert.ok(training.has(g));
  }
});

test('multiple levels still evolve once, level 100 grants no fresh proof, and old saves do not infer learned levels',()=>{
  const {g,uid}=fixture(64,99);boundary(g,uid);g.awardXp(combatant(150,100),false,now);assert.equal(g.data.owned[uid].id,65);assert.equal(g.data.owned[uid].level,100);assert.equal(g.data.journal.filter(e=>e.kind==='evolution').length,1);
  const capped=fixture(64,100);capped.g.awardXp(combatant(150,100),false,now);assert.equal(capped.g.data.owned[capped.uid].id,64);assert.equal(capped.g.data.owned[capped.uid].deviceLevelUp,undefined);
  const legacy=fixture(64,80),loaded=new Game(legacy.g.data,now);assert.equal(loaded.evolutions(legacy.uid)[0].ready,false);assert.equal(loaded.data.pendingActions.length,0);
  const multi=fixture(64,16);boundary(multi.g,multi.uid);for(let id=1;id<=151;id++)multi.g.data.caught[id]=now;multi.g.awardXp(combatant(150,100),true,now);assert.equal(multi.g.data.owned[multi.uid].id,65);assert.ok(multi.g.data.owned[multi.uid].level>17);assert.equal(multi.g.data.journal.filter(e=>e.kind==='evolution').length,1);
});

test('a full action queue retains automatic evolution until room is available, including a saved restart',()=>{
  let {g,uid}=fixture();for(let i=0;i<32;i++){const p=g.addPokemon(1,5,'fixture',now);assert.ok(g.requestAction('evolve',{id:p,to:2},now));}boundary(g,uid);g.awardXp(combatant(19,20),false,now);assert.equal(g.data.pendingActions.length,32);assert.equal(g.data.owned[uid].deviceLevelUp.autoPending,true);
  g=new Game(g.data,now);g.cancelAction(g.data.pendingActions[0].id,now);assert.ok(advance(g));assert.equal(g.data.pendingActions.length,32);assert.equal(g.data.owned[uid].deviceLevelUp.autoPending,false);assert.ok(advance(g));assert.equal(g.data.owned[uid].id,65);
});
