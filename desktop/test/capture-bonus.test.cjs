'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{captureBonus,species}=require('../pokemon.cjs'),{combatant,tryCatch}=require('../battle.cjs'),{captureTiming}=require('../capture-animation.js');
const now=Date.parse('2026-10-16T09:00:00Z'),special=[144,145,146,150,151];
const dex=excluded=>Object.fromEntries(Array.from({length:151},(_,i)=>i+1).filter(id=>!excluded.includes(id)).map(id=>[id,now]));
const requirements=id=>id===151?[151]:id===150?[150,151]:special;
function fixture(id,caught){
  const g=new Game({},now,{random:()=>.73});g.data.caught={...caught};g.newWild(now);
  g.data.battle.foe=combatant(id,50,[150]);g.data.battle.foe.hp=g.data.battle.foe.maxHp*.1;return g;
}

test('each bird requires all 146 ordinary Kanto registrations, regardless of the five excluded registrations',()=>{
  const caught=dex(special);assert.equal(Object.keys(caught).length,146);
  for(const id of [144,145,146]){
    assert.equal(captureBonus(id,caught),.04);
    for(const missing of Object.keys(caught)){
      const incomplete={...dex([]),...Object.fromEntries(Array.from({length:100},(_,i)=>[152+i,now]))};delete incomplete[missing];
      assert.equal(captureBonus(id,incomplete),0,'missing '+missing);
    }
  }
});

test('Mewtwo requires all 149 registrations other than Mewtwo and Mew, including all three birds',()=>{
  const caught=dex([150,151]);assert.equal(Object.keys(caught).length,149);assert.equal(captureBonus(150,caught),.03);
  for(const missing of Object.keys(caught)){const incomplete=dex([]);delete incomplete[missing];assert.equal(captureBonus(150,incomplete),0,'missing '+missing);}
});

test('Mew requires every registration numbered 1 through 150, and bonuses persist after the target is caught',()=>{
  const caught=dex([151]);assert.equal(Object.keys(caught).length,150);assert.equal(captureBonus(151,caught),.02);
  for(const missing of Object.keys(caught)){const incomplete=dex([]);delete incomplete[missing];assert.equal(captureBonus(151,incomplete),0,'missing '+missing);}
  const all=dex([]);for(let id=152;id<=251;id++)all[id]=now;
  for(const [id,bonus]of [[144,.04],[145,.04],[146,.04],[150,.03],[151,.02]])assert.equal(captureBonus(id,all),bonus);
  for(const p of species.values())if(!special.includes(p.id))assert.equal(captureBonus(p.id,all),0);
});

function probability(status,bonus,hp=10){
  // Infer the real four-check success probability, including its 16-bit rounding.
  let low=0,high=65536;
  while(low<high){const mid=Math.floor((low+high)/2);if(tryCatch(3,hp,100,status,()=>mid/65536,bonus).caught)low=mid+1;else high=mid;}
  return (low/65536)**4;
}
test('the completed collection adds flat percentage points after HP and status, without multiplying or stacking',()=>{
  for(const hp of [50,20,10,1])for(const status of [null,'sleep','freeze','paralysis','poison','toxic','burn'])for(const bonus of [.02,.03,.04]){
    assert.ok(Math.abs(probability(status,bonus,hp)-probability(status,0,hp)-bonus)<.0001);
  }
  assert.equal(tryCatch(255,1,100,'sleep',()=>{throw Error('guaranteed catch must not roll');},.04).caught,true);
  for(let passes=0;passes<=4;passes++){
    let calls=0;const result=tryCatch(3,10,100,null,()=>calls++<passes?0:.999999,.04);
    assert.equal(result.caught,passes===4);assert.equal(result.shakes,Math.min(passes,3));assert.equal(calls,Math.min(passes+1,4));
  }
});

test('real wild captures use the bonus for each target and keep its result pending until playback ends',()=>{
  for(const id of special){
    const caught=dex(requirements(id)),g=fixture(id,caught),unqualified=fixture(id,{...caught,19:0}),random=id===151?.645:.4;
    g.random=unqualified.random=()=>random;assert.equal(unqualified.capture(now),false);assert.equal(g.capture(now),true,String(id));
    assert.ok(!g.data.caught[id]);assert.equal(g.data.captureAnimation.shakes,3);
    const end=g.data.captureAnimation.at+captureTiming(g.data.captureAnimation).duration;g.random=()=>.73;
    assert.equal(g.tick(end-1),false);assert.ok(!g.data.caught[id]);assert.ok(g.tick(end));assert.ok(g.data.caught[id]);
    assert.equal(captureBonus(id,g.data.caught),id===151?.02:id===150?.03:.04);
  }
});

test('the last required species unlocks the next bonus only when its successful capture is finalized',()=>{
  let g=fixture(149,{...dex(special),149:0});assert.equal(captureBonus(144,g.data.caught),0);
  g.random=()=>0;assert.ok(g.capture(now));const event=structuredClone(g.data.captureAnimation),end=event.at+captureTiming(event).duration;
  g=new Game(JSON.parse(JSON.stringify(g.data)),now+1,{random:()=>{throw Error('pending catch must not reroll');}});
  assert.equal(captureBonus(144,g.data.caught),0);assert.equal(g.tick(end-1),false);assert.equal(captureBonus(144,g.data.caught),0);
  g.random=()=>.73;assert.ok(g.tick(end));assert.equal(captureBonus(144,g.data.caught),.04);
});

test('permanent registrations survive a new season and do not depend on current ownership or seen-only entries',()=>{
  let g=fixture(144,dex(special));g=new Game(JSON.parse(JSON.stringify(g.data)),now+1);
  assert.equal(Object.keys(g.data.owned).length,1);assert.equal(captureBonus(144,g.data.caught),.04);
  g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.equal(captureBonus(144,g.data.caught),.04);
  g.data.seen={...g.data.caught};g.data.caught={};assert.equal(captureBonus(144,g.data.caught),0);
});

test('a completed collection does not allow trainer capture, green or zero HP throws, or extra attempts',()=>{
  const g=fixture(144,dex(special)),b=g.data.battle;g.random=()=>.999999;
  b.kind='trainer';assert.equal(g.capture(now),false);assert.equal(b.captureAttempts,0);b.kind='wild';
  for(const hp of [b.foe.maxHp,0]){b.foe.hp=hp;assert.equal(g.capture(now),false);assert.equal(b.captureAttempts,0);}
  b.foe.hp=b.foe.maxHp*.5;let at=now;
  for(let i=0;i<2;i++){assert.equal(g.capture(at),false);at=g.data.switchUntil;}assert.equal(g.capture(at),false);
  b.foe.hp=b.foe.maxHp*.1;for(let i=0;i<3;i++){assert.equal(g.capture(at),false);at=g.data.switchUntil;}
  assert.equal(g.capture(at),false);assert.equal(b.captureAttempts,5);assert.deepEqual(b.captureByHealth,{yellow:2,red:3});
});
