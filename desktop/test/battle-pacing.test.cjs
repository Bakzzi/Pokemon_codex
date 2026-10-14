'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{combatant}=require('../battle.cjs'),{xpAt}=require('../pokemon.cjs');
const pacing=require('../battle-pacing.js'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-13T10:00:00Z');
function fixture(id=143,caught=true){
  const g=new Game({},now,{random:()=>0});g.data.owned[25].moves=[84];g.newWild(now-pacing.pauses.encounter);
  g.data.battle.foe=combatant(id,5,[150]);if(caught)g.data.caught[id]=now;
  g.data.workTokens=10000;return g;
}
function advance(g){const at=Math.max(g.nextTick,g.data.switchUntil);assert.ok(g.tick(at));return at;}

test('a hit precedes gradual HP loss and leaves time to read the result',()=>{
  const e={at:now,moveId:53,foeBefore:{hp:1,currentHp:100,maxHp:100}},after={hp:.4,currentHp:40,maxHp:100};
  const t=pacing.actionTiming(e);assert.ok(t.announceMs>=500);assert.ok(t.healthAt>t.impactAt);
  assert.equal(pacing.healthAt(e,'foe',now+t.impactAt,after).currentHp,100);
  assert.equal(pacing.healthAt(e,'foe',now+t.healthAt+t.healthMs/2,after).currentHp,70);
  assert.deepEqual(pacing.healthAt(e,'foe',now+t.resultAt,after),after);
  assert.ok(t.duration-t.resultAt>=1200);assert.ok(t.duration>=3000&&t.duration<=4000);
});

test('native status effects reach the HUD only after the move impact and survive capture',()=>{
  const g=fixture(19,false);g.data.owned[25].moves=[86];g.data.battle.party[25]=g.memberCombatant(g.data.owned[25]);
  assert.ok(g.tick(now));const event=g.data.animation,t=pacing.actionTiming(event);
  assert.equal(event.actor,'hero');assert.equal(event.moveId,86);assert.equal(event.foeBefore.status,null);assert.equal(event.foe.status,'paralysis');
  assert.equal(pacing.healthAt(event,'foe',now+t.impactAt-1,event.foe).status,null);
  assert.equal(pacing.healthAt(event,'foe',now+t.impactAt,event.foe).status,'paralysis');
  g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;g.capture(g.data.switchUntil);
  assert.equal(g.data.captureAnimation.status,'paralysis');
});

test('native healing clears the status badge at impact, with the previous status kept during announcement',()=>{
  const g=fixture();g.data.owned[25].moves=[215];g.data.battle.party[25]=g.memberCombatant(g.data.owned[25]);g.data.battle.party[25].status='burn';
  assert.ok(g.tick(now));const event=g.data.animation,t=pacing.actionTiming(event);
  assert.equal(event.actor,'hero');assert.equal(event.moveId,215);assert.equal(event.heroBefore.status,'burn');assert.equal(event.hero.status,null);
  assert.equal(pacing.healthAt(event,'hero',now+t.impactAt-1,event.hero).status,'burn');
  assert.equal(pacing.healthAt(event,'hero',now+t.impactAt,event.hero).status,null);
});

test('a counterattack waits for the previous action even when more work arrives',()=>{
  const g=fixture();g.tick(now);const action=structuredClone(g.data.animation),end=g.data.switchUntil;
  assert.equal(action.actor,'hero');assert.equal(g.data.workTokens,9750);
  const token=(output,t)=>({type:'event_msg',timestamp:new Date(t).toISOString(),payload:{type:'token_count',info:{total_token_usage:{output_tokens:output,total_tokens:output}}}});
  g.observe('test',token(0,now),{baseline:true,now});g.observe('test',token(50000,now+50),{now:now+50});
  const queued=g.data.workTokens;assert.equal(g.tick(end-1),false);assert.equal(g.data.workTokens,queued);assert.deepEqual(g.data.animation,action);
  assert.equal(g.select(7,end-1),false);assert.ok(g.challenge(0,end-1));assert.equal(g.data.pendingChallenge.index,0);assert.deepEqual(g.data.animation,action);
  const loaded=new Game(g.data,now+100,{random:()=>0});assert.equal(loaded.tick(end-1),false);
  assert.ok(loaded.tick(end));assert.equal(loaded.data.animation.actor,'foe');assert.equal(loaded.data.workTokens,queued-250);
});

test('capture starts only after the triggering attack and its result, across a reload',()=>{
  let g=fixture(19,false);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.11;g.tick(now);assert.equal(g.data.pendingBattle.kind,'capture');
  assert.equal(g.snapshot(now).capture,null);assert.equal(g.data.battle.captureAttempts,0);assert.ok(!g.data.caught[19]);
  const end=g.data.switchUntil,tokens=g.data.workTokens;assert.equal(g.select(7,end),false);
  g=new Game(g.data,now+700,{random:()=>0});assert.equal(g.tick(end-1),false);assert.ok(g.tick(end));
  const c=g.data.captureAnimation,t=captureTiming(c);assert.equal(c.at,end);assert.equal(c.leadIn,null);assert.equal(c.at>=now+3000,true);
  assert.ok(c.caught);assert.equal(g.data.workTokens,tokens);assert.equal(g.tick(c.at+t.duration-1),false);
  assert.ok(t.duration-t.messageAt>=2800);assert.equal(g.snapshot(c.at+t.duration-1).capture.id,19);
  assert.ok(g.tick(c.at+t.duration));assert.equal(g.data.animation.kind,'encounter');assert.equal(g.data.captureAnimation,null);
  assert.equal(Object.values(g.data.owned).filter(p=>p.id===19).length,1);
});

test('a knockout preserves the victim until HP, fainting and the battle result finish',()=>{
  let g=fixture(19);g.data.battle.foe.hp=1;const xp=g.data.owned[25].xp;g.tick(now);
  assert.equal(g.data.animation.kind,'attack');assert.equal(g.data.battle.foe.hp,0);assert.equal(g.data.owned[25].xp,xp);
  const attackEnd=g.data.switchUntil;assert.equal(g.tick(attackEnd-1),false);
  g=new Game(g.data,now+800,{random:()=>0});assert.ok(g.tick(attackEnd));assert.equal(g.data.animation.kind,'faint');
  assert.deepEqual(g.data.animation.sides,['foe']);assert.equal(g.snapshot(attackEnd).foe.id,19);assert.equal(g.data.owned[25].xp,xp);
  const faintEnd=g.data.switchUntil;assert.equal(g.tick(faintEnd-1),false);g=new Game(g.data,faintEnd-500,{random:()=>0});
  assert.ok(g.tick(faintEnd));assert.equal(g.data.animation.kind,'result');assert.equal(g.data.battle,null);assert.ok(g.data.owned[25].xp>xp);
  const earned=g.data.owned[25].xp,resultEnd=g.data.switchUntil;assert.equal(g.tick(resultEnd-1),false);assert.ok(g.tick(resultEnd));
  assert.equal(g.data.animation.kind,'encounter');assert.equal(g.data.owned[25].xp,earned);
});

test('a gym leader sends the next Pokemon after the original target finishes fainting',()=>{
  const g=new Game({},now,{random:()=>0}),p=g.data.owned[1];p.level=100;p.xp=xpAt(1,100);p.moves=[202];g.data.activeId=1;
  assert.ok(g.challenge(0,now));advance(g);assert.equal(g.data.animation.kind,'attack');assert.equal(g.data.battle.foe.id,74);
  assert.equal(g.data.battle.foeIndex,0);assert.equal(g.data.battle.foe.hp,0);advance(g);assert.equal(g.data.animation.kind,'faint');
  assert.equal(g.data.battle.foe.id,74);advance(g);assert.equal(g.data.animation.kind,'encounter');assert.equal(g.data.battle.foe.id,95);
  assert.equal(g.data.battle.foeIndex,1);assert.equal(g.tick(g.data.switchUntil-1),false);assert.ok(!g.data.caught[74]);
});

test('leaving a challenge cancels its pending knockout without awarding a later badge',()=>{
  const g=new Game({},now,{random:()=>0}),p=g.data.owned[1];p.level=100;p.xp=xpAt(1,100);p.moves=[202];g.data.activeId=1;
  assert.ok(g.challenge(0,now));const at=advance(g);assert.ok(g.data.pendingBattle);const xp=p.xp;
  assert.ok(g.abandon(at+1));assert.equal(g.data.pendingBattle,null);assert.equal(g.data.battle,null);
  g.tick(g.data.switchUntil);assert.equal(p.xp,xp);assert.deepEqual(g.data.badges,[]);
});

test('one remaining HP still gets a visible hit before the HP reaches zero',()=>{
  const e={at:now,moveId:98,heroBefore:{currentHp:1,maxHp:20,hp:.05},hero:{currentHp:0,maxHp:20,hp:0}};
  const t=pacing.actionTiming(e);assert.equal(pacing.damageReaction(e,'hero',now+t.impactAt-1).active,false);
  assert.equal(pacing.damageReaction(e,'hero',now+t.impactAt+100).active,true);
  assert.ok(pacing.damageReaction(e,'hero',now+t.impactAt+100).opacity<1);
  assert.equal(pacing.healthAt(e,'hero',now+t.impactAt+100,e.hero).currentHp,1);
  assert.equal(pacing.healthAt(e,'hero',now+t.resultAt,e.hero).currentHp,0);
});

test('poison knockout identifies its cause and reacts even when no damaging move was used',()=>{
  const g=fixture();g.data.owned[25].moves=[45];g.data.battle.party[25].moves=[45];g.data.battle.party[25].pp={45:40};
  g.data.battle.party[25].hp=1;g.data.battle.party[25].status='poison';g.tick(now);advance(g);
  const a=g.data.animation;assert.equal(a.kind,'attack');assert.equal(a.hero.currentHp,0);assert.equal(a.damage,0);
  assert.ok(a.damageCauses.some(c=>c.side==='hero'&&c.cause==='독'));
  assert.equal(pacing.damageReaction(a,'hero',a.at+pacing.actionTiming(a).impactAt+100).active,true);
  assert.equal(g.data.pendingBattle.kind,'after-action');assert.equal(g.data.activeId,25);
});

test('switching recalls the original Pokemon completely before a second ball releases its replacement',()=>{
  const e={at:now,kind:'switch',from:25,to:7};
  const recall=pacing.switchFrame(e,now+350),absorb=pacing.switchFrame(e,now+950),held=pacing.switchFrame(e,now+1400);
  assert.equal(recall.phase,'recall-throw');assert.equal(recall.incoming,false);assert.equal(recall.opacity,1);assert.ok(recall.ballVisible);
  assert.equal(absorb.phase,'absorb');assert.ok(absorb.scale>0&&absorb.scale<1);
  assert.equal(held.opacity,0);assert.ok(held.ballVisible);
  assert.equal(pacing.switchFrame(e,now+1800).phase,'return-ball');assert.equal(pacing.switchFrame(e,now+2300).ballVisible,false);
  const send=pacing.switchFrame(e,now+2800),release=pacing.switchFrame(e,now+3700);
  assert.equal(send.phase,'send-throw');assert.equal(send.incoming,true);assert.equal(send.opacity,0);assert.ok(send.ballVisible);
  assert.equal(release.phase,'release');assert.ok(release.opacity>0&&release.opacity<1);assert.ok(release.glow>0);
  assert.equal(pacing.switchFrame(e,now+4600).done,true);
  let g=new Game({},now);assert.ok(g.select(7,now));g=new Game(g.data,now+1800);g.data.workTokens=250;
  assert.equal(g.tick(now+4599),false);assert.equal(g.data.workTokens,250);assert.ok(g.tick(now+4600));
});
