'use strict';
(async()=>{
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},wait=ms=>new Promise(r=>setTimeout(r,ms));
  const frame=document.getElementById('battle'),w=frame.contentWindow,d=frame.contentDocument,$=id=>d.getElementById(id);
  let clock=Date.now(),serial=1000;w.Date.now=()=>clock;active=false;back();
  const samples={};
  function fixture(hero,foe,heroMoves,foeMoves){
    game=new MobileCore.Adventure({},Date.now(),{random:()=>.73});game.data.mobileStory.onboarding='done';game.data.mobileStory.scene=null;
    const uid=game.addPokemon(hero,50,'fixture',Date.now()),other=game.addPokemon(7,50,'fixture',Date.now());
    game.data.eventSerial=serial+=100;game.data.activeId=uid;game.data.slots=[uid,other,null,null,null,null];game.data.owned[uid].moves=heroMoves;game.data.owned[other].moves=[33];game.data.caught[foe]=Date.now();game.data.workTokens=100000;
    game.data.battle={kind:'wild',party:Object.fromEntries([uid,other].map(id=>[id,game.memberCombatant(game.data.owned[id])])),foe:game.memberCombatant({id:foe,level:50,moves:foeMoves}),turn:0,captureAttempts:0};
    progression=new MobileProgression(game);game.data.workTokens=100000;return uid;
  }
  function act(id,actor='hero'){
    for(let i=0;i<5;i++){game.data.switchUntil=0;game.nextTick=0;game.tick(Date.now());if(game.data.animation?.moveId===id&&game.data.animation.actor===actor)return structuredClone(game.data.animation);}
    throw Error('Native move did not execute '+id);
  }
  async function at(event,ms){
    clock=event.at+ms;publish();await wait(100);
    for(let i=0;i<50;i++){if(['hero-image','foe-image'].every(id=>$(id).complete&&$(id).naturalWidth>0))return;await wait(20);}
    throw Error('Battle sprite did not load');
  }
  function sample(name,event,ms){samples[name]={data:JSON.parse(JSON.stringify(game.data)),clock:event.at+ms};}
  const canvas=d.createElement('canvas');canvas.width=185;canvas.height=79;const ctx=canvas.getContext('2d');
  function pixels(id,outcome='success'){
    const e={moveId:id,at:0,actor:'hero',moveTarget:'opponent',damage:10,outcome,hitCount:3},p=w.MoveEffects.profileFor(id);let count=0,hash=0;
    for(const u of [.35,.65]){w.MoveEffects.drawFrame(ctx,e,w.MoveEffects.frameFor(e,p.duration*u));const bytes=ctx.getImageData(0,0,185,79).data;for(let i=0;i<bytes.length;i+=4){if(bytes[i+3])count++;hash=(Math.imul(hash,31)+bytes[i]+bytes[i+1]*3+bytes[i+2]*7+bytes[i+3])>>>0;}}
    return {count,hash};
  }
  const catalog=Object.values(w.MoveEffects.profiles).map(p=>({id:p.id,...pixels(p.id)}));
  check(catalog.every(p=>p.count>0),'every one of '+catalog.length+' stored move effects draws visible pixels in the actual WebView');
  check(new Set([52,53,126].map(id=>pixels(id).hash)).size===3,'Ember, Flamethrower and Fire Blast have distinct rendered effects');
  check(pixels(105).hash!==pixels(105,'failed').hash&&pixels(164).hash!==pixels(164,'failed').hash&&pixels(144).hash!==pixels(144,'failed').hash,'failed recovery, Substitute and Transform do not show their successful effects');
  const uid=fixture(132,6,[144],[150]),e=act(144),t=w.BattlePacing.actionTiming(e);
  await at(e,t.announceMs-1);check($('hero-image').getAttribute('src')==='assets/132.gif','announcement still shows Ditto');sample('transform-before',e,t.announceMs-1);
  await at(e,t.impactAt+15);check($('hero-image').getAttribute('src')==='assets/6.gif','native Transform changes the actual hero sprite at impact');
  check($('hero-battle-name').textContent==='메타몽'&&game.data.owned[uid].id===132,'identity and ownership stay Ditto');
  check($('attack-fx').dataset.family==='transform'&&getComputedStyle($('hero')).filter!=='none','Transform has a dedicated morph and flash');sample('transform-morph',e,t.impactAt+15);
  await at(e,t.resultAt+100);check($('hero-image').getAttribute('src')==='assets/6.gif','copied appearance persists after the effect');sample('transform-after',e,t.resultAt+100);
  save();game=new MobileCore.Adventure(JSON.parse(Android.load()).game);progression=new MobileProgression(game);publish();await wait(100);
  check($('hero-image').getAttribute('src')==='assets/6.gif','copied sprite survives a real native save and reload');
  const legacy=JSON.parse(Android.load()).game;delete legacy.battle.foe.appearance;for(const p of Object.values(legacy.battle.party))delete p.appearance;
  game=new MobileCore.Adventure(legacy);progression=new MobileProgression(game);publish();await wait(100);check($('hero-image').getAttribute('src')==='assets/6.gif','old save restores the copied sprite from the simulator');
  fixture(6,132,[150],[144]);const foe=act(144,'foe'),ft=w.BattlePacing.actionTiming(foe);await at(foe,ft.impactAt+50);
  check($('foe-image').getAttribute('src')==='assets/6.gif'&&$('foe-name').textContent==='메타몽','opponent Transform also changes sprite while keeping identity');sample('opponent-transform',foe,ft.resultAt+100);
  fixture(143,129,[164],[150]);const sub=act(164),st=w.BattlePacing.actionTiming(sub);await at(sub,st.impactAt+40);
  check($('hero-image').getAttribute('src')==='assets/substitute.png','Substitute creates a persistent original-game decoy sprite');
  await at(sub,st.resultAt+100);check($('hero-image').getAttribute('src')==='assets/substitute.png','decoy remains after the transient effect');sample('substitute',sub,st.resultAt+100);
  const beforeHp=game.snapshot().hero.currentHp;publish();await wait(100);check(game.snapshot().hero.currentHp===beforeHp,'rendering cannot spend HP or PP again');
  for(const [id,move,key] of [[6,19,'fly'],[51,91,'dig']]){
    fixture(id,129,[move],[150]);const charge=act(move),ct=w.BattlePacing.actionTiming(charge);await at(charge,ct.impactAt+200);
    check(getComputedStyle($('hero-image')).visibility==='hidden',key+' hides the Pokemon while charging');sample(key+'-hidden',charge,ct.resultAt+100);
    const enemy=act(150,'foe'),et=w.BattlePacing.actionTiming(enemy);await at(enemy,et.announceMs+200);
    check(getComputedStyle($('hero-image')).visibility==='hidden',key+' remains hidden during the opponent action');
    const strike=act(move),tt=w.BattlePacing.actionTiming(strike);await at(strike,tt.announceMs+120);
    check(getComputedStyle($('hero-image')).visibility==='visible',key+' returns before its striking action');sample(key+'-return',strike,tt.announceMs+120);
  }
  serial=100000;
  globalThis.showBattleSample=async name=>{
    globalThis.sampleReady='';const s=samples[name];game=new MobileCore.Adventure(s.data);game.data.animation.serial=++serial;progression=new MobileProgression(game);clock=s.clock;publish();await wait(250);
    for(let i=0;i<50;i++){if(['hero-image','foe-image'].every(id=>$(id).complete&&$(id).naturalWidth>0))break;await wait(20);}
    globalThis.sampleDiagnostic=JSON.stringify({name,hero:game.snapshot().hero,foe:game.snapshot().foe,heroSrc:$('hero-image').getAttribute('src'),foeSrc:$('foe-image').getAttribute('src')});
    globalThis.sampleReady=name;
  };
  await showBattleSample('transform-after');save();globalThis.layoutResult={checks:checks.length,passed:checks};
})().catch(e=>{globalThis.layoutError=String(e.stack||e);});
