'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const K=require('../../shared/kanto-journey.cjs'),world=require('../../shared/kanto-world.cjs');
const before=Date.parse('2026-10-31T14:59:59Z'),after=before+1000,copy=x=>structuredClone(x);
function ready(Type){
 const g=new Type({},before,{random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;
 g.data.kantoStory.mapAt=before;g.data.kantoStory.dexAt=before;g.data.kantoWorld.location='route-22';
 g.data.kantoWorld.position={...world.snapshot(g).map.points['route-22']};g.data.switchUntil=0;g.nextTick=before;
 return g;
}
function progress(g){const d=g.data;return copy({kanto:d.kantoStory,world:d.kantoWorld,johto:d.johto,unlocked:d.johtoUnlocked,badges:d.badges,champion:d.champion,story:d.mobileStory,device:d.trainingDevice,pending:d.pendingChallenge,actions:d.pendingActions,discovery:d.challengeSeen});}
for(const [name,Type]of [['PC',PC],['Android',Android]]){
 test(name+' cold season rollover matches an in-process reset without reviving story or reservations',()=>{
  const g=ready(Type);g.data.badges=[...K.badges];g.data.champion=true;g.data.johtoUnlocked=true;
  g.data.kantoStory.cleared={'k-fossil-choice':before,'k-bill':before,'k-npc-pewtergym-1':before};g.data.kantoStory.fossil=138;g.data.kantoStory.items={'ss-ticket':1,'fishing-rod':1};g.data.kantoStory.roads={'route-12':before};
  g.data.johto={revision:2,cleared:{'j-red':before},items:{'gs-ball':before},rivals:{},champion:true};
  g.data.pendingChallenge={index:'j-shrine',queuedAt:before};g.data.challengeSeen={'rival-brock':before};
  g.data.mapTravel={observed:7000,bank:1234,credit:987,dailyAt:before-5000};g.addPokemon(143,60,'catch',before);
  const saved=copy(g.data),cold=new Type(saved,after,{random:()=>.7});g.resetSeason(after);
  const warm=new Type(copy(g.data),after,{random:()=>.7});
  assert.deepEqual(progress(cold),progress(warm));assert.deepEqual(cold.data.caught,g.data.caught);
  assert.deepEqual(cold.data.mapTravel,{observed:7000,bank:2221,credit:0,dailyAt:before-5000});
  assert.deepEqual(Object.values(cold.data.owned).map(p=>[p.id,p.level]),[[25,5]]);
  assert.equal(cold.data.pendingChallenge,null);assert.deepEqual(cold.data.kantoStory.cleared,{});assert.equal(cold.data.kantoStory.fossil,null);
  const again=new Type(copy(cold.data),after+1,{random:()=>.7});assert.deepEqual(progress(again),progress(cold));
  assert.deepEqual(saved.kantoStory.cleared,{'k-fossil-choice':before,'k-bill':before,'k-npc-pewtergym-1':before});
 });
 test(name+' same-season and unstamped migrations retain actual story progress',()=>{
  const g=ready(Type);g.data.kantoStory.cleared['k-bill']=before;g.data.kantoStory.items['ss-ticket']=1;
  for(const unstamped of [false,true]){const s=copy(g.data);if(unstamped)delete s.season;const h=new Type(s,unstamped?after:before,{random:()=>.7});assert.ok(h.data.kantoStory.cleared['k-bill']);assert.equal(h.data.kantoStory.items['ss-ticket'],1);assert.equal(h.seasonResetOnLoad,false);}
 });
 for(const id of ['rival-brock','rival-league'])for(const state of ['unseen','retry'])test(name+' '+id+' '+state+' reservation survives reload, cancellation and starts once',()=>{
  const at=before-60000,g=ready(Type);g.nextTick=at;if(id==='rival-league')g.data.badges=[...K.badges];g.rivalProgress(id).state=state;
  g.animate('result',{text:'fixture'},at);assert.ok(g.challenge(id,at));const queued=copy(g.data.pendingChallenge),end=g.data.switchUntil;
  const h=new Type(copy(g.data),at,{random:()=>.7});assert.deepEqual(h.data.pendingChallenge,queued);assert.equal(h.data.battle,null);
  assert.ok(h.cancelChallenge(at));assert.equal(new Type(copy(h.data),at).data.pendingChallenge,null);
  const loaded=new Type(copy(g.data),at,{random:()=>.7});assert.equal(loaded.tick(end-1),false);assert.ok(loaded.tick(end));
  assert.equal(loaded.data.battle.storyId,id);assert.equal(loaded.data.pendingChallenge,null);const started=copy(loaded.data.battle);loaded.tick(end+1);assert.deepEqual(loaded.data.battle,started);
 });
 test(name+' expired or ineligible first-time rival reservations do not revive',()=>{
  const g=ready(Type);g.animate('result',{text:'fixture'},before);assert.ok(g.challenge('rival-brock',before));
  const wrongPlace=copy(g.data);wrongPlace.kantoWorld.location='pallet';assert.equal(new Type(wrongPlace,before).data.pendingChallenge,null);
  const expired=new Type(copy(g.data),g.data.switchUntil+1,{random:()=>.7});assert.equal(expired.data.pendingChallenge,null);assert.equal(expired.data.kantoStory.mapAt,undefined);
 });
}
