'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({});
for(const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const now=Date.parse('2026-10-17T05:00:00Z'),run=(save,total,at=now)=>JSON.parse(c.MobileBackground.run(JSON.stringify(save),typeof total==='number'?{steps:0,lockMillis:total*2000}:total,at));
// These lock-time regressions start with an existing, playable adventure.
const playable=()=>({format:1,game:new c.MobileCore.Game({},now).data,mobile:{consumed:0}});
test('headless engine uses no DOM or browser APIs and requires recorded lock time',()=>{
  assert.equal(vm.runInContext('typeof document',c),'undefined');assert.equal(vm.runInContext('typeof TextEncoder',c),'undefined');
  assert.equal(run(playable(),{steps:100000,lockMillis:0}).used,0);assert.equal(run(playable(),9).used,0);const r=run(playable(),10);assert.equal(r.used,1);assert.equal(r.save.mobile.lockConsumed,20000);assert.ok(r.save.game.battle);
});
test('headless lock rewards start at twenty seconds and persist their exact cursor without replaying it',()=>{
  const initial=playable();assert.equal(run(initial,{steps:0,lockMillis:19999}).used,0);
  let r=run(initial,{steps:0,lockMillis:20000});assert.equal(r.used,1);assert.equal(r.save.mobile.lockConsumed,20000);assert.equal(r.save.mobile.consumed,0);
  assert.equal(run(r.save,{steps:0,lockMillis:39999}).used,0);r=run(r.save,{steps:0,lockMillis:40000});assert.equal(r.used,1);assert.equal(r.save.mobile.lockConsumed,40000);assert.equal(run(r.save,{steps:0,lockMillis:40000}).used,0);
});
test('background checkpoints pay once, preserve remainders and resume without a long wait',()=>{
  let r=run(playable(),25);assert.equal(r.used,2);assert.equal(r.save.mobile.lockConsumed,40000);assert.equal(run(r.save,29).used,0);
  r=run(r.save,35,now+100000);assert.equal(r.used,1);assert.equal(r.save.mobile.lockConsumed,60000);
  const g=new c.MobileCore.Game(r.save.game,now+110000),p=new c.MobileProgression(g,r.save.mobile);p.resume(now+110000);assert.ok(g.nextTick-now-110000<10000);assert.ok(g.data.switchUntil-now-110000<10000);
});
test('background batches use current timestamps, preserve a UI change and never spend future lock time',()=>{
  let r=run(playable(),10000);assert.equal(r.used,32);assert.equal(r.save.mobile.lockConsumed,640000);r.save.game.fixtureMarker='latest UI';
  r=run(r.save,10000);assert.equal(r.save.game.fixtureMarker,'latest UI');assert.equal(r.save.mobile.lockConsumed,1280000);assert.ok(r.save.game.journal.every(e=>e.at<=now));
});
test('all six cleared positions survive headless actions and another background reload',()=>{
  for(let slot=0;slot<6;slot++){
    const g=new c.MobileCore.Game({},now),bulba=g.addPokemon(1,10,'fixture',now),ditto=g.addPokemon(132,10,'fixture',now),others=[25,...[19,16,21,23].map(id=>g.addPokemon(id,10,'fixture',now))];
    g.data.kantoWorld={location:'route-5'};
    g.data.slots=Array.from({length:6},(_,i)=>i===slot?bulba:others.shift());g.data.activeId=25;const expected=Array.from(g.data.slots);expected[slot]=null;
    assert.ok(g.requestAction('daycare-start',[bulba,ditto],now));assert.ok(g.requestAction('select',bulba,now));assert.ok(g.requestAction('slot',{slot,id:null},now));assert.ok(g.requestAction('daycare-withdraw',undefined,now));
    let result=run({format:1,game:g.data,mobile:{consumed:0}},40);assert.equal(result.used,4);assert.deepEqual(result.save.game.slots,expected);assert.ok(result.save.game.owned[bulba]);
    result=run(result.save,80,now+1000);assert.equal(result.used,4);assert.deepEqual(result.save.game.slots,expected);assert.equal(result.save.mobile.lockConsumed,160000);
  }
});
test('headless lock time starts a queued rival but never skips its dialogue or spends the remaining steps',()=>{
  const old=new c.MobileCore.Game({},now);old.data.badges=['brock','misty'];const g=new c.MobileCore.Adventure(old.data,now);g.data.pendingChallenge={index:2,queuedAt:now};
  const r=run({format:1,game:g.data,mobile:{consumed:0}},1000);assert.equal(r.used,1);assert.equal(r.save.game.battle.storyId,'rival-surge');assert.equal(r.save.game.mobileStory.scene.mode,'dialogue');assert.equal(r.save.mobile.lockConsumed,20000);
  assert.equal(run(r.save,1000,now+3600000).used,0);const reopened=new c.MobileCore.Adventure(r.save.game,now+3600000);assert.equal(reopened.presentation().index,0);assert.equal(reopened.data.battle.turn,0);
});
test('headless reload preserves the rescue namespace and triggers its rival before the first grunt',()=>{
  const old=new c.MobileCore.Game({},now);old.data.badges=['brock','misty','surge','erika'];const g=new c.MobileCore.Adventure(old.data,now);g.data.pendingChallenge={index:'tower-grunt-1',queuedAt:now};
  const r=run({format:1,game:g.data,mobile:{consumed:0}},1000);assert.equal(r.used,1);assert.equal(r.save.game.battle.storyId,'rival-middle');assert.equal(r.save.game.trainingDevice.fluteObtainedAt,null);assert.equal(run(r.save,1000,now+3600000).used,0);
});
test('background actions never claim an elder reward before the player advances the saved dialogue',()=>{
  const old=new c.MobileCore.Game({},now);old.data.badges=['brock','misty','surge','erika'];const g=new c.MobileCore.Adventure(old.data,now);g.data.mobileStory.rescue.wins=[now,now,now];g.data.mobileStory.rescue.rewardPending=true;g.dialogue('elder','보라타운 촌장','mr-fuji',['fixture'],'rescue-reward',now);
  const saved={format:1,game:g.data,mobile:{consumed:0}};assert.equal(run(saved,1000).used,0);const reopened=new c.MobileCore.Adventure(g.data,now+1000);assert.equal(reopened.data.trainingDevice.fluteObtainedAt,null);assert.equal(reopened.presentation().next,'rescue-reward');
});
test('headless company queue triggers its hidden rival after the grunt, without advancing dialogue',()=>{
  const old=new c.MobileCore.Game({},now);old.data.badges=['brock','misty','surge','erika','koga'];const g=new c.MobileCore.Adventure(old.data,now);g.data.mobileStory.silph.wins[0]=now;g.data.pendingChallenge={index:'silph-duo',queuedAt:now};
  const r=run({format:1,game:g.data,mobile:{consumed:0}},1000);assert.equal(r.used,1);assert.equal(r.save.game.battle.storyId,'rival-silph');assert.equal(r.save.game.mobileStory.silph.wins[1],0);assert.equal(run(r.save,1000,now+3600000).used,0);
});
test('headless eligibility opens the aide dialogue and preserves the reward until foreground input',()=>{
  const old=new c.MobileCore.Game({},now);old.data.badges=['brock','misty','surge','erika'];const g=new c.MobileCore.Adventure(old.data,now);for(let id=1;id<=50;id++)g.data.caught[id]=now;
  const r=run({format:1,game:g.data,mobile:{consumed:0}},1000);assert.equal(r.used,1);assert.equal(r.save.game.mobileStory.scene.next,'device-reward');assert.equal(r.save.game.trainingDevice.obtainedAt,null);assert.equal(run(r.save,1000,now+3600000).used,0);
});
