'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Adventure}=require('../adventure.cjs'),{Adventure:Mobile}=require('../../mobile/adventure.cjs'),{Game}=require('../game.cjs');
const J=require('../../shared/johto.cjs'),{species,data,wildDistribution,wildEligible,wildMinimum,captureBonus,xpAt}=require('../pokemon.cjs'),battle=require('../battle.cjs'),access=require('../move-access.cjs');
const now=Date.parse('2026-10-19T06:00:00Z');
function fixture(Type=Adventure){const old=new Game({},now);old.data.champion=true;const g=new Type(old.data,now,{random:()=>.73});assert.ok(g.unlockJohto(now,[25]));return g;}
function idle(g,at=now){g.data.animation=null;g.data.switchUntil=0;g.nextTick=at;return at;}
function pages(g,at=now){let limit=50;while(g.presentation()?.mode==='dialogue'&&limit--){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,at));}assert.ok(limit>0);if(g.presentation()?.mode==='sendout')g.sceneTick(at+3000);}
function win(g,at=now){let limit=100;while(g.data.battle?.johtoId&&limit--){pages(g,at);const b=g.data.battle;b.foe.hp=0;g.defeatOpponent(at);pages(g,at);at+=10000;}assert.ok(limit>0);idle(g,at);return at;}
function clear(g,ids){for(const id of ids)g.data.johto.cleared[id]=now;}
const towerTraining=['j-sprout-sage-1','j-sprout-sage-2'];

test('two tower trainers must be defeated in order before the elder, with original Crystal parties on both platforms',()=>{
 for(const Type of [Adventure,Mobile]){
  let g=fixture(Type);idle(g);assert.deepEqual(J.snapshot(g).cards.find(c=>c.id==='j-early').steps.map(n=>n.id),[towerTraining[0]]);
  assert.equal(g.challenge(towerTraining[1],now),false);assert.equal(g.challenge('j-sprout',now),false);assert.equal(g.canChallenge('j-falkner'),false);
  assert.deepEqual(J.nodes.get(towerTraining[0]).team.map(p=>[p.id,p.level]),[[69,6]]);
  assert.deepEqual(J.nodes.get(towerTraining[1]).team.map(p=>[p.id,p.level]),[[69,7],[163,7]]);
  assert.deepEqual(J.nodes.get('j-sprout').team.map(p=>[p.id,p.level]),[[69,7],[69,7],[163,10]]);
  assert.ok(g.challenge(towerTraining[0],now));pages(g);g.endChallenge(false,now);pages(g);idle(g);
  assert.equal(J.done(g,towerTraining[0]),false);assert.equal(g.canChallenge(towerTraining[1]),false);
  assert.ok(g.challenge(towerTraining[0],now));win(g);assert.equal(g.canChallenge(towerTraining[0]),false);
  g=new Type(structuredClone(g.data),now+1);idle(g);assert.ok(g.canChallenge(towerTraining[1]));assert.equal(g.canChallenge('j-sprout'),false);
  assert.deepEqual(J.snapshot(g).cards.find(c=>c.id==='j-early').steps.map(n=>n.id),towerTraining);
  assert.ok(g.challenge(towerTraining[1],now));win(g);idle(g);assert.ok(g.canChallenge('j-sprout'));assert.equal(g.canChallenge('j-falkner'),false);
  assert.ok(g.challenge('j-sprout',now));assert.equal(g.data.battle.johtoId,'j-rival-0');win(g);
  assert.ok(g.challenge('j-sprout',g.nextTick));win(g);assert.ok(g.canChallenge('j-falkner'));
  assert.ok(J.snapshot(g).cards.find(c=>c.id==='j-early').done);assert.equal(g.data.workTokens,0);
 }
});

test('older tower progress, active elder battles and queued elder challenges survive the added prerequisites',()=>{
 for(const Type of [Adventure,Mobile])for(const progress of ['fresh','elder','badge','rival','active','queued']){
  const old=fixture(Type).data;old.johto.revision=1;
  if(progress==='elder')old.johto.cleared['j-sprout']=now;
  if(progress==='badge')old.johto.cleared['j-falkner']=now;
  if(progress==='rival')old.johto.rivals['j-rival-0']={state:'completed',metAt:now};
  if(progress==='active'){
   const g=new Type(old,now);idle(g);clear(g,towerTraining);g.data.johto.rivals['j-rival-0']={state:'won',metAt:now};assert.ok(g.challenge('j-sprout',now));
   Object.assign(old,structuredClone(g.data));old.johto.revision=1;for(const id of towerTraining)delete old.johto.cleared[id];
  }
  if(progress==='queued')old.pendingChallenge={index:'j-sprout',queuedAt:now};
  const before=structuredClone(old),g=new Type(old,now+1);
  assert.equal(g.data.johto.revision,2);assert.ok(towerTraining.every(id=>J.done(g,id)===(progress!=='fresh')),progress);
  for(const k of ['owned','slots','caught','badges'])assert.deepEqual(g.data[k],before[k],progress+' '+k);
  if(progress==='queued')assert.deepEqual(g.data.pendingChallenge,before.pendingChallenge);
  if(progress==='active')assert.equal(g.data.battle.johtoId,'j-sprout');
  const loaded=new Type(structuredClone(g.data),now+2);assert.deepEqual(loaded.data.johto,g.data.johto);
 }
});

test('regional migration preserves Kanto records, ownership, selected slots and save scenes',()=>{
 let g=fixture(),before=structuredClone(g.data);g=new Adventure(structuredClone(g.data),now+1);
 for(const k of ['owned','slots','badges','caught','champion','johto'])assert.deepEqual(g.data[k],before[k],k);
 assert.equal(g.data.johto.champion,false);assert.equal(g.presentation(),null);assert.equal(g.panelState(now).collection.length,251);
 assert.equal(g.canChallenge(0),false);assert.equal(g.canChallenge('j-league-lance'),false);assert.equal(g.canChallenge('j-league'),false);
 assert.equal(g.data.champion,true);assert.equal(g.maxGeneration(),2);
 assert.deepEqual(g.snapshot(now).badges,[]);assert.equal(g.snapshot(now).champion,false);
});

test('all story nodes have legal original parties and resolvable prerequisites',()=>{
 for(const n of J.nodes.values()){
  for(const id of n.requires)assert.ok(J.nodes.has(id)||id==='j-partner',n.id+' missing '+id);
  if(n.team)for(const p of n.team){assert.ok(species.has(p.id));assert.ok(p.level>=1&&p.level<=100);assert.ok(p.moves.length);for(const m of p.moves)assert.ok(data.moves.some(x=>x.id===m));}
 }
 assert.deepEqual(J.gyms[0].team.map(p=>[p.id,p.level]),[[16,7],[17,9]]);
 assert.deepEqual(J.nodes.get('j-red').team.map(p=>[p.id,p.level]),[[25,81],[196,73],[143,75],[3,77],[6,77],[9,77]]);
 assert.equal(J.gyms.length,8);assert.equal(J.revisits.length,8);assert.equal(J.league.length,5);
});

test('the complete route from Elm through Mt Silver is reachable using actual challenge and dialogue transitions',()=>{
 const g=fixture();let at=now,passes=0;
 for(const p of data.pokemon)g.data.caught[p.id]=now;
 while(passes++<150){
  const next=[...J.nodes.values()].find(n=>n.type!=='league'&&n.type!=='rival'&&!J.done(g,n.id)&&!(n.type==='league-start'&&g.data.johto.champion)&&g.canChallenge(n.id));
  if(!next)break;
  idle(g,at);assert.ok(g.challenge(next.id,at),next.id);pages(g,at);if(g.data.battle?.johtoId)at=win(g,at);else{g.data.egg=null;at+=10000;}idle(g,at);
 }
 assert.ok(passes<150);for(const n of J.nodes.values())if(!['rival','league-start'].includes(n.type))assert.ok(J.done(g,n.id),'unreachable '+n.id);
 assert.ok(g.data.johto.champion);assert.equal(J.snapshot(g).badges.length,8);assert.equal(J.snapshot(g).kantoBadges.length,8);assert.ok(J.snapshot(g).completed);
 assert.equal(g.data.champion,true);assert.equal(g.maxGeneration(),2);assert.equal(g.data.workTokens,0);
});

test('hidden rival intercepts the target once, retries after loss and survives reload',()=>{
 let g=fixture();clear(g,towerTraining);idle(g);assert.ok(g.challenge('j-sprout',now));assert.equal(g.data.battle.johtoId,'j-rival-0');
 pages(g);g.endChallenge(false,now);pages(g);assert.equal(g.data.johto.rivals['j-rival-0'].state,'completed');assert.equal(g.canChallenge('j-sprout'),true);
 idle(g);assert.ok(g.challenge('j-sprout',now));assert.equal(g.data.battle.johtoId,'j-sprout');win(g);
 clear(g,['j-bugsy']);idle(g);assert.ok(g.challenge('j-ilex',now));assert.equal(g.data.battle.johtoId,'j-rival-1');pages(g);g.endChallenge(false,now);pages(g);idle(g);
 assert.equal(g.canChallenge('j-ilex'),false);assert.equal(g.canChallenge('j-rival-1'),true);g=new Adventure(structuredClone(g.data),now+1);
 assert.equal(g.panelState(now).johto.rival.id,'j-rival-1');idle(g);assert.ok(g.challenge('j-rival-1',now));win(g);assert.equal(g.canChallenge('j-ilex'),true);
 idle(g);assert.ok(g.challenge('j-ilex',now));assert.equal(g.presentation().kind,'johto-event');
});

test('league chains five trainers using the same party HP/PP and only reveals the champion on arrival',()=>{
 const g=fixture();g.data.owned[25].level=100;g.data.owned[25].xp=xpAt(25,100);access.update(g.data.owned[25]);clear(g,['j-dragon-den','j-victory-road']);idle(g);
 const hidden=g.panelState(now).johto.league[4];assert.equal(hidden.name,'???');assert.deepEqual(hidden.team,[]);assert.equal(hidden.sprite,null);
 assert.ok(g.challenge('j-league',now));pages(g);const b=g.data.battle,p=b.party[25];p.hp=5;p.pp[84]=1;
 for(let stage=0;stage<5;stage++){
  assert.equal(g.data.battle.foeStage,stage);const boss=g.battleBoss();assert.equal(g.data.battle.party[25],p);
  for(let i=0;i<boss.team.length;i++){g.defeatOpponent(now+stage*10000);pages(g,now+stage*10000);}
  if(stage<4){assert.equal(g.data.battle.party[25],p);assert.equal(p.hp,5);assert.equal(p.pp[84],1);pages(g);}
 }
 assert.equal(g.data.battle,null);assert.ok(g.data.johto.champion);assert.equal(g.panelState(now).johto.league[4].name,'목호');
});

test('legend gates are independent, require Lv50, and appearance additions stop after registration',()=>{
 const g=fixture();for(const id of J.specialIds)assert.ok(g.wildOptions().excluded.includes(id));
 for(const id of J.specialIds){clear(g,[J.routeGates.get(id)]);assert.ok(!g.wildOptions().excluded.includes(id));assert.equal(wildMinimum(species.get(id)),50);
  assert.ok(!wildDistribution(2,49,g.wildOptions()).pokemon.some(p=>p.id===id));
  assert.ok(g.wildOptions().additions.some(x=>x.id===id));g.data.caught[id]=now;assert.ok(!g.wildOptions().additions.some(x=>x.id===id));
 }
 const distributions=wildDistribution(2,100,g.wildOptions());assert.ok(Math.abs(distributions.pokemon.reduce((n,p)=>n+p.chance,0)-1)<1e-10);
});

test('missing-only regional bonuses do not inherit the Kanto champion or boost caught ordinary species',()=>{
 const g=fixture();clear(g,['j-burned']);assert.equal(g.encounterBonus(),null);const pre=J.bonuses(g).find(b=>b.id===243).extra;
 g.data.johto.champion=true;assert.ok(J.bonuses(g).find(b=>b.id===243).extra>pre);g.data.owned[25].level=100;
 const d=wildDistribution(2,100,g.wildOptions());assert.ok(d.pokemon.every(p=>p.weight===(!g.data.caught[p.id]?['rare','legendary','mythical'].includes(p.tier)?15:10:1)));
 const all=Object.fromEntries(data.pokemon.filter(p=>p.generation===2&&!J.specialIds.includes(p.id)).map(p=>[p.id,now]));
 for(const id of [243,244,245])assert.equal(captureBonus(id,all),.04);for(const id of [249,250,251])assert.equal(captureBonus(id,all),0);
 for(const id of [243,244,245])all[id]=now;assert.equal(captureBonus(249,all),.03);assert.equal(captureBonus(250,all),.03);all[249]=all[250]=now;assert.equal(captureBonus(251,all),.02);
});

test('every Johto species has an obtainable path, with starter/baby/special evolutions excluded from wild encounters',()=>{
 const g=fixture();for(const n of J.nodes.values())g.data.johto.cleared[n.id]=now;
 const panel=g.panelState(now),excluded=g.wildOptions().excluded;
 for(const p of panel.collection.filter(p=>p.id>=152)){assert.ok(p.acquisition.routes.length,p.id);if(J.noWild.has(p.id))assert.ok(excluded.includes(p.id));
  if(p.acquisition.summary==='특수진화')assert.equal(p.acquisition.wildAllowed,false,p.id);
 }
 for(const id of [123,127,131])assert.ok(!excluded.includes(id));assert.ok(wildEligible(species.get(123),2,100));
 g.addPokemon(131,30,'fixture',now);assert.ok(g.canReserveCapture(131));
 for(const id of [208,212,230,233])assert.ok(!wildEligible(species.get(id),2,100));
 assert.equal(panel.collection.find(p=>p.id===249).acquisition.routes[0].minimumLevel,50);
});

test('regional travel needs no second tutorial or starter selection; optional starter gifts cannot duplicate or fill slots',()=>{
 const g=fixture();idle(g);assert.equal(g.presentation(),null);assert.equal(g.canChallenge('j-arrival'),false);assert.ok(g.canChallenge(towerTraining[0]));
 assert.ok(g.challenge('j-partner-155',now));assert.equal(g.presentation(),null);assert.equal(g.challenge('j-partner-155',now),false);
 assert.equal(Object.values(g.data.owned).filter(p=>p.id===155).length,1);assert.deepEqual(g.data.slots,[25,null,null,null,null,null]);assert.equal(g.canChallenge('j-partner-152'),false);
 clear(g,['j-bugsy']);assert.equal(g.canChallenge('j-partner-152'),true);
});

test('story encounter capture, duplicate shiny persistence and ordinary activity remain separate',()=>{
 let g=fixture();clear(g,['j-jasmine']);g.data.caught[130]=now;idle(g);assert.ok(g.challenge('j-red-gyarados',now));pages(g);const b=g.data.battle;
 assert.ok(b.allowDuplicateCapture);assert.ok(g.snapshot(now).foe.shiny);b.foe.hp=b.foe.maxHp*.5;g.random=()=>0;assert.ok(g.capture(now));
 g.finishCapture(g.data.pendingBattle,now+20000);const shiny=Object.values(g.data.owned).find(p=>p.id===130&&p.shiny);assert.ok(shiny);assert.equal(g.data.workTokens,0);assert.equal(g.canChallenge('j-red-gyarados'),false);
 g.data.activeId=shiny.uid;g.data.slots=[shiny.uid,null,null,null,null,null];g=new Adventure(structuredClone(g.data),now+30000);
 assert.ok(g.snapshot(now+30000).hero.shiny);assert.ok(g.snapshot(now+30000).slots[0].shiny);assert.ok(g.panelState(now+30000).roster.find(p=>p.uid===shiny.uid).shiny);
});

test('regional state, challenge gates, parties and acquisition hints match PC and Android',()=>{
 const pc=fixture(),mobile=new Mobile(structuredClone(pc.data),now);assert.deepEqual(pc.panelState(now).johto,mobile.panelState(now).johto);assert.deepEqual(pc.panelState(now).collection,mobile.panelState(now).collection);
 clear(pc,towerTraining);mobile.data.johto=structuredClone(pc.data.johto);for(const g of [pc,mobile]){idle(g);assert.ok(g.challenge('j-sprout',now));}
 assert.deepEqual(pc.data.battle,mobile.data.battle);assert.deepEqual(pc.presentation(),mobile.presentation());
});

test('monthly reset restarts both regions but preserves the permanent dex and booster',()=>{
 const g=fixture();clear(g,['j-red']);g.data.caught[251]=now;const caught=structuredClone(g.data.caught),boost=g.experienceBoost();
 g.resetSeason(Date.parse('2026-11-01T01:00:00Z'));assert.equal(g.maxGeneration(),1);assert.deepEqual(g.data.caught,caught);assert.deepEqual(g.experienceBoost(),boost);assert.equal(g.data.johto,undefined);
});

test('friendship evolution requires a real level-up and remembers its daytime window',()=>{
 const g=fixture(),uid=g.addPokemon(133,15,'fixture',now),p=g.data.owned[uid];p.happiness=255;
 assert.ok(g.evolutions(uid,now).filter(e=>[196,197].includes(e.to)).every(e=>!e.ready));
 g.gainXp(uid,xpAt(133,16)-p.xp,now);const options=g.evolutions(uid,Date.parse('2026-10-19T16:00:00Z'));
 assert.ok(options.find(e=>e.to===196).ready);assert.ok(!options.find(e=>e.to===197).ready);assert.ok(g.evolve(uid,196,now));assert.ok(g.data.caught[196]);
});

test('Sketch copies persist with original lesson levels, across native turns and reload',()=>{
 let g=fixture();const uid=g.addPokemon(235,10,'fixture',now),p=g.data.owned[uid];g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;
 const b=g.data.battle={kind:'wild',party:{[uid]:g.memberCombatant(p)},foe:battle.combatant(129,20,[150]),turn:0,captureAttempts:0};
 const sim=battle.engine(g,b);sim.p2.active[0].lastMove=sim.dex.moves.get('splash');sim.p2.active[0].lastMoveUsed=sim.dex.moves.get('splash');
 // Use the actual native Sketch and its protocol, then let the adapter persist it.
 let copied=false;for(let i=0;i<4;i++){const r=battle.step(g,b);if(p.sketchLessons?.length){copied=true;break;}}
 assert.ok(copied);assert.ok(p.moves.includes(150));assert.ok(!p.moves.includes(166));assert.equal(access.catalog(p).find(m=>m.move===166).level,11);
 g=new Adventure(structuredClone(g.data),now+1);const loaded=g.data.owned[uid];assert.ok(loaded.moves.includes(150));assert.ok(!loaded.moves.includes(166));g.gainXp(uid,xpAt(235,11)-loaded.xp,now+2);assert.ok(loaded.moves.includes(166));
});

test('queued regional challenge survives reload and hands off only at a safe boundary',()=>{
 let g=fixture();clear(g,['j-falkner']);g.newWild(now);g.data.animation=null;g.data.switchUntil=0;g.nextTick=now;assert.ok(g.challenge('j-ruins',now));assert.equal(g.presentation(),null);
 g=new Adventure(structuredClone(g.data),now+1);assert.equal(g.data.pendingChallenge.index,'j-ruins');assert.equal(g.data.battle.kind,'wild');
 const paused=structuredClone(g.data.battle);assert.ok(g.tick(now+20000));assert.equal(g.presentation().kind,'johto-event');assert.equal(g.data.suspendedWild,null);assert.deepEqual(g.data.battle,paused);
 pages(g,now+20000);assert.ok(J.done(g,'j-ruins'));
});

test('event cards reveal only reached steps and do not fill the optional news list with future placeholders',()=>{
 const g=fixture();let s=J.snapshot(g);assert.ok(!s.cards.some(c=>c.id==='j-side'));assert.ok(!s.cards.flatMap(c=>c.steps).some(r=>r.title==='???'||r.id==='j-arrival'));
 assert.match(s.cards.find(c=>c.id==='j-early').description,/비상.*장로의 인정/);
 clear(g,['j-falkner']);s=J.snapshot(g);const side=s.cards.find(c=>c.id==='j-side');assert.deepEqual(side.steps.map(r=>r.id),['j-togepi','j-ruins']);
 assert.ok(side.steps.every(r=>r.revealed&&r.title!=='???'));assert.deepEqual(s.cards.find(c=>c.id==='j-well').steps.map(r=>r.id),['j-well-grunt']);
 clear(g,['j-well-grunt']);assert.deepEqual(J.snapshot(g).cards.find(c=>c.id==='j-well').steps.map(r=>r.id),['j-well-grunt','j-well-boss']);
 clear(g,['j-well-boss']);assert.match(J.snapshot(g).cards.find(c=>c.id==='j-well').description,/야돈.*돌아/);
});

test('related lake and town events share one case while minor travel connects through the next gym or league',()=>{
 const g=fixture();clear(g,['j-jasmine']);let s=J.snapshot(g);assert.ok(!s.cards.some(c=>c.id==='j-rocket-hq'));let c=s.cards.find(c=>c.id==='j-rage-lake');assert.equal(c.title,'분노의 호수');assert.equal(c.steps.length,1);
 clear(g,['j-red-gyarados']);c=J.snapshot(g).cards.find(c=>c.id==='j-rage-lake');assert.match(c.title,/황토마을/);assert.deepEqual(c.steps.map(r=>r.id),['j-red-gyarados','j-hq-grunt']);
 clear(g,['j-bugsy']);s=J.snapshot(g);assert.equal(s.gyms[2].preparation.id,'j-ilex');assert.ok(!s.special.some(r=>r.id==='j-ilex'));
 clear(g,['j-radio-final']);assert.equal(J.snapshot(g).gyms[7].preparation.id,'j-ice-path');clear(g,['j-clair']);assert.equal(J.snapshot(g).gyms[7].preparation.id,'j-dragon-den');
 clear(g,['j-dragon-den']);assert.equal(J.snapshot(g).leaguePreparation.id,'j-victory-road');
});

test('previous Kanto records remain separate from current Johto progression and cannot launch previous-generation challenges',()=>{
 const g=fixture();g.data.badges=data.bosses.slice(0,8).map(b=>b.id);g.data.leagueBest=5;clear(g,['j-falkner']);
 const before=structuredClone(g.data),s=g.panelState(now);assert.deepEqual(s.badges,['j-falkner']);assert.deepEqual(s.challengeHistory[1].badges,before.badges);assert.equal(s.challengeHistory[1].champion,true);assert.equal(s.challengeHistory[1].leagueBest,5);
 assert.ok(s.challengeHistory[1].gymAccess.every(v=>!v));assert.equal(g.challenge(8,now),false);assert.equal(g.challenge('rocket-grunt',now),false);assert.deepEqual(g.data,before);
});

test('explicit story wild battles advance native turns without paid activity and trainers cannot be captured',()=>{
 for(const Type of [Adventure,Mobile]){
  const g=fixture(Type);clear(g,['j-whitney']);idle(g);assert.ok(g.challenge('j-sudowoodo',now));pages(g);g.data.animation=null;g.data.switchUntil=0;g.nextTick=now;
  assert.ok(g.tick(now));assert.equal(g.data.workTokens,0);assert.ok(g.data.battle.sim);assert.ok(g.data.animation?.moveId);
  g.data.battle=null;g.data.pendingBattle=null;g.data.mobileStory.scene=null;clear(g,['j-sprout']);idle(g);assert.ok(g.challenge('j-falkner',now));pages(g);g.data.battle.foe.hp=1;assert.equal(g.capture(now),false);
 }
});

test('trade evolutions need their individual device level and consume the correct item once',()=>{
 const g=fixture();g.data.trainingDevice.obtainedAt=now;
 for(const [id,to,item]of [[61,186,198],[79,199,198],[95,208,210],[123,212,210],[117,230,212],[137,233,229]]){
  const uid=g.addPokemon(id,30,'fixture',now),p=g.data.owned[uid];g.data.inventory[item]=1;
  assert.equal(g.evolutions(uid,now).find(e=>e.to===to).ready,false);
  p.deviceLevelUp={from:id,before:29,level:30,at:now,autoPending:false};assert.ok(g.evolutions(uid,now).find(e=>e.to===to).ready);assert.ok(g.evolve(uid,to,now));assert.equal(g.data.inventory[item],0);assert.equal(g.evolve(uid,to,now),false);
 }
});

test('friendship targets do not activate from friendship gain without leveling, or change to the other time window later',()=>{
 const g=fixture(),uid=g.addPokemon(133,15,'fixture',now),p=g.data.owned[uid];p.happiness=219;g.gainXp(uid,1,now);
 assert.ok(p.happiness>=220);assert.ok(g.evolutions(uid,now).filter(e=>e.happiness).every(e=>!e.ready));
 const night=Date.parse('2026-10-19T15:00:00Z');g.gainXp(uid,xpAt(133,16)-p.xp,night);
 assert.ok(g.evolutions(uid,now+86400000).find(e=>e.to===197).ready);assert.equal(g.evolutions(uid,now+86400000).find(e=>e.to===196).ready,false);
});

test('a new League trainer clears Transform and stat stages without restoring HP, major status or base PP',()=>{
 const g=fixture(),uid=g.addPokemon(132,50,'fixture',now),p=g.data.owned[uid];g.data.slots=[uid,null,null,null,null,null];g.data.activeId=uid;
 g.battleBoss=()=>({name:'fixture',team:[{id:129,level:50,moves:[150]}]});
 const b=g.data.battle={kind:'trainer',bossIndex:'fixture',foeIndex:0,party:{[uid]:g.memberCombatant(p)},foe:battle.combatant(129,50,[150]),turn:0};
 const sim=battle.engine(g,b);for(let i=0;i<4&&!sim.p1.active[0].transformed;i++)battle.step(g,b);assert.ok(sim.p1.active[0].transformed);
 const mon=sim.p1.active[0];mon.hp=10;mon.status='brn';mon.boosts.atk=6;b.party[uid]=battle.readMon(mon);const before=b.party[uid];
 battle.prepareNextTrainer(g,b);assert.equal(before.hp,10);assert.equal(before.status,'burn');assert.equal(before.pp[144],9);assert.deepEqual(before.moves,[144]);assert.deepEqual(before.stages,{});assert.equal(before.appearance,undefined);
 const next=battle.engine(g,b);assert.equal(next.p1.active[0].transformed,false);assert.equal(next.p1.active[0].hp,10);assert.equal(next.p1.active[0].status,'brn');assert.equal(next.p1.active[0].boosts.atk,0);assert.equal(next.p1.active[0].moveSlots[0].pp,9);
});
