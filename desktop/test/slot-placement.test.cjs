'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs');
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
