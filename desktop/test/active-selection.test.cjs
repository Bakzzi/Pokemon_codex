'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{Adventure:Desktop}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs');
const now=Date.parse('2026-10-18T10:00:00Z');
for(const [name,Engine] of [['core',Game],['PC',Desktop],['Android',Mobile]]){
  function fixture(){const base=new Game({},now),g=new Engine(base.data,now);const uid=g.addPokemon(19,5,'fixture',now);g.data.slots[1]=uid;return g;}
  test(name+': selecting the active partner during playback is a side-effect-free no-op',()=>{
    for(const mode of ['idle','attack','capture','faint','dialogue']){
      const g=fixture();
      if(mode!=='idle')g.animate(mode,{text:'fixture'},now);
      if(mode==='faint')g.data.pendingBattle={kind:'replace',at:now+5000};
      if(mode==='dialogue'&&g.dialogue)g.dialogue('trainer','fixture','green',['fixture'],'none',now);
      const before=structuredClone(g.data),nextTick=g.nextTick;
      assert.equal(g.actionStatus({kind:'select',uid:g.data.activeId},now).state,'done',mode);
      for(let i=0;i<3;i++)assert.equal(g.requestAction('select',String(g.data.activeId),now+i),true,mode);
      assert.deepEqual(g.data,before,mode);assert.equal(g.nextTick,nextTick,mode);
    }
  });
  test(name+': clicking the active partner preserves a different queued switch',()=>{
    const g=fixture(),uid=g.data.slots[1];g.animate('attack',{moveId:33,actor:'hero'},now);
    assert.ok(g.requestAction('select',uid,now));const before=structuredClone(g.data);
    assert.ok(g.requestAction('select',g.data.activeId,now+1));assert.deepEqual(g.data,before);
    const end=Math.max(g.data.switchUntil,g.nextTick);assert.ok(g.processActions(end));
    assert.equal(g.data.activeId,uid);assert.equal(g.data.animation.kind,'switch');assert.equal(g.data.pendingActions.length,0);
  });
  test(name+': an old redundant active-partner reservation is discarded without switching',()=>{
    const g=fixture();g.animate('attack',{moveId:33,actor:'hero'},now);
    g.data.pendingActions=[{id:1,kind:'select',uid:g.data.activeId,queuedAt:now}];g.data.actionSerial=1;
    const loaded=new Engine(structuredClone(g.data),now+1),animation=structuredClone(loaded.data.animation),journal=structuredClone(loaded.data.journal);
    assert.ok(loaded.processActions(now+1));assert.deepEqual(loaded.data.pendingActions,[]);
    assert.deepEqual(loaded.data.animation,animation);assert.deepEqual(loaded.data.journal,journal);
  });
}
