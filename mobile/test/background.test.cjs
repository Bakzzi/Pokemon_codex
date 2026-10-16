'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({});
for(const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const now=Date.parse('2026-10-17T05:00:00Z'),run=(save,total,at=now)=>JSON.parse(c.MobileBackground.run(JSON.stringify(save),total,at));
test('headless engine uses no DOM or browser APIs and requires ten recorded steps',()=>{
  assert.equal(vm.runInContext('typeof document',c),'undefined');assert.equal(vm.runInContext('typeof TextEncoder',c),'undefined');
  assert.equal(run({},9).used,0);const r=run({},10);assert.equal(r.used,1);assert.equal(r.save.mobile.consumed,10);assert.ok(r.save.game.battle);
});
test('background checkpoints pay once, preserve remainders and resume without a long wait',()=>{
  let r=run({},25);assert.equal(r.used,2);assert.equal(r.save.mobile.consumed,20);assert.equal(run(r.save,29).used,0);
  r=run(r.save,35,now+100000);assert.equal(r.used,1);assert.equal(r.save.mobile.consumed,30);
  const g=new c.MobileCore.Game(r.save.game,now+110000),p=new c.MobileProgression(g,r.save.mobile);p.resume(now+110000);assert.ok(g.nextTick-now-110000<10000);assert.ok(g.data.switchUntil-now-110000<10000);
});
test('background batches use current timestamps, preserve a UI change and never spend future steps',()=>{
  let r=run({},10000);assert.equal(r.used,32);assert.equal(r.save.mobile.consumed,320);r.save.game.fixtureMarker='latest UI';
  r=run(r.save,10000);assert.equal(r.save.game.fixtureMarker,'latest UI');assert.equal(r.save.mobile.consumed,640);assert.ok(r.save.game.journal.every(e=>e.at<=now));
});
