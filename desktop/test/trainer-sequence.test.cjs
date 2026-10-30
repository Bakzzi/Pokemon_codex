'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure;
const K=require('../../shared/kanto-journey.cjs'),J=require('../../shared/johto.cjs'),sequence=require('../../shared/trainer-sequence.cjs');
const Progression=require('../../mobile/web/progression.js');globalThis.MobileCore={nursery:require('../daycare.cjs')};
const now=Date.parse('2026-10-26T08:00:00Z');
function fixture(Type,place='ss-anne'){
 const g=new Type({},now,{storyAuto:false,random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.kantoStory.cleared['k-bill']=now;g.data.kantoWorld.location=place;g.gainXp(25,1000000,now);g.nextTick=now;g.data.switchUntil=0;g.data.workTokens=0;return g;
}
function intro(g,at){while(g.presentation()?.automatic){const s=g.presentation();at=Math.max(at,s.at+s.duration);assert.ok(g.sceneTick(at));}return Math.max(at,g.nextTick,g.data.switchUntil);}
function win(g,at){at=intro(g,at);const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(at);return g.data.switchUntil;}
for(const [label,Type] of [['PC',PC],['Android',Android]]){
 test(label+': one ship click runs every ordinary trainer through native battles and stops before the captain/rival',()=>{
  let g=fixture(Type),at=now;const ids=K.cases.find(c=>c.id==='anne-visit').entries.filter(id=>K.nodes.get(id).trainer);
  assert.ok(ids.length>2);g.controlTick(at);assert.equal(g.data.battle,null);
  assert.ok(g.challenge(ids[0],at));assert.equal(g.presentation().mode,'trainer-intro');
  for(let i=0;g.data.trainerSequence&&i<2500;i++){
   at=Math.max(at+500,g.nextTick,g.data.switchUntil||0);
   if(g.presentation()){assert.ok(g.presentation().automatic);g.sceneTick(Math.max(at,g.presentation().at+g.presentation().duration));}
   else g.tick(at);
   if(i===20)g=new Type(structuredClone(g.data),at,{random:()=>.6});
  }
  assert.equal(g.data.trainerSequence,undefined);assert.equal(g.data.battle,null);
  for(const id of ids)assert.ok(K.done(g,id),id);
  assert.equal(K.done(g,'k-captain'),false);assert.equal(g.rivalProgress('rival-surge').state,'unseen');assert.equal(g.data.workTokens,0);
  assert.equal(g.data.journal.filter(e=>e.kind==='story'&&e.text.endsWith('에게 승리!')).length,ids.length);
  at=Math.max(at,g.nextTick,g.data.switchUntil);assert.ok(g.challenge('k-captain',at));
  assert.equal(g.data.battle.storyId,'rival-surge');assert.equal(g.presentation().mode,'dialogue');assert.ok(!g.presentation().automatic);assert.equal(g.data.trainerSequence,undefined);
 });
 test(label+': gym trainees continue, but the original leader still waits for a separate click',()=>{
  const g=fixture(Type,'pewter');for(const id of K.cases.find(c=>c.id==='forest-path').entries)g.data.kantoStory.cleared[id]=now;
  const ids=K.cases.find(c=>c.id==='trainers-gym-0').entries;assert.ok(g.challenge(ids[0],now));let at=win(g,now);
  assert.ok(g.data.trainerSequence.waiting);assert.equal(g.controlTick(at-1),false);assert.ok(g.controlTick(at));assert.equal(g.data.battle.storyId,ids[1]);at=win(g,at);
  assert.equal(g.data.trainerSequence,undefined);g.controlTick(at);assert.equal(g.data.battle,null);assert.deepEqual(g.data.badges,[]);assert.ok(g.canChallenge(0));
 });
 test(label+': Johto trainees continue only to the elder conversation boundary',()=>{
  const g=fixture(Type);g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));g.data.johtoWorld.location=require('../../shared/johto-world.cjs').locationFor('j-sprout-sage-1');g.data.mobileStory.scene=null;g.nextTick=now;g.data.switchUntil=0;
  assert.ok(g.challenge('j-sprout-sage-1',now));let at=win(g,now);assert.ok(g.controlTick(at));assert.equal(g.data.battle.storyId,'j-sprout-sage-2');at=win(g,at);
  assert.ok(J.done(g,'j-sprout-sage-1')&&J.done(g,'j-sprout-sage-2'));assert.equal(J.done(g,'j-sprout'),false);assert.equal(g.data.trainerSequence,undefined);assert.ok(g.canChallenge('j-sprout'));
 });
 test(label+': losses, abandoned runs, queued cancellation and departure do not keep starting opponents',()=>{
  for(const stop of ['loss','abandon','cancel','travel']){
   const g=fixture(Type);if(stop==='cancel'){g.data.switchUntil=now+1000;assert.ok(g.challenge('k-anne-1',now));assert.ok(g.cancelChallenge(now));}
   else{
    assert.ok(g.challenge('k-anne-1',now));const at=intro(g,now);
    if(stop==='loss')g.endChallenge(false,at);
    if(stop==='abandon')assert.ok(g.abandon(at));
    if(stop==='travel')assert.ok(g.requestAction('travel','vermilion',at));
   }
   assert.equal(g.data.trainerSequence,undefined,stop);assert.ok(!K.done(g,'k-anne-1'),stop);
  }
 });
}
test('every special dialogue, choice, gift, leader and ordinary automatic encounter is outside the manual sequence',()=>{
 const g=fixture(PC);for(const id of ['k-captain','k-bill','k-fossil-choice','k-moon-scientist','k-bridge-rocket','k-robber','k-bulbasaur','k-lapras-visit','k-lift-key','k-mansion-page-1','k-forest-1','rocket-grunt','rocket-giovanni',0,8])assert.ok(!sequence.plan(g,id),id);
});
test('Android background catch-up cannot advance an explicit run, including the gap between trainers',()=>{
 for(const phase of ['intro','combat','between','queued']){
  let g=fixture(Android);assert.ok(g.challenge('k-anne-1',now));let at=now;
  if(phase==='combat')at=intro(g,at);
  if(['between','queued'].includes(phase))at=win(g,at);
  if(phase==='queued'){g.data.pendingChallenge={index:g.data.trainerSequence.current,queuedAt:at};delete g.data.trainerSequence.waiting;}
  g=new Android(structuredClone(g.data),at,{random:()=>.6});const before=JSON.stringify(g.data),p=new Progression(g);
  assert.equal(p.catchUp({steps:0,lockMillis:86400000},at+60000),0,phase);
  assert.equal(p.lockConsumed,0);assert.equal(JSON.stringify(g.data.battle),JSON.stringify(JSON.parse(before).battle));assert.deepEqual(g.data.kantoStory.cleared,JSON.parse(before).kantoStory.cleared);
 }
});
