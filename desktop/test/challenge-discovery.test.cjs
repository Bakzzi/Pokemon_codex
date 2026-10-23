'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{PC}=require('./helpers/story-fixture.cjs'),{Android}=require('./helpers/story-fixture.cjs');
const {data}=require('../pokemon.cjs'),J=require('../../shared/johto.cjs');
const now=Date.parse('2026-10-19T12:30:00Z'),badges=data.bosses.slice(0,8).map(b=>b.id);
function ready(Type=PC){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.73});if(g.data.mobileStory){g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;for(const r of Object.values(g.data.mobileStory.rivals))r.state='won';}idle(g);return g;}
function idle(g){g.data.battle=null;g.data.pendingBattle=null;g.data.animation=null;g.data.switchUntil=0;g.nextTick=now;if(g.data.mobileStory)g.data.mobileStory.scene=null;}
function pages(g){let limit=30;while(g.presentation()?.mode==='dialogue'&&limit--){const s=g.presentation();g.advanceScene(s.id+':'+s.index,now);}assert.ok(limit>0);}
function regional(Type){const g=ready(Type);g.data.badges=[...badges];g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));idle(g);return g;}

test('available lineups keep their species but conceal levels before actual entry on both platforms',()=>{
 for(const Type of [PC,Android]){const g=ready(Type);g.data.badges=badges.slice(0,3);const p=g.panelState(now);
  assert.ok(p.bosses.slice(3,7).every(b=>b.revealed&&b.team.length&&!b.levelsKnown));
  assert.ok(p.bosses.slice(8,12).every(b=>b.revealed&&b.team.length&&!b.levelsKnown));
  assert.ok(!p.trainingDevice.steps[0].levelsKnown);assert.ok(!p.trainingDevice.steps.at(-1).levelsKnown);
  assert.deepEqual(p.bosses[3].team,data.bosses[3].team);assert.ok(!p.bosses[12].revealed);
 }
});
test('queueing, cancellation and intercepted gym challenges do not reveal the requested opponent',()=>{
 for(const Type of [PC,Android]){let g=ready(Type);g.newWild(now);assert.ok(g.challenge(0,now));assert.ok(!g.panelState(now).bosses[0].levelsKnown);
  g=new Type(g.data,now+1);assert.ok(!g.panelState(now).bosses[0].levelsKnown);assert.ok(g.cancelChallenge(now));idle(g);
  g.data.mobileStory.rivals['rival-brock'].state='unseen';assert.ok(g.challenge(0,now));assert.equal(g.data.battle.storyId,'rival-brock');
  assert.ok(g.rivalState().find(r=>r.id==='rival-brock').levelsKnown);assert.ok(!g.panelState(now).bosses[0].levelsKnown);
 }
});
test('a started gym reveals all its levels, preserves actual combat levels and stays known after loss and reload',()=>{
 for(const Type of [PC,Android]){let g=ready(Type);assert.ok(g.challenge(0,now));assert.ok(g.panelState(now).bosses[0].levelsKnown);
  assert.equal(g.snapshot(now).foe.level,data.bosses[0].team[0].level);pages(g);g.data.mobileStory.scene=null;g.endChallenge(false,now);pages(g);
  g.data.journal=[];g=new Type(g.data,now+1);assert.ok(g.panelState(now).bosses[0].levelsKnown);assert.ok(!g.panelState(now).bosses[1].levelsKnown);assert.equal(g.data.badges.length,0);
 }
});
test('league entry reveals only the opponent actually reached, not all five trainers',()=>{
 for(const Type of [PC,Android]){const g=ready(Type);g.data.badges=[...badges];assert.ok(g.challenge(8,now));
  assert.deepEqual(g.panelState(now).bosses.slice(8).map(b=>b.levelsKnown),[true,false,false,false,false]);
  g.data.battle.bossIndex=9;g.data.battle.foeIndex=0;g.nextTrainer(now);
  assert.deepEqual(g.panelState(now).bosses.slice(8).map(b=>b.levelsKnown),[true,true,false,false,false]);
 }
});
test('story opponents and scripted wild encounters reveal only after starting their own battle',()=>{
 for(const Type of [PC,Android]){let g=ready(Type);g.data.badges=badges.slice(0,3);assert.ok(g.challenge('rocket-grunt',now));
  assert.ok(g.panelState(now).trainingDevice.steps[0].levelsKnown);assert.ok(!g.panelState(now).trainingDevice.steps[1].levelsKnown);
  idle(g);g.data.badges=badges.slice(0,4);assert.ok(g.challenge('tower-grunt-1',now));assert.ok(g.panelState(now).rescue.steps[0].levelsKnown);assert.ok(!g.panelState(now).rescue.steps[1].levelsKnown);
  idle(g);g.data.badges=badges.slice(0,5);assert.ok(g.challenge('silph-grunt',now));assert.ok(g.panelState(now).silph.steps[0].levelsKnown);assert.ok(!g.panelState(now).silph.steps[1].levelsKnown);
  idle(g);g.data.trainingDevice.fluteObtainedAt=now;assert.ok(g.challenge('road-snorlax',now));assert.ok(g.panelState(now).trainingDevice.steps.at(-1).levelsKnown);
  g.data.journal=[];g=new Type(g.data,now+1);assert.ok(g.panelState(now).trainingDevice.steps.at(-1).levelsKnown);
 }
});
test('regional gyms, revisits, league and story encounters share independent discovery records',()=>{
 for(const Type of [PC,Android]){let g=regional(Type),p=g.panelState(now).johto;
  assert.ok(p.gyms.every(b=>!b.levelsKnown));assert.ok(p.league.every(b=>!b.levelsKnown));assert.ok(p.cards.flatMap(c=>c.steps).filter(r=>r.team.length).every(r=>!r.levelsKnown));
  assert.ok(g.challenge('j-sprout-sage-1',now));assert.ok(g.panelState(now).johto.cards.find(c=>c.id==='j-early').steps[0].levelsKnown);idle(g);
  for(const n of J.nodes.values())if(!['league','league-start'].includes(n.type))g.data.johto.cleared[n.id]=now;
  for(const n of [...J.gyms,...J.revisits])delete g.data.johto.cleared[n.id];
  assert.ok(g.challenge('j-falkner',now));assert.ok(g.panelState(now).johto.gyms[0].levelsKnown);idle(g);
  for(const n of J.gyms)g.data.johto.cleared[n.id]=now;assert.ok(g.challenge('j-league',now));
  assert.deepEqual(g.panelState(now).johto.league.map(n=>n.levelsKnown),[true,false,false,false,false]);idle(g);
  assert.ok(g.challenge('j-k-surge',now));assert.ok(g.panelState(now).johto.kantoGyms[0].levelsKnown);assert.ok(!g.panelState(now).johto.kantoGyms[1].levelsKnown);
  g.data.journal=[];g=new Type(g.data,now+1);assert.ok(g.panelState(now).johto.kantoGyms[0].levelsKnown);
 }
});
test('legacy completed, active and exact failed encounters migrate without treating reservations as meetings',()=>{
 let g=ready(Game);g.data.badges=['brock'];g.data.leagueBest=2;delete g.data.challengeSeen;
 g.data.journal=[{kind:'challenge',text:data.bosses[2].name+' 체육관 도전 예약',at:now},{kind:'loss',text:data.bosses[1].name+'에게 패배 · 포켓몬들이 회복했다',at:now}];
 g=new Game(g.data,now+1);assert.deepEqual(g.panelState(now).bosses.slice(0,3).map(b=>b.levelsKnown),[true,true,false]);assert.deepEqual(g.panelState(now).bosses.slice(8,11).map(b=>b.levelsKnown),[true,true,false]);
 g=ready(Game);g.newWild(now);delete g.data.challengeSeen;g=new Game(g.data,now+1);assert.deepEqual(g.data.challengeSeen,{});
 idle(g);assert.ok(g.challenge(0,now));delete g.data.challengeSeen;g.data.journal=[];g=new Game(g.data,now+1);assert.ok(g.panelState(now).bosses[0].levelsKnown);
});
test('monthly resets clear level discovery while regional travel preserves earlier records',()=>{
 for(const Type of [PC,Android]){const g=ready(Type);assert.ok(g.challenge(0,now));idle(g);g.data.champion=true;g.data.badges=[...badges];assert.ok(g.unlockJohto(now,[25]));assert.ok(g.challengeLevelsKnown('brock'));
  g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.deepEqual(g.data.challengeSeen,{});assert.ok(g.panelState().bosses.every(b=>!b.levelsKnown));
 }
});
