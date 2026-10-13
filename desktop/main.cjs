'use strict';
const {app,BrowserWindow,ipcMain,Menu,Tray,nativeImage,screen,dialog}=require('electron');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const {Game}=require('./game.cjs');
const {combatant}=require('./battle.cjs');
const nursery=require('./daycare.cjs');
const {CodexReader}=require('./codex-reader.cjs');
const {Store}=require('./store.cjs');
const demo=process.argv.includes('--demo'),smoke=process.argv.includes('--smoke-test');
const dataDir=smoke?(process.env.POKEMON_SMOKE_DIR||path.join(__dirname,'.smoke')):demo?path.join(__dirname,'.demo'):path.join(app.getPath('appData'),'PokemonCodexBuddy');
app.setPath('userData',dataDir);app.setName('Pokemon Codex Buddy');app.disableHardwareAcceleration();
let win,panel,tray,timer,game,store,reader,settings={},busy=false,lastRead=0,previous='',panelPrevious='',notice='';
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else{
  app.on('second-instance',()=>win?.showInactive());
  app.whenReady().then(start).catch(error=>{console.error(error);if(!smoke)dialog.showErrorBox('Pokémon Codex Buddy',error.message);app.exit(1);});
}
const webPreferences=()=>({preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false});
function secure(window){
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',e=>e.preventDefault());
}
function snapshot(){return {...game.snapshot(),source:reader?.status||{connected:false,files:0},compact:!!settings.compact,pinned:settings.pinned!==false,demo:demo||smoke,notice};}
function publish(force=false){
  const state=snapshot(),encoded=JSON.stringify(state);
  if(win&&!win.isDestroyed()&&(force||encoded!==previous)){win.webContents.send('state',state);previous=encoded;}
  if(panel&&!panel.isDestroyed()){
    const state={...game.panelState(),notice,demo:demo||smoke},encoded=JSON.stringify(state);
    if(force||encoded!==panelPrevious){panel.webContents.send('state',state);panelPrevious=encoded;}
  }
}
function save(){if(game&&!smoke&&!demo)store.save({version:2,game:game.data,settings});}
async function openPanel(tab='collection'){
  if(panel&&!panel.isDestroyed()){panel.webContents.send('tab',tab);panel.show();return;}
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  panel=new BrowserWindow({width:Math.min(920,area.width),height:Math.min(750,area.height),minWidth:650,minHeight:480,
    show:false,title:'포켓몬 도감 · Codex Buddy',backgroundColor:'#17231e',autoHideMenuBar:true,webPreferences:webPreferences()});
  secure(panel);panel.on('closed',()=>{panel=null;panelPrevious='';});
  await panel.loadFile(path.join(__dirname,'panels.html'),{query:{tab}});
  if(smoke)panel.setOpacity(0);
  panel.show();publish(true);
}
async function start(){
  store=new Store(dataDir);const saved=smoke||demo?{}:store.load();settings=saved.settings||{};game=new Game(saved.game);
  if(smoke){
    game.newWild(Date.now());game.data.battle.foe=combatant(19,5);game.data.seen={1:1,4:1,7:1,25:1,19:1};
    game.animate('encounter',{id:19,text:'야생 꼬렛 Lv.5 등장!'});
  }else if(demo)game.data.workTokens=25000;
  else reader=new CodexReader(path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions'),game);
  const area=screen.getPrimaryDisplay().workArea,width=400,height=settings.compact?268:456;
  let x=settings.x??area.x+area.width-width-28,y=settings.y??area.y+area.height-height-32;
  const display=screen.getDisplayMatching({x,y,width,height}).workArea;
  x=Math.max(display.x,Math.min(x,display.x+display.width-width));y=Math.max(display.y,Math.min(y,display.y+display.height-height));
  win=new BrowserWindow({width,height,x,y,frame:false,transparent:true,resizable:false,hasShadow:false,
    alwaysOnTop:settings.pinned!==false,skipTaskbar:true,show:false,title:'Pokemon Codex Buddy',
    backgroundColor:'#00000000',webPreferences:webPreferences()});
  secure(win);win.setAlwaysOnTop(settings.pinned!==false,'floating');
  win.on('moved',()=>{[settings.x,settings.y]=win.getPosition();});
  win.on('closed',()=>app.quit());
  ipcMain.on('ready',event=>{if(event.sender===win?.webContents||event.sender===panel?.webContents)publish(true);});
  ipcMain.on('action',(event,{action,value}={})=>{
    if(event.sender!==win?.webContents&&event.sender!==panel?.webContents)return;
    let result=true;notice='';
    try{
      if(action==='close'){app.quit();return;}
      if(action==='hide')win.hide();
      if(action==='pin'){settings.pinned=settings.pinned===false;win.setAlwaysOnTop(settings.pinned,'floating');}
      if(action==='compact'){
        settings.compact=!settings.compact;win.setResizable(true);win.setSize(400,settings.compact?268:456);win.setResizable(false);
        const b=win.getBounds(),a=screen.getDisplayMatching(b).workArea;
        win.setPosition(Math.max(a.x,Math.min(b.x,a.x+a.width-b.width)),Math.max(a.y,Math.min(b.y,a.y+a.height-b.height)));
      }
      if(action==='panel'){openPanel(['collection','challenge','journal','daycare'].includes(value)?value:'collection').catch(console.error);}
      if(action==='select')result=game.select(value);
      if(action==='slot')result=game.setSlot(value?.slot,value?.id);
      if(action==='evolve')result=game.evolve(value?.id,value?.to);
      if(action==='challenge')result=game.challenge(value);
      if(action==='abandon')result=game.abandon();
      if(action==='journal-ack')result=game.acknowledgeJournal();
      if(action==='daycare-preview')game.daycareSelection=Array.isArray(value)?value.slice(0,2).map(Number):[];
      if(action==='daycare-start')result=nursery.start(game,value);
      if(action==='daycare-withdraw')result=nursery.withdraw(game);
      if(!result)notice='지금은 실행할 수 없어요. 교체 연출이나 도전 조건을 확인해 주세요.';
      save();publish(true);
    }catch(error){console.error(error);notice='진행을 저장하지 못했어요. 저장 폴더를 확인해 주세요.';publish(true);}
  });
  await win.loadFile(path.join(__dirname,'index.html'));
  if(smoke)win.setOpacity(0);else createTray();
  win.showInactive();
  if(reader)await reader.poll();save();publish(true);
  if(!smoke)timer=setInterval(async()=>{
    if(busy)return;busy=true;
    try{
      if(reader&&Date.now()-lastRead>=1500){await reader.poll();lastRead=Date.now();}
      game.tick();save();publish();
    }catch(error){console.error(error);notice='진행 저장 오류 · 저장 폴더를 확인해 주세요.';clearInterval(timer);publish(true);}
    finally{busy=false;}
  },350);
  if(process.argv.includes('--capture-once')&&!smoke)setTimeout(async()=>{
    try{
      const s=snapshot();
      fs.writeFileSync(path.join(dataDir,'launch-check.json'),JSON.stringify({checkedAt:new Date().toISOString(),visible:win.isVisible(),bounds:win.getBounds(),version:s.version,phase:s.phase,source:s.source,hero:s.hero.name,level:s.level,outputTokens:s.outputTokens,limits:s.limits,caughtCount:s.caughtCount,generation:s.generation,slots:s.slots.map(p=>p.id)},null,2));
      fs.writeFileSync(path.join(dataDir,'widget.png'),(await win.webContents.capturePage()).toPNG());
    }catch(error){console.error(error.message);}
  },3000);
  if(smoke)await smokeTest();
}
function createTray(){
  const pixels=Buffer.alloc(16*16*4);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const d=Math.hypot(x-7.5,y-7.5),i=(y*16+x)*4;if(d>7)continue;
    let rgb=d>6||Math.abs(y-7.5)<1?[30,36,43]:y<8?[244,99,99]:[243,239,220];
    if(Math.hypot(x-7.5,y-7.5)<2)rgb=[243,239,220];
    pixels[i]=rgb[2];pixels[i+1]=rgb[1];pixels[i+2]=rgb[0];pixels[i+3]=255;
  }
  tray=new Tray(nativeImage.createFromBitmap(pixels,{width:16,height:16}));
  tray.setToolTip('Pokémon Codex Buddy');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'포켓몬 보기',click:()=>win.showInactive()},{label:'도감',click:()=>openPanel('collection')},
    {label:'도전하기',click:()=>openPanel('challenge')},{label:'키우미집',click:()=>openPanel('daycare')},{label:'모험 기록',click:()=>openPanel('journal')},
    {type:'separator'},{label:'종료',click:()=>app.quit()}
  ]));tray.on('click',()=>win.isVisible()?win.hide():win.showInactive());
}
async function smokeTest(){
  const dir=dataDir,errors=[];fs.mkdirSync(dir,{recursive:true});
  win.webContents.on('console-message',details=>{if(details.level>=3)errors.push(details.message);});
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  await wait(800);
  const inspection=await win.webContents.executeJavaScript("({hero:document.querySelector('#hero-name').textContent,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth,slots:document.querySelectorAll('[data-slot]').length,facing:getComputedStyle(document.querySelector('#hero-image')).transform})");
  fs.writeFileSync(path.join(dir,'widget.png'),(await win.webContents.capturePage()).toPNG());
  await openPanel('collection');await wait(600);
  const collection=await panel.webContents.executeJavaScript("({count:document.querySelectorAll('.dex-card').length,caught:document.querySelectorAll('.dex-card.caught').length,unknown:document.querySelector('.dex-card[data-id=\"2\"]').textContent,silhouette:document.querySelector('.dex-card[data-id=\"2\"]').classList.contains('unseen'),noPichu:!document.querySelector('.dex-card[data-id=\"172\"]'),overflow:document.documentElement.scrollWidth>innerWidth})");
  fs.writeFileSync(path.join(dir,'collection.png'),(await panel.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("document.querySelector('[data-slot=\"2\"]').click()");await wait(650);
  fs.writeFileSync(path.join(dir,'switch.png'),(await win.webContents.capturePage()).toPNG());
  await wait(750);
  const switched=game.data.activeId===7;
  await panel.webContents.executeJavaScript("document.querySelector('.dex-card[data-id=\"1\"]').click()");await wait(80);
  await panel.webContents.executeJavaScript("document.querySelector('[data-assign=\"2\"]').click()");await wait(1400);
  const assigned=game.data.slots[2]===1&&game.data.activeId===1;
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"challenge\"]').click()");await wait(100);
  fs.writeFileSync(path.join(dir,'challenge.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('[data-challenge=\"0\"]').click()");await wait(100);
  const challenge=game.data.battle?.kind==='trainer'&&game.data.battle.bossIndex===0;
  game.abandon();game.addPokemon(134,20,'fixture');game.addPokemon(132,20,'fixture');publish(true);
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"daycare\"]').click();document.querySelector('#parent-a').value='134';document.querySelector('#parent-b').value='132';document.querySelector('#parent-b').dispatchEvent(new Event('change'))");await wait(180);
  const preview=await panel.webContents.executeJavaScript("({name:document.querySelector('#egg-preview').textContent.includes('이브이의 알'),image:!!document.querySelector('#egg-preview img[src=\"assets/133.gif\"]'),overflow:document.documentElement.scrollWidth>innerWidth})");
  fs.writeFileSync(path.join(dir,'daycare.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('#daycare-start').click()");await wait(100);
  const boarded=game.isBoarded(134)&&game.isBoarded(132);
  nursery.advance(game,20000,Date.now());publish(true);await wait(100);
  const eggVisible=await panel.webContents.executeJavaScript("document.querySelector('#hatch-progress').textContent.includes('이브이의 알을 품는 중')");
  fs.writeFileSync(path.join(dir,'egg.png'),(await panel.webContents.capturePage()).toPNG());
  const parentXp=game.data.owned[134].xp;nursery.advance(game,35000,Date.now());publish(true);await wait(100);
  const hatched=Object.values(game.data.owned).some(p=>p.id===133&&p.level===5)&&game.data.owned[134].xp===parentXp;
  game.log('피카츄 Lv.5 → Lv.6','level',25);game.log('꼬렛 Lv.5 포획!','catch',19);game.data.adventure.totals.wins=12;game.data.adventure.totals.xp=620;
  publish(true);await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"journal\"]').click()");await wait(120);
  const summary=await panel.webContents.executeJavaScript("!document.querySelector('#journal-summary').hidden&&document.querySelectorAll('[data-journal-tab]').length===2&&document.querySelector('#summary-stats').textContent.includes('620')");
  fs.writeFileSync(path.join(dir,'journal-summary.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('[data-journal-tab=\"detail\"]').click()");await wait(100);
  const detail=await panel.webContents.executeJavaScript("!document.querySelector('#journal-detail').hidden&&document.querySelector('#journal-list').textContent.includes('포획!')");
  fs.writeFileSync(path.join(dir,'journal-detail.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('[data-journal-tab=\"summary\"]').click();document.querySelector('#journal-ack').click()");await wait(100);
  const acknowledged=game.panelState().summary.counts.wins===0&&game.data.journal.length>0;
  game.data.badges=['brock'];publish(true);await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"challenge\"]').click()");await wait(100);
  const earnedGymLocked=await panel.webContents.executeJavaScript("document.querySelector('[data-challenge=\"0\"]').disabled&&document.querySelector('[data-challenge=\"0\"]').textContent==='뱃지 획득 완료'");
  fs.writeFileSync(path.join(dir,'earned-gym.png'),(await panel.webContents.capturePage()).toPNG());
  const {learnedMoves,xpAt}=require('./pokemon.cjs');game.data.owned[25].level=50;game.data.owned[25].xp=xpAt(25,50);game.data.owned[25].moves=learnedMoves(25,50);publish(true);
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"collection\"]').click();document.querySelector('.dex-card[data-id=\"25\"]').click()");await wait(100);
  const allMoves=await panel.webContents.executeJavaScript("document.querySelectorAll('.move-list li').length>4&&document.querySelector('#detail').textContent.includes('특성 · 정전기')");
  fs.writeFileSync(path.join(dir,'all-moves.png'),(await panel.webContents.capturePage()).toPNG());
  game.data.workTokens=2000;game.data.switchUntil=0;game.nextTick=0;game.tick(Date.now());const nativeBattle=!!game.data.battle?.sim;
  game=new Game({},Date.now(),{random:()=>.73});
  for(const [uid,level] of [[1,10],[4,24],[25,12]]){const p=game.data.owned[uid];p.level=level;p.xp=xpAt(p.id,level);p.moves=learnedMoves(p.id,level);}
  game.addPokemon(133,1,'fixture');game.data.activeId=4;game.tick();publish(true);await wait(300);
  const autoRotation=game.data.activeId===7&&game.data.workTokens===0&&game.data.slots.join(',')==='1,4,7,25'&&
    await win.webContents.executeJavaScript("document.querySelector('#ball-fx').style.display==='block'&&document.querySelector('[data-id=\"7\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#speech').textContent.includes('레벨 균형')");
  fs.writeFileSync(path.join(dir,'auto-switch.png'),(await win.webContents.capturePage()).toPNG());await wait(1100);
  const autoSprite=await win.webContents.executeJavaScript("document.querySelector('#hero-image').getAttribute('src')==='assets/7.gif'&&document.documentElement.scrollWidth===innerWidth");
  game.newWild(Date.now());game.data.battle.foe=combatant(18,50,[98]);game.data.battle.party[7].hp=1;
  game.data.workTokens=250;game.nextTick=0;game.tick();publish(true);await wait(350);
  const faintRotation=game.data.activeId===1&&game.data.battle?.kind==='wild'&&
    await win.webContents.executeJavaScript("document.querySelector('[data-id=\"7\"]').disabled&&document.querySelector('[data-id=\"7\"]').textContent==='기절'&&document.querySelector('[data-id=\"1\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#speech').textContent.includes('기절')");
  fs.writeFileSync(path.join(dir,'faint-switch.png'),(await win.webContents.capturePage()).toPNG());await wait(1000);
  const {captureTiming}=require('./capture-animation.js');
  const prepareCatch=passes=>{
    game=new Game({},Date.now(),{random:()=>.73});game.newWild(Date.now());game.data.battle.foe=combatant(19,5);game.damageFoe(9999);
    let checks=0;game.random=()=>checks++<passes?0:.999999;game.capture(Date.now());return game.data.captureAnimation;
  };
  const caught=prepareCatch(4),timing=captureTiming(caught);publish(true);
  let captureThreeShakes=true;
  for(let i=0;i<3;i++){
    await wait(Math.max(0,caught.at+timing.shakeAt+timing.shakeEvery*i+150-Date.now()));
    captureThreeShakes=captureThreeShakes&&await win.webContents.executeJavaScript(`document.querySelector('#capture-fx').dataset.shake==='${i+1}'&&!document.querySelector('#capture-fx').hidden&&document.querySelector('#foe').hidden&&!document.querySelector('#speech').textContent.includes('성공')`);
    fs.writeFileSync(path.join(dir,'capture-shake-'+(i+1)+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  await wait(Math.max(0,caught.at+timing.resultAt+400-Date.now()));
  const captureSparkle=await win.webContents.executeJavaScript("!document.querySelector('#capture-sparkles').hidden&&document.querySelector('#capture-ball').classList.contains('caught')&&document.querySelector('#speech').textContent.includes('포획 성공!')");
  fs.writeFileSync(path.join(dir,'capture-sparkle.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,caught.at+timing.duration+200-Date.now()));publish(true);await wait(80);
  const caughtBallOnly=await win.webContents.executeJavaScript("document.querySelector('#foe').hidden&&!document.querySelector('#capture-fx').hidden&&document.querySelector('#empty-foe').hidden");
  fs.writeFileSync(path.join(dir,'capture-success.png'),(await win.webContents.capturePage()).toPNG());
  let captureBreakouts=true;
  for(const shakes of [1,2]){
    const c=prepareCatch(shakes),t=captureTiming(c);c.at=Date.now()-t.resultAt+100;publish(true);await wait(220);
    captureBreakouts=captureBreakouts&&!c.caught&&c.shakes===shakes&&await win.webContents.executeJavaScript("document.querySelector('#capture-fx').dataset.phase==='escaped'&&!document.querySelector('#foe').hidden&&document.querySelector('#speech').textContent.includes('아쉽다!')");
    fs.writeFileSync(path.join(dir,'capture-breakout-'+shakes+'.png'),(await win.webContents.capturePage()).toPNG());await wait(450);
    captureBreakouts=captureBreakouts&&await win.webContents.executeJavaScript("document.querySelector('#capture-fx').hidden&&!document.querySelector('#foe').hidden&&document.querySelector('#foe-image').style.opacity==='1'");
  }
  game.limits={primary:{used:25,minutes:300,resetsAt:Date.now()/1000+3600},secondary:{used:60,minutes:10080,resetsAt:Date.now()/1000+86400}};
  await win.webContents.executeJavaScript("document.querySelector('#compact').click();document.querySelector('#pin').click()");await wait(150);
  fs.writeFileSync(path.join(dir,'compact.png'),(await win.webContents.capturePage()).toPNG());
  const controls={switched,assigned,challenge,preview:preview.name&&preview.image&&!preview.overflow,boarded,eggVisible,hatched,summary,detail,acknowledged,earnedGymLocked,allMoves,nativeBattle,autoRotation,autoSprite,faintRotation,captureThreeShakes,captureSparkle,caughtBallOnly,captureBreakouts,compact:settings.compact===true,height:win.getSize()[1],pin:settings.pinned===false};
  const ok=inspection.hero==='피카츄'&&inspection.images&&!inspection.overflow&&inspection.slots===4&&inspection.facing.startsWith('matrix(-1')&&collection.count===151&&collection.caught===4&&collection.unknown.includes('???')&&collection.silhouette&&collection.noPichu&&!collection.overflow&&Object.values(controls).every(Boolean)&&controls.height===268&&!errors.length;
  fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({ok,inspection,collection,controls,errors},null,2));console.log(JSON.stringify({smoke:ok,inspection,collection,controls,errors}));app.exit(ok?0:1);
}
app.on('before-quit',()=>{clearInterval(timer);try{save();}catch{}tray?.destroy();});
app.on('window-all-closed',()=>app.quit());
