'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console,structuredClone,TextEncoder,TextDecoder});
for(const f of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const A=c.MobileCore.Adventure,P=c.MobileProgression,now=Date.parse('2026-10-22T06:00:00Z'),plain=x=>JSON.parse(JSON.stringify(x));
function ready(saved){const g=new A(saved||new c.MobileCore.Game({},now).data,now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;const p=new P(g);p.resume(now);p.observe({steps:10000});return {g,p};}
const world=g=>g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
const view=g=>{const s=g.panelState(now);return g.data.johtoUnlocked?s.johtoWorld:s.kantoWorld;};
const here=g=>plain(view(g).position),next={x:44,y:92};
const choose=(g)=>g.requestAction('travel',{location:'route-1',position:next},now);
const settle=g=>{const t=Math.max(now,g.nextTick,g.data.switchUntil||0);return g.controlTick(t);};
test('mobile advances exactly one adjacent cell for each 2,000 new steps, with no historical distance',()=>{
 const {g,p}=ready(),start=here(g);assert.ok(choose(g));assert.deepEqual(here(g),start);assert.equal(world(g).walk,null);assert.equal(view(g).roadProgress,null);
 p.observe({steps:11999});assert.equal(g.advanceTravel(now),false);assert.deepEqual(here(g),start);assert.equal(view(g).stepProgress.completed,1999);
 p.observe({steps:12000});assert.equal(g.advanceTravel(now),true);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.credit,0);assert.ok(world(g).walk.stepTravel);assert.equal(Math.abs(start.x-next.x)+Math.abs(start.y-next.y),8);
 assert.ok(settle(g));assert.equal(world(g).journey,null);assert.equal(p.consumed,0);assert.equal(p.lockConsumed,0);
});
test('lock time, calendar time and repeated wild results never buy mobile map distance',()=>{
 const {g,p}=ready(),start=here(g);choose(g);for(let i=0;i<100;i++)g.onWildEnd({kind:'wild',location:'route-1'},now);
 assert.equal(g.advanceTravel(now+3600000),false);assert.deepEqual(here(g),start);
 p.consumed=10000;assert.ok(p.catchUp({steps:10000,lockMillis:100000},now+1000,10)>0);assert.deepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,0);assert.ok(p.lockConsumed>0);
});
test('partial distance survives saving, reopening and retargeting; stale or invalid totals cannot replay steps',()=>{
 let {g,p}=ready();choose(g);p.observe({steps:11234});const saved=plain(g.data),mobile=plain(p.checkpoint());g=new A(saved,now,{random:()=>.6});p=new P(g,mobile);
 const start=here(g);for(const steps of [11000,11234,-1,NaN,Infinity,11234.5])p.observe({steps});assert.equal(g.data.mapTravel.credit,1234);
 assert.ok(g.requestAction('travel','pewter',now));assert.equal(g.data.mapTravel.credit,1234);p.observe({steps:12000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,0);
});
test('steps fill distance during a battle but movement waits for the actual knockout and result',()=>{
 const {g,p}=ready();g.newWild(now);const battle=g.data.battle,start=here(g);assert.ok(choose(g));p.observe({steps:12000});assert.equal(g.data.mapTravel.credit,2000);assert.equal(g.advanceTravel(now+100000),false);assert.equal(g.data.battle,battle);assert.deepEqual(here(g),start);
 battle.foe.hp=0;g.showFaint(now);assert.equal(g.advanceTravel(now),false);assert.deepEqual(here(g),start);
 g.tick(Math.max(g.nextTick,g.data.switchUntil));assert.equal(g.data.battle,null);for(let i=0;i<3&&here(g).y!==next.y;i++)settle(g);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.credit,0);
});
test('headless processing commits the last map step even with no battle action available and never advances dialogue',()=>{
 const {g,p}=ready();choose(g);p.observe({steps:11999});g.dialogue('fixture','fixture','oak',['fixture'],'fixture',now);const before=here(g);
 const saved={format:1,game:plain(g.data),mobile:{...plain(p.checkpoint()),consumed:12000}};
 const r=JSON.parse(c.MobileBackground.run(JSON.stringify(saved),{steps:12000,lockMillis:0},now));assert.equal(r.used,0);assert.equal(r.changed,true);assert.equal(r.save.game.mapTravel.credit,2000);assert.equal(r.save.game.mobileStory.scene.index,0);assert.deepEqual(plain(r.save.game.kantoWorld.position||before),before);
 const restored=new A(r.save.game,now),resume=new P(restored,r.save.mobile);restored.data.mobileStory.scene=null;restored.nextTick=now;restored.data.switchUntil=0;assert.equal(resume.catchUp({steps:12000,lockMillis:0},now),0);assert.deepEqual(here(restored),next);assert.equal(restored.data.mapTravel.credit,0);
});
test('background distance crosses only paid cells, preserves a remainder and does not spend battle steps twice',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel','pewter',now));const before=plain(world(g).journey.segments),start=here(g);
 assert.equal(p.catchUp({steps:15001,lockMillis:0},now,0),0);assert.equal(p.consumed,0);assert.equal(world(g).journey.index,2);assert.deepEqual(here(g),plain(before[1].path.at(-1)));assert.notDeepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,1001);
 assert.equal(p.catchUp({steps:15001,lockMillis:0},now,0),0);assert.equal(world(g).journey.index,2);assert.equal(g.data.mapTravel.credit,1001);
});
test('arrival, idle walking and cancellation preserve surplus distance in a separately usable bank',()=>{
 const {g,p}=ready();choose(g);assert.equal(p.catchUp({steps:20000},now,0),0);assert.equal(world(g).journey,null);assert.equal(g.data.mapTravel.credit,0);
 assert.equal(g.data.mapTravel.bank,8000);p.observe({steps:25000});assert.equal(g.data.mapTravel.bank,13000);
 assert.ok(g.requestAction('travel','pewter',now));assert.equal(g.data.mapTravel.credit,0);assert.equal(g.data.mapTravel.observed,25000);assert.equal(g.advanceTravel(now),false);
 assert.ok(g.requestAction('travel-bank',undefined,now));assert.ok(g.advanceTravel(now));assert.equal(g.data.mapTravel.bank,11000);assert.equal(p.lockConsumed,0);
 const h=ready();h.g.newWild(now);choose(h.g);h.p.observe({steps:11000});assert.equal(h.g.data.mapTravel.credit,1000);h.g.cancelAction(h.g.data.pendingActions[0].id,now);h.p.observe({steps:12000});assert.equal(h.g.data.mapTravel.credit,0);assert.equal(h.g.data.mapTravel.bank,2000);
});
test('gates stop the paid journey without starting a challenge, then passage also requires recorded steps',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel','route-3',now));assert.equal(p.catchUp({steps:300000},now,0),0);assert.equal(world(g).journey,null);assert.equal(world(g).location,'pewter');assert.equal(world(g).blocked.checkpoint,'route-3');assert.equal(g.data.battle,null);assert.equal(g.data.pendingChallenge,null);
 g.data.badges=['brock'];assert.ok(g.requestAction('world-pass','route-3',now));const start=here(g);assert.equal(g.advanceTravel(now),false);p.observe({steps:302000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
});
test('Johto uses the same 2,000-step cells and regional crossings do not relocate on selection',()=>{
 const {g,p}=ready();g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));g.data.switchUntil=0;g.nextTick=now;g.data.mobileStory.scene=null;
 const start=here(g);assert.ok(g.requestAction('travel','j-violet',now));assert.deepEqual(here(g),start);p.observe({steps:12000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
 g.data.johto.cleared['j-ship']=now;g.data.johtoWorld.journey=null;g.data.switchUntil=0;g.nextTick=now;g.data.mapTravel.credit=0;const previous=world(g).location;
 assert.ok(g.requestAction('travel','j-k-vermilion',now));assert.equal(world(g).location,previous);p.observe({steps:14000});assert.ok(g.advanceTravel(now));assert.equal(world(g).location,'j-k-vermilion');
});
test('old encounter-based itineraries keep the current place and destination but require new steps for remaining cells',()=>{
 const PC=require('../../desktop/adventure.cjs').Adventure,pc=require('../../desktop/test/helpers/kanto-fixture.cjs').existing(PC,now,{random:()=>.6});pc.data.mobileStory.onboarding='done';pc.data.mobileStory.scene=null;pc.data.switchUntil=0;pc.nextTick=now;pc.requestAction('travel','pewter',now);
 const {g,p}=ready(plain(pc.data)),start=here(g);g.data.switchUntil=0;g.nextTick=now;assert.ok(settle(g)===false);assert.equal(world(g).journey.mode,'steps');assert.deepEqual(here(g),start);assert.equal(world(g).journey.destination,'pewter');assert.equal(g.data.mapTravel?.credit||0,0);
 p.observe({steps:12000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
});
test('ten thousand steps without a destination bank five moves; replays, reload and season changes retain them',()=>{
 let {g,p}=ready();p.observe({steps:20000});assert.equal(view(g).movement.count,5);assert.equal(g.data.mapTravel.credit,0);assert.equal(g.data.battle,null);
 const r=JSON.parse(c.MobileBackground.run(JSON.stringify({game:plain(g.data),mobile:plain(p.checkpoint())}),{steps:21345,lockMillis:0},now));
 assert.equal(r.used,0);assert.equal(r.save.game.mapTravel.bank,11345);g=new A(r.save.game,now);p=new P(g,r.save.mobile);
 p.observe({steps:21345});p.observe({steps:20000});assert.equal(g.data.mapTravel.bank,11345);g.resetSeason(now);assert.equal(g.data.mapTravel.bank,11345);assert.equal(g.data.mapTravel.observed,21345);
 const cold=new A(plain(g.data),Date.parse('2026-11-01T06:00:00Z'));assert.equal(cold.data.mapTravel.bank,11345);assert.equal(cold.data.mapTravel.observed,21345);
});
test('a planned 4,000-step journey banks the extra 3,000 steps, without automatically spending them on the next path',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel',{location:'viridian',position:{x:44,y:84}},now));assert.equal(world(g).journey.segments.length,2);
 p.catchUp({steps:17000,lockMillis:0},now,0);assert.equal(world(g).journey,null);assert.equal(g.data.mapTravel.bank,3000);assert.equal(view(g).movement.count,1);assert.equal(view(g).movement.remainder,1000);
 g.requestAction('travel','pewter',Math.max(now,g.nextTick));assert.equal(g.advanceTravel(Math.max(now,g.nextTick)),false);assert.equal(g.data.mapTravel.bank,3000);
});
test('bank use survives a queued journey and reload, waits for the current wild result, and never double charges a cell',()=>{
 let {g,p}=ready();p.observe({steps:20000});g.newWild(now);const battle=g.data.battle;choose(g);assert.ok(g.requestAction('travel-bank',undefined,now));assert.ok(g.data.pendingActions[0].useBank);
 g=new A(plain(g.data),now);p=new P(g);assert.ok(g.data.pendingActions[0].useBank);const start=here(g);p.catchUp({steps:20000,lockMillis:0},now,0);assert.deepEqual(here(g),start);assert.equal(g.data.mapTravel.bank,10000);
 g.data.battle.foe.hp=0;g.showFaint(now);g.tick(Math.max(g.nextTick,g.data.switchUntil));for(let i=0;i<3&&g.data.pendingActions.length;i++)settle(g);
 p.catchUp({steps:20000,lockMillis:0},Math.max(now,g.nextTick),0);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.bank,8000);const saved=plain(g.data);
 g=new A(saved,now);p=new P(g);p.catchUp({steps:20000,lockMillis:0},Math.max(now,g.nextTick),0);assert.equal(g.data.mapTravel.bank,8000);assert.equal(g.data.battle,null);assert.equal(p.lockConsumed,0);assert.equal(battle.kind,'wild');
});
function forest(){
 const g=new A({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.rivalProgress('rival-brock').state='won';
 g.data.kantoWorld.location='viridian';g.data.kantoWorld.position={...g.panelState(now).kantoWorld.map.points.viridian};g.gainXp(25,1000000,now);g.data.switchUntil=0;g.nextTick=now;
 const p=new P(g);p.observe({steps:0});p.observe({steps:40000});assert.ok(g.requestAction('travel','forest',now));assert.ok(g.requestAction('travel-bank',undefined,now));return {g,p};
}
test('bank travel completes every ordinary forest trainer without wild encounters, lock actions, duplicate trainers or extra distance charges',()=>{
 const {g,p}=forest(),K=require('../../shared/kanto-journey.cjs'),ids=[...K.nodes.values()].filter(n=>n.automatic&&n.location==='forest').map(n=>n.id);assert.equal(ids.length,5);
 let wilds=0;const spawn=g.newWild.bind(g);g.newWild=(...args)=>{wilds++;return spawn(...args);};const cells=world(g).journey.segments.filter(s=>!s.arrival).length;
 for(let i=0;i<8&&world(g).journey;i++)p.catchUp({steps:40000,lockMillis:0},now,0);
 assert.equal(world(g).journey,null);assert.equal(world(g).location,'forest');assert.ok(ids.every(id=>g.data.kantoStory.cleared[id]));assert.equal(wilds,0);assert.equal(p.lockConsumed,0);assert.equal(g.data.mapTravel.bank,40000-cells*2000);
 assert.equal(g.data.pendingChallenge,null);assert.equal(g.presentation(),null);assert.equal(g.data.badges.length,0);
 const saved=plain(g.data),h=new A(saved,now);assert.ok(ids.every(id=>!h.canChallenge(id)));assert.equal(h.data.mapTravel.bank,g.data.mapTravel.bank);
});
test('a bank-funded trainer loss stops bank travel instead of retrying forever or skipping the opponent',()=>{
 const {g,p}=forest();for(let i=0;i<10&&world(g).location!=='forest';i++)settle(g);assert.equal(world(g).location,'forest');assert.ok(g.startMovementTrainer(Math.max(now,g.nextTick,g.data.switchUntil)));
 const id=g.data.battle.kantoNode;g.endChallenge(false,now);assert.equal(world(g).journey.bankCells,0);assert.equal(world(g).journey.bankLeg,false);assert.equal(g.data.kantoStory.cleared[id],undefined);assert.equal(p.movementActive(),false);
});
test('a shared-cell destination keeps the entered road and charges only actual adjacent cells',()=>{
 let {g,p}=ready();g.data.badges=['brock','misty'];world(g).location='cerulean';world(g).position={...view(g).map.points.cerulean};
 assert.ok(g.requestAction('travel','mt-moon',now));const trip=world(g).journey,cells=trip.segments.filter(s=>!s.arrival).length;
 assert.ok(trip.segments.slice(0,-1).every(s=>s.location==='route-4'));assert.equal(trip.segments.at(-1).arrival,true);
 p.observe({steps:10000+cells*2000});for(let i=0;i<cells;i++){assert.ok(settle(g));assert.equal(world(g).location,'route-4');}
 assert.equal(g.data.mapTravel.credit,0);const save=plain(g.data);g=new A(save,now);assert.ok(settle(g));assert.equal(world(g).location,'mt-moon');assert.equal(g.data.mapTravel.credit,0);assert.ok(settle(g));assert.equal(world(g).journey,null);
});
