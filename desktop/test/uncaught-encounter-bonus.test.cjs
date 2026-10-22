'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {data,wildDistribution,pickWild,milestoneBonuses,xpAt}=require('../pokemon.cjs');
const {Adventure:Desktop}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs');
const now=Date.parse('2026-10-18T06:00:00Z'),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const registered=missing=>Object.fromEntries(data.pokemon.filter(p=>!missing.includes(p.id)).map(p=>[p.id,now]));
const entry=(d,id)=>d.pokemon.find(p=>p.id===id);

test('champion and higher party levels cannot raise the probability of any registered species',()=>{
  for(const generation of [1,2])for(const missing of [[19,147,144,151],[144,146,151],[],[19],Array.from({length:125},(_,i)=>i+1)]){
    const caught=registered(missing),baseline=wildDistribution(generation,100,{caught});let previous=baseline;
    for(const minimumLevel of [0,70,71,80,81,90,91,100]){
      const current=wildDistribution(generation,100,{caught,champion:true,minimumLevel});
      for(const p of current.pokemon)if(caught[p.id]){
        assert.ok(p.chance<=entry(baseline,p.id).chance+1e-12,`registered ${p.id}, level ${minimumLevel}`);
        assert.ok(p.chance<=entry(previous,p.id).chance+1e-12,`registered ${p.id} increased at ${minimumLevel}`);
      }
      close(current.pokemon.reduce((n,p)=>n+p.chance,0),1);assert.ok(current.pokemon.every(p=>p.chance>=0));previous=current;
    }
  }
});

test('all-registered populations are identical before and after championship at every level tier',()=>{
  const caught=registered([]);
  for(const generation of [1,2])for(const level of [5,16,36,49,50,55,100]){
    const base=wildDistribution(generation,level,{caught});
    for(const minimumLevel of [0,71,81,91,100]){
      const d=wildDistribution(generation,level,{caught,champion:true,minimumLevel});
      for(const p of d.pokemon)close(p.chance,entry(base,p.id).chance);
    }
  }
});

test('missing ordinary species retain higher encounter probabilities than missing legends and myths',()=>{
  const caught=registered([19,147,144,151]);
  for(const champion of [false,true])for(const minimumLevel of [0,71,81,91,100]){
    const d=wildDistribution(1,100,{caught,champion,minimumLevel});
    assert.ok(entry(d,19).chance>entry(d,144).chance);assert.ok(entry(d,147).chance>entry(d,144).chance);
    assert.ok(entry(d,144).chance>entry(d,151).chance);
  }
});

test('registered ordinary and rare populations do not consume boosted quotas when only a few legends remain',()=>{
  const caught=registered([144,146,151]),baseline=wildDistribution(1,100,{caught});let previous=baseline;
  for(const minimumLevel of [0,71,81,91,100]){
    const state={caught,champion:true,minimumLevel,badges:data.bosses.slice(0,8).map(p=>p.id)};
    const d=wildDistribution(1,100,{...state,additions:milestoneBonuses(state)});
    for(const id of [144,146,151])assert.ok(entry(d,id).chance>entry(previous,id).chance||minimumLevel===100);
    for(const p of d.pokemon)if(caught[p.id])assert.ok(p.chance<=entry(baseline,p.id).chance+1e-12);
    assert.ok(d.rates.rare<baseline.rates.rare);previous=d;
  }
});

test('real draws use the same whole-population distribution as hints with or without fixed additions',()=>{
  const caught=registered([19,147,144,151]);
  for(const additions of [[],[{id:144,extra:.004}]]){
    const options={caught,champion:true,minimumLevel:100,additions},d=wildDistribution(1,100,options);let offset=0;
    for(const [tier,rate] of Object.entries(d.rates)){
      const pool=d.pokemon.filter(p=>p.tier===tier),counts=new Map(),samples=2000;
      for(let i=0;i<samples;i++){let draw=0;const id=pickWild(1,()=>draw++===0?offset+rate/2:(i+.5)/samples,100,options);counts.set(id,(counts.get(id)||0)+1);}
      for(const p of pool)assert.ok(Math.abs((counts.get(p.id)||0)-samples*p.chance/rate)<=1+1e-9);
      offset+=rate;
    }
  }
});

test('late-game missing legends stay comparable to registered ordinary species without becoming more common',()=>{
  const caught=registered([144,146,151]),state={caught,champion:true,minimumLevel:100,badges:data.bosses.slice(0,8).map(p=>p.id)};
  const excluded=[131,...require('../../shared/safari.cjs').pool.map(([id])=>id)],d=wildDistribution(1,100,{...state,excluded,additions:milestoneBonuses(state)});
  const ordinary=d.pokemon.filter(p=>caught[p.id]&&!['legendary','mythical'].includes(p.tier)),average=ordinary.reduce((n,p)=>n+p.chance,0)/ordinary.length;
  const common=Math.max(...ordinary.filter(p=>p.tier==='common').map(p=>p.chance));
  for(const id of [144,146]){assert.ok(entry(d,id).chance>=average*.5);assert.ok(entry(d,id).chance<common);}
  assert.ok(entry(d,151).chance<entry(d,144).chance);
});

test('PC and Android both remove bonuses based on permanent registration, including evolved-away species',()=>{
  for(const Adventure of [Desktop,Mobile]){
    const g=new Adventure({},now);g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;
    g.data.champion=true;g.data.caught=registered([144,146,151]);
    g.data.kantoWorld.location='seafoam';
    const active=g.data.owned[g.data.activeId];active.level=100;active.xp=xpAt(active.id,100);
    const before=structuredClone(g.data),d=wildDistribution(1,100,g.wildOptions());
    assert.equal(entry(d,41).weight,1);assert.ok(entry(d,144).weight>1);assert.deepEqual(g.data,before);
    g.data.caught[144]=now;const after=wildDistribution(1,100,g.wildOptions());
    assert.equal(entry(after,144).weight,1);assert.ok(entry(after,144).chance<entry(d,144).chance);
    assert.ok(!Object.values(g.data.owned).some(p=>p.id===41));assert.equal(entry(after,41).weight,1);
  }
});
