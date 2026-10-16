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
  assert.equal(p.live(now),true);assert.ok(g.data.battle);let changed=0;
  for(let i=0;i<100;i++)if(p.live(now+i*15000))changed++;
  assert.ok(changed>10);assert.ok(g.data.journal.length>0);assert.ok(g.panelState(now).collection.length===151);
  assert.ok(!JSON.stringify(g.data).includes('NaN'));
});
test('background time without steps never changes game or XP',()=>{
  const g=new Game({},now),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const before=JSON.stringify(g.data);assert.equal(p.live(now+3600000),false);assert.equal(p.catchUp(99,now+3600000),0);assert.equal(JSON.stringify(g.data),before);
});
test('recorded steps are paid once across saves, reopening, and update',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);
  assert.equal(p.catchUp(1234,now),12);assert.equal(p.consumed,1200);assert.equal(p.catchUp(1234,now),0);
  const g2=new Game(JSON.parse(JSON.stringify(g.data)),now+1000),p2=new Progression(g2,JSON.parse(JSON.stringify(p.checkpoint())));
  assert.equal(p2.catchUp(1234,now+1000),0);assert.equal(p2.catchUp(1300,now+1000),1);assert.equal(p2.consumed,1300);
});
test('pause preserves battle pacing without adding hours after offline catchup',()=>{
  const g=new Game({},now,{random:()=>.4}),p=new Progression(g);p.resume(now);p.live(now);p.pause(now+1000);
  const next=now+3600000;p.resume(next);p.catchUp(1000,next);
  assert.ok(g.nextTick-next<60000);assert.ok(g.data.switchUntil-next<60000);assert.equal(p.pausedAt,0);
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
