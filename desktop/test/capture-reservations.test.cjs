'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Game}=require('../game.cjs'),{combatant}=require('../battle.cjs'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-16T08:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.addPokemon(133,5,'fixture',now);g.newWild(now);g.data.battle.foe=combatant(133,5);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;return g;}
function caught(g,edit){g.random=()=>0;assert.ok(g.capture(now));const c=g.data.captureAnimation;if(edit)edit(g);assert.ok(g.tick(c.at+captureTiming(c).duration));}
test('registered species stay battle-only unless reserved; successful duplicates use separate UIDs without boosting unique dex',()=>{
  let g=fixture(),boost=g.experienceBoost();assert.equal(g.captureOpportunity(),null);assert.ok(g.reserveCapture(133,1,now));assert.equal(g.data.captureReservations[133].remaining,1);
  g.data.captureReservations[133].remaining=7;g=new Game(g.data,now+1);assert.equal(g.panelState(now).collection.find(p=>p.id===133).captureReserved,1);caught(g);assert.equal(g.data.captureReservations[133],undefined);assert.equal(Object.values(g.data.owned).filter(p=>p.id===133).length,2);assert.deepEqual(g.experienceBoost(),boost);
});
test('failures and fainting do not consume the reservation; a successful final catch clears it',()=>{
  const g=fixture();g.reserveCapture(133,1,now);g.random=()=>.999999;assert.equal(g.capture(now),false);assert.equal(g.data.captureReservations[133].remaining,1);g.data.battle.foe.hp=0;assert.equal(g.captureOpportunity(),null);g.defeatOpponent(g.data.switchUntil);assert.equal(g.data.captureReservations[133].remaining,1);
  g.newWild(g.data.switchUntil);g.data.battle.foe=combatant(133,5);g.data.battle.foe.hp=1;const at=g.data.switchUntil;g.random=()=>0;assert.ok(g.capture(at));const c=g.data.captureAnimation;assert.ok(g.tick(c.at+captureTiming(c).duration));assert.equal(g.data.captureReservations[133],undefined);
});
test('canceling or editing during a successful ball does not spoil its committed result or consume the new plan',()=>{
  for(const next of [0,1]){const g=fixture();g.reserveCapture(133,1,now);caught(g,g=>g.reserveCapture(133,next,now+1));assert.equal(Object.values(g.data.owned).filter(p=>p.id===133).length,2);assert.equal(g.data.captureReservations[133]?.remaining,next||undefined);}
});
test('reservations never make trainers catchable or alter starters, evolution-only, generation and unseen encounter rules',()=>{
  const g=fixture();for(const id of [25,26,65,68,76,94]){g.data.seen[id]=now;assert.equal(g.reserveCapture(id,1,now),false);}assert.equal(g.reserveCapture(19,1,now),false);assert.equal(g.reserveCapture(133,2,now),false);assert.equal(g.reserveCapture(133,100,now),false);
  g.reserveCapture(133,1,now);g.data.battle.kind='trainer';assert.equal(g.captureOpportunity(),null);assert.equal(g.capture(now),false);assert.equal(g.data.captureReservations[133].remaining,1);
});
test('registered event encounters can be requested again without changing completed story progress',()=>{
  const g=fixture();g.data.battle=null;g.addPokemon(143,30,'fixture',now);g.data.trainingDevice.fluteObtainedAt=now;g.data.trainingDevice.snorlaxWonAt=now;
  assert.equal(g.canChallenge('road-snorlax'),false);assert.ok(g.reserveCapture(143,1,now));assert.equal(g.canChallenge('road-snorlax'),true);assert.ok(g.challenge('road-snorlax',g.data.switchUntil));assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.battle.foe.id,143);assert.ok(g.data.trainingDevice.snorlaxWonAt);
});
test('seen-only species never offer extra capture reservations and still receive normal first-catch attempts',()=>{
  let g=fixture();g.data.seen[19]=now;g.data.battle.foe=combatant(19,5);g.data.battle.foe.hp=1;
  assert.equal(g.canReserveCapture(19),false);assert.equal(g.reserveCapture(19,2,now),false);assert.equal(g.panelState(now).collection.find(p=>p.id===19).canReserveCapture,false);assert.ok(g.captureOpportunity());
  g.data.captureReservations[19]={remaining:2,revision:20};g=new Game(g.data,now+1);assert.equal(g.data.captureReservations[19],undefined);assert.ok(g.captureOpportunity());g.random=()=>0;assert.ok(g.capture(now+1));const c=g.data.captureAnimation;assert.ok(g.tick(c.at+captureTiming(c).duration));assert.equal(g.canReserveCapture(19),true);
});
