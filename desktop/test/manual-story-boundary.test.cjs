'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),P=require('../../mobile/web/progression.js');
globalThis.MobileCore={nursery:require('../daycare.cjs')};
const now=Date.parse('2026-10-26T05:00:00Z');
function fixture(Type,location){
 const g=new Type({},now,{storyAuto:false,random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.kantoWorld.location=location;g.data.kantoWorld.visited[location]=now;g.nextTick=now;g.data.switchUntil=0;return g;
}
function ready(g){
 for(const n of K.nodes.values())if(n.automatic)g.data.kantoStory.cleared[n.id]=now;
 g.data.badges=['brock','misty','surge','erika'];g.data.mobileStory.scopeObtainedAt=now;g.rivalProgress('rival-middle').state='won';g.rivalProgress('rival-cerulean').state='won';g.rivalProgress('rival-silph').state='won';g.data.mobileStory.silph.wins[0]=now;g.data.kantoStory.drinkAt=now;g.data.mobileStory.mansion.startedAt=now;g.data.mobileStory.mansion.wins=6;
 for(let id=1;id<=50;id++)g.data.caught[id]=now;g.data.owned[25].happiness=180;
}
function signature(g){const d=g.data;return structuredClone({badges:d.badges,champion:d.champion,gifts:d.starterGifts,cleared:d.kantoStory.cleared,fossil:d.kantoStory.fossil,items:d.kantoStory.items,device:d.trainingDevice.obtainedAt,lapras:d.mobileStory.laprasResolved,mansion:d.mobileStory.mansion.read,rescue:d.mobileStory.rescue,silph:d.mobileStory.silph,rivals:d.mobileStory.rivals});}
function idle(g){for(let i=1;i<=12;i++){const t=now+i*30000;g.data.workTokens=250;g.controlTick(t);g.tick(t);}}
function pages(g){for(let i=0;i<15&&g.presentation()?.mode==='dialogue';i++){const s=g.presentation();if(s.awaitChoice)break;assert.ok(g.advanceScene(s.id+':'+s.index,now+500000));}}

test('automatic encounter classification excludes every Rocket, fossil guardian, gym and authored story event',()=>{
 for(const n of K.nodes.values()){
  if(n.source?.class==='ROCKET'||n.id==='k-moon-scientist'||n.originalLocation?.startsWith('gym:')||!n.trainer)assert.ok(!n.automatic,n.id);
  if(n.automatic){assert.ok(n.source,n.id);assert.ok(K.original.trainers.some(t=>t.map===n.source.map&&t.event===n.source.event&&t.automatic),n.id);}
 }
 assert.ok(K.nodes.get('k-forest-1').automatic);assert.ok(K.nodes.get('k-route3-1').automatic);
});

for(const Type of [PC,Android]){
 test(Type.name+' idle work at story locations never starts a challenge, accepts an invitation or grants its reward',()=>{
  for(const place of ['mt-moon','cerulean','vermilion','route-24','route-15','celadon','tower','saffron','mansion']){
   let g=fixture(Type,place);ready(g);const before=signature(g);idle(g);assert.deepEqual(signature(g),before,place);assert.equal(g.presentation(),null,place);assert.ok(!g.data.battle?.storyId,place);assert.notEqual(g.data.battle?.kind,'trainer',place);
   g=new Type(structuredClone(g.data),now+400000);assert.deepEqual(signature(g),before,place+' reload');
  }
 });
 test(Type.name+' all eight gyms wait for separate trainer and leader clicks',()=>{
  const places=['pewter','cerulean','vermilion','celadon','fuchsia','saffron','cinnabar','viridian'];
  for(let i=0;i<8;i++){
   const g=fixture(Type,places[i]);ready(g);g.data.badges=K.order.slice(0,K.order.indexOf(i)).map(j=>K.badges[j]);g.data.kantoStory.cleared['k-moon-duo']=now;g.data.kantoStory.cleared['k-captain']=now;g.data.kantoStory.roads['route-12']=now;g.data.mobileStory.silph.completedAt=now;g.data.mobileStory.mansion.completedAt=now;
   const ids=K.cases.find(c=>c.id==='trainers-gym-'+i).entries;for(const id of ids)assert.equal(g.startAutomaticTrainer(id,now),false);
   for(const id of ids)g.data.kantoStory.cleared[id]=now;assert.ok(g.canChallenge(i));const before=signature(g);idle(g);assert.deepEqual(signature(g),before);assert.notEqual(g.data.battle?.kind,'trainer');
   g.data.battle=null;g.data.pendingBattle=null;g.nextTick=now+500000;g.data.switchUntil=0;assert.ok(g.challenge(i,now+500000));const scene=structuredClone(g.presentation());idle(g);assert.deepEqual(g.presentation(),scene);assert.deepEqual(signature(g),before);
  }
 });
 test(Type.name+' explicit story battles and gifts wait through idle work and reload until dialogue input',()=>{
  for(const id of ['k-moon-scientist','k-bridge-rocket','tower-grunt-1','k-bulbasaur','k-device-visit','k-lapras-visit','k-mansion-page-1']){
   let g=fixture(Type,id==='tower-grunt-1'?'tower':K.nodes.get(id).location);ready(g);
   if(id==='k-moon-scientist')for(const n of K.nodes.values())if(n.case==='moon-path'&&n.trainer)g.data.kantoStory.cleared[n.id]=now;
   delete g.data.kantoStory.cleared[id];assert.equal(g.startAutomaticTrainer(id,now),false,id);assert.ok(g.challenge(id,now),id);const before=signature(g),scene=structuredClone(g.presentation());assert.equal(scene.mode,'dialogue');assert.ok(!scene.automatic);idle(g);assert.deepEqual(signature(g),before,id);assert.deepEqual(g.presentation(),scene,id);
   g=new Type(structuredClone(g.data),now+400000);assert.deepEqual(g.presentation(),scene,id);assert.deepEqual(signature(g),before,id);
   pages(g);if(K.nodes.get(id)?.gift)assert.ok(g.data.starterGifts[K.nodes.get(id).gift]);if(id==='k-device-visit')assert.ok(g.data.trainingDevice.obtainedAt);if(id==='k-lapras-visit')assert.ok(g.data.mobileStory.laprasResolved);if(id==='k-mansion-page-1')assert.equal(g.data.mobileStory.mansion.read,1);
  }
 });
 test(Type.name+' upgrading an incorrectly automatic story battle pauses it without resetting combat or awarding the outcome',()=>{
  for(const phase of ['intro','combat','pending-result']){
   let g=fixture(Type,'mt-moon');ready(g);const id='k-npc-mtmoonb2f-2';assert.ok(g.challenge(id,now));
   if(phase!=='intro'){pages(g);g.sceneTick(now+503000);g.data.battle.turn=7;g.data.battle.foe.hp=1;}
   g.data.battle.activityTrainer=true;g.data.battle.movementTrainer=true;
   if(phase==='intro')Object.assign(g.presentation(),{automatic:true,mode:'trainer-intro',duration:1800});
   if(phase==='pending-result')g.data.pendingBattle={at:now+700000,outcome:'defeat',fixture:'preserve'};
   const before=signature(g),battle=structuredClone(g.data.battle),pending=structuredClone(g.data.pendingBattle);delete battle.activityTrainer;delete battle.movementTrainer;
   g=new Type(structuredClone(g.data),now+600000);assert.deepEqual(g.data.battle,battle);assert.deepEqual(g.data.pendingBattle,pending);assert.equal(g.presentation().next,'kanto-resume');idle(g);assert.deepEqual(signature(g),before);assert.deepEqual(g.data.battle,battle);
   const scene=g.presentation();assert.ok(g.advanceScene(scene.id+':0',now+800000));assert.equal(g.presentation(),null);assert.deepEqual(g.data.battle,battle);assert.deepEqual(g.data.pendingBattle,pending);
  }
 });
}
test('headless lock and movement credit never tap a rival or manual story, including a repaired old encounter',()=>{
 for(const kind of ['rival','rocket','repaired','gift','victory']){
  let g=fixture(Android,kind==='rival'?'route-22':'mt-moon');if(kind!=='rival')ready(g);
  if(kind==='rival')assert.ok(g.routeRivalTick(now));
  else if(kind==='gift'){g.data.kantoWorld.location='route-15';assert.ok(g.challenge('k-device-visit',now));}
  else{assert.ok(g.challenge('k-npc-mtmoonb2f-2',now));if(kind==='repaired'){g.data.battle.activityTrainer=true;g.data.battle.movementTrainer=true;g.data.mobileStory.scene=null;g=new Android(structuredClone(g.data),now);}if(kind==='victory'){pages(g);g.sceneTick(now+503000);g.data.battle.foeIndex=g.battleBoss().team.length-1;g.data.battle.foe.hp=0;g.defeatOpponent(now+504000);}}
  const before=signature(g),scene=structuredClone(g.presentation()),p=new P(g);p.pause(now);assert.equal(p.catchUp({steps:40000,lockMillis:86400000},now+600000),0,kind);assert.deepEqual(signature(g),before,kind);assert.deepEqual(g.presentation(),scene,kind);assert.equal(p.lockConsumed,0);
 }
});
