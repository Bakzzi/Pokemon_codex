'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-world.cjs'),W=require('../../shared/johto-world.cjs'),J=require('../../shared/johto.cjs'),walking=require('../map-walk.js');
const now=Date.parse('2026-10-22T06:00:00Z');
const {finishJourney}=require('./helpers/travel-fixture.cjs');
function ready(Type=PC){const g=require('./helpers/kanto-fixture.cjs').existing(Type,now,{random:()=>.73});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;g.data.switchUntil=0;g.nextTick=now;return g;}
for(const Type of [PC,Android])test(Type.name+' approaches blocked roads, preserves activity and passes only after the real prerequisite',()=>{
 const g=ready(Type);g.data.workTokens=2000;const roster=structuredClone(g.data.owned);assert.ok(g.requestAction('travel','route-3',now));const end=finishJourney(g,now),s=g.data.kantoWorld;
 assert.equal(s.blocked.location,'route-3');assert.notEqual(s.location,'route-3');for(const p of s.walk.path)assert.ok(K.unlocked(g,K.byId.get(K.snapshot(g).map.roads.find(c=>c.x===p.x&&c.y===p.y).place)));
 assert.match(K.checkpoint(g).pages.join(' '),/회색배지/);assert.equal(g.requestAction('world-pass','route-3',end),false);assert.equal(g.data.workTokens,2000);
 const loaded=new Type(structuredClone(g.data),end+1);assert.ok(g.tick(end));assert.equal(g.data.battle.kind,'wild');assert.equal(g.data.workTokens,1750);
 assert.deepEqual(loaded.data.kantoWorld.blocked,s.blocked);loaded.data.badges=['brock'];assert.ok(loaded.requestAction('world-pass','route-3',end+1));finishJourney(loaded,end+1);assert.equal(loaded.data.kantoWorld.location,'route-3');assert.equal(loaded.data.kantoWorld.blocked,null);assert.equal(loaded.data.workTokens,2000);for(const [uid,p] of Object.entries(loaded.data.owned)){const {happiness,...rest}=p,{happiness:before,...original}=roster[uid];assert.deepEqual(rest,original);assert.ok(happiness>=before);}
});
test('the league checkpoint checks eight badges before allowing the route and remembers passage',()=>{
 const g=ready();g.data.badges=require('../pokemon.cjs').data.bosses.slice(0,8).map(b=>b.id);assert.ok(g.requestAction('travel','indigo',now));let end=finishJourney(g,now);assert.equal(K.checkpoint(g).name,'포켓몬리그 경비원');assert.equal(K.checkpoint(g).canPass,true);assert.equal(K.checkpoint(g).pages.length,10);
 assert.ok(g.requestAction('world-pass','indigo',end));end=finishJourney(g,end);assert.equal(K.current(g).id,'indigo');assert.equal(g.data.kantoWorld.leaguePass,true);assert.equal(new PC(g.data,end+1).data.kantoWorld.leaguePass,true);
});
test('all original Johto road destinations except the separate mountain approach are connected',()=>{
 for(const p of W.places.filter(p=>p.zone==='johto'&&p.id!=='j-silver'))assert.ok(walking.route(W.maps.johto,W.maps.johto.points['j-newbark'],p.point),p.id);
 for(const n of J.nodes.values())if(!['league','rival'].includes(n.type))assert.ok(W.byId.has(W.locationFor(n.id)),n.id);
});
for(const Type of [PC,Android])test(Type.name+' uses the Johto map through the persistent travel queue without Kanto gates or habitats',()=>{
 const g=ready(Type);g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));assert.equal(g.panelState(now).johtoWorld.location,'j-newbark');assert.ok(g.requestAction('travel','j-violet',now));let end=finishJourney(g,now);assert.equal(W.init(g).location,'j-violet');assert.equal(W.init(g).blocked,null);
 assert.ok(g.requestAction('travel','j-azalea',end));end=finishJourney(g,end);assert.equal(W.init(g).blocked.location,'j-azalea');assert.notEqual(W.init(g).location,'j-azalea');g.data.johto.cleared['j-falkner']=now;
 assert.ok(g.requestAction('world-pass','j-azalea',end));finishJourney(g,end);assert.equal(W.init(g).location,'j-azalea');assert.deepEqual(g.wildOptions().habitat,W.habitat(g));assert.equal(g.snapshot(now).location.id,'j-azalea');
});
test('completed adventure records outlive the short journal without exposing future opponents',()=>{
 const g=ready();g.data.badges=['brock'];g.data.journal=[];let records=g.panelState(now).adventureRecords;assert.equal(records.length,1);assert.equal(records[0].id,'brock');assert.ok(!JSON.stringify(records).includes('giovanni'));
 g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));g.data.johto.cleared['j-sprout-sage-1']=now;records=g.panelState(now).adventureRecords;assert.ok(records.some(r=>r.id==='brock'));assert.ok(records.some(r=>r.id==='j-sprout-sage-1'));assert.ok(!records.some(r=>r.id==='j-red'));
});
test('only confirmed dialogue pages are archived once and survive reload',()=>{
 const g=ready();g.dialogue('villager','길목의 사람','j-sage',['반가워요.','조심히 다녀오세요.'],'adventure',now);const s=g.presentation();assert.ok(g.advanceScene(s.id+':0',now));assert.equal(g.data.dialogueMemories,undefined);assert.ok(g.advanceScene(s.id+':1',now+1));assert.equal(g.data.dialogueMemories.length,1);assert.deepEqual(g.data.dialogueMemories[0].pages,['반가워요.','조심히 다녀오세요.']);assert.equal(new PC(g.data,now+2).data.dialogueMemories.length,1);
});
