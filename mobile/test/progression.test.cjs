'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const context=vm.createContext({console,setTimeout,clearTimeout,structuredClone,TextEncoder,TextDecoder});
vm.runInContext(fs.readFileSync(path.join(root,'mobile/android/app/build/generated/gameAssets/web/game.bundle.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'mobile/web/progression.js'),'utf8'),context);
const {Game}=context.MobileCore,Progression=context.MobileProgression;
const now=new Date('2026-10-16T06:00:00Z').getTime();
test('browser bundle runs the existing engine without Node globals',()=>{
  assert.equal(vm.runInContext('typeof require',context),'undefined');
  const g=new Game({},now,{random:()=>.53}),p=new Progression(g);p.resume(now);
  assert.equal(p.live(now),false);assert.equal(p.catchUp({steps:0,lockMillis:20000},now),1);assert.ok(g.data.battle);
  assert.equal(p.catchUp({steps:0,lockMillis:1000000},now),49);assert.ok(g.data.journal.length>0);assert.ok(g.panelState(now).collection.length===151);
  assert.ok(!JSON.stringify(g.data).includes('NaN'));
});
test('background time without steps never changes game or XP',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const before=JSON.stringify(g.data);assert.equal(p.live(now+3600000),false);assert.equal(p.catchUp(9,now+3600000),0);assert.equal(JSON.stringify(g.data),before);
});
test('legacy unspent steps never award actions after upgrade or reopening',()=>{
  const g=new Game({},now),p=new Progression(g,{consumed:1200,lockConsumed:10000});p.resume(now);
  const before=JSON.stringify(g.data);assert.equal(p.catchUp({steps:50000,lockMillis:29999},now),0);assert.equal(JSON.stringify(g.data),before);
  const q=new Progression(new Game(JSON.parse(before),now),p.checkpoint());
  assert.equal(q.catchUp({steps:100000,lockMillis:29999},now),0);assert.equal(q.consumed,1200);assert.equal(q.lockConsumed,10000);
  assert.equal(q.catchUp({steps:100000,lockMillis:30000},now),1);assert.equal(q.lockConsumed,30000);
});
test('ten or many recorded steps cannot start battles or grant XP',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);const before=JSON.stringify(g.data);
  for(const steps of [9,10,19,20,50000]){assert.equal(p.live(now,{steps}),false);assert.equal(p.catchUp({steps,lockMillis:0},now),0);}
  assert.equal(JSON.stringify(g.data),before);assert.equal(p.lockConsumed,0);
});
test('twenty-second lock actions retain the raw time remainder and do not replay',()=>{
  const g=new Game({},now),p=new Progression(g,{consumed:1200,lockConsumed:10000});
  assert.equal(p.catchUp({steps:1234,lockMillis:29999},now),0);assert.equal(p.catchUp({steps:1240,lockMillis:30000},now),1);
  const resumed=new Progression(new Game(JSON.parse(JSON.stringify(g.data)),now),p.checkpoint());
  assert.equal(resumed.catchUp({steps:50000,lockMillis:49999},now),0);assert.equal(resumed.catchUp({steps:50000,lockMillis:50000},now),1);
});
test('pause preserves battle pacing without adding hours after offline catchup',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const next=now+3600000;p.resume(next);p.catchUp({steps:100,lockMillis:200000},next);
  assert.ok(g.nextTick-next<60000);assert.ok(g.data.switchUntil-next<60000);assert.equal(p.pausedAt,0);
});
for(const inBattle of [false,true])test('reopening a legacy paused save does not wait through the offline interval again: battle='+inBattle,()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);if(inBattle)p.live(now);p.pause(now+1000);
  const reopened=now+3600000,g2=new Game(JSON.parse(JSON.stringify(g.data)),reopened),p2=new Progression(g2,{consumed:0,pausedAt:p.pausedAt});p2.resume(reopened);
  assert.ok(g2.nextTick<=reopened);assert.ok(g2.data.switchUntil-reopened<10000);
  assert.equal(p2.live(reopened+10000),false);assert.equal(p2.catchUp({steps:0,lockMillis:20000},reopened+10000),1);assert.ok(g2.data.battle);
});
test('new paused saves preserve only the remaining action delay after a cold restart',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);g.nextTick=now+4500;p.pause(now+1000);
  const reopened=now+3600000,g2=new Game(JSON.parse(JSON.stringify(g.data)),reopened),p2=new Progression(g2,p.checkpoint());p2.resume(reopened);
  assert.equal(g2.nextTick,reopened+3500);assert.equal(p2.live(reopened),false);assert.equal(p2.live(reopened+3500),false);
  assert.equal(p2.catchUp({steps:0,lockMillis:20000},reopened+3500),1);
});
test('trainer battles also stop without foreground play or steps',()=>{
  const g=new Game({},now),p=new Progression(g);g.challenge(0,now);const before=JSON.stringify(g.data);
  assert.equal(p.live(now+50000),false);assert.equal(p.catchUp(0,now+50000),0);assert.equal(JSON.stringify(g.data),before);
});
test('invalid sensor totals cannot award actions',()=>{
  const g=new Game({},now),p=new Progression(g,{consumed:1000});for(const n of [-1,NaN,Infinity,999,12.5])assert.equal(p.catchUp(n,now),0);
});
test('offline processing never creates future events or advances the season early',()=>{
  const edge=new Date('2026-10-31T14:59:59Z').getTime(),g=new Game({},edge,{random:()=>.4}),p=new Progression(g);p.resume(edge);
  assert.equal(p.catchUp({steps:50000,lockMillis:10000000},edge,500),500);
  assert.equal(g.data.season.key,'2026-10');assert.ok(g.data.journal.every(e=>e.at<=edge));
});
// Mobile map-distance regressions run against this same bundle in map-travel.test.cjs.
