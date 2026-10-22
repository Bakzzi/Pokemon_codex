'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,{Game}=require('../game.cjs'),nursery=require('../daycare.cjs'),W=require('../../shared/kanto-world.cjs'),JW=require('../../shared/johto-world.cjs'),{finishJourney}=require('./helpers/travel-fixture.cjs');
const now=Date.parse('2026-10-22T12:00:00Z');
function fixture(Type){const g=new Type(new Game({},now).data,now,{random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.badges=['brock','misty'];g.data.switchUntil=0;g.nextTick=now;g.data.kantoWorld.location='cerulean';g.data.kantoWorld.position={...W.snapshot(g,now).map.points.cerulean};return g;}
function parents(g){return [g.addPokemon(1,5,'fixture',now),g.addPokemon(132,5,'fixture',now)];}
for(const Type of [PC,Android]){
 test(Type.name+' rejects remote Day Care placement through requests and direct calls without changing ownership',()=>{
  const g=fixture(Type),pair=parents(g),before=structuredClone(g.data.owned);assert.equal(g.requestAction('daycare-start',pair,now),false);assert.equal(nursery.start(g,pair,now),false);assert.equal(g.data.pendingActions.length,0);assert.equal(g.data.daycare,null);assert.deepEqual(g.data.owned,before);assert.match(g.panelState(now).daycare.access.reason,/5번도로/);
 });
 test(Type.name+' reaches the Day Care by real map travel and waits for the current wild battle before depositing',()=>{
  const g=fixture(Type),pair=parents(g);assert.ok(g.requestAction('travel','route-5',now));assert.equal(g.requestAction('daycare-start',pair,now),false);const end=finishJourney(g,now);assert.equal(g.data.kantoWorld.location,'route-5');const walk=g.data.kantoWorld.walk,at=Math.max(end,g.nextTick,g.data.switchUntil,walk?walk.at+walk.duration:0);assert.ok(nursery.access(g,at).atLocation);
  g.newWild(at);const battle=g.data.battle;assert.ok(g.requestAction('daycare-start',pair,at));assert.equal(g.data.battle,battle);assert.equal(g.data.daycare,null);g.defeatOpponent(Math.max(at,g.data.switchUntil));g.tick(Math.max(at,g.nextTick,g.data.switchUntil));assert.deepEqual(g.data.daycare.parents,pair);assert.equal(g.data.pendingActions.length,0);
 });
 test(Type.name+' rejects an old remote reservation and never treats a moving road segment as an arrival',()=>{
  let g=fixture(Type);const pair=parents(g);g.data.kantoWorld.location='route-5';g.data.kantoWorld.walk={at:now,duration:1000,from:{x:0,y:0},to:{x:8,y:0}};assert.equal(g.requestAction('daycare-start',pair,now),false);assert.equal(nursery.start(g,pair,now),false);g.data.kantoWorld.walk=null;
  g.animate('result',{text:'fixture'},now);assert.ok(g.requestAction('daycare-start',pair,now));g.data.kantoWorld.location='cerulean';g=new Type(structuredClone(g.data),now);g.processActions(g.data.switchUntil);assert.equal(g.data.daycare,null);assert.equal(g.data.pendingActions.length,0);
 });
 test(Type.name+' keeps parents and egg progress after leaving and reloading, and permits the existing phone withdrawal',()=>{
  let g=fixture(Type);const pair=parents(g);g.data.kantoWorld.location='route-5';assert.ok(nursery.start(g,pair,now));g.data.kantoWorld.location='cerulean';nursery.advance(g,1234,now);const care=structuredClone(g.data.daycare);g=new Type(structuredClone(g.data),now);assert.deepEqual(g.data.daycare,care);assert.ok(pair.every(uid=>g.isBoarded(uid)));nursery.advance(g,20000,now);const egg=structuredClone(g.data.egg);assert.ok(g.requestAction('daycare-withdraw',undefined,Math.max(now,g.nextTick,g.data.switchUntil)));assert.equal(g.data.daycare,null);assert.deepEqual(g.data.egg,egg);
 });
 test(Type.name+' uses Johto Route 34 and the actual Kanto revisit location instead of stale first-region coordinates',()=>{
  const g=fixture(Type);parents(g);g.data.champion=true;assert.ok(g.unlockJohto(now,[25,1,132]));g.data.switchUntil=0;g.nextTick=now;g.data.mobileStory.scene=null;const pair=Object.values(g.data.owned).filter(p=>[1,132].includes(p.id)).map(p=>p.uid);
  g.data.kantoWorld.location='route-5';assert.equal(g.requestAction('daycare-start',pair,now),false);assert.match(nursery.access(g).reason,/34번도로/);g.data.johto.cleared['j-ilex']=now;g.data.johtoWorld.location='j-route34';g.data.johtoWorld.walk=null;g.data.johtoWorld.position={...JW.maps.johto.points['j-route34']};assert.ok(g.requestAction('daycare-start',pair,now));assert.deepEqual(g.data.daycare.parents,pair);assert.ok(g.requestAction('daycare-withdraw',undefined,now));g.data.johto.cleared['j-ship']=now;g.data.johtoWorld.location='j-k-route-5';assert.ok(nursery.access(g).atLocation);assert.ok(g.requestAction('daycare-start',pair,now));
 });
}
