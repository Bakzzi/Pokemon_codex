'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),battle=require('../battle.cjs'),pacing=require('../battle-pacing.js');
const now=Date.parse('2026-10-15T06:00:00Z');
function fixture(id=77,known=[150],foe=113){
  const g=new Game({},now,{random:()=>.73}),uid=g.addPokemon(id,40,'fixture',now);
  g.data.activeId=uid;g.data.slots=[uid,null,null,null,null,null];g.data.owned[uid].moves=known;
  const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(g.data.owned[uid])},foe:battle.combatant(foe,40,[150]),turn:0,captureAttempts:0};
  const sim=battle.engine(g,b);return {g,b,sim,ref:'p1a: u'+uid};
}

test('native split HP logs produce one confusion notice and one damage cause',()=>{
  const {g,b,sim}=fixture();sim.p1.active[0].addVolatile('confusion');let action;
  for(let i=0;i<20;i++){
    if(!sim.p1.active[0].volatiles.confusion)sim.p1.active[0].addVolatile('confusion');
    action=battle.step(g,b);if(action.damageCauses.some(c=>c.cause==='혼란 자해'))break;
  }
  assert.equal(action.damageCauses.length,1);assert.equal(action.damageCauses[0].text,'포니타는 혼란에 빠져 자신을 공격했다!');
  assert.equal(action.lines.filter(s=>s.includes('자신을 공격했다')).length,1);
  assert.equal(action.lines.some(s=>s.includes('혼란스러워하고')),false);
  assert.equal(action.actor,'hero');assert.equal(action.moveTarget,'self');
  assert.ok(sim.log.filter(s=>s.startsWith('|-damage|')&&s.includes('[from] confusion')).length>=2,'reproduces the native private/public pair');
});

test('confusion self-damage from the foe stays attributed to the foe',()=>{
  const action=battle.movePresentation(['|-activate|p2a: f0|confusion','|-damage|p2a: f0|25/80|[from] confusion']);
  assert.equal(action.actor,'foe');assert.equal(action.moveTarget,'self');
});

test('saved duplicate causes are collapsed for the bubble without losing different effects or victims',()=>{
  const cause={side:'foe',cause:'혼란 자해',text:'포니타는 혼란에 빠져 자신을 공격했다!'};
  const e={foeBefore:{currentHp:40},foe:{name:'포니타',currentHp:25},heroBefore:{currentHp:50},hero:{name:'피카츄',currentHp:40},damageCauses:[cause,{...cause},{side:'foe',cause:'독',text:'포니타는 독 때문에 피해를 입었다!'},{side:'hero',cause:'반동',text:'피카츄는 반동으로 피해를 입었다!'}]};
  const messages=pacing.damageMessages(e);assert.equal(messages.length,3);assert.equal(messages.filter(s=>s.text===cause.text).length,1);
  e.foe.currentHp=40;assert.deepEqual(pacing.damageMessages(e).map(s=>s.side),['hero']);
});

test('sleep, freeze, paralysis and action blockers use complete sentences with the correct subject',()=>{
  const {sim,ref}=fixture();
  for(const [code,expected] of Object.entries({slp:'포니타는 잠들어 있다!',frz:'포니타는 얼어붙어서 움직일 수 없다!',par:'포니타는 마비되어 움직일 수 없다!',flinch:'포니타는 풀이 죽어서 움직일 수 없다!',recharge:'포니타는 공격의 반동으로 쉬고 있다!',nopp:'포니타는 기술의 PP가 부족하다!'}))assert.deepEqual(battle.protocol(sim,['|cant|'+ref+'|'+code]),[expected]);
  assert.deepEqual(battle.protocol(sim,['|-status|'+ref+'|slp','|-curestatus|'+ref+'|slp']),['포니타는 잠들었다!','포니타는 잠에서 깨어났다!']);
  const {g,b}=fixture();b.party[g.data.activeId].status='sleep';battle.invalidate(b);
  const action=battle.step(g,b);assert.ok(action.lines.includes('포니타는 잠들어 있다!'));assert.ok(!action.lines.some(s=>s.includes('때문에 행동')));
});

test('Perish Song localizes its countdown and hides silent setup rather than exposing perish3',()=>{
  const {sim,ref}=fixture();
  const lines=['|-start|'+ref+'|perish3|[silent]','|-fieldactivate|move: Perish Song',...[3,2,1,0].map(n=>'|-start|'+ref+'|perish'+n)];
  const messages=battle.protocol(sim,lines);assert.equal(messages.length,5);
  assert.equal(messages[0],'멸망의노래 효과가 전장에 울려 퍼졌다!');
  assert.deepEqual(messages.slice(1),['포니타의 멸망의노래 카운트: 3','포니타의 멸망의노래 카운트: 2','포니타의 멸망의노래 카운트: 1','포니타의 멸망의노래 카운트가 0이 되었다!']);
  assert.ok(!messages.join(' ').includes('perish'));
});

test('a failed target effect names the actual move user, with a complete team-effect sentence',()=>{
  const {sim,ref}=fixture();
  assert.deepEqual(battle.protocol(sim,['|move|'+ref+'|Growl|p2a: f0','|-fail|p2a: f0','|-sidestart|p2: Wild|Reflect']),['포니타의 울음소리!','포니타의 울음소리는 효과를 내지 못했다!','상대 편의 리플렉터가 펼쳐졌다!']);
});

test('known weather, type, stockpile, ability and volatile effects are Korean; unknown engine tags never leak',()=>{
  const {sim,ref}=fixture();
  const messages=battle.protocol(sim,['|-start|'+ref+'|stockpile3','|-start|'+ref+'|typechange|Water/Ground','|-ability|'+ref+'|Flash Fire','|-start|'+ref+'|confusion','|-end|'+ref+'|confusion','|-weather|raindance','|-weather|none','|-start|'+ref+'|unknown_engine_tag','|cant|'+ref+'|unknown_engine_tag','|-activate|'+ref+'|move: Protect']);
  assert.ok(messages.includes('포니타는 3번 비축했다!'));assert.ok(messages.includes('포니타의 타입이 물/땅 타입으로 바뀌었다!'));assert.ok(messages.includes('포니타의 특성 타오르는불꽃이 발동했다!'));assert.ok(messages.includes('포니타의 혼란이 풀렸다!'));assert.ok(messages.includes('비가 내리고 있다!'));assert.ok(messages.includes('포니타는 공격을 막았다!'));
  assert.ok(!/[a-z_]/i.test(messages.join(' ')));assert.ok(!messages.some(s=>/상대 ·|포니타 ·|종료|때문에 행동/.test(s)));
});

test('split HP normalization retains one damage view and the native multi-hit result',()=>{
  const {sim,ref}=fixture(),raw=['|split|p1','|-damage|'+ref+'|50/100','|-damage|'+ref+'|50/100','|split|p1','|-damage|'+ref+'|40/100','|-damage|'+ref+'|40/100','|-hitcount|'+ref+'|2'];
  assert.equal(battle.protocolLines(raw).filter(s=>s.startsWith('|-damage|')).length,2);
  assert.deepEqual(battle.protocol(sim,raw),['포니타에게 2번 명중했다!']);
});
