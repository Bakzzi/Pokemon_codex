'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,W=require('../../shared/kanto-world.cjs'),K=require('../../shared/kanto-journey.cjs');
const now=Date.parse('2026-10-25T06:00:00Z');
function fixture(Type,late=false){const g=new Type({},now,{random:()=>.6});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.kantoStory.mapAt=now;g.data.kantoStory.dexAt=now;g.data.switchUntil=0;g.nextTick=now;if(late){g.data.badges=[...K.badges];g.rivalProgress('rival-brock').state='won';}return g;}
const row=(g,id)=>g.panelState(now).rivals.find(r=>r.id===id);
const hidden=(g,id)=>{const r=row(g,id);assert.equal(r.met,false);assert.equal(r.sprite,null);assert.equal(r.name,'???');assert.deepEqual(r.team,[]);assert.equal(r.levelsKnown,false);};
for(const [platform,Type]of [['PC',PC],['Android',Android]])for(const late of [false,true]){
 const id=late?'rival-league':'rival-brock',destination=late?'route-23':'pewter',checkpoint=late?'route-23':'forest';
 test(platform+' '+id+': checkpoints and destination hints never announce an unseen rival, including existing blocked saves',()=>{
  let g=fixture(Type,late);Object.assign(g.data.kantoWorld,{location:late?'route-22':'route-2',position:late?{x:28,y:84}:{x:44,y:76},blocked:{location:destination,checkpoint,position:W.snapshot(g).map.points[destination]}});
  for(let i=0;i<2;i++){
   const c=W.checkpoint(g);assert.ok(c);assert.equal(c.sprite,'overworld:gate-guard');assert.equal(c.canPass,false);assert.doesNotMatch(c.name+' '+c.pages.join(' '),/그린|라이벌|길목의 트레이너/);assert.match(c.pages.join(' '),/22번도로/);
   assert.doesNotMatch(W.snapshot(g).places.find(p=>p.id===destination).reason,/그린|라이벌/);hidden(g,id);assert.equal(g.rivalProgress(id).state,'unseen');g=new Type(structuredClone(g.data),now+1);
  }
 });
 test(platform+' '+id+': arriving and queuing preserves secrecy; actual battle entry reveals the opponent',()=>{
  const g=fixture(Type,late);Object.assign(g.data.kantoWorld,{location:'route-22',position:{...W.snapshot(g).map.points['route-22']}});assert.ok(g.canChallenge(id));hidden(g,id);
  g.animate('result',{text:'fixture'},now);assert.ok(g.challenge(id,now));hidden(g,id);assert.equal(g.panelState(now).pendingChallenge.name,'길을 따라가기');assert.doesNotMatch(g.data.journal.at(-1).text,/그린|라이벌/);
  assert.ok(g.cancelChallenge(now));hidden(g,id);assert.doesNotMatch(g.data.journal.at(-1).text,/그린|라이벌/);
  g.nextTick=now;g.data.switchUntil=0;assert.ok(g.challenge(id,now));assert.equal(g.data.battle.storyId,id);assert.equal(g.presentation().name,'그린');assert.equal(row(g,id).met,true);assert.ok(row(g,id).sprite.startsWith('green'));assert.ok(row(g,id).team.length);assert.ok(row(g,id).levelsKnown);
 });
 test(platform+' '+id+': encountered rivals remain visible for retries, while a later unseen encounter stays hidden',()=>{
  let g=fixture(Type,late);g.data.kantoWorld.location='route-22';assert.ok(g.challenge(id,now));g.resolveRival(false,now+1);while(g.presentation()){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+2);}
  g=new Type(structuredClone(g.data),now+3);assert.equal(row(g,id).state,'retry');assert.equal(row(g,id).met,true);assert.ok(row(g,id).team.length);assert.equal(row(g,id).name,'그린');assert.equal(g.challengeName(id),'그린 재도전');if(!late)hidden(g,'rival-league');
 });
}
