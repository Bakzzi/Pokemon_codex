'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{data,xpAt,levelAt}=require('../pokemon.cjs'),transfer=require('../region-transfer.cjs'),training=require('../training-device.cjs');
const now=Date.parse('2026-10-16T08:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.data.champion=true;return g;}
test('travel permits only forms achievable at Lv5 using native Kanto ancestry, independently of wild minimum',()=>{
  for(const [id,minimum] of [[12,10],[15,10],[5,16],[6,36],[31,16],[26,1],[65,17],[68,29],[76,26],[94,26],[150,1],[151,1],[143,1],[124,1],[125,1],[126,1],[106,1],[134,1]])assert.equal(transfer.minimumEvolutionLevel(id),minimum,'No.'+id);
});
test('chosen registered species start at Lv5; dex, booster, bag and egg remain',()=>{
  const g=fixture(),caterpie=g.addPokemon(10,3,'fixture',now),mew=g.addPokemon(151,90,'fixture',now),other=g.addPokemon(143,100,'fixture',now),char=g.addPokemon(5,30,'fixture',now);
  g.data.slots=[char,null,caterpie,null,null,null];g.data.activeId=char;g.data.daycare={parents:[caterpie,other],progress:40};g.data.egg={id:133,progress:100,required:1000,parents:[caterpie,other]};g.data.inventory[82]=3;g.data.trainingDevice.learnerUid=other;
  const before=structuredClone(g.data),boost=g.experienceBoost();assert.ok(g.unlockJohto(now,[caterpie,mew]));
  assert.deepEqual(Object.keys(g.data.owned).map(Number).sort((a,b)=>a-b),[caterpie,mew].sort((a,b)=>a-b));
  for(const p of Object.values(g.data.owned)){assert.equal(p.level,5);assert.equal(p.xp,xpAt(p.id,5));assert.equal(levelAt(p.id,p.xp),5);}
  for(const key of ['caught','seen','seasonCaught','inventory','egg'])assert.deepEqual(g.data[key],before[key]);assert.deepEqual(g.experienceBoost(),boost);
  assert.deepEqual(g.data.slots,[null,null,caterpie,null,null,null]);assert.equal(g.data.activeId,caterpie);assert.equal(g.data.daycare,null);assert.equal(g.data.trainingDevice.learnerUid,null);
  assert.equal(g.panelState(now).collection.find(p=>p.id===143).owned,false);assert.equal(g.panelState(now).collection.find(p=>p.id===143).caught,true);assert.ok(!g.data.owned[mew].moves.includes(94));
  const saved=structuredClone(g.data);assert.equal(g.unlockJohto(now+1,[caterpie]),false);assert.deepEqual(new Game(g.data,now+2).data.owned,saved.owned);
});
test('invalid, implicit, duplicate, unavailable and excessive species selections do not mutate progress',()=>{
  const g=fixture(),bad=g.addPokemon(5,20,'fixture',now),many=[10,13,16,19,21,23,27,29,32,35,37];for(const id of many)g.addPokemon(id,20,'fixture',now);
  const before=structuredClone(g.data);for(const ids of [undefined,[],[25,25],[99999],[bad],many]){assert.equal(g.unlockJohto(now,ids),false);assert.deepEqual(g.data,before);}
  assert.ok(g.unlockJohto(now,many.slice(0,10)));assert.equal(Object.keys(g.data.owned).length,10);assert.equal(new Set(Object.values(g.data.owned).map(p=>p.id)).size,10);
});
test('queued travel waits for battle playback, persists chosen species, and supports replacing the selection',()=>{
  let g=fixture();const other=g.addPokemon(143,90,'fixture',now);g.newWild(now);
  assert.ok(g.requestAction('johto-unlock',{speciesIds:[25]},now));assert.ok(g.requestAction('johto-unlock',{speciesIds:[143]},now));assert.equal(g.data.pendingActions.length,1);
  g.defeatOpponent(g.data.switchUntil);const end=g.data.switchUntil;g=new Game(g.data,end-1);assert.deepEqual(g.data.pendingActions[0].speciesIds,[143]);assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));assert.equal(g.maxGeneration(),2);assert.equal(g.data.owned[other].level,5);assert.equal(g.data.owned[25],undefined);assert.equal(g.data.slots.filter(Boolean)[0],other);
});
test('queued species stays selectable when the current individual evolves before departure',()=>{
  const g=fixture(),uid=g.addPokemon(4,20,'fixture',now);g.newWild(now);assert.ok(g.requestAction('johto-unlock',{speciesIds:[4]},now));
  g.data.owned[uid].id=5;g.data.battle=null;g.nextTick=now;g.data.switchUntil=0;g.processActions(now);assert.equal(g.maxGeneration(),2);assert.deepEqual(Object.values(g.data.owned).map(p=>[p.id,p.level]),[[4,5]]);assert.notEqual(Object.values(g.data.owned)[0].uid,uid);assert.equal(g.data.pendingActions.length,0);
});
test('legacy unlocked saves and old queued requests never trigger a destructive new transition',()=>{
  const g=fixture(),uid=g.addPokemon(143,90,'fixture',now);g.data.johtoUnlocked=true;const before=structuredClone(g.data.owned);assert.deepEqual(new Game(g.data,now+1).data.owned,before);
  g.data.johtoUnlocked=false;g.data.pendingActions=[{kind:'johto-unlock',id:1,queuedAt:now,uids:[25]}];const loaded=new Game(g.data,now+2);assert.equal(loaded.data.pendingActions.length,0);loaded.processActions(now+3);assert.equal(loaded.data.owned[uid].level,90);
});
test('device learning proof remains individual across transfer without granting another a learned level',()=>{
  let g=fixture();const uid=g.addPokemon(95,36,'fixture',now),other=g.addPokemon(95,36,'fixture',now);g.data.trainingDevice.obtainedAt=now;g.data.owned[uid].deviceLevelUp={from:95,before:35,level:36,at:now,autoPending:false};
  assert.ok(g.unlockJohto(now+1,[95]));g=new Game(g.data,now+2);assert.equal(training.hasLearnedLevel(g,g.data.owned[uid]),true);assert.equal(g.data.owned[other],undefined);g.data.inventory[210]=2;assert.equal(g.evolve(other,208,now+2),false);assert.ok(g.evolve(uid,208,now+2));assert.equal(g.data.owned[uid].level,5);
});
test('permanent registry includes evolved-away and previous-season species without current ownership or level dependence',()=>{
  const g=fixture();g.addPokemon(4,90,'fixture',now);g.data.owned[4].id=6;g.data.caught[6]=now;g.data.caught[1]=now-100000;g.data.caught[150]=now-100000;g.data.seen[19]=now;g.data.seasonCaught={25:now,6:now};
  const preview=g.johtoUnlockPreview(),before=structuredClone(g.data.caught),boost=g.experienceBoost();
  for(const id of [1,4,25,150])assert.equal(preview.candidates.find(p=>p.id===id).eligible,true);assert.ok(!preview.candidates.some(p=>p.id===19));assert.equal(preview.candidates.find(p=>p.id===6).eligible,false);
  assert.ok(g.unlockJohto(now,[1,4,150]));assert.deepEqual(Object.values(g.data.owned).map(p=>[p.id,p.level]).sort((a,b)=>a[0]-b[0]),[[1,5],[4,5],[150,5]]);assert.deepEqual(g.data.caught,before);assert.deepEqual(g.experienceBoost(),boost);assert.equal(g.registeredThisSeason(1),true);assert.equal(g.registeredThisSeason(150),true);
});
test('duplicate owned individuals yield one registry choice and registered species do not vanish when ownership changes',()=>{
  const g=fixture();const a=g.addPokemon(133,5,'fixture',now);g.addPokemon(133,100,'fixture',now);assert.equal(g.johtoUnlockPreview().candidates.filter(p=>p.id===133).length,1);delete g.data.owned[a];assert.equal(g.johtoUnlockPreview().candidates.filter(p=>p.id===133).length,1);
});

test('the level-five selection excludes later level forms while keeping standalone and eligible stone forms',()=>{
 const g=fixture();for(const p of data.pokemon.filter(p=>p.generation===1))g.data.caught[p.id]=now;
 const preview=g.johtoUnlockPreview();assert.equal(preview.targetLevel,5);assert.equal(preview.maxCompanions,10);
 for(const p of preview.candidates){assert.equal(p.eligible,p.minimumLevel<=5);assert.equal(p.level,5);}
 for(const id of [11,12,14,15,17,18,2,3,5,6,8,9,65,68,76,94])assert.equal(preview.candidates.find(p=>p.id===id).eligible,false,'No.'+id);
 const selected=[10,13,16,25,26,106,133,134,143,150];assert.ok(g.unlockJohto(now,selected));
 assert.equal(g.panelState(now).roster.length,10);assert.deepEqual(g.data.johtoLevelReduction.selectedSpecies,selected);assert.equal(g.data.johtoLevelReduction.targetLevel,5);
 for(const p of g.panelState(now).roster){assert.equal(p.level,5);assert.equal(p.expPercent,0);assert.ok(p.moves.every(m=>m.active===(m.level<=5)));}
 for(const id of [12,5,151]){const entry=g.panelState(now).collection.find(p=>p.id===id);assert.ok(entry.caught);assert.equal(entry.owned,false);assert.equal(entry.level,null);}
});

test('a queued old selection which is no longer level-five eligible is rejected without retiring any companion',()=>{
 const old=fixture();old.addPokemon(12,70,'fixture',now);old.data.pendingActions=[{kind:'johto-unlock',id:1,queuedAt:now,speciesIds:[12]}];
 const before=structuredClone(old.data),g=new Game(old.data,now+1);g.nextTick=0;g.data.switchUntil=0;g.processActions(now+2);
 assert.equal(g.maxGeneration(),1);assert.deepEqual(g.data.owned,before.owned);assert.deepEqual(g.data.caught,before.caught);assert.equal(g.data.pendingActions.length,0);
});

test('already transferred level-fifteen saves retain all existing individuals and growth after the update',()=>{
 const old=fixture();old.addPokemon(12,15,'fixture',now);old.addPokemon(150,80,'fixture',now);old.data.johtoUnlocked=true;old.data.johtoLevelReduction={revision:3,targetLevel:15,at:now-1};
 const before=structuredClone(old.data),g=new Game(old.data,now+1);
 assert.deepEqual(g.data.owned,before.owned);assert.deepEqual(g.data.johtoLevelReduction,before.johtoLevelReduction);assert.equal(g.unlockJohto(now+2,[25]),false);
});
