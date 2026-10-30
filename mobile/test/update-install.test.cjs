'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {Game}=require('../../desktop/game.cjs');
function fixture(){
  let now=Date.parse('2026-10-17T06:00:00Z'),stored={format:1,game:new Game({},Date.parse('2026-10-17T06:00:00Z')).data,mobile:{consumed:0}},saveOk=true;const calls=[],timers=[],intervals=[],elements=new Map();
  const status={steps:0,stepsEnabled:false,sensorSupported:false,tracking:false,sensor:'',update:'',updateReady:false,installing:false,pendingInstall:false,canInstall:true};
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,open:false,style:{},dataset:{},clientWidth:380,contentWindow:{postMessage(){}},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
  const native={load:()=>JSON.stringify(stored||{}),save:text=>{calls.push('save');if(saveOk)stored=JSON.parse(text);return saveOk;},foreground:()=>true,status:()=>JSON.stringify(status),ready(){},reportError(){},installUpdate(){calls.push('install');status.updateReady=false;status.installing=true;}};
  const c=vm.createContext({console,TextEncoder,TextDecoder,structuredClone,Date:class extends Date{static now(){return now;}},Android:native,MobileConfig:{name:'fixture',stepsPerAction:10},document:{getElementById:element},location:{origin:'https://game.pokemon.local'},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timers.push(fn),clearTimeout(){},clearInterval(){},addEventListener(){}});
  vm.runInContext('window=globalThis',c);
  for(const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js','mobile/web/progression.js','desktop/story-presentation.js','mobile/web/story-ui.js','mobile/web/app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
  const run=code=>vm.runInContext(code,c);
  return {status,calls,timers,run,tick:()=>intervals[0](),start:()=>run('mobileLifecycle(true)'),snapshot:()=>JSON.parse(run('JSON.stringify({game:game.data,mobile:progression.checkpoint(),active,catchingUp,updatePaused,fatal})')),stored:()=>stored,setSaveOk:value=>{saveOk=value;},advance:ms=>{now+=ms;}};
}
test('parked app displays and banks steps without granting battles or experience',()=>{
  const f=fixture();f.run("game.requestAction('story-travel',false)");f.start();const before=f.snapshot().game;
  for(const steps of [9,10,20,50000]){f.status.steps=steps;f.tick();f.advance(10000);}
  const after=f.snapshot().game;assert.equal(after.mapTravel.bank,before.mapTravel.bank+50000);assert.deepEqual({...after,mapTravel:null},{...before,mapTravel:null});assert.equal(f.snapshot().mobile.consumed,0);assert.equal(f.snapshot().mobile.lockConsumed,0);
});
test('opening the app grants one movement compensation and preserves its receipt through reload and full reset',()=>{
 const f=fixture();f.start();let s=f.stored();assert.equal(s.game.mapTravel.bank,2000);assert.equal(s.mobile.movementFixRewardClaimed,true);assert.equal(f.run('notice'),'업데이트 보상으로 이동 자원 1개를 받았어요.');
 f.start();f.run('mobileLifecycle(true,true)');s=f.stored();assert.equal(s.game.mapTravel.bank,2000);assert.equal(s.game.journal.filter(e=>e.text==='업데이트 보상으로 이동 자원 1개를 받았다!').length,1);
 f.run('$("reset-open").onclick();$("reset-accept").onclick();');f.start();f.run('mobileLifecycle(true,true)');s=f.snapshot();assert.equal(s.mobile.movementFixRewardClaimed,true);assert.equal(s.game.mapTravel.bank,0);assert.equal(s.game.journal.some(e=>e.text==='업데이트 보상으로 이동 자원 1개를 받았다!'),false);
});
test('a failed compensation save cannot persist either half of the grant and retry pays exactly once',()=>{
 const f=fixture();f.setSaveOk(false);f.start();assert.equal(f.snapshot().fatal,true);assert.equal(f.stored().mobile.movementFixRewardClaimed,undefined);assert.equal(f.stored().game.mapTravel,undefined);
 f.setSaveOk(true);f.run('fatal=false;mobileLifecycle(true,true)');assert.equal(f.stored().game.mapTravel.bank,2000);assert.equal(f.stored().mobile.movementFixRewardClaimed,true);f.run('mobileLifecycle(true,true)');assert.equal(f.stored().game.mapTravel.bank,2000);
});
for(const kind of ['wild','trainer','capture'])test('save and install immediately during '+kind+' without waiting for the battle or animation',()=>{
  const f=fixture();f.start();f.run(kind==='trainer'?"game.data.kantoWorld.location='route-22';game.challenge('rival-brock',Date.now())":'game.newWild(Date.now())');
  if(kind==='capture')f.run('game.data.pendingBattle={kind:"capture",at:Date.now()+60000}');
  f.run('game.nextTick=Date.now()+60000;game.data.switchUntil=game.nextTick');const before=f.snapshot();
  f.calls.length=0;f.status.updateReady=true;f.tick();
  assert.deepEqual(f.calls,['save','install']);assert.deepEqual(f.stored().game,before.game);assert.ok(f.stored().game.battle);assert.ok(f.stored().mobile.pausedAt>0);assert.equal(f.snapshot().active,false);
});
test('a ready update takes priority even when the foreground game is not active',()=>{
  const f=fixture();f.run('active=false');f.status.updateReady=true;f.tick();assert.deepEqual(f.calls,['save','install']);
});
test('a ready update stops queued lock catch-up before another action is spent',()=>{
  const f=fixture();f.status.lockMillis=10000000;f.start();const consumed=f.snapshot().mobile.consumed;assert.ok(f.timers.length);
  f.status.updateReady=true;f.timers.shift()();assert.equal(f.snapshot().mobile.consumed,consumed);assert.equal(f.stored().mobile.consumed,consumed);assert.equal(f.calls.at(-1),'install');
});
test('failed atomic save prevents installation and further game actions',()=>{
  const f=fixture();f.start();f.setSaveOk(false);f.status.updateReady=true;f.calls.length=0;f.tick();assert.deepEqual(f.calls,['save']);assert.equal(f.snapshot().fatal,true);f.tick();assert.deepEqual(f.calls,['save']);
});
test('missing install permission allows play, then installation starts as soon as permission is granted',()=>{
  const f=fixture();f.status.updateReady=true;f.status.canInstall=false;f.start();assert.equal(f.calls.includes('install'),false);assert.equal(f.snapshot().active,true);
  f.status.canInstall=true;f.tick();assert.equal(f.calls.at(-1),'install');
});
test('installation and system confirmation pause actions; failure resumes the saved battle without an extra turn',()=>{
  const f=fixture();f.start();f.run('game.newWild(Date.now())');f.status.updateReady=true;f.tick();const before=f.snapshot();
  f.advance(30000);f.tick();f.run('action("slot",{slot:0,id:25})');assert.deepEqual(f.snapshot().game,before.game);
  f.status.installing=false;f.status.pendingInstall=true;f.tick();assert.equal(f.snapshot().active,false);assert.deepEqual(f.snapshot().game,before.game);
  f.status.pendingInstall=false;f.tick();assert.equal(f.snapshot().active,true);assert.equal(f.snapshot().game.battle.turn,before.game.battle.turn);assert.equal(f.snapshot().game.battle.foe.hp,before.game.battle.foe.hp);assert.equal(f.calls.filter(c=>c==='install').length,1);
});
test('native resume reloads the saved background result before continuing the UI',()=>{
  const f=fixture();f.start();f.run('game.data.fixtureMarker="background result";progression.consumed=40;save();game.data.fixtureMarker="stale UI";progression.consumed=0;active=false;mobileLifecycle(true,true)');
  assert.equal(f.snapshot().game.fixtureMarker,'background result');assert.equal(f.snapshot().mobile.consumed,40);
});
test('reset requires a separate confirmation, discards progress and old walking rewards, then persists Oak',()=>{
  const f=fixture();f.status.steps=3210;f.status.lockMillis=654321;f.run('game.addPokemon(150,80,"fixture",Date.now());game.data.badges=["brock"];game.data.inventory[83]=4;save();');const before=f.stored();
  f.run('$("reset-open").onclick()');assert.equal(f.run('$("reset-confirm").open'),true);assert.deepEqual(f.stored(),before);
  f.run('$("reset-cancel").onclick()');assert.deepEqual(f.stored(),before);
  f.run('$("reset-open").onclick();$("reset-accept").onclick()');const s=f.stored();
  assert.equal(Object.keys(s.game.owned).length,1);assert.deepEqual(Object.keys(s.game.caught),['25']);assert.deepEqual(s.game.badges,[]);assert.deepEqual(s.game.inventory,{});assert.equal(s.mobile.consumed,3210);assert.equal(s.mobile.lockConsumed,654321);assert.equal(s.game.mobileStory.scene.sprite,'oak');assert.equal(f.run('$("reset-confirm").open'),false);
  f.run('mobileLifecycle(true,true)');assert.equal(f.snapshot().game.mobileStory.scene.sprite,'oak');assert.equal(f.snapshot().mobile.consumed,3210);
});
