'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console,structuredClone,TextEncoder,TextDecoder});
for(const f of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const A=c.MobileCore.Adventure,P=c.MobileProgression,K=require('../../shared/kanto-journey.cjs'),now=Date.parse('2026-10-25T07:00:00Z'),plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){const g=new A({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.switchUntil=0;g.nextTick=now;g.rivalProgress('rival-brock').state='won';for(const id of K.cases.find(x=>x.id==='forest-path').entries)g.data.kantoStory.cleared[id]=now;g.data.kantoWorld.location='viridian';g.data.kantoWorld.position={x:44,y:84};const p=new P(g);p.resume(now);p.observe({steps:0});return {g,p};}
const at=g=>Math.max(now,g.nextTick,g.data.switchUntil||0),balance=g=>(g.data.mapTravel?.bank||0)+(g.data.mapTravel?.credit||0);
test('independent movement ledger stays balanced through 120 retargets, duplicate taps, partial steps and reloads',()=>{
 let {g,p}=fixture();p.observe({steps:200000});let total=200000,spent=0,seed=917;
 const choices=['pallet','route-1','viridian','route-2','forest','pewter','route-22','route-3'];
 for(let turn=0;turn<120;turn++){
  seed=(seed*1664525+1013904223)>>>0;const destination=choices[seed%choices.length],beforeSelection=balance(g),beforePoint=plain(g.data.kantoWorld.position);
  assert.ok(g.requestAction('travel',destination,at(g)));assert.equal(balance(g),beforeSelection);assert.deepEqual(plain(g.data.kantoWorld.position),beforePoint);
  const requested=g.requestAction('travel-bank',null,at(g));if(requested)assert.equal(g.requestAction('travel-bank',null,at(g)),false);
  for(let n=0;n<3;n++){
   const before=plain(g.data.kantoWorld.position),funds=balance(g);g.controlTick(at(g));const after=g.data.kantoWorld.position,dist=Math.abs(before.x-after.x)+Math.abs(before.y-after.y);
   assert.ok(dist===0||dist===8,'movement changes only one adjacent cell');spent+=dist/8*2000;assert.equal(funds-balance(g),dist/8*2000,'only a physical cell consumes movement');assert.equal(balance(g),total-spent);
  }
  total+=733;p.observe({steps:total});assert.equal(balance(g),total-spent);
  const saved=plain(g.data),mobile=plain(p.checkpoint());g=new A(saved,at(g),{random:()=>.6});p=new P(g,mobile);p.observe({steps:total});p.observe({steps:total-1});assert.equal(balance(g),total-spent,'reload and repeated sensor totals do not debit or credit');assert.equal(p.lockConsumed,0);assert.equal(g.data.badges.length,0);
 }
 assert.ok(spent>20000);assert.equal(g.data.battle,null);
});
test('a banked blocked journey charges only four reachable cells and retains every excess unit',()=>{
 const {g,p}=fixture();p.observe({steps:15333});assert.ok(g.requestAction('travel','route-3',now));assert.ok(g.requestAction('travel-bank',null,now));p.catchUp({steps:15333,lockMillis:0},now,0);
 assert.equal(g.data.kantoWorld.location,'pewter');assert.equal(g.data.kantoWorld.blocked.checkpoint,'route-3');assert.equal(g.data.mapTravel.bank,7333);assert.equal(p.lockConsumed,0);assert.equal(g.data.battle,null);
 for(let i=0;i<5;i++)p.catchUp({steps:15333,lockMillis:0},now,0);assert.equal(g.data.mapTravel.bank,7333);assert.equal(g.requestAction('world-pass','route-3',now),false);assert.equal(g.data.mapTravel.bank,7333);
});
test('cancelling a queued paid journey returns partial walking credit and never spends the reserved bank',()=>{
 const {g,p}=fixture();p.observe({steps:5000});g.newWild(now);assert.ok(g.requestAction('travel','pewter',now));p.observe({steps:5777});assert.ok(g.requestAction('travel-bank',null,now));const id=g.data.pendingActions.find(a=>a.kind==='travel').id;assert.equal(balance(g),5777);
 assert.ok(g.cancelAction(id,now));assert.equal(g.data.mapTravel.bank,5777);assert.equal(g.data.mapTravel.credit,0);p.catchUp({steps:5777,lockMillis:0},now,0);assert.equal(g.data.mapTravel.bank,5777);assert.ok(g.data.battle);assert.equal(g.data.journal.some(e=>e.kind==='flee'),false);
});
test('bank travel reaches the surprise encounter once and background reload never spends remaining cells or advances its dialogue',()=>{
 const {g,p}=fixture();g.rivalProgress('rival-brock').state='unseen';p.observe({steps:7000});assert.ok(g.requestAction('travel',{location:'route-22',position:{x:28,y:84}},now));assert.ok(g.requestAction('travel-bank',null,now));
 let raw=JSON.stringify({game:plain(g.data),mobile:plain(p.checkpoint())}),r=JSON.parse(c.MobileBackground.run(raw,{steps:7000,lockMillis:900000},now,50));assert.ok(r.changed);assert.equal(r.used,0);assert.equal(r.save.game.mapTravel.bank,5000);assert.equal(r.save.game.battle.storyId,'rival-brock');const scene=plain(r.save.game.mobileStory.scene),position=plain(r.save.game.kantoWorld.position);
 for(let i=0;i<5;i++){raw=JSON.stringify(r.save);const next=JSON.parse(c.MobileBackground.run(raw,{steps:7000,lockMillis:900000},now,50));if(next.save)r=next;assert.equal(r.save.game.mapTravel.bank,5000);assert.deepEqual(plain(r.save.game.mobileStory.scene),scene);assert.deepEqual(plain(r.save.game.kantoWorld.position),position);assert.equal(r.save.mobile.lockConsumed,0);}
});
test('bank-funded regional crossing costs one unit without silently spending the remainder on another journey',()=>{
 const {g,p}=fixture();g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;g.data.johto.cleared['j-ship']=now;p.observe({steps:7000});
 assert.ok(g.requestAction('travel','j-k-vermilion',now));assert.ok(g.requestAction('travel-bank',null,now));p.catchUp({steps:7000,lockMillis:0},now,0);assert.equal(g.data.johtoWorld.location,'j-k-vermilion');assert.equal(g.data.mapTravel.bank,5000);
 assert.ok(g.requestAction('travel','j-newbark',at(g)));p.catchUp({steps:7000,lockMillis:0},at(g),0);assert.equal(g.data.johtoWorld.location,'j-k-vermilion');assert.equal(g.data.mapTravel.bank,5000);assert.ok(g.requestAction('travel-bank',null,at(g)));p.catchUp({steps:7000,lockMillis:0},at(g),0);assert.equal(g.data.johtoWorld.location,'j-newbark');assert.equal(g.data.mapTravel.bank,3000);assert.equal(p.lockConsumed,0);
});
