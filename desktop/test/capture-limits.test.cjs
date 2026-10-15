'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),battle=require('../battle.cjs'),pacing=require('../battle-pacing.js');
const {captureFrame,captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-14T06:00:00Z');
function fixture(fraction=.5){
  const g=new Game({},now,{random:()=>.999999});g.data.owned[25].moves=[150];g.newWild(now-pacing.pauses.encounter);
  g.data.battle.foe=battle.combatant(150,50,[150]);g.data.battle.foe.hp=g.data.battle.foe.maxHp*fraction;
  return g;
}
function fail(g,at){
  const count=g.data.battle.captureAttempts;assert.equal(g.capture(at),false);assert.equal(g.data.battle.captureAttempts,count+1);
  assert.equal(g.data.captureAnimation.caught,false);return g.data.switchUntil;
}

test('capture color boundaries match the HUD and exclude green HP, zero HP and trainer or registered Pokemon',()=>{
  const g=fixture(),b=g.data.battle;
  for(const [fraction,band]of [[.50001,null],[.5,'yellow'],[.20001,'yellow'],[.2,'red'],[.0001,'red'],[0,null]]){
    b.foe.hp=b.foe.maxHp*fraction;assert.equal(g.captureOpportunity()?.band||null,band);
  }
  b.foe.hp=b.foe.maxHp*.5;g.data.caught[150]=now;assert.equal(g.captureOpportunity(),null);delete g.data.caught[150];
  b.kind='trainer';assert.equal(g.captureOpportunity(),null);assert.equal(g.capture(now),false);assert.equal(b.captureAttempts,0);
});

test('skipping yellow HP gives only the three red throws and cannot borrow unused yellow throws',()=>{
  const g=fixture(.2);let at=now;
  for(let attempt=1;attempt<=3;attempt++){
    at=fail(g,at);assert.deepEqual(g.data.battle.captureByHealth,{yellow:0,red:attempt});
    assert.match(captureFrame(g.data.captureAnimation,g.data.captureAnimation.at).text,new RegExp('빨간 체력 '+attempt+'/3'));
  }
  assert.equal(g.capture(at),false);assert.equal(g.captureOpportunity(),null);assert.equal(g.data.battle.captureAttempts,3);
});

test('healing between HP colors, manual switching and reloading never recharge used throws',()=>{
  let g=fixture();let at=fail(g,now);at=fail(g,at);assert.equal(g.captureOpportunity(),null);
  const b=g.data.battle;b.foe.hp=b.foe.maxHp*.2;at=fail(g,at);
  b.foe.hp=b.foe.maxHp*.8;assert.equal(g.captureOpportunity(),null);assert.ok(g.select(7,at));
  at=g.data.switchUntil;b.foe.hp=b.foe.maxHp*.5;assert.equal(g.capture(at),false);assert.deepEqual(b.captureByHealth,{yellow:2,red:1});
  g=new Game(g.data,at,{random:()=>.999999});g.data.battle.foe.hp=g.data.battle.foe.maxHp*.2;
  at=fail(g,at);at=fail(g,at);assert.equal(g.capture(at),false);assert.deepEqual(g.data.battle.captureByHealth,{yellow:2,red:3});
  g.newWild(at);assert.deepEqual(g.data.battle.captureByHealth,{yellow:0,red:0});assert.equal(g.data.battle.captureAttempts,0);
});

test('an unfinished throw cannot consume another quota even if the HP color changes',()=>{
  const g=fixture(),at=fail(g,now),c=structuredClone(g.data.captureAnimation);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.2;
  assert.equal(g.capture(at-1),false);assert.deepEqual(g.data.captureAnimation,c);assert.deepEqual(g.data.battle.captureByHealth,{yellow:1,red:0});
  assert.equal(g.data.battle.captureAttempts,1);fail(g,at);assert.deepEqual(g.data.battle.captureByHealth,{yellow:1,red:1});
});

test('automatic battle scheduling exhausts each color limit and keeps battling without extra balls',()=>{
  const g=fixture(),b=g.data.battle;g.data.workTokens=20000;
  const advance=()=>{const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;};
  for(let steps=0;b.captureByHealth.yellow<2;steps++){assert.ok(steps<8);advance();}
  for(let steps=0;steps<5;steps++)advance();assert.equal(b.captureAttempts,2);assert.equal(g.data.pendingBattle,null);
  const native=battle.engine(g,b).p2.active[0];native.hp=Math.floor(native.maxhp*.2);b.foe.hp=native.hp;
  for(let steps=0;b.captureByHealth.red<3;steps++){assert.ok(steps<9);advance();}
  for(let steps=0;steps<5;steps++)advance();assert.equal(b.captureAttempts,5);assert.deepEqual(b.captureByHealth,{yellow:2,red:3});
  assert.equal(g.data.pendingBattle,null);assert.equal(g.data.battle,b);assert.ok(!g.data.caught[150]);
});

test('old ten-threshold saves count their existing attempts against red HP, including suspended battles',()=>{
  for(const attempts of [0,1,2,6,10]){
    const g=fixture(.1),b=g.data.battle;delete b.captureByHealth;b.captureAttempts=attempts;g.data.suspendedWild=structuredClone(b);
    const reloaded=new Game(g.data,now,{random:()=>.999999}),current=reloaded.data.battle;
    assert.deepEqual(current.captureByHealth,{yellow:0,red:Math.min(attempts,3)});assert.equal(current.captureAttempts,attempts);
    assert.deepEqual(reloaded.data.suspendedWild.captureByHealth,current.captureByHealth);
    assert.equal(!!reloaded.captureOpportunity(),attempts<3);
  }
});

test('an old pending successful throw finishes once while collection and HP remain unchanged before its deadline',()=>{
  const g=fixture(.1);g.data.battle.party[25].hp=2;g.random=()=>0;assert.ok(g.capture(now));
  const c=g.data.captureAnimation,end=c.at+captureTiming(c).duration;delete g.data.battle.captureByHealth;
  for(const event of [g.data.animation,c])for(const key of ['band','bandAttempt','bandLimit'])delete event[key];
  const reloaded=new Game(g.data,now+1,{random:()=>0});assert.deepEqual(reloaded.data.battle.captureByHealth,{yellow:0,red:1});
  assert.equal(reloaded.tick(end-1),false);assert.ok(!reloaded.data.caught[150]);assert.equal(reloaded.snapshot(end-1).hero.currentHp,2);
  assert.equal(captureFrame(reloaded.data.captureAnimation,now).text,'몬스터볼을 던졌다!');
  assert.ok(reloaded.tick(end));assert.ok(reloaded.data.caught[150]);assert.equal(reloaded.data.battle,null);
  assert.equal(Object.values(reloaded.data.owned).filter(p=>p.id===150).length,1);const xp=reloaded.data.owned[25].xp;
  assert.ok(reloaded.tick(end+1));assert.equal(reloaded.data.animation.kind,'switch');assert.equal(reloaded.data.animation.reason,'balance');
  assert.equal(reloaded.data.owned[25].xp,xp);assert.equal(Object.values(reloaded.data.owned).filter(p=>p.id===150).length,1);
});
