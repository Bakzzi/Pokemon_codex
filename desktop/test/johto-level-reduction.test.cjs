'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{xpAt,levelAt,statsAt}=require('../pokemon.cjs'),training=require('../training-device.cjs');
const now=Date.parse('2026-10-15T08:00:00Z');
function fixture(){const g=new Game({},now,{random:()=>.73});g.data.champion=true;return g;}

test('Johto unlock thirds only Lv15+ owned individuals, including reserves and boarded partners, with consistent species XP',()=>{
  const g=fixture(),uids=[];
  for(const level of [1,14,15,16,44,45,50,90,100]){
    const uid=g.addPokemon(6,level,'fixture',now),p=g.data.owned[uid];uids.push(uid);
    if(level<100)p.xp+=Math.floor((xpAt(6,level+1)-p.xp)*.42);
  }
  g.data.activeId=uids[7];g.data.slots=[uids[7],uids[2],null,null,null,null];g.data.daycare={parents:[uids[1],uids[6]],progress:123,required:20000,produced:false};g.data.egg={id:4,progress:100,required:1000,parents:[uids[1],uids[6]]};g.data.inventory[82]=3;
  const before=structuredClone(g.data),boost=g.experienceBoost(),preview=g.johtoUnlockPreview();assert.equal(preview.count,7);assert.equal(g.data.johtoLevelReduction,undefined);
  assert.ok(g.unlockJohto(now));assert.equal(g.maxGeneration(),2);
  for(const [uid,old] of Object.entries(before.owned)){
    const p=g.data.owned[uid],expected=old.level>=15?Math.floor(old.level/3):old.level;
    assert.equal(p.level,expected);assert.equal(levelAt(p.id,p.xp),expected);assert.deepEqual({...p,level:old.level,xp:old.xp,moves:old.moves},old);
    assert.deepEqual(p.moves,require('../move-access.cjs').catalog(p).filter(m=>m.level<=expected).map(m=>m.move));
    if(old.level<15)assert.deepEqual(p,old);
    else if(old.level===100)assert.equal(p.xp,xpAt(p.id,33));
    else{
      const oldRatio=(old.xp-xpAt(old.id,old.level))/(xpAt(old.id,old.level+1)-xpAt(old.id,old.level)),range=xpAt(p.id,p.level+1)-xpAt(p.id,p.level);
      assert.equal(p.xp-xpAt(p.id,p.level),Math.floor(oldRatio*range));
    }
  }
  for(const key of ['caught','seen','slots','activeId','inventory','daycare','egg'])assert.deepEqual(g.data[key],before[key]);assert.deepEqual(g.experienceBoost(),boost);
  assert.deepEqual(g.data.johtoLevelReduction.changes,preview.changes);g.newWild(now);assert.deepEqual(g.data.battle.party[g.data.activeId].stats,statsAt(6,30));
});

test('staying does not reduce levels, while unlock is applied once across duplicate requests and reload',()=>{
  let g=fixture();const uid=g.addPokemon(143,90,'fixture',now),before=structuredClone(g.data.owned);
  assert.ok(g.stayInKanto(now));assert.deepEqual(g.data.owned,before);assert.ok(g.unlockJohto(now+1));assert.equal(g.data.owned[uid].level,30);
  const owned=structuredClone(g.data.owned),reduction=structuredClone(g.data.johtoLevelReduction);
  assert.equal(g.unlockJohto(now+2),false);assert.ok(g.requestAction('johto-unlock',undefined,now+2));g=new Game(g.data,now+3);
  assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.data.johtoLevelReduction,reduction);assert.equal(g.data.journal.filter(e=>e.kind==='unlock').length,1);
});

test('a region request waits for the battle and result presentation before reducing levels',()=>{
  let g=fixture();const uid=g.addPokemon(143,90,'fixture',now);g.data.activeId=uid;g.data.slots=[uid,null,null,null,null,null];g.newWild(now);
  const party=structuredClone(g.data.battle.party);assert.equal(g.unlockJohto(now),false);assert.ok(g.requestAction('johto-unlock',undefined,now));
  assert.equal(g.data.owned[uid].level,90);assert.deepEqual(g.data.battle.party,party);assert.equal(g.maxGeneration(),1);
  g.defeatOpponent(g.data.switchUntil);const end=g.data.switchUntil;g=new Game(g.data,end-1);
  assert.equal(g.tick(end-1),false);assert.equal(g.data.owned[uid].level,90);assert.equal(g.maxGeneration(),1);
  assert.ok(g.tick(end));assert.equal(g.data.owned[uid].level,30);assert.equal(g.maxGeneration(),2);assert.equal(g.data.pendingActions.length,0);
});

test('a previously earned device evolution survives level reduction and restart without granting proof to another individual',()=>{
  let g=fixture();const uid=g.addPokemon(95,36,'fixture',now),other=g.addPokemon(95,36,'fixture',now);g.data.trainingDevice.obtainedAt=now;
  g.data.owned[uid].deviceLevelUp={from:95,before:35,level:36,at:now,autoPending:false};const proof=structuredClone(g.data.owned[uid].deviceLevelUp);
  assert.ok(g.unlockJohto(now+1));assert.equal(g.data.owned[uid].level,12);g=new Game(g.data,now+2);
  assert.deepEqual(g.data.owned[uid].deviceLevelUp,proof);assert.equal(training.hasLearnedLevel(g,g.data.owned[uid]),true);assert.equal(training.hasLearnedLevel(g,g.data.owned[other]),false);
  g.data.inventory[210]=2;assert.equal(g.evolve(other,208,now+2),false);assert.ok(g.evolve(uid,208,now+2));assert.equal(g.data.owned[uid].level,12);assert.equal(g.data.inventory[210],1);
});

test('already unlocked legacy saves never receive a retroactive reduction',()=>{
  const g=fixture(),uid=g.addPokemon(143,90,'fixture',now);g.data.johtoUnlocked=true;const before=structuredClone(g.data.owned),loaded=new Game(g.data,now+1);
  assert.equal(loaded.maxGeneration(),2);assert.deepEqual(loaded.data.owned,before);assert.equal(loaded.data.johtoLevelReduction,undefined);assert.equal(loaded.unlockJohto(now+2),false);assert.equal(loaded.data.owned[uid].level,90);
});

test('preview follows the Lv15 boundary without modifying progress, and non-champions cannot apply it',()=>{
  const g=fixture(),uid=g.addPokemon(143,14,'fixture',now);assert.equal(g.johtoUnlockPreview().count,0);
  g.gainXp(uid,xpAt(143,15)-g.data.owned[uid].xp,now);assert.equal(g.panelState(now).johtoUnlockPreview.count,1);
  const before=structuredClone(g.data.owned);g.data.champion=false;assert.equal(g.unlockJohto(now),false);assert.deepEqual(g.data.owned,before);
});
