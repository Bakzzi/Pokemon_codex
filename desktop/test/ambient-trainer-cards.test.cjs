'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),K=require('../../shared/kanto-journey.cjs'),PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,P=require('../../mobile/web/progression.js');
globalThis.MobileCore={nursery:require('../daycare.cjs')};const now=Date.parse('2026-10-26T06:00:00Z');
function fixture(Type){const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.switchUntil=0;g.nextTick=now;return g;}
for(const Type of [PC,Android]){
 test(Type.name+' hides ambient trainer rows before and after wins without deleting the encounter ledger or manual cards',()=>{
  const g=fixture(Type);g.data.badges=['brock','misty','surge','erika'];g.rivalProgress('rival-cerulean').state='won';g.data.mobileStory.scopeObtainedAt=now;g.data.mobileStory.rescue.wins[0]=now;g.data.mobileStory.silph.wins[0]=now;g.data.trainingDevice.gruntWonAt=now;
  const locations=[...new Set(K.cases.map(c=>c.location))];
  for(const completed of [false,true]){
   if(completed)for(const n of K.nodes.values())if(n.automatic)g.data.kantoStory.cleared[n.id]=now;
   for(const place of locations){g.data.kantoWorld.location=place;const ledger=structuredClone(g.data.kantoStory.cleared),s=K.snapshot(g);assert.ok(s.cases.every(c=>c.entries.length>0));assert.ok(s.cases.flatMap(c=>c.entries).every(e=>!K.nodes.get(e.id).automatic),place);assert.deepEqual(g.data.kantoStory.cleared,ledger);}
   g.data.kantoWorld.location='route-3';assert.equal(K.snapshot(g).cases.length,0);assert.equal(K.snapshot(g).placeSummary,'');
  }
  g.data.kantoWorld.location='mt-moon';assert.deepEqual(K.snapshot(g).cases.map(c=>c.id),['moon-path']);
  g.data.kantoWorld.location='ss-anne';g.data.kantoStory.cleared['k-bill']=now;assert.ok(K.snapshot(g).cases.find(c=>c.id==='anne-visit').entries.some(e=>e.team.length));
  g.data.kantoWorld.location='route-5';assert.ok(g.panelState(now).daycare.access.atLocation);assert.ok(K.nodes.get('k-route3-1').automatic);assert.ok(K.done(g,'k-route3-1'));
 });
 test(Type.name+' bridge arrival waits for manual dialogue across idle time, reload and headless movement credit',()=>{
  let g=fixture(Type);g.data.badges=['brock','misty'];g.data.kantoWorld.location='route-24';g.data.kantoWorld.walk={at:now,duration:2000};assert.equal(g.routeRivalTick(now),false);assert.ok(g.routeRivalTick(now+2000));
  const scene=structuredClone(g.presentation());assert.equal(g.data.battle.storyId,'rival-cerulean');assert.ok(!scene.automatic);
  for(let i=1;i<=5;i++){g.data.workTokens=1000;g.controlTick(now+i*10000);g.tick(now+i*10000);}assert.deepEqual(g.presentation(),scene);assert.equal(g.data.battle.turn,0);
  g=new Type(structuredClone(g.data),now+60000);assert.deepEqual(g.presentation(),scene);
  if(Type===Android){const p=new P(g);p.pause(now+60000);assert.equal(p.catchUp({steps:12000,lockMillis:86400000},now+70000),0);assert.deepEqual(g.presentation(),scene);assert.equal(p.lockConsumed,0);}
  assert.ok(!K.snapshot(g).cases.flatMap(c=>c.entries).some(e=>K.nodes.get(e.id).automatic));
 });
}
