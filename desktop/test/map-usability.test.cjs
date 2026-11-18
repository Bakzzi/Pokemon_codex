'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const now=Date.parse('2026-11-18T03:00:00Z');
function game(Type){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.6});g.data.mobileStory.scene=null;g.data.mobileStory.onboarding='done';g.data.storyTravel={enabled:false};g.data.switchUntil=0;g.nextTick=now;return g;}
for(const Type of [PC,Android])test(Type.name+' remembers visited facilities across reloads without revealing unvisited ones or granting rewards',()=>{
 let g=game(Type);delete g.data.mobileStory.safari.completedAt;assert.deepEqual(g.panelState(now).kantoWorld.facilities,[]);
 g.data.kantoWorld.visited['route-5']=now;let rows=g.panelState(now).kantoWorld.facilities;
 assert.deepEqual(rows.map(r=>r.location),['route-5']);assert.equal(g.data.mobileStory.safari.completedAt,undefined);
 g.data.kantoWorld.visited.safari=now;g=new Type(structuredClone(g.data),now+1);rows=g.panelState(now+1).kantoWorld.facilities;
 assert.deepEqual(rows.map(r=>r.location),['route-5','safari']);assert.equal(g.data.mobileStory.safari.completedAt,undefined);
 g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));assert.deepEqual(g.panelState(now).johtoWorld.facilities,[]);
 g.data.johtoWorld.visited['j-route34']=now;g.data.johtoWorld.visited['j-k-route-5']=now;g=new Type(structuredClone(g.data),now+1);
 assert.deepEqual(g.panelState(now+1).johtoWorld.facilities.map(r=>r.location),['j-route34','j-k-route-5']);
});
test('one explicit bank click can select a route and promptly leave an undecided wild battle; duplicates cannot retarget it',()=>{
 const g=game(Android);g.data.kantoWorld.location='pallet';g.data.kantoWorld.position={...g.panelState(now).kantoWorld.map.points.pallet};g.recordTravelSteps(0);g.data.mapTravel.bank=10000;g.newWild(now);g.animate('attack',{text:'fixture'},now);
 const xp=g.data.owned[g.data.activeId].xp,request={location:'route-1',position:{x:44,y:92}};
 assert.ok(g.requestAction('travel-bank',request,now));assert.equal(g.data.battle,null);assert.equal(g.data.animation.text,'성공적으로 도망쳤다!');assert.equal(g.nextTick,now+350);assert.equal(g.data.mapTravel.bank,10000);
 const pending=structuredClone(g.data.pendingActions),trip=structuredClone(g.data.kantoWorld.journey);
 assert.equal(g.requestAction('travel-bank','pewter',now),false);assert.deepEqual(g.data.pendingActions,pending);assert.deepEqual(g.data.kantoWorld.journey,trip);assert.equal(g.data.owned[g.data.activeId].xp,xp);
});
test('bank requests with an invalid destination or insufficient resources preserve the current route and automatic travel choice',()=>{
 const g=game(Android);g.recordTravelSteps(0);g.data.mapTravel.bank=2000;
 const before=structuredClone({world:g.data.kantoWorld,auto:g.data.storyTravel,actions:g.data.pendingActions});
 assert.equal(g.requestAction('travel-bank','missing-place',now),false);assert.deepEqual({world:g.data.kantoWorld,auto:g.data.storyTravel,actions:g.data.pendingActions},before);
 g.data.mapTravel.bank=1999;assert.equal(g.requestAction('travel-bank','pewter',now),false);assert.deepEqual(g.data.pendingActions,before.actions);
 const pc=game(PC);assert.equal(pc.requestAction('travel-bank','pewter',now),false);
});
