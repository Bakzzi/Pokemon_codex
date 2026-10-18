'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{Adventure:PC}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs'),{combatant}=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-18T12:00:00Z');
for(const [platform,Engine] of [['core',Game],['PC',PC],['Android',Mobile]]){
  const fixture=()=>new Engine(new Game({},now).data,now,{random:()=>0});
  test(platform+': captured Lv.16 Metapod remains deployable through idle ticks and reload, then evolves on level-up',()=>{
    let g=fixture();g.newWild(now);g.data.battle.foe=combatant(11,16,[33]);g.data.battle.foe.hp=1;
    assert.ok(g.capture(now));let at=Math.max(g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));
    for(let i=0;i<4;i++){at=Math.max(at+1,g.nextTick,g.data.switchUntil);g.tick(at);}
    let p=g.panelState(at).collection.find(p=>p.id===11);assert.ok(p.caught&&p.owned);assert.equal(p.level,16);
    const uid=g.panelState(at).roster.find(p=>p.id===11).uid;assert.equal(g.data.caught[12],undefined);
    g=new Engine(structuredClone(g.data),at);assert.equal(g.autoLevelEvolution(at),false);
    assert.ok(g.requestAction('select',uid,at));g.processActions(at);assert.equal(g.data.activeId,uid);assert.ok(g.data.slots.includes(uid));
    at=Math.max(at,g.nextTick,g.data.switchUntil);g.gainXp(uid,1,at);assert.equal(g.autoLevelEvolution(at),false);
    g.gainXp(uid,xpAt(11,17)-g.data.owned[uid].xp,at);assert.ok(g.autoLevelEvolution(at));
    assert.equal(g.data.owned[uid].id,12);assert.equal(g.data.owned[uid].level,17);assert.ok(g.data.caught[11]&&g.data.caught[12]);
  });
  test(platform+': a new form requires another level-up and saves its eligibility across reload',()=>{
    let g=fixture();const uid=g.addPokemon(10,15,'catch',now);assert.equal(g.autoLevelEvolution(now),false);
    g.gainXp(uid,xpAt(10,16)-g.data.owned[uid].xp,now);g=new Engine(structuredClone(g.data),now);
    assert.ok(g.autoLevelEvolution(now));assert.equal(g.data.owned[uid].id,11);
    assert.equal(g.autoLevelEvolution(now),false);assert.equal(g.data.caught[12],undefined);
    g.gainXp(uid,xpAt(11,17)-g.data.owned[uid].xp,now);assert.ok(g.autoLevelEvolution(now));assert.equal(g.data.owned[uid].id,12);
  });
  test(platform+': legacy records wait for a new level-up instead of evolving during migration',()=>{
    const g=fixture(),uid=g.addPokemon(11,15,'catch',now);delete g.data.owned[uid].formEntryLevel;
    const loaded=new Engine(structuredClone(g.data),now);assert.equal(loaded.autoLevelEvolution(now),false);assert.equal(loaded.data.owned[uid].id,11);
    loaded.gainXp(uid,xpAt(11,16)-loaded.data.owned[uid].xp,now);assert.ok(loaded.autoLevelEvolution(now));assert.equal(loaded.data.owned[uid].id,12);
  });
}
