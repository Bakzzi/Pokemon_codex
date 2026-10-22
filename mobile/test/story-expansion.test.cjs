'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Game}=require('../../desktop/game.cjs'),safari=require('../safari.cjs'),{champion}=require('../rivals.cjs');
const Progression=require('../web/progression.js');
const {wildDistribution,pickWild,xpAt}=require('../../desktop/pokemon.cjs');
const {combatant}=require('../../desktop/battle.cjs');
globalThis.MobileCore={nursery:require('../../desktop/daycare.cjs')};
const now=Date.parse('2026-10-18T06:00:00Z'),badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
function ready(n=0,random=()=>.5){const old=new Game({},now);old.data.badges=badges.slice(0,n);return new Adventure(old.data,now,{random});}
function settle(g){g.nextTick=0;g.data.switchUntil=0;}
function pages(g,t=now){const id=g.presentation()?.id;while(g.presentation()?.mode==='dialogue'&&g.presentation().id===id){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,t));}}
function begin(g){pages(g);g.sceneTick(now+3000);settle(g);}
function win(g,t=now+5000){const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(t);pages(g,t);settle(g);}

test('event and Safari species never enter ordinary mobile wild draws, including champion bonuses and Johto',()=>{
  const excluded=[29,30,32,33,46,47,102,104,111,113,114,115,123,128,131],g=ready(8);
  for(const champion of [false,true])for(const level of [5,15,50,71,100]){
    g.data.champion=champion;g.data.johtoUnlocked=champion;const hero=g.data.owned[g.data.activeId];hero.level=level;hero.xp=xpAt(hero.id,level);
    const options=g.wildOptions(),generation=g.maxGeneration(),distribution=wildDistribution(generation,level,options);
    assert.ok(distribution.pokemon.every(p=>!excluded.includes(p.id)));assert.ok(Math.abs(distribution.pokemon.reduce((n,p)=>n+p.chance,0)-1)<1e-10);
    let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let i=0;i<300;i++)assert.ok(!excluded.includes(pickWild(generation,random,level,options)));
  }
  const desktop=new Game({},now);assert.ok(wildDistribution(1,100,desktop.wildOptions()).pokemon.some(p=>p.id===131));
});
test('mobile acquisition hints show the actual event or Safari routes and preserve evolution and breeding alternatives',()=>{
  const g=ready(),collection=g.panelState(now).collection,entry=id=>collection.find(p=>p.id===id);
  for(const id of [131,...safari.pool.map(([id])=>id)]){const p=entry(id);assert.equal(p.acquisition.wildAllowed,false);assert.ok(!p.acquisition.routes.some(r=>r.kind==='wild'));assert.ok(p.acquisition.routes.some(r=>r.kind==='event'));assert.ok(!/0\.00%|야생 확률/.test(JSON.stringify(p.acquisition)));}
  assert.equal(entry(131).acquisition.summary,'이벤트');assert.ok(!/실프|직원|그린/.test(JSON.stringify(entry(131).acquisition)));assert.equal(entry(128).acquisition.summary,'사파리존');
  assert.ok(entry(47).acquisition.routes.some(r=>r.kind==='evolution'&&r.from===46));assert.ok(entry(29).acquisition.routes.some(r=>r.kind==='hatch'));assert.ok(entry(16).acquisition.wildAllowed);
});
test('upgrading keeps caught Pokemon and an already started wild battle while retiring only the impossible Lapras reservation',()=>{
  const g=ready(5);g.addPokemon(131,25,'catch',now);g.addPokemon(128,20,'catch',now);g.data.captureReservations={131:{remaining:1,revision:1},128:{remaining:1,revision:2}};g.data.captureReservationSerial=2;
  g.newWild(now);g.data.battle.foe=combatant(131,25);const owned=structuredClone(g.data.owned),slots=[...g.data.slots],battle=structuredClone(g.data.battle),loaded=new Adventure(structuredClone(g.data),now+1000);
  assert.deepEqual(loaded.data.owned,owned);assert.deepEqual(loaded.data.slots,slots);assert.deepEqual(loaded.data.battle,battle);assert.equal(loaded.data.captureReservations[131],undefined);assert.equal(loaded.data.captureReservations[128].remaining,1);assert.equal(loaded.reserveCapture(131,1,now+1000),false);assert.ok(loaded.canReserveCapture(128));
});

test('Brock entrance surprises the player once and loss requires a persistent rival rematch',()=>{
  const g=ready();assert.ok(g.canChallenge(0));assert.ok(g.challenge(0,now));assert.equal(g.data.battle.storyId,'rival-brock');assert.deepEqual(g.battleBoss().team.map(p=>[p.id,p.level]),[[21,9],[133,8]]);begin(g);g.endChallenge(false,now+4000);pages(g);settle(g);
  const loaded=new Adventure(structuredClone(g.data),now+5000);settle(loaded);assert.ok(!loaded.canChallenge(0));assert.ok(loaded.canChallenge('rival-brock'));loaded.challenge('rival-brock',now+6000);begin(loaded);win(loaded);assert.equal(loaded.data.battle,null);assert.ok(loaded.canChallenge(0));assert.ok(!loaded.canChallenge('rival-brock'));loaded.challenge(0,now+10000);assert.equal(loaded.data.battle.bossIndex,0);
});
test('a save already fighting Brock keeps its battle and does not gain an unreachable new rival gate',()=>{
  const old=new Game({},now);old.challenge(0,now);const battle=structuredClone(old.data.battle),loaded=new Adventure(old.data,now+1000);assert.deepEqual(loaded.data.battle,battle);assert.equal(loaded.rivalProgress('rival-brock').state,'completed');
});
test('scope reward is hidden until its dialogue ends and survives a reload without early award',()=>{
  const g=ready(3);g.data.trainingDevice.gruntWonAt=now;g.data.trainingDevice.duoWonAt=now;assert.ok(g.challenge('rocket-giovanni',now));begin(g);win(g);assert.equal(g.presentation().next,'scope-reward');assert.ok(!g.data.mobileStory.scopeObtainedAt);assert.ok(!g.panelState(now).inventory.some(i=>i.id==='silph-scope'));
  const loaded=new Adventure(structuredClone(g.data),now+6000);assert.ok(!loaded.data.mobileStory.scopeObtainedAt);pages(loaded);assert.equal(loaded.panelState(now).inventory.filter(i=>i.id==='silph-scope').length,1);const again=new Adventure(structuredClone(loaded.data),now+7000);assert.equal(again.panelState(now).inventory.filter(i=>i.id==='silph-scope').length,1);
});
test('the Tower ghost is a separate non-capturable encounter and never registers a caught Marowak',()=>{
  const g=ready(4);g.data.mobileStory.rescue.wins[0]=now;g.challenge('tower-grunt-2',now);assert.ok(g.battleBoss().ghost);assert.equal(g.presentation().kind,'ghost');assert.equal(g.data.battle.foe.id,105);assert.equal(g.captureOpportunity(),null);begin(g);assert.equal(g.presentation(),null);win(g);assert.ok(g.data.mobileStory.rescue.wins[1]);assert.ok(!g.registeredThisSeason(105));assert.ok(!Object.values(g.data.owned).some(p=>p.id===105));assert.ok(g.canChallenge('tower-grunt-3'));
});
test('ghost send-out preserves turn pacing without pretending that an opponent threw a ball',()=>{
  const g=ready(4);g.data.mobileStory.rescue.wins[0]=now;g.challenge('tower-grunt-2',now);pages(g);assert.equal(g.presentation().kind,'ghost-sendout');assert.equal(g.data.battle.turn,0);assert.equal(g.tick(now+5000),false);g.sceneTick(now+3000);assert.equal(g.presentation(),null);
});
test('legacy active second grunt keeps its exact old party and progress',()=>{
  const g=ready(4);g.data.mobileStory.rescue.wins[0]=now;g.challenge('tower-grunt-2',now);g.data.battle.mobileStoryRevision=2;g.data.battle.foe={...g.data.battle.foe,id:109};const loaded=new Adventure(structuredClone(g.data),now+1000);assert.deepEqual(loaded.battleBoss().team.map(p=>p.id),[109,96]);assert.ok(!loaded.battleBoss().ghost);assert.equal(loaded.data.battle.foe.id,109);
});
test('Lapras comes from a saved conversation after the company rival and does not fill empty slots',()=>{
  const g=ready(5);g.data.mobileStory.silph.wins[0]=now;assert.ok(!g.offerLapras(now));g.rivalProgress('rival-silph').state='won';assert.ok(g.offerLapras(now));assert.ok(!g.registeredThisSeason(131));const slots=[...g.data.slots],loaded=new Adventure(structuredClone(g.data),now+1000);assert.equal(loaded.presentation().next,'lapras-gift');assert.ok(!loaded.registeredThisSeason(131));pages(loaded);assert.equal(loaded.data.owned[loaded.data.mobileStory.laprasUid].level,15);assert.deepEqual(loaded.data.slots,slots);settle(loaded);assert.equal(loaded.offerLapras(now+2000),false);assert.equal(Object.values(new Adventure(structuredClone(loaded.data),now+3000).data.owned).filter(p=>p.id===131).length,1);
});
test('completed old company saves skip the new gift scene without granting a surprise duplicate',()=>{
  const g=ready(6);assert.equal(g.data.mobileStory.laprasResolved,true);assert.equal(g.offerLapras(now),false);assert.ok(!g.registeredThisSeason(131));
});
test('mansion begins after Sabrina, queues behind wild battle, and does not reveal future diary pages',()=>{
  const locked=ready(5);assert.ok(!locked.canChallenge('mansion-investigate'));const g=ready(6);assert.ok(!g.canChallenge(6));assert.ok(g.panelState(now).mansion.visible);assert.deepEqual(g.panelState(now).mansion.entries,[]);g.newWild(now);assert.ok(g.challenge('mansion-investigate',now));assert.equal(g.data.pendingChallenge.index,'mansion-investigate');g.data.battle=null;settle(g);g.tick(now+1000);assert.equal(g.presentation().next,'mansion-begin');assert.ok(!g.data.mobileStory.mansion.startedAt);pages(g);assert.ok(g.data.mobileStory.mansion.startedAt);
});
test('mansion clues require actual wild results and its final key waits for the last tapped page',()=>{
  const g=ready(6);g.challenge('mansion-investigate',now);pages(g);settle(g);
  for(let i=1;i<=6;i++){
    g.newWild(now+i*10000);g.data.battle.foe.hp=0;g.defeatOpponent(now+i*10000);assert.equal(g.data.mobileStory.mansion.wins,i);settle(g);
    if(i%2){assert.equal(g.offerMansion(now+i*10000),false);continue;}
    assert.ok(g.offerMansion(now+i*10000));assert.ok(!g.canChallenge(6));assert.equal(g.panelState(now).mansion.entries.length,i/2-1);
    if(i===6){const loaded=new Adventure(structuredClone(g.data),now+i*10000);assert.ok(!loaded.data.mobileStory.mansion.keyObtainedAt);pages(loaded);assert.ok(loaded.canChallenge(6));assert.equal(loaded.panelState(now).inventory.filter(p=>p.id==='secret-key').length,1);assert.equal(loaded.panelState(now).mansion.entries.length,3);}else pages(g);
  }
});
test('new clues never interrupt a pending battle or a deliberately queued challenge',()=>{
  const g=ready(6);g.data.mobileStory.mansion.startedAt=now;g.data.mobileStory.mansion.wins=2;g.newWild(now);assert.equal(g.offerMansion(now),false);g.data.battle=null;g.data.pendingChallenge={index:'safari-start'};assert.equal(g.offerMansion(now),false);g.data.pendingChallenge=null;settle(g);assert.ok(g.offerMansion(now));
});
test('existing active or queued Blaine challenges remain valid across the story upgrade',()=>{
  for(const queued of [false,true]){const old=new Game({},now);old.data.badges=badges.slice(0,6);if(queued)old.data.pendingChallenge={index:6,queuedAt:now};else old.challenge(6,now);const before=structuredClone(old.data.battle);const g=new Adventure(old.data,now+1000);assert.ok(g.data.mobileStory.mansion.completedAt);if(queued)assert.equal(g.data.pendingChallenge.index,6);else assert.deepEqual(g.data.battle,before);}
});
test('new leagues preserve the rival Eevee line through Champion while active old leagues keep their original party',()=>{
  const g=ready(8);g.rivalProgress('rival-league').state='won';g.challenge(8,now);assert.equal(g.data.battle.mobileLeagueRevision,1);g.data.battle.bossIndex=12;assert.deepEqual(g.battleBoss().team,champion.team);assert.equal(g.battleBoss().team.at(-1).id,135);g.data.leagueBest=4;assert.deepEqual(g.panelState(now).bosses[12].team,champion.team);
  delete g.data.battle.mobileLeagueRevision;const loaded=new Adventure(structuredClone(g.data),now+1000);assert.equal(loaded.battleBoss().team.at(-1).id,6);assert.equal(loaded.panelState(now).bosses[12].team.at(-1).id,6);
});
function depart(random=()=>0){const g=ready(5,random);assert.ok(g.challenge('safari-start',now));pages(g);settle(g);const p=new Progression(g);p.resume(now);return {g,p};}
test('safari takes lock actions only while unlocked foreground adventure rests',()=>{
  const {g,p}=depart();assert.equal(p.live(now),false);assert.equal(g.data.battle,null);assert.equal(g.data.mobileStory.safari.trip.steps,0);assert.equal(p.catchUp({steps:0,lockMillis:18000},now),0);const battle=structuredClone(g.data.battle),xp=g.data.owned[g.data.activeId].xp;assert.equal(p.catchUp({steps:0,lockMillis:100000},now),5);assert.deepEqual(g.data.battle,battle);assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.equal(g.data.mobileStory.safari.trip.steps,50);assert.equal(g.data.mobileStory.safari.trip.caught.length,1);assert.equal(g.data.slots.filter(x=>x!==null).length,1);
});
test('safari consumes exactly one capture reservation and observes already registered species afterwards',()=>{
  const {g,p}=depart();p.catchUp({steps:0,lockMillis:100000},now);const s=g.data.mobileStory.safari.trip;assert.equal(s.balls,29);p.catchUp({steps:0,lockMillis:200000},now);assert.equal(s.balls,29);assert.ok(g.reserveCapture(32,1,now));p.catchUp({steps:0,lockMillis:300000},now);assert.equal(s.balls,28);assert.equal(g.data.captureReservations[32],undefined);p.catchUp({steps:0,lockMillis:400000},now);assert.equal(s.balls,28);assert.equal(s.caught.length,2);assert.equal(Object.values(g.data.owned).filter(p=>p.id===32).length,2);
});
test('safari lock cursor, catches and remaining balls survive reload without replay',()=>{
  const {g,p}=depart();p.catchUp({steps:0,lockMillis:680000},now);const stored=structuredClone(g.data),mobile=p.checkpoint(),loaded=new Adventure(stored,now+1000,{random:()=>0}),q=new Progression(loaded,mobile);assert.equal(q.catchUp({steps:0,lockMillis:680000},now+1000),0);assert.equal(q.catchUp({steps:0,lockMillis:700000},now+1000),1);assert.equal(loaded.data.mobileStory.safari.trip.steps,350);assert.equal(loaded.data.mobileStory.safari.trip.caught.length,1);assert.equal(loaded.data.mobileStory.safari.trip.balls,29);
});
test('safari returns after a finite walk and preserves its result independently of future expeditions',()=>{
  const {g,p}=depart();assert.equal(p.catchUp({steps:0,lockMillis:3000000},now,200),150);assert.equal(g.data.mobileStory.safari.trip,null);assert.equal(g.data.mobileStory.safari.last.encounters.length,30);assert.equal(g.data.mobileStory.safari.last.caught.length,1);const last=structuredClone(g.data.mobileStory.safari.last);assert.ok(safari.start(g,now+1000));assert.deepEqual(g.data.mobileStory.safari.last,last);assert.ok(g.returnSafari(now+2000));assert.ok(!g.returnSafari(now+3000));
});
test('manual dialogue pauses safari without spending any lock actions or rerolling encounters',()=>{
  const {g,p}=depart();g.dialogue('trainer','그린','green',['잠깐 이야기하자.'],'adventure',now);assert.equal(p.catchUp({steps:0,lockMillis:200000},now),0);assert.equal(p.consumed,0);assert.equal(g.data.mobileStory.safari.trip.steps,0);assert.equal(safari.walk(g,-10,now),false);
});
test('season reset clears expedition, keys and gift state while preserving lifetime collection',()=>{
  const {g,p}=depart();p.catchUp({steps:0,lockMillis:100000},now);g.data.mobileStory.scopeObtainedAt=now;g.data.mobileStory.mansion.completedAt=now;g.data.mobileStory.laprasResolved=true;const caught=structuredClone(g.data.caught);g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.equal(g.data.mobileStory.safari.trip,null);assert.equal(g.data.mobileStory.safari.last,null);assert.equal(g.data.mobileStory.mansion.completedAt,0);assert.ok(!g.data.mobileStory.scopeObtainedAt);assert.equal(g.data.mobileStory.laprasResolved,false);assert.deepEqual(g.data.caught,caught);assert.ok(!g.panelState().safari.visible);assert.ok(!g.panelState().mansion.visible);
});
