'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Android:Adventure}=require('../../desktop/test/helpers/story-fixture.cjs'),{Game}=require('../../desktop/game.cjs'),{encounters}=require('../rivals.cjs');
const now=Date.parse('2026-10-17T10:00:00Z'),badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
const count=e=>typeof e.target==='number'?e.target:e.target==='silph-duo'?5:4;
function ready(e){const old=new Game({},now);old.data.badges=badges.slice(0,count(e));const g=new Adventure(old.data,now,{random:()=>.5});if(e.target==='silph-duo')g.data.mobileStory.silph.wins[0]=now;return g;}
function pages(g,t=now){const s=g.presentation();for(let i=0;i<8&&g.presentation()?.id===s?.id&&g.presentation()?.mode==='dialogue';i++){const p=g.presentation();assert.ok(g.advanceScene(p.id+':'+p.index,t));}}
function begin(g){pages(g);g.sceneTick(now+3000);g.data.switchUntil=0;g.nextTick=0;}
function won(g){const b=g.data.battle;b.foeIndex=g.battleBoss().team.length-1;b.foe.hp=0;g.defeatOpponent(now+10000);pages(g,now+11000);g.data.switchUntil=0;g.nextTick=0;}
// These fixtures intentionally exercise pre-map saves. Modern-only encounters
// have shared PC/Android coverage in desktop/test/bill-introduction.test.cjs.
for(const e of encounters.slice(1).filter(e=>!e.modernOnly)){
  test(e.id+': target looks open, click intercepts once, victory unlocks only that target',()=>{
    const g=ready(e);assert.equal(g.rivalProgress(e.id).state,'unseen');assert.equal(g.canChallenge(e.target),true);assert.equal(g.canChallenge(e.id),false);
    assert.ok(g.challenge(e.target,now));assert.equal(g.data.battle.storyId,e.id);assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.pendingChallenge,null);assert.equal(g.captureOpportunity(),null);
    begin(g);won(g);assert.equal(g.rivalProgress(e.id).state,'won');assert.equal(g.data.battle,null);assert.equal(g.data.pendingChallenge,null);assert.deepEqual(g.data.badges,badges.slice(0,count(e)));
    assert.equal(g.canChallenge(e.target),true);assert.equal(g.canChallenge(e.id),false);assert.ok(g.challenge(e.target,now+30000));assert.equal(g.data.battle.bossIndex,e.target);assert.equal(g.data.battle.storyId,typeof e.target==='string'?e.target:null);
  });
  test(e.id+': loss locks original target, enables only this retry, survives restart, victory restores challenge',()=>{
    let g=ready(e);g.challenge(e.target,now);begin(g);g.data.battle.party[g.data.activeId].hp=0;g.endChallenge(false,now+5000);
    assert.equal(g.rivalProgress(e.id).state,'active');assert.equal(g.canChallenge(e.id),false);pages(g,now+6000);
    assert.equal(g.rivalProgress(e.id).state,'retry');assert.equal(g.canChallenge(e.target),false);assert.equal(g.challenge(e.target,now+20000),false);assert.equal(g.canChallenge(e.id),true);
    const p=g.panelState(now+20000);assert.match(p.rivalLocks[e.target],/그린/);assert.equal(p.rivals.filter(r=>r.canRetry).length,1);
    g=new Adventure(structuredClone(g.data),now+21000);g.nextTick=0;g.data.switchUntil=0;assert.equal(g.canChallenge(e.target),false);assert.ok(g.challenge(e.id,now+22000));assert.equal(g.data.battle.storyId,e.id);
    begin(g);won(g);assert.equal(g.canChallenge(e.target),true);assert.equal(g.canChallenge(e.id),false);
  });
  test(e.id+': abandon never bypasses the rival gate or awards a victory',()=>{
    const g=ready(e);g.challenge(e.target,now);begin(g);const xp=g.data.owned[g.data.activeId].xp;
    assert.ok(g.abandon(now+5000));pages(g,now+6000);assert.equal(g.rivalProgress(e.id).state,'retry');assert.equal(g.data.owned[g.data.activeId].xp,xp);assert.equal(g.canChallenge(e.target),false);
  });
  test(e.id+': pending wild encounter finishes before the requested rival starts',()=>{
    const g=ready(e);g.newWild(now);const wild=g.data.battle;assert.ok(g.challenge(e.target,now+1000));assert.equal(g.data.battle,wild);assert.equal(g.presentation(),null);assert.equal(g.data.pendingChallenge.index,e.target);
    g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=0;assert.ok(g.tick(now+20000));assert.equal(g.data.battle.storyId,e.id);assert.equal(g.data.pendingChallenge,null);
  });
  test(e.id+': the real turn engine plays through the whole opponent party without a badge reward',()=>{
    const g=ready(e),uid=g.addPokemon(150,100,'fixture',now);g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;g.challenge(e.target,now);begin(g);
    let clock=now+30000,actions=0;
    for(;actions<500&&!g.data.battle.rivalResolution;actions++){g.tick(clock);clock+=30000;}
    assert.ok(actions<500);assert.equal(g.data.battle.rivalResolution.won,true);assert.equal(g.data.battle.foeIndex,e.team.length-1);pages(g,clock);
    assert.equal(g.rivalProgress(e.id).state,'won');assert.equal(g.data.battles,e.team.length);assert.deepEqual(g.data.badges,badges.slice(0,count(e)));
  });
}
test('retry queued during a wild battle is restored after save/reload, with a valid challenge name',()=>{
  const e=encounters[1];let g=ready(e);g.rivalProgress(e.id).state='retry';g.newWild(now);assert.ok(g.challenge(e.id,now+1000));assert.equal(g.panelState(now+1000).pendingChallenge.name,'그린 재도전');
  g=new Adventure(structuredClone(g.data),now+2000);assert.equal(g.data.pendingChallenge.index,e.id);g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=0;
  assert.ok(g.tick(now+3000));assert.equal(g.data.battle.storyId,e.id);
});
test('active rival result is saved and resolved exactly once after restarting on the victory page',()=>{
  const e=encounters[1];let g=ready(e);g.challenge(e.target,now);begin(g);g.data.battle.foeIndex=g.battleBoss().team.length-1;g.data.battle.foe.hp=0;g.defeatOpponent(now+5000);
  const before=g.data.owned[g.data.activeId].xp,scene=structuredClone(g.presentation());g=new Adventure(structuredClone(g.data),now+6000);assert.deepEqual(g.presentation(),scene);pages(g,now+7000);
  assert.equal(g.rivalProgress(e.id).state,'won');assert.equal(g.data.owned[g.data.activeId].xp,before);assert.equal(g.advanceScene(scene.id+':'+scene.index,now+8000),false);
});
test('badges and an active league are preserved without inventing rival victories',()=>{
  for(const e of encounters.slice(1)){
    const old=new Game({},now);old.data.badges=badges.slice(0,Math.min(8,count(e)+1));if(e.target===8)old.data.leagueBest=1;
    const g=new Adventure(old.data,now);assert.equal(g.rivalProgress(e.id).state,'unseen');assert.equal(g.presentation(),null);
  }
  const old=new Game({},now);old.data.badges=[...badges];old.challenge(8,now);const g=new Adventure(old.data,now);assert.equal(g.data.battle.bossIndex,8);assert.equal(g.rivalProgress('rival-league').state,'unseen');
});
test('unseen rivals disclose no party or schedule, and monthly resets clear only seasonal gates',()=>{
  const g=ready(encounters[1]);const rows=g.rivalState();assert.ok(rows.slice(1).every(r=>!r.met&&r.team.length===0&&r.name==='???'&&!('target' in r)));
  g.rivalProgress('rival-surge').state='retry';g.rivalProgress('rival-middle').state='won';g.resetSeason(Date.parse('2026-11-01T02:00:00Z'));
  assert.equal(g.rivalProgress('tutorial-green').state,'completed');assert.ok(g.rivalState().slice(1).every(r=>r.state==='unseen'));assert.equal(g.data.pendingChallenge,null);
});
test('Erika victory alone does not bypass the existing road prerequisite for Koga',()=>{
  const old=new Game({},now);old.data.badges=badges.slice(0,4);const g=new Adventure(old.data,now);
  assert.equal(g.canChallenge(4),false);assert.equal(g.challenge(4,now),false);assert.equal(g.presentation(),null);
});
