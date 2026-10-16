'use strict';
const {travelSpecies}=require('./helpers/region.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{data,species,rarity,wildMinimum,pickWild,encounterChances,xpAt}=require('../pokemon.cjs'),nursery=require('../daycare.cjs');
const now=Date.parse('2026-10-14T07:00:00Z');
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function champion(){const g=new Game({},now,{random:()=>.73});g.data.champion=true;g.data.leagueBest=5;return g;}
function lastLeagueOpponent(g,at){
  g.data.trainingDevice.snorlaxWonAt=at;
  g.data.badges=data.bosses.slice(0,8).map(b=>b.id);assert.ok(g.challenge(8,at));
  g.data.battle.bossIndex=12;g.data.battle.foeIndex=data.bosses[12].team.length-1;g.nextTrainer(at);g.defeatOpponent(at);
}

test('champion grants a persistent stay-or-unlock choice even with an incomplete Kanto collection',()=>{
  let g=new Game({},now,{random:()=>.73});lastLeagueOpponent(g,now);
  assert.ok(g.data.champion);assert.equal(g.maxGeneration(),1);assert.equal(g.panelState(now).collection.length,151);
  assert.equal(g.panelState(now).kantoCaughtCount,4);assert.ok(g.panelState(now).encounterBonus);
  const owned=structuredClone(g.data.owned),caught=structuredClone(g.data.caught);assert.ok(g.stayInKanto(now+1));assert.equal(g.stayInKanto(now+2),false);
  g=new Game(g.data,now+10,{random:()=>.73});assert.ok(g.data.johtoDeferred);assert.equal(g.maxGeneration(),1);
  assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.data.caught,caught);
  assert.ok(g.unlockJohto(Math.max(now+11,g.data.switchUntil),travelSpecies(g)));const unlockedOwned=structuredClone(g.data.owned);assert.equal(g.unlockJohto(now+12),false);assert.equal(g.stayInKanto(now+12),false);
  assert.equal(g.maxGeneration(),2);assert.equal(g.panelState(now+12).collection.length,251);assert.equal(g.panelState(now+12).kantoCaughtCount,4);
  assert.equal(g.data.journal.filter(e=>e.kind==='unlock').length,1);assert.ok(g.panelState(now+12).summary.highlights.some(e=>e.kind==='unlock'));
  const loaded=new Game(g.data,now+20);assert.equal(loaded.maxGeneration(),2);assert.ok(!loaded.data.johtoDeferred);
  assert.deepEqual(loaded.data.owned,unlockedOwned);assert.deepEqual(loaded.data.caught,caught);
});

test('championship and explicit selection gate Gen II wild Pokemon, evolution and breeding together',()=>{
  const g=new Game({},now,{random:rng(23)});for(let id=1;id<=151;id++)g.data.caught[id]=now;
  assert.equal(g.unlockJohto(now,travelSpecies(g)),false);assert.equal(g.stayInKanto(now),false);assert.equal(g.maxGeneration(),1);
  g.data.champion=true;assert.ok(g.stayInKanto(now));const onix=g.addPokemon(95,30,'fixture',now),ditto=g.addPokemon(132,30,'fixture',now);
  g.data.inventory[210]=1;assert.equal(g.evolve(onix,208,now),false);assert.equal(nursery.predict(g,[25,ditto]).compatible,false);assert.equal(g.addPokemon(172,5,'catch',now),false);
  g.data.trainingDevice.obtainedAt=now;g.data.trainingDevice.learnerUid=onix;
  g.data.owned[25].level=100;g.data.owned[25].xp=xpAt(25,100);
  for(let i=0;i<500;i++){g.newWild(now);assert.ok(g.data.battle.foe.id<=151);}
  g.data.owned[onix].xp=xpAt(95,31)-1;g.awardXp({id:19,level:30},false,now);assert.equal(g.data.owned[onix].level,31);
  assert.equal(g.maxGeneration(),1);assert.equal(g.unlockJohto(now,travelSpecies(g)),false);g.defeatOpponent(g.data.switchUntil);assert.ok(g.unlockJohto(g.data.switchUntil,travelSpecies(g)));assert.ok(g.evolve(onix,208,Math.max(now,g.data.switchUntil)));
  assert.equal(nursery.predict(g,[25,ditto]).offspring[0].id,172);
  const encountered=new Set();for(let i=0;i<1000;i++){g.newWild(now);encountered.add(g.data.battle.foe.id);}
  assert.ok([...encountered].some(id=>id>151));assert.ok([...encountered].some(id=>id<=151));
});

test('a league rematch preserves the decision to stay and never auto-unlocks Gen II',()=>{
  let g=champion();assert.ok(g.stayInKanto(now));lastLeagueOpponent(g,now+1);
  assert.ok(g.data.johtoDeferred);assert.equal(g.maxGeneration(),1);assert.match(g.data.animation.text,/타이틀 방어/);
  g=new Game(g.data,now+10);assert.equal(g.maxGeneration(),1);assert.ok(g.panelState(now+10).encounterBonus);
});

test('old champions without Gen II progress choose anew, while existing Gen II Pokemon, slots and eggs remain available',()=>{
  const fresh=champion();delete fresh.data.johtoUnlocked;delete fresh.data.johtoDeferred;
  const waiting=new Game(fresh.data,now);assert.equal(waiting.maxGeneration(),1);assert.ok(waiting.stayInKanto(now));
  const old=champion();assert.ok(old.unlockJohto(now,travelSpecies(old)));const baby=old.addPokemon(172,5,'hatch',now);assert.ok(old.setSlot(0,baby,now));
  const before=structuredClone(old.data);delete before.johtoUnlocked;delete before.johtoDeferred;
  const preserved=new Game(before,now+1);assert.equal(preserved.maxGeneration(),2);assert.deepEqual(preserved.data.slots,old.data.slots);assert.deepEqual(preserved.data.owned,old.data.owned);
  const seen=champion();seen.data.seen[161]=now;delete seen.data.johtoUnlocked;assert.equal(new Game(seen.data,now).maxGeneration(),2);
  const egg=champion();egg.data.egg={id:172,progress:150,required:1000,parents:[25,132]};delete egg.data.johtoUnlocked;
  const restored=new Game(egg.data,now);assert.equal(restored.maxGeneration(),2);assert.deepEqual(restored.data.egg,egg.data.egg);
});

test('actual sampling gives the approved 1.5x rare, legendary and mythical categories without changing ordinary rates before champion',()=>{
  const allCaught=Object.fromEntries(data.pokemon.map(p=>[p.id,now]));
  for(const champion of [false,true]){
    const counts={common:0,uncommon:0,rare:0,legendary:0,mythical:0},samples=10000;
    for(let i=0;i<samples;i++){let draw=0;const id=pickWild(1,()=>draw++===0?(i+.5)/samples:.37,100,{champion,caught:allCaught});counts[rarity(species.get(id))]++;}
    const rates=encounterChances(champion);for(const tier of Object.keys(counts))assert.ok(Math.abs(counts[tier]-rates[tier]*samples)<=1,tier);
    assert.ok(Math.abs(Object.values(rates).reduce((a,b)=>a+b,0)-1)<1e-12);
  }
  const base=encounterChances(false),bonus=encounterChances(true);
  for(const tier of ['rare','legendary','mythical'])assert.equal(bonus[tier],base[tier]*1.5);
});

test('unregistered species receive twice the selection weight within a category, including species already evolved away',()=>{
  const pool=data.pokemon.filter(p=>![1,2,3,4,5,6,7,8,9,25,26,143].includes(p.id)&&p.generation===1&&wildMinimum(p)<=100&&rarity(p)==='common');
  const caught=Object.fromEntries(pool.map(p=>[p.id,now])),missing=pool.find(p=>p.id!==25);delete caught[missing.id];
  for(const champion of [false,true]){
    const counts=Object.fromEntries(pool.map(p=>[p.id,0])),samples=pool.length*300;
    for(let i=0;i<samples;i++){let draw=0;counts[pickWild(1,()=>draw++===0?.9:(i+.5)/samples,100,{champion,caught})]++;}
    for(const p of pool)if(p.id!==missing.id)assert.ok(Math.abs(counts[missing.id]-(champion?2:1)*counts[p.id])<=3);
    assert.ok(counts[19]>0); // Registration still matters when no current Rattata is owned.
  }
});

test('champion sampling still enforces generation and level eligibility, and all-collected categories remain usable',()=>{
  const allCaught=Object.fromEntries(data.pokemon.map(p=>[p.id,now]));
  for(const generation of [1,2])for(const level of [5,16,30,36,50,55]){
    const random=rng(generation*100+level);for(let i=0;i<200;i++){
      const id=pickWild(generation,random,level,{champion:true,caught:allCaught}),p=species.get(id);assert.ok(p.generation<=generation&&wildMinimum(p)<=level);
    }
  }
  let draw=0;assert.equal(rarity(species.get(pickWild(1,()=>draw++===0?0:.5,5,{champion:true,caught:allCaught}))),'common');
});

test('Game applies champion bonuses to encounters before choosing to unlock Johto',()=>{
  const g=champion();g.data.owned[25].level=100;g.data.owned[25].xp=xpAt(25,100);
  let draw=0;g.random=()=>draw++===0?.1:.5;g.newWild(now);assert.equal(rarity(species.get(g.data.battle.foe.id)),'rare');assert.equal(g.maxGeneration(),1);
  g.data.champion=false;draw=0;g.newWild(now);assert.equal(rarity(species.get(g.data.battle.foe.id)),'uncommon');
});
