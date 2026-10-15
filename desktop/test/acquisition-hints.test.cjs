'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{species,wildDistribution}=require('../pokemon.cjs');
const now=Date.parse('2026-10-15T05:00:00Z'),fixture=()=>new Game({},now,{random:()=>.73});
const entry=(g,id)=>g.panelState(now).collection.find(p=>p.id===id);
function level(g,n){for(const uid of g.data.slots)g.data.owned[uid].level=n;}

test('every allowed species has an acquisition route, while unknown identities and descriptions stay hidden',()=>{
  for(const generation of [1,2]){
    const g=fixture();if(generation===2){g.data.champion=true;g.unlockJohto(now);}
    const collection=g.panelState(now).collection;assert.equal(collection.length,generation===1?151:251);
    for(const p of collection){assert.ok(p.acquisition.routes.length,p.id);assert.ok(p.acquisition.summary);if(!p.seen){assert.equal(p.name,'???');assert.equal(p.description,'');}}
  }
});

test('ordinary and evolved species combine their exact current wild probability with their other legal routes',()=>{
  const g=fixture();level(g,20);g.data.seen[10]=now;
  const p=entry(g,11),routes=p.acquisition.routes,d=wildDistribution(1,20,g.wildOptions()).pokemon.find(p=>p.id===11);
  assert.equal(routes.find(r=>r.kind==='wild').chance,d.chance);assert.ok(routes.some(r=>r.kind==='evolution'&&r.text.includes('캐터피')&&r.text.includes('Lv.7')&&r.text.includes('자동진화')));
  assert.equal(p.name,'???');assert.equal(p.description,'');
});

test('level-gated wild encounters show zero now and the actual entry level rather than promising a future percentage',()=>{
  const g=fixture(),p=entry(g,65);assert.equal(p.acquisition.routes.find(r=>r.kind==='wild').chance,0);assert.match(p.acquisition.routes.find(r=>r.kind==='wild').text,/Lv\.16/);
  level(g,16);assert.ok(entry(g,65).acquisition.routes.find(r=>r.kind==='wild').chance>0);
});

test('starter families never get a wild route; starter, level and stone methods remain accurate',()=>{
  const g=fixture();level(g,100);
  for(const id of [1,2,3,4,5,6,7,8,9,25,26]){const p=entry(g,id);assert.equal(p.acquisition.wildAllowed,false);assert.ok(!p.acquisition.routes.some(r=>r.kind==='wild'));}
  assert.ok(entry(g,4).acquisition.routes.some(r=>r.kind==='starter'));
  assert.ok(entry(g,5).acquisition.routes.some(r=>r.kind==='evolution'&&r.text.includes('파이리')&&r.text.includes('Lv.16')));
  const raichu=entry(g,26).acquisition.routes.find(r=>r.kind==='evolution');assert.ok(raichu.text.includes('천둥의돌'));assert.ok(raichu.text.includes('선택·예약'));
});

test('trade alternatives show device learning and held items without revealing the device reward chain',()=>{
  const g=fixture();g.data.seen[64]=now;
  const text=entry(g,65).acquisition.routes.find(r=>r.kind==='evolution').text;assert.match(text,/윤겔라/);assert.match(text,/학습장치.*한 레벨 상승/);assert.ok(!/40|로켓|잠만보|독수/.test(text));
  g.data.champion=true;g.unlockJohto(now);const steelix=entry(g,208).acquisition.routes.find(r=>r.kind==='evolution');assert.ok(steelix.text.includes('금속코트'));assert.ok(steelix.text.includes('학습장치'));
});

test('event hints tell the required action but keep item and reward sources secret',()=>{
  const g=fixture(),p=entry(g,143),json=JSON.stringify(p.acquisition);
  assert.equal(p.acquisition.wildAllowed,false);assert.ok(p.acquisition.routes.some(r=>r.kind==='event'&&r.text.includes('포켓몬피리')));
  assert.ok(!/로켓|비주기|민화|학습장치|독수/.test(json));assert.ok(json.includes('입수 방법은 비밀'));
  g.data.trainingDevice.fluteObtainedAt=now;assert.ok(entry(g,143).acquisition.routes.find(r=>r.kind==='event').text.includes('피리 보유 중'));
});

test('breeding hints use real nursery outcomes and generation gates, including split Nidoran eggs and babies',()=>{
  const g=fixture();g.addPokemon(134,20,'catch',now);
  const eevee=entry(g,133).acquisition.routes.find(r=>r.kind==='hatch');assert.ok(eevee);assert.equal(eevee.from,134);assert.match(eevee.text,/샤미드.*메타몽/);
  for(const id of [132,144,145,146,150,151])assert.ok(!entry(g,id).acquisition.routes.some(r=>r.kind==='hatch'));
  assert.ok(entry(g,29).acquisition.routes.find(r=>r.kind==='hatch').text.includes('50%'));
  g.data.champion=true;g.unlockJohto(now);assert.ok(entry(g,172).acquisition.routes.find(r=>r.kind==='hatch').text.includes('피카츄'));
  const espeon=entry(g,196).acquisition.routes.find(r=>r.kind==='evolution');assert.match(espeon.text,/친밀도 220.*04~18시/);
});

test('hints refresh with active level, generation, registration and champion bonuses and never mutate progress or RNG',()=>{
  const g=fixture();let draws=0;g.random=()=>{draws++;return .5;};const before=structuredClone(g.data);g.panelState(now);g.panelState(now);assert.deepEqual(g.data,before);assert.equal(draws,0);
  level(g,71);const base=entry(g,145).acquisition.routes.find(r=>r.kind==='wild').chance;g.data.champion=true;
  const boosted=entry(g,145).acquisition.routes.find(r=>r.kind==='wild').chance;assert.ok(boosted>base);assert.equal(boosted,wildDistribution(1,71,g.wildOptions()).pokemon.find(p=>p.id===145).chance);
  g.data.caught[145]=now;assert.equal(entry(g,145).acquisition.routes.find(r=>r.kind==='wild').chance,wildDistribution(1,71,g.wildOptions()).pokemon.find(p=>p.id===145).chance);
});

test('hatch acquisition hints never require owning the target itself, including Lapras and Tauros',()=>{
  for(const generation of [1,2]){
    const g=fixture();if(generation===2){g.data.champion=true;g.unlockJohto(now);}
    for(const id of [128,131]){const p=entry(g,id);assert.ok(!p.acquisition.routes.some(r=>r.kind==='hatch'));assert.ok(!p.acquisition.summary.includes('부화'));}
    for(const p of g.panelState(now).collection)for(const r of p.acquisition.routes.filter(r=>r.kind==='hatch'))assert.notEqual(r.from,p.id);
    g.addPokemon(128,20,'catch',now);g.addPokemon(131,20,'catch',now);
    for(const id of [128,131])assert.ok(!entry(g,id).acquisition.routes.some(r=>r.kind==='hatch'));
  }
});

test('different-parent hatch routes show the exact parent and offspring, while same-species breeding remains playable',()=>{
  const g=fixture(),nursery=require('../daycare.cjs');g.addPokemon(134,20,'catch',now);
  const eevee=entry(g,133).acquisition.routes.find(r=>r.kind==='hatch');assert.equal(eevee.from,134);assert.match(eevee.text,/부모 No\.134 샤미드.*부화 결과 No\.133 \?\?\?/);
  const ditto=g.addPokemon(132,20,'catch',now);
  for(const id of [128,131]){const uid=g.addPokemon(id,20,'catch',now),preview=nursery.predict(g,[uid,ditto]);assert.equal(preview.compatible,true);assert.deepEqual(preview.offspring.map(p=>p.id),[id]);}
});
