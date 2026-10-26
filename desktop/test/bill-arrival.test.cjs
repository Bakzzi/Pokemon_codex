'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),W=require('../../shared/kanto-world.cjs');
const {finishJourney}=require('./helpers/travel-fixture.cjs');
const now=Date.parse('2026-10-26T06:00:00Z'),copy=structuredClone;
function settle(g){return Math.max(now,g.nextTick,g.data.switchUntil||0);}
function place(g,id){const w=W.init(g);Object.assign(w,{location:id,position:{...W.snapshot(g).map.points[id]},journey:null,walk:null,blocked:null});w.visited[id]=now;}
function fixture(Type){
 const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.badges=['brock','misty'];g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.rivalProgress('rival-cerulean').state='won';g.data.switchUntil=0;g.nextTick=now;
 for(const n of K.nodes.values())if(['forest','route-3','mt-moon'].includes(n.location))g.data.kantoStory.cleared[n.id]=now;
 place(g,'cerulean');return g;
}
function pages(g){for(let i=0;i<20&&g.presentation();i++){const s=g.presentation();if(s.mode==='dialogue')assert.ok(g.advanceScene(s.id+':'+s.index,settle(g)));else g.sceneTick(Math.max(settle(g),s.at+(s.duration||3000)+1));}}
function finishOpponent(g){pages(g);for(let i=0;i<10&&g.data.battle;i++){g.data.battle.foe.hp=0;g.defeatOpponent(settle(g));if(g.presentation()?.next==='win')return;pages(g);}throw Error('Victory dialogue missing');}
function ambient(g){for(let i=0;i<20&&g.movementTrainerNode();i++){g.data.workTokens=250;assert.ok(g.startAutomaticTrainer(g.movementTrainerNode(),settle(g)));for(let j=0;j<10&&g.data.battle;j++){pages(g);g.data.battle.foe.hp=0;g.defeatOpponent(settle(g));}assert.equal(g.data.battle,null);}}
function travel(g,id){assert.ok(g.requestAction('travel',id,settle(g)));finishJourney(g,settle(g));}
function bankTravel(g,id){g.recordTravelSteps(0);g.data.mapTravel.bank=40000;assert.ok(g.requestAction('travel',id,settle(g)));assert.ok(g.requestAction('travel-bank',null,settle(g)));finishJourney(g,settle(g));}
for(const Type of [PC,Android]){
 const label=Type===PC?'PC':'Android';
 test(label+' a real trip to Bill stops for the bridge incident, including loss and unconfirmed victory',()=>{
  let g=fixture(Type);travel(g,'sea-cottage');assert.equal(W.current(g).id,'route-24');assert.ok(!g.data.kantoWorld.visited['route-25']);assert.ok(!K.done(g,'k-bridge-rocket'));assert.equal(g.presentation(),null);assert.equal(W.checkpoint(g),null);
  assert.equal(g.panelState(settle(g)).kantoWorld.blocked,true);ambient(g);const row=g.panelState(settle(g)).kantoStory.cases.flatMap(c=>c.entries).find(n=>n.id==='k-bridge-rocket');assert.ok(row?.ready);assert.ok(!row.automatic);
  assert.ok(g.challenge(row.id,settle(g)));pages(g);g.endChallenge(false,settle(g));pages(g);travel(g,'sea-cottage');assert.equal(W.current(g).id,'route-24');assert.ok(!K.done(g,row.id));
  assert.ok(g.challenge(row.id,settle(g)));finishOpponent(g);assert.equal(K.gate(g,'route-25'),'bridge');const pending=copy(g.presentation());g=new Type(copy(g.data),settle(g));assert.deepEqual(g.presentation(),pending);assert.equal(K.gate(g,'sea-cottage'),'bridge');
  pages(g);assert.ok(K.done(g,row.id));travel(g,'sea-cottage');assert.equal(W.current(g).id,'sea-cottage');assert.ok(K.originalDone(g,'route-25'));
  let bill=g.panelState(settle(g)).kantoStory.cases.find(c=>c.id==='bill-visit');assert.ok(bill.entries[0].ready);assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);
  assert.ok(g.challenge('k-bill',settle(g)));const scene=copy(g.presentation());for(let i=1;i<=6;i++)g.controlTick(settle(g)+i*30000);assert.deepEqual(g.presentation(),scene);assert.ok(!K.done(g,'k-bill'));
  assert.ok(g.advanceScene(scene.id+':0',settle(g)));assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);g=new Type(copy(g.data),settle(g));pages(g);assert.equal(g.data.kantoStory.items['ss-ticket'],1);assert.ok(K.done(g,'k-bill'));assert.equal(g.canChallenge('k-bill'),false);
 });
 test(label+' an old save already at Bill exposes the missing step and can return without inventing rewards',()=>{
  let g=fixture(Type);for(const n of K.nodes.values())if(n.automatic&&['route-24','route-25'].includes(n.location))g.data.kantoStory.cleared[n.id]=now;
  place(g,'sea-cottage');g.data.kantoWorld.revision=3;const owned=copy(g.data.owned),cleared=copy(g.data.kantoStory.cleared);g=new Type(copy(g.data),now);
  const card=g.panelState(now).kantoStory.cases.find(c=>c.id==='bill-visit');assert.ok(card);assert.match(card.description,/24번도로/);assert.ok(card.entries[0].revealed);assert.equal(card.entries[0].ready,false);assert.equal(g.challenge('k-bill',now),false);assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.data.kantoStory.cleared,cleared);
  travel(g,'route-24');assert.equal(W.current(g).id,'route-24');assert.ok(g.canChallenge('k-bridge-rocket'));assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);
 });
 test(label+' a saved onward itinerary is revalidated after the active battle without changing combat or progress',()=>{
  let g=fixture(Type);place(g,'route-24');for(const n of K.nodes.values())if(n.automatic&&n.location==='route-24')g.data.kantoStory.cleared[n.id]=now;
  // Simulate the previous release's already-planned path, then remove the temporary fixture result.
  g.data.kantoStory.cleared['k-bridge-rocket']=now;g.requestAction('travel','sea-cottage',now);delete g.data.kantoStory.cleared['k-bridge-rocket'];g.data.kantoWorld.revision=3;g.newWild(settle(g));
  const battle=copy(g.data.battle),owned=copy(g.data.owned),cleared=copy(g.data.kantoStory.cleared);g=new Type(copy(g.data),settle(g));assert.deepEqual(g.data.battle,battle);assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.data.kantoStory.cleared,cleared);assert.ok(g.data.kantoWorld.journey.revalidate);assert.equal(W.advance(g,settle(g)),false);
  g.data.battle=null;g.data.pendingBattle=null;finishJourney(g,settle(g));assert.equal(W.current(g).id,'route-24');assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);
 });
 test(label+' Bill remains visible when only an ordinary Route 25 opponent is missing',()=>{
  const g=fixture(Type);g.data.kantoStory.cleared['k-bridge-rocket']=now;place(g,'sea-cottage');const row=g.panelState(now).kantoStory.cases.find(c=>c.id==='bill-visit');assert.ok(row);assert.match(row.description,/25번도로/);assert.equal(row.entries[0].ready,false);assert.ok(!row.entries.some(e=>K.nodes.get(e.id).automatic));
 });
}
test('Android bank-funded movement stops before the manual bridge incident without paying unreachable cells',()=>{
 const g=fixture(Android);bankTravel(g,'sea-cottage');assert.equal(W.current(g).id,'route-24');assert.ok(!K.done(g,'k-bridge-rocket'));assert.equal(g.data.kantoStory.items['ss-ticket'],undefined);assert.ok(g.data.mapTravel.bank>0);const account=copy(g.data.mapTravel),ledger=copy(g.data.kantoStory.cleared);
 for(let i=1;i<=12;i++)g.controlTick(settle(g)+i*30000);assert.equal(g.data.mapTravel.bank,account.bank);assert.deepEqual(g.data.kantoStory.cleared,ledger);assert.equal(g.presentation(),null);
});
