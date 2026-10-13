'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs');
const {data,statsAt}=require('../pokemon.cjs');
const {profiles,profileFor,frameFor}=require('../move-effects.js');
const {captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-13T09:00:00Z');
test('every stored technique has an explicit visual, within the battle action interval',()=>{
  for(const m of data.moves){assert.ok(profiles[m.id],m.name);assert.ok(profiles[m.id].duration<=1400,m.name);}
  for(const ids of [[52,53,126],[55,57,145],[33,10,45,106]])assert.equal(new Set(ids.map(id=>profileFor(id).family)).size,ids.length);
});
test('real hit, miss, charging and immunity give different target reactions',()=>{
  const e={moveId:33,at:now,actor:'hero',damage:12,outcome:'success'};
  const hit=frameFor(e,now+700);assert.ok(hit.impact);assert.ok(hit.actor.x>50);
  for(const outcome of ['miss','charging','immune','protected','failed'])assert.equal(frameFor({...e,outcome},now+700).impact,false,outcome);
  assert.equal(frameFor({...e,outcome:'charging'},now+700).actor.x,0);
  const reverse=frameFor({...e,actor:'foe'},now+700);assert.equal(reverse.actor.x,-hit.actor.x);
  assert.equal(frameFor(e,now+1400).active,false);
});
test('native protocol sends actual called move, target, multi-hit count and failed result',()=>{
  const a='p1a: u25',b='p2a: f0',present=lines=>battle.movePresentation(lines);
  assert.deepEqual(present([`|move|${a}|Metronome|${a}`,`|move|${a}|Water Gun|${b}`]),{actor:'hero',move:55,moveTarget:'opponent',outcome:'success',hitCount:1});
  assert.equal(present([`|move|${a}|Reflect|${a}`]).moveTarget,'self');
  assert.equal(present([`|move|${a}|Solar Beam|${b}|[still]`,`|-prepare|${a}|Solar Beam|${b}`]).outcome,'charging');
  assert.equal(present([`|move|${a}|Fury Swipes|${b}`,`|-hitcount|${b}|5`]).hitCount,5);
  assert.equal(present([`|move|${a}|Tackle|${b}|[miss]`,`|-miss|${a}|${b}`]).outcome,'miss');
  assert.equal(present([`|move|${a}|Tackle|${b}`,`|-immune|${b}`]).outcome,'immune');
  assert.equal(present([`|move|${a}|Tackle|${b}`,`|-activate|${b}|move: Protect`]).outcome,'protected');
  assert.equal(present([`|move|${b}|Harden|${b}`]).actor,'foe');
});
test('HUD exposes exact actual HP on both sides and full HP outside battle',()=>{
  const g=new Game({},now,{random:()=>.73});let s=g.snapshot(now);
  assert.equal(s.hero.currentHp,statsAt(25,5)[1]);assert.equal(s.hero.currentHp,s.hero.maxHp);
  g.newWild(now);g.data.battle.party[25].hp=7;g.data.battle.foe.hp=3;
  s=g.snapshot(now);assert.equal(s.hero.currentHp,7);assert.equal(s.foe.currentHp,3);
  assert.equal(s.hero.hp,7/s.hero.maxHp);assert.equal(s.foe.hp,3/s.foe.maxHp);
  g.data.battle.party[25].hp=0;assert.equal(g.snapshot(now).hero.currentHp,0);
});
test('a native battle action reaches the widget with move identity and the original defender',()=>{
  const g=new Game({},now,{random:()=>.73});g.data.owned[25].moves=[84];g.newWild(now);
  g.data.battle.foe=battle.combatant(143,5,[150]);g.data.caught[143]=now;g.data.workTokens=1000;g.nextTick=0;
  g.tick(now);const a=g.snapshot(now).animation;
  assert.equal(a.moveId,84);assert.equal(a.moveTarget,'opponent');assert.equal(a.outcome,'success');assert.equal(a.foe.id,143);assert.ok(a.damage>0);
  assert.equal(a.foeBefore.currentHp,a.foe.maxHp);assert.ok(a.foe.currentHp<a.foeBefore.currentHp);assert.equal(a.hero.id,25);
});
test('capture waits for the triggering technique before the throw, including a reload',()=>{
  const g=new Game({},now,{random:()=>0});g.newWild(now);g.data.battle.foe=battle.combatant(19,5);g.damageFoe(9999);
  g.animate('attack',{moveId:55,move:'물대포',damage:10,actor:'hero',foe:g.snapshot(now).foe},now);
  g.capture(now);const c=g.snapshot(now).capture;
  assert.equal(c.at,now+profileFor(55).duration);assert.equal(c.leadIn.moveId,55);
  assert.equal(g.data.switchUntil,c.at+captureTiming(c).duration);
  g.data.workTokens=1000;const loaded=new Game(g.data,now+500);assert.equal(loaded.tick(now+600),false);
  assert.equal(loaded.snapshot(now+600).capture.leadIn.moveId,55);
});
