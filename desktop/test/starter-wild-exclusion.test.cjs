'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{wildDistribution,pickWild,milestoneBonuses,species}=require('../pokemon.cjs');
const excluded=[1,2,3,4,5,6,7,8,9,25,26];
test('starter families are absent in every generation, level, champion tier and special-bonus distribution',()=>{
  for(const generation of [1,2])for(const level of [5,16,36,50,71,81,91,100])for(const champion of [false,true]){
    const options={champion,minimumLevel:level,badges:['sabrina','blaine','giovanni'],caught:{}};options.additions=milestoneBonuses(options);
    const d=wildDistribution(generation,level,options);for(const id of excluded)assert.ok(!d.pokemon.some(p=>p.id===id));
    assert.ok(Math.abs(d.pokemon.reduce((n,p)=>n+p.chance,0)-1)<1e-12);
    for(const p of d.pokemon){assert.ok(species.get(p.id).generation<=generation);assert.ok(p.chance>=0);}
  }
});
test('actual base and bonus draws never select a starter family, even with no caught entries',()=>{
  for(const generation of [1,2])for(const bonus of [false,true])for(const champion of [false,true]){
    const options={champion,minimumLevel:91,additions:bonus?[{id:145,extra:.004}]:[]};
    for(let i=0;i<1000;i++){let draw=0;const id=pickWild(generation,()=>draw++===0?(i+.5)/1000:((i*37)%1000+.5)/1000,100,options);assert.ok(!excluded.includes(id));assert.notEqual(id,143);}
  }
});
test('the four starters, evolution and their dex registrations remain available after exclusion',()=>{
  const now=Date.parse('2026-10-15T03:00:00Z'),g=new Game({},now);
  assert.deepEqual(g.data.slots,[1,4,7,25]);for(const id of g.data.slots)assert.ok(g.data.caught[id]);
  g.data.owned[4].level=16;assert.ok(g.tick(now));assert.equal(g.data.owned[4].id,5);assert.ok(g.data.caught[4]&&g.data.caught[5]);
  const reset=new Game(g.data,Date.parse('2026-11-01T00:00:00+09:00'));assert.deepEqual(reset.data.slots,[1,4,7,25]);assert.equal(reset.data.owned[4].id,4);assert.ok(reset.data.caught[5]);
});
