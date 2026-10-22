'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),map=require('../../shared/kanto-map.json'),walking=require('../map-walk.js');
const {Adventure:PC}=require('../adventure.cjs'),{Adventure:Android}=require('../../mobile/adventure.cjs'),world=require('../../shared/kanto-world.cjs');
const now=Date.parse('2026-10-22T05:00:00Z');
function ready(Type=PC){const g=new Type({},now,{random:()=>.5});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}
test('every place has a connected path consisting only of adjacent original road cells',()=>{
 const allowed=new Set(map.roads.map(p=>p.x+','+p.y));for(const [id,to] of Object.entries(map.points)){const path=walking.route(map,map.points.pallet,to);assert.ok(path,id);assert.deepEqual(path[0],map.points.pallet);assert.deepEqual(path.at(-1),to);for(let i=0;i<path.length;i++){assert.ok(allowed.has(path[i].x+','+path[i].y));if(i)assert.equal(Math.abs(path[i].x-path[i-1].x)+Math.abs(path[i].y-path[i-1].y),8);}}
 assert.equal(walking.route(map,{x:0,y:0},map.points.pallet),null);
});
test('town cells retain their own destination instead of an adjacent ship or building alias',()=>{
 for(const id of ['pallet','viridian','pewter','cerulean','vermilion','celadon','saffron','fuchsia','cinnabar','indigo']){const p=map.points[id];assert.equal(map.roads.find(c=>c.x===p.x&&c.y===p.y).place,id);}
});
test('walking frames turn on road corners, animate feet, and land exactly on the destination',()=>{
 const walk={path:[{x:12,y:20},{x:20,y:20},{x:20,y:12}],at:1000,duration:400};
 assert.deepEqual([walking.frame(walk,1000).x,walking.frame(walk,1000).y],[12,20]);assert.equal(walking.frame(walk,1100).direction,'right');assert.equal(walking.frame(walk,1300).direction,'up');assert.ok(walking.frame(walk,1100).walking);assert.notEqual(walking.frame(walk,1000).sprite,walking.frame(walk,1120).sprite);
 const end=walking.frame(walk,1600);assert.deepEqual([end.x,end.y],[20,12]);assert.equal(end.walking,false);assert.equal(end.progress,1);
});
for(const Type of [PC,Android])test(Type.name+' holds the next wild encounter while Red walks without spending activity',()=>{
 const g=ready(Type),tokens=g.data.workTokens=250;assert.ok(g.requestAction('travel','forest',now));const walk=world.snapshot(g,now).walk;assert.ok(walk);assert.equal(walk.from,'route-1');assert.equal(walk.to,'forest');assert.equal(g.data.switchUntil,now+walk.duration);assert.equal(g.tick(now+walk.duration-1),false);assert.equal(g.data.battle,null);assert.equal(g.data.workTokens,tokens);
 assert.equal(g.tick(now+walk.duration),true);assert.equal(g.data.battle.location,'forest');assert.equal(world.snapshot(g,now+walk.duration).walk,null);assert.equal(world.snapshot(g,now+walk.duration).facing,'up');
});
test('a clicked cell inside the same road is preserved rather than jumping to the road midpoint',()=>{
 const g=ready(),position={x:44,y:92};assert.ok(g.requestAction('travel',{location:'route-1',position},now));assert.deepEqual(g.data.kantoWorld.position,position);assert.deepEqual(g.data.kantoWorld.walk.path.at(-1),position);
 const loaded=new PC(g.data,now+20);assert.deepEqual(loaded.data.kantoWorld.walk,g.data.kantoWorld.walk);assert.deepEqual(world.snapshot(loaded,now+20).position,position);
 assert.ok(!loaded.requestAction('travel',{location:'route-1',position:{x:0,y:0}},now));assert.ok(!loaded.requestAction('travel',{location:'route-1',position:{x:NaN,y:92}},now));
});
test('a destination selected mid-walk waits for arrival, while selecting the current destination does not duplicate it',()=>{
 const g=ready();g.requestAction('travel','forest',now);const end=g.data.switchUntil;assert.ok(g.requestAction('travel','forest',now+1));assert.equal(g.data.pendingActions.length,0);assert.ok(g.requestAction('travel','route-2',now+2));assert.equal(g.data.pendingActions.length,1);assert.equal(g.processActions(end-1),false);assert.equal(g.processActions(end),true);assert.equal(g.data.kantoWorld.walk.from,'forest');assert.equal(g.data.kantoWorld.walk.to,'route-2');assert.equal(g.data.pendingActions.length,0);
});
test('exact clicked cell reservations survive an active battle and a reload',()=>{
 const g=ready();g.newWild(now);const position={x:44,y:92};g.requestAction('travel',{location:'route-1',position},now);const loaded=new PC(g.data,now+1);assert.deepEqual(loaded.data.pendingActions[0].position,position);assert.equal(world.current(loaded).id,'route-1');assert.equal(world.snapshot(loaded,now+1).walk,null);
});
