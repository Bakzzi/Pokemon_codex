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
  assert.equal(p.live(now),false);assert.equal(p.catchUp({steps:0,lockMillis:10000},now),1);assert.ok(g.data.battle);
  assert.equal(p.catchUp({steps:0,lockMillis:1000000},now),99);assert.ok(g.data.journal.length>0);assert.ok(g.panelState(now).collection.length===151);
  assert.ok(!JSON.stringify(g.data).includes('NaN'));
});
test('background time without steps never changes game or XP',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const before=JSON.stringify(g.data);assert.equal(p.live(now+3600000),false);assert.equal(p.catchUp(9,now+3600000),0);assert.equal(JSON.stringify(g.data),before);
});
test('recorded steps are paid once across saves, reopening, and update',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);
  assert.equal(p.catchUp(34,now),3);assert.equal(p.consumed,30);assert.equal(p.catchUp(34,now),0);
  const g2=new Game(JSON.parse(JSON.stringify(g.data)),now+1000),p2=new Progression(g2,JSON.parse(JSON.stringify(p.checkpoint())));
  assert.equal(p2.catchUp(34,now+1000),0);assert.equal(p2.catchUp(40,now+1000),1);assert.equal(p2.consumed,40);
});
test('ten-step threshold keeps the remainder and does not replay paid actions',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g,{},require('../version.json').stepsPerAction);
  assert.equal(p.catchUp(9,now),0);assert.equal(p.catchUp(10,now),1);assert.equal(p.consumed,10);
  assert.equal(p.catchUp(19,now),0);assert.equal(p.catchUp(20,now),1);assert.equal(p.consumed,20);
  assert.equal(p.catchUp(20,now),0);
});
test('upgrading the rate preserves the old raw-step cursor without paying past steps again',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g,{consumed:1200,pausedAt:now});
  assert.equal(p.catchUp(1200,now),0);assert.equal(p.catchUp(1234,now),3);assert.equal(p.consumed,1230);
  const resumed=new Progression(new Game(JSON.parse(JSON.stringify(g.data)),now),p.checkpoint());
  assert.equal(resumed.catchUp(1234,now),0);assert.equal(resumed.catchUp(1240,now),1);assert.equal(resumed.consumed,1240);
});
test('pause preserves battle pacing without adding hours after offline catchup',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const next=now+3600000;p.resume(next);p.catchUp(100,next);
  assert.ok(g.nextTick-next<60000);assert.ok(g.data.switchUntil-next<60000);assert.equal(p.pausedAt,0);
});
for(const inBattle of [false,true])test('reopening a legacy paused save does not wait through the offline interval again: battle='+inBattle,()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);if(inBattle)p.live(now);p.pause(now+1000);
  const reopened=now+3600000,g2=new Game(JSON.parse(JSON.stringify(g.data)),reopened),p2=new Progression(g2,{consumed:0,pausedAt:p.pausedAt});p2.resume(reopened);
  assert.ok(g2.nextTick<=reopened);assert.ok(g2.data.switchUntil-reopened<10000);
  assert.equal(p2.live(reopened+10000),false);assert.equal(p2.catchUp({steps:0,lockMillis:10000},reopened+10000),1);assert.ok(g2.data.battle);
});
test('new paused saves preserve only the remaining action delay after a cold restart',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);g.nextTick=now+4500;p.pause(now+1000);
  const reopened=now+3600000,g2=new Game(JSON.parse(JSON.stringify(g.data)),reopened),p2=new Progression(g2,p.checkpoint());p2.resume(reopened);
  assert.equal(g2.nextTick,reopened+3500);assert.equal(p2.live(reopened),false);assert.equal(p2.live(reopened+3500),false);
  assert.equal(p2.catchUp({steps:0,lockMillis:10000},reopened+3500),1);
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
  assert.equal(p.catchUp(50000,edge,500),500);
  assert.equal(g.data.season.key,'2026-10');assert.ok(g.data.journal.every(e=>e.at<=edge));
});
test('map walking clocks pause with mobile presentation and do not spend foreground steps',()=>{
 const g=new context.MobileCore.Adventure({},now),p=new Progression(g);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;p.resume(now);
 assert.ok(g.requestAction('travel','forest',now));const duration=g.data.kantoWorld.walk.duration;p.pause(now+100);p.resume(now+10100);assert.equal(g.data.kantoWorld.walk.at,now+10000);assert.equal(g.data.switchUntil,now+10000+duration);assert.equal(p.live(now+10100,{steps:0}),false);assert.equal(p.consumed,0);
 assert.equal(p.live(now+11000,{steps:0}),false);assert.equal(p.consumed,0);assert.equal(g.data.battle,null);
});
test('offline map reservations and walking finish without consuming a walking action',()=>{
 const g=new context.MobileCore.Adventure({},now),p=new Progression(g);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=now+100;g.nextTick=now;
 assert.ok(g.requestAction('travel',{location:'route-1',position:{x:44,y:92}},now));assert.equal(g.data.pendingActions.length,1);assert.equal(p.catchUp(10,now+1000),1);assert.equal(p.consumed,10);assert.equal(g.data.pendingActions.length,0);assert.equal(g.data.battle.location,'route-1');assert.equal(g.data.kantoWorld.walk.at+g.data.kantoWorld.walk.duration<=now+1000,true);
});

test('offline road departures use the saved random encounter quota and never charge movement as a walking action',()=>{
 const g=new context.MobileCore.Adventure({},now),p=new Progression(g);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;
 assert.ok(g.requestAction('travel','pewter',now));const quota=g.panelState(now).kantoWorld.roadProgress.required;for(let i=0;i<quota-1;i++)g.onWildEnd({kind:'wild',location:'route-1'},now);
 assert.equal(p.catchUp(10,now+10000,1),1);assert.equal(g.data.battle.location,'route-1');assert.equal(p.consumed,10);assert.equal(g.data.kantoWorld.roadProgress.completed,quota-1);
 g.data.battle.foe.hp=0;g.showFaint(now+10000);g.tick(g.data.switchUntil);assert.equal(g.data.kantoWorld.roadProgress.completed,quota);
 assert.equal(p.catchUp(20,now+20000,1),1);assert.equal(p.consumed,20);assert.equal(g.data.battle.location,'route-2');assert.equal(g.data.kantoWorld.roadProgress.completed,0);assert.equal(g.data.pendingChallenge,null);
});
