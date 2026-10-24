'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure:PC}=require('../adventure.cjs'),{Adventure:Android}=require('../../mobile/adventure.cjs');
const world=require('../../shared/kanto-world.cjs'),{data,wildEligible,wildDistribution,xpAt,wildMinimum,species}=require('../pokemon.cjs');
const now=Date.parse('2026-10-22T05:00:00Z'),badges=data.bosses.slice(0,8).map(b=>b.id);
const {finishJourney}=require('./helpers/travel-fixture.cjs');
function ready(Type=PC){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.5});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}
function late(Type=PC){const g=ready(Type);g.data.badges=[...badges];g.data.champion=true;g.data.trainingDevice.snorlaxWonAt=now;g.data.mobileStory.scopeObtainedAt=now;const p=g.data.owned[g.data.activeId];p.level=100;p.xp=xpAt(p.id,100);require('../move-access.cjs').update(p);return g;}
test('town map covers every first-region route and all lines connect existing distinct places',()=>{
 assert.equal(new Set(world.places.map(p=>p.id)).size,world.places.length);
 for(let n=1;n<=25;n++)assert.ok(world.byId.has('route-'+n));
 for(const line of world.links)for(const id of line)assert.ok(world.byId.has(id));
 const excluded=[131,...require('../../shared/safari.cjs').pool.map(([id])=>id)];
 for(const p of data.pokemon.filter(p=>wildEligible(p,1,100)&&!excluded.includes(p.id))){assert.ok(world.locationsFor(p.id).length,p.name+' habitat missing');if(wildMinimum(p)<=52)assert.ok(world.locationsFor(p.id).some(l=>l.max>=wildMinimum(p)),p.name+' level range missing');}
});
test('new game starts on the first road; badges and actual road/story outcomes open later stretches',()=>{
 const g=ready(),open=id=>world.unlocked(g,world.byId.get(id));assert.equal(world.current(g).id,'route-1');assert.ok(open('forest'));assert.ok(!open('route-3'));
 g.data.badges=badges.slice(0,1);assert.ok(open('route-3'));assert.ok(open('route-25'));assert.ok(!open('route-5'));
 g.data.badges=badges.slice(0,3);assert.ok(open('celadon'));assert.ok(open('tower'));assert.equal(g.canChallenge('tower-grunt-1'),false);
 g.data.badges=badges.slice(0,4);assert.ok(open('route-12'));assert.ok(open('route-13')); // Snorlax guards the crossing; either side remains reachable.
 assert.ok(!open('route-19'));g.data.badges=badges.slice(0,6);assert.ok(open('route-19'));assert.ok(!open('route-23'));
 g.data.badges=[...badges];assert.ok(open('indigo'));assert.ok(!open('cerulean-cave'));g.data.champion=true;assert.ok(open('cerulean-cave'));
});
test('existing progress migrates near its current frontier while battles, ownership, XP, inventory and settings data remain intact',()=>{
 const g=late();delete g.data.kantoWorld;g.newWild(now);g.data.inventory={83:7};const saved=structuredClone(g.data);delete saved.kantoWorld;
 for(const Type of [PC,Android]){const loaded=new Type(saved,now+1);assert.equal(world.current(loaded).id,'cerulean-cave');for(const key of ['owned','slots','battle','caught','badges','inventory','outputTokens'])assert.deepEqual(loaded.data[key],saved[key],key);}
});
for(const Type of [PC,Android])test(Type.name+' travels after results, saves the reservation, replaces it, and never spends activity to move',()=>{
 const g=ready(Type);g.newWild(now);const battle=structuredClone(g.data.battle),work=g.data.workTokens;
 assert.ok(g.requestAction('travel','forest',now));assert.equal(world.current(g).id,'route-1');assert.deepEqual(g.data.battle,battle);
 const loaded=new Type(g.data,now+1);assert.equal(loaded.data.pendingActions[0].location,'forest');assert.ok(loaded.requestAction('travel','route-2',now+2));assert.equal(loaded.data.pendingActions.length,1);assert.equal(loaded.data.pendingActions[0].location,'route-2');
 loaded.data.battle=null;loaded.data.pendingBattle=null;loaded.data.switchUntil=now+100;loaded.nextTick=now;
 assert.equal(loaded.processActions(now+99),false);assert.equal(loaded.processActions(now+101),true);assert.equal(world.current(loaded).id,'route-1');assert.equal(loaded.data.kantoWorld.journey.destination,'route-2');const end=finishJourney(loaded,now+101);assert.equal(world.current(loaded).id,'route-2');assert.equal(loaded.data.workTokens,work);
 assert.ok(loaded.requestAction('travel','route-2',end));assert.equal(loaded.data.pendingActions.length,0);assert.ok(loaded.requestAction('travel','route-3',end));assert.ok(!loaded.requestAction('travel','../../outside',end));
});
test('all reached places draw only local eligible species with local ranges clamped below original boss levels',()=>{
 const g=late();let draw=0;g.random=()=>((draw++*71)%997)/997;
 for(const p of world.places){g.data.kantoWorld.location=p.id;const options=g.wildOptions(),distribution=wildDistribution(1,100,options),allowed=new Set(options.habitat.map(p=>p.id));assert.ok(Math.abs(distribution.pokemon.reduce((n,p)=>n+p.chance,0)-1)<1e-10);assert.ok(distribution.pokemon.every(p=>allowed.has(p.id)));
  for(let i=0;i<15;i++){g.newWild(now);const foe=g.data.battle.foe;assert.equal(g.data.battle.location,p.id);assert.ok(foe.level>=options.minimumEncounterLevel);assert.ok(foe.level>=wildMinimum(species.get(foe.id)));assert.ok(foe.level<=options.maximumLevel);assert.ok(allowed.has(foe.id));}
 }
 const early=ready();for(let i=0;i<50;i++){early.newWild(now);assert.ok([16,19].includes(early.data.battle.foe.id));assert.ok(early.data.battle.foe.level>=2&&early.data.battle.foe.level<=5);}
});
test('missing local rare bonuses end after registration and cannot spawn the species in a foreign habitat',()=>{
 const g=late();g.data.kantoWorld.location='seafoam';const before=wildDistribution(1,100,g.wildOptions()).pokemon.find(p=>p.id===144);assert.ok(before.chance>0);g.data.caught[144]=now;const after=wildDistribution(1,100,g.wildOptions()).pokemon.find(p=>p.id===144);assert.equal(after.weight,1);assert.ok(after.chance<before.chance);
 g.data.kantoWorld.location='route-1';assert.ok(wildDistribution(1,100,g.wildOptions()).pokemon.every(p=>p.id!==144));
});
test('dex uses exact current habitat probabilities and tells the player to change habitat for absent wild species',()=>{
 const g=late();g.data.kantoWorld.location='route-1';const panel=g.panelState(now),hint=id=>panel.collection.find(p=>p.id===id).acquisition.routes.find(r=>r.kind==='wild');
 assert.equal(hint(16).chance,wildDistribution(1,100,g.wildOptions()).pokemon.find(p=>p.id===16).chance);assert.equal(hint(144).chance,0);assert.match(hint(144).text,/쌍둥이섬/);assert.ok(!panel.collection.find(p=>p.id===65).acquisition.routes.some(r=>r.kind==='wild'));
});
test('PC and Android share geography; second-region wilds do not inherit the first road habitat or levels',()=>{
 const pc=late(PC),android=new Android(pc.data,now);const a=pc.panelState(now).kantoWorld,b=android.panelState(now).kantoWorld;for(const key of ['map','places','levels'])assert.deepEqual(a[key],b[key]);assert.equal(b.travelMode,'steps');assert.equal(b.roadProgress,null);
 assert.ok(pc.unlockJohto(now,[25]));assert.deepEqual(pc.wildOptions().habitat,require('../../shared/johto-world.cjs').habitat(pc));assert.equal(pc.wildOptions().minimumEncounterLevel,undefined);assert.equal(pc.snapshot(now).location.id,'j-newbark');assert.equal(pc.panelState(now).kantoWorld.active,false);assert.ok(!pc.requestAction('travel','forest',now));
});
test('new season clears travel and visited places while permanent collection registration survives',()=>{
 const g=late();g.data.kantoWorld.location='seafoam';g.data.caught[144]=now;g.data.pendingActions=[];g.resetSeason(now+1000);assert.equal(world.current(g).id,'pallet');assert.ok(g.data.caught[144]);assert.equal(world.snapshot(g).places.find(p=>p.id==='seafoam').visited,false);
});
