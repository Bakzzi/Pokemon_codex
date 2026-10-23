'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,{Game}=require('../game.cjs');
const N=require('../../shared/story-notices.cjs'),K=require('../../shared/kanto-journey.cjs'),J=require('../../shared/johto.cjs'),JW=require('../../shared/johto-world.cjs');
const now=Date.parse('2026-10-23T10:00:00Z');
function ready(Type){const g=new Type(new Game({},now).data,now);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.battle=null;g.data.switchUntil=0;g.nextTick=now;g.data.kantoStory.mapAt=now;return g;}
const place=(g,id)=>g.panelState(now).kantoWorld.places.find(p=>p.id===id);
for(const Type of [PC,Android]){
 test(Type.name+' Green introduces Bill only after confirmed victory; guidance survives closed roads and reload',()=>{
  let g=ready(Type);g.data.badges=['brock','misty'];g.data.kantoWorld.location='route-24';
  assert.equal(place(g,'sea-cottage').guidance,false);
  assert.ok(g.challenge('k-bridge-1',now));assert.equal(g.data.battle.storyId,'rival-cerulean');
  assert.equal(place(g,'sea-cottage').guidance,false,'starting a battle does not introduce Bill');
  g.resolveRival(true,now+1);assert.equal(place(g,'sea-cottage').guidance,false,'unconfirmed victory dialogue');
  while(g.presentation()){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+2);}
  assert.equal(place(g,'sea-cottage').guidance,true);assert.equal(g.canChallenge('k-bill'),false);
  assert.equal(place(g,'sea-cottage').open,false,'notice never opens the intervening bridge');
  g=new Type(structuredClone(g.data),now+3);assert.equal(place(g,'sea-cottage').guidance,true);
  g.data.kantoWorld.visited['sea-cottage']=now;assert.equal(place(g,'sea-cottage').guidance,true,'arrival is not completion');
  g.data.kantoStory.cleared['k-bridge-rocket']=now;
  for(const n of K.nodes.values())if(n.location==='route-25')g.data.kantoStory.cleared[n.id]=now;
  g.data.kantoWorld.location='sea-cottage';g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=now;
  assert.ok(g.challenge('k-bill',now));assert.equal(place(g,'ss-anne').guidance,false);
  while(g.presentation()){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+4);}
  assert.equal(place(g,'sea-cottage').guidance,false);assert.equal(place(g,'ss-anne').guidance,true,'confirmed reward supplies the next destination');
 });
 test(Type.name+' loss, queue and unrelated later badge do not invent the Bill introduction',()=>{
  const g=ready(Type);g.data.badges=['brock','misty','surge'];g.data.kantoWorld.location='route-24';
  g.data.pendingChallenge={index:'k-bridge-1',queuedAt:now};assert.ok(!N.kanto(g).has('sea-cottage'));g.data.pendingChallenge=null;
  assert.ok(g.challenge('k-bridge-1',now));g.resolveRival(false,now+1);
  while(g.presentation()){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+2);}
  assert.equal(g.rivalProgress('rival-cerulean').state,'retry');assert.ok(!N.kanto(g).has('sea-cottage'));
 });
 test(Type.name+' Kanto errands advance independently at shared destinations and clear on completion/reset',()=>{
  const g=ready(Type);assert.deepEqual([...N.kanto(g)],[]);
  g.data.badges=['erika'];assert.ok(N.kanto(g).has('celadon'));assert.ok(!N.kanto(g).has('tower'));
  g.data.mobileStory.scopeObtainedAt=now;assert.ok(!N.kanto(g).has('celadon'));assert.ok(N.kanto(g).has('tower'));
  g.data.mobileStory.rescue.completedAt=now;assert.ok(!N.kanto(g).has('tower'));assert.ok(N.kanto(g).has('route-12'));assert.ok(N.kanto(g).has('route-16'));
  g.data.kantoStory.roads['route-16']=now;assert.ok(!N.kanto(g).has('route-16'));assert.ok(N.kanto(g).has('route-12'));
  g.data.kantoStory.drinkAt=now;assert.ok(N.kanto(g).has('saffron'));
  g.data.mobileStory.silph.completedAt=now;assert.ok(N.kanto(g).has('saffron'),'gym errand remains after company errand');
  g.data.badges.push('sabrina');assert.ok(!N.kanto(g).has('saffron'));assert.ok(N.kanto(g).has('fuchsia'));
  g.resetSeason(now+1000);assert.deepEqual([...N.kanto(g)],[]);
 });
 test(Type.name+' Johto guidance keeps introduced but unavailable errands, without future story spoilers',()=>{
  let g=ready(Type);g.data.johtoUnlocked=true;J.init(g);JW.init(g);const state=g.data.johto;
  assert.deepEqual([...N.johto(g,JW.locationFor)],[]);
  state.cleared['j-pryce']=now;let p=JW.snapshot(g).places.find(p=>p.id==='j-goldenrod');
  assert.equal(p.guidance,true);assert.ok(!J.available(g,J.nodes.get('j-radio-final')),'next opponents still block final errand');
  assert.ok(!N.johto(g,JW.locationFor).has('j-silver'),'future mountain remains unannounced');
  g=new Type(structuredClone(g.data),now+1);assert.ok(N.johto(g,JW.locationFor).has('j-goldenrod'));
  g.data.johto.cleared['j-radio-final']=now;assert.ok(!N.johto(g,JW.locationFor).has('j-goldenrod'));assert.ok(N.johto(g,JW.locationFor).has('j-ice'));
  g.data.johto.cleared['j-victory-road']=now;assert.ok(N.johto(g,JW.locationFor).has('j-k-indigo'));
  g.data.johto.cleared['j-league-lance']=now;assert.ok(!N.johto(g,JW.locationFor).has('j-k-indigo'));assert.ok(N.johto(g,JW.locationFor).has('j-olivine'));
 });
}
test('every shared Johto guidance edge has a real source, resolution and mapped destination',()=>{
 for(const [source,target]of N.johtoLinks){assert.ok(J.nodes.has(source),source);const n=J.nodes.get(target);assert.ok(n,target);assert.ok(JW.byId.has(JW.locationFor(n.type==='league'?'j-league':target)),target);}
});
