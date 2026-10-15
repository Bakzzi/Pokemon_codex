'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('./helpers/four-party.cjs'),{data}=require('../pokemon.cjs');
const now=Date.parse('2026-10-14T15:00:00Z'),fixture=()=>new Game({},now,{random:()=>.73});
function hidden(g,index){const boss=g.panelState(now).bosses[index];assert.equal(boss.name,'???');assert.equal(boss.revealed,false);assert.deepEqual(boss.team,[]);}
function known(g,index){const boss=g.panelState(now).bosses[index];assert.equal(boss.name,data.bosses[index].name);assert.equal(boss.revealed,true);assert.deepEqual(boss.team,data.bosses[index].team);}

test('the last gym is revealed immediately after the seventh badge, including reservations and reloads before meeting',()=>{
  let g=fixture();hidden(g,7);hidden(g,12);
  g.data.badges=data.bosses.slice(0,6).map(b=>b.id);hidden(g,7);assert.equal(g.canChallenge(7),false);
  g.data.badges.push('blaine');known(g,7);assert.ok(!g.data.trainerSeen.giovanni);g.newWild(now);assert.ok(g.canChallenge(7));
  assert.ok(g.challenge(7,now));known(g,7);assert.equal(g.snapshot(now).pendingChallenge.name,'비주기 체육관');assert.ok(g.data.journal.at(-1).text.startsWith('비주기 체육관'));
  assert.ok(g.cancelChallenge(now));known(g,7);assert.ok(g.challenge(7,now));
  g=new Game(g.data,now+1);known(g,7);g.defeatOpponent(g.data.switchUntil);
  assert.ok(g.tick(Math.max(g.data.switchUntil,g.nextTick)));assert.equal(g.data.battle.bossIndex,7);known(g,7);hidden(g,12);
  assert.equal(g.data.battle.foe.id,data.bosses[7].team[0].id);assert.ok(g.data.trainerSeen.giovanni);
  assert.ok(g.abandon(g.data.switchUntil));g.data.journal=[];g=new Game(g.data,now+2);known(g,7);
  assert.equal(g.data.badges.length,7);assert.equal(g.data.champion,false);assert.equal(data.bosses[7].name,'비주기');
});

test('the champion is not revealed by badges or a league reservation, but is revealed after the four Elite Four matches and remains known after a loss',()=>{
  const preview=fixture();preview.data.badges=data.bosses.slice(0,8).map(b=>b.id);preview.data.leagueBest=3;hidden(preview,12);preview.data.leagueBest=4;known(preview,12);assert.ok(!preview.data.trainerSeen.champion);
  let g=fixture();g.data.badges=data.bosses.slice(0,8).map(b=>b.id);known(g,7);hidden(g,12);
  assert.ok(g.challenge(8,now));hidden(g,12);
  let turns=0;
  while(g.data.battle.bossIndex<12){hidden(g,12);g.defeatOpponent(g.data.switchUntil);assert.ok(++turns<30);}
  known(g,12);assert.equal(g.data.leagueBest,4);assert.equal(g.data.champion,false);
  assert.equal(g.data.battle.foe.id,data.bosses[12].team[0].id);assert.ok(g.data.trainerSeen.champion);
  g.endChallenge(false,g.data.switchUntil);g.data.journal=[];g=new Game(g.data,now+1);known(g,12);assert.equal(g.data.champion,false);
});

test('each Rocket opponent is revealed as soon as the immediately preceding requirement is met',()=>{
  const g=fixture(),training=require('../training-device.cjs'),visible=()=>training.snapshot(g).steps.slice(0,3).map(s=>({revealed:s.revealed,name:s.name,team:s.team.length}));
  assert.deepEqual(visible().map(s=>s.revealed),[false,false,false]);
  g.data.badges=data.bosses.slice(0,3).map(b=>b.id);assert.deepEqual(visible().map(s=>s.revealed),[true,false,false]);assert.equal(visible()[0].team,2);
  assert.ok(training.win(g,'rocket-grunt',now));assert.deepEqual(visible().map(s=>s.revealed),[true,true,false]);assert.equal(visible()[1].team,3);
  assert.ok(training.win(g,'rocket-duo',now+1));assert.deepEqual(visible().map(s=>s.revealed),[true,true,true]);assert.equal(visible()[2].name,'로켓단 비주기');assert.equal(visible()[2].team,3);
});

test('older trainer encounters are preserved without confusing Rocket victories or advance reservations with the last gym encounter',()=>{
  const fresh=fixture(),legacy=structuredClone(fresh.data);delete legacy.trainerSeen;
  legacy.journal=[{kind:'story',text:'로켓단 비주기에게 승리! 로켓단 3단계를 모두 물리쳤다.',at:now},{kind:'challenge',text:'비주기 체육관 도전 예약 · 현재 배틀 종료 후 시작',at:now}];
  let g=new Game(legacy,now+1);hidden(g,7);hidden(g,12);assert.ok(!g.panelState(now).journal.some(e=>e.kind==='challenge'&&e.text.includes('비주기')));assert.equal(legacy.journal[1].text,'비주기 체육관 도전 예약 · 현재 배틀 종료 후 시작');
  legacy.journal.push({kind:'challenge',text:'비주기 체육관 도전 시작',at:now});g=new Game(legacy,now+2);known(g,7);hidden(g,12);
  legacy.journal=[];legacy.leagueBest=4;g=new Game(legacy,now+3);hidden(g,7);known(g,12);
  legacy.leagueBest=0;legacy.champion=true;g=new Game(legacy,now+4);known(g,12);
});
