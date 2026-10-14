'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{combatant}=require('../battle.cjs'),{data}=require('../pokemon.cjs');
const {captureTiming}=require('../capture-animation.js'),pacing=require('../battle-pacing.js');
const now=Date.parse('2026-10-14T03:00:00Z');
function fixture(caught=true){
  const g=new Game({},now,{random:()=>.73});g.newWild(now-pacing.pauses.encounter);
  g.data.battle.foe=combatant(19,5,[150]);if(caught)g.data.caught[19]=now;
  return g;
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}

test('a queued challenge preserves an action, then waits for faint and victory before any new wild encounter',()=>{
  const g=fixture(),wild=g.data.battle;g.data.workTokens=5000;
  g.animate('attack',{moveId:33,actor:'hero',text:'피카츄의 몸통박치기!'},now);
  const action=structuredClone(g.data.animation),tokens=g.data.workTokens,slots=[...g.data.slots];
  assert.ok(g.challenge(0,now+1));assert.equal(g.data.battle,wild);assert.deepEqual(g.data.animation,action);
  assert.equal(g.tick(g.data.switchUntil-1),false);assert.equal(g.data.workTokens,tokens);
  wild.foe.hp=0;advance(g);assert.equal(g.data.animation.kind,'faint');assert.equal(g.data.battle,wild);
  advance(g);assert.equal(g.data.animation.kind,'result');assert.equal(g.data.battle,null);
  const xp=g.data.owned[g.data.activeId].xp;
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);
  assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.battle.bossIndex,0);assert.equal(g.data.battle.foe.id,74);
  assert.equal(g.data.pendingChallenge,null);assert.equal(g.data.suspendedWild,null);assert.equal(g.data.workTokens,tokens);
  assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.deepEqual(g.data.slots,slots);
  assert.equal(g.data.journal.filter(e=>e.text==='웅 체육관 도전 시작').length,1);
  assert.ok(g.abandon(g.data.switchUntil));assert.equal(g.data.battle,null);
});

test('capture completion and its full result animation precede the queued challenge across reload',()=>{
  let g=fixture(false);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;g.random=()=>0;
  assert.ok(g.challenge(0,now));assert.ok(g.capture(now));
  const capture=structuredClone(g.data.captureAnimation),end=capture.at+captureTiming(capture).duration,count=Object.keys(g.data.owned).length;
  g=new Game(g.data,now+1000,{random:()=>.73});assert.equal(g.snapshot(now+1000).pendingChallenge.name,'웅 체육관');
  assert.equal(g.tick(end-1),false);assert.deepEqual(g.data.captureAnimation,capture);assert.equal(g.data.battle,null);
  assert.ok(g.tick(end));assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.captureAnimation,null);
  assert.equal(Object.keys(g.data.owned).length,count);assert.ok(g.data.caught[19]);
});

test('a defeat finishes before a queued challenge starts with the selected team recovered and no token cost',()=>{
  const g=fixture();assert.ok(g.challenge(0,now));
  for(const p of Object.values(g.data.battle.party))p.hp=0;
  advance(g);assert.equal(g.data.animation.kind,'faint');advance(g);
  assert.equal(g.data.battle,null);assert.equal(g.data.animation.kind,'result');assert.match(g.data.animation.text,/패배/);
  assert.equal(g.tick(g.data.switchUntil-1),false);advance(g);
  assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.workTokens,0);
  assert.ok(Object.values(g.data.battle.party).every(p=>p.hp===p.maxHp));
});

test('one reservation is idempotent, cancellable, and does not allow locked gyms or a locked league',()=>{
  const g=fixture(),wild=g.data.battle;
  assert.equal(g.challenge(1,now),false);assert.equal(g.challenge(8,now),false);assert.ok(g.challenge(0,now));
  const saved=structuredClone(g.data.pendingChallenge),journal=g.data.journal.length;
  assert.ok(g.challenge(0,now+1));assert.deepEqual(g.data.pendingChallenge,saved);assert.equal(g.data.journal.length,journal);
  assert.ok(g.cancelChallenge(now+2));assert.equal(g.data.pendingChallenge,null);assert.equal(g.data.battle,wild);
  assert.equal(g.cancelChallenge(now+3),false);assert.equal(g.tick(now+4),false);assert.equal(g.data.battle,wild);
  g.data.badges=data.bosses.slice(0,8).map(b=>b.id);assert.equal(g.challenge(0,now+5),false);assert.ok(g.challenge(8,now+5));
  assert.equal(g.snapshot(now+5).pendingChallenge.name,'포켓몬 리그');g.defeatOpponent(now+6);advance(g);
  assert.equal(g.data.battle.bossIndex,8);assert.equal(g.capture(g.data.switchUntil),false);
});

test('a challenge requested during a final result waits for that result even without a wild battle',()=>{
  const g=fixture();g.defeatOpponent(now);const end=g.data.switchUntil;
  assert.ok(g.challenge(0,now+1));assert.equal(g.data.battle,null);assert.equal(g.tick(end-1),false);
  assert.ok(g.tick(end));assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.pendingChallenge,null);
});
