'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Game}=require('../../desktop/game.cjs');
const now=Date.parse('2026-10-18T05:00:00Z'),badges=['brock','misty','surge','erika','koga'];
function ready(n=0){const old=new Game({},now);old.data.badges=badges.slice(0,n);return new Adventure(old.data,now);}
function settle(g){g.nextTick=0;g.data.switchUntil=0;}
function pages(g){const id=g.presentation()?.id;while(g.presentation()?.mode==='dialogue'&&g.presentation().id===id){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now);}}
function finalWin(g){const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(now+5000);}

test('unknown event cards stay undiscovered while gyms and league remain available as goals',()=>{
  for(const n of [0,1,2]){const s=ready(n).panelState(now);assert.deepEqual(s.discovery,{rocket:false,road:false});assert.equal(s.rescue.visible,false);assert.equal(s.silph.visible,false);assert.equal(s.bosses.length,13);}
});
test('a trainer result must finish telling the player before its new events appear',()=>{
  for(const [n,index,key] of [[2,2,'rocket'],[3,3,'rescue'],[4,4,'silph']]){
    const g=ready(n);g.rivalProgress('rival-surge').state='won';g.data.trainingDevice.rocketWonAt=now;g.data.trainingDevice.snorlaxWonAt=now;settle(g);
    // Remove unrelated road/rocket completion for the earliest scene.
    if(n===2){g.data.trainingDevice.rocketWonAt=null;g.data.trainingDevice.snorlaxWonAt=null;}
    assert.ok(g.challenge(index,now));pages(g);g.sceneTick(now+3000);settle(g);finalWin(g);
    const known=()=>key==='rocket'?g.panelState(now).discovery.rocket:g.panelState(now)[key].visible;
    assert.equal(known(),false);assert.ok(g.presentation().pages.length>1);pages(g);assert.equal(known(),true);
  }
});
test('rumors reveal neither the captive nor the company culprit until the player investigates',()=>{
  const g=ready(4),s=g.panelState(now);assert.equal(s.rescue.visible,true);assert.equal(s.rescue.title,'보라타운의 소문');assert.equal(s.rescue.sprite,null);assert.ok(!/구출|붙잡|피리/.test(s.rescue.description));assert.equal(s.silph.visible,false);
  g.data.badges.push('koga');const company=g.panelState(now).silph;assert.equal(company.visible,true);assert.equal(company.investigated,false);assert.equal(company.sprite,null);assert.ok(!/로켓단|비주기/.test(company.description));
});
test('the surprise rival does not prematurely reveal what happened in Lavender',()=>{
  const g=ready(4);assert.ok(g.challenge('tower-grunt-1',now));assert.equal(g.data.battle.storyId,'rival-middle');assert.equal(g.panelState(now).rescue.investigated,false);assert.equal(g.panelState(now).rescue.title,'보라타운의 소문');
});
test('investigations remain known after a loss and saved-game reload',()=>{
  for(const [n,id,key] of [[4,'tower-grunt-1','rescue'],[5,'silph-grunt','silph']]){
    const g=ready(n);g.rivalProgress('rival-middle').state='won';assert.ok(g.challenge(id,now));assert.equal(g.panelState(now)[key].investigated,true);pages(g);g.sceneTick(now+3000);settle(g);g.endChallenge(false,now+5000);pages(g);
    const loaded=new Adventure(structuredClone(g.data),now+6000);assert.equal(loaded.panelState(now)[key].investigated,true);assert.ok(loaded.panelState(now)[key].sprite);assert.ok(loaded.canChallenge(id));
  }
});
test('upgrades infer discoveries from existing wins and active encounters without changing progress',()=>{
  for(const [n,id,key] of [[4,'tower-grunt-1','rescue'],[5,'silph-grunt','silph']]){
    const g=ready(n);g.rivalProgress('rival-middle').state='won';g.challenge(id,now);delete g.data.mobileStory[key].investigatedAt;
    const before=structuredClone(g.data.battle),loaded=new Adventure(structuredClone(g.data),now+1000);assert.deepEqual(loaded.data.battle,before);assert.equal(loaded.panelState(now)[key].investigated,true);
    loaded.data.battle=null;delete loaded.data.mobileStory[key].investigatedAt;loaded.data.mobileStory[key].wins[0]=now;assert.equal(loaded.panelState(now)[key].investigated,true);
  }
});
test('season reset hides old events again while keeping lifetime collection',()=>{
  const g=ready(5);g.data.mobileStory.rescue.investigatedAt=now;g.data.mobileStory.silph.investigatedAt=now;const count=g.kantoCaughtCount();g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));
  const s=g.panelState();assert.deepEqual(s.discovery,{rocket:false,road:false});assert.equal(s.rescue.visible,false);assert.equal(s.silph.visible,false);assert.equal(g.kantoCaughtCount(),count);
});
