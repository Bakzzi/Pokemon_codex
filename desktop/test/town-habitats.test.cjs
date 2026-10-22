'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-world.cjs'),W=require('../../shared/johto-world.cjs'),J=require('../../shared/johto.cjs');
const {wildDistribution,wildEligible,xpAt,data}=require('../pokemon.cjs'),raw=require('../../shared/kanto-habitats.json'),now=Date.parse('2026-10-22T06:00:00Z'),ids=p=>p.map(p=>p.id).sort((a,b)=>a-b);
test('localizing second-region encounters preserves an obtainable habitat for every previously legal wild species',()=>{for(const p of data.pokemon.filter(p=>wildEligible(p,2,100)&&!J.noWild.has(p.id)))assert.ok(W.locationsFor(p.id).length,p.name);});
function ready(Type){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}
for(const Type of [PC,Android]){
 test(Type.name+' towns mix adjacent reachable roads while each road keeps its own species',()=>{
  const g=ready(Type);g.data.kantoWorld.location='viridian';const expected=new Set(['kanto-route-1','kanto-route-2','kanto-route-22'].flatMap(k=>ids(raw[k])));
  assert.deepEqual(ids(g.wildOptions().habitat),[...expected].sort((a,b)=>a-b));assert.ok(g.wildOptions().habitat.some(p=>p.id===56));assert.ok(!g.wildOptions().habitat.some(p=>p.id===144));
  for(const location of ['route-1','route-2','route-22']){g.data.kantoWorld.location=location;assert.deepEqual(ids(g.wildOptions().habitat),ids(raw[K.byId.get(location).habitat]));}
  g.data.kantoWorld.location='pewter';assert.ok(!g.wildOptions().habitat.some(p=>p.id===39));g.data.badges=['brock'];assert.ok(g.wildOptions().habitat.some(p=>p.id===39));
 });
 test(Type.name+' town encounters keep running and do not count as a numbered-road traversal',()=>{
  const g=ready(Type);g.data.kantoWorld.location='viridian';g.data.workTokens=250;assert.ok(g.tick(now));assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.battle.location,'viridian');g.data.battle.foe.hp=0;g.showFaint(g.data.switchUntil);g.tick(g.data.switchUntil);assert.equal(g.panelState(g.data.switchUntil).kantoWorld.roadProgress,null);
 });
 test(Type.name+' every reached second-region location has a local eligible pool, including towns and revisits',()=>{
  const g=ready(Type);g.data.champion=true;g.unlockJohto(now,[25]);g.data.johto.champion=true;for(const n of J.nodes.values())g.data.johto.cleared[n.id]=now;const p=g.data.owned[g.data.activeId];p.level=100;p.xp=xpAt(p.id,100);
  for(const place of W.places){g.data.johtoWorld.location=place.id;const options=g.wildOptions();assert.ok(options.habitat.length,place.id);const d=wildDistribution(2,100,options);assert.ok(d.pokemon.length,place.id);assert.ok(d.pokemon.every(p=>options.habitat.some(h=>h.id===p.id)));}
  g.data.johtoWorld.location='j-route29';const road=ids(g.wildOptions().habitat);g.data.johtoWorld.location='j-cherrygrove';const town=ids(g.wildOptions().habitat);assert.ok(road.every(id=>town.includes(id)));assert.ok(town.length>road.length);
 });
}
