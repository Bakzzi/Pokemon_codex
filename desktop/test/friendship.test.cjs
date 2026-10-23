'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const friendship=require('../../shared/friendship.cjs'),travel=require('../../shared/world-travel.cjs');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const {Adventure:PC}=require('../adventure.cjs'),{Adventure:Android}=require('../../mobile/adventure.cjs');
const now=Date.parse('2026-10-23T04:00:00Z');
function ready(Type=PC){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.5});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}

test('only actual level-ups raise friendship, using each original tier even on multi-level awards',()=>{
 const g=new Game({},now),p=g.data.owned[25];p.happiness=98;
 g.gainXp(25,1,now);assert.equal(p.happiness,98);
 g.gainXp(25,xpAt(25,8)-p.xp,now);assert.equal(p.level,8);assert.equal(p.happiness,109);
 p.happiness=199;g.gainXp(25,xpAt(25,10)-p.xp,now);assert.equal(p.happiness,204);
 p.happiness=254;g.gainXp(25,xpAt(25,11)-p.xp,now);assert.equal(p.happiness,255);
 g.gainXp(25,xpAt(25,100)-p.xp,now);p.happiness=200;g.gainXp(25,100,now);assert.equal(p.happiness,200);
});

test('save migration preserves existing bonds, supplies missing values and never applies absence decay',()=>{
 const g=new Game({},now),a=g.addPokemon(1,5,'fixture',now),b=g.addPokemon(4,5,'fixture',now),c=g.addPokemon(7,5,'fixture',now);
 g.data.owned[25].happiness=255;delete g.data.owned[a].happiness;g.data.owned[b].happiness=-5;g.data.owned[c].happiness=999;
 const loaded=new Game(g.data,now+86400000);assert.deepEqual([25,a,b,c].map(uid=>loaded.data.owned[uid].happiness),[255,70,0,255]);
});

for(const Type of [PC,Android])test(Type.name+' credits completed map cells once after reload, only to companions present at departure and arrival',()=>{
 let g=ready(Type);const a=25,b=g.addPokemon(1,5,'fixture',now),boxed=g.addPokemon(4,5,'fixture',now),boarded=g.addPokemon(7,5,'fixture',now),fainted=g.addPokemon(19,5,'fixture',now);
 g.data.slots=[a,b,boarded,fainted,null,null];g.data.daycare={parents:[boarded]};
 g.data.battle={kind:'wild',party:{[fainted]:{hp:0}},foe:{id:129,hp:10,maxHp:10},turn:0};
 const state={walk:{at:now,duration:100,path:[{x:0,y:0},{x:8,y:0},{x:16,y:0}]}},before=Object.fromEntries(Object.values(g.data.owned).map(p=>[p.uid,p.happiness]));
 friendship.startTravel(g,state.walk);delete g.data.battle;
 assert.equal(friendship.finishTravel(g,state,now+99),false);
 g=new Type(g.data,now+100);const saved=JSON.parse(JSON.stringify(state));
 g.data.slots[1]=boxed;
 assert.equal(travel.advance(g,saved,now+100),false);
 assert.equal(g.data.owned[a].happiness,before[a]+2);
 for(const uid of [b,boxed,boarded,fainted])assert.equal(g.data.owned[uid].happiness,before[uid]);
 assert.equal(travel.advance(g,saved,now+1000),false);assert.equal(g.data.owned[a].happiness,before[a]+2);
});

for(const Type of [PC,Android])test(Type.name+' actual map journey earns friendship without converting raw steps, encounters or idle time',()=>{
 const g=ready(Type),world=require('../../shared/kanto-world.cjs'),{finishJourney}=require('./helpers/travel-fixture.cjs');
 g.data.owned[25].happiness=70;
 if(g.platform==='mobile'){g.recordTravelSteps(0);g.recordTravelSteps(10000);assert.equal(g.data.owned[25].happiness,70);}
 assert.ok(g.requestAction('travel','viridian',now));finishJourney(g,now);
 assert.ok(g.data.owned[25].happiness>70);const bond=g.data.owned[25].happiness;
 world.advance(g,now+86400000);assert.equal(g.data.owned[25].happiness,bond);
 assert.deepEqual(g.snapshot(now).hero.friendship,g.panelState(now).roster.find(p=>p.uid===25).friendship);
});

test('native faint lowers friendship once, survives reload, and does not penalize another healthy individual',()=>{
 const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(129,5,'fixture',now),other=g.addPokemon(25,5,'fixture',now);
 g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;g.data.owned[uid].moves=[150];g.data.caught[150]=now;
 const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(g.data.owned[uid])},foe:battle.combatant(150,50,[94]),turn:0,captureAttempts:0};
 for(let n=0;n<4&&b.party[uid].hp>0;n++)battle.step(g,b);
 assert.equal(b.party[uid].hp,0);assert.equal(g.data.owned[uid].happiness,69);assert.equal(g.data.owned[other].happiness,70);
 battle.step(g,b);assert.equal(g.data.owned[uid].happiness,69);
 const loaded=new Game(g.data,now+1);battle.step(loaded,loaded.data.battle);assert.equal(loaded.data.owned[uid].happiness,69);
 const p={happiness:0};friendship.faint(p);assert.equal(p.happiness,0);
});

test('travel can reach the friendship threshold but evolution still waits for a real level-up and its time window',()=>{
 const g=ready();g.data.champion=true;g.data.johtoUnlocked=true;
 const uid=g.addPokemon(133,15,'fixture',now),p=g.data.owned[uid];g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;p.happiness=219;
 const state={walk:{at:now,duration:1,path:[{},{}]}};friendship.startTravel(g,state.walk);friendship.finishTravel(g,state,now+1);
 assert.equal(p.happiness,220);assert.ok(g.evolutions(uid,now).filter(e=>e.happiness).every(e=>!e.ready));
 g.gainXp(uid,xpAt(133,16)-p.xp,now+2);assert.ok(g.evolutions(uid,now+2).find(e=>e.to===196).ready);assert.equal(g.evolutions(uid,now+2).find(e=>e.to===197).ready,false);
});

test('current friendship reaches the native Return/Frustration formulas without stat or survival bonuses',()=>{
 const g=new Game({},now);g.data.owned[25].moves=[216,218];g.data.owned[25].happiness=255;g.newWild(now);
 const sim=battle.engine(g,g.data.battle),hero=sim.p1.active[0];
 assert.equal(hero.happiness,255);assert.equal(sim.dex.moves.get('return').basePowerCallback(hero),102);assert.equal(sim.dex.moves.get('frustration').basePowerCallback(hero),1);
 g.data.owned[25].happiness=70;battle.step(g,g.data.battle);assert.equal(hero.happiness,70);
 assert.equal(sim.dex.moves.get('return').basePowerCallback(hero),28);assert.equal(sim.dex.moves.get('frustration').basePowerCallback(hero),74);
 assert.equal(friendship.snapshot({happiness:70}).reaction,'watch');assert.equal(friendship.snapshot({happiness:150}).reaction,'hop');assert.equal(friendship.snapshot({happiness:255}).reaction,'heart');
});
