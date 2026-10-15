'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{data,xpAt}=require('../pokemon.cjs'),training=require('../training-device.cjs');
const now=Date.parse('2026-10-15T04:00:00Z'),fixture=()=>new Game({},now,{random:()=>.73});
function win(g){let turns=0;while(g.data.battle){assert.ok(++turns<20);g.defeatOpponent(Math.max(now,g.data.switchUntil));}}
function boss(g,index){assert.ok(g.challenge(index,Math.max(now,g.data.switchUntil,g.nextTick)));win(g);}

test('a fresh adventure owns only Pikachu, starts with five empty slots and can fight with one selected Pokemon',()=>{
  const g=fixture(),s=g.panelState(now);assert.deepEqual(Object.keys(g.data.owned),['25']);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.equal(s.caughtCount,1);assert.equal(s.slots.filter(p=>p.empty).length,5);
  g.newWild(now);assert.deepEqual(Object.keys(g.data.battle.party),['25']);assert.equal(g.availablePartners().length,1);assert.equal(g.data.owned[1],undefined);
});

test('Brock, Misty and Surge each give one level-ten starter after the victory, with no duplicate on reload or retries',()=>{
  let g=fixture();for(const [index,id] of [[0,1],[1,4],[2,7]]){
    assert.equal(g.data.owned[id],undefined);assert.equal(g.awardStarterGift(data.bosses[index].id,now),false);boss(g,index);
    const p=g.data.owned[id];assert.equal(p.level,10);assert.equal(p.origin,'gift');assert.ok(g.data.caught[id]);assert.ok(g.data.seasonCaught[id]);assert.ok(g.data.slots.includes(id));assert.ok(g.data.starterGifts[id]);
    const before=structuredClone(g.data.owned);g=new Game(g.data,g.data.switchUntil);assert.deepEqual(g.data.owned,before);assert.equal(g.awardStarterGift(data.bosses[index].id,g.data.switchUntil),false);assert.equal(g.canChallenge(index),false);
  }
  assert.deepEqual(g.data.slots,[25,1,4,7,null,null]);assert.equal(Object.keys(g.data.owned).length,4);
});

test('a lost or abandoned gym never gives a starter; a full six-member party sends a gift to the collection',()=>{
  const g=fixture();assert.ok(g.challenge(0,now));g.endChallenge(false,g.data.switchUntil);assert.equal(g.data.owned[1],undefined);assert.equal(g.data.starterGifts[1],undefined);
  for(const [i,id] of [16,19,21,23,27].entries())g.data.slots[i+1]=g.addPokemon(id,5,'fixture',now);
  const slots=[...g.data.slots];boss(g,0);assert.deepEqual(g.data.slots,slots);assert.equal(g.data.owned[1].level,10);assert.equal(g.data.slots.includes(1),false);
});

test('cleared positions survive reload, catches do not fill them, and slot six supports assignment and removal',()=>{
  let g=fixture();boss(g,0);const at=g.data.switchUntil;assert.ok(g.requestAction('slot',{slot:1,id:null},at));assert.equal(g.data.slots[1],null);const p=g.addPokemon(19,5,'catch',at);
  g=new Game(g.data,at);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.ok(g.setSlot(5,p,at));assert.equal(g.data.slots[5],p);assert.ok(g.setSlot(5,null,at));assert.equal(g.setSlot(6,p,at),false);assert.equal(g.requestAction('slot',{slot:0,id:null},at),false);
});

test('removing the active Pokemon waits through a wild battle and result, survives reload, and selects another placed companion',()=>{
  let g=fixture();boss(g,0);g.newWild(g.data.switchUntil);const at=g.data.switchUntil;assert.ok(g.requestAction('slot',{slot:0,id:null},at));assert.equal(g.data.activeId,25);assert.equal(g.data.slots[0],25);
  g=new Game(g.data,at);assert.equal(g.data.pendingActions[0].uid,null);g.defeatOpponent(at);assert.ok(g.tick(g.data.switchUntil));assert.equal(g.data.slots[0],null);assert.equal(g.data.activeId,1);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.pendingActions.length,0);
});

test('legacy four-member saves keep every owned individual and selected position without duplicating starter gifts',()=>{
  let g=fixture();for(const id of [1,4,7])g.addPokemon(id,5,'starter',now);g.data.slots=[1,4,7,25];delete g.data.partyRevision;delete g.data.starterGifts;const before=structuredClone(g.data.owned);
  g=new Game(g.data,now+1);assert.deepEqual(g.data.owned,before);assert.deepEqual(g.data.slots,[1,4,7,25,null,null]);boss(g,0);assert.deepEqual(Object.keys(g.data.owned).sort(),Object.keys(before).sort());
});

test('month rollover preserves the lifetime dex but restarts with only Pikachu and allows the three gifts again',()=>{
  let g=fixture();boss(g,0);boss(g,1);boss(g,2);const dex=structuredClone(g.data.caught);g=new Game(g.data,Date.parse('2026-11-01T00:00:00+09:00'));
  assert.deepEqual(g.data.caught,dex);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.deepEqual(Object.keys(g.data.owned),['25']);assert.deepEqual(g.data.starterGifts,{});boss(g,0);assert.equal(g.data.owned[1].level,10);assert.equal(g.experienceBoost().count,4);
});

test('champion tiers count only actual selected companions, including all six when filled and ignoring empty positions',()=>{
  const g=fixture();g.data.champion=true;g.data.owned[25].level=91;g.data.owned[25].xp=xpAt(25,91);assert.equal(g.encounterBonus().minimumLevel,91);assert.equal(g.encounterBonus().selectedCount,1);assert.equal(g.encounterBonus().levelMultiplier,5);
  const reserve=g.addPokemon(19,5,'fixture',now);assert.equal(g.encounterBonus().minimumLevel,91);g.data.slots[5]=reserve;assert.equal(g.encounterBonus().minimumLevel,5);for(const [i,id] of [16,21,23,27].entries())g.data.slots[i+1]=g.addPokemon(id,81,'fixture',now);g.data.owned[reserve].level=81;assert.equal(g.encounterBonus().selectedCount,6);assert.equal(g.encounterBonus().minimumLevel,81);
});

test('an uncaught Snorlax can be queued during a gym battle without interrupting it, then starts after its result',()=>{
  let g=fixture();g.data.badges=data.bosses.slice(0,6).map(b=>b.id);g.data.trainingDevice.fluteObtainedAt=now;g.data.trainingDevice.snorlaxWonAt=now;assert.ok(g.challenge(6,now));const before=structuredClone(g.data.battle);
  assert.ok(g.challenge('road-snorlax',now+1));assert.deepEqual(g.data.battle,before);assert.equal(g.data.pendingChallenge.index,'road-snorlax');g=new Game(g.data,now+2);assert.equal(g.data.battle.bossIndex,6);win(g);assert.ok(g.tick(g.data.switchUntil));assert.equal(g.data.battle.storyId,'road-snorlax');assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.pendingChallenge,null);assert.equal(g.data.caught[143],undefined);
});

test('the dex uses a plain event category before and after owning a flute, and old-season Snorlax is retryable',()=>{
  const g=fixture(),entry=id=>g.panelState(now).collection.find(p=>p.id===id);for(const id of [1,4,7,143]){assert.ok(entry(id).acquisition.summary.split(' · ').includes('이벤트'));assert.ok(!/피리 이벤트|특수 이벤트/.test(entry(id).acquisition.summary));}
  assert.ok(!JSON.stringify(entry(143).acquisition).includes('피리'));g.data.trainingDevice.fluteObtainedAt=now;assert.equal(entry(143).acquisition.summary,'이벤트');g.data.season.resetAt=now;g.data.caught[143]=now-1;g.data.trainingDevice.snorlaxWonAt=now;assert.equal(training.snapshot(g).snorlaxCaught,false);assert.ok(g.canChallenge('road-snorlax'));
});
