'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({});
for(const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const now=Date.parse('2026-10-17T05:00:00Z'),run=(save,total,at=now)=>JSON.parse(c.MobileBackground.run(JSON.stringify(save),total,at));
// These walking regressions start with an existing, playable adventure.
const playable=()=>({format:1,game:new c.MobileCore.Game({},now).data,mobile:{consumed:0}});
test('headless engine uses no DOM or browser APIs and requires ten recorded steps',()=>{
  assert.equal(vm.runInContext('typeof document',c),'undefined');assert.equal(vm.runInContext('typeof TextEncoder',c),'undefined');
  assert.equal(run(playable(),9).used,0);const r=run(playable(),10);assert.equal(r.used,1);assert.equal(r.save.mobile.consumed,10);assert.ok(r.save.game.battle);
});
test('background checkpoints pay once, preserve remainders and resume without a long wait',()=>{
  let r=run(playable(),25);assert.equal(r.used,2);assert.equal(r.save.mobile.consumed,20);assert.equal(run(r.save,29).used,0);
  r=run(r.save,35,now+100000);assert.equal(r.used,1);assert.equal(r.save.mobile.consumed,30);
  const g=new c.MobileCore.Game(r.save.game,now+110000),p=new c.MobileProgression(g,r.save.mobile);p.resume(now+110000);assert.ok(g.nextTick-now-110000<10000);assert.ok(g.data.switchUntil-now-110000<10000);
});
test('background batches use current timestamps, preserve a UI change and never spend future steps',()=>{
  let r=run(playable(),10000);assert.equal(r.used,32);assert.equal(r.save.mobile.consumed,320);r.save.game.fixtureMarker='latest UI';
  r=run(r.save,10000);assert.equal(r.save.game.fixtureMarker,'latest UI');assert.equal(r.save.mobile.consumed,640);assert.ok(r.save.game.journal.every(e=>e.at<=now));
});
test('all six cleared positions survive headless actions and another background reload',()=>{
  for(let slot=0;slot<6;slot++){
    const g=new c.MobileCore.Game({},now),bulba=g.addPokemon(1,10,'fixture',now),ditto=g.addPokemon(132,10,'fixture',now),others=[25,...[19,16,21,23].map(id=>g.addPokemon(id,10,'fixture',now))];
    g.data.slots=Array.from({length:6},(_,i)=>i===slot?bulba:others.shift());g.data.activeId=25;const expected=Array.from(g.data.slots);expected[slot]=null;
    assert.ok(g.requestAction('daycare-start',[bulba,ditto],now));assert.ok(g.requestAction('select',bulba,now));assert.ok(g.requestAction('slot',{slot,id:null},now));assert.ok(g.requestAction('daycare-withdraw',undefined,now));
    let result=run({format:1,game:g.data,mobile:{consumed:0}},40);assert.equal(result.used,4);assert.deepEqual(result.save.game.slots,expected);assert.ok(result.save.game.owned[bulba]);
    result=run(result.save,80,now+1000);assert.equal(result.used,4);assert.deepEqual(result.save.game.slots,expected);assert.equal(result.save.mobile.consumed,80);
  }
});
