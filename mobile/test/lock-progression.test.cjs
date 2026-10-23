'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../../desktop/game.cjs'),{Android:Adventure}=require('../../desktop/test/helpers/story-fixture.cjs'),Progression=require('../web/progression.js');
globalThis.MobileCore={nursery:require('../../desktop/daycare.cjs')};
const now=Date.parse('2026-10-18T06:00:00Z');
const gameplay=g=>JSON.stringify({...g.data,mapTravel:undefined});
function fixture(){const g=new Adventure(new Game({},now).data,now,{random:()=>.7}),p=new Progression(g);p.resume(now);return {g,p};}
test('an old saved tutorial updates the activity explanation without skipping a page',()=>{
  for(const text of ['앱을 켜 두면 자동으로 모험한단다. 꺼 둔 동안에는 10걸음마다 모험이 이어지지.','10걸음마다 동료와 모험한단다. 폰을 잠그면 10초마다 한 번 더 모험하지. 앱을 켜고 걸어도 모험을 지켜볼 수 있어.']){
    const old=new Adventure({},now);old.presentation().pages[2]=text;old.presentation().index=2;
    const next=new Adventure(structuredClone(old.data),now+1000);assert.equal(next.presentation().index,2);assert.match(next.presentation().pages[2],/20초마다/);assert.match(next.presentation().pages[2],/걸음은 타운맵에서 이동/);
  }
});
test('ordinary adventure stays frozen while unlocked, with the app open or closed',()=>{
  const {g,p}=fixture();g.newWild(now);const before=JSON.stringify(g.data);
  for(let n=1;n<10;n++)assert.equal(p.live(now+n*10000),false);
  p.pause(now+100000);assert.equal(p.live(now+500000),false);assert.equal(JSON.stringify(g.data),before);
});
test('only lock time awards actions and its remainder survives restart',()=>{
  const {g,p}=fixture();assert.equal(p.catchUp({steps:19,lockMillis:59999},now),2);
  assert.equal(p.consumed,0);assert.equal(p.lockConsumed,40000);
  const restored=new Progression(new Adventure(structuredClone(g.data),now),structuredClone(p.checkpoint()));
  assert.equal(restored.catchUp({steps:19,lockMillis:59999},now),0);
  assert.equal(restored.catchUp({steps:20,lockMillis:60000},now),1);
  assert.equal(restored.catchUp({steps:20,lockMillis:60000},now),0);
});
test('recorded lock time is required; wall clock and invalid counters grant no actions',()=>{
  const {g,p}=fixture(),before=gameplay(g);
  for(const t of [undefined,-1,NaN,Infinity,10000,19999,20000.1])assert.equal(p.catchUp({steps:0,lockMillis:t},now+86400000),0);
  assert.equal(gameplay(g),before);
});
test('a challenge runs in foreground without consuming either activity balance and pauses in background',()=>{
  const {g,p}=fixture();assert.ok(g.challenge(0,now));
  while(g.presentation()?.mode==='dialogue'){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now);}
  assert.equal(p.live(now+3000),true);assert.equal(p.live(now+10000),true);
  assert.equal(p.consumed,0);assert.equal(p.lockConsumed,0);p.pause(now+10001);
  const before=gameplay(g);assert.equal(p.live(now+50000),false);
  assert.equal(p.catchUp({steps:1000,lockMillis:1000000},now+50000),0);assert.equal(gameplay(g),before);
});
test('challenge return preserves a wild foe until recorded walking or another lock',()=>{
  const {g,p}=fixture();g.data.mobileStory.rivals['rival-brock'].state='won';p.observe({lockEpoch:4});g.newWild(now-10000);const wild=g.data.battle,foe=structuredClone(wild.foe);
  assert.ok(g.challenge(0,now));assert.equal(p.live(now),true);assert.equal(g.data.suspendedWild,wild);
  g.data.mobileStory.scene=null;g.endChallenge(true,now+10000);
  assert.equal(g.data.battle,wild);assert.deepEqual(wild.foe,foe);assert.equal(wild.resumeAfterLock,4);
  assert.equal(p.live(now+100000),false);assert.equal(p.catchUp({steps:0,lockMillis:100000,lockEpoch:4},now+100000),0);
  const next=new Progression(new Adventure(structuredClone(g.data),now+110000),p.checkpoint());
  assert.equal(next.catchUp({steps:0,lockMillis:20000,lockEpoch:5},now+110000),1);assert.equal(next.lockConsumed,20000);
});

test('foreground walking cannot advance a battle or change its XP',()=>{
  const {g,p}=fixture();g.newWild(now);const before=gameplay(g);
  for(const steps of [9,10,20,100000])assert.ok(p.live(now+60000,{steps}));
  assert.equal(gameplay(g),before);assert.equal(g.data.mapTravel.bank,99991);assert.equal(p.consumed,0);assert.equal(p.lockConsumed,0);
});

test('walking does not become a reward during foreground and background handoff',()=>{
  const {g,p}=fixture();assert.ok(p.live(now,{steps:19}));p.pause(now+1000);
  const q=new Progression(new Adventure(structuredClone(g.data),now+60000),p.checkpoint());q.resume(now+60000);
  assert.ok(q.live(now+120000,{steps:20000}));assert.equal(q.catchUp({steps:20000,lockMillis:0},now+120000),0);assert.equal(q.consumed,0);assert.equal(q.game.data.mapTravel.bank,19981);
});

test('walking after a challenge preserves its wild opponent until another lock',()=>{
  const {g,p}=fixture();g.data.mobileStory.rivals['rival-brock'].state='won';p.observe({lockEpoch:4});g.newWild(now-10000);
  const wild=g.data.battle;assert.ok(g.challenge(0,now));assert.ok(p.live(now));g.data.mobileStory.scene=null;g.endChallenge(true,now+10000);
  assert.equal(g.data.battle,wild);const before=JSON.stringify(wild);
  assert.ok(p.live(now+100000,{steps:100000}));assert.equal(p.catchUp({steps:100000,lockMillis:20000,lockEpoch:4},now+100000),0);assert.equal(JSON.stringify(wild),before);
  assert.ok(p.catchUp({steps:100000,lockMillis:20000,lockEpoch:5},now+110000));assert.equal(p.lockConsumed,20000);assert.equal(wild.resumeAfterLock,undefined);
});

test('dialogue and challenge turns preserve foreground walking credits',()=>{
  const {g,p}=fixture();g.dialogue('trainer','그린','green',['fixture'],'adventure',now);
  assert.ok(p.live(now+10000,{steps:100}));assert.equal(p.consumed,0);assert.equal(g.presentation().index,0);
  g.data.mobileStory.scene=null;assert.ok(g.challenge(0,now+10000));p.live(now+20000,{steps:100});assert.equal(p.consumed,0);
});
test('Safari uses lock actions and never sensor steps',()=>{
  const {g,p}=fixture();let walked=0;g.activityStep=()=>{walked++;return true;};
  assert.equal(p.catchUp({steps:0,lockMillis:20000},now),1);assert.equal(walked,1);
  assert.equal(p.catchUp({steps:10000,lockMillis:20000},now),0);assert.equal(walked,1);
});
test('the slower lock rate retains raw milliseconds, prior paid time and the remainder across an upgrade',()=>{
  const {g}=fixture(),p=new Progression(g,{lockConsumed:10000});
  assert.equal(p.catchUp({steps:0,lockMillis:29999},now),0);assert.equal(p.lockConsumed,10000);
  assert.equal(p.catchUp({steps:0,lockMillis:30000},now),1);assert.equal(p.lockConsumed,30000);
  const restored=new Progression(new Adventure(structuredClone(g.data),now),p.checkpoint());
  assert.equal(restored.catchUp({steps:0,lockMillis:49999},now),0);assert.equal(restored.catchUp({steps:0,lockMillis:50000},now),1);assert.equal(restored.lockConsumed,50000);assert.equal(restored.consumed,0);
});
