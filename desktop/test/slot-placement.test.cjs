'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs');
const nursery=require('../daycare.cjs');
const now=Date.parse('2026-10-17T06:00:00Z'),fixture=()=>new Game({},now,{random:()=>.73});
function unique(g){const slots=g.data.slots.filter(uid=>uid!==null);assert.equal(new Set(slots).size,slots.length);}

for(const queued of [false,true])test('replacing the only active slot adds one companion only'+(queued?' after the wild battle':''),()=>{
  const g=fixture(),uid=g.addPokemon(19,5,'fixture',now);
  if(queued)g.newWild(now);
  assert.ok(g.requestAction('slot',{slot:0,id:uid},now));
  if(queued){assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);g.defeatOpponent(Math.max(now,g.data.switchUntil));g.tick(Math.max(now,g.nextTick,g.data.switchUntil));}
  assert.deepEqual(g.data.slots,[uid,null,null,null,null,null]);assert.equal(g.data.activeId,uid);unique(g);
  assert.equal(Object.values(g.data.owned).filter(p=>p.uid===uid).length,1);assert.ok(g.data.owned[25]);
  const restored=new Game(structuredClone(g.data),g.data.switchUntil);assert.deepEqual(restored.data.slots,g.data.slots);
});

test('placing an already assigned companion swaps positions and keeps every other slot',()=>{
  const g=fixture(),a=g.addPokemon(19,5,'fixture',now),b=g.addPokemon(16,5,'fixture',now);g.data.slots=[25,a,b,null,null,null];
  assert.ok(g.setSlot(0,b,now));assert.deepEqual(g.data.slots,[b,a,25,null,null,null]);assert.equal(g.data.activeId,b);unique(g);
});

test('replacing the active slot in a full team preserves the other five companions',()=>{
  const g=fixture();for(const [i,id] of [16,19,21,23,27].entries())g.data.slots[i+1]=g.addPokemon(id,5,'fixture',now);
  const before=[...g.data.slots],uid=g.addPokemon(133,5,'fixture',now);
  assert.ok(g.setSlot(0,uid,now));assert.deepEqual(g.data.slots,[uid,...before.slice(1)]);unique(g);
});

test('separate individuals of the same species may occupy different slots',()=>{
  const g=fixture(),uid=g.addPokemon(25,5,'hatch',now);assert.notEqual(uid,25);
  assert.ok(g.setSlot(1,uid,now));assert.deepEqual(g.data.slots,[25,uid,null,null,null,null]);assert.equal(g.data.activeId,25);unique(g);
});

function nurseryFixture(){
  const g=fixture(),other=g.addPokemon(19,10,'fixture',now),bulba=g.addPokemon(1,10,'fixture',now),ditto=g.addPokemon(132,10,'fixture',now);
  g.data.kantoWorld={location:'route-5'};
  assert.ok(g.setSlot(1,other,now));assert.ok(g.setSlot(2,bulba,now));assert.ok(g.requestAction('daycare-start',[bulba,ditto],now));assert.ok(g.data.daycare);
  return {g,bulba};
}
for(const reload of [false,true])test('removing slot three cancels an older boarded companion selection'+(reload?' across reload':''),()=>{
  let {g,bulba}=nurseryFixture();assert.ok(g.requestAction('select',bulba,now));assert.ok(g.data.pendingActions.some(a=>a.kind==='select'));
  assert.ok(g.requestAction('slot',{slot:2,id:null},now));assert.equal(g.data.slots[2],null);assert.ok(!g.data.pendingActions.some(a=>a.kind==='select'));
  if(reload)g=new Game(structuredClone(g.data),now);
  assert.ok(g.requestAction('daycare-withdraw',undefined,now));for(let i=0;i<3;i++)g.processActions(now);
  assert.equal(g.data.slots[2],null);assert.ok(g.data.owned[bulba]);assert.equal(g.data.activeId,25);unique(g);
});
test('an older queued move to another slot cannot undo a newer removal after battle',()=>{
  const g=fixture(),bulba=g.addPokemon(1,10,'fixture',now);assert.ok(g.setSlot(2,bulba,now));g.newWild(now);
  assert.ok(g.requestAction('slot',{slot:5,id:bulba},now));assert.ok(g.requestAction('slot',{slot:2,id:null},now));
  assert.ok(!g.data.pendingActions.some(a=>a.uid===bulba));g.defeatOpponent(g.data.switchUntil);g.tick(Math.max(g.nextTick,g.data.switchUntil));
  assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);
});
test('a saved pre-fix removal also discards its older selection when applied',()=>{
  let {g,bulba}=nurseryFixture();g.data.pendingActions=[{id:1,kind:'select',uid:bulba,queuedAt:now},{id:2,kind:'slot',slot:2,uid:null,queuedAt:now+1}];g.data.actionSerial=2;
  g=new Game(structuredClone(g.data),now+2);assert.ok(g.processActions(now+2));assert.equal(g.data.slots[2],null);assert.equal(g.data.pendingActions.length,0);
  assert.ok(g.requestAction('daycare-withdraw',undefined,now+2));g.processActions(now+2);assert.equal(g.data.slots[2],null);
});
test('a new explicit selection made after removal was requested is still honored',()=>{
  const g=fixture(),bulba=g.addPokemon(1,10,'fixture',now);assert.ok(g.setSlot(2,bulba,now));g.newWild(now);
  assert.ok(g.requestAction('slot',{slot:2,id:null},now));assert.ok(g.requestAction('select',bulba,now+1));
  g.defeatOpponent(g.data.switchUntil);g.tick(Math.max(g.nextTick,g.data.switchUntil));assert.equal(g.data.slots[2],null);assert.ok(g.data.pendingActions.some(a=>a.kind==='select'));
  g.tick(Math.max(g.nextTick,g.data.switchUntil));assert.equal(g.data.activeId,bulba);assert.ok(g.data.slots.includes(bulba));unique(g);
});

for(let slot=0;slot<6;slot++)for(const reload of [false,true])test('empty slot '+(slot+1)+' survives conflicting reservations, gifts, captures and hatch'+(reload?' across restart':''),()=>{
  let g=fixture();const bulba=g.addPokemon(1,10,'fixture',now),ditto=g.addPokemon(132,10,'fixture',now),others=[25,...[19,16,21,23].map(id=>g.addPokemon(id,10,'fixture',now))];
  g.data.kantoWorld={location:'route-5'};
  g.data.slots=Array.from({length:6},(_,i)=>i===slot?bulba:others.shift());g.data.activeId=25;const expected=[...g.data.slots];expected[slot]=null;
  assert.ok(g.requestAction('daycare-start',[bulba,ditto],now));assert.ok(g.requestAction('select',bulba,now));assert.ok(g.requestAction('slot',{slot:(slot+1)%6,id:bulba},now));
  assert.ok(g.requestAction('slot',{slot,id:null},now));assert.deepEqual(g.data.slots,expected);assert.ok(!g.data.pendingActions.some(a=>a.uid===bulba));
  if(reload)g=new Game(structuredClone(g.data),now);
  assert.ok(g.requestAction('daycare-withdraw',undefined,now));for(let i=0;i<3;i++)g.processActions(now);
  g.data.badges.push('misty');assert.ok(g.awardStarterGift('misty',now));assert.ok(g.addPokemon(27,5,'catch',now));
  g.data.egg={id:133,progress:0,required:1,parents:[bulba,ditto],obtainedAt:now};nursery.advance(g,1,now);assert.equal(g.data.egg,null);assert.ok(g.data.caught[133]);
  assert.deepEqual(g.data.slots,expected);assert.ok(g.data.owned[bulba]);unique(g);
});
