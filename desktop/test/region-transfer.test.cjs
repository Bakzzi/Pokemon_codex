'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{xpAt,levelAt}=require('../pokemon.cjs'),transfer=require('../region-transfer.cjs'),training=require('../training-device.cjs');
const now=Date.parse('2026-10-16T08:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.data.champion=true;return g;}
test('travel permits only forms achievable at Lv15 using native Kanto ancestry, independently of wild minimum',()=>{
  for(const [id,minimum] of [[12,10],[15,10],[5,16],[6,36],[31,16],[26,1],[65,17],[68,29],[76,26],[94,26],[150,1],[151,1],[143,1],[124,1],[125,1],[126,1],[106,1],[134,1]])assert.equal(transfer.minimumEvolutionLevel(id),minimum,'No.'+id);
});
test('only explicitly chosen individuals travel at Lv15; dex, booster, bag and egg remain',()=>{
  const g=fixture(),butterfly=g.addPokemon(12,90,'fixture',now),mew=g.addPokemon(151,5,'fixture',now),other=g.addPokemon(143,100,'fixture',now),char=g.addPokemon(5,30,'fixture',now);
  g.data.slots=[char,null,butterfly,null,null,null];g.data.activeId=char;g.data.daycare={parents:[butterfly,other],progress:40};g.data.egg={id:133,progress:100,required:1000,parents:[butterfly,other]};g.data.inventory[82]=3;g.data.trainingDevice.learnerUid=other;
  const before=structuredClone(g.data),boost=g.experienceBoost();assert.ok(g.unlockJohto(now,[butterfly,mew]));
  assert.deepEqual(Object.keys(g.data.owned).map(Number).sort((a,b)=>a-b),[butterfly,mew].sort((a,b)=>a-b));
  for(const p of Object.values(g.data.owned)){assert.equal(p.level,15);assert.equal(p.xp,xpAt(p.id,15));assert.equal(levelAt(p.id,p.xp),15);}
  for(const key of ['caught','seen','seasonCaught','inventory','egg'])assert.deepEqual(g.data[key],before[key]);assert.deepEqual(g.experienceBoost(),boost);
  assert.deepEqual(g.data.slots,[null,null,butterfly,null,null,null]);assert.equal(g.data.activeId,butterfly);assert.equal(g.data.daycare,null);assert.equal(g.data.trainingDevice.learnerUid,null);
  assert.equal(g.panelState(now).collection.find(p=>p.id===143).owned,false);assert.equal(g.panelState(now).collection.find(p=>p.id===143).caught,true);assert.ok(!g.data.owned[mew].moves.includes(94));
  const saved=structuredClone(g.data);assert.equal(g.unlockJohto(now+1,[butterfly]),false);assert.deepEqual(new Game(g.data,now+2).data.owned,saved.owned);
});
test('invalid, implicit, duplicate, unavailable and excessive selections do not mutate progress',()=>{
  const g=fixture(),bad=g.addPokemon(5,20,'fixture',now),many=Array.from({length:11},()=>g.addPokemon(19,20,'fixture',now));
  const before=structuredClone(g.data);for(const ids of [undefined,[],[25,25],[99999],[bad],many]){assert.equal(g.unlockJohto(now,ids),false);assert.deepEqual(g.data,before);}
  assert.ok(g.unlockJohto(now,many.slice(0,10)));assert.equal(Object.keys(g.data.owned).length,10);assert.equal(new Set(Object.values(g.data.owned).map(p=>p.id)).size,1);
});
test('queued travel waits for battle playback, persists exact UIDs, and supports replacing the selection',()=>{
  let g=fixture();const other=g.addPokemon(143,90,'fixture',now);g.newWild(now);
  assert.ok(g.requestAction('johto-unlock',{uids:[25]},now));assert.ok(g.requestAction('johto-unlock',{uids:[other]},now));assert.equal(g.data.pendingActions.length,1);
  g.defeatOpponent(g.data.switchUntil);const end=g.data.switchUntil;g=new Game(g.data,end-1);assert.deepEqual(g.data.pendingActions[0].uids,[other]);assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));assert.equal(g.maxGeneration(),2);assert.equal(g.data.owned[other].level,15);assert.equal(g.data.owned[25],undefined);assert.equal(g.data.slots.filter(Boolean)[0],other);
});
test('a queued selection that evolves into an ineligible form is canceled without retiring anyone',()=>{
  const g=fixture(),uid=g.addPokemon(4,20,'fixture',now);g.newWild(now);assert.ok(g.requestAction('johto-unlock',{uids:[uid]},now));
  g.data.owned[uid].id=5;g.data.battle=null;const before=Object.keys(g.data.owned);g.processActions(now);assert.equal(g.maxGeneration(),1);assert.deepEqual(Object.keys(g.data.owned),before);assert.equal(g.data.pendingActions.length,0);
});
test('legacy unlocked saves and old queued requests never trigger a destructive new transition',()=>{
  const g=fixture(),uid=g.addPokemon(143,90,'fixture',now);g.data.johtoUnlocked=true;const before=structuredClone(g.data.owned);assert.deepEqual(new Game(g.data,now+1).data.owned,before);
  g.data.johtoUnlocked=false;g.data.pendingActions=[{kind:'johto-unlock',id:1,queuedAt:now}];const loaded=new Game(g.data,now+2);assert.equal(loaded.data.pendingActions.length,0);loaded.processActions(now+3);assert.equal(loaded.data.owned[uid].level,90);
});
test('device learning proof remains individual across transfer without granting another a learned level',()=>{
  let g=fixture();const uid=g.addPokemon(95,36,'fixture',now),other=g.addPokemon(95,36,'fixture',now);g.data.trainingDevice.obtainedAt=now;g.data.owned[uid].deviceLevelUp={from:95,before:35,level:36,at:now,autoPending:false};
  assert.ok(g.unlockJohto(now+1,[uid,other]));g=new Game(g.data,now+2);assert.equal(training.hasLearnedLevel(g,g.data.owned[uid]),true);assert.equal(training.hasLearnedLevel(g,g.data.owned[other]),false);g.data.inventory[210]=2;assert.equal(g.evolve(other,208,now+2),false);assert.ok(g.evolve(uid,208,now+2));assert.equal(g.data.owned[uid].level,15);
});
