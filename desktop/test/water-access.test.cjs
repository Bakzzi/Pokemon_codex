'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const K=require('../../shared/kanto-world.cjs'),J=require('../../shared/johto.cjs'),JW=require('../../shared/johto-world.cjs');
const H=require('../../shared/local-habitats.cjs'),raw=require('../../shared/kanto-habitats.json'),johto=require('../../shared/johto-habitats.json');
const {Game}=require('../game.cjs'),{wildDistribution,xpAt}=require('../pokemon.cjs'),now=Date.parse('2026-10-23T09:00:00Z');
function ready(Type){const g=new Type(new Game({},now).data,now,{storyAuto:false,random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=now;const hero=g.data.owned[g.data.activeId];hero.level=100;hero.xp=xpAt(hero.id,100);require('../move-access.cjs').update(hero);g.data.badges=['brock','misty','surge','erika','sabrina','koga','blaine','giovanni'];g.data.champion=true;return g;}
function pages(g){while(g.presentation()?.mode==='dialogue'){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}}
function chance(g,id){return wildDistribution(g.maxGeneration(),100,g.wildOptions()).pokemon.find(p=>p.id===id)?.chance||0;}
test('pinned encounter methods survive both generators, including derived water evolutions',()=>{
 for(const pools of [raw,johto])for(const entries of Object.values(pools))for(const p of entries){assert.ok(Object.keys(p.methods).length);assert.ok(Math.abs(Object.values(p.methods).reduce((a,b)=>a+b,0)-p.weight)<1e-8);}
 assert.deepEqual(johto['johto-route-32'].find(p=>p.id===130).methods,{2:510/675,3:105/675,4:60/675});
 const cave=H.accessible(raw['seafoam-islands'],false);assert.equal(cave.find(p=>p.id===86).weight,290);assert.ok(!cave.some(p=>p.id===129));
});
for(const Type of [PC,Android]){
 test(Type.name+' land, town and cave pools exclude water encounters until either actual condition is met',()=>{
  const g=ready(Type);
  for(const location of ['route-22','viridian','route-24','cerulean-cave']){g.data.kantoWorld.location=location;assert.equal(chance(g,129),0,location);assert.ok(g.wildOptions().habitat.length);}
  g.data.kantoWorld.location='route-22';g.data.mobileStory.safari.trip={};assert.equal(chance(g,129),0);g.data.mobileStory.safari.trip=null;
  assert.match(g.panelState(now).collection.find(p=>p.id===129).acquisition.routes.find(r=>r.kind==='wild').note,/낚싯대/);
  g.data.kantoStory.items['fishing-rod']=1;assert.ok(chance(g,129)>0);const withRod=g.wildOptions().habitat;
  delete g.data.kantoStory.items['fishing-rod'];g.data.mobileStory.safari.completedAt=now;assert.deepEqual(g.wildOptions().habitat,withRod);
  g.data.mobileStory.safari.completedAt=null;g.data.kantoWorld.location='seafoam';assert.ok(chance(g,86)>0,'land Water-type still legal');assert.equal(chance(g,129),0);
 });
 test(Type.name+' manual rod reward requires arrival and dialogue completion, persists, and resets seasonally',()=>{
  let g=ready(Type);g.data.kantoWorld.location='route-22';assert.equal(g.challenge('k-fishing-rod',now),false);
  g.data.kantoWorld.location='vermilion';assert.ok(g.challenge('k-fishing-rod',now));assert.equal(H.waterAccess(g),false);const scene=g.presentation();assert.equal(scene.sprite,'fishing-guru');
  g=new Type(structuredClone(g.data),now);assert.equal(H.waterAccess(g),false);pages(g);assert.ok(H.waterAccess(g));assert.equal(g.data.kantoStory.items['fishing-rod'],1);assert.equal(g.canChallenge('k-fishing-rod'),false);
  assert.equal(g.panelState(now).inventory.find(p=>p.id==='kanto-fishing-rod').name,'낚싯대');assert.equal(K.unlocked(g,K.byId.get('route-19')),false,'rod does not open sea travel');
  g=new Type(structuredClone(g.data),now);assert.ok(H.waterAccess(g));g.resetSeason(now+32*86400000);assert.equal(H.waterAccess(g),false);
 });
 test(Type.name+' old misplaced water-only save cannot spawn globally, crash, or burn activity',()=>{
  let g=ready(Type);g.data.kantoWorld.location='route-19';g.data.kantoWorld.journey=null;g.data.workTokens=750;for(const n of require('../../shared/kanto-journey.cjs').nodes.values())if(n.location==='route-19'&&n.trainer)g.data.kantoStory.cleared[n.id]=now;const before=structuredClone(g.data.owned);
  assert.equal(g.newWild(now),false);assert.equal(g.tick(now),false);assert.equal(g.data.workTokens,750);assert.equal(g.data.battle,null);assert.deepEqual(g.data.owned,before);assert.doesNotThrow(()=>g.panelState(now));
  g.data.kantoStory.items['fishing-rod']=1;g.newWild(now);assert.ok(g.data.battle);const battle=structuredClone(g.data.battle);delete g.data.kantoStory.items['fishing-rod'];g=new Type(structuredClone(g.data),now);assert.deepEqual(g.data.battle,battle,'already started encounters survive upgrades');
 });
 test(Type.name+' second-region methods use actual local Surf progress or rod and preserve grass Water-types',()=>{
  let g=ready(Type);g.unlockJohto(now,[25]);g.data.johtoWorld.location='j-route32';g.data.johto.cleared['j-falkner']=now;
  // Previous region completion never substitutes for this region water progress.
  g.data.mobileStory.safari.completedAt=now;assert.equal(H.waterAccess(g),false);assert.equal(chance(g,129),0);assert.ok(g.wildOptions().habitat.some(p=>p.id===194));
  assert.equal(JW.locationFor('j-fishing-rod'),'j-route32');g.data.switchUntil=0;g.nextTick=now;assert.ok(g.challenge('j-fishing-rod',now));assert.equal(H.waterAccess(g),false);pages(g);assert.ok(H.waterAccess(g));assert.ok(chance(g,129)>0);
  g=new Type(structuredClone(g.data),now);assert.ok(H.waterAccess(g));delete g.data.johto.items['fishing-rod'];assert.equal(H.waterAccess(g),false);g.data.johto.cleared['j-kimono-4']=now;assert.ok(chance(g,129)>0);
 });
}
