'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../../desktop/game.cjs'),{Adventure}=require('../adventure.cjs'),Progression=require('../web/progression.js');
globalThis.MobileCore={nursery:require('../../desktop/daycare.cjs')};
const now=Date.parse('2026-10-18T06:00:00Z');
function fixture(){const g=new Adventure(new Game({},now).data,now,{random:()=>.7}),p=new Progression(g);p.resume(now);return {g,p};}
test('an old saved tutorial updates the activity explanation without skipping a page',()=>{
  const old=new Adventure({},now);old.presentation().pages[2]='앱을 켜 두면 자동으로 모험한단다. 꺼 둔 동안에는 10걸음마다 모험이 이어지지.';old.presentation().index=2;
  const next=new Adventure(structuredClone(old.data),now+1000);assert.equal(next.presentation().index,2);assert.match(next.presentation().pages[2],/폰을 잠그면 10초/);
});
test('ordinary adventure stays frozen while unlocked, with the app open or closed',()=>{
  const {g,p}=fixture();g.newWild(now);const before=JSON.stringify(g.data);
  for(let n=1;n<10;n++)assert.equal(p.live(now+n*10000),false);
  p.pause(now+100000);assert.equal(p.live(now+500000),false);assert.equal(JSON.stringify(g.data),before);
});
test('ten seconds and ten steps add independently, retaining both remainders across a restart',()=>{
  const {g,p}=fixture();assert.equal(p.catchUp({steps:19,lockMillis:29999},now),3);
  assert.equal(p.consumed,10);assert.equal(p.lockConsumed,20000);
  const restored=new Progression(new Adventure(structuredClone(g.data),now),structuredClone(p.checkpoint()));
  assert.equal(restored.catchUp({steps:19,lockMillis:29999},now),0);
  assert.equal(restored.catchUp({steps:20,lockMillis:30000},now),2);
  assert.equal(restored.catchUp({steps:20,lockMillis:30000},now),0);
});
test('recorded lock time is required; wall clock and invalid counters grant no actions',()=>{
  const {g,p}=fixture(),before=JSON.stringify(g.data);
  for(const t of [undefined,-1,NaN,Infinity,9999,10000.1])assert.equal(p.catchUp({steps:0,lockMillis:t},now+86400000),0);
  assert.equal(JSON.stringify(g.data),before);
});
test('a challenge runs in foreground without consuming either activity balance and pauses in background',()=>{
  const {g,p}=fixture();assert.ok(g.challenge(0,now));
  while(g.presentation()?.mode==='dialogue'){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now);}
  assert.equal(p.live(now+3000),true);assert.equal(p.live(now+10000),true);
  assert.equal(p.consumed,0);assert.equal(p.lockConsumed,0);p.pause(now+10001);
  const before=JSON.stringify(g.data);assert.equal(p.live(now+50000),false);
  assert.equal(p.catchUp({steps:1000,lockMillis:1000000},now+50000),0);assert.equal(JSON.stringify(g.data),before);
});
test('challenge return preserves a wild foe and cannot resume on old credits before another lock',()=>{
  const {g,p}=fixture();g.data.mobileStory.rivals['rival-brock'].state='won';p.observe({lockEpoch:4});g.newWild(now-10000);const wild=g.data.battle,foe=structuredClone(wild.foe);
  assert.ok(g.challenge(0,now));assert.equal(p.live(now),true);assert.equal(g.data.suspendedWild,wild);
  g.data.mobileStory.scene=null;g.endChallenge(true,now+10000);
  assert.equal(g.data.battle,wild);assert.deepEqual(wild.foe,foe);assert.equal(wild.resumeAfterLock,4);
  assert.equal(p.live(now+100000),false);assert.equal(p.catchUp({steps:100,lockMillis:100000,lockEpoch:4},now+100000),0);
  const next=new Progression(new Adventure(structuredClone(g.data),now+110000),p.checkpoint());
  assert.equal(next.catchUp({steps:0,lockMillis:10000,lockEpoch:5},now+110000),1);assert.equal(next.lockConsumed,10000);
});
test('clock credits do not fabricate walking progress for Safari',()=>{
  const {g,p}=fixture();let walked=0;g.walkingStep=()=>{walked++;return true;};
  assert.equal(p.catchUp({steps:0,lockMillis:10000},now),1);assert.equal(walked,0);
  assert.equal(p.catchUp({steps:10,lockMillis:10000},now),1);assert.equal(walked,1);
});
