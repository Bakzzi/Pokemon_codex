'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Game}=require('../../desktop/game.cjs'),training=require('../../desktop/training-device.cjs'),silph=require('../silph.cjs'),rescue=require('../rescue.cjs');
const now=Date.parse('2026-10-18T02:00:00Z'),badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
function ready(n=5){const old=new Game({},now);old.data.badges=badges.slice(0,n);return new Adventure(old.data,now,{random:()=>.5});}
function settle(g){g.nextTick=0;g.data.switchUntil=0;}
function pages(g,at=now){const id=g.presentation()?.id;for(let i=0;i<8&&g.presentation()?.id===id&&g.presentation()?.mode==='dialogue';i++){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,at));}}
function begin(g){pages(g);g.sceneTick(now+3000);settle(g);}
function win(g,at=now+5000){g.data.battle.foeIndex=g.battleBoss().team.length-1;g.data.battle.foe.hp=0;g.defeatOpponent(at);pages(g,at+1000);settle(g);}
function register(g,n){g.data.caught={};for(let id=1;id<=n;id++)g.data.caught[id]=now;}
test('company opens after Koga; only its next normal opponent is revealed',()=>{
  const locked=ready(4);assert.ok(!locked.canChallenge('silph-grunt'));const g=ready();assert.ok(g.canChallenge('silph-grunt'));assert.ok(!g.canChallenge('silph-duo'));assert.ok(!g.canChallenge('silph-giovanni'));assert.ok(!g.canChallenge(5));
  const s=g.panelState().silph;assert.deepEqual(s.steps.map(e=>e.name),['로켓단 조무래기','???','???']);assert.equal(s.steps[1].team.length,0);assert.ok(!JSON.stringify(s).includes('그린'));assert.ok(!/마스터볼|라프라스/.test(s.description));
});
test('grunt victory reveals duo; clicking the duo unexpectedly starts the hidden rival',()=>{
  const g=ready();g.challenge('silph-grunt',now);assert.equal(g.data.battle.storyId,'silph-grunt');begin(g);win(g);
  assert.ok(g.data.mobileStory.silph.wins[0]);assert.deepEqual(g.panelState().silph.steps.map(e=>e.name),['로켓단 조무래기','로이·로사','???']);assert.ok(g.challenge('silph-duo',now+10000));assert.equal(g.data.battle.storyId,'rival-silph');assert.equal(g.data.mobileStory.silph.wins[1],0);assert.equal(g.captureOpportunity(),null);
});
test('rival failure persists, blocks duo, and permits only the rival retry until victory',()=>{
  let g=ready();g.data.mobileStory.silph.wins[0]=now;g.challenge('silph-duo',now);begin(g);g.endChallenge(false,now+5000);pages(g);settle(g);
  assert.ok(!g.canChallenge('silph-duo'));assert.ok(g.canChallenge('rival-silph'));g=new Adventure(structuredClone(g.data),now+7000);settle(g);assert.ok(!g.canChallenge('silph-duo'));g.challenge('rival-silph',now+10000);begin(g);win(g);
  assert.equal(g.data.battle,null);assert.ok(g.canChallenge('silph-duo'));assert.equal(g.data.mobileStory.silph.wins[1],0);g.challenge('silph-duo',now+20000);assert.equal(g.data.battle.storyId,'silph-duo');
});
test('company victory opens Sabrina only after the third result dialogue and never awards hidden items',()=>{
  const g=ready();g.rivalProgress('rival-silph').state='won';const inventory=structuredClone(g.data.inventory);
  for(const e of silph.encounters){assert.ok(g.challenge(e.id,now));begin(g);const b=g.data.battle;b.foeIndex=e.team.length-1;b.foe.hp=0;g.defeatOpponent(now+5000);assert.ok(!g.canChallenge(5));pages(g);settle(g);}
  assert.ok(g.data.mobileStory.silph.completedAt);assert.ok(g.canChallenge(5));assert.deepEqual(g.data.inventory,inventory);assert.equal(g.data.badges.length,5);assert.ok(silph.encounters.every(e=>!g.canChallenge(e.id)));
  assert.ok(g.challenge(5,now+20000));assert.equal(g.data.battle.bossIndex,5);
});
test('losing or abandoning company opponents cannot register a stage or bypass the route',()=>{
  for(const abandon of [false,true]){const g=ready();g.challenge('silph-grunt',now);begin(g);if(abandon)g.abandon(now+4000);else{g.endChallenge(false,now+4000);pages(g);}settle(g);assert.deepEqual(g.data.mobileStory.silph.wins,[0,0,0]);assert.ok(!g.canChallenge(5));assert.ok(g.canChallenge('silph-grunt'));}
});
test('custom company queue survives reload and intercepts only after the preceding wild battle',()=>{
  let g=ready();g.data.mobileStory.silph.wins[0]=now;g.newWild(now);g.challenge('silph-duo',now+1000);g=new Adventure(structuredClone(g.data),now+2000);assert.equal(g.data.pendingChallenge.index,'silph-duo');g.data.battle=null;g.data.pendingBattle=null;settle(g);g.tick(now+3000);assert.equal(g.data.battle.storyId,'rival-silph');
});
test('old Sabrina and active later gym progress stay open, but Koga alone does not skip the new event',()=>{
  const old=ready(6);delete old.data.mobileStory.silph;delete old.data.mobileStory.rivals['rival-silph'];const loaded=new Adventure(old.data,now+1000);assert.ok(loaded.data.mobileStory.silph.completedAt);assert.equal(loaded.rivalProgress('rival-silph').state,'completed');assert.ok(!loaded.canChallenge(6));assert.ok(loaded.canChallenge('mansion-investigate'));
  assert.equal(ready(5).rivalProgress('rival-silph').state,'unseen');
});
test('monthly reset clears company and its rival while preserving the lifetime collection',()=>{
  const g=ready(6);register(g,50);g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.deepEqual(g.data.mobileStory.silph.wins,[0,0,0]);assert.equal(g.rivalProgress('rival-silph').state,'unseen');assert.equal(g.kantoCaughtCount(),50);assert.ok(!g.canChallenge('silph-grunt'));assert.ok(!training.has(g));
});
test('device requires Erika and 50 unique lifetime Kanto registrations; it waits for a safe aide conversation',()=>{
  const g=ready(3);register(g,50);assert.equal(g.offerDevice(now),false);g.data.badges.push('erika');register(g,49);assert.equal(g.offerDevice(now),false);
  g.addPokemon(49,5,'duplicate',now);assert.equal(g.kantoCaughtCount(),49);g.data.caught[152]=now;assert.equal(g.offerDevice(now),false);g.data.caught[50]=now;
  assert.equal(training.claim(g,now),false);g.data.switchUntil=now+5000;assert.equal(g.offerDevice(now),false);settle(g);g.newWild(now);assert.equal(g.offerDevice(now),false);g.data.battle=null;settle(g);
  assert.ok(g.tick(now+10000));assert.equal(g.presentation().next,'device-reward');assert.ok(!training.has(g));const loaded=new Adventure(structuredClone(g.data),now+11000);assert.ok(!training.has(loaded));pages(loaded,now+12000);assert.ok(training.has(loaded));assert.equal(loaded.data.trainingDevice.snorlaxWonAt,null);assert.ok(!loaded.canChallenge(4));
  const again=new Adventure(structuredClone(loaded.data),now+13000);settle(again);assert.ok(!again.offerDevice(now+14000));assert.equal(again.data.journal.filter(e=>e.kind==='device').length,1);
});
test('an eligible upgrade never silently grants a device before the aide dialogue; owned devices survive',()=>{
  const g=ready(4);register(g,50);const loaded=new Adventure(structuredClone(g.data),now+1000);assert.ok(!training.has(loaded));settle(loaded);assert.ok(loaded.offerDevice(now+2000));pages(loaded);const stamp=loaded.data.trainingDevice.obtainedAt;
  const again=new Adventure(structuredClone(loaded.data),now+3000);assert.equal(again.data.trainingDevice.obtainedAt,stamp);
});
test('an old in-progress fourth grunt Pokemon and middle rival keep their original parties until resolution',()=>{
  const g=ready(4);g.rivalProgress('rival-middle').state='won';g.data.mobileStory.rescue.wins=[now,now,0];g.challenge('tower-grunt-3',now);begin(g);delete g.data.battle.mobileStoryRevision;g.data.battle.foeIndex=3;
  const loaded=new Adventure(structuredClone(g.data),now+1000);assert.equal(loaded.battleBoss().team.length,4);loaded.data.battle.foe.hp=0;loaded.defeatOpponent(now+2000);assert.equal(loaded.presentation().next,'win');pages(loaded);assert.equal(loaded.presentation().next,'rescue-reward');
  assert.equal(rescue.encounters[2].sprite,'rocket-duo');assert.deepEqual(rescue.encounters[2].team.map(p=>p.id),[52,24,110]);
  const middle=ready(4);middle.challenge('tower-grunt-1',now);delete middle.data.battle.mobileStoryRevision;middle.nextTrainer(now);begin(middle);const again=new Adventure(structuredClone(middle.data),now+1000);
  assert.equal(again.data.battle.foe.id,28);assert.equal(again.data.battle.foe.level,38);assert.deepEqual(again.battleBoss().team.map(p=>p.level),[38,35,37,35,40]);
});
test('the actual turn engine plays all company parties without capturing trainers or skipping dialogue',()=>{
  const g=ready();g.rivalProgress('rival-silph').state='won';const uid=g.addPokemon(150,100,'fixture',now);g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;
  for(const e of silph.encounters){g.challenge(e.id,now);begin(g);let at=now+30000,n=0;while(!g.presentation()&&n++<500){g.tick(at);at+=30000;}assert.ok(n<500);assert.equal(g.presentation().next,'win');assert.equal(g.captureOpportunity(),null);pages(g,at);settle(g);}
  assert.ok(g.data.mobileStory.silph.completedAt);assert.ok(g.canChallenge(5));
});
