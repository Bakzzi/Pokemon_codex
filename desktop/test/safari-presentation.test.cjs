'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const ui=require('../safari-presentation.js'),capture=require('../capture-animation.js'),{Adventure}=require('../adventure.cjs'),{Game}=require('../game.cjs'),safari=require('../../shared/safari.cjs');
test('Safari scenery gives priority to dialogue and trainer or event battles',()=>{
  const s={safari:{active:true}};assert.ok(ui.eligible(s));assert.ok(ui.eligible({...s,battle:{kind:'wild'}}));
  assert.equal(ui.eligible({...s,scene:{mode:'dialogue'}}),false);assert.equal(ui.eligible({...s,battle:{kind:'trainer'}}),false);assert.equal(ui.eligible({...s,battle:{kind:'wild',storyId:'fixture'}}),false);assert.equal(ui.eligible({safari:{active:false}}),false);
});
test('successful Safari capture keeps its result secret until all three shakes finish',()=>{
  const e={at:1000,outcome:'caught',sequence:1,name:'니드런'},t=capture.captureTiming({caught:true});
  for(let shake=0;shake<3;shake++){
    const f=ui.frame(e,e.at+t.shakeAt+shake*t.shakeEvery);assert.equal(f.phase,'shake');assert.equal(f.sparkle,false);assert.ok(!f.text.includes('성공'));
  }
  const f=ui.frame(e,e.at+t.messageAt);assert.equal(f.phase,'caught');assert.ok(f.sparkle);assert.match(f.text,/니드런 포획 성공/);assert.ok(!f.done);
  assert.ok(ui.frame(e,e.at+t.duration).done);
});
test('observation does not throw a ball and a failed throw never becomes a success',()=>{
  assert.equal(ui.frame({at:0,outcome:'observed'},100).ball,false);
  for(let sequence=1;sequence<=4;sequence++){
    const e={at:0,outcome:'fled',sequence,name:'fixture'},f=ui.frame(e,10000);assert.equal(f.phase,'escaped');assert.ok(f.done);assert.match(f.text,/아쉽다/);assert.equal(f.sparkle,false);
  }
});
test('Safari view snapshots expose live and final encounter identities without changing saved progress',()=>{
  const at=Date.now(),g=new Adventure(new Game({},at).data,at,{random:()=>0});g.data.badges=['koga'];assert.ok(safari.start(g,at));
  safari.walk(g,50,at);const saved=structuredClone(g.data),s=g.panelState(at).safari;
  assert.equal(s.encounterCount,1);assert.equal(s.lastEncounter.name,'니드런♂');assert.equal(s.lastEncounter.outcome,'caught');assert.deepEqual(g.data,saved);
  safari.walk(g,1450,at);const last=g.panelState(at).safari.last;assert.equal(last.tripId,s.tripId);assert.equal(last.encounterCount,30);assert.equal(last.lastEncounter.sequence,30);assert.ok(Number.isInteger(last.balls));
  assert.equal(last.returned,false);safari.start(g,at);safari.finish(g,at,true);assert.equal(g.panelState(at).safari.last.returned,true);
});
