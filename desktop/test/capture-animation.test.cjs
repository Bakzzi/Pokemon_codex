'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),battle=require('../battle.cjs');
const {captureTiming,captureFrame}=require('../capture-animation.js');
const {xpAt,species}=require('../pokemon.cjs'),pacing=require('../battle-pacing.js');
// A harmless fixed learnset keeps these capture scenarios independent of AI damage.
species.get(25).learn=[{level:1,move:45}];
const now=Date.parse('2026-10-13T07:00:00Z');
function fixture(passes){
  const g=new Game({},now,{random:()=>.73});g.data.owned[25].moves=[45];g.newWild(now);
  g.data.battle.foe=battle.combatant(19,5,[150]);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;
  let checks=0;g.random=()=>checks++<passes?0:.999999;return g;
}
test('actual shake checks produce failures at 0, 1, 2 or 3 shakes, and success always shows three',()=>{
  for(let passes=0;passes<=4;passes++){
    const g=fixture(passes);assert.equal(g.capture(now),passes===4);
    const c=g.snapshot(now).capture,t=captureTiming(c);
    assert.equal(c.shakes,Math.min(passes,3));assert.equal(t.shakes,Math.min(passes,3));
    assert.equal(g.data.battle?.captureAttempts??1,1);
    assert.equal(captureFrame(c,now+t.resultAt).phase,passes===4?'caught':'escaped');
    assert.ok(!g.data.caught[19]);
    if(passes===4){assert.ok(g.tick(now+t.duration));assert.ok(g.data.caught[19]);}
  }
});
test('a successful throw reveals three separate beats, then sparkles, then its result',()=>{
  const g=fixture(4);g.capture(now);const c=g.snapshot(now).capture,t=captureTiming(c);
  assert.ok(!c.text.includes('성공'));assert.equal(captureFrame(c,now).phase,'throwing');
  for(let i=0;i<3;i++){
    const f=captureFrame(c,now+t.shakeAt+t.shakeEvery*i+100);
    assert.equal(f.phase,'shake');assert.equal(f.shake,i+1);assert.ok(!f.text.includes('성공'));
  }
  assert.equal(captureFrame(c,now+t.resultAt).text,'…!');
  assert.match(captureFrame(c,now+t.messageAt).text,/포획 성공!/);
});
test('capture playback blocks battles and manual changes, survives reload, and preserves a caught ball until the next encounter',()=>{
  let g=fixture(4);g.data.workTokens=500;g.capture(now);
  const c=structuredClone(g.data.captureAnimation),t=captureTiming(c),count=Object.keys(g.data.owned).length;
  assert.equal(g.tick(now+t.duration-1),false);assert.equal(g.data.workTokens,500);
  assert.equal(g.select(7,now+1),false);assert.ok(g.challenge(0,now+1));assert.ok(g.cancelChallenge(now+2));
  g=new Game(g.data,now+1000,{random:()=>.73});assert.equal(g.tick(now+t.duration-1),false);
  assert.deepEqual(g.snapshot(now+1000).capture,c);assert.equal(Object.keys(g.data.owned).length,count);
  assert.equal(g.data.battle.kind,'wild');g.data.workTokens=0;assert.ok(g.tick(now+t.duration));assert.equal(g.data.battle,null);
  assert.equal(g.tick(now+t.duration+1),false);assert.equal(Object.keys(g.data.owned).length,count+1);
  assert.ok(g.select(7,now+t.duration+1));assert.deepEqual(g.snapshot(now+t.duration+1).capture,c);
  g.data.workTokens=250;assert.ok(g.tick(g.data.switchUntil));assert.equal(g.snapshot().capture,null);
  assert.ok(g.data.battle);assert.equal(Object.keys(g.data.owned).length,count+1);
});
test('a failed throw waits for the breakout before resuming the same battle and capture threshold',()=>{
  const g=fixture(2),b=g.data.battle,hp=b.foe.hp;g.data.workTokens=750;g.random=()=>.999999;
  const at=g.data.switchUntil;assert.ok(g.tick(at));const c=g.snapshot(at).capture,t=captureTiming(c);
  assert.equal(g.tick(at+t.duration-1),false);assert.equal(g.data.battle,b);assert.equal(b.foe.hp,hp);
  assert.equal(b.captureAttempts,1);assert.equal(g.data.workTokens,500);assert.ok(!g.data.caught[19]);
  assert.match(captureFrame(c,at+t.resultAt).text,/아쉽다!/);
  assert.ok(g.tick(at+t.duration));assert.equal(g.data.battle,b);assert.equal(b.captureAttempts,1);
  assert.equal(g.data.workTokens,250);assert.equal(g.snapshot().capture,null);
});

function outcomeState(g,at){
  const s=g.snapshot(at);
  return structuredClone({hero:s.hero,level:s.level,xp:s.xp,experienceBoost:s.experienceBoost,caughtCount:s.caughtCount,battles:s.battles,owned:g.data.owned,caught:g.data.caught,inventory:g.data.inventory,journal:g.data.journal,totals:g.data.adventure.totals});
}

test('successful capture keeps injured HP, status, level, collection and rewards unchanged through the entire animation',()=>{
  const g=fixture(4),p=g.data.owned[25],hero=g.data.battle.party[25];
  p.xp=xpAt(p.id,6)-1;hero.hp=3;hero.status='burn';
  const before=outcomeState(g,now),moves=[...p.moves],foe=structuredClone(g.data.battle.foe);g.data.workTokens=500;
  assert.ok(g.capture(now));const c=g.data.captureAnimation,t=captureTiming(c),end=c.at+t.duration;
  for(const age of [0,t.shakeAt+100,t.shakeAt+t.shakeEvery+100,t.shakeAt+2*t.shakeEvery+100,t.resultAt,t.messageAt,t.duration-1]){
    assert.equal(g.tick(c.at+age),false);assert.deepEqual(outcomeState(g,c.at+age),before);assert.equal(g.data.workTokens,500);
  }
  assert.ok(g.tick(end));const after=outcomeState(g,end);
  assert.equal(g.data.battle,null);assert.equal(g.data.pendingBattle,null);assert.deepEqual(g.data.captureAnimation,c);
  assert.equal(after.hero.currentHp,after.hero.maxHp);assert.ok(!after.hero.status);assert.equal(after.caughtCount,before.caughtCount+1);
  assert.ok(after.level>before.level);assert.ok(after.xp>before.xp);assert.equal(after.battles,before.battles+1);
  assert.equal(g.data.owned[25].happiness,before.owned[25].happiness+5*(after.level-before.level));assert.ok(moves.every(id=>g.data.owned[25].moves.includes(id)));
  assert.equal(g.data.owned[19].ability,foe.ability);assert.equal(g.data.owned[19].gender,foe.gender);
  assert.equal(g.data.journal.filter(e=>e.kind==='catch'&&e.id===19).length,1);
  for(const uid of [1,4,7])assert.deepEqual(g.data.owned[uid],before.owned[uid]);
  assert.equal(g.data.workTokens,500);
});

test('pending success survives repeated reloads without reroll, early rewards or duplicate post-processing',()=>{
  let g=fixture(4);g.data.battle.party[25].hp=2;const before=outcomeState(g,now);assert.ok(g.capture(now));
  const c=structuredClone(g.data.captureAnimation),end=c.at+captureTiming(c).duration;
  for(const at of [now+100,now+1800,end-1]){
    g=new Game(g.data,at,{random:()=>{throw Error('capture result must not be rerolled');}});
    assert.equal(g.capture(at),false);assert.equal(g.tick(at),false);assert.deepEqual(outcomeState(g,at),before);
    assert.deepEqual(g.data.captureAnimation,c);assert.equal(g.data.battle.captureAttempts,1);
  }
  g.random=()=>0;assert.ok(g.tick(end));const after=outcomeState(g,end);
  assert.ok(Object.keys(g.data.inventory).length);assert.equal(g.data.adventure.totals.wins,(before.totals.wins||0)+1);
  g=new Game(g.data,end+1,{random:()=>{throw Error('completed result must not be replayed');}});
  assert.equal(g.tick(end+1),false);assert.equal(g.capture(end+1),false);assert.deepEqual(outcomeState(g,end+1),after);
  assert.equal(Object.values(g.data.owned).filter(p=>p.id===19).length,1);
});

test('the attack lead-in is included in the delayed capture completion deadline',()=>{
  const g=fixture(4);g.data.battle.party[25].hp=4;
  g.animate('attack',{actor:'hero',moveId:33,text:'피카츄의 몸통박치기!'},now);const leadIn=structuredClone(g.data.animation),before=outcomeState(g,now);
  assert.ok(g.capture(now));const c=g.data.captureAnimation,t=captureTiming(c);
  assert.equal(c.at,now+pacing.duration(leadIn));assert.deepEqual(c.leadIn,leadIn);
  assert.equal(g.tick(now+t.duration),false);assert.deepEqual(outcomeState(g,now+t.duration),before);
  assert.equal(g.tick(c.at+t.duration-1),false);assert.ok(g.tick(c.at+t.duration));assert.ok(g.data.caught[19]);
});

test('failed throws leave ownership, XP, recovery and victory rewards unchanged',()=>{
  const g=fixture(2);g.data.battle.party[25].hp=3;g.data.battle.party[25].status='poison';
  const before=outcomeState(g,now);assert.equal(g.capture(now),false);const c=g.data.captureAnimation,t=captureTiming(c);
  for(const age of [0,t.shakeAt+100,t.resultAt,t.duration]){
    assert.equal(g.tick(now+age),false);assert.deepEqual(outcomeState(g,now+age),before);
  }
  assert.equal(g.data.pendingBattle,null);assert.equal(g.data.battle.kind,'wild');
});

test('old saves with an already-committed caught ball do not replay capture rewards',()=>{
  const g=fixture(4);assert.ok(g.capture(now));assert.ok(g.tick(g.data.switchUntil));
  const before=outcomeState(g,g.data.switchUntil),legacy=structuredClone(g.data);delete legacy.pendingBattle;
  const reloaded=new Game(legacy,g.data.switchUntil+1,{random:()=>{throw Error('legacy result must not be replayed');}});
  assert.equal(reloaded.tick(g.data.switchUntil+1),false);assert.deepEqual(outcomeState(reloaded,g.data.switchUntil+1),before);
});
