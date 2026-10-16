'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pickEvolutionItem}=require('../consumables.cjs'),{Game}=require('../game.cjs'),{combatant}=require('../battle.cjs');
const stones=[81,82,83,84,85],now=Date.parse('2026-10-16T04:00:00Z');
function distribution(inventory,n=100000){const result=Object.fromEntries(stones.map(id=>[id,0]));for(let i=0;i<n;i++)result[pickEvolutionItem(stones,inventory,()=>(i+.5)/n)]++;return result;}
function fixture(inventory){const g=new Game({},now,{random:()=>.73});g.data.inventory={...inventory};g.data.battle={kind:'wild',foe:combatant(19,5),party:{},turn:0};return g;}
test('equal or empty stocks keep every eligible stone equally likely',()=>{
  for(const inventory of [{},Object.fromEntries(stones.map(id=>[id,4]))])assert.deepEqual(distribution(inventory,1000),{81:200,82:200,83:200,84:200,85:200});
  assert.equal(pickEvolutionItem([],{},()=>assert.fail('An empty pool needs no draw')),null);
});
test('a pile of thunder stones is strongly reduced but can still drop',()=>{
  const counts=distribution({83:3});assert.ok(counts[83]>=1538&&counts[83]<=1539);
  for(const id of stones.filter(id=>id!==83))assert.ok(counts[id]>=24615&&counts[id]<=24616);
  assert.ok(counts[83]>0);
});
test('spending a stone restores its priority without changing stock during selection',()=>{
  const inventory={81:2,82:2,83:5,84:2,85:2},before={...inventory},high=distribution(inventory,10000);assert.deepEqual(inventory,before);
  inventory[83]=0;const low=distribution(inventory,10000);assert.ok(high[83]<high[81]);assert.ok(low[83]>low[81]);assert.ok(low[83]>high[83]);
});
test('wild wins and captures award one eligible stone, preserve inventory, and retain the bias after reload',()=>{
  for(const captured of [false,true])for(const selector of [0,.25,.5,.75,.999999]){
    const g=fixture({83:3,25:2}),draws=[.014999,selector,.99];g.random=()=>{assert.ok(draws.length);return draws.shift();};g.defeatOpponent(now,captured);
    assert.equal(draws.length,0);assert.equal(g.data.inventory[25],2);assert.equal(g.data.battle,null);
    const gained=stones.filter(id=>(g.data.inventory[id]||0)-(id===83?3:0)===1);assert.equal(gained.length,1);assert.equal(Object.values(g.data.inventory).reduce((n,v)=>n+v,0),6);
    const loaded=new Game(JSON.parse(JSON.stringify(g.data)),now);assert.deepEqual(loaded.data.inventory,g.data.inventory);
    assert.equal(pickEvolutionItem(stones,loaded.data.inventory,()=>.5),pickEvolutionItem(stones,g.data.inventory,()=>.5));
  }
});
test('the 1.5 percent drop gate and the independent recovery-item roll remain unchanged',()=>{
  const g=fixture({83:3}),draws=[.015,.99];g.random=()=>{assert.ok(draws.length);return draws.shift();};g.defeatOpponent(now);assert.deepEqual(g.data.inventory,{83:3});assert.equal(draws.length,0);
});
