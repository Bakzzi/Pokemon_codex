'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),training=require('../training-device.cjs'),{data,pickWild,wildDistribution,rarity,wildMinimum,wildEligible,xpAt,learnedMoves}=require('../pokemon.cjs'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-14T10:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.data.badges=['brock','misty','surge'];return g;}
function advance(g){assert.ok(g.tick(Math.max(now,g.data.switchUntil,g.nextTick)));}
function finishStage(g){const id=g.data.battle.storyId;let i=0;while(g.data.battle?.storyId===id&&!g.data.pendingBattle){assert.ok(i++<10);g.defeatOpponent(Math.max(now,g.data.switchUntil));}}
function rocket(g){assert.ok(g.challenge(training.nextRocket(g),Math.max(now,g.data.switchUntil)));let i=0;while(g.data.battle){assert.ok(i++<20);if(g.data.pendingBattle)advance(g);else g.defeatOpponent(Math.max(now,g.data.switchUntil));}}
function erika(g){assert.ok(g.challenge(3,Math.max(now,g.data.switchUntil,g.nextTick)));let i=0;while(g.data.battle){assert.ok(i++<10);g.defeatOpponent(g.data.switchUntil);}assert.ok(g.data.trainingDevice.fluteObtainedAt);}

test('only the Orange Badge opens the hideout; no other badge or pending request bypasses the new Erika gate',()=>{
  const g=new Game({},now);g.data.badges=['brock','misty','erika'];assert.equal(g.canChallenge('rocket-grunt'),false);
  g.data.badges=['brock','misty','surge'];assert.ok(g.canChallenge('rocket-grunt'));assert.equal(g.challenge(3,now),false);assert.equal(g.data.pendingChallenge,null);assert.equal(training.awardFlute(g,now),false);
  assert.equal(g.canChallenge('rocket-duo'),false);assert.equal(g.canChallenge('rocket-giovanni'),false);assert.equal(g.canChallenge('road-snorlax'),false);
});

test('an Erika reservation waits for the Rocket result and her last fainting playback before awarding the flute exactly once',()=>{
  let g=fixture();rocket(g);assert.ok(g.challenge(3,g.data.animation.at));assert.equal(g.data.pendingChallenge.index,3);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);
  g=new Game(g.data,g.data.animation.at+1);assert.ok(g.tick(g.data.switchUntil));assert.equal(g.data.battle.bossIndex,3);
  while(g.data.battle.foeIndex<g.battleBoss().team.length-1)g.defeatOpponent(g.data.switchUntil);
  g.data.battle.foe.hp=0;advance(g);assert.equal(g.data.animation.kind,'faint');assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.canChallenge('road-snorlax'),false);
  const end=g.data.switchUntil;g=new Game(g.data,end-1);assert.equal(g.tick(end-1),false);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.ok(g.tick(end));assert.ok(g.data.badges.includes('erika'));assert.ok(g.data.trainingDevice.fluteObtainedAt);
  const stamp=g.data.trainingDevice.fluteObtainedAt;g=new Game(g.data,end+1);assert.equal(g.data.trainingDevice.fluteObtainedAt,stamp);assert.equal(g.data.journal.filter(e=>e.kind==='item'&&e.text.includes('포켓몬피리')).length,1);assert.equal(training.awardFlute(g,end+1),false);
});

test('revision two upgrades preserve victories, active battles and old flutes, and backfill an already-earned Erika reward once',()=>{
  let g=fixture();g.data.badges.push('erika');g.data.trainingDevice.storyRevision=2;const before=structuredClone(g.data),owned=structuredClone(g.data.owned);g=new Game(g.data,now+1);
  assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.data.badges,before.badges);assert.equal(g.data.trainingDevice.storyRevision,3);assert.equal(g.data.trainingDevice.rocketWonAt,null);assert.equal(g.data.trainingDevice.gruntWonAt,null);assert.equal(g.data.trainingDevice.fluteObtainedAt,now+1);
  g=new Game(g.data,now+2);assert.equal(g.data.journal.filter(e=>e.kind==='item'&&e.text.includes('포켓몬피리')).length,1);assert.equal(g.data.trainingDevice.fluteObtainedAt,now+1);
  const old=fixture();old.data.trainingDevice.storyRevision=2;old.data.trainingDevice.fluteObtainedAt=now-1;old.data.trainingDevice.rocketWonAt=now-2;old.data.trainingDevice.gruntWonAt=now-4;old.data.trainingDevice.duoWonAt=now-3;
  const upgraded=new Game(old.data,now+1);for(const key of ['fluteObtainedAt','rocketWonAt','gruntWonAt','duoWonAt'])assert.equal(upgraded.data.trainingDevice[key],old.data.trainingDevice[key]);
  const active=fixture();active.data.trainingDevice.rocketWonAt=now;assert.ok(active.challenge(3,now));active.data.trainingDevice.rocketWonAt=null;active.data.trainingDevice.storyRevision=2;const battle=structuredClone(active.data.battle),animation=structuredClone(active.data.animation);
  const restored=new Game(active.data,now+1);assert.deepEqual(restored.data.battle,battle);assert.deepEqual(restored.data.animation,animation);while(restored.data.battle)restored.defeatOpponent(restored.data.switchUntil);assert.ok(restored.data.trainingDevice.fluteObtainedAt);assert.equal(restored.data.trainingDevice.rocketWonAt,null);
});

test('ordinary wild pools exclude Snorlax in both generations, every category, and all champion bonus tiers',()=>{
  for(const gen of [1,2])for(const champion of [false,true])for(const minimumLevel of [0,71,81,91]){
    const rates=wildDistribution(gen,100,{champion,minimumLevel}).rates;let floor=0;
    for(const tier of ['mythical','legendary','rare','uncommon','common']){
      const roll=floor+rates[tier]/2;floor+=rates[tier];
      const pool=data.pokemon.filter(p=>wildEligible(p,gen,100)&&rarity(p)===tier),seen=new Set();
      for(let i=0;i<pool.length;i++){let draw=0;const id=pickWild(gen,()=>draw++===0?roll:(i+.5)/pool.length,100,{champion,minimumLevel});assert.notEqual(id,143);seen.add(id);}
      assert.deepEqual(seen,new Set(pool.map(p=>p.id)));
    }
  }
});

test('the Orange Badge unlocks Rocket, whose three stages retain party HP and PP and unlock Erika without awarding a flute',()=>{
  const g=fixture();g.data.badges.pop();assert.equal(g.challenge('rocket-grunt',now),false);g.data.badges.push('surge');assert.equal(g.challenge(3,now),false);assert.equal(g.challenge('rocket-duo',now),false);assert.equal(g.challenge('rocket-giovanni',now),false);
  const p=g.data.owned[25];p.level=60;p.xp=xpAt(25,60);p.moves=learnedMoves(25,60);g.challenge('rocket-grunt',now);const b=g.data.battle;b.party[25].hp=7;const move=b.party[25].moves[0];b.party[25].pp[move]=1;
  finishStage(g);assert.ok(g.data.trainingDevice.gruntWonAt);assert.equal(g.data.trainingDevice.duoWonAt,null);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(b.storyId,'rocket-grunt');assert.equal(g.data.pendingBattle.kind,'story-next');
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);assert.equal(b.storyId,'rocket-duo');assert.equal(b.foe.id,109);assert.equal(b.party[25].hp,7);assert.equal(b.party[25].pp[move],1);assert.deepEqual(training.battles['rocket-duo'].team.map(p=>[p.id,p.level]),[[109,25],[52,25],[23,25]]);
  g.data.pendingBattle=null;finishStage(g);advance(g);assert.equal(b.storyId,'rocket-giovanni');g.data.pendingBattle=null;finishStage(g);
  assert.equal(g.data.battle,null);assert.equal(g.data.badges.length,3);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.panelState(now).inventory.filter(i=>i.id==='poke-flute').length,0);assert.match(g.data.animation.text,/민화/);assert.ok(!/피리/.test(g.data.animation.text));assert.equal(g.data.adventure.totals.story,3);assert.equal(g.challenge('rocket-grunt',g.data.switchUntil),false);assert.ok(g.canChallenge(3));erika(g);assert.equal(g.data.badges.length,4);assert.equal(g.panelState(now).inventory.filter(i=>i.id==='poke-flute').length,1);assert.match(g.data.animation.text,/민화.*포켓몬피리/);
});

test('a loss at stage two keeps stage one complete and restarts only the unfinished stage with healed picked partners',()=>{
  let g=fixture();g.challenge('rocket-grunt',now);finishStage(g);advance(g);assert.equal(g.data.battle.storyId,'rocket-duo');
  for(const p of Object.values(g.data.battle.party))p.hp=0;advance(g);advance(g);assert.equal(g.data.battle,null);assert.equal(g.data.trainingDevice.duoWonAt,null);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);
  g=new Game(g.data,g.data.switchUntil);assert.equal(g.canChallenge('rocket-grunt'),false);assert.equal(g.canChallenge('rocket-duo'),true);assert.equal(g.canChallenge('rocket-giovanni'),false);assert.ok(g.challenge('rocket-duo',g.data.switchUntil));assert.ok(Object.values(g.data.battle.party).every(p=>p.hp===p.maxHp));
});

test('a simultaneous final knockout replaces the fainted hero before the next Rocket stage without duplicate XP or progress',()=>{
  const g=fixture();g.challenge('rocket-grunt',now);g.defeatOpponent(g.data.switchUntil);g.data.battle.foe.hp=0;g.data.battle.party[25].hp=0;
  advance(g);assert.equal(g.data.animation.kind,'faint');advance(g);assert.equal(g.data.pendingBattle.kind,'story-next');const wins=g.data.battles,xp=g.data.adventure.totals.xp;
  advance(g);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.pendingBattle.kind,'story-next');assert.notEqual(g.data.activeId,25);advance(g);assert.equal(g.data.battle.storyId,'rocket-duo');assert.equal(g.data.battles,wins);assert.equal(g.data.adventure.totals.xp,xp);
});

test('the flute is required and reusable, failed capture or defeat leaves Snorlax available, and a knockout never registers it',()=>{
  const g=fixture();assert.equal(g.challenge('road-snorlax',now),false);rocket(g);assert.equal(g.challenge('road-snorlax',g.data.switchUntil),false);erika(g);const flute=g.data.trainingDevice.fluteObtainedAt;assert.ok(g.challenge('road-snorlax',g.data.switchUntil));assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.battle.foe.id,143);assert.match(g.data.animation.text,/피리/);assert.equal(g.challenge('road-snorlax',g.data.switchUntil),false);
  g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;g.random=()=>.9999;assert.equal(g.capture(g.data.switchUntil),false);assert.equal(g.data.battle.captureByHealth.red,1);assert.equal(g.data.trainingDevice.snorlaxWonAt,null);
  for(const p of Object.values(g.data.battle.party))p.hp=0;advance(g);advance(g);assert.equal(g.data.battle,null);assert.equal(g.data.trainingDevice.snorlaxWonAt,null);assert.ok(g.canChallenge('road-snorlax'));assert.ok(g.challenge('road-snorlax',g.data.switchUntil));assert.equal(g.data.battle.captureByHealth.red,0);
  g.data.battle.foe.hp=0;advance(g);advance(g);assert.ok(g.data.trainingDevice.snorlaxWonAt);assert.ok(!g.data.caught[143]);assert.ok(g.canChallenge('road-snorlax'));assert.equal(g.data.trainingDevice.fluteObtainedAt,flute);
});

test('a Snorlax capture unlocks the road only after its full saved animation, then cannot be captured again',()=>{
  let g=fixture();rocket(g);erika(g);g.challenge('road-snorlax',g.data.switchUntil);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.2;g.random=()=>0;const xp=g.data.owned[25].xp,story=g.data.adventure.totals.story;
  assert.ok(g.capture(g.data.switchUntil));const c=g.data.captureAnimation,end=c.at+captureTiming(c).duration;assert.equal(g.data.trainingDevice.snorlaxWonAt,null);assert.ok(!g.data.caught[143]);g=new Game(g.data,c.at+1);assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[25].xp,xp);assert.equal(g.data.trainingDevice.snorlaxWonAt,null);
  assert.ok(g.tick(end));assert.ok(g.data.trainingDevice.snorlaxWonAt);assert.ok(g.data.caught[143]);assert.equal(g.data.adventure.totals.story,story+1);assert.equal(g.canChallenge('road-snorlax'),false);assert.equal(Object.values(g.data.owned).filter(p=>p.id===143).length,1);const after=structuredClone(g.data.owned);
  g=new Game(g.data,end+1);g.tick(end+1);assert.deepEqual(g.data.owned,after);assert.equal(g.data.journal.filter(e=>e.kind==='catch'&&e.id===143).length,1);
});

test('migration preserves earned legacy rewards and queues, and keeps a legacy Snorlax native turn while enabling capture',()=>{
  let g=fixture();const original=structuredClone(g.data.owned);g.data.trainingDevice={rocketWonAt:now,snorlaxWonAt:now,obtainedAt:now,learnerUid:7};g=new Game(g.data,now+1);assert.deepEqual(g.data.owned,original);assert.equal(g.data.trainingDevice.gruntWonAt,now);assert.equal(g.data.trainingDevice.duoWonAt,now);assert.equal(g.data.trainingDevice.fluteObtainedAt,now);assert.equal(g.data.trainingDevice.learnerUid,7);
  const waiting=fixture();delete waiting.data.trainingDevice.storyRevision;waiting.data.pendingChallenge={index:'rocket-giovanni',queuedAt:now};const queued=new Game(waiting.data,now);assert.equal(queued.data.pendingChallenge.index,'rocket-grunt');assert.equal(queued.data.pendingChallenge.queuedAt,now);
  const fighting=fixture();rocket(fighting);erika(fighting);fighting.data.workTokens=2000;fighting.challenge('road-snorlax',fighting.data.switchUntil);advance(fighting);assert.ok(fighting.data.battle.sim);fighting.data.battle.kind='trainer';delete fighting.data.trainingDevice.storyRevision;
  const sim=JSON.parse(JSON.stringify(fighting.data.battle.sim)),animation=JSON.parse(JSON.stringify(fighting.data.animation)),party=JSON.parse(JSON.stringify(fighting.data.battle.party));const restored=new Game(fighting.data,fighting.data.animation.at+1);
  assert.equal(restored.data.battle.kind,'wild');assert.deepEqual(restored.data.battle.sim,sim);assert.deepEqual(restored.data.animation,animation);assert.deepEqual(restored.data.battle.party,party);assert.equal(restored.data.battle.simBoss,'road-snorlax');
  const turn=restored.data.battle.turn;advance(restored);assert.equal(restored.data.battle.turn,turn+1);assert.equal(restored.data.animation.actor,'foe');
});
