'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console,structuredClone,TextEncoder,TextDecoder});
for(const f of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/android/app/build/generated/gameAssets/web/config.js','mobile/web/progression.js','mobile/web/background.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const A=c.MobileCore.Adventure,P=c.MobileProgression,now=Date.parse('2026-10-22T06:00:00Z'),plain=x=>JSON.parse(JSON.stringify(x));
function ready(saved){const g=new A(saved||new c.MobileCore.Game({},now).data,now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;if(!saved){const K=require('../../shared/kanto-journey.cjs');for(const id of K.cases.find(c=>c.id==='forest-path').entries)g.data.kantoStory.cleared[id]=now;Object.assign(g.rivalProgress('rival-brock'),{state:'won',wonAt:now});}const p=new P(g);p.resume(now);(g.data.mapTravel ??= {}).touchesObserved ??= 5000;p.observe({touches:5000});return {g,p};}
const world=g=>g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
const view=g=>{const s=g.panelState(now);return g.data.johtoUnlocked?s.johtoWorld:s.kantoWorld;};
const here=g=>plain(view(g).position),next={x:44,y:92};
const choose=(g)=>g.requestAction('travel',{location:'route-1',position:next},now);
const settle=g=>{const t=Math.max(now,g.nextTick,g.data.switchUntil||0);return g.controlTick(t);};
test('mobile advances exactly one adjacent cell for each 1,000 new touches, with no historical distance',()=>{
 const {g,p}=ready(),start=here(g);assert.ok(choose(g));assert.deepEqual(here(g),start);assert.equal(world(g).walk,null);assert.equal(view(g).roadProgress,null);
 p.observe({touches:5999});assert.equal(g.advanceTravel(now),false);assert.deepEqual(here(g),start);assert.equal(view(g).touchProgress.completed,999);
 p.observe({touches:6000});assert.equal(g.advanceTravel(now),true);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.credit,0);assert.ok(world(g).walk.stepTravel);assert.equal(Math.abs(start.x-next.x)+Math.abs(start.y-next.y),8);
 assert.ok(settle(g));assert.equal(world(g).journey,null);assert.equal(p.consumed,0);assert.equal(p.usageConsumed,0);
});
test('lock time, calendar time and repeated wild results never buy mobile map distance',()=>{
 const {g,p}=ready(),start=here(g);choose(g);for(let i=0;i<100;i++)g.onWildEnd({kind:'wild',location:'route-1'},now);
 assert.equal(g.advanceTravel(now+3600000),false);assert.deepEqual(here(g),start);
 p.consumed=10000;assert.ok(p.catchUp({touches:5000,usageActive:true,usageMillis:100000},now+1000,10)>0);assert.deepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,0);assert.ok(p.usageConsumed>0);
});
test('partial distance survives saving, reopening and retargeting; stale or invalid totals cannot replay touches',()=>{
 let {g,p}=ready();choose(g);p.observe({touches:5617});const saved=plain(g.data),mobile=plain(p.checkpoint());g=new A(saved,now,{random:()=>.6});p=new P(g,mobile);
 const start=here(g);for(const touches of [5500,5617,-1,NaN,Infinity,5617.5])p.observe({touches});assert.equal(g.data.mapTravel.credit,1234);
 assert.ok(g.requestAction('travel','pewter',now));assert.equal(g.data.mapTravel.credit,1234);p.observe({touches:6000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,0);
});
test('touches fill distance during a battle but movement waits for the actual knockout and result',()=>{
 const {g,p}=ready();g.newWild(now);const battle=g.data.battle,start=here(g);assert.ok(choose(g));p.observe({touches:6000});assert.equal(g.data.mapTravel.credit,2000);assert.equal(g.advanceTravel(now+100000),false);assert.equal(g.data.battle,battle);assert.deepEqual(here(g),start);
 battle.foe.hp=0;g.showFaint(now);assert.equal(g.advanceTravel(now),false);assert.deepEqual(here(g),start);
 g.tick(Math.max(g.nextTick,g.data.switchUntil));assert.equal(g.data.battle,null);for(let i=0;i<3&&here(g).y!==next.y;i++)settle(g);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.credit,0);
});
test('headless processing commits the last map step even with no battle action available and never advances dialogue',()=>{
 const {g,p}=ready();choose(g);p.observe({touches:5999});g.dialogue('fixture','fixture','oak',['fixture'],'fixture',now);const before=here(g);
 const saved={format:1,game:plain(g.data),mobile:{...plain(p.checkpoint()),consumed:12000}};
 const r=JSON.parse(c.MobileBackground.run(JSON.stringify(saved),{touches:6000,usageActive:true,usageMillis:0},now));assert.equal(r.used,0);assert.equal(r.changed,true);assert.equal(r.save.game.mapTravel.credit,2000);assert.equal(r.save.game.mobileStory.scene.index,0);assert.deepEqual(plain(r.save.game.kantoWorld.position||before),before);
 const restored=new A(r.save.game,now),resume=new P(restored,r.save.mobile);restored.data.mobileStory.scene=null;restored.nextTick=now;restored.data.switchUntil=0;assert.equal(resume.catchUp({touches:6000,usageActive:true,usageMillis:0},now),0);assert.deepEqual(here(restored),next);assert.equal(restored.data.mapTravel.credit,0);
});
test('background distance crosses only paid cells, preserves a remainder and does not spend battle activity twice',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel','pewter',now));const before=plain(world(g).journey.segments),start=here(g);
 assert.equal(p.catchUp({touches:7501,usageActive:true,usageMillis:0},now,0),0);assert.equal(p.consumed,0);assert.equal(world(g).journey.index,2);assert.deepEqual(here(g),plain(before[1].path.at(-1)));assert.notDeepEqual(here(g),start);assert.equal(g.data.mapTravel.credit,1002);
 assert.equal(p.catchUp({touches:7501,usageActive:true,usageMillis:0},now,0),0);assert.equal(world(g).journey.index,2);assert.equal(g.data.mapTravel.credit,1002);
});
test('arrival, idle touches and cancellation preserve surplus distance in a separately usable bank',()=>{
 const {g,p}=ready();choose(g);assert.equal(p.catchUp({touches:10000},now,0),0);assert.equal(world(g).journey,null);assert.equal(g.data.mapTravel.credit,0);
 assert.equal(g.data.mapTravel.bank,8000);p.observe({touches:12500});assert.equal(g.data.mapTravel.bank,13000);
 assert.ok(g.requestAction('travel','pewter',now));assert.equal(g.data.mapTravel.credit,0);assert.equal(g.data.mapTravel.touchesObserved,12500);assert.equal(g.advanceTravel(now),false);
 assert.ok(g.requestAction('travel-bank',undefined,now));assert.ok(g.advanceTravel(now));assert.equal(g.data.mapTravel.bank,11000);assert.equal(p.usageConsumed,0);
 const h=ready();h.g.newWild(now);choose(h.g);h.p.observe({touches:5500});assert.equal(h.g.data.mapTravel.credit,1000);h.g.cancelAction(h.g.data.pendingActions[0].id,now);h.p.observe({touches:6000});assert.equal(h.g.data.mapTravel.credit,0);assert.equal(h.g.data.mapTravel.bank,2000);
});
test('gates stop the paid journey without starting a challenge, then passage also requires recorded touches',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel','route-3',now));assert.equal(p.catchUp({touches:150000},now,0),0);assert.equal(world(g).journey,null);assert.equal(world(g).location,'pewter');assert.equal(world(g).blocked.checkpoint,'route-3');assert.equal(g.data.battle,null);assert.equal(g.data.pendingChallenge,null);
 g.data.badges=['brock'];assert.ok(g.requestAction('world-pass','route-3',now));const start=here(g);assert.equal(g.advanceTravel(now),false);p.observe({touches:151000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
});
test('Johto uses the same 1,000-touch cells and regional crossings do not relocate on selection',()=>{
 const {g,p}=ready();g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));g.data.switchUntil=0;g.nextTick=now;g.data.mobileStory.scene=null;
 const start=here(g);assert.ok(g.requestAction('travel','j-violet',now));assert.deepEqual(here(g),start);p.observe({touches:6000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
 g.data.johto.cleared['j-ship']=now;g.data.johtoWorld.journey=null;g.data.switchUntil=0;g.nextTick=now;g.data.mapTravel.credit=0;const previous=world(g).location;
 assert.ok(g.requestAction('travel','j-k-vermilion',now));assert.equal(world(g).location,previous);p.observe({touches:7000});assert.ok(g.advanceTravel(now));assert.equal(world(g).location,'j-k-vermilion');
});
test('old encounter-based itineraries keep the current place and destination but require new touches for remaining cells',()=>{
 const PC=require('../../desktop/adventure.cjs').Adventure,pc=require('../../desktop/test/helpers/kanto-fixture.cjs').existing(PC,now,{random:()=>.6});pc.data.mobileStory.onboarding='done';pc.data.mobileStory.scene=null;pc.data.switchUntil=0;pc.nextTick=now;pc.requestAction('travel','pewter',now);
 const {g,p}=ready(plain(pc.data)),start=here(g);g.data.switchUntil=0;g.nextTick=now;assert.ok(settle(g)===false);assert.equal(world(g).journey.mode,'steps');assert.deepEqual(here(g),start);assert.equal(world(g).journey.destination,'pewter');assert.equal(g.data.mapTravel?.credit||0,0);
 p.observe({touches:6000});assert.ok(g.advanceTravel(now));assert.notDeepEqual(here(g),start);
});
test('five thousand touches without a destination bank five moves; replays, reload and season changes retain them',()=>{
 let {g,p}=ready();p.observe({touches:10000});assert.equal(view(g).movement.count,5);assert.equal(g.data.mapTravel.credit,0);assert.equal(g.data.battle,null);
 const r=JSON.parse(c.MobileBackground.run(JSON.stringify({game:plain(g.data),mobile:plain(p.checkpoint())}),{touches:10673,usageActive:true,usageMillis:0},now));
 assert.equal(r.used,0);assert.equal(r.save.game.mapTravel.bank,11346);g=new A(r.save.game,now);p=new P(g,r.save.mobile);
 p.observe({touches:10673});p.observe({touches:10000});assert.equal(g.data.mapTravel.bank,11346);g.resetSeason(now);assert.equal(g.data.mapTravel.bank,11346);assert.equal(g.data.mapTravel.touchesObserved,10673);
 const cold=new A(plain(g.data),Date.parse('2026-11-01T06:00:00Z'));assert.equal(cold.data.mapTravel.bank,11346);assert.equal(cold.data.mapTravel.touchesObserved,10673);
});
test('a planned 2,000-touch journey banks the extra 1,500 touches, without automatically spending them on the next path',()=>{
 const {g,p}=ready();assert.ok(g.requestAction('travel',{location:'viridian',position:{x:44,y:84}},now));assert.equal(world(g).journey.segments.length,2);
 p.catchUp({touches:8500,usageActive:true,usageMillis:0},now,0);assert.equal(world(g).journey,null);assert.equal(g.data.mapTravel.bank,3000);assert.equal(view(g).movement.count,1);assert.equal(view(g).movement.remainder,500);
 g.requestAction('travel','pewter',Math.max(now,g.nextTick));assert.equal(g.advanceTravel(Math.max(now,g.nextTick)),false);assert.equal(g.data.mapTravel.bank,3000);
});
test('bank use survives a queued journey and reload, escapes the current wild, and never double charges a cell',()=>{
 let {g,p}=ready();p.observe({touches:10000});g.newWild(now);const battle=g.data.battle;choose(g);assert.ok(g.requestAction('travel-bank',undefined,now));assert.ok(g.data.pendingActions[0].useBank);
 g=new A(plain(g.data),now);p=new P(g);assert.ok(g.data.pendingActions[0].useBank);p.catchUp({touches:10000,usageActive:true,usageMillis:0},now,0);assert.ok(g.data.journal.some(e=>e.text==='성공적으로 도망쳤다!'));
 p.catchUp({touches:10000,usageActive:true,usageMillis:0},Math.max(now,g.nextTick),0);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.bank,8000);const saved=plain(g.data);
 g=new A(saved,now);p=new P(g);p.catchUp({touches:10000,usageActive:true,usageMillis:0},Math.max(now,g.nextTick),0);assert.equal(g.data.mapTravel.bank,8000);assert.equal(g.data.battle,null);assert.equal(p.usageConsumed,0);assert.equal(battle.kind,'wild');
});
function forest(){
 const g=new A({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.rivalProgress('rival-brock').state='won';
 g.data.kantoWorld.location='viridian';g.data.kantoWorld.position={...g.panelState(now).kantoWorld.map.points.viridian};g.gainXp(25,1000000,now);g.data.switchUntil=0;g.nextTick=now;
 const p=new P(g);p.observe({touches:0});p.observe({touches:20000});assert.ok(g.requestAction('travel','forest',now));assert.ok(g.requestAction('travel-bank',undefined,now));return {g,p};
}
test('an unavailable evolution reservation cannot stall bank-funded trainers, including after reload',()=>{
 let {g,p}=forest();assert.ok(g.requestAction('evolve',{id:25,to:26},now));g=new A(plain(g.data),now,{random:()=>.6});p=new P(g);
 for(let i=0;i<8&&world(g).journey;i++)p.catchUp({touches:20000,usageActive:true,usageMillis:0},now,0);
 assert.equal(world(g).journey,null);assert.equal(world(g).location,'forest');assert.equal(g.data.mapTravel.bank,36000);assert.equal(p.usageConsumed,0);
 assert.equal(g.data.pendingActions.length,1);assert.equal(g.data.pendingActions[0].kind,'evolve');assert.equal(g.data.owned[25].id,25);
});
test('direct bank travel to Pewter visits the forest, resolves its opponents, and pays only four physical cells',()=>{
 const {g,p}=forest();world(g).journey=null;g.requestAction('travel','pewter',now);g.requestAction('travel-bank',undefined,now);
 assert.ok(world(g).journey.segments.some(s=>s.location==='forest'&&s.arrival));
 for(let i=0;i<8&&world(g).journey;i++)p.catchUp({touches:20000,usageActive:true,usageMillis:0},now,0);
 assert.equal(world(g).journey,null);assert.equal(world(g).location,'pewter');assert.equal(world(g).blocked,null);assert.equal(g.data.mapTravel.bank,32000);
 assert.ok(require('../../shared/kanto-journey.cjs').trainersDone(g,'forest-path'));assert.equal(p.usageConsumed,0);
});
test('bank departure defers current-location opponents without clearing them, and revisiting still encounters them',()=>{
 let {g,p}=forest();world(g).journey=null;world(g).location='forest';world(g).position={...view(g).map.points.forest};
 const id=g.movementTrainerNode();assert.ok(id);g.requestAction('travel','viridian',now);g.requestAction('travel-bank',undefined,now);
 g=new A(plain(g.data),now,{random:()=>.6});p=new P(g);p.catchUp({touches:20000,usageActive:true,usageMillis:0},now,0);
 assert.equal(world(g).location,'viridian');assert.equal(world(g).journey,null);assert.equal(g.data.kantoStory.cleared[id],undefined);assert.equal(g.data.mapTravel.bank,36000);assert.equal(g.data.battle,null);
 g.requestAction('travel','forest',Math.max(now,g.nextTick,g.data.switchUntil));g.requestAction('travel-bank',undefined,now);
 for(let i=0;i<8&&world(g).journey;i++)p.catchUp({touches:20000,usageActive:true,usageMillis:0},now,0);
 assert.ok(g.data.kantoStory.cleared[id]);assert.equal(g.data.mapTravel.bank,32000);assert.equal(p.usageConsumed,0);
});
test('explicit bank escape interrupts an undecided wild attack promptly without battle rewards or extra activity',()=>{
 const {g,p}=ready();p.observe({touches:10000});g.newWild(now);g.animate('attack',{text:'fixture',actor:'hero'},now);const end=g.nextTick,xp=g.data.owned[25].xp,caught=plain(g.data.caught),battles=plain(g.data.battles);
 choose(g);g.requestAction('travel-bank',undefined,now);const q=view(g);assert.equal(q.movement.phase,'queued');assert.equal(q.movement.usingBank,true);
 assert.equal(g.data.battle,null);assert.equal(g.data.animation.kind,'result');assert.equal(g.data.animation.text,'성공적으로 도망쳤다!');assert.equal(g.data.animation.duration,350);assert.ok(g.nextTick<end);
 p.live(now+349,{touches:10000,usageActive:true,usageMillis:0});assert.equal(g.data.mapTravel.bank,10000);
 for(let t=now+350;t<end+20000;t+=250)p.live(t,{touches:10000,usageActive:true,usageMillis:0});
 assert.equal(g.data.battle,null);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.bank,8000);assert.equal(g.data.owned[25].xp,xp);assert.deepEqual(plain(g.data.caught),caught);assert.deepEqual(plain(g.data.battles),battles);assert.equal(p.usageConsumed,0);
 assert.equal(g.data.journal.filter(e=>e.kind==='flee').length,1);
});
test('an already-decided capture is awarded before bank departure instead of discarded as an escape',()=>{
 const {g,p}=ready();p.observe({touches:10000});g.newWild(now);const b=g.data.battle;b.foe.id=19;b.foe.hp=1;g.random=()=>0;assert.equal(g.capture(now),true);assert.equal(g.data.pendingBattle.kind,'capture-result');
 choose(g);g.requestAction('travel-bank',undefined,now);p.catchUp({touches:10000,usageActive:true,usageMillis:0},now,0);
 assert.ok(g.data.caught[19]);assert.equal(Object.values(g.data.owned).filter(p=>p.id===19).length,1);assert.deepEqual(here(g),next);assert.equal(g.data.mapTravel.bank,8000);assert.equal(g.data.journal.some(e=>e.kind==='flee'),false);assert.equal(p.usageConsumed,0);
});
test('an already-decided knockout resolves before bank departure and cannot be awarded twice after reload',()=>{
 let {g,p}=ready();p.observe({touches:10000});g.newWild(now);g.data.battle.foe.hp=0;g.showFaint(now);choose(g);g.requestAction('travel-bank',undefined,now);const xp=g.data.owned[25].xp;
 p.catchUp({touches:10000,usageActive:true,usageMillis:0},now,0);assert.ok(g.data.owned[25].xp>xp);assert.deepEqual(here(g),next);assert.equal(g.data.journal.some(e=>e.kind==='flee'),false);const earned=g.data.owned[25].xp;
 g=new A(plain(g.data),now);p=new P(g);p.catchUp({touches:10000,usageActive:true,usageMillis:0},now,0);assert.equal(g.data.owned[25].xp,earned);assert.equal(g.data.mapTravel.bank,8000);
});
test('bank travel does not flee manual challenges or reveal their result',()=>{
 const {g,p}=ready();p.observe({touches:10000});g.newWild(now);g.data.battle.storyId='road-snorlax';const b=g.data.battle;choose(g);g.requestAction('travel-bank',undefined,now);
 const start=here(g);p.catchUp({touches:10000,usageActive:true,usageMillis:0},now,0);assert.equal(g.data.battle,b);assert.deepEqual(here(g),start);assert.equal(g.data.mapTravel.bank,10000);assert.equal(g.data.journal.some(e=>e.kind==='flee'),false);
});
test('locked bank travel stops its trainer battle and preserves XP and its activity balance',()=>{
 const {g,p}=forest();for(let i=0;i<10&&world(g).location!=='forest';i++)settle(g);
 const at=Math.max(now,g.nextTick,g.data.switchUntil||0);assert.ok(g.startMovementTrainer(at));
 const before=JSON.stringify(g.data.battle),xp=g.data.owned[g.data.activeId].xp;p.pause(at);
 p.catchUp({touches:g.data.mapTravel.touchesObserved,usageActive:false,usageMillis:999999},at+3600000);
 assert.equal(JSON.stringify(g.data.battle),before);assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.equal(p.usageConsumed,0);
});
test('locked bank travel does not award an already-decided capture before the phone is used again',()=>{
 const {g,p}=ready();p.observe({touches:10000});g.newWild(now);g.data.battle.foe.id=19;g.data.battle.foe.hp=1;g.random=()=>0;g.capture(now);
 choose(g);g.requestAction('travel-bank',undefined,now);p.pause(now);const caught=plain(g.data.caught),xp=g.data.owned[g.data.activeId].xp;
 p.catchUp({touches:10000,usageActive:false,usageMillis:999999},now+3600000,0);
 assert.deepEqual(plain(g.data.caught),caught);assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.ok(g.data.pendingBattle);
});
test('bank travel at the destination shows trainer progress instead of zero-touch movement progress',()=>{
 const {g}=forest();for(let i=0;i<10&&world(g).location!=='forest';i++)settle(g);assert.equal(view(g).touchProgress,null);assert.equal(view(g).movement.phase,'trainer-wait');
 assert.ok(g.startMovementTrainer(Math.max(now,g.nextTick,g.data.switchUntil)));assert.equal(view(g).movement.phase,'trainer');assert.equal(view(g).touchProgress,null);
});
test('bank travel completes every ordinary forest trainer without wild encounters, lock actions, duplicate trainers or extra distance charges',()=>{
 const {g,p}=forest(),K=require('../../shared/kanto-journey.cjs'),ids=[...K.nodes.values()].filter(n=>n.automatic&&n.location==='forest').map(n=>n.id);assert.equal(ids.length,5);
 let wilds=0;const spawn=g.newWild.bind(g);g.newWild=(...args)=>{wilds++;return spawn(...args);};const cells=world(g).journey.segments.filter(s=>!s.arrival).length;
 for(let i=0;i<8&&world(g).journey;i++)p.catchUp({touches:20000,usageActive:true,usageMillis:0},now,0);
 assert.equal(world(g).journey,null);assert.equal(world(g).location,'forest');assert.ok(ids.every(id=>g.data.kantoStory.cleared[id]));assert.equal(wilds,0);assert.equal(p.usageConsumed,0);assert.equal(g.data.mapTravel.bank,40000-cells*2000);
 assert.equal(g.data.pendingChallenge,null);assert.equal(g.presentation(),null);assert.equal(g.data.badges.length,0);
 const saved=plain(g.data),h=new A(saved,now);assert.ok(ids.every(id=>!h.canChallenge(id)));assert.equal(h.data.mapTravel.bank,g.data.mapTravel.bank);
});
test('a bank-funded trainer loss stops bank travel instead of retrying forever or skipping the opponent',()=>{
 const {g,p}=forest();for(let i=0;i<10&&world(g).location!=='forest';i++)settle(g);assert.equal(world(g).location,'forest');assert.ok(g.startMovementTrainer(Math.max(now,g.nextTick,g.data.switchUntil)));
 const id=g.data.battle.kantoNode;g.endChallenge(false,now);assert.equal(world(g).journey.bankCells,0);assert.equal(world(g).journey.bankLeg,false);assert.equal(g.data.kantoStory.cleared[id],undefined);assert.equal(p.movementActive(),false);
});
test('a shared-cell destination keeps the entered road and charges only actual adjacent cells',()=>{
 let {g,p}=ready();g.data.badges=['brock','misty'];for(const c of require('../../shared/kanto-journey.cjs').cases.filter(c=>['moon-path','route3-path'].includes(c.id)||c.location==='route-4'))for(const id of c.entries)g.data.kantoStory.cleared[id]=now;world(g).location='cerulean';world(g).position={...view(g).map.points.cerulean};
 assert.ok(g.requestAction('travel','mt-moon',now));const trip=world(g).journey,cells=trip.segments.filter(s=>!s.arrival).length;
 assert.ok(trip.segments.slice(0,-1).every(s=>s.location==='route-4'));assert.equal(trip.segments.at(-1).arrival,true);
 p.observe({touches:5000+cells*1000});for(let i=0;i<cells;i++){assert.ok(settle(g));assert.equal(world(g).location,'route-4');}
 assert.equal(g.data.mapTravel.credit,0);const save=plain(g.data);g=new A(save,now);assert.ok(settle(g));assert.equal(world(g).location,'mt-moon');assert.equal(g.data.mapTravel.credit,0);assert.ok(settle(g));assert.equal(world(g).journey,null);
});
