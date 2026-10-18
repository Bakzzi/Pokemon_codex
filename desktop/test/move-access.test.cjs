'use strict';
const {travelSpecies}=require('./helpers/region.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),{Game}=require('../game.cjs'),{xpAt}=require('../pokemon.cjs'),access=require('../move-access.cjs'),battle=require('../battle.cjs');
const now=Date.parse('2026-10-16T05:00:00Z');
function fixture(id,level){const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(id,level,'fixture',now);return {g,uid,p:g.data.owned[uid]};}
test('every Mew technique is listed from creation, with only level-appropriate techniques active',()=>{
  const {g,p,uid}=fixture(151,15),list=g.panelState(now).roster.find(p=>p.uid===uid).moves;
  assert.equal(list.length,6);assert.deepEqual(list.filter(m=>m.active).map(m=>m.id),[1,144]);
  assert.deepEqual(list.find(m=>m.id===94),{id:94,name:'사이코키네시스',type:14,typeName:'에스퍼',pp:10,power:135,stab:true,level:40,active:false});assert.ok(!p.moves.includes(94));assert.ok(!g.memberCombatant(p).moves.includes(94));
});
test('level-up activates the existing catalog entry exactly at its required level',()=>{
  const {g,p}=fixture(151,39);const before=access.catalog(p);g.gainXp(p.uid,xpAt(151,40)-p.xp,now);
  assert.equal(p.level,40);assert.ok(p.moves.includes(94));assert.deepEqual(access.catalog(p),before);assert.equal(p.moves.filter(id=>id===94).length,1);
});
test('region level reduction and reload relock a known move, then growth reactivates it',()=>{
  let {g,p,uid}=fixture(151,40);g.data.champion=true;assert.ok(g.unlockJohto(now,travelSpecies(g)));assert.equal(p.level,15);assert.ok(!p.moves.includes(94));assert.ok(access.catalog(p).some(m=>m.move===94&&m.level===40));
  g=new Game(g.data,now+1);p=g.data.owned[uid];assert.ok(!p.moves.includes(94));g.gainXp(uid,xpAt(151,40)-p.xp,now+2);assert.ok(p.moves.includes(94));
});
test('evolution retains accessible pre-evolution techniques but does not grant its future-only ones',()=>{
  const {g,p,uid}=fixture(25,10);g.data.inventory[83]=1;assert.ok(g.evolve(uid,26,now));
  assert.equal(p.id,26);assert.ok(p.moves.includes(86));assert.ok(!access.catalog(p).some(m=>m.move===113));assert.ok(access.catalog(p).some(m=>m.move===86&&m.level===8));
});
test('previously accessible inherited moves survive a decrease without becoming active early',()=>{
  let {g,p,uid}=fixture(25,50);g.data.inventory[83]=1;assert.ok(g.evolve(uid,26,now));g.data.champion=true;assert.ok(g.unlockJohto(g.data.switchUntil,travelSpecies(g)));assert.ok(!p.moves.includes(113));
  g=new Game(g.data,now+100000);p=g.data.owned[uid];assert.ok(access.catalog(p).some(m=>m.move===113&&m.level===50));g.gainXp(uid,xpAt(26,50)-p.xp,now+100001);assert.ok(p.moves.includes(113));
});
test('new individuals retain their actual form learn level across repeated reloads',()=>{
  let {g,uid,p}=fixture(5,40);assert.equal(access.catalog(p).find(m=>m.move===53).level,34);
  for(let i=0;i<3;i++){g=new Game(g.data,now+i);p=g.data.owned[uid];assert.equal(access.catalog(p).find(m=>m.move===53).level,34);}
  const late=fixture(4,32);assert.ok(late.g.evolve(late.uid,5,now));assert.equal(access.catalog(late.p).find(m=>m.move===53).level,31);
});
test('legacy high-level known techniques are cataloged but locked after loading a lowered individual',()=>{
  const {g,p,uid}=fixture(151,15);delete p.moveMemory;p.moves=[1,144,94];const loaded=new Game(g.data,now+1),mon=loaded.data.owned[uid];
  assert.ok(!mon.moves.includes(94));assert.ok(access.catalog(mon).some(m=>m.move===94&&m.level===40));
});
test('a locked move in a saved native queue is replaced without replaying the opponent or resetting PP',()=>{
  const {g,p,uid}=fixture(151,15);p.moves=[94,1,144];delete p.moveMemory;g.data.activeId=uid;g.data.slots=[uid,null,null,null,null,null];
  const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(p)},foe:battle.combatant(113,100,[150]),turn:0,captureAttempts:0};
  const sim=battle.engine(g,b);sim.makeChoices('move psychic','move splash');assert.ok(sim.queue.list.some(a=>a.choice==='move'&&a.move.id==='psychic'));
  b.sim=sim.toJSON();const loaded=new Game(g.data,now+1),result=battle.step(loaded,loaded.data.battle);
  assert.equal(result.actor,'hero');assert.equal(result.move,1);assert.equal(loaded.data.battle.party[uid].pp[1],34);assert.ok(!loaded.data.battle.party[uid].moves.includes(94));
});
test('Transform can still copy another Pokemon techniques independently of its own level catalog',()=>{
  const {g,p,uid}=fixture(151,15);g.data.activeId=uid;g.data.slots=[uid,null,null,null,null,null];
  const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(p)},foe:battle.combatant(129,15,[94]),turn:0,captureAttempts:0};
  const sim=battle.engine(g,b);sim.makeChoices('move transform','move psychic');while(!sim.requestState&&!sim.ended)sim.turnLoop();assert.equal(sim.p1.active[0].transformed,true);
  battle.step(g,b);assert.ok(sim.p1.active[0].moveSlots.some(s=>s.id==='psychic'));
});
