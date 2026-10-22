'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Game}=require('../../desktop/game.cjs');
const Progression=require('../web/progression.js');
globalThis.MobileCore={nursery:require('../../desktop/daycare.cjs')};
const now=Date.parse('2026-10-17T06:00:00Z');
const tap=(g,t=now)=>{const s=g.presentation();assert.ok(s);assert.ok(g.advanceScene(s.id+':'+s.index,t));};
function finishDialogue(g,t=now){const id=g.presentation()?.id;for(let i=0;i<10&&g.presentation()?.mode==='dialogue'&&g.presentation().id===id;i++)tap(g,t);}
function playable(){return new Adventure(new Game({},now).data,now,{random:()=>.5});}
function rivalBattle(){const g=new Adventure({},now);finishDialogue(g);assert.equal(g.data.battle.storyId,'tutorial-green');finishDialogue(g);assert.equal(g.presentation().mode,'sendout');assert.ok(g.sceneTick(now+3000));return g;}
test('fresh game waits for taps; walking, clocks and duplicate taps cannot skip Oak',()=>{
  const g=new Adventure({},now),p=new Progression(g),before=JSON.stringify({...g.data,mapTravel:null});p.resume(now);
  assert.equal(p.live(now+86400000),false);assert.equal(p.catchUp(2000,now+86400000),0);assert.equal(p.consumed,0);assert.equal(JSON.stringify({...g.data,mapTravel:null}),before);assert.equal(g.data.mapTravel.bank,0);
  const s=g.presentation(),key=s.id+':'+s.index;assert.ok(g.advanceScene(key,now));assert.equal(g.advanceScene(key,now),false);assert.equal(g.presentation().index,1);
  tap(g);assert.equal(g.data.mobileStory.giftReceived,true);assert.equal(Object.values(g.data.owned).length,1);assert.equal(g.data.slots.filter(Boolean).length,1);
});
test('save/reload preserves each dialogue page and the first partner is not duplicated',()=>{
  let g=new Adventure({},now);tap(g);tap(g);
  const scene=structuredClone(g.presentation());g=new Adventure(structuredClone(g.data),now+5000);
  assert.deepEqual(g.presentation(),scene);finishDialogue(g,now+5000);assert.equal(g.data.battle.storyId,'tutorial-green');assert.equal(Object.keys(g.data.owned).length,1);
});
test('existing saves migrate without a tutorial or interruption to their active battle',()=>{
  const old=new Game({},now);old.newWild(now);old.data.fixture='preserved';const before=structuredClone(old.data);
  const g=new Adventure(before,now);assert.equal(g.presentation(),null);assert.equal(g.data.mobileStory.onboarding,'done');assert.deepEqual(g.data.battle,before.battle);assert.deepEqual(g.data.caught,before.caught);assert.equal(g.data.fixture,'preserved');
});
test('tutorial rival uses trainer rules and sequential send-out, without capture or resource use',()=>{
  const g=new Adventure({},now);finishDialogue(g);assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.battle.foe.id,133);assert.equal(g.captureOpportunity(),null);
  const p=new Progression(g);p.resume(now);finishDialogue(g);const at=g.presentation().at;
  assert.equal(g.tick(at+9000),false);assert.equal(p.catchUp(1000,at+9000),0);p.dirty=false;assert.equal(p.live(at+2699),false);assert.equal(p.live(at+2700),true);assert.equal(g.presentation(),null);
  assert.equal(g.data.workTokens,0);assert.equal(p.consumed,0);assert.equal(g.data.battle.turn,0);
  assert.ok(g.tick(at+20000));assert.ok(g.data.battle.turn>0);assert.equal(g.data.workTokens,0);
});
for(const won of [true,false])test('first battle '+(won?'victory':'loss')+' continues into adventure with a healthy partner',()=>{
  const g=rivalBattle();if(won){g.data.battle.foe.hp=0;g.defeatOpponent(now+10000);}else{g.data.battle.party[g.data.activeId].hp=0;g.endChallenge(false,now+10000);}
  assert.equal(g.presentation().name,'그린');finishDialogue(g,now+11000);assert.equal(g.presentation().name,'오박사');assert.equal(g.data.battle,null);
  finishDialogue(g,now+12000);assert.equal(g.data.mobileStory.onboarding,'done');assert.equal(g.presentation(),null);assert.ok(g.snapshot().hero.hp>0);assert.deepEqual(g.data.badges,[]);assert.equal(g.data.champion,false);
  g.data.workTokens=250;assert.ok(g.tick(now+50000));assert.equal(g.data.battle,null);assert.equal(g.data.kantoWorld.journey.destination,'viridian');
});
test('trainer intro occurs once per trainer, and badge rewards wait for victory dialogue',()=>{
  const g=playable();g.rivalProgress('rival-brock').state='won';assert.ok(g.challenge(0,now));assert.equal(g.presentation().sprite,'brock');finishDialogue(g);g.sceneTick(now+3000);
  g.data.battle.foe.hp=0;g.defeatOpponent(now+5000);assert.equal(g.data.battle.foeIndex,1);assert.equal(g.presentation(),null);
  g.data.battle.foe.hp=0;g.defeatOpponent(now+10000);assert.ok(g.presentation());assert.deepEqual(g.data.badges,[]);
  finishDialogue(g,now+11000);assert.deepEqual(g.data.badges,['brock']);assert.equal(g.data.battle,null);
});
test('league moves from one trainer outro into next trainer intro, not straight into attacks',()=>{
  const g=playable();g.data.badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];g.rivalProgress('rival-league').state='won';assert.ok(g.challenge(8,now));finishDialogue(g);g.sceneTick(now+3000);
  const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(now+5000);assert.equal(g.presentation().sprite,'lorelei');finishDialogue(g,now+6000);
  assert.equal(g.presentation().sprite,'bruno');assert.equal(b.foeIndex,0);assert.equal(b.turn,0);
});
test('Rocket trainers show the selected sprites and road encounter remains a wild event',()=>{
  const g=playable();g.data.badges=['brock','misty','surge'];assert.ok(g.challenge('rocket-grunt',now));assert.equal(g.presentation().sprite,'rocket-grunt');finishDialogue(g);g.sceneTick(now+3000);
  const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(now+5000);finishDialogue(g,now+6000);
  g.nextTick=0;g.data.switchUntil=0;g.finishBattleEvent(now+20000);assert.equal(g.presentation().sprite,'rocket-duo');
  const road=playable();road.data.trainingDevice.fluteObtainedAt=now;assert.ok(road.challenge('road-snorlax',now));assert.equal(road.presentation(),null);assert.equal(road.data.battle.kind,'wild');
});
test('pausing and resuming a send-out preserves its remaining visible duration',()=>{
  const g=new Adventure({},now);finishDialogue(g);finishDialogue(g);const p=new Progression(g);p.resume(now);p.pause(now+1000);
  const save=structuredClone(g.data),checkpoint=p.checkpoint(),r=new Adventure(save,now+100000),q=new Progression(r,checkpoint);q.resume(now+100000);
  assert.equal(q.live(now+101000),false);assert.equal(q.live(now+101700),true);assert.equal(q.consumed,0);
});
test('monthly reset preserves completed onboarding and never replays the tutorial',()=>{
  const g=playable();g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.equal(g.presentation(),null);assert.equal(g.data.mobileStory.onboarding,'done');
});
