'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{data}=require('../pokemon.cjs');
const now=Date.parse('2026-10-14T15:00:00Z'),fixture=()=>new Game({},now,{random:()=>.73});
function hidden(g,index){const boss=g.panelState(now).bosses[index];assert.equal(boss.name,'???');assert.equal(boss.revealed,false);assert.deepEqual(boss.team,[]);}
function known(g,index){const boss=g.panelState(now).bosses[index];assert.equal(boss.name,data.bosses[index].name);assert.equal(boss.revealed,true);assert.deepEqual(boss.team,data.bosses[index].team);}

test('the last gym stays secret when unlocked, reserved, cancelled and reloaded, then is remembered after the actual encounter',()=>{
  let g=fixture();hidden(g,7);hidden(g,12);
  g.data.badges=data.bosses.slice(0,7).map(b=>b.id);g.newWild(now);assert.ok(g.canChallenge(7));
  assert.ok(g.challenge(7,now));hidden(g,7);assert.equal(g.snapshot(now).pendingChallenge.name,'??? 체육관');assert.ok(g.data.journal.at(-1).text.startsWith('??? 체육관'));
  assert.ok(g.cancelChallenge(now));hidden(g,7);assert.ok(g.challenge(7,now));
  g=new Game(g.data,now+1);hidden(g,7);g.defeatOpponent(g.data.switchUntil);
  assert.ok(g.tick(Math.max(g.data.switchUntil,g.nextTick)));assert.equal(g.data.battle.bossIndex,7);known(g,7);hidden(g,12);
  assert.equal(g.data.battle.foe.id,data.bosses[7].team[0].id);assert.ok(g.data.trainerSeen.giovanni);
  assert.ok(g.abandon(g.data.switchUntil));g.data.journal=[];g=new Game(g.data,now+2);known(g,7);
  assert.equal(g.data.badges.length,7);assert.equal(g.data.champion,false);assert.equal(data.bosses[7].name,'비주기');
});

test('the champion is not revealed by badges or a league reservation, but is revealed after the four Elite Four matches and remains known after a loss',()=>{
  let g=fixture();g.data.badges=data.bosses.slice(0,8).map(b=>b.id);known(g,7);hidden(g,12);
  assert.ok(g.challenge(8,now));hidden(g,12);
  let turns=0;
  while(g.data.battle.bossIndex<12){hidden(g,12);g.defeatOpponent(g.data.switchUntil);assert.ok(++turns<30);}
  known(g,12);assert.equal(g.data.leagueBest,4);assert.equal(g.data.champion,false);
  assert.equal(g.data.battle.foe.id,data.bosses[12].team[0].id);assert.ok(g.data.trainerSeen.champion);
  g.endChallenge(false,g.data.switchUntil);g.data.journal=[];g=new Game(g.data,now+1);known(g,12);assert.equal(g.data.champion,false);
});

test('older trainer encounters are preserved without confusing Rocket victories or advance reservations with the last gym encounter',()=>{
  const fresh=fixture(),legacy=structuredClone(fresh.data);delete legacy.trainerSeen;
  legacy.journal=[{kind:'story',text:'로켓단 비주기에게 승리! 로켓단 3단계를 모두 물리쳤다.',at:now},{kind:'challenge',text:'비주기 체육관 도전 예약 · 현재 배틀 종료 후 시작',at:now}];
  let g=new Game(legacy,now+1);hidden(g,7);hidden(g,12);assert.ok(!g.panelState(now).journal.some(e=>e.kind==='challenge'&&e.text.includes('비주기')));assert.equal(legacy.journal[1].text,'비주기 체육관 도전 예약 · 현재 배틀 종료 후 시작');
  legacy.journal.push({kind:'challenge',text:'비주기 체육관 도전 시작',at:now});g=new Game(legacy,now+2);known(g,7);hidden(g,12);
  legacy.journal=[];legacy.leagueBest=4;g=new Game(legacy,now+3);hidden(g,7);known(g,12);
  legacy.leagueBest=0;legacy.champion=true;g=new Game(legacy,now+4);known(g,12);
});
