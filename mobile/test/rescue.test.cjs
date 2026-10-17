'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Game}=require('../../desktop/game.cjs'),training=require('../../desktop/training-device.cjs'),rescue=require('../rescue.cjs');
const now=Date.parse('2026-10-17T14:00:00Z');
function fresh(){return new Adventure(new Game({},now).data,now,{random:()=>.5});}
function ready(){const g=fresh();g.data.badges=['brock','misty','surge','erika'];g.data.trainingDevice.rocketWonAt=now;return g;}
function settle(g){g.nextTick=0;g.data.switchUntil=0;}
function pages(g,at=now){const id=g.presentation()?.id;for(let i=0;i<8&&g.presentation()?.id===id&&g.presentation()?.mode==='dialogue';i++){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,at));}}
function begin(g){pages(g);g.sceneTick(now+3000);settle(g);}
function win(g,at=now+5000){g.data.battle.foeIndex=g.battleBoss().team.length-1;g.data.battle.foe.hp=0;g.defeatOpponent(at);pages(g,at+1000);settle(g);}
function beatRival(g){g.challenge('tower-grunt-1',now);begin(g);win(g);assert.equal(g.rivalProgress('rival-middle').state,'won');}
function throughGrunts(g){beatRival(g);for(const e of rescue.encounters){assert.ok(g.challenge(e.id,now+10000));begin(g);win(g,now+15000);}}
test('Erika victory unlocks rescue but never awards the flute on Android',()=>{
  const g=fresh();g.data.badges=['brock','misty','surge'];g.data.trainingDevice.rocketWonAt=now;assert.equal(g.canChallenge('tower-grunt-1'),false);
  assert.ok(g.challenge(3,now));begin(g);win(g);assert.ok(g.data.badges.includes('erika'));assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.canChallenge('tower-grunt-1'),true);assert.equal(g.canChallenge('road-snorlax'),false);
  assert.ok(!/피리/.test(g.panelState().rescue.description));assert.ok(!g.panelState().inventory.some(i=>i.id==='poke-flute'));assert.equal(training.awardFlute(g,now+20000),false);
});
test('only the first available grunt can be challenged and its first request is intercepted',()=>{
  const g=ready();assert.equal(g.challenge('tower-grunt-2',now),false);assert.equal(g.challenge('tower-grunt-3',now),false);assert.ok(g.challenge('tower-grunt-1',now));assert.equal(g.data.battle.storyId,'rival-middle');
  assert.deepEqual(g.data.mobileStory.rescue.wins,[0,0,0]);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);
});
test('rival loss blocks the first grunt until the rival rematch is won',()=>{
  const g=ready();g.challenge('tower-grunt-1',now);begin(g);g.endChallenge(false,now+5000);pages(g,now+6000);settle(g);
  assert.equal(g.canChallenge('tower-grunt-1'),false);assert.equal(g.canChallenge('rival-middle'),true);assert.equal(g.panelState().rivalLocks['tower-grunt-1'],'그린에게 승리해야 도전할 수 있어요.');
  g.challenge('rival-middle',now+10000);begin(g);win(g,now+15000);assert.equal(g.canChallenge('tower-grunt-1'),true);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.deepEqual(g.data.mobileStory.rescue.wins,[0,0,0]);
});
test('all three separate trainer victories are required, and the reward waits for the elder dialogue',()=>{
  const g=ready();beatRival(g);
  for(const e of rescue.encounters){
    assert.ok(g.challenge(e.id,now+10000));assert.equal(g.data.battle.storyId,e.id);assert.equal(g.data.battle.kind,'trainer');assert.equal(g.captureOpportunity(),null);begin(g);win(g,now+15000);
    assert.equal(g.canChallenge(e.id),false);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.canChallenge('road-snorlax'),false);
  }
  assert.equal(g.presentation().name,'보라타운 촌장');assert.equal(g.presentation().sprite,'mr-fuji');assert.equal(g.data.mobileStory.rescue.rewardPending,true);assert.equal(g.data.mobileStory.rescue.completedAt,0);
  const key=g.presentation().id+':'+g.presentation().index;assert.ok(g.advanceScene(key,now+30000));assert.equal(g.advanceScene(key,now+31000),false);
  assert.equal(g.data.trainingDevice.fluteObtainedAt,now+30000);assert.equal(g.data.mobileStory.rescue.rewardPending,false);assert.equal(g.canChallenge('road-snorlax'),true);assert.equal(g.panelState().inventory.filter(i=>i.id==='poke-flute').length,1);
  assert.equal(g.data.journal.filter(j=>j.text==='보라타운 촌장에게 포켓몬피리를 받았다!').length,1);
});
test('losing or abandoning a grunt cannot complete that stage or grant the reward',()=>{
  for(const abandon of [false,true]){const g=ready();beatRival(g);g.challenge('tower-grunt-1',now+10000);begin(g);if(abandon)g.abandon(now+15000);else{g.endChallenge(false,now+15000);pages(g,now+16000);}settle(g);assert.deepEqual(g.data.mobileStory.rescue.wins,[0,0,0]);assert.equal(g.canChallenge('tower-grunt-1'),true);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);}
});
test('a saved pending elder reward survives reload and is granted once without replaying the fights',()=>{
  let g=ready();throughGrunts(g);const state=structuredClone(g.data),xp=g.data.owned[g.data.activeId].xp;g=new Adventure(state,now+20000);
  assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.presentation().next,'rescue-reward');pages(g,now+25000);assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.ok(g.data.trainingDevice.fluteObtainedAt);
  g=new Adventure(structuredClone(g.data),now+30000);assert.equal(g.data.journal.filter(j=>j.text==='보라타운 촌장에게 포켓몬피리를 받았다!').length,1);assert.equal(g.canChallenge('tower-grunt-3'),false);
});
test('legacy flutes and already opened routes are preserved, while new seasons restart rescue',()=>{
  const old=new Game({},now);old.data.badges=['brock','misty','surge','erika'];assert.equal(training.awardFlute(old,now),true);
  const g=new Adventure(old.data,now+1000);assert.equal(g.data.trainingDevice.fluteObtainedAt,now);assert.equal(g.data.mobileStory.rescue.legacy,true);assert.equal(g.panelState().rescue.completed,true);assert.equal(g.rivalProgress('rival-middle').state,'completed');
  g.data.caught[150]=now;g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.deepEqual(g.data.mobileStory.rescue.wins,[0,0,0]);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);assert.equal(g.data.caught[150],now);assert.equal(g.rivalProgress('rival-middle').state,'unseen');
});
test('after rescue and resolving Snorlax, Koga starts normally without a second rival ambush',()=>{
  const g=ready();throughGrunts(g);pages(g,now+30000);settle(g);g.challenge('road-snorlax',now+40000);g.defeatOpponent(now+50000);settle(g);assert.ok(g.data.trainingDevice.snorlaxWonAt);assert.equal(g.data.trainingDevice.obtainedAt,null);assert.ok(!g.data.animation.text.includes('학습장치'));assert.ok(g.canChallenge(4));assert.ok(g.challenge(4,now+60000));assert.equal(g.data.battle.bossIndex,4);assert.equal(g.data.battle.storyId,null);
});
test('queued rescue challenges are retained through a native-style reload',()=>{
  let g=ready();beatRival(g);g.newWild(now+10000);assert.ok(g.challenge('tower-grunt-1',now+11000));assert.equal(g.data.pendingChallenge.index,'tower-grunt-1');
  g=new Adventure(structuredClone(g.data),now+12000);assert.equal(g.data.pendingChallenge.index,'tower-grunt-1');g.data.battle=null;g.data.pendingBattle=null;settle(g);assert.ok(g.tick(now+20000));assert.equal(g.data.battle.storyId,'tower-grunt-1');
});
test('desktop game keeps its existing flute award behavior',()=>{const g=new Game({},now);g.data.badges.push('erika');assert.equal(training.awardFlute(g,now),true);assert.equal(g.data.trainingDevice.fluteObtainedAt,now);assert.ok(g.data.journal.some(j=>j.text.startsWith('민화에게 포켓몬피리')));});
test('an upgraded rival save that already owns the old flute cannot leave an unreachable unseen rival',()=>{
  const g=ready();delete g.data.mobileStory.rescue;g.data.trainingDevice.fluteObtainedAt=now;g.rivalProgress('rival-middle').state='unseen';const upgraded=new Adventure(g.data,now+1000);
  assert.equal(upgraded.rivalProgress('rival-middle').state,'completed');assert.ok(upgraded.panelState().rescue.completed);assert.equal(upgraded.data.trainingDevice.fluteObtainedAt,now);
});
test('the actual turn engine defeats every rescue party and only then opens the elder reward',()=>{
  const g=ready();beatRival(g);const uid=g.addPokemon(150,100,'fixture',now);g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;
  for(const e of rescue.encounters){g.challenge(e.id,now+10000);begin(g);let clock=now+30000,actions=0;while(!g.presentation()&&actions++<500){g.tick(clock);clock+=30000;}assert.ok(actions<500);assert.equal(g.presentation().next,'win');pages(g,clock);settle(g);assert.equal(g.data.trainingDevice.fluteObtainedAt,null);}
  assert.equal(g.presentation().next,'rescue-reward');pages(g,now+100000);assert.ok(g.data.trainingDevice.fluteObtainedAt);
});
