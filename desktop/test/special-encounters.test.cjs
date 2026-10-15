'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{data,species,xpAt,rarity,wildMinimum,milestoneBonuses,wildDistribution,pickWild,encounterChances}=require('../pokemon.cjs');
const now=Date.parse('2026-10-15T01:00:00Z'),badges=n=>data.bosses.slice(0,n).map(b=>b.id),dex=()=>Object.fromEntries(Array.from({length:150},(_,i)=>[i+1,now]));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} differs from ${b}`);
function fixture(level=71){const g=new Game({},now,{random:()=>.73});for(const uid of g.data.slots.filter(uid=>uid!==null)){const p=g.data.owned[uid];p.level=level;p.xp=xpAt(p.id,level);}return g;}

test('specific badges award 0.1 percentage points, and championship adds 0.3 without rematch accumulation',()=>{
  assert.deepEqual(milestoneBonuses({badges:badges(5)}),[]);
  assert.deepEqual(milestoneBonuses({badges:badges(6)}),[{id:145,extra:.001}]);
  assert.deepEqual(milestoneBonuses({badges:badges(7)}),[{id:144,extra:.001},{id:145,extra:.001}]);
  const progress={badges:badges(8),champion:true};assert.deepEqual(milestoneBonuses(progress),[144,145,146,150].map(id=>({id,extra:id===150?.003:.004})));
  assert.deepEqual(milestoneBonuses({...progress,badges:[...progress.badges,'sabrina','blaine','giovanni']}),milestoneBonuses(progress));
});

test('registered legends lose only their extra bonuses while Mew keeps its completion reward even after capture',()=>{
  const options={badges:badges(8),champion:true,caught:{144:now},minimumLevel:71};options.additions=milestoneBonuses(options);
  assert.ok(!options.additions.some(b=>b.id===144));assert.ok(options.additions.some(b=>b.id===145&&b.extra===.004));
  const d=wildDistribution(1,71,options),known=d.pokemon.find(p=>p.id===144),missing=d.pokemon.find(p=>p.id===145);close(known.chance,known.base);assert.ok(known.chance>0);close(missing.chance,missing.base+.004);
  options.caught=dex();options.additions=milestoneBonuses(options);assert.deepEqual(options.additions,[{id:151,extra:.01}]);options.caught[151]=now;assert.deepEqual(milestoneBonuses(options),[{id:151,extra:.01}]);
});

test('Mew requires every species numbered 1 through 150, including evolved and hatched registrations',()=>{
  const caught=dex();assert.equal(milestoneBonuses({caught}).find(b=>b.id===151).extra,.01);
  delete caught[149];caught[151]=now;for(let id=152;id<=251;id++)caught[id]=now;
  assert.ok(!milestoneBonuses({caught}).some(b=>b.id===151));caught[149]=now;assert.equal(milestoneBonuses({caught}).find(b=>b.id===151).extra,.01);
  const g=fixture();g.data.caught=dex();g.data.owned={...g.data.owned};assert.ok(g.specialEncounters().entries.some(b=>b.id===151));
});

test('all five species require an active level of at least 50 even after every milestone',()=>{
  const options={champion:true,caught:dex(),badges:badges(8),minimumLevel:91};options.additions=milestoneBonuses(options);
  for(const id of [144,145,146,150,151])assert.equal(wildMinimum(species.get(id)),50);
  const low=wildDistribution(1,49,options);assert.equal(low.extraTotal,0);assert.ok(low.additions.every(b=>!b.eligible&&b.chance===0));
  const ready=wildDistribution(1,50,options);assert.ok(ready.additions.every(b=>b.eligible));close(ready.extraTotal,.01);
  const g=fixture(49);g.data.champion=true;g.data.badges=badges(8);g.data.caught=dex();assert.ok(g.specialEncounters().entries.every(b=>!b.eligible));
  const random=()=>0;g.random=random;g.newWild(now);assert.ok(!species.get(g.data.battle.foe.id).legendary&&!species.get(g.data.battle.foe.id).mythical);
});

test('species additions stay flat after level multiplication, preserve base rare probabilities, and fund exactly from ordinary encounters',()=>{
  for(const [minimumLevel,legendary,mythical] of [[71,.0045,.00045],[81,.006,.0006],[91,.0075,.00075]]){
    const options={champion:true,caught:dex(),minimumLevel,badges:badges(8)};options.additions=milestoneBonuses(options);
    const d=wildDistribution(1,100,options),base=encounterChances(true,minimumLevel);
    for(const p of d.additions)close(p.chance,p.base+p.extra);
    assert.deepEqual(d.additions.map(p=>p.id),[151]);
    close(d.additions.find(p=>p.id===151).chance,.01+mythical);
    close(d.rates.legendary,legendary);close(d.rates.mythical,mythical+.01);close(d.rates.rare,base.rare);
    close(d.rates.common/d.rates.uncommon,base.common/base.uncommon);close(Object.values(d.rates).reduce((a,b)=>a+b,0),1);assert.ok(d.pokemon.every(p=>p.chance>=0));
    options.caught={};options.additions=milestoneBonuses(options);const missing=wildDistribution(1,100,options);
    for(const id of [144,145,146])close(missing.additions.find(p=>p.id===id).chance,.004+legendary/4);
    close(missing.additions.find(p=>p.id===150).chance,.003+legendary/4);close(missing.rates.legendary,legendary+.015);
  }
});

test('the actual two-stage draw gives each target its base share plus its fixed addition, including caught targets and Gen II pools',()=>{
  for(const generation of [1,2]){
    const caught=dex();delete caught[145];const options={champion:true,caught,badges:badges(8),minimumLevel:71};options.additions=milestoneBonuses(options);const d=wildDistribution(generation,100,options);
    let offset=0;
    for(const [tier,rate] of Object.entries(d.rates)){
      const pool=d.pokemon.filter(p=>p.tier===tier),counts=new Map(),samples=1000;
      for(let i=0;i<samples;i++){let draw=0;const id=pickWild(generation,()=>draw++===0?offset+rate/2:(i+.5)/samples,100,options);assert.equal(rarity(species.get(id)),tier);counts.set(id,(counts.get(id)||0)+1);}
      for(const p of pool)assert.ok(Math.abs((counts.get(p.id)||0)-samples*p.chance/rate)<=1+1e-9);
      offset+=rate;
    }
  }
});

test('Game applies milestones to wild battles, restores them after reload and never changes trainer encounters',()=>{
  let g=fixture(50);g.data.badges=badges(6);let draw=0;g.random=()=>draw++===0?.001:.5;g.newWild(now);assert.equal(g.data.battle.foe.id,145);assert.ok(g.data.battle.foe.level>=50);
  const before=structuredClone(g.data);g=new Game(g.data,now+1);assert.deepEqual(g.data.owned,before.owned);assert.deepEqual(g.data.badges,before.badges);close(g.specialEncounters().entries[0].extra,.001);
  g.data.battle=null;g.data.switchUntil=0;g.nextTick=now;assert.ok(g.challenge(6,now));assert.equal(g.data.battle.foe.id,data.bosses[6].team[0].id);assert.equal(g.capture(g.data.switchUntil),false);
});

test('the last missing registration unlocks the Mew bonus only after capture playback commits',()=>{
  const g=fixture(50);g.data.champion=true;g.data.badges=badges(8);g.data.caught=dex();delete g.data.caught[150];g.newWild(now);g.data.battle.foe=require('../battle.cjs').combatant(150,50,[150]);g.data.battle.foe.hp=1;g.random=()=>0;
  assert.deepEqual(milestoneBonuses(g.data),[{id:150,extra:.003}]);
  assert.ok(g.capture(g.data.switchUntil));assert.ok(!milestoneBonuses(g.data).some(b=>b.id===151));assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(!g.data.caught[150]);
  assert.ok(g.tick(g.data.switchUntil));assert.ok(g.data.caught[150]);assert.deepEqual(milestoneBonuses(g.data),[{id:151,extra:.01}]);
});
