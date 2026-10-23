'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const {Game}=require('../game.cjs'),K=require('../../shared/kanto-journey.cjs'),W=require('../../shared/kanto-world.cjs');
const now=Date.parse('2026-10-23T08:00:00Z'),moon=K.cases.find(c=>c.id==='moon-path'),route3=K.cases.find(c=>c.id==='route3-path');
const clock=g=>Math.max(now,g.nextTick,g.data.switchUntil||0);
function pages(g){for(let i=0;i<30&&g.presentation()?.mode==='dialogue'&&!g.presentation().awaitChoice;i++){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,clock(g)));}if(g.presentation()?.mode==='trainer-intro')g.sceneTick(g.presentation().at+2000);if(g.presentation()?.mode==='sendout')g.sceneTick(g.presentation().at+3000);}
function win(g){for(let i=0;i<12&&g.data.battle?.kind==='trainer';i++){pages(g);g.data.battle.foe.hp=0;g.defeatOpponent(clock(g));pages(g);}assert.equal(g.data.battle,null);}
function finishJourney(g){
 for(let i=0;i<200&&g.data.kantoWorld.journey;i++){
  const w=g.data.kantoWorld;
  if(g.platform==='mobile'){if(!Number.isSafeInteger(g.data.mapTravel?.observed))g.recordTravelSteps(0);g.recordTravelSteps(g.data.mapTravel.observed+2000);}
  else for(let j=0;j<20;j++)g.onWildEnd({kind:'wild',location:w.location},clock(g));
  if(!g.controlTick(clock(g))){const id=g.movementTrainerNode();assert.ok(id,'travel must advance or meet a trainer');g.data.workTokens=250;assert.ok(g.startAutomaticTrainer(id,clock(g)));win(g);}
 }
 assert.equal(g.data.kantoWorld.journey,null);
}
function oldSave(){
 const g=new PC(new Game({},now).data,now,{random:()=>.7});
 g.data.kantoStory={revision:1,legacy:true,cleared:{},roads:{},items:{},fossil:null,startedAt:now,mapAt:now,dexAt:now};
 g.data.badges=['brock','misty'];g.data.kantoWorld={revision:1,location:'mt-moon',position:{...W.snapshot(g).map.points['mt-moon']},visited:{'mt-moon':now,'route-4':now,cerulean:now}};
 g.data.inventory={83:3};g.addPokemon(11,16,'wild',now);g.data.mobileStory.rivals['rival-brock']={state:'completed',migratedAt:now};
 g.newWild(now);return structuredClone(g.data);
}
for(const Type of [PC,Android]){
 test(Type.name+' imports the reported two-badge cave save without fabricating progress or changing the live encounter',()=>{
  const saved=oldSave(),g=new Type(saved,now+1);
  for(const key of ['battle','owned','slots','caught','seen','badges','inventory','workTokens','outputTokens'])assert.deepEqual(g.data[key],saved[key],key);
  assert.equal(g.data.kantoStory.legacy,false);assert.equal(g.data.kantoStory.revision,2);assert.ok(g.data.kantoStory.mapAt&&g.data.kantoStory.dexAt);assert.equal(g.presentation(),null);
  assert.deepEqual(g.data.kantoStory.cleared,{});assert.equal(g.data.kantoStory.fossil,null);assert.equal(g.rivalProgress('rival-brock').state,'unseen');
  const c=g.panelState(now+1).kantoStory.cases.find(c=>c.id==='moon-path');assert.equal(c.completed,false);assert.ok(c.entries.every(e=>!e.done&&!e.passed&&!e.readOnly));assert.equal(K.gate(g,'cerulean'),'moon');
  const reloaded=new Type(structuredClone(g.data),now+2);assert.deepEqual(reloaded.data.kantoStory,g.data.kantoStory);assert.deepEqual(reloaded.data.battle,saved.battle);
 });
 test(Type.name+' can retreat, defeat every missing road and cave trainer, choose one fossil and only then leave the cave',()=>{
  let g=new Type(oldSave(),now+1,{random:()=>.7});g.data.battle=null;g.data.pendingBattle=null;g.nextTick=now;g.data.switchUntil=0;
  assert.ok(g.requestAction('travel','route-3',clock(g)));finishJourney(g,clock(g));assert.equal(W.current(g).id,'route-3');
  for(const id of route3.entries){g.data.workTokens=250;assert.ok(g.startAutomaticTrainer(id,clock(g)),id);win(g);g=new Type(structuredClone(g.data),clock(g));assert.ok(K.done(g,id));assert.equal(g.startAutomaticTrainer(id,clock(g)),false);}
  assert.ok(g.requestAction('travel','mt-moon',clock(g)));finishJourney(g,clock(g));assert.equal(W.current(g).id,'mt-moon');assert.equal(K.gate(g,'cerulean'),'moon');
  const battles=moon.entries.filter(id=>K.nodes.get(id).automatic);
  assert.equal(battles.length,K.original.trainers.filter(t=>t.location==='mt-moon').length);
  for(const id of battles){g.data.workTokens=250;assert.ok(g.startAutomaticTrainer(id,clock(g)),id);pages(g);g=new Type(structuredClone(g.data),clock(g));win(g);assert.ok(K.done(g,id));assert.equal(K.gate(g,'cerulean'),'moon');}
  assert.ok(g.challenge('k-fossil-choice',clock(g)));pages(g);assert.ok(g.presentation().awaitChoice);g=new Type(structuredClone(g.data),clock(g));assert.equal(g.data.kantoStory.fossil,null);assert.ok(g.chooseFossil(140,clock(g)));assert.equal(g.chooseFossil(138,clock(g)),false);
  assert.equal(g.data.kantoStory.items[140],1);assert.equal(g.data.kantoStory.items[138],undefined);assert.equal(K.gate(g,'cerulean'),'moon');
  assert.ok(g.challenge('k-moon-duo',clock(g)));win(g);g=new Type(structuredClone(g.data),clock(g));assert.equal(K.gate(g,'cerulean'),null);assert.ok(g.panelState(clock(g)).kantoStory.cases.find(c=>c.id==='moon-path').completed);
  assert.ok(g.requestAction('travel','cerulean',clock(g)));finishJourney(g,clock(g));assert.equal(W.current(g).id,'cerulean');assert.deepEqual(g.data.badges,['brock','misty']);assert.equal(g.data.kantoStory.items[140],1);
 });
 test(Type.name+' preserves actual rewards and wins while reopening explicitly inferred story completions',()=>{
  const saved=oldSave();saved.kantoStory.fossil=138;saved.kantoStory.items[138]=1;saved.kantoStory.cleared[moon.entries[0]]=now;
  saved.mobileStory.rivals['rival-surge']={state:'won',wonAt:now,outcome:'win'};
  saved.mobileStory.rescue={legacy:true,wins:[now,now,now],completedAt:now};saved.mobileStory.silph={legacy:false,wins:[now,0,0],completedAt:0};
  saved.mobileStory.mansion={legacy:true,startedAt:now,wins:6,read:3,keyObtainedAt:now,completedAt:now};saved.trainingDevice.fluteObtainedAt=now;
  const g=new Type(saved,now+1);assert.equal(g.data.kantoStory.items[138],1);assert.ok(K.done(g,'k-fossil-choice'));assert.ok(K.done(g,moon.entries[0]));assert.equal(g.rivalProgress('rival-surge').state,'won');
  assert.deepEqual(g.data.mobileStory.rescue.wins,[0,0,0]);assert.equal(g.data.mobileStory.rescue.completedAt,0);assert.deepEqual(g.data.mobileStory.silph.wins,[now,0,0]);assert.equal(g.data.mobileStory.mansion.completedAt,0);assert.equal(g.data.trainingDevice.fluteObtainedAt,now);
 });
 test(Type.name+' rechecks an imported travel plan without discarding a newer user destination',()=>{
  for(const newer of [false,true]){const saved=oldSave();saved.kantoWorld.journey={destination:'cerulean',position:{...W.snapshot(new Type(saved,now)).map.points.cerulean},segments:[{location:'cerulean',path:[{x:84,y:44},{x:100,y:44}]}],index:0};if(newer)saved.pendingActions=[{id:7,kind:'travel',location:'route-3',queuedAt:now}];const g=new Type(saved,now+1);assert.equal(g.data.kantoWorld.journey,null);assert.equal(g.data.pendingActions.length,1);assert.equal(g.data.pendingActions[0].location,newer?'route-3':'cerulean');assert.deepEqual(g.data.battle,saved.battle);}
 });
 test(Type.name+' distance and wild quotas cannot skip uncleared automatic trainers',()=>{
  const g=new Type(oldSave(),now+1);g.data.battle=null;g.data.switchUntil=0;g.nextTick=now;
  const w=g.data.kantoWorld;w.location='route-3';w.position={...W.snapshot(g).map.points['route-3']};
  const next={location:'route-4',path:[w.position,{x:76,y:44}]};w.journey={mode:g.platform==='mobile'?'steps':undefined,index:0,destination:'mt-moon',position:{x:84,y:44},segments:g.platform==='mobile'?[next]:[{location:'route-3',path:[w.position]},next]};w.roadProgress={location:'route-3',required:10,completed:10};g.recordTravelSteps(0);g.recordTravelSteps(10000);
  assert.equal(g.advanceTravel(now+1000),false);assert.equal(w.location,'route-3');assert.ok(g.movementTrainerNode());
  g.data.workTokens=250;assert.ok(g.tick(now+1000));assert.ok(g.data.battle.activityTrainer);assert.equal(g.data.battle.kantoNode,route3.entries[0]);
 });
}
