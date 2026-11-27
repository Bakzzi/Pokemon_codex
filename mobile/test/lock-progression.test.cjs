'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../../desktop/game.cjs'),{Android:Adventure}=require('../../desktop/test/helpers/story-fixture.cjs'),Progression=require('../web/progression.js');
globalThis.MobileCore={nursery:require('../../desktop/daycare.cjs')};
const now=Date.parse('2026-10-18T06:00:00Z');
const gameplay=g=>JSON.stringify({...g.data,mapTravel:undefined});
function fixture(){const g=new Adventure(new Game({},now).data,now,{random:()=>.7}),p=new Progression(g);p.resume(now);p.dirty=false;return {g,p};}
const usage=n=>({touches:0,usageActive:true,usageMillis:n});
test('saved tutorials explain phone use without skipping the current page',()=>{
 const old=new Adventure({},now);old.presentation().pages[2]='폰을 잠그면 20초마다 동료와 모험한단다. 걸음은 타운맵에서 이동할 때 사용하지. 도전 배틀은 직접 지켜볼 수 있어.';old.presentation().index=2;
 const next=new Adventure(structuredClone(old.data),now+1000);assert.equal(next.presentation().index,2);assert.match(next.presentation().pages[2],/폰을 사용하는 동안 20초마다/);
});
test('a saved Safari introduction updates its old lock-only guidance without confirming it',()=>{
 const {g}=fixture();g.dialogue('safari','안내원','scientist',['폰을 잠근 동안 탐험하고 돌아오면 어떤 동료를 만났는지 살펴보렴. 몬스터볼 30개로 다녀올 수 있어.'],'safari-depart',now);
 const h=new Adventure(structuredClone(g.data),now+1000);assert.equal(h.presentation().index,0);assert.match(h.presentation().pages[0],/폰을 사용하는 동안/);assert.equal(h.data.mobileStory.safari.trip,null);
});
test('foreground ordinary adventure uses recorded phone time independently of touches',()=>{
 const {g,p}=fixture();assert.equal(p.live(now,{...usage(0),touches:10000}),true);p.dirty=false;const before=gameplay(g);
 assert.equal(p.live(now+60000,usage(19999)),false);assert.equal(gameplay(g),before);
 assert.equal(p.live(now+60001,usage(20000)),true);assert.ok(g.data.battle);assert.equal(p.usageConsumed,20000);
});
test('other apps earn the same twenty-second actions and partial time survives reload',()=>{
 const {g,p}=fixture();p.pause(now);assert.equal(p.catchUp(usage(59999),now),2);assert.equal(p.usageConsumed,40000);
 const q=new Progression(new Adventure(structuredClone(g.data),now),p.checkpoint());
 assert.equal(q.catchUp(usage(59999),now),0);assert.equal(q.catchUp(usage(60000),now),1);assert.equal(q.usageConsumed,60000);
});
test('a locked phone never spends previously banked usage or legacy lock balances',()=>{
 const {g,p}=fixture();p.pause(now);const before=gameplay(g);
 for(const total of [{touches:0,lockMillis:99999999},{...usage(100000),usageActive:false}])assert.equal(p.catchUp(total,now+100000),0);
 assert.equal(gameplay(g),before);assert.equal(p.usageConsumed,0);
 const old=new Progression(g,{lockConsumed:10000,consumed:1000});
 assert.equal(old.catchUp({touches:100000,lockMillis:99999999},now),0);assert.equal(old.usageConsumed,0);assert.equal(old.lockConsumed,10000);
});
test('invalid usage counters and unobserved time cannot create actions',()=>{
 const {g,p}=fixture(),before=gameplay(g);for(const n of [undefined,-1,NaN,Infinity,19999,20000.1])assert.equal(p.catchUp(usage(n),now+100000),0);
 assert.equal(gameplay(g),before);
});
test('started challenges continue in other apps, stop when locked and keep manual dialogue',()=>{
 const {g,p}=fixture();assert.ok(g.challenge(0,now));p.pause(now);
 const scene=structuredClone(g.presentation());p.catchUp(usage(1000),now+1000);assert.deepEqual(g.presentation().pages,scene.pages);assert.equal(g.presentation().index,scene.index);
 while(g.presentation()?.mode==='dialogue'){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+1000);}
 p.catchUp(usage(11000),now+11000);assert.equal(p.dirty,true);const before=JSON.stringify(g.data.battle);
 p.dirty=false;p.catchUp({...usage(11000),usageActive:false},now+100000);assert.equal(JSON.stringify(g.data.battle),before);assert.equal(p.usageConsumed,0);
 p.catchUp(usage(10001),now+100001);assert.equal(p.usageConsumed,0);
});
test('locked time freezes a challenge timer through background save and reopen',()=>{
 const {g,p}=fixture();g.newWild(now);p.pause(now);p.observe(usage(0),now);
 const due=g.nextTick,saved=p.checkpoint();
 const q=new Progression(new Adventure(structuredClone(g.data),now+100000),{...saved,pausedAt:now});
 q.catchUp({...usage(0),usageActive:false},now+100000);assert.equal(q.game.nextTick,due+100000);
 const r=new Progression(new Adventure(structuredClone(q.game.data),now+110000),{...q.checkpoint(),pausedAt:now+100000});
 r.observe(usage(0),now+110000);assert.equal(r.game.nextTick,due+110000);
});
test('Safari uses phone time and never walking or locked time',()=>{
 const {g,p}=fixture();p.pause(now);let walked=0;g.activityStep=()=>{walked++;return true;};
 assert.equal(p.catchUp(usage(20000),now),1);assert.equal(walked,1);
 assert.equal(p.catchUp({...usage(40000),usageActive:false,touches:10000},now),0);assert.equal(walked,1);
});
