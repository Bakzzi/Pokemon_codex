'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs');
const {captureTiming,captureFrame}=require('../capture-animation.js');
const now=Date.parse('2026-10-13T07:00:00Z');
function fixture(passes){
  const g=new Game({},now,{random:()=>.73});g.data.owned[25].moves=[45];g.newWild(now);
  g.data.battle.foe=battle.combatant(19,5,[150]);g.damageFoe(9999);
  let checks=0;g.random=()=>checks++<passes?0:.999999;return g;
}
test('actual shake checks produce failures at 0, 1, 2 or 3 shakes, and success always shows three',()=>{
  for(let passes=0;passes<=4;passes++){
    const g=fixture(passes);assert.equal(g.capture(now),passes===4);
    const c=g.snapshot(now).capture,t=captureTiming(c);
    assert.equal(c.shakes,Math.min(passes,3));assert.equal(t.shakes,Math.min(passes,3));
    assert.equal(g.data.battle?.captureAttempts??1,1);
    assert.equal(captureFrame(c,now+t.resultAt).phase,passes===4?'caught':'escaped');
    assert.equal(!!g.data.caught[19],passes===4);
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
  assert.equal(g.select(7,now+1),false);assert.equal(g.challenge(0,now+1),false);
  g=new Game(g.data,now+1000,{random:()=>.73});assert.equal(g.tick(now+t.duration-1),false);
  assert.deepEqual(g.snapshot(now+1000).capture,c);assert.equal(Object.keys(g.data.owned).length,count);
  g.data.workTokens=0;assert.equal(g.tick(now+t.duration+1),false);assert.equal(g.data.battle,null);
  assert.ok(g.select(7,now+t.duration+1));assert.deepEqual(g.snapshot(now+t.duration+1).capture,c);
  g.data.workTokens=250;assert.ok(g.tick(now+t.duration+2000));assert.equal(g.snapshot().capture,null);
  assert.ok(g.data.battle);assert.equal(Object.keys(g.data.owned).length,count);
});
test('a failed throw waits for the breakout before resuming the same battle and capture threshold',()=>{
  const g=fixture(2),b=g.data.battle,hp=b.foe.hp;g.data.workTokens=500;
  assert.equal(g.capture(now),false);const c=g.snapshot(now).capture,t=captureTiming(c);
  assert.equal(g.tick(now+t.duration-1),false);assert.equal(g.data.battle,b);assert.equal(b.foe.hp,hp);
  assert.equal(b.captureAttempts,1);assert.equal(g.data.workTokens,500);assert.ok(!g.data.caught[19]);
  assert.match(captureFrame(c,now+t.resultAt).text,/아쉽다!/);
  assert.ok(g.tick(now+t.duration));assert.equal(g.data.battle,b);assert.equal(b.captureAttempts,1);
  assert.equal(g.data.workTokens,250);assert.equal(g.snapshot().capture,null);
});
