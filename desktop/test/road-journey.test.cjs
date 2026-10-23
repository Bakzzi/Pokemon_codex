'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-world.cjs'),J=require('../../shared/johto-world.cjs');
const now=Date.parse('2026-10-22T06:00:00Z');
const {finishJourney}=require('./helpers/travel-fixture.cjs');
function ready(Type){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}
function clock(g){return Math.max(now,g.nextTick,g.data.switchUntil||0);}
function win(g){const t=clock(g);g.newWild(t);const b=g.data.battle;b.foe.hp=0;g.showFaint(t);const result=clock(g);assert.equal(g.data.battle,b);assert.ok(g.tick(result));return b;}
for(const Type of [PC]){
 test(Type.name+' shared map coordinates do not bypass a gated building or cave',()=>{
  const g=ready(Type);g.data.badges=['brock','misty','surge'];g.data.kantoWorld.location='cerulean';g.data.kantoWorld.position={...K.snapshot(g).map.points.cerulean};
  assert.ok(g.requestAction('travel','cerulean-cave',now));finishJourney(g,now);assert.equal(K.current(g).id,'cerulean');assert.equal(K.checkpoint(g).checkpoint,'cerulean-cave');assert.equal(K.checkpoint(g).canPass,false);
  g.data.champion=true;g.unlockJohto(clock(g),[25]);g.data.johto.cleared['j-ice-path']=now;const w=J.init(g);w.location='j-ice';w.position={...J.maps.johto.points['j-ice']};g.data.switchUntil=0;g.nextTick=now;
  assert.ok(g.requestAction('travel','j-dragon',now));finishJourney(g,now);assert.equal(J.init(g).location,'j-ice');assert.equal(J.checkpoint(g).checkpoint,'j-dragon');assert.equal(J.checkpoint(g).canPass,false);
 });
 test(Type.name+' crosses each road only after the randomly drawn completed wild encounters and never auto-starts a gym',()=>{
  const g=ready(Type);assert.ok(g.requestAction('travel','pewter',now));assert.equal(K.current(g).id,'route-1');assert.equal(g.data.kantoWorld.journey.destination,'pewter');
  const quota=g.panelState(now).kantoWorld.roadProgress.required;assert.equal(quota,16);for(let i=0;i<quota-1;i++){win(g);assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,i+1);assert.equal(g.advanceTravel(clock(g)),false);}
  win(g);assert.equal(g.advanceTravel(clock(g)-1),false);assert.ok(g.advanceTravel(clock(g)));assert.equal(K.current(g).id,'viridian');assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress,null);
  assert.ok(g.controlTick(clock(g)));assert.equal(K.current(g).id,'route-2');assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,0);
  for(let i=0;i<g.data.kantoWorld.roadProgress.required;i++)win(g);while(g.data.kantoWorld.journey)assert.ok(g.controlTick(clock(g)));
  assert.equal(K.current(g).id,'pewter');assert.equal(g.data.pendingChallenge,null);assert.equal(g.data.battle,null);assert.deepEqual(g.data.badges,[]);
 });
 test(Type.name+' capture counts after the ball resolves, once, while failures and story encounters do not count',()=>{
  const g=ready(Type);g.random=()=>0;g.newWild(now);const b=g.data.battle;b.foe.hp=1;
  assert.equal(g.panelState(now).kantoWorld.roadProgress.completed,0);assert.ok(g.capture(now));assert.equal(g.panelState(now).kantoWorld.roadProgress.completed,0);
  assert.ok(g.tick(clock(g)));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,1);g.onWildEnd(b,clock(g));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,1);
  g.onWildEnd({kind:'trainer',location:'route-1'},clock(g));g.onWildEnd({kind:'wild',storyId:'road-snorlax',location:'route-1'},clock(g));g.onWildEnd({kind:'wild',location:'route-2'},clock(g));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,1);
  g.random=()=>.999;g.newWild(clock(g));g.data.battle.foe.hp=1;assert.equal(g.capture(clock(g)),false);assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,1);
 });
 test(Type.name+' a wild loss or draw finishes one encounter without counting individual turns',()=>{
  const g=ready(Type);g.newWild(now);assert.equal(g.panelState(now).kantoWorld.roadProgress.completed,0);g.data.battle.party[g.data.activeId].hp=0;g.showFaint(now);assert.ok(g.tick(clock(g)));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,1);
  g.newWild(clock(g));g.deferBattle('draw',clock(g));assert.ok(g.tick(clock(g)));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,2);
 });
 test(Type.name+' saves the itinerary and partial progress, preserves it on retarget and resets on road re-entry',()=>{
  let g=ready(Type);g.requestAction('travel','pewter',now);for(let i=0;i<3;i++)win(g);const t=clock(g),quota=g.data.kantoWorld.roadProgress.required;g=new Type(structuredClone(g.data),t);assert.equal(g.data.kantoWorld.roadProgress.required,quota);
  assert.equal(g.panelState(t).kantoWorld.roadProgress.completed,3);assert.equal(g.data.kantoWorld.journey.destination,'pewter');assert.ok(g.requestAction('travel','viridian',t));assert.equal(g.panelState(t).kantoWorld.roadProgress.completed,3);
  assert.equal(g.data.kantoWorld.roadProgress.required,quota);for(let i=3;i<quota;i++)win(g);while(g.data.kantoWorld.journey)assert.ok(g.controlTick(clock(g)));assert.equal(K.current(g).id,'viridian');g.requestAction('travel','pallet',clock(g));assert.ok(g.controlTick(clock(g)));assert.equal(K.current(g).id,'route-1');assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,0);
 });
 test(Type.name+' Johto uses local encounter identity and the same per-road quota',()=>{
  const g=ready(Type);g.data.champion=true;g.unlockJohto(now,[25]);assert.ok(g.requestAction('travel','j-violet',now));assert.ok(g.controlTick(clock(g)));assert.equal(J.init(g).location,'j-route29');
  const quota=J.snapshot(g,now).roadProgress.required;for(let i=0;i<quota-1;i++)win(g);assert.equal(g.advanceTravel(clock(g)),false);assert.equal(g.wildOptions().location,'j-route29');win(g);assert.ok(g.controlTick(clock(g)));assert.equal(J.init(g).location,'j-cherrygrove');
 });
 test(Type.name+' a manual trainer challenge pauses the road journey and restores the same wild encounter',()=>{
  const g=ready(require('./helpers/story-fixture.cjs').PC);g.requestAction('travel','pewter',now);for(let i=0;i<3;i++)win(g);g.newWild(clock(g));const b=g.data.battle,trip=structuredClone(g.data.kantoWorld.journey),quota=g.data.kantoWorld.roadProgress.required;assert.ok(g.challenge(0,clock(g)));g.tick(clock(g));
  assert.equal(g.data.suspendedWild,b);assert.deepEqual(g.data.kantoWorld.journey,trip);assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,3);
  g.data.mobileStory.scene=null;g.restoreWild(clock(g));assert.equal(g.data.battle,b);g.data.battle.foe.hp=0;g.showFaint(clock(g));g.tick(clock(g));assert.equal(g.panelState(clock(g)).kantoWorld.roadProgress.completed,4);assert.equal(g.data.kantoWorld.roadProgress.required,quota);
 });
 test(Type.name+' an existing ten-encounter save keeps completed battles and persists its newly drawn quota',()=>{
  const g=ready(Type);g.data.kantoWorld.roadProgress={location:'route-1',completed:9};g.random=()=>.999;
  const p=K.snapshot(g,now).roadProgress;assert.deepEqual(p,{location:'route-1',completed:9,required:20});
  const loaded=new Type(structuredClone(g.data),now);loaded.random=()=>{throw new Error('A saved road quota must not be rerolled');};
  assert.deepEqual(K.snapshot(loaded,now).roadProgress,p);assert.deepEqual(K.snapshot(loaded,now+1).roadProgress,p);
 });
 test(Type.name+' entering another road or returning rerolls the quota, but a same-road selection preserves it',()=>{
  const g=ready(Type);g.random=()=>0;g.data.kantoWorld.roadProgress=null;g.requestAction('travel','viridian',now);assert.equal(g.data.kantoWorld.roadProgress.required,10);
  g.random=()=>.999;g.requestAction('travel','pewter',clock(g));assert.equal(g.data.kantoWorld.roadProgress.required,10);finishJourney(g,clock(g));
  g.requestAction('travel','pallet',clock(g));assert.ok(g.controlTick(clock(g)));assert.equal(g.data.kantoWorld.roadProgress.required,20);assert.equal(g.data.kantoWorld.roadProgress.completed,0);
 });
}
test('every quota from ten through twenty has an equal-sized draw interval',()=>{
 const travel=require('../../shared/world-travel.cjs'),counts=new Map();
 for(let i=0;i<1100;i++){const p=travel.snapshot({location:'route-1'},()=>(i+.5)/1100).roadProgress;counts.set(p.required,(counts.get(p.required)||0)+1);}
 assert.deepEqual([...counts.keys()],[10,11,12,13,14,15,16,17,18,19,20]);assert.ok([...counts.values()].every(n=>n===100));
});
for(const [from,to,roads] of [['cerulean','mt-moon',['route-4']],['viridian','forest',['route-2']],['cerulean','sea-cottage',['route-24','route-25']]]){
 test('a shared-cell destination preserves every intermediate road: '+from+' to '+to,()=>{
  const g=ready(PC);g.data.badges=['brock','misty'];g.data.kantoWorld.location=from;g.data.kantoWorld.position={...K.snapshot(g,now).map.points[from]};
  assert.ok(g.requestAction('travel',to,now));assert.deepEqual(g.data.kantoWorld.journey.segments.filter(s=>roads.includes(s.location)).map(s=>s.location),roads);
  for(const road of roads){
   for(let i=0;i<12&&K.current(g).id!==road;i++)assert.ok(g.controlTick(clock(g)));
   assert.equal(K.current(g).id,road);assert.equal(g.wildOptions().location,road);const quota=g.data.kantoWorld.roadProgress.required;
   for(let i=0;i<quota-1;i++){win(g);assert.equal(g.advanceTravel(clock(g)),false);assert.equal(K.current(g).id,road);}
   win(g);assert.ok(g.advanceTravel(clock(g)));
  }
  finishJourney(g,clock(g));assert.equal(K.current(g).id,to);assert.equal(g.data.pendingChallenge,null);
 });
}
test('retargeting a shared road cell and reloading cannot erase its quota',()=>{
 let g=ready(PC);g.data.badges=['brock','misty'];g.data.kantoWorld.location='cerulean';g.data.kantoWorld.position={...K.snapshot(g,now).map.points.cerulean};
 g.requestAction('travel','mt-moon',now);assert.ok(g.controlTick(clock(g)));assert.equal(K.current(g).id,'route-4');for(let i=0;i<3;i++)win(g);
 const progress=structuredClone(g.data.kantoWorld.roadProgress);g=new PC(structuredClone(g.data),clock(g));
 assert.ok(g.requestAction('travel',{location:'route-4',position:{...g.data.kantoWorld.position}},clock(g)));assert.ok(g.requestAction('travel','mt-moon',clock(g)));
 assert.deepEqual(g.data.kantoWorld.roadProgress,progress);assert.equal(g.advanceTravel(clock(g)),false);assert.equal(K.current(g).id,'route-4');
});
test('the Kanto revisit preserves the road before a shared-cell cave marker',()=>{
 const g=ready(PC);g.data.champion=true;g.unlockJohto(now,[25]);g.data.johto.cleared['j-ship']=now;const s=J.init(g);s.location='j-k-cerulean';s.position={...J.maps.kanto.points[s.location]};g.data.switchUntil=0;g.nextTick=now;
 assert.ok(g.requestAction('travel','j-k-mt-moon',now));assert.ok(g.controlTick(clock(g)));assert.equal(s.location,'j-k-route-4');assert.equal(g.advanceTravel(clock(g)),false);
 finishJourney(g,clock(g));assert.equal(s.location,'j-k-mt-moon');
});
