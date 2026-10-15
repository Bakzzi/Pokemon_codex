'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Battle}=require('@pkmn/sim');
const ai=require('../battle-ai.cjs'),battle=require('../battle.cjs'),{data,learnedMoves,species}=require('../pokemon.cjs');
const {Game}=require('../game.cjs');
function set(name,moves,level=50){const p=battle.dex.species.get(name);return {species:name,level,moves,ability:p.abilities[0],nature:'Serious',ivs:{hp:15,atk:15,def:15,spa:15,spd:15,spe:15},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}};}
function fixture(a,am,b,bm,level=50,seed=[1,2,3,4]){return new Battle({formatid:'gen3customgame',seed,p1:{name:'one',team:[set(a,am,level)]},p2:{name:'two',team:[set(b,bm,level)]}});}
function pick(sim,options){return ai.plan(sim,0,options).action;}

test('coverage uses the attacking move type, including off-type moves and compound weaknesses',()=>{
  const s=fixture('Nidoqueen',['thunderbolt','earthquake','bodyslam'],'Gyarados',['surf']);
  assert.equal(pick(s),'move thunderbolt');
  const t=fixture('Nidoqueen',['thunderbolt','earthquake','bodyslam'],'Jolteon',['thunderbolt']);
  assert.equal(pick(t),'move earthquake');
  assert.equal(pick(fixture('Charizard',['scratch','ember','flamethrower','growl'],'Jynx',['icebeam','psychic'])),'move flamethrower');
});
test('type and ability immunities eliminate otherwise powerful attacks',()=>{
  assert.equal(pick(fixture('Blastoise',['surf','bite','tackle'],'Vaporeon',['surf'])),'move bite');
  const s=fixture('Nidoking',['earthquake','shadowball'],'Gengar',['nightshade']);
  assert.equal(pick(s),'move shadowball');
  const t=fixture('Pikachu',['thunderbolt','quickattack'],'Dugtrio',['growl']);
  assert.equal(pick(t),'move quickattack');
});
test('a reliable knockout beats inaccurate power and needless setup, without a repetition penalty',()=>{
  const s=fixture('Charizard',['flamethrower','fireblast','swordsdance','growl'],'Jynx',['psychic']);s.p2.active[0].hp=20;
  assert.equal(pick(s),'move flamethrower');s.p1.active[0].lastMove=s.dex.moves.get('flamethrower');assert.equal(pick(s),'move flamethrower');
});
test('priority can finish a faster opponent before its lethal counterattack',()=>{
  const s=fixture('Pikachu',['quickattack','thunderbolt','thunderwave'],'Aerodactyl',['rockslide']);s.p1.active[0].hp=1;s.p2.active[0].hp=1;
  assert.equal(pick(s),'move quickattack');
});
test('usable physical and special boosts depend on the actual damage race',()=>{
  assert.equal(pick(fixture('Scyther',['slash','swordsdance','leer'],'Snorlax',['tackle'])),'move swordsdance');
  assert.equal(pick(fixture('Snorlax',['tackle','amnesia','rest'],'Lapras',['surf'])),'move amnesia');
  assert.notEqual(pick(fixture('Snorlax',['tackle','amnesia','rest'],'Machamp',['lowkick'])),'move amnesia');
  const s=fixture('Scyther',['slash','swordsdance'],'Snorlax',['tackle']);s.p1.active[0].boosts.atk=6;assert.equal(pick(s),'move slash');
});
test('recovery is chosen to survive, but full HP and immediate knockout opportunities do not waste it',()=>{
  const s=fixture('Alakazam',['recover','psychic','calmmind'],'Snorlax',['tackle']);s.p1.active[0].hp=Math.floor(s.p1.active[0].maxhp*.4);assert.equal(pick(s),'move recover');
  const t=fixture('Snorlax',['bodyslam','amnesia','rest','sleeptalk'],'Lapras',['surf'],55);t.p1.active[0].hp=Math.floor(t.p1.active[0].maxhp*.45);assert.equal(pick(t),'move rest');
  t.p2.active[0].hp=1;t.p2.active[0].boosts.spe=-6;assert.equal(pick(t),'move bodyslam');
  const u=fixture('Snorlax',['bodyslam','rest'],'Alakazam',['psychic']);assert.notEqual(pick(u),'move rest');
});
test('sleep usable moves are used while asleep and ordinary attacks return after waking',()=>{
  const s=fixture('Snorlax',['bodyslam','rest','sleeptalk'],'Lapras',['watergun']);s.p1.active[0].setStatus('slp');s.p1.active[0].statusState.time=3;
  assert.equal(pick(s),'move sleeptalk');s.p1.active[0].cureStatus();assert.equal(pick(s),'move bodyslam');
  const t=fixture('Snorlax',['bodyslam','rest','snore'],'Lapras',['watergun']);t.p1.active[0].setStatus('slp');t.p1.active[0].statusState.time=3;assert.equal(pick(t),'move snore');
});
test('status, screens and weather are not repeatedly reapplied when already present',()=>{
  const s=fixture('Pikachu',['thunderbolt','thunderwave','lightscreen'],'Blastoise',['surf']);s.p2.active[0].setStatus('par');s.p1.addSideCondition('lightscreen',s.p1.active[0]);assert.equal(pick(s),'move thunderbolt');
  const t=fixture('Venusaur',['solarbeam','razorleaf','sunnyday'],'Blastoise',['surf']);t.field.setWeather('sunnyday',t.p1.active[0]);assert.equal(pick(t),'move solarbeam');
});
test('sleep immunity, exhausted PP, disabled moves and Taunt do not produce illegal plans',()=>{
  const s=fixture('Venusaur',['sleeppowder','razorleaf'],'Hypno',['pound']);assert.equal(pick(s),'move razorleaf');
  const t=fixture('Pikachu',['thunderbolt','quickattack','thunderwave'],'Pidgey',['tackle']);t.p1.active[0].moveSlots[0].pp=0;t.p1.active[0].addVolatile('taunt');assert.equal(pick(t),'move quickattack');
  const u=fixture('Charizard',['flamethrower','scratch'],'Jynx',['psychic']);u.p1.active[0].moveSlots[0].disabled=true;assert.equal(pick(u),'move scratch');
  u.p1.active[0].moveSlots[1].pp=0;assert.equal(pick(u),'move struggle');
});
test('survival and recharge costs beat gratuitous self-destruction or charge moves',()=>{
  assert.equal(pick(fixture('Electrode',['explosion','thunderbolt','tackle'],'Gyarados',['surf'])),'move thunderbolt');
  assert.equal(pick(fixture('Venusaur',['solarbeam','razorleaf','growth'],'Blastoise',['surf'])),'move razorleaf');
});
test('conditional damage is considered even with more than four ordinary attacks',()=>{
  const s=fixture('Hitmonchan',['tackle','machpunch','cometpunch','pursuit','swift','counter'],'Snorlax',['bodyslam']);
  const result=ai.plan(s,0);assert.ok(result.evaluations.some(x=>x.action==='move counter'));assert.ok(s.p1.choose(result.action));
});
test('a trainer switch includes the incoming hit, respects trapping and leaves a favorable fighter in place',()=>{
  const s=new Battle({formatid:'gen3customgame',seed:[1,2,3,4],p1:{name:'one',team:[set('Golem',['rockthrow']),set('Venusaur',['razorleaf'])]},p2:{name:'two',team:[set('Vaporeon',['surf'])]}});
  assert.equal(pick(s,{allowSwitch:true}),'switch 2');assert.ok(!pick(s).startsWith('switch'));
  assert.ok(!pick(s,{allowSwitch:true,eligible:[s.p1.active[0].name]}).startsWith('switch'));
  s.p1.active[0].trapped=true;assert.ok(!pick(s,{allowSwitch:true}).startsWith('switch'));s.p1.active[0].trapped=false;
  s.makeChoices('switch 2','move surf');assert.ok(!pick(s,{allowSwitch:true}).startsWith('switch'));
});
test('forecasting preserves every live HP, PP, status, boost, log, request, queue and RNG value',()=>{
  const s=fixture('Snorlax',['bodyslam','amnesia','rest','sleeptalk'],'Lapras',['icebeam','confuseray']);s.p1.active[0].hp=Math.floor(s.p1.active[0].maxhp*.5);
  const before=JSON.stringify(s.toJSON());const first=pick(s);assert.equal(JSON.stringify(s.toJSON()),before);assert.equal(pick(s),first);assert.equal(JSON.stringify(s.toJSON()),before);
  const fresh=Battle.fromJSON(JSON.parse(before));s.makeChoices(first,'move icebeam');fresh.makeChoices(first,'move icebeam');assert.deepEqual(s.toJSON(),fresh.toJSON());
});
test('the chosen action cannot peek at the real future random seed',()=>{
  const s=fixture('Charizard',['flamethrower','fireblast','growl'],'Jynx',['icebeam','lovelykiss']);const result=pick(s);
  for(const seed of [[65535,65535,65535,65535],[2,7,13,29],[100,200,300,400]]){s.resetRNG(seed);assert.equal(pick(s),result);}
});
test('all 151 original species can plan from their full earned move pools',()=>{
  const byId=new Map(data.moves.map(m=>[m.id,m.identifier]));let maximumMs=0;
  for(let id=1;id<=151;id++){
    const list=learnedMoves(id,60).map(id=>byId.get(id)),s=fixture(species.get(id).identifier,list,'Snorlax',['bodyslam','rest','amnesia'],60),before=JSON.stringify(s.toJSON()),at=performance.now();
    const result=ai.plan(s,0);maximumMs=Math.max(maximumMs,performance.now()-at);
    assert.ok(Number.isFinite(result.value),String(id));assert.equal(JSON.stringify(s.toJSON()),before,String(id));assert.ok(s.p1.choose(result.action),id+': '+result.action);
  }
  // A deliberately generous guard against accidentally unbounded search.
  assert.ok(maximumMs<2000,'unbounded decision: '+maximumMs+'ms');
});
test('tactical switches persist their cooldown; manual choices stay honored for the current foe',()=>{
  const now=Date.parse('2026-10-15T09:00:00Z'),g=new Game({},now,{random:()=>.73}),a=g.addPokemon(76,50,'fixture',now),b=g.addPokemon(3,50,'fixture',now);
  g.data.slots=[a,b,null,null,null,null];g.data.activeId=a;g.data.owned[a].moves=[88];g.data.owned[b].moves=[75];g.challenge(0,now);
  const state=g.data.battle;delete state.matchupPending;state.foe=battle.combatant(134,50,[57]);
  battle.step(g,state);assert.equal(g.data.activeId,b);assert.ok(Number.isInteger(state.aiLastSwitch));
  const reloaded=new Game(structuredClone(g.data),now,{random:()=>.73});assert.equal(reloaded.data.battle.aiLastSwitch,state.aiLastSwitch);
  g.data.switchUntil=0;assert.ok(g.select(a,now));assert.equal(state.manualMatchup,true);battle.step(g,state);assert.equal(g.data.activeId,a);
  state.foeIndex=0;g.nextTrainer(now);assert.equal(state.manualMatchup,undefined);assert.equal(state.aiLastSwitch,undefined);
});

test('Hyper Beam recharge is a legal forced action for either side, including after restore',()=>{
  const s=fixture('Snorlax',['hyperbeam','headbutt','rest'],'Lapras',['watergun'],50,[5,6,7,8]);s.makeChoices('move hyperbeam','move watergun');
  assert.equal(s.p1.active[0].getLockedMove(),'recharge');
  const restored=Battle.fromJSON(JSON.parse(JSON.stringify(s.toJSON()))),before=JSON.stringify(restored.toJSON());
  const result=ai.plan(restored,0,{allowSwitch:true});assert.equal(result.action,'move recharge');assert.ok(Number.isFinite(result.value));
  assert.equal(JSON.stringify(restored.toJSON()),before);assert.ok(Number.isFinite(ai.plan(restored,1).value));
  restored.makeChoices(result.action,ai.plan(restored,1).action);assert.equal(restored.p1.active[0].getLockedMove(),null);
  assert.ok(restored.log.some(line=>line.includes('|cant|')&&line.includes('recharge')));
});
test('charge, consecutive moves, Encore and zero-PP continuation honor native action locks',()=>{
  for(const id of ['solarbeam','fly','outrage','rollout','bide']){
    const s=fixture('Dragonite',[id,'tackle','agility'],'Snorlax',['splash']);s.makeChoices('move '+id,'move splash');
    assert.equal(s.p1.active[0].getLockedMove(),id,id);
    const slot=s.p1.active[0].moveSlots.find(m=>m.id===id);slot.pp=0;s.makeRequest('move');
    const result=ai.plan(s,0,{allowSwitch:true});assert.equal(result.action,'move '+id);assert.ok(Number.isFinite(ai.plan(s,1).value));
    s.makeChoices(result.action,'move splash');
  }
  const s=fixture('Pikachu',['thunderbolt','quickattack','growl'],'Snorlax',['encore']);s.makeChoices('move growl','move encore');
  assert.ok(s.p1.active[0].volatiles.encore);
  assert.equal(pick(s),'move growl');s.makeChoices(pick(s),'move encore');
});
test('a forecasting exception falls back to a native legal action without stopping game ticks',()=>{
  const now=Date.parse('2026-10-15T09:00:00Z'),g=new Game({},now,{random:()=>.73});g.data.workTokens=10000;g.data.caught[129]=now;
  g.data.battle={kind:'wild',turn:0,captureAttempts:0,party:{25:g.memberCombatant(g.data.owned[25])},foe:battle.combatant(129,5,[150])};
  const original=ai.plan,log=console.error;let errors=0;ai.plan=()=>{throw new Error('injected prediction failure');};console.error=()=>errors++;
  try{for(let i=0;i<3;i++)assert.ok(g.tick(Math.max(now,g.nextTick,g.data.switchUntil)));assert.equal(errors,1);assert.ok(g.data.eventSerial>0);}
  finally{ai.plan=original;console.error=log;}
});
