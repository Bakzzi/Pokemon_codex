'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),R=require('../../shared/rivals.cjs'),dialogue=require('../../shared/kanto-dialogue.cjs');
const now=Date.parse('2026-10-23T07:00:00Z');
function ready(Type){const g=new Type({},now,{random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.kantoStory.cleared['k-moon-duo']=now;g.data.badges=['brock','misty'];g.data.kantoWorld.location='route-24';g.data.kantoWorld.position={...g.panelState(now).kantoWorld.map.points['route-24']};g.data.workTokens=1000;g.data.switchUntil=0;g.nextTick=now;return g;}
function settle(g){g.data.switchUntil=0;g.nextTick=now;}
function pages(g){for(let i=0;i<20&&g.presentation()?.mode==='dialogue';i++){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}if(g.presentation()?.mode==='sendout')g.sceneTick(now+4000);settle(g);}
function defeatAll(g){pages(g);for(let i=0;i<10;i++){const b=g.data.battle;b.foe.hp=0;g.defeatOpponent(now);if(g.presentation()?.next==='rival-win')return;pages(g);}throw Error('Rival did not reach its victory dialogue');}
for(const Type of [PC,Android]){
 test(Type.name+' restores the bridge rival as a manual interruption and lets Green introduce Bill only after victory',()=>{
  let g=ready(Type);assert.ok(!dialogue.victory(g,{id:'misty'}).join(' ').includes('이수재'));
  assert.ok(!g.panelState(now).kantoStory.cases.some(c=>c.id==='nugget-bridge'));assert.ok(g.canChallenge('rival-cerulean'));assert.ok(!g.rivalState().find(r=>r.id==='rival-cerulean').met);
  assert.equal(g.startAutomaticTrainer('k-bridge-1',now),false);assert.equal(g.data.workTokens,1000);assert.equal(K.prerequisite(g,K.nodes.get('k-bridge-2')),false);
  assert.ok(g.routeRivalTick(now));assert.equal(g.data.battle.storyId,'rival-cerulean');assert.equal(g.presentation().name,'그린');assert.equal(g.presentation().sprite,'green');assert.deepEqual(g.battleBoss().team.map(p=>[p.id,p.level]),[[21,18],[27,15],[19,15],[133,17]]);assert.equal(g.data.workTokens,1000);
  defeatAll(g);const s=g.presentation();assert.equal(s.next,'rival-win');assert.equal(s.name,'그린');assert.ok(s.pages.join(' ').includes('이수재'));assert.ok(s.pages.join(' ').includes('PC'));assert.ok(!s.pages.join(' ').includes('승선권'));assert.equal(g.rivalProgress('rival-cerulean').state,'active');assert.ok(!K.done(g,'k-bridge-1'));assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);
  assert.ok(g.advanceScene(s.id+':0',now));g=new Type(structuredClone(g.data),now);assert.equal(g.presentation().index,1);assert.equal(g.presentation().name,'그린');pages(g);assert.equal(g.rivalProgress('rival-cerulean').state,'won');assert.ok(!K.done(g,'k-bridge-1'));assert.ok(g.data.dialogueMemories.some(m=>m.name==='그린'&&m.pages.some(t=>t.includes('이수재'))));
  assert.ok(!g.panelState(now).kantoStory.cases.flatMap(c=>c.entries).some(e=>e.id==='k-bridge-1'));assert.ok(g.startAutomaticTrainer('k-bridge-1',now));assert.equal(g.data.battle.kantoNode,'k-bridge-1');assert.equal(g.data.battle.storyId,'k-bridge-1');assert.equal(g.data.workTokens,750);
 });
 test(Type.name+' keeps a lost bridge rival as an explicit local retry without revealing Bill',()=>{
  let g=ready(Type);g.challenge('k-bridge-1',now);pages(g);g.endChallenge(false,now);assert.ok(!g.presentation().pages.join(' ').includes('이수재'));pages(g);g=new Type(structuredClone(g.data),now);settle(g);assert.equal(g.rivalProgress('rival-cerulean').state,'retry');assert.equal(g.canChallenge('k-bridge-1'),false);assert.ok(g.canChallenge('rival-cerulean'));assert.ok(g.challenge('rival-cerulean',now));defeatAll(g);pages(g);assert.equal(g.rivalProgress('rival-cerulean').state,'won');assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);
 });
 test(Type.name+' restores an unrecorded bridge rival without changing recorded trainers or an ongoing encounter',()=>{
  for(const passed of ['cleared','visited','active','legacy']){
   const old=ready(Type);delete old.data.mobileStory.rivals['rival-cerulean'];if(passed==='cleared')old.data.kantoStory.cleared['k-bridge-1']=now;if(passed==='visited')old.data.kantoWorld.visited['route-25']=now;if(passed==='legacy')old.data.kantoStory.legacy=true;if(passed==='active'){old.rivalProgress('rival-cerulean')||(old.data.mobileStory.rivals['rival-cerulean']={state:'won'});old.startAutomaticTrainer('k-bridge-1',now);delete old.data.mobileStory.rivals['rival-cerulean'];}
   const battle=structuredClone(old.data.battle),owned=structuredClone(old.data.owned),g=new Type(structuredClone(old.data),now);assert.equal(g.rivalProgress('rival-cerulean').state,'unseen',passed);assert.ok(!g.rivalProgress('rival-cerulean').migratedAt);assert.deepEqual(g.data.battle,battle);assert.deepEqual(g.data.owned,owned);assert.ok(!g.panelState(now).adventureRecords.some(r=>r.id==='rival-cerulean'));assert.equal(g.data.kantoStory.legacy,false);
  }
 });
 test(Type.name+' preserves an unplayed bridge rival on reload and clears its progress in a new season',()=>{
  const g=new Type(structuredClone(ready(Type).data),now);assert.equal(g.rivalProgress('rival-cerulean').state,'unseen');g.rivalProgress('rival-cerulean').state='won';g.resetSeason(now);assert.equal(g.rivalProgress('rival-cerulean').state,'unseen');assert.deepEqual(R.byId.get('rival-cerulean').team.map(p=>p.level),[18,15,15,17]);
 });
 test(Type.name+' plays the restored rival through native turns without spending adventure activity or granting a badge',()=>{
  const g=ready(Type),uid=g.addPokemon(150,100,'fixture',now);g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;assert.ok(g.challenge('k-bridge-1',now));pages(g);let turns=0,t=now+30000;
  for(;turns<300&&!g.data.battle?.rivalResolution;turns++,t+=30000)g.tick(t);
  assert.ok(turns<300);assert.ok(g.data.battle.rivalResolution.won);assert.equal(g.data.battle.foeIndex,3);assert.equal(g.data.battles,4);assert.equal(g.data.workTokens,1000);assert.deepEqual(g.data.badges,['brock','misty']);pages(g);assert.equal(g.rivalProgress('rival-cerulean').state,'won');
 });
}
