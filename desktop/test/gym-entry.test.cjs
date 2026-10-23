'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),{Game}=require('../game.cjs');
const now=Date.parse('2026-10-23T09:00:00Z'),places=['pewter','cerulean','vermilion','celadon','fuchsia','saffron','cinnabar','viridian'];
function ready(Type){const g=new Type(new Game({},now).data,now);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.battle=null;g.data.switchUntil=0;g.nextTick=now;return g;}
const trainers=i=>K.cases.find(c=>c.id==='trainers-gym-'+i).entries;
for(const Type of [PC,Android]){
 test(Type.name+' Viridian remains sealed until all seven earlier badges; no trainer, identity or party leaks',()=>{
  let g=ready(Type);g.data.kantoWorld.location='viridian';
  for(let count=0;count<7;count++){
   g.data.badges=K.order.slice(0,count).map(i=>K.badges[i]);const s=g.panelState(now);assert.equal(s.gymEntry[7].open,false);assert.match(s.gymEntry[7].reason,/문이 닫혀/);assert.equal(s.bosses[7].name,'???');assert.deepEqual(s.bosses[7].team,[]);assert.equal(g.canChallenge(7),false);
   for(const id of trainers(7)){assert.equal(g.canChallenge(id),false);assert.equal(g.challenge(id,now),false);}assert.ok(!s.kantoStory.cases.some(c=>c.id==='trainers-gym-7'));
  }
  // A record accidentally earned by an older client is preserved, without opening the room early.
  g.data.kantoStory.cleared[trainers(7)[1]]=now;g=new Type(structuredClone(g.data),now);assert.ok(K.done(g,trainers(7)[1]));assert.ok(!g.panelState(now).kantoStory.cases.some(c=>c.id==='trainers-gym-7'));
  g.data.badges=K.order.slice(0,7).map(i=>K.badges[i]);const s=g.panelState(now);assert.ok(s.gymEntry[7].open);assert.equal(s.bosses[7].name,'비주기');assert.equal(s.bosses[7].levelsKnown,false);assert.ok(g.canChallenge(trainers(7)[0]));assert.equal(g.canChallenge(7),false);
  g.data.kantoStory.cleared[trainers(7)[0]]=now;assert.ok(g.canChallenge(7));assert.ok(g.challenge(7,now));assert.equal(g.battleBoss().name,'비주기');assert.equal(g.data.battle.foe.id,require('../data/game-data.json').bosses[7].team[0].id);
 });
 test(Type.name+' all gym interiors and leaders use the same memo-ordered admission rules',()=>{
  const g=ready(Type);g.data.badges=K.order.map(i=>K.badges[i]);
  for(const n of K.nodes.values())g.data.kantoStory.cleared[n.id]=now;g.data.kantoStory.roads['route-16']=now;g.data.mobileStory.silph.completedAt=now;g.data.mobileStory.mansion.completedAt=now;
  for(const i of K.order){
   g.data.kantoWorld.location=places[i];g.data.badges=K.order.slice(0,K.order.indexOf(i)).map(i=>K.badges[i]);for(const id of trainers(i))delete g.data.kantoStory.cleared[id];
   assert.ok(K.gymEntry(g,i).open);assert.ok(g.canChallenge(trainers(i)[0]));assert.equal(g.canChallenge(i),false);for(const id of trainers(i))g.data.kantoStory.cleared[id]=now;assert.ok(g.canChallenge(i));
  }
  const blocked=[[2,()=>{delete g.data.kantoStory.cleared['k-captain'];}],[5,()=>{g.data.mobileStory.silph.completedAt=null;}],[6,()=>{g.data.mobileStory.mansion.completedAt=null;}]];
  for(const [i,close]of blocked){g.data.badges=K.order.slice(0,K.order.indexOf(i)).map(i=>K.badges[i]);g.data.kantoWorld.location=places[i];for(const id of trainers(i))delete g.data.kantoStory.cleared[id];close();assert.equal(K.gymEntry(g,i).open,false);assert.equal(g.canChallenge(i),false);for(const id of trainers(i))assert.equal(g.canChallenge(id),false);assert.ok(!g.panelState(now).kantoStory.cases.some(c=>c.id==='trainers-gym-'+i));}
  g.data.badges=['brock','misty','surge'];g.data.kantoWorld.location='celadon';g.data.trainingDevice.rocketWonAt=null;assert.ok(K.gymEntry(g,3).open,'memo: Erika before hideout');
 });
}
