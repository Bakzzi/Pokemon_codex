'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),P=require('../../mobile/web/progression.js');
globalThis.MobileCore={nursery:require('../daycare.cjs')};const now=Date.parse('2026-10-23T06:00:00Z');
function fixture(Type,id){const g=new Type({},now,{random:()=>.7});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.rivalProgress('rival-brock').state='won';g.data.badges=['brock','misty','surge'];g.data.kantoWorld.location=K.nodes.get(id).location;g.data.workTokens=250;g.data.switchUntil=0;g.nextTick=now;assert.ok(g.startAutomaticTrainer(id,now));return g;}
for(const Type of [PC,Android])for(const id of ['k-forest-1','k-route3-1','k-route11-1'])test(Type.name+' shows the actual '+id+' sprite before sendout, persists its timer and charges no visual actions',()=>{
 let g=fixture(Type,id);const n=K.nodes.get(id),intro=structuredClone(g.presentation()),party=structuredClone(g.data.battle.party);assert.equal(intro.mode,'trainer-intro');assert.ok(intro.automatic);assert.equal(intro.name,n.name);assert.equal(intro.sprite,n.sprite);assert.equal(g.data.workTokens,0);assert.equal(g.data.battle.turn,0);
 const original=K.original.trainers.find(t=>t.map===n.source.map&&t.event===n.source.event);assert.ok(original);assert.equal(intro.sprite,original.sprite);assert.deepEqual(intro.pages,[n.name+'의 도전!']);assert.ok(fs.existsSync(path.join(__dirname,'../assets/trainers/battle',intro.sprite+'.png')));
 assert.equal(g.advanceScene(intro.id+':0',now+500),false);assert.equal(g.sceneTick(now+1799),false);g=new Type(structuredClone(g.data),now+900);assert.equal(g.presentation().sprite,n.sprite);assert.deepEqual(g.presentation().pages,intro.pages);assert.equal(g.sceneTick(now+1800),true);
 const send=g.presentation();assert.equal(send.mode,'sendout');assert.ok(send.automatic);assert.equal(send.sprite,n.sprite);assert.notEqual(send.id,intro.id);assert.equal(g.sceneTick(now+4499),false);assert.equal(g.data.battle.turn,0);assert.equal(g.sceneTick(now+4500),true);assert.equal(g.presentation(),null);assert.deepEqual(g.data.battle.party,party);assert.equal(g.data.workTokens,0);assert.equal(g.data.battle.turn,0);
});
test('every automatic map/object trainer uses its pinned original class sprite and party',()=>{
 for(const n of K.nodes.values()){if(!n.automatic||!n.source)continue;const t=K.original.trainers.find(t=>t.map===n.source.map&&t.event===n.source.event);assert.ok(t,n.id);assert.equal(n.sprite,t.sprite,n.id);assert.deepEqual(n.team.map(p=>[p.id,p.level]),t.team.map(p=>[p.id,p.level]),n.id);assert.ok(fs.existsSync(path.join(__dirname,'../assets/trainers/battle',n.sprite+'.png')),n.id);}
});
test('foreground automatic trainer visuals finish without lock-time, steps or dialogue clicks',()=>{
 const g=fixture(Android,'k-route3-1'),p=new P(g);p.resume(now);p.observe({steps:0});p.dirty=false;assert.equal(p.live(now+1799),false);assert.ok(p.live(now+1800));assert.equal(g.presentation().mode,'sendout');p.dirty=false;assert.equal(p.live(now+4499),false);assert.ok(p.live(now+4500));assert.equal(g.presentation(),null);assert.equal(g.data.battle.turn,0);assert.equal(p.lockConsumed,0);assert.equal(g.data.mapTravel.bank,0);
});
test('headless catch-up finishes saved automatic visuals without another paid action or future events',()=>{
 const g=fixture(Android,'k-forest-1'),p=new P(g,{lockConsumed:20000});p.observe({steps:0});p.pause(now);assert.equal(p.catchUp({steps:0,lockMillis:20000},now+100,0),0);assert.equal(g.presentation(),null);assert.equal(g.data.battle.turn,0);assert.equal(p.lockConsumed,20000);assert.ok(p.dirty);assert.ok(g.data.journal.every(e=>e.at<=now+100));
 g.dialogue('trainer','그린','green',['직접 넘길 대사'],'sendout',now);const before=structuredClone(g.presentation());p.catchUp({steps:0,lockMillis:1000000},now+10000);assert.deepEqual(g.presentation(),before);assert.equal(p.lockConsumed,20000);
});
