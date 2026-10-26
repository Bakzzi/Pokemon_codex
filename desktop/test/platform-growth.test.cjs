'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Adventure:PC}=require('../adventure.cjs'),{Adventure:Android}=require('../../mobile/adventure.cjs');
const {Game}=require('../game.cjs'),{combatant}=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const now=Date.parse('2026-10-26T06:00:00Z');
function fixture(Type){
  const g=new Type(new Game({},now).data,now,{random:()=>0});
  g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;
  const uid=g.addPokemon(133,5,'fixture',now);
  g.data.trainingDevice.obtainedAt=now;g.data.trainingDevice.learnerUid=uid;
  g.data.caught=Object.fromEntries(Array.from({length:100},(_,i)=>[i+1,now]));
  return {g,uid};
}
for(const [label,Type,wild,trainer] of [['PC',PC,162,243],['Android',Android,108,162]]){
  test(label+': reduced wild/trainer rewards retain the dex booster and only share 10% with the learner',()=>{
    for(const [isTrainer,expected] of [[false,wild],[true,trainer]]){
      const {g,uid}=fixture(Type),before=structuredClone(g.data.owned);
      // Rattata Lv.20 originally awards 162 wild / 243 trainer, then +100% dex.
      assert.equal(g.awardXp({id:19,level:20},isTrainer,now),expected);
      assert.equal(g.data.owned[25].xp-before[25].xp,expected);
      assert.equal(g.data.owned[uid].xp-before[uid].xp,Math.floor(expected/10));
      assert.equal(g.experienceBoost().percent,100);
      assert.equal(g.data.adventure.totals.xp,expected+Math.floor(expected/10));
      const restored=new Type(structuredClone(g.data),now+1);
      assert.deepEqual(restored.data.owned,g.data.owned);
      assert.equal(restored.awardXp({id:19,level:20},isTrainer,now+2),expected);
    }
  });
  test(label+': actual wild victory and deferred capture each award reduced XP exactly once',()=>{
    for(const capture of [false,true]){
      let {g,uid}=fixture(Type);g.data.kantoWorld.location='route-1';g.data.switchUntil=0;
      g.newWild(now);assert.ok(g.data.battle);g.data.battle.foe=combatant(19,20,[150]);g.data.battle.foe.hp=1;
      // A caught species can be explicitly requested again without increasing the booster.
      assert.ok(g.reserveCapture(19,1,now));const before=structuredClone(g.data.owned);
      if(capture){
        assert.ok(g.capture(now));const end=g.data.switchUntil;
        assert.deepEqual(g.data.owned,before);
        g=new Type(structuredClone(g.data),end-1,{random:()=>0});
        assert.equal(g.tick(end-1),false);assert.deepEqual(g.data.owned,before);assert.ok(g.tick(end));
      }else g.defeatOpponent(now);
      assert.equal(g.data.owned[25].xp-before[25].xp,wild);
      assert.equal(g.data.owned[uid].xp-before[uid].xp,Math.floor(wild/10));
      const saved=structuredClone(g.data);g=new Type(saved,g.data.switchUntil+1);
      assert.deepEqual(g.data.owned,saved.owned);assert.equal(g.data.adventure.totals.xp,wild+Math.floor(wild/10));
    }
  });
  test(label+': loading old XP and the level-100 cap never creates retroactive changes',()=>{
    const {g}=fixture(Type),p=g.data.owned[25];p.level=77;p.xp=xpAt(25,77)+1234;require('../move-access.cjs').update(p);
    const old=structuredClone(g.data.owned),loaded=new Type(g.data,now+1);
    assert.deepEqual(loaded.data.owned,old);assert.equal(loaded.data.adventure.totals.xp,0);
    const hero=loaded.data.owned[25];hero.level=99;hero.xp=xpAt(25,100)-1;
    loaded.awardXp({id:19,level:20},false,now+2);
    assert.equal(hero.level,100);assert.equal(hero.xp,xpAt(25,100));
  });
}
