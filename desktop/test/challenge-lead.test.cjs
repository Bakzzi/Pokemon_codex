'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const consumers=[['PC',require('./helpers/story-fixture.cjs').PC],['Android',require('./helpers/story-fixture.cjs').Android]];
const now=Date.parse('2026-10-19T08:30:00Z');
function ready(g,at=now){g.data.animation=null;g.data.switchUntil=0;g.nextTick=at;}
function pages(g){let limit=20;while(g.presentation()?.mode==='dialogue'&&limit--){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}assert.ok(limit>0);}
function fixture(Type){
 const g=new Type(new Game({},now).data,now,{random:()=>.73});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;
 const old=g.addPokemon(59,5,'fixture',now);g.data.owned[old].moves=[52];g.data.owned[old].ability=22;
 const p=g.data.owned[25];p.level=30;p.xp=xpAt(25,30);p.moves=[84];
 g.data.slots=[old,25,null,null,null,null];g.data.activeId=old;g.data.badges=['brock'];ready(g);return {g,old};
}
for(const [name,Type] of consumers){
 test(name+': first sendout and native entry both use the chosen counter, with no opening recall or wrong entry ability',()=>{
  let {g,old}=fixture(Type);let draws=0;g.random=()=>{draws++;return .73;};assert.ok(g.challenge(1,now));
  const before=structuredClone(g.data.battle.party);assert.equal(g.data.activeId,25);assert.equal(draws,0);assert.equal(g.data.battle.matchupPending,undefined);assert.equal(g.data.battle.pendingSwitch,undefined);
  assert.equal(g.presentation().next,'sendout');assert.notEqual(g.data.animation.kind,'switch');pages(g);
  assert.equal(g.presentation().mode,'sendout');assert.equal(g.snapshot(now).hero.id,25);assert.deepEqual(g.data.battle.party,before);
  // An older save paused before first entry must also choose before resuming its
  // sendout, without touching an already-started native battle.
  const saved=structuredClone(g.data);saved.activeId=old;saved.battle.matchupPending=true;
  g=new Type(saved,now+1,{random:()=>.73});assert.equal(g.presentation().mode,'sendout');assert.equal(g.data.activeId,25);assert.equal(g.data.battle.pendingSwitch,undefined);
  const b=g.data.battle,restored=structuredClone(b.party),sim=battle.engine(g,b);assert.equal(sim.p1.active[0].name,'u25');assert.equal(sim.p2.active[0].boosts.atk,0,'the benched Intimidate partner never entered');
  assert.deepEqual(b.party,restored);for(const id of [old,25]){assert.equal(b.party[id].hp,before[id].hp);for(const move of Object.keys(before[id].pp))assert.equal(b.party[id].pp[move],before[id].pp[move]);}
  g.sceneTick(now+3000);const at=Math.max(now+4000,g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));
  assert.equal(g.data.activeId,25);assert.notEqual(g.data.animation.kind,'switch');assert.equal(b.pendingSwitch,undefined);assert.equal(g.data.workTokens,0);
 });
 test(name+': a queued challenge selects its lead while preserving the paused wild partner, battle and credit',()=>{
  const {g,old}=fixture(Type);g.newWild(now);ready(g);const wild=g.data.battle,prior=structuredClone(wild),credit=g.data.workTokens,slots=[...g.data.slots];
  assert.ok(g.challenge(1,now));assert.equal(g.data.activeId,old);assert.ok(g.tick(now));
  assert.equal(g.data.activeId,25);assert.equal(g.data.suspendedWild,wild);assert.equal(wild.suspension.activeId,old);
  for(const k of ['foe','party','sim'])assert.deepEqual(wild[k],prior[k]);assert.equal(g.data.workTokens,credit);assert.deepEqual(g.data.slots,slots);
  assert.equal(g.data.battle.pendingSwitch,undefined);assert.notEqual(g.data.animation.kind,'switch');
  g.restoreWild(now+10000);assert.equal(g.data.activeId,old);assert.equal(g.data.battle,wild);for(const k of ['foe','party','sim'])assert.deepEqual(wild[k],prior[k]);
 });
 test(name+': Johto challenges also select their counter before trainer dialogue and first sendout',()=>{
  const g=new Type(new Game({},now).data,now,{random:()=>.73});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.champion=true;
  const old=g.addPokemon(129,5,'fixture',now);assert.ok(g.unlockJohto(now,[129,25]));g.data.activeId=old;g.data.owned[old].moves=[150];g.data.owned[25].moves=[84];
  g.data.johto.cleared['j-sprout']=now;ready(g);assert.ok(g.challenge('j-falkner',now));const b=g.data.battle,before=structuredClone(b.party);
  assert.equal(g.data.activeId,25);assert.equal(b.matchupPending,undefined);assert.equal(b.pendingSwitch,undefined);pages(g);
  assert.equal(g.presentation().mode,'sendout');assert.equal(g.snapshot(now).hero.id,25);assert.deepEqual(b.party,before);assert.equal(battle.engine(g,b).p1.active[0].name,'u25');
 });
}
