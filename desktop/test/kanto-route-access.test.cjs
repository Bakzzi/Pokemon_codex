'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const K=require('../../shared/kanto-journey.cjs'),W=require('../../shared/kanto-world.cjs');
const {finishJourney}=require('./helpers/travel-fixture.cjs');
const now=Date.parse('2026-10-25T01:00:00Z');
function clear(g,id){for(const n of K.cases.find(c=>c.id===id).entries)g.data.kantoStory.cleared[n]=now;}
function fixture(Type,place,badges){
 const g=new Type({},now,{random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;
 g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.badges=K.order.slice(0,badges).map(i=>K.badges[i]);
 Object.assign(g.rivalProgress('rival-brock'),{state:'won',wonAt:now});
 Object.assign(g.data.kantoWorld,{revision:2,location:place,position:{...W.snapshot(g).map.points[place]},visited:{[place]:now}});
 g.data.switchUntil=0;g.nextTick=now;return g;
}
const clock=g=>Math.max(now,g.nextTick,g.data.switchUntil||0);
function move(g,id){assert.ok(g.requestAction('travel',id,clock(g)));return finishJourney(g,clock(g));}
const trainers=map=>[...K.nodes.values()].filter(n=>n.source?.map===map);
for(const Type of [PC,Android]){
 const platform=Type===PC?'PC':'Android';
 test(platform+': choosing Pewter traverses the forest interior and defeats its ordinary trainers before continuing',()=>{
  const g=fixture(Type,'viridian',0);assert.ok(g.requestAction('evolve',{id:25,to:26},now));
  move(g,'pewter');assert.equal(g.data.kantoWorld.location,'pewter');assert.equal(g.data.kantoWorld.blocked,null);
  assert.ok(K.trainersDone(g,'forest-path'));assert.equal(g.data.pendingActions.length,1);assert.equal(g.data.pendingActions[0].kind,'evolve');
  assert.equal(g.data.owned[25].id,25);assert.equal(g.data.badges.length,0);
 });
 test(platform+': the optional Route 22 rival never blocks the northern forest or Pewter',()=>{
  const g=fixture(Type,'viridian',0);g.rivalProgress('rival-brock').state='unseen';move(g,'pewter');
  assert.equal(g.data.kantoWorld.location,'pewter');assert.equal(g.data.kantoWorld.blocked,null);
  assert.equal(K.trainersDone(g,'forest-path'),true);assert.equal(g.rivalProgress('rival-brock').state,'unseen');
 });
 test(platform+': one destination selection clears Route 3 and reaches Moon entrance without its exit or shore trainer',()=>{
  const g=fixture(Type,'pewter',1);move(g,'mt-moon');
  assert.equal(g.data.kantoWorld.location,'mt-moon');assert.equal(g.data.kantoWorld.blocked,null);assert.ok(K.trainersDone(g,'route3-path'));
  assert.equal(K.done(g,'k-moon-duo'),false);assert.equal(K.done(g,'k-npc-route4-1'),false);assert.equal(K.trainerAccess(g,K.nodes.get('k-npc-route4-1')),false);
  move(g,'cerulean');assert.notEqual(g.data.kantoWorld.location,'cerulean');assert.equal(W.checkpoint(g).canPass,false);
  clear(g,'moon-path');move(g,'cerulean');assert.equal(g.data.kantoWorld.location,'cerulean');assert.equal(K.done(g,'k-npc-route4-1'),false);
  g.data.mobileStory.safari.completedAt=now;move(g,'route-4');assert.ok(K.ready(g,'k-npc-route4-1'));move(g,'cerulean');assert.ok(K.done(g,'k-npc-route4-1'));assert.deepEqual(K.nodes.get('k-npc-route4-1').team.map(p=>p.level),[31,31,31]);
 });
 test(platform+': Rock Tunnel approach meets only the northern trainer, not southern or water-only opponents',()=>{
  const g=fixture(Type,'cerulean',3);clear(g,'moon-path');g.data.kantoStory.cleared['k-aide']=now;
  move(g,'rock-tunnel');assert.equal(g.data.kantoWorld.location,'rock-tunnel');assert.equal(g.data.kantoWorld.blocked,null);
  assert.ok(K.trainersDone(g,'route9-path'));assert.deepEqual(trainers('Route10').filter(n=>K.done(g,n.id)).map(n=>n.id),['k-npc-route10-4']);
  move(g,'lavender');assert.notEqual(g.data.kantoWorld.location,'lavender');clear(g,'tunnel-path');move(g,'lavender');
  assert.equal(g.data.kantoWorld.location,'lavender');assert.equal(trainers('Route10').filter(n=>K.done(g,n.id)).length,5);assert.equal(K.done(g,'k-npc-route10-1'),false);
  g.data.mobileStory.safari.completedAt=now;g.data.badges=K.order.slice(0,6).map(i=>K.badges[i]);move(g,'route-10');assert.ok(K.ready(g,'k-npc-route10-1'));move(g,'lavender');assert.ok(K.done(g,'k-npc-route10-1'));
 });
 test(platform+': Seafoam approaches meet eastern swimmers, with western opponents after the crossing',()=>{
  const g=fixture(Type,'fuchsia',6);g.data.mobileStory.safari.completedAt=now;
  move(g,'seafoam');assert.equal(g.data.kantoWorld.location,'seafoam');assert.equal(g.data.kantoWorld.blocked,null);
  assert.equal(trainers('Route20').filter(n=>K.done(g,n.id)).length,3);assert.ok(trainers('Route20').filter(n=>K.done(g,n.id)).every(n=>n.source.x>=58));
  move(g,'cinnabar');assert.notEqual(g.data.kantoWorld.location,'cinnabar');clear(g,'seafoam-crossing');move(g,'cinnabar');assert.equal(g.data.kantoWorld.location,'cinnabar');assert.ok(trainers('Route20').every(n=>K.done(g,n.id)));
 });
 test(platform+': Fuchsia reaches sleeping Snorlax through 15-14-13, while both directions remain blocked at its crossing',()=>{
  const g=fixture(Type,'route-15',6);g.data.kantoStory.roads['route-16']=now;g.data.kantoStory.drinkAt=now;
  assert.ok(g.requestAction('travel','route-12',now));const trip=g.data.kantoWorld.journey;
  assert.ok(trip.segments.some(s=>s.location==='route-14'));assert.ok(trip.segments.some(s=>s.location==='route-13'));assert.ok(!trip.segments.some(s=>s.location==='route-17'));
  finishJourney(g,now);assert.equal(g.data.kantoWorld.location,'route-12');assert.equal(g.data.kantoWorld.position.y,100);assert.equal(W.checkpoint(g).sprite,'pokemon:143');assert.equal(W.checkpoint(g).canPass,false);
  assert.ok(!g.data.kantoStory.roads['route-12']);g.data.trainingDevice.fluteObtainedAt=now;assert.ok(g.canChallenge('road-snorlax'));
  g.data.kantoStory.roads['route-12']=now;move(g,'route-12');assert.equal(g.data.kantoWorld.position.y,92);assert.equal(g.data.kantoWorld.blocked,null);
  delete g.data.kantoStory.roads['route-12'];move(g,'route-13');assert.equal(g.data.kantoWorld.position.y,92);assert.equal(W.checkpoint(g).canPass,false);
 });
 test(platform+': old active cave journeys revalidate safely, preserving encounters, road progress and movement balances',()=>{
  let g=fixture(Type,'route-3',1);clear(g,'route3-path');const w=g.data.kantoWorld,to={...W.snapshot(g).map.points['mt-moon']};
  w.revision=1;w.roadProgress={location:'route-3',required:17,completed:8};
  w.journey={destination:'mt-moon',position:to,name:'old',segments:[{location:'route-3',path:[w.position]}],index:0,blocked:{location:'mt-moon',checkpoint:'route-4',position:to,gatePosition:{x:76,y:44}},bankCells:2,bankLeg:true};
  g.data.mapTravel={observed:7000,credit:301,bank:4700};g.newWild(now);const saved=structuredClone(g.data);
  g=new Type(saved,now+1,{random:()=>.7});assert.ok(g.data.kantoWorld.journey.revalidate);assert.equal(g.advanceTravel(now+10000),false);
  for(const key of ['battle','owned','caught','kantoStory','mapTravel'])assert.deepEqual(g.data[key],saved[key],key);
  g.data.battle=null;g.data.animation=null;g.nextTick=now;g.data.switchUntil=0;assert.ok(g.advanceTravel(now+10000));
  assert.deepEqual(g.data.kantoWorld.roadProgress,saved.kantoWorld.roadProgress);assert.deepEqual(g.data.mapTravel,saved.mapTravel);assert.equal(g.data.kantoWorld.journey.blocked,null);
  if(Type===Android){assert.equal(g.data.kantoWorld.journey.bankCells,2);assert.equal(g.data.kantoWorld.journey.bankLeg,true);}
 });
 test(platform+': tower summary follows investigation, scope, ghost resolution and rescue after reload',()=>{
  let g=fixture(Type,'tower',4);g.data.kantoStory.cleared['k-tower-visit']=now;
  const text=()=>g.panelState(now).kantoStory.placeSummary;assert.match(text(),/정체를 확인할 방법/);
  g.data.mobileStory.scopeObtainedAt=now;assert.match(text(),/실프스코프/);assert.doesNotMatch(text(),/방법을 찾아/);
  g.data.mobileStory.rescue.wins[1]=now;assert.match(text(),/위층에 붙잡힌 사람/);
  g.data.mobileStory.rescue.completedAt=now;g=new Type(structuredClone(g.data),now+1);assert.match(text(),/무사히 돌아/);assert.doesNotMatch(text(),/방법을 찾아/);
 });
 test(platform+': each sleeping Snorlax card uses its own road outcome, including old saves',()=>{
  let g=fixture(Type,'route-12',6);g.data.trainingDevice.fluteObtainedAt=now;g.data.trainingDevice.snorlaxWonAt=now;
  g.data.kantoStory.roads['route-16']=now;g.addPokemon(143,30,'fixture',now);
  const card=()=>g.panelState(now).trainingDevice;
  assert.equal(card().steps.find(r=>r.id==='road-snorlax').done,false);assert.equal(card().snorlaxCaught,false);
  assert.equal(card().steps.find(r=>r.id==='road-snorlax').available,true);
  assert.ok(g.challenge('road-snorlax',now));g.data.battle.foe.hp=0;g.defeatOpponent(now);
  assert.equal(g.data.kantoStory.roadCaptures['route-12'],false);delete g.data.kantoStory.roadCaptures;
  g.data.kantoStory.roads['route-12']=now;assert.equal(card().snorlaxCaught,null);
  g.data.kantoStory.roadCaptures={'route-12':false,'route-16':true};assert.equal(card().snorlaxCaught,false);
  g=new Type(structuredClone(g.data),now+1);assert.equal(card().snorlaxCaught,false);
  g.data.kantoWorld.location='route-16';assert.equal(card().snorlaxCaught,true);
 });
}
