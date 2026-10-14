'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{species,xpAt}=require('../pokemon.cjs'),{combatant}=require('../battle.cjs'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-14T09:00:00Z');
function fixture(count=4){
  const g=new Game({},now,{random:()=>.73});for(let id=1;Object.keys(g.data.caught).length<count;id++)g.data.caught[id]=now;return g;
}

test('the experience bonus is registered Gen I species divided by 151, reaching exactly 100 percent extra',()=>{
  for(const count of [4,75,151]){
    const g=fixture(count),boost=g.experienceBoost();assert.equal(boost.count,count);assert.equal(boost.total,151);
    assert.equal(boost.percent,count*100/151);assert.equal(boost.multiplier,1+count/151);
    assert.deepEqual(g.snapshot(now).experienceBoost,boost);assert.deepEqual(g.panelState(now).experienceBoost,boost);
  }
  assert.equal(fixture(151).experienceBoost().multiplier,2);assert.equal(fixture(151).experienceBoost().percent,100);
  assert.equal(fixture(75).experienceBoost().percent.toFixed(2),'49.67');
});

test('registration from evolution and hatching counts once; encounters, duplicate individuals and former forms do not erase or inflate it',()=>{
  const g=fixture();g.data.seen[19]=now;assert.equal(g.experienceBoost().count,4);
  g.addPokemon(25,5,'hatch',now);assert.equal(g.experienceBoost().count,4);
  g.data.owned[4].level=16;g.data.owned[4].xp=xpAt(4,16);assert.ok(g.evolve(4,5,now));
  assert.equal(g.experienceBoost().count,5);assert.ok(g.data.caught[4]);assert.equal(Object.values(g.data.owned).filter(p=>p.id===4).length,0);
  g.addPokemon(133,5,'hatch',now);assert.equal(g.experienceBoost().count,6);g.addPokemon(133,5,'hatch',now);assert.equal(g.experienceBoost().count,6);
});

test('Gen II registrations and invalid or false entries do not exceed the fixed 151-species booster',()=>{
  const g=fixture(151);g.data.champion=true;assert.ok(g.unlockJohto(now));g.addPokemon(172,5,'hatch',now);g.addPokemon(161,5,'catch',now);
  g.data.caught[999]=now;g.data.caught[-1]=now;assert.equal(g.experienceBoost().count,151);assert.equal(g.experienceBoost().multiplier,2);
  g.data.caught[19]=false;assert.equal(g.experienceBoost().count,150);
});

test('wild and trainer XP add the collection bonus once, only to the active individual, with whole-number rounding',()=>{
  for(const count of [4,75,151])for(const trainer of [false,true]){
    const g=fixture(count),sibling=g.addPokemon(25,5,'hatch',now),before=structuredClone(g.data.owned),foe=combatant(19,20);
    const base=Math.max(1,Math.floor(species.get(19).baseExperience*20/7*(trainer?1.5:1))),expected=base+Math.floor(base*count/151);
    assert.equal(g.awardXp(foe,trainer,now),expected);assert.equal(g.data.owned[25].xp-before[25].xp,expected);
    assert.equal(g.data.adventure.totals.xp,expected);for(const uid of [1,4,7,sibling])assert.deepEqual(g.data.owned[uid],before[uid]);
    if(count===151)assert.equal(expected,base*2);
  }
});

test('the newly captured 151st species affects XP only after the success animation completes',()=>{
  const g=fixture(151);delete g.data.caught[19];g.newWild(now);g.data.battle.foe=combatant(19,10,[150]);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.2;g.random=()=>0;
  const xp=g.data.owned[25].xp;assert.equal(g.experienceBoost().count,150);assert.ok(g.capture(now));const c=g.data.captureAnimation,end=c.at+captureTiming(c).duration;
  assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[25].xp,xp);assert.equal(g.snapshot(end-1).experienceBoost.count,150);
  assert.ok(g.tick(end));const base=Math.floor(species.get(19).baseExperience*10/7);assert.equal(g.data.owned[25].xp-xp,base*2);
  assert.equal(g.experienceBoost().count,151);assert.equal(g.data.adventure.totals.xp,base*2);assert.equal(g.tick(end+1),false);
  const reloaded=new Game(g.data,end+2);assert.equal(reloaded.data.owned[25].xp-xp,base*2);assert.equal(reloaded.experienceBoost().multiplier,2);
});

test('boosted XP still stops at level 100 and journal totals count only the amount actually received',()=>{
  const g=fixture(151),p=g.data.owned[25],cap=xpAt(25,100);p.level=99;p.xp=cap-5;
  g.awardXp(combatant(150,100),true,now);assert.equal(p.level,100);assert.equal(p.xp,cap);assert.equal(g.data.adventure.totals.xp,5);
  g.awardXp(combatant(150,100),false,now+1);assert.equal(p.xp,cap);assert.equal(g.data.adventure.totals.xp,5);
});

test('older saved XP is preserved and receives no retroactive collection reward on restart',()=>{
  const g=fixture(75),before=structuredClone(g.data.owned),reloaded=new Game(g.data,now+1);
  assert.deepEqual(reloaded.data.owned,before);assert.equal(reloaded.data.adventure.totals.xp,0);assert.equal(reloaded.experienceBoost().count,75);
  const foe=combatant(19,20),base=Math.floor(species.get(19).baseExperience*20/7),expected=base+Math.floor(base*75/151);
  reloaded.awardXp(foe,false,now+2);assert.equal(reloaded.data.owned[25].xp-before[25].xp,expected);
});
