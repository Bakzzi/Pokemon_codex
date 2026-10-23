'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({});
for(const f of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const A=c.MobileCore.Adventure,P=c.MobileProgression,day=86400000,now=Date.parse('2026-10-23T14:30:00Z'),plain=x=>JSON.parse(JSON.stringify(x));
const make=()=>{const g=new A({},now),p=new P(g);p.resume(now);p.dirty=false;return {g,p};};
const run=(game,at)=>JSON.parse(c.MobileBackground.run(JSON.stringify({format:1,game,mobile:{}}),{steps:0,lockMillis:0},at,0));
test('daily movement uses elapsed 24 hours, adds walking resources and preserves sub-day remainder',()=>{
 const {g,p}=make();p.observe({steps:10000});p.observe({steps:13000});assert.equal(g.data.mapTravel.bank,3000);p.dirty=false;
 p.live(now+day-1);assert.equal(g.data.mapTravel.bank,3000);assert.equal(p.dirty,false);
 p.live(now+day);assert.equal(g.data.mapTravel.bank,5000);assert.equal(g.data.mapTravel.dailyAt,now+day);assert.ok(p.dirty);
 p.dirty=false;p.catchUp({steps:13000,lockMillis:0},now+3*day+1000,0);assert.equal(g.data.mapTravel.bank,9000);assert.equal(g.data.mapTravel.dailyAt,now+3*day);
 p.dirty=false;p.live(now+3*day+1000);assert.equal(g.data.mapTravel.bank,9000);assert.equal(p.dirty,false);assert.equal(p.lockConsumed,0);
});
test('upgrade starts a new clock and never grants old save age or historical sensor steps',()=>{
 const g=new A({},now);g.data.mapTravel={observed:10000,credit:345,bank:4567};const p=new P(g);p.resume(now+100*day);
 assert.equal(g.data.mapTravel.bank,4567);assert.equal(g.data.mapTravel.credit,345);assert.equal(g.data.mapTravel.dailyAt,now+100*day);
 p.observe({steps:10000});assert.equal(g.data.mapTravel.dailyAt,now+100*day);assert.equal(g.data.mapTravel.bank,4912,'unused walking remainder is banked as before');p.live(now+101*day);assert.equal(g.data.mapTravel.bank,6912);
});
test('headless grant saves atomically without battle actions and cannot replay after reload',()=>{
 const {g}=make(),scene=plain(g.presentation());let r=run(plain(g.data),now+2*day+1234);
 assert.equal(r.used,0);assert.equal(r.changed,true);assert.equal(r.save.game.mapTravel.bank,4000);assert.deepEqual(r.save.game.mobileStory.scene,scene);assert.equal(r.save.mobile.lockConsumed,0);
 assert.deepEqual(run(r.save.game,now+2*day+1234),{used:0});
 const restored=new A(r.save.game,now+3*day-1),p=new P(restored,r.save.mobile);p.resume(now+3*day-1);assert.equal(restored.data.mapTravel.bank,4000);p.live(now+3*day);assert.equal(restored.data.mapTravel.bank,6000);
});
test('clock rollback and invalid timestamps neither pay twice nor erase the original interval',()=>{
 const {g,p}=make();p.live(now+day);p.dirty=false;
 for(const t of [now,now+day-1,-1,NaN,Infinity,1.5]){g.recordTravelTime(t);assert.equal(g.data.mapTravel.bank,2000);assert.equal(g.data.mapTravel.dailyAt,now+day);}
 p.live(now+2*day);assert.equal(g.data.mapTravel.bank,4000);
});
test('daily bank survives month and region changes, while a full new game starts over',()=>{
 const {g,p}=make();p.live(now+day);const account=plain(g.data.mapTravel);g.resetSeason(now+2*day);assert.deepEqual(plain(g.data.mapTravel),account);
 p.live(now+2*day);assert.equal(g.data.mapTravel.bank,4000);g.data.johtoUnlocked=true;p.live(now+3*day);assert.equal(g.data.mapTravel.bank,6000);
 const fresh=new A({},now+3*day),q=new P(fresh);q.resume(now+3*day);assert.equal(fresh.data.mapTravel.bank,0);assert.equal(fresh.data.mapTravel.dailyAt,now+3*day);
});
test('grant is banked while a destination is selected and only explicit bank use moves the map',()=>{
 const g=new A(new c.MobileCore.Game({},now).data,now),p=new P(g);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.battle=null;g.data.switchUntil=0;g.nextTick=now;p.resume(now);p.observe({steps:0});
 const start=plain(g.panelState(now).kantoWorld.position);g.data.kantoWorld.position={...start};assert.ok(g.requestAction('travel',{location:'route-1',position:{x:44,y:92}},now));
 p.catchUp({steps:0,lockMillis:0},now+day,0);assert.deepEqual(plain(g.data.kantoWorld.position),start);assert.equal(g.data.mapTravel.credit,0);assert.equal(g.data.mapTravel.bank,2000);
 assert.ok(g.requestAction('travel-bank',undefined,now+day));p.catchUp({steps:0,lockMillis:0},now+day,0);assert.equal(g.data.mapTravel.bank,0);assert.notDeepEqual(plain(g.data.kantoWorld.position),start);assert.equal(p.lockConsumed,0);
});
test('PC does not accrue time-based movement resources',()=>{
 const PC=require('../../desktop/adventure.cjs').Adventure,g=new PC({},now);assert.equal(g.recordTravelTime(now),false);assert.equal(g.recordTravelTime(now+day),false);assert.equal(g.data.mapTravel,undefined);
});
