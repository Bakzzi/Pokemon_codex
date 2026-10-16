'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{species,xpAt,learnedMoves}=require('../pokemon.cjs'),{combatant}=require('../battle.cjs'),nursery=require('../daycare.cjs');
const now=Date.parse('2026-10-14T03:00:00Z');
function fixture(){return new Game({},now,{random:()=>.73});}
function advance(g){return g.tick(Math.max(now,g.nextTick,g.data.switchUntil));}
function level(g,uid,n){const p=g.data.owned[uid];p.level=n;p.xp=xpAt(p.id,n);p.moves=learnedMoves(p.id,n);}
function wild(g){g.newWild(now);g.data.battle.foe=combatant(19,5,[150]);g.data.caught[19]=now;return g.data.battle;}
function finish(g){g.defeatOpponent(Math.max(now,g.data.switchUntil));return Math.max(now,g.data.switchUntil,g.nextTick);}

test('an evolution click preserves the battle and all playback until its final result ends, before a queued challenge',()=>{
  const g=fixture();level(g,4,16);const b=wild(g);g.animate('attack',{moveId:33,actor:'hero'},now);const animation=structuredClone(g.data.animation);
  assert.ok(g.requestAction('evolve',{id:4,to:5},now+1));assert.ok(g.challenge(0,now+1));assert.equal(g.data.battle,b);assert.deepEqual(g.data.animation,animation);assert.equal(g.data.owned[4].id,4);
  assert.equal(g.tick(g.data.switchUntil-1),false);const end=finish(g);assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));
  assert.equal(g.data.owned[4].id,5);assert.equal(g.data.battle,null);assert.equal(g.data.pendingActions.length,0);assert.ok(g.data.pendingChallenge);assert.ok(advance(g));assert.equal(g.data.battle.kind,'trainer');
});

test('unmet evolution conditions persist across restart without blocking other actions or spending items early',()=>{
  let g=fixture();assert.ok(g.requestAction('evolve',{id:4,to:5},now));assert.match(g.pendingActions(now)[0].reason,/Lv.16/);
  const thunder=species.get(25).evolutions.find(e=>e.to===26).item;
  assert.ok(g.requestAction('evolve',{id:25,to:26},now));assert.equal(g.data.owned[25].id,25);assert.equal(g.data.inventory[thunder],undefined);
  assert.ok(g.requestAction('select',7,now));assert.ok(advance(g));assert.equal(g.data.activeId,7);assert.equal(g.data.pendingActions.length,2);assert.equal(g.data.workTokens,0);
  g=new Game(g.data,g.data.switchUntil+1,{random:()=>.73});assert.equal(g.data.pendingActions.length,2);level(g,4,16);g.data.inventory[thunder]=1;
  assert.ok(advance(g));assert.equal(g.data.owned[4].id,5);assert.ok(advance(g));assert.equal(g.data.owned[25].id,26);assert.equal(g.data.inventory[thunder],0);assert.equal(g.data.pendingActions.length,0);
  assert.equal(advance(g),false);assert.equal(g.data.journal.filter(e=>e.kind==='evolution').length,2);
});

test('duplicate requests are idempotent, latest conflicting choice wins and cancellation survives restart',()=>{
  const g=fixture();g.animate('result',{text:'wait'},now);assert.ok(g.requestAction('select',1,now));const first=structuredClone(g.data.pendingActions[0]),journal=g.data.journal.length;
  assert.ok(g.requestAction('select',1,now+1));assert.deepEqual(g.data.pendingActions,[first]);assert.equal(g.data.journal.length,journal);
  assert.ok(g.requestAction('select',7,now+2));assert.equal(g.data.pendingActions.length,1);assert.equal(g.data.pendingActions[0].uid,7);
  const id=g.data.pendingActions[0].id;assert.ok(g.cancelAction(id,now+3));assert.equal(g.cancelAction(id,now+4),false);assert.equal(new Game(g.data,now+5).data.pendingActions.length,0);
  const eevee=g.addPokemon(133,5,'hatch',now);assert.ok(g.requestAction('evolve',{id:eevee,to:134},now));assert.ok(g.requestAction('evolve',{id:eevee,to:135},now));assert.equal(g.data.pendingActions.length,1);assert.equal(g.data.pendingActions[0].to,135);
});

test('manual selection waits for an action boundary, keeps that choice for the next wild encounter and remains free',()=>{
  const g=fixture();g.data.owned[1].id=2;level(g,1,30);g.animate('attack',{moveId:33,actor:'hero'},now);assert.ok(g.requestAction('select',1,now));assert.equal(g.data.activeId,25);
  assert.ok(advance(g));assert.equal(g.data.activeId,1);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.workTokens,0);assert.equal(advance(g),false);assert.equal(g.data.activeId,1);
  g.data.workTokens=250;assert.ok(advance(g));assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.battle.party[1].level,30);assert.equal(g.data.manualSelection,false);
});

test('team placement waits for trainer completion, while an in-party manual switch can execute between turns',()=>{
  const g=fixture(),uid=g.addPokemon(133,5,'hatch',now);assert.ok(g.challenge(0,now));assert.ok(g.requestAction('slot',{slot:0,id:uid},now));assert.ok(g.requestAction('select',7,now));
  assert.ok(advance(g));assert.equal(g.data.activeId,7);assert.equal(g.data.slots[0],1);assert.equal(g.data.pendingActions.length,1);
  g.abandon(g.data.switchUntil);assert.ok(advance(g));assert.equal(g.data.slots[0],uid);assert.equal(g.data.pendingActions.length,0);
});

test('fainted and nursery partners can be reserved; withdrawal resolves a waiting evolution without head-of-line blocking',()=>{
  const g=fixture();level(g,4,16);g.data.daycare={parents:[4,1],produced:true,offspring:[1],progress:20000,required:20000};
  assert.ok(g.requestAction('evolve',{id:4,to:5},now));g.animate('result',{text:'wait'},now);assert.ok(g.requestAction('daycare-withdraw',undefined,now));
  assert.ok(advance(g));assert.equal(g.data.daycare,null);assert.equal(g.data.owned[4].id,4);assert.ok(advance(g));assert.equal(g.data.owned[4].id,5);
  const b=wild(g);b.party[7].hp=0;assert.ok(g.requestAction('select',7,now));assert.match(g.pendingActions(g.data.switchUntil)[0].reason,/회복/);const end=finish(g);assert.ok(g.tick(end));assert.equal(g.data.activeId,7);
});

test('nursery placement waits for the battle and an existing egg, then runs once after hatch',()=>{
  const g=fixture(),a=g.addPokemon(134,20,'fixture',now),b=g.addPokemon(132,20,'fixture',now);wild(g);
  assert.ok(g.requestAction('daycare-start',[a,b],now));assert.equal(g.data.daycare,null);g.data.egg={id:133,parents:[a,b],progress:0,required:100,obtainedAt:now};
  const end=finish(g);assert.equal(g.tick(end),false);assert.match(g.pendingActions(end)[0].reason,/부화/);nursery.advance(g,100,end);assert.ok(g.tick(end));assert.deepEqual(g.data.daycare.parents,[a,b]);assert.equal(g.data.pendingActions.length,0);
  assert.equal(g.tick(end+1),false);assert.equal(g.data.journal.filter(e=>e.kind==='daycare').length,1);
});

test('a successful capture is fully finalized before any queued evolution or slot changes, including reload',()=>{
  let g=fixture();level(g,4,16);wild(g);delete g.data.caught[19];g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;g.random=()=>0;assert.ok(g.capture(now));
  assert.ok(g.requestAction('evolve',{id:4,to:5},now));assert.ok(g.requestAction('slot',{slot:0,id:7},now));const end=g.data.switchUntil;
  g=new Game(g.data,now+1000);assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[4].id,4);assert.ok(!g.data.caught[19]);assert.ok(g.tick(end));assert.ok(g.data.caught[19]);assert.equal(g.data.owned[4].id,4);
  assert.ok(g.tick(end+1));assert.equal(g.data.owned[4].id,5);assert.ok(g.tick(end+2));assert.equal(g.data.slots[0],7);assert.equal(g.data.pendingActions.length,0);assert.equal(g.data.journal.filter(e=>e.kind==='catch').length,1);
});

test('invalid, stale and malformed requests are rejected or removed without consuming a stone',()=>{
  const g=fixture();for(const [kind,value] of [['select',9999],['slot',{slot:6,id:1}],['evolve',{id:4,to:6}],['daycare-start',[1,1]],['johto-unlock',undefined],['abandon',undefined]])assert.equal(g.requestAction(kind,value,now),kind==='abandon');
  assert.ok(g.requestAction('evolve',{id:4,to:5},now));g.data.owned[4].id=6;assert.ok(advance(g));assert.equal(g.data.pendingActions.length,0);assert.ok(g.data.journal.some(e=>e.text.includes('진화 경로가 바뀌었어요.')));
  g.data.pendingActions=[null,{id:1,kind:'evolve',uid:1,to:9999,from:1,queuedAt:now},{id:2,kind:'slot',slot:99,uid:1,queuedAt:now}];assert.equal(new Game(g.data,now).data.pendingActions.length,0);
});

test('ending a challenge and region selection wait for current presentation, and Gen II is never unlocked early',()=>{
  const g=fixture();g.challenge(0,now);const before=structuredClone(g.data.animation);assert.ok(g.requestAction('abandon',undefined,now));assert.deepEqual(g.data.animation,before);assert.equal(g.data.battle.kind,'trainer');assert.ok(advance(g));assert.equal(g.data.battle,null);
  g.data.champion=true;wild(g);assert.ok(g.requestAction('johto-unlock',{speciesIds:[25]},now));assert.equal(g.maxGeneration(),1);const end=finish(g);assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));assert.equal(g.maxGeneration(),2);assert.equal(g.data.pendingActions.length,0);
});
