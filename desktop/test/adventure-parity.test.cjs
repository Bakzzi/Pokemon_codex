'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs'),{Game}=require('../game.cjs'),safari=require('../../shared/safari.cjs');
const now=Date.parse('2026-10-18T06:00:00Z'),badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
function ready(n=5){const old=new Game({},now);old.data.badges=badges.slice(0,n);return new Adventure(old.data,now,{random:()=>.73});}
function counter(g,n,baseline=false){g.observe('fixture',{type:'event_msg',timestamp:new Date(now).toISOString(),payload:{type:'token_count',info:{total_token_usage:{output_tokens:n,total_tokens:n}}}},{baseline,now});}
function pages(g){const id=g.presentation().id;while(g.presentation()?.mode==='dialogue'&&g.presentation().id===id){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}}
test('fresh desktop tutorial requires manual pages and describes agent activity',()=>{
  const g=new Adventure({},now),first=structuredClone(g.presentation());assert.ok(first.pages.some(p=>p.includes('에이전트')));assert.ok(first.pages.every(p=>!p.includes('걸음')));
  assert.equal(g.tick(now+10000),false);assert.deepEqual(g.presentation(),first);
  const key=first.id+':'+first.index;assert.equal(g.advanceScene(key,now),true);assert.equal(g.advanceScene(key,now),false);
  pages(g);assert.equal(g.data.battle.storyId,'tutorial-green');pages(g);assert.equal(g.presentation().mode,'sendout');
  assert.equal(g.tick(now+2699),false);assert.equal(g.tick(now+2700),true);assert.equal(g.presentation(),null);assert.equal(g.data.workTokens,0);
});
test('old PC ownership, levels, dex, slots and items survive without replaying the tutorial',()=>{
  const old=new Game({},now),uid=old.addPokemon(143,77,'fixture',now);old.data.slots=[25,null,uid,null,null,null];old.data.inventory={83:9,25:3};old.data.badges=badges.slice(0,6);old.newWild(now);
  const saved=structuredClone(old.data),g=new Adventure(saved,now);for(const key of ['owned','caught','slots','inventory','badges','battle'])assert.deepEqual(g.data[key],saved[key],key);
  assert.equal(g.presentation(),null);assert.equal(g.data.mobileStory.onboarding,'done');assert.equal(g.data.mobileStory.silph.completedAt,0);
});
test('desktop and Android share story visibility, gates, teams, collection routes and pending actions',()=>{
  for(let n=0;n<=8;n++){
    const old=new Game({},now);old.data.badges=badges.slice(0,n);
    const pc=new Adventure(structuredClone(old.data),now),mobile=new Mobile(structuredClone(old.data),now),a=pc.panelState(now),b=mobile.panelState(now);
    for(const key of ['discovery','rivals','rivalLocks','rescue','silph','safari','mansion','mobileGymHints','bosses','collection','pendingActions'])assert.deepEqual(a[key],b[key],key+' badges '+n);
    assert.deepEqual(pc.wildOptions(),mobile.wildOptions());assert.equal(a.activityMode,'tokens');assert.equal(b.activityMode,'locked');
  }
});
test('a PC story page survives a save and reload at the same page',()=>{
  const g=new Adventure({},now);g.advanceScene(g.presentation().id+':0',now);const loaded=new Adventure(structuredClone(g.data),now+5000);
  assert.deepEqual(loaded.presentation(),g.presentation());assert.equal(loaded.presentation().index,1);
});
test('Safari uses new deduplicated work and preserves fractional activity and old banked tokens',()=>{
  const g=ready();assert.ok(safari.start(g,now));counter(g,1000,true);g.data.workTokens=500;
  counter(g,1013);assert.equal(g.data.mobileStory.safari.trip.steps,0);assert.equal(g.data.mobileStory.safari.trip.activityRemainder,13);assert.equal(g.data.workTokens,500);
  counter(g,1013);assert.equal(g.data.mobileStory.safari.trip.activityRemainder,13);counter(g,1025);
  assert.equal(g.data.mobileStory.safari.trip.steps,1);assert.equal(g.data.workTokens,500);
  const loaded=new Adventure(structuredClone(g.data),now);counter(loaded,1050);assert.equal(loaded.data.mobileStory.safari.trip.steps,2);assert.equal(loaded.data.workTokens,500);
});

test('the actual PC widget snapshot carries Safari state, not just panelState',()=>{
  const g=ready();safari.start(g,now);counter(g,0,true);counter(g,1250);
  const s=g.snapshot(now),panel=g.panelState(now);assert.ok(s.safari.active);assert.equal(s.safari.encounterCount,1);
  for(const key of ['active','tripId','remaining','balls','progress','lastEncounter'])assert.deepEqual(s.safari[key],panel.safari[key],key);
  const loaded=new Adventure(structuredClone(g.data),now+1000);assert.deepEqual(loaded.snapshot(now+1000).safari,s.safari);
});

for(const Consumer of [Adventure,Mobile])test(Consumer.name+' Safari freezes ordinary wild battles and banked work while exploration advances',()=>{
  const g=new Consumer(ready().data,now,{random:()=>0});g.newWild(now-10000);g.data.animation=null;g.data.switchUntil=0;g.nextTick=now;g.data.workTokens=64624;safari.start(g,now);
  const battle=structuredClone(g.data.battle),xp=g.data.owned[g.data.activeId].xp;
  for(let i=0;i<30;i++)g.tick(now+i*5000);
  assert.deepEqual(g.data.battle,battle);assert.equal(g.data.workTokens,64624);assert.equal(g.data.owned[g.data.activeId].xp,xp);
  assert.ok(g.walkingStep(50,now+150000));assert.equal(g.snapshot(now+150000).safari.encounterCount,1);assert.deepEqual(g.data.battle,battle);
  assert.ok(g.returnSafari(now+150000));assert.ok(g.tick(now+160000));assert.ok(g.data.workTokens<64624);
});

test('Safari pause permits an explicitly requested trainer challenge',()=>{
  const g=ready(0);g.data.trainingDevice.legacyRoadAccess=true;g.data.mobileStory.rivals['rival-brock'].state='won';g.newWild(now-10000);g.data.switchUntil=0;g.nextTick=now;safari.start(g,now);
  g.data.kantoWorld.location='pewter';g.rivalProgress('rival-brock').state='won';for(const n of require('../../shared/kanto-journey.cjs').nodes.values())if(n.case==='forest-path'||n.originalLocation==='gym:0')g.data.kantoStory.cleared[n.id]=now;assert.ok(g.challenge(0,now));assert.ok(g.tick(now));assert.equal(g.data.battle.kind,'trainer');assert.ok(g.data.mobileStory.safari.trip);assert.ok(g.presentation());
});
test('Safari completion keeps activity beyond the distance limit for ordinary adventures',()=>{
  const g=ready();safari.start(g,now);g.data.mobileStory.safari.trip.steps=1499;counter(g,0,true);counter(g,100);
  assert.equal(g.data.mobileStory.safari.trip,null);assert.equal(g.data.mobileStory.safari.last.steps,1500);assert.equal(g.data.workTokens,75);
});
test('manual dialogue and idle clocks cannot advance a PC expedition',()=>{
  const g=ready();safari.start(g,now);g.dialogue('trainer','테스트','green',['대화'],'none',now);counter(g,0,true);counter(g,250);
  assert.equal(g.data.mobileStory.safari.trip.steps,0);assert.equal(g.data.workTokens,250);g.tick(now+10000);assert.equal(g.data.mobileStory.safari.trip.steps,0);
});
test('complete reset keeps reader object identity and token baselines without replaying old work',()=>{
  const g=ready(),identity=g;counter(g,1000,true);counter(g,1500);g.addPokemon(143,80,'fixture',now);g.data.inventory={83:9};g.resetProgress(now);
  assert.equal(g,identity);assert.deepEqual(g.data.badges,[]);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.deepEqual(g.data.inventory,{});assert.equal(Object.keys(g.data.caught).length,1);assert.equal(g.presentation().kind,'oak');assert.equal(g.data.workTokens,0);
  counter(g,1500);assert.equal(g.data.workTokens,0);counter(g,1550);assert.equal(g.data.workTokens,50);
});
