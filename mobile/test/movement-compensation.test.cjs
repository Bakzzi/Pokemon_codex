'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({});
for(const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const A=c.MobileCore.Adventure,P=c.MobileProgression,now=Date.parse('2026-10-25T06:00:00Z'),plain=x=>JSON.parse(JSON.stringify(x));
test('movement compensation adds one banked cell while preserving an active trip, battle and walking remainder',()=>{
 const g=new A(new c.MobileCore.Game({},now).data,now);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;
 g.requestAction('travel',{location:'route-1',position:{x:44,y:92}},now);g.newWild(now);g.data.mapTravel={observed:54321,credit:321,bank:4567,dailyAt:now-1234};const before=plain(g.data),p=new P(g,{consumed:123,lockConsumed:40000});
 assert.ok(p.claimMovementFixReward(now));assert.equal(g.data.mapTravel.bank,6567);assert.equal(g.data.mapTravel.credit,321);assert.equal(g.data.mapTravel.observed,54321);assert.equal(g.data.mapTravel.dailyAt,now-1234);
 for(const key of ['battle','kantoWorld','owned','caught','badges','pendingActions'])assert.deepEqual(plain(g.data[key]),before[key]);assert.equal(p.lockConsumed,40000);assert.equal(p.consumed,123);
 assert.equal(p.claimMovementFixReward(now+1000),false);assert.equal(g.data.mapTravel.bank,6567);assert.equal(p.checkpoint().movementFixRewardClaimed,true);
});
test('background round trips and monthly reset preserve the one-time receipt independently of the daily grant',()=>{
 const g=new A({},now),p=new P(g);p.resume(now);p.observe({steps:10});p.claimMovementFixReward(now);
 const r=JSON.parse(c.MobileBackground.run(JSON.stringify({format:1,game:g.data,mobile:p.checkpoint()}),{steps:11,lockMillis:0},now+1000,0));assert.ok(r.changed);assert.equal(r.save.mobile.movementFixRewardClaimed,true);assert.equal(r.save.game.mapTravel.bank,2001);
 const h=new A(r.save.game,now+1000),q=new P(h,r.save.mobile);assert.equal(q.claimMovementFixReward(now+1000),false);h.resetSeason(now+2000);assert.equal(q.claimMovementFixReward(now+2000),false);assert.equal(h.data.mapTravel.bank,2001);
 h.recordTravelTime(now+86400000);assert.equal(h.data.mapTravel.bank,4001);const loaded=new P(new A(plain(h.data),now+86400000),plain(q.checkpoint()));assert.equal(loaded.claimMovementFixReward(now+86400000),false);
});
test('compensation rejects invalid clocks and never grants PC a mobile resource',()=>{
 const g=new A({},now),p=new P(g);for(const t of [-1,1.5,NaN,Infinity])assert.equal(p.claimMovementFixReward(t),false);assert.equal(g.data.mapTravel,undefined);
 const PC=require('../../desktop/adventure.cjs').Adventure,pc=new PC({},now),q=new P(pc);assert.equal(q.claimMovementFixReward(now),false);assert.equal(pc.data.mapTravel,undefined);
});
