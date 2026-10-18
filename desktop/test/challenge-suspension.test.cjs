'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs');
const now=Date.parse('2026-10-18T06:00:00Z');
for(const [platform,Story] of [['desktop',require('../adventure.cjs').Adventure],['mobile',require('../../mobile/adventure.cjs').Adventure]]){
  function fixture(){const g=new Story(new Game({},now).data,now,{random:()=>.73});for(const r of Object.values(g.data.mobileStory.rivals))r.state='won';g.newWild(now-10000);g.data.battle.foe=battle.combatant(19,8,[33,39]);return g;}
  test(platform+': handoff waits for one animation, preserving exact native turn, HP, PP, status and slots across reload',()=>{
    let g=fixture(),wild=g.data.battle;wild.foe.hp-=3;wild.foe.status='paralysis';wild.foe.pp[33]=2;battle.engine(g,wild);
    g.animate('attack',{moveId:33,actor:'foe'},now);const saved=structuredClone(wild),slots=[...g.data.slots];
    assert.ok(g.challenge(0,now+1));assert.equal(g.controlTick(g.data.switchUntil-1),false);assert.equal(g.data.battle,wild);
    assert.ok(g.controlTick(g.data.switchUntil));assert.equal(g.data.battle.kind,'trainer');assert.equal(g.data.suspendedWild,wild);
    const pausedActive=wild.suspension.activeId;delete wild.suspension;assert.deepEqual(wild,saved);wild.suspension={activeId:pausedActive,manualSelection:false,pendingBattle:null};
    g=new Story(structuredClone(g.data),now+10000);g.data.mobileStory.scene=null;g.endChallenge(true,now+10000);
    assert.equal(g.data.battle.foe.hp,saved.foe.hp);assert.deepEqual(g.data.battle.foe.pp,saved.foe.pp);assert.equal(g.data.battle.foe.status,'paralysis');assert.deepEqual(g.data.battle.sim,saved.sim);
    assert.equal(g.data.activeId,pausedActive);assert.deepEqual(g.data.slots,slots);assert.equal(g.data.suspendedWild,null);
  });
  test(platform+': a future ball stays pending until after the challenge; a failed throw does not repeat',()=>{
    const g=fixture(),wild=g.data.battle;wild.foe.hp=1;g.data.pendingBattle={kind:'capture',at:now};
    assert.ok(g.challenge(0,now));assert.ok(g.controlTick(now));assert.equal(wild.captureAttempts,0);
    g.data.mobileStory.scene=null;g.endChallenge(true,now+10000);assert.equal(g.data.pendingBattle.kind,'capture');assert.equal(g.data.battle,wild);
    g.data.switchUntil=now+20000;g.nextTick=now+20000;g.random=()=>.999;
    assert.ok(g.tick(now+20000));assert.equal(wild.captureAttempts,1);assert.equal(g.data.captureAnimation.caught,false);
    assert.ok(g.challenge(0,now+20001));const end=g.data.switchUntil;
    assert.equal(g.controlTick(end-1),false);assert.ok(g.controlTick(end));assert.equal(g.data.suspendedWild,wild);assert.equal(wild.captureAttempts,1);
  });
  test(platform+': defeat dialogue restores the saved wild battle once after the player dismisses it',()=>{
    const g=fixture(),wild=g.data.battle;assert.ok(g.challenge(0,now));assert.ok(g.controlTick(now));g.endChallenge(false,now+10000);
    assert.equal(g.data.battle.kind,'trainer');const id=g.presentation().id;
    while(g.presentation()?.id===id){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now+10000);}
    assert.equal(g.data.battle,wild);assert.equal(g.data.suspendedWild,null);assert.equal(g.advanceScene(id+':0',now+10001),false);
  });
  test(platform+': rival and story victories return to the same paused wild battle',()=>{
    for(const kind of ['rival','story']){
      const g=fixture(),wild=g.data.battle;g.data.badges=['brock','misty','surge','erika'];
      if(kind==='story')g.data.mobileStory.rivals['rival-middle'].state='won';
      const target=kind==='rival'?2:'tower-grunt-1';
      // The rival gate targets an otherwise eligible next gym.
      if(kind==='rival'){g.data.badges=['brock','misty'];g.data.mobileStory.rivals['rival-surge'].state='unseen';}
      assert.ok(g.challenge(target,now));assert.ok(g.controlTick(now));
      const b=g.data.battle;b.foeIndex=g.battleBoss(b).team.length-1;
      if(kind==='rival'){g.resolveRival(true,now+10000);g.completeRival(true,now+11000);}else g.finishTrainerWin(now+10000);
      assert.equal(g.data.battle,wild);assert.equal(g.data.suspendedWild,null);
    }
  });
  test(platform+': an event wild capture or loss also restores the original wild opponent',()=>{
    for(const won of [true,false]){
      const g=fixture(),wild=g.data.battle;g.data.trainingDevice.fluteObtainedAt=now;g.data.badges=['brock','misty','surge','erika'];
      assert.ok(g.challenge('road-snorlax',now));assert.ok(g.controlTick(now));assert.equal(g.data.battle.storyId,'road-snorlax');
      if(won){g.data.captureAnimation={caught:true,id:143};g.defeatOpponent(now+10000,true);}else g.endChallenge(false,now+10000);
      assert.equal(g.data.battle,wild);assert.equal(g.data.suspendedWild,null);assert.equal(g.data.captureAnimation,null);
    }
  });
}
