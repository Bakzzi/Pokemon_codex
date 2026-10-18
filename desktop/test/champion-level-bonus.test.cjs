'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{data,species,rarity,wildMinimum,wildEligible,pickWild,encounterChances,wildDistribution,xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-14T08:00:00Z');
function fixture(level){const g=new Game({},now,{random:()=>.73});g.data.champion=true;setLevels(g,level);return g;}
function setLevels(g,level){for(const uid of g.data.slots.filter(uid=>uid!==null)){const p=g.data.owned[uid];p.level=level;p.xp=xpAt(p.id,level);require('../move-access.cjs').update(p);}}

test('the four selected Pokemon must all strictly exceed 70, 80 or 90 to multiply both champion bonuses',()=>{
  const g=fixture(5);
  for(const [level,rare,uncaught]of [[5,1.5,2],[70,1.5,2],[71,4.5,6],[80,4.5,6],[81,6,8],[90,6,8],[91,7.5,10],[100,7.5,10]]){
    setLevels(g,level);const b=g.encounterBonus();assert.equal(b.minimumLevel,level);assert.equal(b.rareMultiplier,rare);assert.equal(b.uncaughtWeight,uncaught);
    assert.equal(b.levelMultiplier,rare/1.5);
    assert.equal(b.onlyUncaught,true);
  }
  setLevels(g,100);g.data.owned[7].level=70;assert.equal(g.encounterBonus().rareMultiplier,1.5);
  g.data.owned[7].level=80;assert.equal(g.encounterBonus().rareMultiplier,4.5);g.data.owned[7].level=90;assert.equal(g.encounterBonus().rareMultiplier,6);
  g.data.champion=false;assert.equal(g.encounterBonus(),null);assert.deepEqual(encounterChances(false,100),encounterChances(false,0));
});

test('low-level reserves do not lower the bonus until selected; selected fainted or boarded Pokemon still count',()=>{
  const g=fixture(91),reserve=g.addPokemon(133,5,'catch',now),sibling=g.addPokemon(25,70,'hatch',now);
  assert.equal(g.encounterBonus().rareMultiplier,7.5);assert.ok(g.setSlot(0,reserve,now));assert.equal(g.encounterBonus().minimumLevel,5);
  g.data.daycare={parents:[reserve,1]};assert.equal(g.encounterBonus().rareMultiplier,1.5);g.data.daycare=null;
  assert.ok(g.setSlot(0,1,now));assert.equal(g.encounterBonus().rareMultiplier,7.5);
  assert.ok(g.setSlot(0,sibling,now));assert.equal(g.encounterBonus().rareMultiplier,1.5);
  g.data.owned[sibling].level=71;g.newWild(now);g.data.battle.party[sibling].hp=0;assert.equal(g.encounterBonus().rareMultiplier,4.5);
});

test('the bonus is recomputed from occupied slots after reload, including a partial party',()=>{
  let g=fixture(81);const reserve=g.addPokemon(133,5,'hatch',now),before=structuredClone(g.data);
  g=new Game(g.data,now+1);assert.equal(g.encounterBonus().rareMultiplier,6);assert.deepEqual(g.data.owned,before.owned);assert.deepEqual(g.data.slots,before.slots);
  assert.ok(g.setSlot(0,reserve,now+1));g=new Game(g.data,now+2);assert.equal(g.encounterBonus().rareMultiplier,1.5);
  g.data.slots=g.data.slots.slice(0,3);assert.equal(g.encounterBonus().minimumLevel,5);assert.equal(g.encounterBonus().rareMultiplier,1.5);
});

test('actual category draws keep baseline rates when every eligible species is already caught',()=>{
  const caught=Object.fromEntries(data.pokemon.map(p=>[p.id,now]));
  for(const minimumLevel of [71,81,91]){
    // Each supported probability interval spans an integer number of samples.
    const rates=encounterChances(true,minimumLevel),counts={common:0,uncommon:0,rare:0,legendary:0,mythical:0},samples=20000;
    for(let i=0;i<samples;i++){let draw=0;counts[rarity(species.get(pickWild(1,()=>draw++===0?(i+.5)/samples:.4,100,{champion:true,caught,minimumLevel}))) ]++;}
    for(const tier of Object.keys(counts)){assert.ok(rates[tier]>=0&&rates[tier]<=1);assert.ok(Math.abs(counts[tier]-rates[tier]*samples)<=1,tier);}
    assert.ok(Math.abs(Object.values(rates).reduce((a,b)=>a+b,0)-1)<1e-12);
  }
});

test('actual within-category draws use 6, 8 and 10 missing-species weights while caught species keep weight one',()=>{
  const pool=data.pokemon.filter(p=>wildEligible(p,1,100)&&rarity(p)==='common'),missing=pool[0];
  const caught=Object.fromEntries(pool.slice(1).map(p=>[p.id,now]));
  for(const [minimumLevel,multiplier]of [[71,6],[81,8],[91,10]]){
    const options={champion:true,caught,minimumLevel},rate=wildDistribution(1,100,options).rates.common;
    const counts=Object.fromEntries(pool.map(p=>[p.id,0])),samples=(pool.length-1+multiplier)*100;
    for(let i=0;i<samples;i++){let draw=0;counts[pickWild(1,()=>draw++===0?1-rate/2:(i+.5)/samples,100,options)]++;}
    assert.equal(counts[missing.id],multiplier*100);for(const p of pool.slice(1))assert.equal(counts[p.id],100);
  }
});

test('Game passes the selected-team level tier to wild sampling and a newly captured reserve leaves it unchanged',()=>{
  const g=fixture(91);g.data.caught=Object.fromEntries(data.pokemon.filter(p=>p.id!==147).map(p=>[p.id,now]));let draw=0;g.random=()=>draw++===0?.095:.5;g.newWild(now);
  assert.equal(rarity(species.get(g.data.battle.foe.id)),'rare');assert.equal(g.maxGeneration(),1);
  const reserve=g.addPokemon(133,5,'catch',now);assert.equal(g.encounterBonus().rareMultiplier,7.5);
  g.data.battle=null;assert.ok(g.setSlot(3,reserve,g.data.switchUntil));draw=0;g.newWild(g.data.switchUntil);
  assert.equal(rarity(species.get(g.data.battle.foe.id)),'uncommon');assert.equal(g.encounterBonus().rareMultiplier,1.5);
});
