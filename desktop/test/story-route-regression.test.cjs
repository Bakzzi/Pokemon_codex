'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs'),{Game}=require('../game.cjs');
const J=require('../../shared/johto.cjs'),W=require('../../shared/johto-world.cjs');
const {finishJourney}=require('./helpers/travel-fixture.cjs');
const now=Date.parse('2026-10-25T01:00:00Z');
function fixture(Type,location,completed=[]){
 const old=new Game({},now);old.data.champion=true;
 const g=new Type(old.data,now,{random:()=>.7});assert.ok(g.unlockJohto(now,[25]));
 for(const id of completed)g.data.johto.cleared[id]=now;
 const s=W.init(g);Object.assign(s,{location,position:{...W.byId.get(location).point},visited:{[location]:now}});
 g.nextTick=now;g.data.switchUntil=0;g.data.animation=null;return g;
}
function travel(g,id,at=now){assert.ok(g.requestAction('travel',id,at));return finishJourney(g,at);}
function pages(g,at){for(let i=0;i<30&&g.presentation();i++){const s=g.presentation();if(s.mode==='dialogue')assert.ok(g.advanceScene(s.id+':'+s.index,at));else g.sceneTick(Math.max(at,s.at+(s.duration||3000)+1));}}
for(const Type of [Adventure,Mobile]){
 const platform=Type===Mobile?'Android':'PC';
 test(platform+': Route 44 reaches Ice Path without granting entry to Blackthorn',()=>{
  const g=fixture(Type,'j-route44',['j-radio-final']);let at=travel(g,'j-blackthorn');
  assert.notEqual(g.data.johtoWorld.location,'j-blackthorn');assert.equal(W.checkpoint(g).canPass,false);
  at=travel(g,'j-ice',at);assert.equal(g.data.johtoWorld.location,'j-ice');assert.ok(g.canChallenge('j-ice-path'));
  assert.equal(J.done(g,'j-ice-path'),false);assert.ok(g.challenge('j-ice-path',at));
  assert.equal(J.done(g,'j-ice-path'),false);pages(g,at);assert.ok(J.done(g,'j-ice-path'));
  at=travel(g,'j-blackthorn',Math.max(at,g.nextTick,g.data.switchUntil));assert.equal(g.data.johtoWorld.location,'j-blackthorn');
 });
 test(platform+': forest, Ice Path and Dragon Den events stay on their own map locations',()=>{
  for(const [id,location,pre]of [['j-ilex','j-ilex','j-bugsy'],['j-ice-path','j-ice','j-radio-final'],['j-dragon-den','j-dragon','j-clair']]){
   const g=fixture(Type,location,[pre]);const row=J.snapshot(g).special.find(n=>n.id===id);
   assert.ok(row?.canChallenge,id);assert.equal(W.locationFor(row.id),location);assert.equal(row.done,false);
   assert.ok(!J.snapshot(g).gyms.some(n=>n.preparation));
  }
 });
 test(platform+': distant challenges and stale queued starts cannot execute',()=>{
  const g=fixture(Type,'j-newbark');assert.equal(g.canChallenge('j-sprout-sage-1'),false);assert.equal(g.challenge('j-sprout-sage-1',now),false);
  g.data.johtoWorld.location='j-violet';assert.ok(g.canChallenge('j-sprout-sage-1'));
  g.nextTick=now+1000;assert.ok(g.challenge('j-sprout-sage-1',now));
  g.data.johtoWorld.location='j-newbark';assert.equal(g.startChallenge('j-sprout-sage-1',now+1000),false);assert.equal(g.data.battle,null);
 });
 test(platform+': sleeping Snorlax blocks the co-located cave until its result is confirmed',()=>{
  const g=fixture(Type,'j-k-vermilion',['j-ship','j-k-janine','j-power-return']);let at=travel(g,'j-k-diglett');
  assert.equal(g.data.johtoWorld.location,'j-k-route-11');assert.equal(W.checkpoint(g).canPass,false);assert.equal(W.checkpoint(g).sprite,'pokemon:143');assert.ok(g.canChallenge('j-k-snorlax'));
  assert.ok(g.challenge('j-k-snorlax',at));pages(g,at);g.endChallenge(false,at);pages(g,at);
  assert.equal(J.done(g,'j-k-snorlax'),false);assert.equal(W.checkpoint(g).canPass,false);
  at=Math.max(at,g.nextTick,g.data.switchUntil);assert.ok(g.challenge('j-k-snorlax',at));pages(g,at);assert.equal(W.checkpoint(g).canPass,false);g.data.battle.foe.hp=0;g.defeatOpponent(at);
  pages(g,at);assert.ok(W.checkpoint(g).canPass);
  const account=structuredClone(g.data.mapTravel);at=travel(g,'j-k-diglett',Math.max(at,g.nextTick,g.data.switchUntil));
  assert.equal(g.data.johtoWorld.location,'j-k-diglett');if(account)assert.equal(g.data.mapTravel.bank,account.bank+2000); // fixture supplies one step batch; entry itself is free.
 });
 test(platform+': old itineraries are rechecked after the active battle without losing progress or movement balances',()=>{
  let g=fixture(Type,'j-k-route-11',['j-ship']);const s=g.data.johtoWorld,to={...W.byId.get('j-k-diglett').point};
  s.revision=1;s.roadProgress={location:s.location,required:17,completed:8};
  s.journey={mode:Type===Mobile?'steps':undefined,destination:'j-k-diglett',position:to,name:'fixture',segments:[{location:s.location,path:[to]},{location:'j-k-diglett',path:[to],arrival:true}],index:Type===Mobile?1:0,bankCells:2,bankLeg:true};
  g.data.mapTravel={observed:7000,credit:301,bank:4700};g.newWild(now);const encounter=structuredClone(g.data.battle),progress=structuredClone(s.roadProgress),account=structuredClone(g.data.mapTravel);
  g=new Type(structuredClone(g.data),now+1,{random:()=>.7});assert.ok(g.data.johtoWorld.journey.revalidate);assert.equal(g.advanceTravel(now+10000),false);assert.deepEqual(g.data.battle,encounter);
  g.data.battle=null;g.data.animation=null;g.nextTick=now;g.data.switchUntil=0;assert.ok(g.advanceTravel(now+10000));
  assert.deepEqual(g.data.johtoWorld.roadProgress,progress);assert.deepEqual(g.data.mapTravel,account);assert.equal(g.data.johtoWorld.journey.blocked.checkpoint,'j-k-diglett');
  assert.equal(g.data.johtoWorld.location,'j-k-route-11');assert.equal(g.data.johtoWorld.journey.revalidate,undefined);
 });
}
