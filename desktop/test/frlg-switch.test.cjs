'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs');
const now=Date.parse('2026-10-19T01:00:00Z');
const consumers=[['PC',require('../adventure.cjs').Adventure],['Android',require('../../mobile/adventure.cjs').Adventure]];
function setup(Story,hero=4,incoming=7,mode='shift'){
  const g=new Story(new Game({},now).data,now,{random:()=>.73});
  const uid=g.addPokemon(hero,50,'fixture',now),reserve=g.addPokemon(incoming,50,'fixture',now);
  g.data.owned[uid].moves=[mode==='double'?153:mode==='forced'?150:53];g.data.owned[reserve].moves=[145];g.data.activeId=uid;g.data.slots=[uid,reserve,null,null,null,null];
  const boss={id:'fixture',name:'fixture',team:mode==='forced'?[{id:143,level:70,moves:[33]}]:[{id:1,level:50,moves:[150]},{id:95,level:70,moves:[33]}]};
  g.battleBoss=()=>boss;
  const foe=boss.team[0],b=g.data.battle={kind:'trainer',bossIndex:0,foeIndex:0,manualMatchup:true,party:Object.fromEntries([uid,reserve].map(id=>[id,g.memberCombatant(g.data.owned[id])])),foe:battle.combatant(foe.id,foe.level,foe.moves),turn:0,captureAttempts:0};
  const sim=battle.engine(g,b);if(mode!=='forced'){sim.p2.active[0].hp=1;b.foe.hp=1;}else{sim.p1.active[0].hp=1;b.party[uid].hp=1;}
  return {g,b,sim,uid,reserve,boss};
}
function advance(g){const at=Math.max(now,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at),'next game transition');return at;}
function until(g,predicate,limit=16){for(let i=0;i<limit&&!predicate();i++)advance(g);assert.ok(predicate(),'transition reached its boundary');}
function watch(sim){const actions=[],run=sim.runAction;Object.defineProperty(sim,'runAction',{value:function(a){const offset=this.log.length,turn=this.turn;const result=run.call(this,a);if(a.choice==='move'&&this.log.slice(offset).some(l=>l.startsWith('|move|')))actions.push({turn,side:a.pokemon.side.n,mon:a.pokemon.name});return result;},configurable:true});return actions;}
for(const [label,Story] of consumers){
  for(const hero of [4,143])for(const incoming of [7,121])test(label+': Shift is free after '+(hero===4?'first':'second')+'-moving KO, incoming '+incoming,()=>{
    const f=setup(Story,hero,incoming);let {g,b,sim}=f;
    until(g,()=>b.foeIndex===1);const nativeTurn=sim.turn,foe=structuredClone(b.foe),hp=b.party[f.reserve].hp,pp=b.party[f.reserve].pp[145];
    assert.equal(battle.bestPartner(g,b),f.reserve);advance(g);assert.equal(g.data.activeId,f.reserve);assert.equal(g.data.animation.kind,'switch');
    // Save after the ball animation is scheduled, before native acknowledgement.
    g=new Story(structuredClone(g.data),g.data.animation.at+100,{random:()=>.73});g.battleBoss=()=>f.boss;b=g.data.battle;sim=battle.engine(g,b);
    // Keep the controlled non-lethal move set after the save's learnset migration.
    g.data.owned[f.reserve].moves=[145];g.data.owned[f.uid].moves=[53];
    until(g,()=>b.shiftUsed);assert.equal(sim.turn,nativeTurn);assert.equal(b.party[f.reserve].hp,hp);assert.equal(b.party[f.reserve].pp[145],pp);assert.deepEqual(b.foe,foe);
    assert.equal(sim.p1.active[0].name,'u'+f.reserve);assert.equal(sim.p2.active[0].fainted,true,'player Shift precedes opponent replacement');
    const actions=watch(sim);until(g,()=>actions.length>=2,10);
    assert.deepEqual(new Set(actions.slice(0,2).map(a=>a.side)),new Set([0,1]));assert.equal(actions[0].turn,actions[1].turn,'both sides retain their next-turn action');
    assert.equal(actions[0].side,incoming===121?0:1,'the new turn still follows native Speed');
    assert.equal(b.party[f.reserve].pp[145],pp-1);assert.equal(b.foeIndex,1);assert.equal(g.data.battles,1,'opponent faint resolved once');
  });
  for(const mode of ['forced','double'])test(label+': '+mode+' faint replacements cost no action and never resurrect or resolve the foe twice',()=>{
    const f=setup(Story,mode==='double'?101:4,7,mode),{g,b,sim}=f;
    until(g,()=>sim.p1.active[0].name==='u'+f.reserve);
    assert.equal(b.party[f.uid].hp,0);assert.ok(b.party[f.reserve].hp>0);assert.equal(b.party[f.reserve].pp[145],30);
    if(mode==='double'){assert.equal(b.foeIndex,1);assert.equal(b.foe.id,95);assert.equal(g.data.battles,1);}
    const actions=watch(sim);until(g,()=>actions.length>=2,12);assert.equal(actions[0].turn,actions[1].turn);assert.deepEqual(new Set(actions.slice(0,2).map(a=>a.side)),new Set([0,1]));
    assert.equal(b.party[f.reserve].pp[145],29);assert.equal(b.party[f.uid].hp,0);if(mode==='double')assert.equal(g.data.battles,1);
  });
  test(label+': Shift runs native exit effects without healing reserves, resetting foe PP or adding a turn',()=>{
    const f=setup(Story,143,7),{g,b,sim}=f;until(g,()=>b.foeIndex===1);
    const old=sim.p1.active[0];old.status='par';old.statusState=sim.initEffectState({id:'par',target:old});old.setAbility('naturalcure');b.party[f.uid].status='paralysis';
    const turn=sim.turn,pp=b.party[f.reserve].pp[145];advance(g);until(g,()=>b.shiftUsed);
    assert.equal(sim.turn,turn);assert.equal(old.status,'');assert.equal(b.party[f.uid].status,null);assert.equal(b.party[f.reserve].pp[145],pp);assert.ok(b.foe.hp>0);
  });
  test(label+': the next trainer starts with the chosen lead, rather than charging an opening switch turn',()=>{
    const f=setup(Story,143,7),{g,b}=f;f.boss.team=[{id:95,level:70,moves:[33]}];b.bossIndex=1;b.foeIndex=0;
    const hp=b.party[f.reserve].hp,pp=b.party[f.reserve].pp[145];g.nextTrainer(now);g.data.mobileStory.scene=null;assert.equal(b.sim,undefined);
    advance(g);assert.equal(g.data.activeId,f.reserve);assert.equal(b.party[f.reserve].hp,hp);assert.equal(b.party[f.reserve].pp[145],pp);
    const sim=battle.engine(g,b),actions=watch(sim);until(g,()=>actions.length>=2);
    assert.equal(sim.p1.active[0].name,'u'+f.reserve);assert.equal(actions[0].turn,actions[1].turn);assert.deepEqual(new Set(actions.map(a=>a.side)),new Set([0,1]));
  });
}
