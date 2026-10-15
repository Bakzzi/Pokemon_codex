'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{species,wildEligible,wildDistribution,pickWild}=require('../pokemon.cjs');
const trade=[65,68,76,94,186,199,208,212,230,233],other=[26,31,34,36,38,40,45,59,62,71,91,103,121,134,135,136,169,176,182,192,196,197,242];
const excluded=[...trade,...other],now=Date.parse('2026-10-15T06:00:00Z');

test('trade, stone, friendship and time evolution forms never enter any wild distribution or bonus path',()=>{
  for(const generation of [1,2])for(const level of [5,16,25,36,50,71,81,91,100])for(const champion of [false,true]){
    const d=wildDistribution(generation,level,{champion,minimumLevel:level,additions:[...excluded.map(id=>({id,extra:.001})),{id:145,extra:.004}]});
    for(const id of excluded){assert.equal(wildEligible(species.get(id),generation,level),false);assert.ok(!d.pokemon.some(p=>p.id===id));assert.ok(!d.additions.find(p=>p.id===id).eligible);}
    assert.ok(Math.abs(d.pokemon.reduce((n,p)=>n+p.chance,0)-1)<1e-12);
  }
});

test('actual ordinary, champion and special-bonus draws cannot select special evolution forms',()=>{
  for(const generation of [1,2])for(const champion of [false,true])for(const additions of [[],[{id:145,extra:.004}]]){
    for(let i=0;i<1000;i++){let draw=0;const id=pickWild(generation,()=>draw++===0?(i+.5)/1000:((i*37)%1000+.5)/1000,100,{champion,minimumLevel:91,additions});assert.ok(!excluded.includes(id));}
  }
});

test('hints for all legal special forms show evolution instead of wild appearance or hatching',()=>{
  const g=new Game({},now);g.data.champion=true;g.unlockJohto(now);
  const markedSpecial=new Set([...trade,26,31,34,36,38,40,45,59,62,71,91,103,121,134,135,136,182,192]);
  const collection=g.panelState(now).collection;
  for(const id of excluded.filter(id=>id!==26)){
    const hint=collection.find(p=>p.id===id).acquisition;assert.equal(hint.wildAllowed,false);assert.deepEqual(hint.routes.map(r=>r.kind),['evolution']);assert.equal(hint.routes[0].special,markedSpecial.has(id));assert.equal(hint.summary,markedSpecial.has(id)?'특수진화':'진화');assert.equal(hint.note,'진화로만 얻을 수 있어요.');
  }
  for(const id of trade)assert.ok(collection.find(p=>p.id===id).acquisition.routes[0].text.includes('학습장치'));
});

test('ordinary level forms and original base species with later baby pre-evolutions stay in the wild',()=>{
  for(const generation of [1,2])for(const id of [11,12,17,18,24,35,39,42,64,67,75,93,117])assert.ok(wildEligible(species.get(id),generation,100));
  assert.equal(wildEligible(species.get(11),1,6),false);assert.equal(wildEligible(species.get(11),1,7),true);
});

test('acquired special forms remain owned and can still be obtained through the learning-device evolution',()=>{
  const g=new Game({},now);g.data.trainingDevice.obtainedAt=now;
  const uid=g.addPokemon(64,20,'catch',now),p=g.data.owned[uid];g.data.trainingDevice.learnerUid=uid;
  const {xpAt}=require('../pokemon.cjs');p.xp=xpAt(64,21)-1;g.awardXp({id:19,level:20},false,now);
  assert.equal(g.data.owned[uid].id,65);assert.ok(g.data.caught[65]);assert.ok(new Game(g.data,now).data.owned[uid]);
});
