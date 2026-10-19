'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs');
const {Game}=require('../game.cjs'),{combatant}=require('../battle.cjs');
const J=require('../../shared/johto.cjs');
const at=Date.parse('2026-10-19T10:00:00Z');
function fixture(Type=Adventure){const old=new Game({},at);old.data.champion=true;const g=new Type(old.data,at,{random:()=>.73});assert.ok(g.unlockJohto(at,[25]));return g;}
function defeat(g,id,draw=.019999,extra={},captured=false){
 g.data.battle={kind:'wild',foe:combatant(id,20),party:{},turn:0,...extra};g.data.battle.foe.hp=0;
 const draws=[.99,...(!captured&&!extra.storyId&&!extra.freeChallenge&&g.maxGeneration()===2?[draw]:[]),.99];
 g.random=()=>draws.shift()??.99;g.defeatOpponent(at,captured);
}
const supplies=[[198,[79,61],2,61,186],[210,[81],2,95,208],[212,[116,117,147,148],1,117,230]];

test('PC and Android award the exact source species at 2 percent, with an exclusive upper boundary',()=>{
 for(const Type of [Adventure,Mobile])for(const [item,sources]of supplies)for(const id of sources){
  const miss=fixture(Type);defeat(miss,id,.02);assert.equal(miss.data.inventory[item]||0,0);
  const hit=fixture(Type);defeat(hit,id);assert.equal(hit.data.inventory[item],1);assert.equal(hit.data.evolutionItemTotals[item],1);
  assert.equal(hit.panelState(at).inventory.find(i=>i.id===item).count,1);
 }
});

test('captures, trainer battles, event battles and Kanto activity cannot award these supplies',()=>{
 for(const Type of [Adventure,Mobile])for(const [item,sources]of supplies){
  for(const [extra,captured]of [[{},true],[{kind:'trainer',bossIndex:0,foeIndex:0},false],[{storyId:'fixture-event'},false],[{freeChallenge:true},false]]){
   const g=fixture(Type);if(extra.kind==='trainer')g.battleBoss=()=>({name:'fixture',team:[{id:sources[0]},{id:129}]});
   defeat(g,sources[0],0,extra,captured);assert.equal(g.data.inventory[item]||0,0);
  }
  const kanto=new Type(new Game({},at).data,at);defeat(kanto,sources[0],0);assert.equal(kanto.data.inventory[item]||0,0);
 }
 for(const id of [19,80,82,149]){const g=fixture();defeat(g,id,0);assert.ok(supplies.every(([item])=>!g.data.inventory[item]));}
});

test('seasonal acquisition caps survive actual evolution, emptied stock, reload and more victories',()=>{
 for(const Type of [Adventure,Mobile])for(const [item,sources,limit,parent,to]of supplies){
  let g=fixture(Type);for(let i=0;i<limit;i++)defeat(g,sources[i%sources.length],0);
  g.data.trainingDevice.obtainedAt=at;g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;
  const uid=g.addPokemon(parent,30,'fixture',at);g.data.owned[uid].deviceLevelUp={from:parent,before:29,level:30,at};
  assert.ok(g.evolve(uid,to,at));assert.equal(g.data.inventory[item],limit-1);
  g=new Type(structuredClone(g.data),at+1);defeat(g,sources[0],0);
  assert.equal(g.data.inventory[item],limit-1);assert.equal(g.data.evolutionItemTotals[item],limit);
 }
});

test('old saves preserve surplus stock and infer spent tools without counting permanent past-season dex records',()=>{
 for(const [item,,limit,parent,to]of supplies){
  const g=fixture();g.data.inventory[item]=limit+1;delete g.data.evolutionItemTotals;
  const migrated=new Adventure(g.data,at);assert.equal(migrated.data.inventory[item],limit+1);assert.equal(migrated.data.evolutionItemTotals[item],limit);
  const spent=fixture();spent.addPokemon(to,30,'fixture',at);spent.data.inventory[item]=limit-1;delete spent.data.evolutionItemTotals;
  const restored=new Adventure(spent.data,at);assert.equal(restored.data.evolutionItemTotals[item],limit);
 }
 const past=fixture();past.data.caught[230]=at;delete past.data.seasonCaught[230];delete past.data.evolutionItemTotals;
 assert.equal(new Adventure(past.data,at).data.evolutionItemTotals[212],0);
});

test('general stone rolls never yield any of the four finite tools',()=>{
 for(const Type of [Adventure,Mobile])for(let i=0;i<40;i++){
  const g=fixture(Type);g.data.battle={kind:'wild',foe:combatant(19,5),party:{},turn:0};
  const draws=[0,(i+.5)/40,.99];g.random=()=>draws.shift()??.99;g.defeatOpponent(at);
  assert.ok([198,210,212,229].every(id=>!g.data.inventory[id]));assert.equal(Object.values(g.data.inventory).reduce((n,v)=>n+v,0),1);
 }
});

test('the final regional victory grants Upgrade only after the closing dialogue and never twice',()=>{
 for(const Type of [Adventure,Mobile]){
  let g=fixture(Type);g.startJohtoBattle(J.nodes.get('j-red'),at);
  while(g.presentation()?.mode==='dialogue'){const s=g.presentation();g.advanceScene(s.id+':'+s.index,at);}
  g.sceneTick(at+5000);const b=g.data.battle;b.foeIndex=J.nodes.get('j-red').team.length-1;b.foe.hp=0;g.defeatOpponent(at+6000);
  assert.equal(g.data.inventory[229]||0,0);assert.equal(g.data.johto.cleared['j-red'],undefined);
  while(g.presentation()?.mode==='dialogue'){const s=g.presentation();g.advanceScene(s.id+':'+s.index,at+7000);}
  assert.equal(g.data.inventory[229],1);assert.equal(g.data.evolutionItemTotals[229],1);assert.ok(g.data.johto.cleared['j-red']);
  g=new Type(structuredClone(g.data),at+8000);g.completeJohtoNode(J.nodes.get('j-red'),at+9000);assert.equal(g.data.inventory[229],1);
  g.data.inventory[229]=0;g=new Type(structuredClone(g.data),at+10000);assert.equal(g.data.inventory[229],0);
 }
});

test('completed older stories receive a missing Upgrade once, but not an already held or consumed one',()=>{
 for(const Type of [Adventure,Mobile])for(const state of ['missing','held','spent']){
  const g=fixture(Type);g.data.johto.cleared['j-red']=at;delete g.data.evolutionItemTotals;
  if(state==='held')g.data.inventory[229]=1;if(state==='spent')g.addPokemon(233,30,'fixture',at);
  const loaded=new Type(g.data,at+1);assert.equal(loaded.data.inventory[229]||0,state==='spent'?0:1);
  assert.equal(loaded.data.evolutionItemTotals[229],1);assert.equal(new Type(loaded.data,at+2).data.inventory[229]||0,state==='spent'?0:1);
 }
 const unfinished=fixture();unfinished.data.johto.champion=true;assert.equal(new Adventure(unfinished.data,at).data.inventory[229]||0,0);
});

test('a new monthly season resets finite supplies along with inventory and story, preserving dex records',()=>{
 const g=fixture();defeat(g,79,0);g.data.johto.cleared['j-red']=at;g.awardCompletionItem(at);g.data.caught[199]=at;
 g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.deepEqual(g.data.inventory,{});assert.equal(g.data.evolutionItemTotals,undefined);assert.ok(g.data.caught[199]);
 const loaded=new Adventure(g.data,Date.parse('2026-11-01T01:00:01Z'));assert.equal(loaded.data.evolutionItemTotals[198],0);assert.equal(loaded.data.evolutionItemTotals[229],0);
});
