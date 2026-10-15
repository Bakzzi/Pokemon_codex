'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),training=require('../training-device.cjs'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-14T12:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.data.badges=['brock','misty','surge','erika'];g.data.manualSelection=true;return g;}
function advance(g){return g.tick(Math.max(now,g.data.switchUntil,g.nextTick));}
function snorlax(){const g=fixture();g.data.trainingDevice.fluteObtainedAt=now;assert.ok(g.challenge('road-snorlax',now));return g;}

test('four badges and large dex never bypass the Snorlax gate, and ordinary Snorlax ownership is insufficient',()=>{
  const g=fixture();for(let id=1;id<=151;id++)g.data.caught[id]=now;
  assert.equal(g.canChallenge(4),false);assert.equal(g.challenge(4,now),false);assert.equal(g.panelState(now).gymAccess[4],false);assert.equal(training.has(g),false);assert.equal(g.data.pendingChallenge,null);
  assert.ok(g.canChallenge('rocket-grunt'));assert.equal(g.canChallenge('road-snorlax'),false);g.data.badges=g.data.badges.filter(id=>id!=='surge');assert.equal(g.canChallenge('rocket-grunt'),false);g.data.trainingDevice.fluteObtainedAt=now;assert.ok(g.canChallenge('road-snorlax'));
});

test('a knockout grants device and fifth-gym access together after fainting playback, without catching or a fifty-species quota',()=>{
  const g=snorlax();g.data.battle.foe.hp=0;assert.ok(advance(g));assert.equal(g.data.animation.kind,'faint');assert.equal(training.has(g),false);assert.equal(g.canChallenge(4),false);
  assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(advance(g));assert.ok(g.data.trainingDevice.snorlaxWonAt);assert.ok(training.has(g));assert.ok(g.canChallenge(4));assert.ok(g.kantoCaughtCount()<50);assert.ok(!g.data.caught[143]);assert.match(g.data.animation.text,/학습장치.*독수/);
  assert.ok(g.challenge(4,g.data.animation.at));assert.equal(g.data.pendingChallenge.index,4);assert.equal(g.data.battle,null);assert.ok(advance(g));assert.equal(g.data.battle.bossIndex,4);
});

test('saved successful capture grants both unlocks only after full playback and never duplicates the reward',()=>{
  let g=snorlax();g.data.battle.foe.hp=1;g.random=()=>0;assert.ok(g.capture(g.data.switchUntil));const end=g.data.captureAnimation.at+captureTiming(g.data.captureAnimation).duration;
  g=new Game(g.data,end-1);assert.equal(g.tick(end-1),false);assert.equal(training.has(g),false);assert.equal(g.canChallenge(4),false);assert.ok(!g.data.caught[143]);assert.ok(g.tick(end));assert.ok(training.has(g));assert.ok(g.canChallenge(4));assert.ok(g.data.caught[143]);assert.equal(g.data.trainingDevice.obtainedAt,g.data.trainingDevice.snorlaxWonAt);
  const at=g.data.trainingDevice.obtainedAt;g=new Game(g.data,end+1);advance(g);assert.equal(g.data.trainingDevice.obtainedAt,at);assert.equal(g.data.journal.filter(e=>e.kind==='device').length,1);assert.equal(g.data.journal.filter(e=>e.kind==='catch'&&e.id===143).length,1);
});

test('failed capture, party defeat, draw and merely seeing Snorlax leave both rewards locked',()=>{
  let g=snorlax();g.data.battle.foe.hp=1;g.random=()=>.9999;assert.equal(g.capture(g.data.switchUntil),false);assert.equal(training.has(g),false);assert.equal(g.canChallenge(4),false);
  for(const p of Object.values(g.data.battle.party))p.hp=0;advance(g);advance(g);assert.equal(g.data.battle,null);assert.equal(training.has(g),false);assert.equal(g.canChallenge(4),false);
  g=snorlax();g.deferBattle('draw',g.data.switchUntil);assert.ok(advance(g));assert.equal(training.has(g),false);assert.equal(g.canChallenge(4),false);assert.ok(g.canChallenge('road-snorlax'));
});

test('legacy rewards and later-gym progress are preserved, but old ordinary captures and four badges grant nothing',()=>{
  const saved=fixture();delete saved.data.trainingDevice.routeRevision;saved.data.badges.push('koga');let loaded=new Game(saved.data,now+1);assert.ok(training.routeOpen(loaded));assert.ok(loaded.canChallenge(5));assert.equal(training.has(loaded),false);assert.equal(loaded.data.trainingDevice.snorlaxWonAt,null);
  const passed=fixture();delete passed.data.trainingDevice.routeRevision;passed.data.trainingDevice.snorlaxWonAt=now;loaded=new Game(passed.data,now+1);assert.ok(training.has(loaded));assert.ok(loaded.canChallenge(4));const reward=loaded.data.trainingDevice.obtainedAt;loaded=new Game(loaded.data,now+2);assert.equal(loaded.data.trainingDevice.obtainedAt,reward);assert.equal(loaded.data.journal.filter(e=>e.kind==='device').length,1);
  const oldDevice=fixture();delete oldDevice.data.trainingDevice.routeRevision;oldDevice.data.trainingDevice.obtainedAt=now;oldDevice.data.trainingDevice.learnerUid=7;loaded=new Game(oldDevice.data,now+1);assert.ok(loaded.canChallenge(4));assert.equal(loaded.data.trainingDevice.obtainedAt,now);assert.equal(loaded.data.trainingDevice.learnerUid,7);
  const ordinary=fixture();delete ordinary.data.trainingDevice.routeRevision;ordinary.addPokemon(143,30,'catch',now);loaded=new Game(ordinary.data,now+1);assert.equal(training.has(loaded),false);assert.equal(loaded.canChallenge(4),false);
});
