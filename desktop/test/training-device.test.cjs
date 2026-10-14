'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),training=require('../training-device.cjs'),{combatant}=require('../battle.cjs'),{data,species,xpAt,learnedMoves}=require('../pokemon.cjs');
const now=Date.parse('2026-10-14T10:00:00Z'),rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function fixture(){return new Game({},now,{random:()=>.73});}
function count(g,n){for(let id=1;g.kantoCaughtCount()<n;id++)g.data.caught[id]=now;}
function level(g,uid,n){const p=g.data.owned[uid];p.level=n;p.xp=xpAt(p.id,n);p.moves=learnedMoves(p.id,n);}
function advance(g){return g.tick(Math.max(now,g.data.switchUntil,g.nextTick));}
function win(g){let i=0;while(g.data.battle){assert.ok(i++<25);if(g.data.pendingBattle?.kind==='story-next')advance(g);else g.defeatOpponent(Math.max(now,g.data.switchUntil,g.nextTick));}}
function unlock(g){g.data.badges=data.bosses.slice(0,4).map(b=>b.id);count(g,50);assert.ok(g.challenge('rocket-grunt',now));win(g);assert.ok(g.challenge('road-snorlax',g.data.switchUntil));win(g);assert.ok(g.requestAction('device-claim',undefined,g.data.switchUntil));if(!training.has(g))assert.ok(advance(g));assert.ok(training.has(g));}
function device(g,uid){g.data.trainingDevice.obtainedAt=now;g.data.trainingDevice.learnerUid=uid;}

test('Erika unlocks Rocket, the flute unlocks Snorlax, and a single Snorlax clear awards the device without a dex quota',()=>{
  const g=fixture();g.data.badges=data.bosses.slice(0,4).map(b=>b.id);
  assert.equal(training.has(g),false);assert.equal(training.canClaim(g),false);assert.equal(g.canChallenge('road-snorlax'),false);assert.equal(g.canChallenge('__proto__'),false);
  assert.equal(g.canChallenge('rocket-giovanni'),false);assert.ok(g.canChallenge('rocket-grunt'));assert.ok(g.challenge('rocket-grunt',now));const badges=[...g.data.badges];win(g);
  assert.deepEqual(g.data.badges,badges);assert.ok(g.data.trainingDevice.rocketWonAt);assert.equal(g.canChallenge('rocket-giovanni'),false);assert.equal(training.canClaim(g),false);assert.ok(g.canChallenge('road-snorlax'));
  assert.equal(g.canChallenge(4),false);assert.ok(g.challenge('road-snorlax',g.data.switchUntil));win(g);assert.ok(training.has(g));assert.ok(g.canChallenge(4));assert.ok(g.kantoCaughtCount()<50);assert.equal(training.canClaim(g),false);const serial=g.data.eventSerial;
  assert.ok(g.requestAction('device-claim',undefined,g.data.switchUntil));assert.equal(g.data.eventSerial,serial);assert.equal(g.data.journal.filter(e=>e.kind==='device').length,1);
});

test('story reservations wait through capture and result playback, cancel, survive restart and cannot capture or award badges',()=>{
  let g=fixture();g.data.badges=data.bosses.slice(0,4).map(b=>b.id);g.newWild(now);g.data.battle.foe=combatant(19,5,[150]);g.data.battle.foe.hp=1;g.random=()=>0;assert.ok(g.capture(now));
  assert.ok(g.challenge('rocket-grunt',now));assert.equal(g.snapshot(now).pendingChallenge.name,'로켓단 조무래기');assert.ok(g.cancelChallenge(now));assert.ok(g.challenge('rocket-grunt',now));
  const end=g.data.switchUntil;g=new Game(g.data,now+1,{random:()=>.73});assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));assert.equal(g.data.battle,null);assert.ok(g.tick(end+1));
  assert.equal(g.data.battle.storyId,'rocket-grunt');assert.equal(g.snapshot(end+1).battle.teamSize,2);assert.equal(g.data.battle.foe.id,20);g.data.battle.foe.hp=1;assert.equal(g.capture(end+2),false);
  win(g);assert.equal(g.data.badges.length,4);assert.equal(g.data.adventure.totals.story,3);assert.ok(!g.data.caught[95]);
  assert.ok(g.challenge('road-snorlax',g.data.switchUntil));assert.equal(g.data.battle.foe.id,143);assert.equal(g.data.battle.foe.level,30);win(g);assert.ok(!g.data.caught[143]);assert.equal(g.data.badges.length,4);assert.equal(g.canChallenge('road-snorlax'),true);
});

test('loss, abandon and incomplete teams do not complete story quests, and native simulator resumes a story battle',()=>{
  let g=fixture();assert.equal(g.challenge('rocket-grunt',now),false);g.data.badges=data.bosses.slice(0,4).map(b=>b.id);g.challenge('rocket-grunt',now);assert.ok(g.requestAction('abandon',undefined,now));assert.ok(advance(g));assert.equal(g.data.trainingDevice.rocketWonAt,null);assert.ok(g.canChallenge('rocket-grunt'));
  g.challenge('rocket-grunt',g.data.switchUntil);for(const p of Object.values(g.data.battle.party))p.hp=0;assert.ok(advance(g));assert.ok(advance(g));assert.equal(g.data.battle,null);assert.equal(g.data.trainingDevice.rocketWonAt,null);
  for(const uid of g.data.slots)level(g,uid,45);g.random=rng(5);g.challenge('rocket-grunt',g.data.switchUntil);assert.ok(advance(g));assert.ok(g.data.battle.sim);const turn=g.data.battle.turn;
  g=new Game(g.data,g.data.switchUntil,{random:rng(6)});assert.ok(advance(g));assert.ok(g.data.battle.turn>turn||g.data.pendingBattle);
  let i=0;while(g.data.battle&&i++<200)assert.ok(advance(g));assert.ok(i<200);assert.ok(g.data.trainingDevice.rocketWonAt);assert.equal(g.data.badges.length,4);assert.equal(g.canChallenge('rocket-giovanni'),false);
  const fighter=g.addPokemon(68,50,'fixture',now);g.data.slots[0]=fighter;g.data.activeId=fighter;g.data.workTokens=50000;assert.ok(g.challenge('road-snorlax',g.data.switchUntil));i=0;while(g.data.battle&&i++<200)assert.ok(advance(g));assert.ok(i<200);assert.ok(g.data.trainingDevice.snorlaxWonAt,JSON.stringify(g.data.journal.slice(-5)));assert.equal(g.data.badges.length,4);
});

test('a claim can wait for unmet requirements and its final animation without granting effects early',()=>{
  const g=fixture();assert.ok(g.requestAction('device-claim',undefined,now));assert.equal(advance(g),false);assert.equal(training.has(g),false);assert.match(g.pendingActions(now)[0].reason,/잠만보/);
  g.data.badges=data.bosses.slice(0,4).map(b=>b.id);g.data.trainingDevice.snorlaxWonAt=now;g.animate('result',{text:'잠만보 승리'},now);assert.equal(g.tick(g.data.switchUntil-1),false);assert.equal(training.has(g),false);
  assert.ok(advance(g));assert.ok(training.has(g));assert.equal(g.data.pendingActions.length,0);assert.match(g.data.animation.text,/학습장치/);assert.ok(g.panelState(now).summary.highlights.some(e=>e.kind==='device'));
});

test('one learner can be selected outside the four slots and receives exactly 10 percent extra after the dex booster',()=>{
  for(const n of [4,50,151])for(const trainer of [false,true]){
    const g=fixture(),uid=g.addPokemon(133,5,'fixture',now),reserve=g.addPokemon(19,5,'fixture',now);count(g,n);device(g,null);const slots=[...g.data.slots];assert.ok(g.requestAction('device-learner',uid,now));assert.deepEqual(g.data.slots,slots);assert.equal(g.data.activeId,25);
    const before=structuredClone(g.data.owned),foe=combatant(19,20),base=Math.floor(species.get(19).baseExperience*20/7*(trainer?1.5:1)),gained=base+Math.floor(base*g.kantoCaughtCount()/151),shared=Math.floor(gained/10);
    assert.equal(g.awardXp(foe,trainer,now),gained);assert.equal(g.data.owned[25].xp-before[25].xp,gained);assert.equal(g.data.owned[uid].xp-before[uid].xp,shared);assert.equal(g.data.adventure.totals.xp,gained+shared);
    for(const other of [1,4,7,reserve])assert.deepEqual(g.data.owned[other],before[other]);
  }
});

test('active, boarded and fainted learners never get extra XP and zero or level-100 recipients cannot inflate journal totals',()=>{
  for(const kind of ['active','boarded','fainted','cap']){
    const g=fixture(),uid=kind==='active'?25:7;device(g,uid);g.newWild(now);if(kind==='boarded')g.data.daycare={parents:[7,1]};if(kind==='fainted')g.data.battle.party[7].hp=0;if(kind==='cap')level(g,uid,100);
    const xp=g.data.owned[uid].xp,gained=g.awardXp(combatant(19,50),false,now);assert.equal(g.data.owned[uid].xp-xp,kind==='active'?gained:0);assert.equal(g.data.adventure.totals.xp,gained);
  }
  const g=fixture(),uid=g.addPokemon(133,5,'fixture',now);device(g,uid);level(g,25,100);const before=g.data.owned[uid].xp,gained=g.awardXp(combatant(150,100),false,now);assert.equal(g.data.owned[uid].xp-before,Math.floor(gained/10));assert.equal(g.data.adventure.totals.xp,Math.floor(gained/10));
});

test('capture success defers all active and learner XP until full animation completion, then commits once across restart',()=>{
  let g=fixture(),uid=g.addPokemon(133,5,'fixture',now);device(g,uid);g.newWild(now);g.data.battle.foe=combatant(19,20,[150]);g.data.battle.foe.hp=1;g.random=()=>0;
  const before=structuredClone(g.data.owned);assert.ok(g.capture(now));const end=g.data.switchUntil;g=new Game(g.data,now+1);assert.equal(g.tick(end-1),false);assert.deepEqual(g.data.owned,before);assert.ok(g.tick(end));
  const activeGain=g.data.owned[25].xp-before[25].xp,shared=g.data.owned[uid].xp-before[uid].xp;assert.ok(activeGain>0);assert.equal(shared,Math.floor(activeGain/10));const after=structuredClone(g.data.owned);
  g=new Game(g.data,end+1);g.tick(end+1);assert.deepEqual(g.data.owned,after);assert.equal(g.data.journal.filter(e=>e.kind==='catch').length,1);
});

test('trade evolutions require a device level-up in the exact prior form; other conditions and old species records remain',()=>{
  const g=fixture(),first=g.addPokemon(64,20,'fixture',now),sibling=g.addPokemon(64,20,'hatch',now),machoke=g.addPokemon(67,28,'fixture',now);assert.equal(g.evolve(first,65,now),false);assert.ok(g.requestAction('evolve',{id:first,to:65},now));assert.equal(advance(g),false);
  unlock(g);g.data.manualSelection=true;assert.ok(g.requestAction('device-learner',first,g.data.switchUntil));assert.ok(advance(g));assert.equal(g.data.trainingDevice.learnerUid,first);assert.equal(advance(g),false);assert.equal(g.evolve(first,65,g.data.switchUntil),false);
  g.data.owned[first].xp=xpAt(64,21)-1;g.awardXp(combatant(19,20),false,g.data.switchUntil);assert.ok(advance(g));assert.equal(g.data.owned[first].id,65);assert.equal(g.data.owned[sibling].id,64);assert.ok(g.data.caught[64]&&g.data.caught[65]);assert.ok(training.has(g));assert.equal(g.evolve(machoke,68,g.data.switchUntil),false);
  assert.ok(g.requestAction('device-learner',machoke,g.data.switchUntil));g.data.owned[machoke].xp=xpAt(67,29)-1;g.awardXp(combatant(19,20),false,g.data.switchUntil);assert.equal(g.data.owned[machoke].id,68);
  const onix=g.addPokemon(95,30,'fixture',now);assert.ok(g.requestAction('device-learner',onix,g.data.switchUntil));g.data.owned[onix].xp=xpAt(95,31)-1;g.awardXp(combatant(19,20),false,g.data.switchUntil);assert.equal(g.data.owned[onix].id,95);g.data.champion=true;g.unlockJohto(g.data.switchUntil);assert.equal(g.evolve(onix,208,g.data.switchUntil),false);g.data.inventory[210]=1;assert.ok(advance(g));assert.equal(g.data.owned[onix].id,208);assert.equal(g.data.inventory[210],0);assert.ok(training.has(g));
});

test('learner changes wait for battle completion and reload preserves exact learning and evolution progress without retroactive XP',()=>{
  let g=fixture();device(g,1);g.newWild(now);g.data.caught[g.data.battle.foe.id]=now;const before=structuredClone(g.data.owned);assert.ok(g.requestAction('device-learner',7,now));assert.equal(g.data.trainingDevice.learnerUid,1);
  g=new Game(g.data,now+1);assert.deepEqual(g.data.owned,before);assert.equal(g.data.trainingDevice.learnerUid,1);g.defeatOpponent(g.data.switchUntil);assert.equal(g.data.trainingDevice.learnerUid,1);assert.ok(advance(g));assert.equal(g.data.trainingDevice.learnerUid,7);
  const at=g.data.switchUntil;assert.ok(g.requestAction('device-learner',null,at));assert.equal(g.data.trainingDevice.learnerUid,null);assert.ok(g.requestAction('device-learner',null,at));assert.equal(g.requestAction('device-learner',9999,at),false);
});
