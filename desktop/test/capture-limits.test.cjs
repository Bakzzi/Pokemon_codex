'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),battle=require('../battle.cjs');
const {captureFrame,captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-14T06:00:00Z');
function fixture(fraction=.5,id=150){
  const g=new Game({},now,{random:()=>.999999});g.data.owned[25].moves=[150];
  g.newWild(now-10000);g.data.battle.foe=battle.combatant(id,50,[150]);
  g.data.battle.foe.hp=g.data.battle.foe.maxHp*fraction;return g;
}
function fail(g,at){
  const count=g.data.battle.captureAttempts;assert.equal(g.capture(at),false);
  assert.equal(g.data.battle.captureAttempts,count+1);assert.equal(g.data.captureAnimation.caught,false);return g.data.switchUntil;
}
test('capture starts at half HP and excludes zero HP, trainer and registered Pokemon',()=>{
  const g=fixture(),b=g.data.battle;
  for(const [fraction,allowed]of [[.50001,false],[.5,true],[.20001,true],[.2,true],[.0001,true],[0,false]]){
    b.foe.hp=b.foe.maxHp*fraction;assert.equal(!!g.captureOpportunity(),allowed);
  }
  b.foe.hp=b.foe.maxHp*.5;g.data.caught[150]=now;assert.equal(g.captureOpportunity(),null);delete g.data.caught[150];
  b.kind='trainer';assert.equal(g.captureOpportunity(),null);assert.equal(g.capture(now),false);assert.equal(b.captureAttempts,0);
});
test('common and uncommon Pokemon get five balls; rare, legendary and mythical get ten at either HP color',()=>{
  for(const [id,limit]of [[19,5],[35,5],[142,10],[144,10],[151,10]])for(const fraction of [.5,.2]){
    const g=fixture(fraction,id);let at=now;
    for(let attempt=1;attempt<=limit;attempt++){
      at=fail(g,at);assert.equal(g.data.captureAnimation.attemptLimit,limit);
      assert.match(captureFrame(g.data.captureAnimation,g.data.captureAnimation.at).text,new RegExp(attempt+'/'+limit));
    }
    assert.equal(g.capture(at),false);assert.equal(g.captureOpportunity(),null);assert.equal(g.data.battle.captureAttempts,limit);
  }
});
test('healing, HP color changes, switching and reload retain the same encounter quota',()=>{
  let g=fixture(.5,19),at=fail(g,now);at=fail(g,at);const b=g.data.battle;
  b.foe.hp=b.foe.maxHp*.8;assert.ok(g.captureOpportunity());assert.ok(g.select(7,at));at=g.data.switchUntil;at=fail(g,at);
  g=new Game(g.data,at,{random:()=>.999999});g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;
  at=fail(g,at);at=fail(g,at);assert.equal(g.capture(at),false);assert.equal(g.data.battle.captureAttempts,5);
  g.newWild(at);assert.equal(g.data.battle.captureAttempts,0);assert.ok(!g.data.battle.captureStarted);
});
test('an unfinished throw cannot consume another attempt even if HP changes',()=>{
  const g=fixture(),at=fail(g,now),c=structuredClone(g.data.captureAnimation);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.2;
  assert.equal(g.capture(at-1),false);assert.deepEqual(g.data.captureAnimation,c);assert.equal(g.data.battle.captureAttempts,1);
  fail(g,at);assert.equal(g.data.battle.captureAttempts,2);
});
test('automatic throws replace player attacks until the entire quota is used, then attacks resume',()=>{
  for(const [id,limit]of [[19,5],[144,10]]){
    const g=fixture(.5,id),b=g.data.battle;g.data.owned[25].moves=[33];b.party[25]=g.memberCombatant(g.data.owned[25]);g.data.workTokens=50000;
    const pp=b.party[25].pp[33],foeHp=b.foe.hp,heroMoves=[];
    for(let steps=0;b.captureAttempts<limit;steps++){
      assert.ok(steps<limit*5);assert.ok(g.tick(Math.max(now,g.nextTick,g.data.switchUntil)));
      if(g.data.animation.kind==='attack'&&g.data.animation.actor==='hero')heroMoves.push(g.data.animation.moveId);
      assert.equal(b.foe.hp,foeHp);assert.equal(b.party[25].pp[33],pp);
    }
    assert.deepEqual(heroMoves,[]);assert.equal(b.foe.pp[150],40-(limit-1));
    for(let steps=0;b.party[25].pp[33]===pp;steps++){assert.ok(steps<5);assert.ok(g.tick(Math.max(now,g.nextTick,g.data.switchUntil)));}
    assert.equal(b.captureAttempts,limit);assert.ok(b.foe.hp<foeHp);assert.ok(!g.data.caught[id]);
  }
});
test('legacy and suspended saves preserve total attempts without color quotas',()=>{
  for(const attempts of [0,1,2,6,10]){
    const g=fixture(.1),b=g.data.battle;b.captureByHealth={yellow:2,red:3};b.captureAttempts=attempts;g.data.suspendedWild=structuredClone(b);
    const reloaded=new Game(g.data,now,{random:()=>.999999}),current=reloaded.data.battle;
    assert.equal(current.captureAttempts,attempts);assert.equal(current.captureByHealth,undefined);
    assert.equal(reloaded.data.suspendedWild.captureAttempts,attempts);assert.equal(!!reloaded.captureOpportunity(),attempts<10);
  }
});
test('a legacy pending successful throw completes exactly once without early recovery or rewards',()=>{
  const g=fixture(.1);g.data.battle.party[25].hp=2;g.random=()=>0;assert.ok(g.capture(now));
  const c=g.data.captureAnimation,end=c.at+captureTiming(c).duration;delete c.attemptLimit;delete g.data.animation.attemptLimit;
  g.data.battle.captureByHealth={yellow:0,red:1};
  const reloaded=new Game(g.data,now+1,{random:()=>0});assert.equal(reloaded.data.battle.captureAttempts,1);
  assert.equal(reloaded.tick(end-1),false);assert.ok(!reloaded.data.caught[150]);assert.equal(reloaded.snapshot(end-1).hero.currentHp,2);
  assert.equal(captureFrame(reloaded.data.captureAnimation,now).text,'몬스터볼을 던졌다!');
  assert.ok(reloaded.tick(end));assert.ok(reloaded.data.caught[150]);assert.equal(reloaded.data.battle,null);
  assert.equal(Object.values(reloaded.data.owned).filter(p=>p.id===150).length,1);
});