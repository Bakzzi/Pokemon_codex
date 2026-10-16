'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Game}=require('../game.cjs'),battle=require('../battle.cjs'),items=require('../consumables.cjs'),pacing=require('../battle-pacing.js');
const now=Date.parse('2026-10-16T02:00:00Z');
function fixture(kind='trainer'){
  const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(143,50,'fixture',now),other=g.addPokemon(131,50,'fixture',now);
  g.data.slots=[uid,other,null,null,null,null];g.data.activeId=uid;g.data.owned[uid].moves=[33,44];g.data.owned[other].moves=[55];g.data.workTokens=10000;
  const b=g.data.battle={kind,bossIndex:0,foeIndex:0,party:Object.fromEntries([uid,other].map(id=>[id,g.memberCombatant(g.data.owned[id])])),foe:battle.combatant(74,50,[98]),turn:0,captureAttempts:0,matchupRevision:1,manualMatchup:true};
  return {g,b,uid,other,sim:()=>battle.engine(g,b)};
}
function advance(g){const at=Math.max(now,g.data.switchUntil,g.nextTick);assert.ok(g.tick(at));return at;}

test('rare consumable drops use one combined chance with weighted distinct items',()=>{
  assert.equal(items.dropChance,.005);assert.equal(items.drop(()=>.005),null);assert.equal(items.drop(()=>1),null);
  for(const [draw,id] of [[0,25],[.49999,25],[.5,27],[.74999,27],[.75,28],[.89999,28],[.9,38],[.99999,38]]){const draws=[.004999,draw];assert.equal(items.drop(()=>draws.shift()).id,id);}
  let hits=0;for(let i=0;i<10000;i++){let calls=0;if(items.drop(()=>calls++?0:(i+.5)/10000))hits++;}assert.equal(hits,50);
});
test('wild victory awards a saved inventory item once; trainer victory has no consumable roll',()=>{
  const {g,b}=fixture('wild');g.random=()=>.001;g.defeatOpponent(now);assert.equal(g.data.inventory[25],1);assert.equal(g.data.journal.filter(e=>e.kind==='item'&&e.text==='고급상처약 발견').length,1);
  const loaded=new Game(g.data,now);assert.equal(loaded.data.inventory[25],1);const row=loaded.panelState(now).inventory.find(i=>i.id===25);assert.equal(row.name,'고급상처약');assert.equal(row.automatic,true);assert.match(row.description,/200/);
  const trainer=fixture();trainer.g.random=()=>0;trainer.g.defeatOpponent(now);assert.equal(trainer.g.data.inventory[25],undefined);
});
test('ordinary wild and capturable event battles never consume recovery items',()=>{
  for(const storyId of [null,'road-snorlax']){
    const {g,b,uid}=fixture('wild');b.storyId=storyId;b.party[uid].hp=1;b.party[uid].status='sleep';g.data.inventory={25:2,27:2,28:2,38:2};const before={...g.data.inventory};advance(g);assert.deepEqual(g.data.inventory,before);assert.notEqual(g.data.animation.kind,'item');
  }
});
test('a trainer potion goes before priority attacks, consumes the action and leaves every move PP untouched',()=>{
  const {g,b,uid}=fixture();b.party[uid].hp=10;g.data.inventory[25]=2;const pp={...b.party[uid].pp},foe=b.foe.hp;
  advance(g);assert.equal(g.data.animation.kind,'item');assert.equal(g.data.animation.item.id,25);assert.equal(g.data.inventory[25],1);assert.equal(b.party[uid].hp,Math.min(b.party[uid].maxHp,210));assert.equal(b.foe.hp,foe);assert.deepEqual(b.party[uid].pp,pp);
  const healed=b.party[uid].hp;advance(g);assert.equal(g.data.animation.actor,'foe');assert.ok(b.party[uid].hp<healed);assert.deepEqual(b.party[uid].pp,pp);assert.equal(g.data.inventory[25],1);
});
test('a turn already committed never gains an extra item action when HP becomes critical',()=>{
  const {g,b,uid}=fixture();advance(g);assert.equal(g.data.animation.actor,'foe');g.data.inventory[25]=1;
  const sim=battle.engine(g,b),actor=sim.p1.active[0];actor.hp=1;b.party[uid]=battle.readMon(actor);
  advance(g);assert.equal(g.data.animation.kind,'attack');assert.equal(g.data.animation.actor,'hero');assert.equal(g.data.inventory[25],1);
  advance(g);assert.equal(g.data.animation.kind,'item');assert.equal(g.data.inventory[25],0);
});
test('Full Heal cures native major status and confusion without spending a move',()=>{
  for(const status of ['slp','frz','par','brn','psn','tox','confusion']){
    const {g,b,uid}=fixture(),sim=battle.engine(g,b),actor=sim.p1.active[0];
    if(status==='confusion'){actor.addVolatile('confusion');actor.volatiles.confusion.time=3;}
    else {actor.status=status;actor.statusState=sim.initEffectState({id:status,target:actor,time:3});}
    b.party[uid]=battle.readMon(actor);g.data.inventory[27]=1;const pp={...b.party[uid].pp};advance(g);
    assert.equal(g.data.animation.kind,'item',status);assert.equal(actor.status,'');assert.equal(actor.volatiles.confusion,undefined);assert.deepEqual(b.party[uid].pp,pp);assert.equal(g.data.inventory[27],0);
  }
});
test('Revive restores only a fainted reserve to half HP and native alive counts survive reload',()=>{
  const {g,b,uid,other}=fixture();b.party[other].hp=0;g.data.inventory[28]=1;const sim=battle.engine(g,b),alive=sim.p1.pokemonLeft;
  advance(g);const mon=sim.p1.pokemon.find(p=>p.name==='u'+other);assert.equal(g.data.animation.kind,'item');assert.equal(g.data.animation.item.target,other);assert.equal(g.data.animation.itemTargetBefore.currentHp,0);assert.equal(mon.hp,Math.floor(mon.maxhp/2));assert.equal(mon.fainted,false);assert.equal(sim.p1.pokemonLeft,alive+1);assert.equal(g.data.activeId,uid);
  const loaded=new Game(g.data,g.data.animation.at+100),saved=battle.engine(loaded,loaded.data.battle);assert.equal(saved.p1.pokemonLeft,alive+1);assert.equal(saved.p1.pokemon.find(p=>p.name==='u'+other).fainted,false);assert.ok(loaded.availablePartners().includes(other));
});
test('Ether restores 10 PP to one exhausted attacking move, capped at its own maximum',()=>{
  const {g,b,uid}=fixture();b.party[uid].pp={33:0,44:0};g.data.inventory[38]=1;advance(g);assert.equal(g.data.animation.kind,'item');assert.equal(b.party[uid].pp[44],10);assert.equal(b.party[uid].pp[33],0);assert.equal(g.data.inventory[38],0);
  const sim=battle.engine(g,b),mon=sim.p1.active[0];mon.moveSlots.find(s=>s.id==='bite').pp=24;g.data.inventory[38]=1;
  assert.ok(items.use(g,b,sim,{id:38,target:mon.name,move:'bite'}));assert.equal(mon.moveSlots.find(s=>s.id==='bite').pp,25);
});
test('healthy partners, imminent waking, usable attack PP and mandatory switches conserve supplies',()=>{
  const {g,b}=fixture(),sim=battle.engine(g,b),actor=sim.p1.active[0];g.data.inventory={25:1,27:1,28:1,38:1};assert.equal(items.choose(g,b,sim),null);
  actor.status='slp';actor.statusState.time=1;assert.equal(items.choose(g,b,sim),null);actor.status='';actor.moveSlots[0].pp=0;assert.equal(items.choose(g,b,sim),null);
  actor.hp=1;b.pendingSwitch=131;assert.equal(items.choose(g,b,sim),null);delete b.pendingSwitch;sim.requestState='switch';sim.p1.activeRequest={forceSwitch:[true]};assert.equal(items.choose(g,b,sim),null);
});
test('reload during item playback neither consumes twice nor lets the foe hit before the recovery finishes',()=>{
  let {g,b,uid}=fixture();b.party[uid].hp=5;g.data.inventory[25]=1;const at=advance(g),event=g.data.animation,t=pacing.actionTiming(event),end=g.data.switchUntil;
  assert.equal(pacing.healthAt(event,'hero',at+t.healthAt-1,event.hero).currentHp,5);assert.ok(pacing.healthAt(event,'hero',at+t.healthAt+t.healthMs/2,event.hero).currentHp>5);
  g=new Game(g.data,at+300);assert.equal(g.tick(end-1),false);assert.equal(g.data.inventory[25],0);const healed=g.data.battle.party[uid].hp;assert.ok(g.tick(end));assert.equal(g.data.animation.actor,'foe');assert.ok(g.data.battle.party[uid].hp<healed);assert.equal(g.data.inventory[25],0);
});
test('invalid or ineffective targets never consume a stored item, and seasons reset consumables',()=>{
  const {g,b,uid}=fixture(),sim=battle.engine(g,b),actor=sim.p1.active[0];g.data.inventory={25:1,27:1,28:1,38:1};
  for(const id of [25,27,28,38,999])assert.equal(items.use(g,b,sim,{id,target:actor.name,move:'tackle'}),false);
  assert.deepEqual(g.data.inventory,{25:1,27:1,28:1,38:1});assert.equal(items.use(g,b,sim,{id:25,target:'u99999'}),false);
  g.data.battle=null;g.resetSeason(now+32*86400000);assert.deepEqual(g.data.inventory,{});
});
