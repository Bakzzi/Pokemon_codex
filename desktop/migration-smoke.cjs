'use strict';
// Opt-in, isolated --smoke-test verification through the production publisher/IPC.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Adventure}=require('./adventure.cjs'),{Game}=require('./game.cjs'),K=require('../shared/kanto-journey.cjs'),W=require('../shared/kanto-world.cjs');
module.exports=async function(h){
 const checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(ok,label)=>{assert.ok(ok,label);checks.push(label);};
 const read=code=>h.getPanel().webContents.executeJavaScript(code);
 try{
  const now=Date.now(),old=new Adventure(new Game({},now).data,now);old.data.badges=['brock','misty'];
  Object.assign(old.data.kantoStory,{revision:1,legacy:true,cleared:{},fossil:null});Object.assign(old.data.kantoWorld,{location:'mt-moon',position:{...W.snapshot(old).map.points['mt-moon']},visited:{cerulean:now,'mt-moon':now}});
  old.newWild(now);const before=structuredClone(old.data);h.setGame(new Adventure(before,now));let g=h.getGame();
  check(JSON.stringify(g.data.battle)===JSON.stringify(before.battle)&&JSON.stringify(g.data.owned)===JSON.stringify(before.owned),'import preserves encounter and owned progress');
  check(!g.data.kantoStory.legacy&&!K.done(g,'k-moon-duo')&&!g.data.kantoStory.fossil,'badges do not invent the incident or reward');
  await h.openPanel('challenge');for(const w of [h.getPanel(),h.getWidget()])w.webContents.on('console-message',(_e,d)=>{if(d.level>=3)errors.push(d.message);});h.publish(true);await wait(180);
  check(h.snapshot().location.id==='mt-moon','actual widget publisher preserves imported location');
  check(await read('document.getElementById("kanto-case-moon-path").checkVisibility()&&!document.getElementById("kanto-case-moon-path").open'),'missing incident has a collapsed local card');
  await read('document.querySelector("#kanto-case-moon-path>summary").click()');await wait(80);
  check(await read('document.querySelectorAll("#kanto-case-moon-path [data-story-step]").length===6&&!document.querySelector("#kanto-case-moon-path").textContent.includes("지나온 단계")'),'full incident remains visible without invented passed stages');
  check(await read('document.querySelector("[data-story-step=k-moon-duo] h3").textContent.includes("???")'),'unmet future identity remains hidden');
  for(const id of K.cases.find(c=>c.id==='route3-path').entries)g.data.kantoStory.cleared[id]=now;
  g.data.battle=null;g.data.pendingBattle=null;g.data.switchUntil=0;g.nextTick=now;g.data.workTokens=250;
  const id=K.cases.find(c=>c.id==='moon-path').entries.find(id=>K.nodes.get(id).source?.class==='ROCKET');
  check(g.startAutomaticTrainer(id,now),'restored incident starts its real automatic opponent');h.publish(true);await wait(120);
  check(await h.getWidget().webContents.executeJavaScript('!document.getElementById("story-scene").hidden&&document.getElementById("story-portrait").dataset.sprite==="rocket-grunt"&&document.getElementById("story-portrait").naturalWidth>0'),'actual widget receives the Rocket pixel portrait');
  for(let i=0;i<20&&g.data.battle;i++){for(let j=0;j<4&&g.presentation()?.automatic;j++){const s=g.presentation();g.sceneTick(s.at+(s.duration||3000));}g.data.battle.foe.hp=0;g.defeatOpponent(Math.max(now,g.nextTick,g.data.switchUntil));}
  h.publish(true);await wait(120);check(K.done(g,id)&&await read('document.querySelector('+JSON.stringify('[data-story-step="'+id+'"] button')+').disabled'),'actual win updates its persistent row');
  for(const n of K.cases.find(c=>c.id==='moon-path').entries.filter(id=>K.nodes.get(id).automatic))g.data.kantoStory.cleared[n]=now;
  g.data.switchUntil=0;g.nextTick=Date.now();h.publish(true);await wait(100);
  await read('document.querySelector("[data-challenge=k-fossil-choice]").click()');await wait(100);
  check(g.presentation()?.next==='kanto-complete:k-fossil-choice'&&!g.data.kantoStory.fossil,'real panel IPC opens manual selection without granting a reward');
  check(K.gate(g,'cerulean')==='moon','forward passage remains closed before confirmation and final encounter');
  fs.writeFileSync(path.join(h.dataDir,'migration-panel.png'),(await h.getPanel().webContents.capturePage()).toPNG());
  check(errors.length===0,'no renderer errors');fs.writeFileSync(path.join(h.dataDir,'migration-main-result.json'),JSON.stringify({ok:true,checks,errors,version:h.app.getVersion()},null,2));h.app.exit(0);
 }catch(e){fs.mkdirSync(h.dataDir,{recursive:true});fs.writeFileSync(path.join(h.dataDir,'migration-main-error.txt'),e.stack||String(e));h.app.exit(1);}
};
