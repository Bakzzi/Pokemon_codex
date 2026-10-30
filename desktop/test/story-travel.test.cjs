'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const K=require('../../shared/kanto-journey.cjs'),W=require('../../shared/kanto-world.cjs'),J=require('../../shared/johto.cjs'),JW=require('../../shared/johto-world.cjs');
const auto=require('../../shared/story-travel.cjs');
const now=Date.parse('2026-10-29T04:00:00Z');
function fixture(Type){const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;Object.assign(g.data.kantoStory,{mapAt:now,dexAt:now,parcelAt:now,deliveredAt:now});place(g,'pallet');g.data.switchUntil=0;g.nextTick=now;return g;}
function place(g,id){const w=g.data.johtoUnlocked?JW.init(g):W.init(g),map=g.data.johtoUnlocked?JW.maps[JW.byId.get(id).zone]:W.snapshot(g).map;Object.assign(w,{location:id,position:{...map.points[id]},journey:null,walk:null,blocked:null});w.visited[id]=now;}
function clock(g){return Math.max(now,g.nextTick,g.data.switchUntil||0);}
function pages(g){for(let i=0;i<40&&g.presentation();i++){const s=g.presentation(),at=Math.max(clock(g),s.at+(s.duration||0)+1);if(s.awaitChoice){assert.ok(g.requestAction('fossil-choice',138,at));}else if(s.mode==='dialogue')assert.ok(g.advanceScene(s.id+':'+s.index,at));else assert.ok(g.sceneTick(at));}assert.equal(g.presentation(),null);}
function win(g){pages(g);for(let i=0;i<80&&g.data.battle;i++){g.data.battle.foe.hp=0;g.defeatOpponent(clock(g));pages(g);}assert.equal(g.data.battle,null);}
// Controlled time/outcomes, real journey + trainer result transactions. No
// source flags are fabricated by movement, and no manual scene is clicked here.
function drive(g,limit=500){
 for(let i=0;i<limit;i++){
  const w=g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
  if(g.presentation()&&!g.presentation().automatic)return 'dialogue';
  if(g.data.battle?.activityTrainer){win(g);continue;}
  if(g.presentation()?.automatic){const s=g.presentation();g.sceneTick(Math.max(clock(g),s.at+s.duration+1));continue;}
  if(g.platform==='mobile'){if(g.data.mapTravel?.observed===undefined)g.recordTravelSteps(0);if(w.journey)g.recordTravelSteps(g.data.mapTravel.observed+2000);}
  else if(w.journey)for(let n=0;n<20;n++)g.onWildEnd({kind:'wild',location:w.location},clock(g));
  if(g.controlTick(clock(g)))continue;
  const trainer=g.movementTrainerNode?.();if(trainer){g.data.workTokens=250;if(g.startAutomaticTrainer(trainer,clock(g)))continue;}
  if(!w.journey)return 'stopped';
  throw Error('Journey blocked at '+w.location+' toward '+w.journey.destination);
 }
 throw Error('Journey did not settle');
}
for(const [name,Type]of [['PC',PC],['Android',Android]]){
 test(name+' automatically reaches the first gym through ordinary forest opponents and waits for explicit challenges',()=>{
  let g=fixture(Type);assert.equal(drive(g),'stopped');assert.equal(g.data.kantoWorld.location,'pewter');assert.ok(K.trainersDone(g,'forest-path'));assert.deepEqual(g.data.badges,[]);
  const before=structuredClone(g.data.kantoStory.cleared);for(let i=0;i<20;i++)g.controlTick(clock(g)+i*10000);assert.deepEqual(g.data.kantoStory.cleared,before);assert.equal(g.data.battle,null);
  g=new Type(structuredClone(g.data),clock(g));assert.equal(g.data.storyTravel.enabled,true);assert.equal(drive(g),'stopped');assert.equal(g.data.kantoWorld.location,'pewter');
  for(const id of K.cases.find(c=>c.id==='trainers-gym-0').entries){if(K.done(g,id))continue;assert.ok(g.challenge(id,clock(g)));win(g);}
  assert.ok(g.challenge(0,clock(g)));win(g);assert.deepEqual(g.data.badges,['brock']);
  assert.equal(drive(g),'stopped');assert.equal(g.data.kantoWorld.location,'mt-moon');assert.ok([...K.nodes.values()].filter(n=>n.location==='mt-moon'&&n.source?.class==='ROCKET').every(n=>!K.done(g,n.id)));assert.ok(!K.done(g,'k-fossil-choice'));
  for(const id of K.cases.find(c=>c.id==='moon-path').entries){if(K.done(g,id))continue;assert.ok(g.challenge(id,clock(g)),id);win(g);}
  assert.equal(g.data.kantoStory.fossil,138);assert.equal(drive(g),'stopped');assert.equal(g.data.kantoWorld.location,'cerulean');assert.ok(!g.data.badges.includes('misty'));
 });
 test(name+' manual detours pause the itinerary, resume survives reload, scenes and pending outcomes prevent departure',()=>{
  let g=fixture(Type);assert.ok(g.requestAction('travel','viridian',clock(g)));assert.equal(g.data.storyTravel.enabled,false);drive(g);assert.equal(g.data.kantoWorld.location,'viridian');
  assert.ok(g.requestAction('story-travel',true,clock(g)));g=new Type(structuredClone(g.data),clock(g));
  g.dialogue('test','NPC','gentleman',['test'],'close-recollection',clock(g));const scene=structuredClone(g.presentation());for(let i=0;i<4;i++)g.controlTick(clock(g)+i*10000);assert.deepEqual(g.presentation(),scene);assert.equal(g.data.kantoWorld.journey,null);
  g.data.mobileStory.scene=null;g.data.pendingBattle={kind:'fixture',at:clock(g)+1000};assert.equal(g.storyTravelTick(clock(g)),false);g.data.pendingBattle=null;
  assert.ok(g.storyTravelTick(clock(g)));assert.ok(g.data.kantoWorld.journey.storyAuto);const pos={...g.data.kantoWorld.position};g.requestAction('story-travel',false,clock(g));assert.equal(g.data.kantoWorld.journey,null);assert.deepEqual(g.data.kantoWorld.position,pos);
  g=new Type(structuredClone(g.data),clock(g));assert.equal(g.data.storyTravel.enabled,false);
 });
 test(name+' missing actual story records are not inferred from badges and an unconfirmed reward does not change the destination',()=>{
  const g=fixture(Type);g.data.badges=['brock','misty','surge'];place(g,'vermilion');assert.equal(auto.goal(g),'mt-moon');
  for(const id of K.cases.find(c=>c.id==='moon-path').entries)g.data.kantoStory.cleared[id]=now;assert.equal(auto.goal(g),'route-24');g.data.kantoStory.cleared['k-bridge-rocket']=now;assert.equal(auto.goal(g),'sea-cottage');
  place(g,'sea-cottage');g.dialogue('kanto-event','NPC','bill',['test'],'kanto-complete:k-bill',clock(g));assert.equal(g.storyTravelTick(clock(g)),false);assert.ok(!K.done(g,'k-bill'));assert.equal(auto.goal(g),'sea-cottage');
 });
}
test('Android automatic itineraries retain 2000-step distance, do not spend the saved bank, and bank surplus when stopped',()=>{
 const g=fixture(Android);g.recordTravelSteps(0);g.data.mapTravel.bank=10000;assert.ok(g.storyTravelTick(clock(g)));const before={...g.data.kantoWorld.position};
 for(let i=0;i<10;i++)g.controlTick(clock(g)+i*20000);assert.deepEqual(g.data.kantoWorld.position,before);assert.equal(g.data.mapTravel.bank,10000);
 g.recordTravelSteps(1999);g.controlTick(clock(g));assert.deepEqual(g.data.kantoWorld.position,before);g.recordTravelSteps(2000);g.controlTick(clock(g));assert.notDeepEqual(g.data.kantoWorld.position,before);assert.equal(g.data.mapTravel.bank,10000);
 g.recordTravelSteps(2500);g.requestAction('story-travel',false,clock(g));assert.equal(g.data.mapTravel.bank,10500);
});
test('Johto destinations cover the existing main story through the return region and final mountain without completing any event',()=>{
 const g=fixture(Android);g.data.johtoUnlocked=now;g.prepareJohtoJourney(now);JW.init(g);let previous='';
 for(const id of auto.johtoOrder){const target=auto.goal(g);assert.ok(JW.byId.has(target),id+' missing destination');assert.ok(!J.done(g,id));const before=structuredClone(g.data.johto.cleared);place(g,target);g.controlTick(clock(g));assert.deepEqual(g.data.johto.cleared,before,id);g.data.johto.cleared[id]=now;previous=id;}
 assert.equal(previous,'j-red');assert.equal(auto.goal(g),null);
});
module.exports={fixture,drive,clock,pages,win,place};
for(const [name,Type]of [['PC',PC],['Android',Android]])test(name+' Johto main itinerary reaches the final mountain while every local event still needs an explicit action',()=>{
 const g=fixture(Type);g.data.johtoUnlocked=now;g.prepareJohtoJourney(now);JW.init(g);
 function pending(id){const n=J.nodes.get(id);for(const pre of n.requires)if(!J.done(g,pre))return pending(pre);return n.id==='j-league-lance'?'j-league':id;}
 for(let i=0;i<150&&!J.done(g,'j-red');i++){
  drive(g);if(g.presentation()||g.data.battle){win(g);continue;}
  const checkpoint=JW.checkpoint(g);if(checkpoint?.canPass){g.requestAction('world-pass',checkpoint.location,clock(g));continue;}
  const stage=auto.johtoOrder.find(id=>!J.done(g,id)),id=pending(stage);
  assert.ok(g.challenge(id,clock(g)),JSON.stringify({stage,id,location:g.data.johtoWorld.location,goal:auto.goal(g),blocked:g.data.johtoWorld.blocked}));win(g);
 }
 assert.ok(J.done(g,'j-red'));assert.equal(auto.goal(g),null);
});
test('Android background itinerary selection consumes neither lock-time actions nor saved movement',()=>{
 const g=fixture(Android),Progression=require('../../mobile/web/progression.js'),p=new Progression(g);g.recordTravelSteps(0);g.data.mapTravel.bank=8000;
 assert.equal(p.catchUp({steps:0,lockMillis:0},now),0);assert.ok(g.data.kantoWorld.journey);assert.equal(p.lockConsumed,0);assert.equal(g.data.mapTravel.bank,8000);
});
test('already-reached unchecked entrances recover their manual checkpoint instead of hiding the required action',()=>{
 for(const Type of [PC,Android])for(const target of ['saffron','route-23']){
  const g=fixture(Type),d=g.data;d.badges=['brock','misty','surge','erika','sabrina','koga','blaine','giovanni'];
  for(const id of K.nodes.keys())d.kantoStory.cleared[id]=now;Object.assign(d.mobileStory,{scopeObtainedAt:now});d.mobileStory.rescue.completedAt=now;d.kantoWorld.visited.diglett=now;d.kantoWorld.visited.celadon=now;
  if(target==='route-23'){d.kantoStory.drinkAt=now;d.kantoStory.roads['route-16']=now;for(const id of ['silph','safari','mansion'])d.mobileStory[id].completedAt=now;g.rivalProgress('rival-league').state='won';}
  place(g,target);assert.equal(auto.goal(g),target);drive(g);assert.ok(W.checkpoint(g)?.canPass);assert.ok(target==='saffron'?!d.kantoStory.drinkAt:!d.kantoWorld.leaguePass);
 }
});
for(const [name,Type]of [['PC',PC],['Android',Android]])test(name+' main Kanto journey reaches the League using automatic destinations and only explicit local story actions',()=>{
 const g=fixture(Type),visits=[];for(let id=1;id<=10;id++)g.addPokemon(id,20,'fixture',now);
 const optional=new Set(['k-fishing-rod','k-bulbasaur','k-charmander','k-squirtle','k-fossil-restore','k-device','k-lapras']);
 for(let i=0;i<350&&!g.data.champion;i++){
  drive(g);const w=g.data.kantoWorld;visits.push(w.location);
  if(g.presentation()||g.data.battle){win(g);continue;}
  if(W.checkpoint(g)?.canPass){assert.ok(g.requestAction('world-pass',W.checkpoint(g).location,clock(g)));continue;}
  if(g.data.mobileStory.safari.trip){g.walkingStep(1500,clock(g));continue;}
  const nodes=[...K.nodes.values()].filter(n=>!n.automatic&&!optional.has(n.id)&&!n.gift&&!['Lapras','Device'].includes(n.offer)&&g.canChallenge(n.id));
  const specials=[0,1,2,3,5,4,6,7,8,'rocket-grunt','rocket-duo','rocket-giovanni','tower-grunt-1','tower-grunt-2','tower-grunt-3','silph-grunt','silph-duo','silph-giovanni','road-snorlax','safari-start','mansion-investigate'];
  const id=nodes[0]?.id??specials.find(id=>g.canChallenge(id));
  assert.notEqual(id,undefined,JSON.stringify({place:w.location,goal:auto.goal(g),blocked:w.blocked,visited:visits.slice(-6)}));
  assert.ok(g.challenge(id,clock(g)),String(id));win(g);
 }
 assert.equal(g.data.champion,true);assert.equal(auto.goal(g),null);assert.equal(g.data.kantoWorld.location,'indigo');assert.equal(g.data.kantoStory.fossil,138);
 assert.ok(visits.includes('sea-cottage'));assert.ok(visits.includes('route-2'));assert.ok(visits.includes('saffron'));assert.ok(visits.includes('safari'));
});
