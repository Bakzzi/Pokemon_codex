'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-15T07:00:00Z');
function fixture(){
  const g=new Game({},now,{random:()=>.73}),a=g.addPokemon(143,50,'fixture',now),c=g.addPokemon(131,50,'fixture',now);
  g.data.slots=[a,c,null,null,null,null];g.data.activeId=a;g.data.owned[a].moves=[33];g.data.owned[c].moves=[55];g.challenge(0,now);
  const b=g.data.battle;g.data.activeId=a;delete b.matchupPending;b.party[a].hp=5;b.foe.hp=1;return {g,b,a,c};
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}
function nextOpponent(f){for(let i=0;i<3;i++)advance(f.g);assert.equal(f.b.foeIndex,1);assert.equal(f.g.data.animation.kind,'encounter');}

for(const reload of [false,true])test('low-HP Snorlax switches once during an opponent replacement'+(reload?' across reload':''),()=>{
  const f=fixture();let {g}=f;nextOpponent(f);advance(g);
  assert.equal(g.data.activeId,f.c);assert.equal(g.data.animation.kind,'switch');const serial=g.data.eventSerial,foePp=structuredClone(g.data.battle.foe.pp);
  if(reload)g=new Game(g.data,g.data.switchUntil-100,{random:()=>.73});
  const b=g.data.battle;advance(g);assert.equal(g.data.activeId,f.c);assert.equal(battle.engine(g,b).p1.active[0].name,'u'+f.c);assert.equal(b.pendingSwitch,undefined);
  assert.equal(g.data.eventSerial,serial,'native switch acknowledgement must not replay the ball or fabricate an attack');assert.deepEqual(b.foe.pp,foePp);
  advance(g);assert.equal(g.data.eventSerial,serial,'discarding the fainted previous opponent action must not fabricate an attack');
  for(let i=0;i<10&&g.data.battle===b;i++){
    advance(g);assert.equal(g.data.activeId,f.c);assert.equal(b.party[f.a].hp,5);
  }
  assert.equal(g.data.journal.filter(e=>e.kind==='switch'&&e.text.includes('잠만보 출전')).length,0);
});

for(const sameTarget of [false,true])test('a pending switch '+(sameTarget?'reuses the matching':'replaces an obsolete')+' native queue entry',()=>{
  const {g,b,a,c}=fixture(),third=25;g.data.slots[2]=third;b.party[third]=g.memberCombatant(g.data.owned[third]);
  const sim=battle.engine(g,b);sim.clearRequest();sim.midTurn=true;sim.queue.clear();
  sim.queue.insertChoice({choice:'switch',pokemon:sim.p1.active[0],target:sim.p1.pokemon.find(p=>p.name==='u'+(sameTarget?c:third))});
  assert.ok(g.select(c,g.data.switchUntil));advance(g);
  assert.equal(g.data.activeId,c);assert.equal(sim.p1.active[0].name,'u'+c);
  assert.equal(sim.queue.list.filter(x=>['switch','instaswitch'].includes(x.choice)&&x.pokemon?.name==='u'+a).length,0);
  assert.equal(sim.log.filter(l=>l.startsWith('|switch|p1')).length,2,'initial entry and one requested entry only');
});

test('simultaneous knockouts preserve the selected replacement without duplicating either switch',()=>{
  const {g,b,a,c}=fixture();b.party[a].moves=[150];b.party[a].pp={150:40};b.foe=battle.combatant(74,50,[153]);
  advance(g);advance(g);assert.equal(b.party[a].hp,0);assert.equal(b.foe.hp,0);
  let lastSerial=g.data.eventSerial,switches=0;
  for(let i=0;i<15&&g.data.battle===b;i++){
    advance(g);if(g.data.eventSerial!==lastSerial&&g.data.animation.kind==='switch')switches++;lastSerial=g.data.eventSerial;
    if(g.data.activeId===c&&!b.pendingSwitch)assert.equal(battle.engine(g,b).p1.active[0].name,'u'+c);
  }
  assert.equal(switches,1);assert.equal(b.party[a].hp,0);assert.equal(g.data.activeId,c);
});

test('native level refresh cannot revive a fainted learner with the extra maximum HP',()=>{
  const {g,b,c}=fixture();b.party[c].hp=0;const sim=battle.engine(g,b),mon=sim.p1.pokemon.find(p=>p.name==='u'+c),maxHp=mon.maxhp;
  assert.equal(mon.fainted,true);g.data.owned[c].level++;g.data.owned[c].xp=xpAt(131,51);
  battle.step(g,b);assert.ok(mon.maxhp>maxHp);assert.equal(mon.hp,0);assert.equal(mon.fainted,true);assert.equal(b.party[c].hp,0);assert.ok(!g.availablePartners().includes(c));
});

test('an old ended save with a fainted positive-HP ghost settles as a loss once instead of looping',()=>{
  let {g,b,a,c}=fixture();const sim=battle.engine(g,b);
  for(const mon of sim.p1.pokemon){mon.hp=0;mon.fainted=true;mon.isActive=false;}sim.p1.pokemonLeft=0;
  sim.p1.pokemon.find(p=>p.name==='u'+c).hp=4;sim.win(sim.p2);b.sim=sim.toJSON();b.party[a].hp=0;b.party[c].hp=4;g.data.activeId=c;b.pendingSwitch=c;
  g=new Game(g.data,g.data.switchUntil,{random:()=>.73});
  for(let i=0;i<6&&g.data.battle;i++)advance(g);
  assert.equal(g.data.battle,null);assert.deepEqual(g.data.badges,[]);assert.equal(g.data.journal.filter(e=>e.kind==='loss').length,1);
  assert.equal(g.data.owned[c].level,50);assert.ok(g.data.caught[131]);
});
