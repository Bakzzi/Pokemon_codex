'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,W=require('../../shared/kanto-world.cjs'),K=require('../../shared/kanto-journey.cjs');
const {finishJourney}=require('./helpers/travel-fixture.cjs'),now=Date.parse('2026-10-25T07:00:00Z');
function fixture(Type){const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.switchUntil=0;g.nextTick=now;g.data.kantoWorld.location='viridian';g.data.kantoWorld.position={...W.snapshot(g).map.points.viridian};return g;}
const clock=g=>Math.max(now,g.nextTick,g.data.switchUntil||0);
for(const [name,Type]of [['PC',PC],['Android',Android]]){
 test(name+' reaches and challenges Brock without ever meeting the optional Route 22 rival',()=>{
  const g=fixture(Type);assert.ok(g.requestAction('travel','pewter',now));finishJourney(g,now);
  assert.equal(g.data.kantoWorld.location,'pewter');assert.equal(g.rivalProgress('rival-brock').state,'unseen');assert.ok(K.trainersDone(g,'forest-path'));
  for(const id of K.cases.find(c=>c.id==='trainers-gym-0').entries)g.data.kantoStory.cleared[id]=now;
  assert.ok(g.challenge(0,clock(g)));assert.equal(g.data.battle.bossIndex,0);assert.equal(g.data.battle.storyId,null);
 });
 test(name+' restores an old invented forest roadblock without consuming balances or clearing any rival',()=>{
  let g=fixture(Type);Object.assign(g.data.kantoWorld,{location:'route-2',position:{x:44,y:76},blocked:{location:'pewter',checkpoint:'forest',position:W.snapshot(g).map.points.pewter,gatePosition:W.snapshot(g).map.points.forest}});g.data.mapTravel={observed:7000,bank:3333,credit:777};g.newWild(now);const battle=structuredClone(g.data.battle);
  g=new Type(structuredClone(g.data),now);assert.equal(W.checkpoint(g),null);assert.deepEqual(g.data.battle,battle);assert.equal(g.controlTick(now),false);assert.deepEqual(g.data.mapTravel,{observed:7000,bank:3333,credit:777});
  g.data.battle=null;assert.ok(g.controlTick(clock(g)));assert.ok(g.data.kantoWorld.journey);assert.equal(g.rivalProgress('rival-brock').state,'unseen');assert.equal(g.data.mapTravel.bank,3333);
 });
 for(const late of [false,true])test(name+' '+(late?'late':'early')+' Route 22 encounter occurs after arrival, pauses for manual dialogue and never consumes another movement cell',()=>{
  let g=fixture(Type);if(late)g.data.badges=[...K.badges];const id=late?'rival-league':'rival-brock';g.recordTravelSteps(0);g.recordTravelSteps(7000);
  assert.ok(g.requestAction('travel','route-22',now));if(Type===Android)assert.ok(g.requestAction('travel-bank',null,now));
  let t=now;for(let i=0;i<100&&!g.presentation();i++){t=clock(g);if(Type===PC)for(let j=0;j<20;j++)g.onWildEnd({kind:'wild',location:g.data.kantoWorld.location},t);g.controlTick(t);}
  assert.equal(g.data.kantoWorld.location,'route-22');assert.equal(g.data.battle.storyId,id);assert.equal(g.presentation().name,'그린');const scene=structuredClone(g.presentation()),account=structuredClone(g.data.mapTravel),trip=structuredClone(g.data.kantoWorld.journey);
  for(let i=0;i<5;i++){g.controlTick(t+10000);g.tick(t+10000);}
  assert.deepEqual(g.presentation(),scene);assert.deepEqual(g.data.mapTravel,account);assert.deepEqual(g.data.kantoWorld.journey,trip);
  if(Type===Android)assert.equal(account.bank,5000,'Viridian to Route 22 is one adjacent map cell');
  g=new Type(structuredClone(g.data),t);assert.equal(g.data.battle.storyId,id);assert.deepEqual(g.presentation(),scene);assert.deepEqual(g.data.mapTravel,account);
 });
 test(name+' first unseen Route 22 encounter expires after Brock and cannot replace the late encounter',()=>{
  const g=fixture(Type);g.data.badges=['brock'];g.data.kantoWorld.location='route-22';assert.equal(g.canChallenge('rival-brock'),false);assert.equal(g.routeRivalTick(now),false);assert.equal(g.presentation(),null);
  g.data.badges=[...K.badges];assert.ok(g.routeRivalTick(now));assert.equal(g.data.battle.storyId,'rival-league');assert.equal(g.rivalProgress('rival-brock').state,'unseen');
 });
}
