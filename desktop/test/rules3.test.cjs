'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),battle=require('../battle.cjs');
const {species,data,xpAt,learnedMoves,pickWild,wildMinimum}=require('../pokemon.cjs');
const journal=require('../journal.cjs');
const now=Date.parse('2026-10-13T05:00:00Z');
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function fixture(a=25,b=143,am=[85],bm=[150],level=50){
  const g=new Game({},now,{random:()=>.73});
  const uid=g.addPokemon(a,level,'fixture',now);g.data.activeId=uid;g.data.slots[3]=uid;g.data.owned[uid].moves=am;
  g.data.caught[b]=now;
  const state=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(g.data.owned[uid])},foe:battle.combatant(b,level,bm),turn:0,captureAttempts:0};
  return {g,b:state,sim:()=>battle.engine(g,state),uid};
}
function round(sim,a='move 1',b='move 1'){
  sim.makeChoices(a,b);let n=0;while(!sim.requestState&&!sim.ended){sim.turnLoop();assert.ok(++n<20);}
}
test('earned gym badges block replay at the API, while losses may retry',()=>{
  const g=new Game({},now);assert.ok(g.challenge(0,now));g.endChallenge(false,now);assert.ok(g.challenge(0,g.data.switchUntil));
  while(g.data.battle?.kind==='trainer')g.defeatOpponent(now);
  const xp=g.data.owned[g.data.activeId].xp;assert.equal(g.challenge(0,g.data.switchUntil),false);assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.ok(g.challenge(1,g.data.switchUntil));
});
test('wild evolution floors propagate through level, trade and stone chains',()=>{
  assert.equal(species.get(5).minWildLevel,16);assert.equal(species.get(6).minWildLevel,36);
  assert.equal(species.get(65).minWildLevel,16);assert.equal(species.get(94).minWildLevel,25);assert.equal(species.get(149).minWildLevel,55);
  for(const level of [5,15,16,35,36,55,100]){
    const g=new Game({},now,{random:random(level)});g.data.owned[25].level=level;g.data.owned[25].xp=xpAt(25,level);
    for(let i=0;i<400;i++){g.newWild(now);const p=species.get(g.data.battle.foe.id);assert.ok(wildMinimum(p)<=level);assert.ok(g.data.battle.foe.level>=wildMinimum(p));assert.ok(p.id<=151);}
  }
  const seen=new Set(),rng=random(42);for(let i=0;i<4000;i++)seen.add(pickWild(1,rng,36));assert.ok(!seen.has(6));assert.ok(!seen.has(149));assert.ok(seen.has(18));
});
test('wild levels use partner minus five to plus five, preserving species floors and the champion cap of 70',()=>{
  const g=new Game({},now,{random:()=>.73}),p=g.data.owned[25];
  g.data.champion=true;
  for(const level of [5,60,70,100]){
    p.level=level;p.xp=xpAt(p.id,level);const seen=new Set();
    for(let offset=0;offset<=10;offset++){
      let index=0;const draws=[.9,0,(offset+.5)/11];g.random=()=>draws[index++]??.73;
      g.newWild(now);const foe=g.data.battle.foe;seen.add(foe.level);
      assert.equal(foe.level,Math.max(wildMinimum(species.get(foe.id)),Math.min(70,level-5+offset)));
    }
    if(level===60)assert.deepEqual([...seen],Array.from({length:11},(_,i)=>55+i));
    if(level===70)assert.deepEqual([...seen],Array.from({length:6},(_,i)=>65+i));
    if(level===5){assert.equal(Math.min(...seen),2);assert.equal(Math.max(...seen),10);}
    if(level===100)assert.deepEqual([...seen],[70]);
  }
});

test('all level-learned moves persist, while unearned future moves remain locked',()=>{
  const list=learnedMoves(25,50);assert.ok(list.length>4);assert.ok(list.includes(84));assert.ok(list.includes(85));
  assert.ok(!learnedMoves(7,5).includes(56));
  const g=new Game({},now);g.data.owned[25].level=50;g.data.owned[25].xp=xpAt(25,50);g.data.owned[25].moves=list.slice(-4);delete g.data.rulesRevision;
  const reloaded=new Game(g.data,now);assert.deepEqual(new Set(reloaded.data.owned[25].moves),new Set(list));
  const before=[...reloaded.data.owned[25].moves];const reloadedAgain=new Game(reloaded.data,now);assert.deepEqual(reloadedAgain.data.owned[25].moves,before);
  const f=fixture(25,143,list,[150]);assert.equal(f.sim().p1.active[0].moveSlots.length,list.length);
});
test('every stored Gen III species ability and all 354 moves resolve in the offline simulator',()=>{
  for(const p of data.pokemon){const choices=Object.values(battle.dex.species.get(p.identifier).abilities).map(a=>a.toLowerCase().replace(/[^a-z]/g,''));assert.ok(p.abilities.length);for(const id of p.abilities)assert.ok(choices.includes(data.abilities.find(a=>a.id===id).identifier.replaceAll('-','')),p.name);}
  for(const move of data.moves)assert.ok(battle.dex.moves.get(move.identifier).exists,move.name);
  assert.equal(data.abilities.find(a=>a.id===battle.abilityFor(94)).identifier,'levitate');
});
test('Levitate blocks Ground attacks and Water Absorb heals instead of taking Water damage',()=>{
  const ground=fixture(51,94,[89],[150]),s=ground.sim(),hp=s.p2.active[0].hp;round(s);assert.equal(s.p2.active[0].hp,hp);
  const water=fixture(9,134,[55],[150]),w=water.sim();w.p2.active[0].hp=Math.floor(w.p2.active[0].maxhp/2);const before=w.p2.active[0].hp;round(w);assert.ok(w.p2.active[0].hp>before);assert.ok(w.log.some(l=>l.includes('Water Absorb')));
});
test('Intimidate, status immunity and Gen III physical/special categories take effect',()=>{
  const f=fixture(130,19,[150],[150]),s=f.sim();assert.equal(s.p2.active[0].boosts.atk,-1);
  assert.equal(s.getCategory(battle.dex.moves.get('shadowball')),'Physical');assert.equal(s.getCategory(battle.dex.moves.get('firepunch')),'Special');
  const e=fixture(25,132,[86],[150]),sim=e.sim();round(sim);assert.equal(sim.p2.active[0].status,'');
});
test('STAB increases same-type damage and compound type effectiveness is calculated by the engine',()=>{
  const damage=id=>{const f=fixture(7,143,[id],[150]),s=f.sim(),hp=s.p2.active[0].hp;round(s);return hp-s.p2.active[0].hp;};
  const stab=damage(55),neutral=damage(52);assert.ok(stab>=neutral*1.4&&stab<=neutral*1.7);
  const f=fixture(25,130,[85],[150]),s=f.sim();assert.equal(s.dex.getEffectiveness('Electric',s.p2.active[0]),2);
});
test('Hyper Beam requires recharging and Solar Beam charges before dealing damage',()=>{
  const h=fixture(137,143,[63],[150],30),s=h.sim();round(s);const hp=s.p2.active[0].hp;assert.ok(s.p1.active[0].volatiles.mustrecharge);round(s);assert.equal(s.p2.active[0].hp,hp);assert.ok(s.log.some(l=>l.includes('|cant|')&&l.includes('recharge')));
  const solar=fixture(3,143,[76],[150]),t=solar.sim(),before=t.p2.active[0].hp;round(t);assert.equal(t.p2.active[0].hp,before);round(t);assert.ok(t.p2.active[0].hp<before);
});
test('weather, screens and end-of-round poison use persistent native battle effects',()=>{
  const f=fixture(6,143,[241,115,150],[150]),s=f.sim();round(s,'move 1');assert.equal(s.field.weather,'sunnyday');
  round(s,'move 2');assert.ok(s.p1.sideConditions.reflect);
  s.p1.active[0].setStatus('psn');const hp=s.p1.active[0].hp;
  s.makeChoices('move 3','move 1');assert.equal(s.p1.active[0].hp,hp);s.turnLoop();assert.ok(s.p1.active[0].hp<hp);
  for(let i=0;i<5;i++)round(s,'move 3');assert.ok(!s.p1.sideConditions.reflect);
});
test('uncaught wild targets take the same super-effective damage as caught species and can be knocked out',()=>{
  const run=(caught,remaining)=>{
    const f=fixture(7,37,[55],[150],15);if(!caught)delete f.g.data.caught[37];
    if(remaining!==undefined)f.b.foe.hp=remaining;
    const s=f.sim(),before=s.p2.active[0].hp;round(s);return {hp:s.p2.active[0].hp,damage:before-s.p2.active[0].hp,maxHp:s.p2.active[0].maxhp,log:s.log};
  };
  const caught=run(true),uncaught=run(false);assert.equal(uncaught.damage,caught.damage);assert.ok(uncaught.damage>1);
  assert.ok(uncaught.log.some(l=>l.includes('|-supereffective|')));
  const low=run(false,uncaught.maxHp*.1);assert.equal(low.hp,0);assert.equal(low.damage,uncaught.maxHp*.1);assert.ok(low.log.some(l=>l.startsWith('|faint|p2')));
});

test('a saved uncaught battle resumes native damage and knockout after its capture quota is exhausted',()=>{
  const f=fixture(7,37,[55],[150],15);let g=f.g;delete g.data.caught[37];g.data.workTokens=5000;
  g.data.battle.foe.hp=1;g.data.battle.captureAttempts=5;assert.ok(g.tick(now));assert.equal(g.data.animation.actor,'foe');assert.ok(g.data.battle.sim);
  g=new Game(g.data,now+1,{random:()=>.73});const at=g.data.switchUntil;assert.ok(g.tick(at));
  assert.equal(g.data.animation.actor,'hero');assert.equal(g.data.animation.moveId,55);assert.equal(g.data.battle.foe.hp,0);
  assert.equal(g.data.pendingBattle.kind,'after-action');assert.equal(g.data.battle.captureAttempts,5);assert.equal(g.data.captureAnimation||null,null);
  assert.ok(g.tick(g.data.switchUntil));assert.equal(g.data.animation.kind,'faint');assert.ok(g.tick(g.data.switchUntil));
  assert.equal(g.data.battle,null);assert.ok(!g.data.caught[37]);assert.equal(Object.values(g.data.owned).filter(p=>p.id===37).length,0);
});

test('uncaught wild Pokemon can faint from native self-destruct and poison residuals',()=>{
  const self=fixture(129,74,[150],[120],30);delete self.g.data.caught[74];const a=self.sim();round(a);
  assert.equal(a.p2.active[0].hp,0);assert.ok(a.log.some(l=>l.startsWith('|faint|p2')));
  const poison=fixture(25,19,[150],[150],30);delete poison.g.data.caught[19];const b=poison.sim();b.p2.active[0].hp=1;b.p2.active[0].setStatus('psn');round(b);
  assert.equal(b.p2.active[0].hp,0);assert.ok(b.log.some(l=>l.includes('[from] psn')));
});

test('False Swipe keeps its original one-HP effect without global capture protection',()=>{
  const f=fixture(25,19,[206],[150],30);delete f.g.data.caught[19];f.b.foe.hp=2;
  const s=f.sim();round(s);assert.equal(s.p2.active[0].hp,1);assert.ok(!s.p2.active[0].fainted);
});
test('native trainer simulation awards a badge without capturing, then refuses rematches',()=>{
  const g=new Game({},now,{random:random(17)});const p=g.data.owned[1];p.level=100;p.xp=xpAt(1,100);p.moves=[202];g.data.activeId=1;assert.ok(g.challenge(0,now));
  let steps=0;while(g.data.battle?.kind==='trainer'&&steps<100)g.tick(now+(++steps)*2000);
  assert.deepEqual(g.data.badges,['brock']);assert.ok(!g.data.caught[74]&&!g.data.caught[95]);assert.equal(g.challenge(0,now+999999),false);
});
test('saved native queue, HP, PP and statuses resume without repeating the first action',t=>{
  // Keep the native queue scenario's fixed two-technique moveset after reload.
  const oldLearn=species.get(143).learn;t.after(()=>{species.get(143).learn=oldLearn;});species.get(143).learn=[{level:1,move:92},{level:1,move:33}];
  const f=fixture(143,113,[92,33],[150],30),g=f.g;g.data.workTokens=50000;g.tick(now);
  assert.ok(g.data.battle.sim);const a=new Game(g.data,now+1,{random:()=>.73}),b=new Game(g.data,now+1,{random:()=>.73});
  for(let i=1;i<=6;i++){const at=Math.max(a.nextTick,a.data.switchUntil);a.tick(at);b.tick(at);}
  assert.deepEqual(a.data.battle?.foe,b.data.battle?.foe);assert.deepEqual(a.data.battle?.party,b.data.battle?.party);
  assert.equal(a.data.workTokens,g.data.workTokens-1500);
});
test('season summary survives detail retention, legacy checkpoints and reopening',()=>{
  let g=new Game({},now);g.log('꼬렛 포획','catch',19,now+1);journal.increment(g.data,'wins',40);journal.increment(g.data,'xp',1000);
  for(let i=0;i<700;i++)g.log('공격 기록','battle',25,now+i+2);
  let s=g.panelState(now+1000);assert.equal(s.summary.counts.catch,1);assert.equal(s.summary.counts.wins,40);assert.equal(s.summary.highlights.length,1);assert.equal(g.data.battleJournal.length,300);
  const startedAt=g.data.adventure.startedAt;
  g.data.adventure.checkpoint={at:now+1000,totals:{...g.data.adventure.totals}};
  g=new Game(g.data,now+1001);s=g.panelState(now+1002).summary;
  assert.equal(s.counts.xp,1000);assert.equal(s.counts.wins,40);assert.equal(s.counts.catch,1);
  assert.equal(s.since,startedAt);assert.equal(s.highlights.length,1);assert.ok(g.data.journal.length);
  g.log('이브이 부화','hatch',133,now+1005);assert.equal(g.panelState(now+1006).summary.counts.hatch,1);
});
