'use strict';
const {travelSpecies}=require('./helpers/region.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Game,STARTERS}=require('../game.cjs'),{monthOf}=require('../season.cjs'),{data,xpAt}=require('../pokemon.cjs'),{combatant}=require('../battle.cjs'),{Store}=require('../store.cjs');
const {Game:FourPartyGame}=require('./helpers/four-party.cjs');
const before=Date.parse('2026-10-31T14:59:59Z'),boundary=before+1000;
function veteran(){
  const g=new FourPartyGame({},before,{random:()=>.73});
  g.data.badges=data.bosses.slice(0,8).map(b=>b.id);g.data.champion=true;g.unlockJohto(before,travelSpecies(g));
  g.addPokemon(172,5,'hatch',before);g.addPokemon(143,30,'catch',before);
  g.data.owned[4].level=36;g.data.owned[4].xp=xpAt(4,36);require('../move-access.cjs').update(g.data.owned[4]);g.evolve(4,6,before);
  for(let id=1;id<=251;id++){g.data.caught[id]=before;g.data.seen[id]=before;}
  g.data.inventory[80]=2;g.data.trainingDevice={storyRevision:2,routeRevision:1,legacyRoadAccess:true,gruntWonAt:before,duoWonAt:before,rocketWonAt:before,fluteObtainedAt:before,snorlaxWonAt:before,obtainedAt:before,learnerUid:4};
  g.data.daycare={parents:[1,7],progress:500,offspring:[1]};g.data.egg={id:1,progress:100,required:1000};
  g.data.pendingActions=[{id:1,kind:'select',uid:7,queuedAt:before}];g.data.actionSerial=1;g.data.pendingChallenge={index:8,queuedAt:before};g.data.trainerSeen={giovanni:before,champion:before};
  g.data.workTokens=5000;g.data.outputTokens=9000;g.data.totalTokens=90000;g.data.baselines={active:{output:12000,total:120000,at:before}};
  g.data.animation=null;g.data.switchUntil=0;g.nextTick=before;return g;
}
function fresh(g,at=boundary){
  assert.equal(g.data.season.key,monthOf(at).key);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.equal(g.data.activeId,25);
  assert.deepEqual(Object.values(g.data.owned).map(p=>[p.id,p.level,p.xp]),STARTERS.map(id=>[id,5,xpAt(id,5)]));
  assert.deepEqual(g.data.badges,[]);assert.equal(g.data.champion,false);assert.equal(g.data.johtoUnlocked,false);assert.equal(g.maxGeneration(),1);assert.equal(g.data.leagueBest,0);
  assert.equal(g.data.workTokens,0);assert.deepEqual(g.data.inventory,{});assert.equal(g.data.daycare,null);assert.equal(g.data.egg,null);assert.equal(g.data.pendingChallenge,null);assert.deepEqual(g.data.pendingActions,[]);assert.deepEqual(g.data.trainerSeen,{});
  for(const key of ['gruntWonAt','duoWonAt','rocketWonAt','fluteObtainedAt','snorlaxWonAt','obtainedAt','learnerUid'])assert.equal(g.data.trainingDevice[key],null);
  assert.equal(g.data.trainingDevice.legacyRoadAccess,false);assert.equal(g.canChallenge(0),true);assert.equal(g.canChallenge(4),false);assert.equal(g.canChallenge('rocket-grunt'),false);assert.equal(g.canChallenge('road-snorlax'),false);
}

test('the exact KST boundary resets progression but retains all-generation dex, booster and Codex baselines',()=>{
  const g=veteran(),dex=structuredClone(g.data.caught),seen=structuredClone(g.data.seen),baselines=structuredClone(g.data.baselines);
  assert.equal(monthOf(boundary-1).key,'2026-10');assert.equal(monthOf(boundary).key,'2026-11');assert.equal(g.seasonDue(boundary-1),false);
  assert.ok(g.tick(boundary));fresh(g);assert.deepEqual(g.data.caught,dex);assert.deepEqual(g.data.seen,seen);assert.deepEqual(g.data.baselines,baselines);
  assert.equal(g.data.outputTokens,9000);assert.equal(g.data.totalTokens,90000);assert.deepEqual(g.experienceBoost(),{count:251,percent:251,multiplier:3.51});
  assert.deepEqual(Object.keys(g.data.seasonCaught).map(Number),STARTERS);
  const roster=structuredClone(g.data.owned);assert.equal(g.tick(g.data.switchUntil),false);assert.deepEqual(g.data.owned,roster);assert.equal(g.data.journal.filter(e=>e.kind==='season').length,1);
});

test('upgrading an unstamped save seeds this month without resetting current progress',()=>{
  const saved=structuredClone(veteran().data);delete saved.season;delete saved.seasonCaught;
  const loaded=new Game(saved,boundary);assert.deepEqual(loaded.data.owned,saved.owned);assert.deepEqual(loaded.data.badges,saved.badges);assert.equal(loaded.maxGeneration(),2);assert.equal(loaded.data.season.key,'2026-11');assert.ok(loaded.registeredThisSeason(143));
});

test('a closed app skips missed months once; reload and clock reversal do not restart the same season',()=>{
  const later=Date.parse('2027-02-01T00:00:00Z'),loaded=new Game(veteran().data,later);fresh(loaded,later);
  const owned=structuredClone(loaded.data.owned),serial=loaded.data.eventSerial;
  const again=new Game(loaded.data,later+10000);assert.deepEqual(again.data.owned,owned);assert.equal(again.data.eventSerial,serial);
  const reversed=new Game(again.data,boundary);assert.equal(reversed.data.season.key,'2027-02');assert.deepEqual(reversed.data.owned,owned);
});

test('live capture finishes before rollover; old registrations are catchable once in the next season',()=>{
  let g=new Game({},before,{random:()=>0});g.addPokemon(19,5,'catch',before);g.newWild(before);g.data.battle.foe=combatant(16,5,[150]);g.data.battle.foe.hp=1;
  assert.equal(g.tick(boundary),false);assert.equal(g.data.season.key,'2026-10');assert.equal(g.snapshot(boundary).season.pending,true);
  assert.ok(g.capture(g.data.switchUntil));const end=g.data.pendingBattle.at;
  g=new Game(g.data,end-1,{random:()=>0});assert.ok(!g.data.caught[16]);assert.equal(g.data.season.key,'2026-10');
  assert.ok(g.tick(end));assert.ok(g.data.caught[16]);assert.equal(g.data.season.key,'2026-10');assert.ok(g.tick(end+1));assert.equal(g.data.season.key,'2026-11');assert.equal(g.experienceBoost().count,3);
  g.newWild(g.data.switchUntil);g.data.battle.foe=combatant(19,5,[150]);g.data.battle.foe.hp=1;
  assert.ok(g.captureOpportunity());assert.ok(g.capture(g.data.switchUntil));assert.ok(g.tick(g.data.pendingBattle.at));assert.equal(g.experienceBoost().count,3);
  g.newWild(g.data.switchUntil);g.data.battle.foe=combatant(19,5,[150]);g.data.battle.foe.hp=1;assert.equal(g.captureOpportunity(),null);
});

test('offline completed success registers before reset and cannot duplicate rewards on reload',()=>{
  const g=new Game({},before,{random:()=>0});g.newWild(before);g.data.battle.foe=combatant(19,5,[150]);g.data.battle.foe.hp=1;assert.ok(g.capture(g.data.switchUntil));
  const loaded=new Game(g.data,g.data.pendingBattle.at+1);assert.ok(loaded.data.caught[19]);assert.equal(loaded.experienceBoost().count,2);assert.equal(loaded.registeredThisSeason(19),false);assert.equal(Object.keys(loaded.data.owned).length,1);
  const reloaded=new Game(loaded.data,loaded.data.switchUntil+1);assert.equal(reloaded.experienceBoost().count,2);assert.equal(reloaded.data.adventure.totals.xp,0);
});

test('Snorlax can be revisited after a new-season knockout even if last season registered it',()=>{
  const g=new Game(veteran().data,boundary);g.data.trainingDevice.fluteObtainedAt=boundary;g.data.trainingDevice.snorlaxWonAt=boundary;
  assert.ok(g.data.caught[143]);assert.ok(g.canChallenge('road-snorlax'));g.addPokemon(143,30,'catch',boundary);assert.equal(g.canChallenge('road-snorlax'),false);
});

test('the atomic store backs up the previous season once and retains user settings',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-season-')),store=new Store(dir),g=veteran(),settings={compact:true,x:99,y:23};
  store.save({version:2,game:g.data,settings});const original=fs.readFileSync(store.file,'utf8');
  const next=new Game(store.load().game,boundary);store.save({version:2,game:next.data,settings});store.save({version:2,game:next.data,settings});
  const backups=fs.readdirSync(dir).filter(n=>n.startsWith('progress.before-season-'));assert.equal(backups.length,1);assert.equal(fs.readFileSync(path.join(dir,backups[0]),'utf8'),original);assert.deepEqual(new Store(dir).load().settings,settings);
});
