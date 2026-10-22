'use strict';
const {travelSpecies}=require('./helpers/region.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {Game}=require('./helpers/four-party.cjs');
const {Game:FreshGame}=require('../game.cjs');
const {data,species,moves,xpAt,learnedMoves,pickWild,wildEligible,effective}=require('../pokemon.cjs');
const {combatant,attack,catchValue,tryCatch}=require('../battle.cjs');
const nursery=require('../daycare.cjs');
const {CodexReader,selectEvent}=require('../codex-reader.cjs');
const {Store}=require('../store.cjs');
const now=Date.parse('2026-10-13T03:00:00Z');
const event=(type,t=now,extras={})=>({type:'event_msg',timestamp:new Date(t).toISOString(),payload:{type,...extras}});
const tokens=(output,t=now,total=output*10)=>event('token_count',t,{info:{total_token_usage:{output_tokens:output,total_tokens:total}}});
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function wild(g,id=19,level=5){
  const p=g.data.owned[g.data.activeId];
  g.data.battle={kind:'wild',foe:combatant(id,level),party:{[p.uid]:combatant(p.id,p.level,p.moves)},turn:0,captureAttempts:0};g.data.seen[id]=now;
  return g.data.battle;
}
test('initial collection has exactly 151 species, only Pikachu caught, five empty slots and no Pichu access',()=>{
  const g=new FreshGame({},now),s=g.panelState(now);
  assert.equal(s.collection.length,151);assert.deepEqual(s.collection.filter(p=>p.caught).map(p=>p.id),[25]);assert.equal(s.slots.filter(s=>s.empty).length,5);
  assert.equal(s.collection.find(p=>p.id===2).name,'???');assert.equal(g.addPokemon(172,5,'catch'),false);
  assert.equal(g.select(172,now),false);assert.equal(g.setSlot(0,172,now),false);
  assert.equal(s.hero.name,'피카츄');
});
test('observed work deduplicates across a season reset without backfill or directly levelling anyone',()=>{
  const g=new Game({},now);g.observe('a',tokens(50000),{baseline:true,now});g.observe('a',tokens(60000,now+1),{now:now+1});g.observe('a',tokens(60000,now+1),{now:now+1});
  assert.equal(g.data.workTokens,10000);assert.equal(g.data.outputTokens,10000);assert.equal(g.snapshot(now).level,5);
  const nextMonth=Date.parse('2026-11-01T01:00:00Z'),resumed=new Game(g.data,nextMonth);
  resumed.observe('a',tokens(65000,nextMonth),{baseline:true,now:nextMonth});
  assert.equal(resumed.data.outputTokens,10000);assert.equal(resumed.data.workTokens,0);
  resumed.observe('a',tokens(66000,nextMonth+1),{now:nextMonth+1});assert.equal(resumed.data.workTokens,1000);
  resumed.observe('a',tokens(10,nextMonth+2),{now:nextMonth+2});assert.equal(resumed.data.workTokens,1000);
});
test('XP belongs only to the individual currently battling, including same-species siblings',()=>{
  const g=new Game({},now),sibling=g.addPokemon(25,5,'hatch',now),before=structuredClone(g.data.owned);
  assert.notEqual(sibling,25);assert.ok(g.select(sibling,now));wild(g);g.awardXp(combatant(19,20),false,now+1);
  assert.ok(g.data.owned[sibling].xp>before[sibling].xp);
  for(const uid of [1,4,7,25])assert.deepEqual(g.data.owned[uid],before[uid]);
});
test('wild battles require observed work and spend exactly one action credit per step',()=>{
  const g=new Game({},now,{random:rng(1)});assert.equal(g.tick(now),false);
  g.data.workTokens=500;assert.equal(g.tick(now),true);assert.equal(g.data.workTokens,250);
  assert.equal(g.tick(now+100),false);assert.equal(g.tick(g.data.switchUntil),true);assert.equal(g.data.workTokens,0);
});
test('a rare encounter keeps its ten total throws across HP changes and reloads',()=>{
  let g=new Game({},now,{random:()=>.999999});wild(g,150,50);
  let at=now;g.data.battle.foe.hp=g.data.battle.foe.maxHp*.501;assert.equal(g.capture(at),false);assert.equal(g.data.battle.captureAttempts,0);
  for(let attempt=1;attempt<=10;attempt++){
    g.data.battle.foe.hp=g.data.battle.foe.maxHp*(attempt%2?.5:.2);
    assert.equal(g.capture(at),false);assert.equal(g.data.battle.captureAttempts,attempt);
    assert.equal(g.data.captureAnimation.attempt,attempt);assert.equal(g.data.captureAnimation.attemptLimit,10);
    g.capture(at+1);assert.equal(g.data.battle.captureAttempts,attempt);
    at=g.data.switchUntil;g=new Game(g.data,at,{random:()=>.999999});
  }
  assert.equal(g.capture(at),false);assert.equal(g.data.battle.captureAttempts,10);
  g.damageFoe(99999);assert.equal(g.data.battle.foe.hp,0);g.capture(at+1);assert.equal(g.data.battle.captureAttempts,10);
});

test('large hits can cross capture thresholds and knock out an uncaught wild Pokemon without a ball',()=>{
  const g=new Game({},now,{random:()=>0}),b=wild(g,150,50);
  g.damageFoe(b.foe.maxHp*.95);assert.ok(b.foe.hp/b.foe.maxHp<.1);assert.ok(Math.abs(b.foe.hp/b.foe.maxHp-.05)<1e-9);
  g.damageFoe(99999);assert.equal(b.foe.hp,0);assert.equal(g.capture(now),false);assert.equal(b.captureAttempts,0);
  assert.ok(!g.data.caught[150]);assert.equal(g.snapshot(now).capture,null);
});
test('first successful ball registers once; already-caught species only battle even after evolving away',()=>{
  const g=new Game({},now,{random:()=>0}),b=wild(g,19);b.foe.hp=b.foe.maxHp*.1;assert.equal(g.capture(now),true);assert.ok(!g.data.caught[19]);assert.equal(g.capture(now),false);
  assert.ok(g.tick(g.data.switchUntil));assert.ok(g.data.caught[19]);assert.equal(g.data.battle,null);assert.equal(g.capture(now),false);
  const p=Object.values(g.data.owned).find(p=>p.id===19);p.id=20;
  wild(g,19);g.damageFoe(999);assert.equal(g.data.battle.foe.hp,0);assert.equal(g.capture(now),false);
});
test('normal-ball formula uses species catch rate, remaining HP and status; four checks can fail',()=>{
  assert.equal(catchValue(45,10,100,null),42);assert.equal(catchValue(45,10,100,'sleep'),105);
  assert.equal(catchValue(45,10,100,'paralysis'),63);
  assert.equal(tryCatch(3,1,100,null,()=>.99999).caught,false);
  assert.equal(tryCatch(45,1,100,null,()=>0).caught,true);
  assert.equal(tryCatch(255,1,100,'sleep',()=>.99999).caught,true);
});
test('level-up skills follow species and level; inherited moves are not overwritten by old skills',()=>{
  assert.deepEqual(learnedMoves(7,5),[33,39]);assert.ok(!learnedMoves(7,5).includes(56));
  assert.ok(learnedMoves(7,30).includes(55));assert.notDeepEqual(learnedMoves(4,30),learnedMoves(7,30));
  const inherited=learnedMoves(26,20,[84,45,86,98],19);assert.deepEqual(inherited,[84,45,86,98]);
  assert.equal(species.get(25).stats[3],30);assert.deepEqual(species.get(35).types,[1]);assert.equal(effective(8,[9]),.5);
});
test('evolution changes one individual, keeps old dex marks and permits different Eevee siblings',()=>{
  const g=new Game({},now);const first=g.addPokemon(133,20,'catch',now),second=g.addPokemon(133,5,'hatch',now);
  g.data.inventory[84]=1;g.data.inventory[83]=1;
  assert.ok(g.evolve(first,134,now));assert.equal(g.data.owned[first].id,134);assert.equal(g.data.owned[first].level,20);
  assert.equal(g.data.owned[second].id,133);assert.ok(g.data.caught[133]);assert.ok(g.data.caught[134]);
  assert.ok(g.evolve(second,135,now));assert.equal(g.data.owned[second].id,135);assert.equal(g.data.inventory[83],0);
  assert.equal(Object.values(g.data.owned).filter(p=>p.id===133).length,0);
  const reloaded=new Game(g.data,now+1000);assert.equal(reloaded.data.owned[first].id,134);
});
test('level, stone, trade and cross-generation evolution conditions remain enforced',()=>{
  const g=new Game({},now);assert.equal(g.evolve(1,2,now),false);assert.equal(g.evolve(25,26,now),false);
  g.data.owned[1].level=16;g.data.owned[1].xp=xpAt(1,16);assert.ok(g.evolve(1,2,now));
  assert.equal(g.data.owned[1].id,2);assert.ok(g.data.caught[1]&&g.data.caught[2]);
  const kadabra=g.addPokemon(64,20,'catch',now);assert.equal(g.evolve(kadabra,65,now),false);g.data.trainingDevice.obtainedAt=now;g.data.trainingDevice.learnerUid=kadabra;assert.equal(g.evolve(kadabra,65,now),false);g.data.owned[kadabra].xp=xpAt(64,21)-1;g.awardXp(combatant(19,20),false,now);assert.equal(g.data.owned[kadabra].id,65);
  const onix=g.addPokemon(95,20,'catch',now);g.data.trainingDevice.learnerUid=onix;g.data.owned[onix].xp=xpAt(95,21)-1;g.awardXp(combatant(19,20),false,now);g.data.inventory[210]=1;assert.equal(g.evolve(onix,208,now),false);
  g.data.champion=true;assert.equal(g.evolve(onix,208,now),false);assert.ok(g.unlockJohto(now,travelSpecies(g)));assert.ok(g.evolve(onix,208,now));assert.equal(g.data.inventory[210],0);
});
test('gyms and champion victory grant the choice of unlocking the next generation',()=>{
  const g=new Game({},now);for(let id=1;id<=151;id++)g.data.caught[id]=now;
  g.data.trainingDevice.snorlaxWonAt=now;
  g.data.trainingDevice.rocketWonAt=now;
  assert.equal(g.maxGeneration(),1);assert.equal(g.challenge(1,now),false);assert.equal(g.challenge(8,now),false);
  for(let i=0;i<8;i++){
    assert.ok(g.challenge(i,Math.max(now,g.data.switchUntil)));while(g.data.battle?.kind==='trainer')g.defeatOpponent(g.data.switchUntil);
    assert.equal(g.data.badges.length,i+1);assert.equal(g.maxGeneration(),1);
  }
  assert.ok(g.challenge(8,g.data.switchUntil));let count=0;
  while(g.data.battle?.kind==='trainer'){
    if(g.data.battle.bossIndex<12||g.data.battle.foeIndex<5)assert.equal(g.maxGeneration(),1);
    g.defeatOpponent(now);assert.ok(++count<40);
  }
  assert.equal(g.data.champion,true);assert.equal(g.panelState(now).collection.length,151);assert.equal(g.addPokemon(172,5,'catch',now),false);
  assert.ok(g.unlockJohto(Math.max(now,g.data.switchUntil),travelSpecies(g)));assert.equal(g.panelState(now).collection.length,251);assert.ok(g.addPokemon(172,5,'catch',now));
});
test('trainer Pokemon cannot be caught; older suspended-wild saves still restore capture progress',()=>{
  const g=new Game({},now);const b=wild(g,150,50);b.captureAttempts=6;b.foe.hp=b.foe.maxHp*.04;
  g.data.battle=null;g.challenge(0,now);g.data.suspendedWild=b;g.data.battle.foe.hp=1;assert.equal(g.capture(now),false);assert.ok(!g.data.caught[74]);
  assert.ok(g.abandon(now));assert.equal(g.data.battle,b);assert.equal(g.data.battle.captureAttempts,6);
  assert.ok(!g.data.journal.some(e=>e.kind==='loss'));
});
test('battle simulation respects team defeat and never unlocks badges on a loss',()=>{
  const g=new Game({},now,{random:rng(24)});g.challenge(0,now);
  for(const p of Object.values(g.data.battle.party))p.hp=1;
  let steps=0;while(g.data.battle&&steps<300)g.tick(now+(++steps)*2000);
  assert.equal(g.data.battle,null);assert.equal(g.data.badges.length,0);assert.ok(g.data.journal.some(e=>e.kind==='loss'));
});
test('wild sampler covers eligible species without a caught-species boost and excludes starter families',()=>{
  const allowed=new Set();const g=new Game({},now,{random:rng(11)});
  for(let i=0;i<10000;i++){const id=pickWild(1,g.random);assert.ok(id>=1&&id<=151);allowed.add(id);}
  assert.ok(allowed.size>=data.pokemon.filter(p=>wildEligible(p,1,100)).length-6);for(const id of [1,2,3,4,5,6,7,8,9,25,26])assert.ok(!allowed.has(id));assert.equal(pickWild(1,(()=>{let i=0;return()=>i++===0?0:.5;})()),151);
});
test('breeding preview resolves Vaporeon plus Ditto to Eevee without marking the dex as seen',()=>{
  const g=new Game({},now),a=g.addPokemon(134,20,'catch',now),b=g.addPokemon(132,20,'catch',now);
  const preview=nursery.predict(g,[a,b]);assert.equal(preview.compatible,true);assert.deepEqual(preview.offspring.map(p=>p.id),[133]);assert.equal(preview.offspring[0].name,'이브이');assert.ok(!g.data.seen[133]);
});
test('breeding rejects incompatible genders, groups, babies, legendaries and locked offspring',()=>{
  const g=new Game({},now);g.data.owned[1].gender='male';g.data.owned[4].gender='male';
  assert.equal(nursery.predict(g,[1,4]).compatible,false);
  g.data.owned[4].gender='female';assert.equal(nursery.predict(g,[1,4]).compatible,true);
  const ditto=g.addPokemon(132,5,'catch',now),legend=g.addPokemon(150,50,'catch',now),ditto2=g.addPokemon(132,5,'hatch',now);
  assert.equal(nursery.predict(g,[ditto,ditto2]).compatible,false);assert.equal(nursery.predict(g,[legend,ditto]).compatible,false);
  assert.equal(nursery.predict(g,[25,ditto]).compatible,false);
  g.data.champion=true;assert.equal(nursery.predict(g,[25,ditto]).compatible,false);assert.ok(g.unlockJohto(now,travelSpecies(g)));assert.deepEqual(nursery.predict(g,[25,ditto]).offspring.map(p=>p.id),[172]);
  const baby=g.addPokemon(172,5,'hatch',now);assert.equal(nursery.predict(g,[baby,ditto]).compatible,false);
});
test('nursery advances only on new coding work, survives restart and creates a separate Lv5 individual',()=>{
  let g=new Game({},now),a=g.addPokemon(134,30,'catch',now),b=g.addPokemon(132,20,'catch',now),oldEevee=g.addPokemon(133,12,'catch',now);
  g.data.kantoWorld={location:'route-5'};const before=structuredClone(g.data.owned);assert.ok(nursery.start(g,[a,b],now));assert.equal(g.select(a,now+2000),false);assert.equal(g.setSlot(0,b,now+2000),false);assert.equal(g.evolve(a,134,now+2000),false);
  g.observe('work',tokens(100000),{baseline:true,now});assert.equal(g.data.daycare.progress,0);
  g.observe('work',tokens(120000,now+1),{now:now+1});assert.equal(g.data.egg.id,133);assert.equal(g.data.egg.progress,0);
  g=new Game(g.data,now+2);g.observe('work',tokens(120000,now+1),{baseline:true,now:now+2});assert.equal(g.data.egg.progress,0);
  g.observe('work',tokens(155000,now+3),{now:now+3});assert.equal(g.data.egg,null);
  const children=Object.values(g.data.owned).filter(p=>p.id===133);assert.equal(children.length,2);assert.equal(children.find(p=>p.uid!==oldEevee).level,5);
  for(const uid of [a,b,oldEevee])assert.deepEqual(g.data.owned[uid],before[uid]);
  g.observe('work',tokens(999999,now+4),{now:now+4});assert.equal(Object.values(g.data.owned).filter(p=>p.id===133).length,2);
  assert.ok(nursery.withdraw(g,now+5));assert.equal(g.isBoarded(a),false);
});
test('taking parents back preserves an obtained egg and boarded members stay out of challenges',()=>{
  const g=new Game({},now),a=g.addPokemon(134,20,'catch',now),b=g.addPokemon(132,20,'catch',now);
  g.data.kantoWorld={location:'route-5'};assert.ok(g.setSlot(0,a,now));assert.ok(g.setSlot(1,b,now));assert.ok(nursery.start(g,[a,b],now));
  nursery.advance(g,20000,now+1);assert.ok(g.challenge(0,now+2000));assert.ok(!g.data.battle.party[a]&&!g.data.battle.party[b]);assert.equal(nursery.start(g,[1,4],now+3000),false);
  assert.ok(nursery.withdraw(g));assert.equal(g.data.egg.id,133);assert.equal(g.select(a,now+4000),false);
});
test('v1 migration preserves partner level, totals and baselines, never imports Pichu',()=>{
  const g=new Game({version:1,outputTokens:200000,totalTokens:400000,family:'water',baselines:{a:{output:20,total:50,at:now}}},now);
  assert.equal(g.snapshot(now).hero.id,8);assert.equal(g.snapshot(now).level,21);
  assert.equal(g.data.outputTokens,200000);assert.equal(g.data.workTokens,0);assert.equal(g.data.baselines.a.output,20);assert.ok(!Object.values(g.data.owned).some(p=>p.id===172));
});
test('v1 store is backed up byte-for-byte before v2 migration; corrupt records are not overwritten',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-buddy-migration-')),store=new Store(dir);
  store.save({version:1,game:{outputTokens:12345}});const before=await fs.readFile(store.file,'utf8');
  const next=new Store(dir);const saved=next.load();next.save({version:2,game:new Game(saved.game,now).data});
  const backup=(await fs.readdir(dir)).find(n=>n.startsWith('progress.pre-v2-'));assert.ok(backup);assert.equal(await fs.readFile(path.join(dir,backup),'utf8'),before);
  await fs.writeFile(store.file,'broken');assert.throws(()=>new Store(dir).load());assert.equal(await fs.readFile(store.file,'utf8'),'broken');
});

test('multiple tasks stay active until completion; silent unfinished work is not called idle',()=>{
  const g=new Game({},now);
  for(const id of ['a','b'])g.observe(id,event('task_started'),{now});
  g.observe('a',event('task_complete',now+1),{now:now+1});assert.equal(g.snapshot(now+1).phase,'working');
  g.observe('b',event('task_complete',now+2),{now:now+2});assert.equal(g.snapshot(now+2).phase,'done');
  g.observe('a',event('task_started',now+3),{now:now+3});assert.equal(g.snapshot(now+11*60000).phase,'unknown');
  g.observe('a',event('task_complete',now+12*60000),{now:now+12*60000});assert.equal(g.snapshot(now+12*60000).phase,'done');
  assert.equal(g.snapshot(now+13*60000).phase,'idle');
  const restored=new Game({},now);restored.observe('old',tokens(100,now-3600000),{baseline:true,now});
  assert.equal(restored.snapshot(now).phase,'idle');
});
test('rate limits use window duration, missing or expired values stay unknown',()=>{
  const g=new Game({},now);const t=tokens(0);t.payload.rate_limits={primary:{used_percent:21,window_minutes:10080,resets_at:Math.floor(now/1000)+60}};
  g.observe('a',t,{baseline:true,now});
  assert.deepEqual(g.snapshot(now).limits.map(x=>x.left),[null,79]);
  assert.deepEqual(g.snapshot(now+61000).limits.map(x=>x.left),[null,null]);
});
test('privacy boundary strips text, credentials, balances and unrelated records',()=>{
  const t=tokens(4);t.payload.secret='PRIVATE';t.payload.rate_limits={primary:{used_percent:1,window_minutes:300,resets_at:123},credits:{balance:'PRIVATE'}};
  const selected=JSON.stringify(selectEvent(JSON.stringify(t)));assert.ok(!selected.includes('PRIVATE'));assert.ok(!selected.includes('credits'));
  assert.equal(selectEvent(JSON.stringify({type:'response_item',payload:{content:'PRIVATE'}})),null);
});
test('read-only follower handles appended partial lines without double counting',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-buddy-test-'));
  const dir=path.join(root,'2026','10','13');await fs.mkdir(dir,{recursive:true});
  const file=path.join(dir,'rollout-fixture.jsonl');
  await fs.writeFile(file,JSON.stringify(tokens(10))+'\n');
  const g=new Game({},now),r=new CodexReader(root,g);await r.poll(now);
  const next=JSON.stringify(tokens(10010,now+1000));await fs.appendFile(file,next.slice(0,55));await r.poll(now+1000);assert.equal(g.data.outputTokens,0);
  await fs.appendFile(file,next.slice(55)+'\n');await r.poll(now+1001);assert.equal(g.data.outputTokens,10000);
  await r.poll(now+1002);assert.equal(g.data.outputTokens,10000);
  assert.equal(await fs.readFile(file,'utf8'),JSON.stringify(tokens(10))+'\n'+next+'\n');
  assert.equal(r.status.connected,true);
});

test('an open rollout with old Windows mtime is selected by its current record timestamps',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-reader-open-'));
  const active=path.join(root,'rollout-active.jsonl'),old=new Date(now-86400000);
  for(let i=0;i<65;i++){
    const file=path.join(root,'rollout-idle-'+i+'.jsonl');
    await fs.writeFile(file,JSON.stringify(event('task_complete',now-1000))+'\n');
    await fs.utimes(file,new Date(now-1000),new Date(now-1000));
  }
  await fs.writeFile(active,JSON.stringify(tokens(500))+'\n');await fs.utimes(active,old,old);
  const g=new Game({},now),r=new CodexReader(root,g);await r.poll(now);
  assert.equal(r.files.has(active),true);assert.equal(r.files.size,64);assert.equal(g.snapshot(now).phase,'working');
  assert.equal(g.data.outputTokens,0);
  await fs.appendFile(active,JSON.stringify(tokens(750,now+1000))+'\n');await fs.utimes(active,old,old);
  await r.poll(now+1000);assert.equal(g.data.workTokens,250);
});

test('a resumed old rollout is found within five seconds and its new tokens are counted once',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-reader-resume-'));
  const resumed=path.join(root,'rollout-resumed.jsonl'),old=new Date(now-86400000);
  await fs.writeFile(resumed,JSON.stringify(tokens(100,now-86400000))+'\n');await fs.utimes(resumed,old,old);
  for(let i=0;i<65;i++){
    const file=path.join(root,'rollout-idle-'+i+'.jsonl');
    await fs.writeFile(file,JSON.stringify(event('task_complete',now-1000))+'\n');
    await fs.utimes(file,new Date(now-1000),new Date(now-1000));
  }
  const g=new Game({},now),r=new CodexReader(root,g);await r.poll(now);assert.equal(r.files.has(resumed),false);
  await fs.appendFile(resumed,JSON.stringify(tokens(400,now+5000))+'\n');await fs.utimes(resumed,old,old);
  await r.poll(now+5000);assert.equal(r.files.has(resumed),true);assert.equal(g.snapshot(now+5000).phase,'working');
  assert.equal(g.data.outputTokens,300);await r.poll(now+6000);assert.equal(g.data.outputTokens,300);
  const fresh=path.join(root,'rollout-new.jsonl');await fs.writeFile(fresh,JSON.stringify(event('task_started',now+7000))+'\n');
  await r.poll(now+10000);assert.equal(r.files.has(fresh),true);
});
test('atomic progress store survives a fresh instance',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-buddy-save-'));
  new Store(dir).save({version:1,game:{outputTokens:12345},settings:{pinned:true}});
  assert.equal(new Store(dir).load().game.outputTokens,12345);
});
