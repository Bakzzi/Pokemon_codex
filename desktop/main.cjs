'use strict';
const {app,BrowserWindow,ipcMain,Menu,Tray,nativeImage,screen,dialog,safeStorage,powerMonitor}=require('electron');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const {Adventure:Game}=require('./adventure.cjs');
const {combatant}=require('./battle.cjs');
const nursery=require('./daycare.cjs');
const {CodexReader}=require('./codex-reader.cjs');
const {ClaudeReader}=require('./claude-reader.cjs');
const agents=require('./agent-status.js');
const {RemoteCodex}=require('./remote-codex.cjs');
const {Store}=require('./store.cjs');
const placement=require('./window-placement.cjs');
const pinning=require('./window-pinning.cjs');
const {AutoUpdate,canRestart,markHealthy}=require('./auto-update.cjs');
const demo=process.argv.includes('--demo'),smoke=process.argv.includes('--smoke-test');
const dataDir=smoke?(process.env.POKEMON_SMOKE_DIR||path.join(__dirname,'.smoke')):demo?path.join(__dirname,'.demo'):path.join(app.getPath('appData'),'PokemonCodexBuddy');
app.setPath('userData',dataDir);app.setName(agents.name);app.disableHardwareAcceleration();
let win,panel,tray,timer,game,store,reader,claudeReader,remotes,widgetPlacement,widgetPinning,settings={},busy=false,lastRead=0,previous='',panelPrevious='',notice='';
let updater,updating=false,resetting=false,healthyTicks=0;
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else{
  app.on('second-instance',()=>win?.showInactive());
  app.whenReady().then(start).catch(error=>{console.error(error);if(!smoke)dialog.showErrorBox(agents.name,error.message);app.exit(1);});
}
const webPreferences=()=>({preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false});
function secure(window){
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',e=>e.preventDefault());
}
function snapshot(){
  const source=agents.combine(reader?.status,claudeReader?.status,remotes?.snapshot().connections||[]);
  const update=updater?.snapshot();
  const state=game.snapshot();if(!source.limitsProvider&&source.agents.claude.connected)state.limits=state.limits.map(limit=>({...limit,left:null,resetsAt:null}));
  return {...state,source,compact:!!settings.compact,pinned:settings.pinned!==false,demo:demo||smoke,update,notice:notice||update?.notice||''};
}
function publish(force=false){
  const state=snapshot(),encoded=JSON.stringify(state);
  if(win&&!win.isDestroyed()&&(force||encoded!==previous)){win.webContents.send('state',state);previous=encoded;}
  if(panel&&!panel.isDestroyed()){
    const state={...game.panelState(),source:snapshot().source,remote:remotes?.snapshot()||{connections:[],canRemember:false},update:updater?.snapshot(),notice:notice||updater?.snapshot().notice||'',demo:demo||smoke},encoded=JSON.stringify(state);
    if(force||encoded!==panelPrevious){panel.webContents.send('state',state);panelPrevious=encoded;}
  }
}
function save(){if(game&&!smoke&&!demo)store.save({version:2,game:game.data,settings});}
async function resetProgress(){
  if(resetting||updating)return;resetting=true;
  try{
    const result=await dialog.showMessageBox(panel||win,{type:'warning',title:'처음부터 다시 시작할까요?',message:'도감·동료·아이템·모든 게임 진행을 초기화해요.',detail:'에이전트 연동과 위젯 설정은 유지돼요.',buttons:['취소','모두 지우고 시작'],defaultId:0,cancelId:0,noLink:true});
    if(result.response!==1)return;
    for(let i=0;busy&&i<100;i++)await new Promise(r=>setTimeout(r,50));
    if(busy||updating){notice='작업 기록을 확인하고 있어요. 잠시 후 다시 시도해 주세요.';return;}
    save();game.resetProgress();notice='새 모험을 시작해요.';save();win.showInactive();
  }finally{resetting=false;publish(true);}
}
async function openPanel(tab='collection'){
  if(panel&&!panel.isDestroyed()){panel.webContents.send('tab',tab);panel.show();return;}
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  panel=new BrowserWindow({width:Math.min(920,area.width),height:Math.min(750,area.height),minWidth:650,minHeight:480,
    show:false,title:'포켓몬 도감 · '+agents.name,backgroundColor:'#17231e',autoHideMenuBar:true,webPreferences:webPreferences()});
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
  else {
    reader=new CodexReader(path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions'),game);
    claudeReader=new ClaudeReader(path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'projects'),game);
    remotes=new RemoteCodex(game,dataDir,{vault:{available:()=>safeStorage.isEncryptionAvailable(),encrypt:value=>safeStorage.encryptString(value).toString('base64'),decrypt:value=>safeStorage.decryptString(Buffer.from(value,'base64'))},onChange:()=>publish()});
  }
  const area=screen.getPrimaryDisplay().workArea,{width,height}=placement.size(settings.compact);
  let x=settings.x??area.x+area.width-width-28,y=settings.y??area.y+area.height-height-32;
  const display=screen.getDisplayMatching({x,y,width,height}).workArea;
  ({x,y}=placement.fit({x,y,width,height},display));
  win=new BrowserWindow({width,height,x,y,frame:false,transparent:true,resizable:false,hasShadow:false,thickFrame:false,maximizable:false,fullscreenable:false,
    alwaysOnTop:settings.pinned!==false,skipTaskbar:true,show:false,title:agents.name,
    backgroundColor:'#00000000',webPreferences:webPreferences()});
  secure(win);widgetPinning=pinning.attach(win,{pinned:settings.pinned!==false,powerMonitor,screen});
  widgetPlacement=placement.attach(win,screen,(x,y)=>{settings.x=x;settings.y=y;});
  widgetPlacement.place({x,y,width,height});
  win.on('closed',()=>app.quit());
  ipcMain.on('ready',event=>{if(event.sender===win?.webContents||event.sender===panel?.webContents)publish(true);});
  ipcMain.on('action',(event,{action,value}={})=>{
    if(event.sender!==win?.webContents&&event.sender!==panel?.webContents)return;
    if(action==='reset-game'){resetProgress().catch(error=>{console.error(error);notice='초기화를 완료하지 못했어요.';publish(true);});return;}
    if(resetting)return;
    let result=true;notice='';
    try{
      if(action==='close'){app.quit();return;}
      if(action==='hide')win.hide();
      if(action==='pin'){settings.pinned=settings.pinned===false;widgetPinning.setPinned(settings.pinned);}
      if(action==='compact'){
        settings.compact=!settings.compact;win.setResizable(true);widgetPlacement.resize(settings.compact);win.setResizable(false);
      }
      if(action==='panel'){openPanel(['collection','challenge','journal','daycare','connections'].includes(value)?value:'collection').catch(console.error);}
      if(action==='story-open')win.showInactive();
      if(action==='remote-add'&&remotes)result=!!remotes.add(value?.config,value?.secret||'',!!value?.remember);
      if(action==='remote-connect'&&remotes)result=remotes.connect(value?.id,value?.credentials);
      if(action==='remote-stop'&&remotes)result=remotes.stop(value);
      if(action==='remote-remove'&&remotes)result=remotes.remove(value);
      if(action==='remote-trust'&&remotes)result=remotes.trust(value?.id,value?.fingerprint);
      if(action==='remote-key-file'&&panel){
        dialog.showOpenDialog(panel,{title:'SSH 개인키 선택',properties:['openFile']}).then(result=>{if(!result.canceled&&panel&&!panel.isDestroyed())panel.webContents.send('key-file',result.filePaths[0]);}).catch(()=>{});
      }
      if(['select','slot','evolve','daycare-start','daycare-withdraw','abandon','johto-stay','johto-unlock','device-claim','device-learner'].includes(action))result=game.requestAction(action,value);
      if(action==='action-cancel')result=game.cancelAction(value);
      if(action==='capture-reserve')result=game.reserveCapture(value,1);
      if(action==='capture-cancel')result=game.reserveCapture(value,0);
      if(action==='challenge'){result=game.challenge(value);if(result&&game.presentation())win.showInactive();}
      if(action==='challenge-cancel')result=game.cancelChallenge();
      if(action==='scene-next'&&!game.advanceScene(value))return;
      if(action==='safari-return')result=game.returnSafari();
      if(action==='daycare-preview')game.daycareSelection=Array.isArray(value)?value.slice(0,2).map(Number):[];
      if(!result)notice='이 선택은 예약할 수 없어요. 동료·진화 경로·도전 조건을 확인해 주세요.';
      save();publish(true);
    }catch(error){if(action?.startsWith('remote-'))notice=error.message;else{console.error(error);notice='진행을 저장하지 못했어요. 저장 폴더를 확인해 주세요.';}publish(true);}
  });
  await win.loadFile(path.join(__dirname,'index.html'));
  if(smoke)win.setOpacity(0);else createTray();
  win.showInactive();
  if(reader)await Promise.all([reader.poll(),claudeReader.poll()]);remotes?.start();save();publish(true);
  if(!smoke&&!demo&&process.platform==='win32'&&app.isPackaged&&path.basename(process.execPath).toLowerCase()==='pokemoncodex.exe'){
    try{
      updater=new AutoUpdate({installRoot:path.dirname(process.execPath),dataDir,version:app.getVersion(),enabled:settings.autoUpdate!==false,
        onChange:()=>{updateTray();publish(true);},canRestart:()=>!busy&&!updating&&!(panel&&!panel.isDestroyed()&&panel.isVisible())&&canRestart(game),
        prepareRestart:()=>{if(busy||updating||!canRestart(game))return false;updating=true;save();},resume:()=>{updating=false;},quit:()=>app.quit()});
      updater.start();updateTray();
    }catch(error){console.error('Automatic updates unavailable:',error.message);}
  }
  if(!smoke)timer=setInterval(async()=>{
    if(busy||updating||resetting)return;
    // Claim the gap before creating the next action; continuous adventures
    // otherwise start another animation before an updater ever sees a gap.
    if(updater&&await updater.maybeApply())return;
    if(busy||updating||resetting)return;busy=true;
    try{
      if(reader&&Date.now()-lastRead>=1500){await Promise.all([reader.poll(),claudeReader.poll()]);lastRead=Date.now();}
      remotes?.poll();game.tick();save();publish();
      if(++healthyTicks===3){const token=process.argv.find(a=>a.startsWith('--update-transaction='))?.split('=')[1];if(token)try{markHealthy(path.dirname(process.execPath),app.getVersion(),token);}catch(error){console.error('Update startup confirmation failed:',error.message);}}
    }catch(error){console.error(error);notice='진행 저장 오류 · 저장 폴더를 확인해 주세요.';clearInterval(timer);publish(true);}
    finally{busy=false;}
  },350);
  if(process.argv.includes('--capture-once')&&!smoke)setTimeout(async()=>{
    try{
      const s=snapshot();
      fs.writeFileSync(path.join(dataDir,'launch-check.json'),JSON.stringify({checkedAt:new Date().toISOString(),visible:win.isVisible(),bounds:win.getBounds(),version:s.version,appVersion:app.getVersion(),phase:s.phase,source:s.source,hero:s.hero.name,level:s.level,outputTokens:s.outputTokens,limits:s.limits,caughtCount:s.caughtCount,generation:s.generation,slots:s.slots.map(p=>p.id)},null,2));
      fs.writeFileSync(path.join(dataDir,'widget.png'),(await win.webContents.capturePage()).toPNG());
    }catch(error){console.error(error.message);}
  },3000);
  if(smoke)await (process.argv.includes('--johto-smoke')?johtoSmokeTest():process.argv.includes('--safari-smoke')?safariSmokeTest():smokeTest());
}
async function johtoSmokeTest(){
  const assert=require('node:assert/strict'),checks=[],errors=[],J=require('../shared/johto.cjs');
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(ok,label)=>{assert.ok(ok,label);checks.push(label);};
  const click=code=>win.webContents.executeJavaScript(code),read=code=>panel.webContents.executeJavaScript(code);
  win.webContents.on('console-message',(_e,d)=>{if(d.level>=3)errors.push(d.message);});
  try{
    const at=Date.now(),old=new(require('./game.cjs').Game)({},at);old.data.champion=true;game=new Game(old.data,at,{random:()=>.73});
    check(game.unlockJohto(at,[25]),'regional transfer initializes a separate Johto story');game.data.animation=null;game.data.switchUntil=0;game.nextTick=at;
    await openPanel('challenge');panel.webContents.on('console-message',(_e,d)=>{if(d.level>=3)errors.push(d.message);});publish(true);await wait(150);
    check(await read("document.getElementById('kanto-challenges').hidden&&!document.getElementById('johto-challenges').hidden"),'actual panel publisher selects the Johto challenge renderer');
    check(await read("document.querySelectorAll('#johto-challenges details[open]').length===0"),'all Johto challenge sections start collapsed');
    check(await read("document.querySelectorAll('#johto-badge-slots .badge-slot').length===8"),'actual panel contains eight regional badge seats');
    await read("document.getElementById('j-lab').open=true;document.querySelector('[data-challenge=\"j-arrival\"]').click()");await wait(120);
    check(game.presentation()?.kind==='johto-event','real panel IPC opens Elm dialogue');
    check(await click("!document.getElementById('story-scene').hidden&&document.getElementById('story-portrait').getAttribute('src').endsWith('j-elm.png')"),'actual widget receives and renders Elm through snapshot/publish/IPC');
    const scene=game.presentation().id;for(let i=0;i<5&&game.presentation()?.id===scene;i++){await click("document.getElementById('story-next').click()");await wait(80);}
    check(J.done(game,'j-arrival'),'real widget taps finish the event exactly once');
    game.data.animation=null;game.data.switchUntil=0;game.nextTick=Date.now();publish(true);await wait(80);
    await read("document.querySelector('[data-challenge=\"j-partner-155\"]').click()");await wait(80);await click("document.getElementById('story-next').click()");await wait(80);
    check(Object.values(game.data.owned).some(p=>p.id===155),'real event tap grants selected partner');
    check(game.data.slots.filter(Boolean).length===1,'a gift preserves intentionally empty party slots');
    game.data.animation=null;game.data.switchUntil=0;game.nextTick=Date.now();publish(true);await wait(60);
    await read("document.getElementById('j-early').open=true;document.querySelector('[data-challenge=\"j-sprout\"]').click()");await wait(120);
    check(game.data.battle?.johtoId==='j-rival-0','actual challenge IPC performs the hidden rival intercept');
    check(await click("document.getElementById('story-portrait').getAttribute('src').endsWith('j-silver.png')"),'actual widget renders the regional rival sprite');
    for(let i=0;i<5&&game.presentation()?.mode==='dialogue';i++){await click("document.getElementById('story-next').click()");await wait(70);}
    game.sceneTick(Date.now()+4000);game.data.switchUntil=0;game.nextTick=Date.now();game.tick();publish(true);await wait(150);
    check(game.data.workTokens===0&&!!game.data.animation,'explicit regional battle advances without token credit');
    check(snapshot().battle?.johtoId==='j-rival-0','actual widget snapshot preserves regional battle identity');
    game.data.battle=null;game.data.pendingBattle=null;game.data.mobileStory.scene=null;game.data.animation=null;game.data.switchUntil=0;game.data.johto.cleared['j-falkner']=at;publish(true);await wait(80);
    check(await read("document.querySelectorAll('#johto-badge-slots .earned .badge-art').length===1"),'actual panel displays the earned regional badge');
    const uid=game.addPokemon(130,30,'fixture',at);game.data.owned[uid].shiny=true;game.data.activeId=uid;game.data.slots=[uid,null,null,null,null,null];game.animate('result',{text:'검증'},Date.now());publish(true);await wait(120);
    check(await click("document.getElementById('hero-image').getAttribute('src')==='assets/shiny/130.gif'"),'actual widget retains shiny appearance outside battle');
    check(await read("Array.from(document.querySelectorAll('#johto-challenges img')).filter(i=>i.complete).every(i=>i.naturalWidth>0)"),'visible regional images resolve from packaged assets');
    assert.deepEqual(errors,[]);fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(path.join(dataDir,'johto-main-widget.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(dataDir,'johto-main-panel.png'),(await panel.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(dataDir,'johto-main-result.json'),JSON.stringify({ok:true,checks,errors,version:app.getVersion(),statePath:'main snapshot -> publish -> preload -> renderer; panel actions -> actual IPC handler'},null,2));app.exit(0);
  }catch(error){fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(path.join(dataDir,'johto-main-error.txt'),error.stack||String(error));console.error(error);app.exit(1);}
}
async function safariSmokeTest(){
  const assert=require('node:assert/strict'),safari=require('../shared/safari.cjs'),checks=[],errors=[];
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const check=(ok,label)=>{assert.ok(ok,label);checks.push(label);};
  win.webContents.on('console-message',(_e,d)=>{if(d.level>=3)errors.push(d.message);});
  try{
    const at=Date.now();game=new Game(new (require('./game.cjs').Game)({},at).data,at,{random:()=>0});
    game.data.badges=['brock','misty','surge','erika','koga'];game.newWild(at);game.data.animation=null;game.data.switchUntil=0;game.nextTick=at;game.data.workTokens=64624;
    publish(true);await wait(120);
    await win.webContents.executeJavaScript("window.buddy.action('challenge','safari-start')");await wait(100);game.tick(Date.now());publish(true);await wait(100);
    check(game.presentation()?.kind==='safari','actual IPC challenge opens Safari dialogue');
    for(let n=0;n<8&&game.presentation();n++){await win.webContents.executeJavaScript("document.getElementById('story-next').click()");await wait(100);}
    check(!!game.data.mobileStory.safari.trip,'actual dialogue click starts expedition');
    check(!!snapshot().safari?.active,'actual widget publisher includes Safari state');
    check(await win.webContents.executeJavaScript("!document.getElementById('safari-scene').hidden"),'actual widget shows Safari scene');
    check(await win.webContents.executeJavaScript("getComputedStyle(document.getElementById('hero')).display==='none'&&getComputedStyle(document.getElementById('foe')).display==='none'"),'actual widget hides both Pokemon');
    check(await win.webContents.executeJavaScript("document.getElementById('status').textContent==='사파리 탐험 중'"),'actual widget labels expedition');
    const battle=JSON.stringify(game.data.battle),xp=game.data.owned[game.data.activeId].xp,work=game.data.workTokens,clock=Math.max(Date.now(),game.nextTick,game.data.switchUntil)+1000;
    for(let n=0;n<30;n++)game.tick(clock+n*350);
    check(JSON.stringify(game.data.battle)===battle,'thirty real clock pulses preserve paused wild opponent and PP');
    check(game.data.owned[game.data.activeId].xp===xp&&game.data.workTokens===work,'Safari clock does not spend banked work or grant battle XP');
    const message=n=>({type:'event_msg',timestamp:new Date(clock).toISOString(),payload:{type:'token_count',info:{total_token_usage:{output_tokens:n,total_tokens:n}}}});
    game.observe('safari-smoke',message(0),{baseline:true,now:clock});game.observe('safari-smoke',message(1250),{now:clock});publish(true);await wait(100);
    check(snapshot().safari.encounterCount===1&&JSON.stringify(game.data.battle)===battle,'real agent observation explores while wild remains paused');
    check(await win.webContents.executeJavaScript("!document.getElementById('safari-ball').hidden"),'actual widget animates the recorded capture');
    fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(path.join(dataDir,'safari-widget.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript("window.buddy.action('safari-return')");await wait(120);
    check(!game.data.mobileStory.safari.trip&&await win.webContents.executeJavaScript("document.getElementById('safari-scene').hidden"),'actual IPC return restores ordinary widget');
    check(game.tick(clock+20000)&&game.data.workTokens<work,'wild battle resumes only after returning');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dataDir,'safari-main-result.json'),JSON.stringify({ok:true,checks,errors,version:app.getVersion(),statePath:'main snapshot -> publish -> preload -> renderer'},null,2));app.exit(0);
  }catch(error){fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(path.join(dataDir,'safari-main-error.txt'),error.stack||String(error));console.error(error);app.exit(1);}
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
  tray.setToolTip(agents.name);
  updateTray();tray.on('click',()=>win.isVisible()?win.hide():win.showInactive());
}
function updateTray(){
  if(!tray||tray.isDestroyed())return;
  const update=updater?.snapshot();
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'포켓몬 보기',click:()=>win.showInactive()},{label:'포켓기어',click:()=>openPanel('collection')},
    {label:'도전하기',click:()=>openPanel('challenge')},{label:'가방보기',click:()=>openPanel('daycare')},{label:'모험 기록',click:()=>openPanel('journal')},
    {label:'AI Agent 연동 설정',click:()=>openPanel('connections')},
    {type:'separator'},{label:'v'+app.getVersion()+(update?' · '+update.label:''),enabled:false},
    {label:'자동 업데이트',type:'checkbox',checked:settings.autoUpdate!==false,enabled:!!updater,click:item=>{settings.autoUpdate=item.checked;save();updater.setEnabled(item.checked);}},
    {label:'업데이트 확인',enabled:!!updater&&!['downloading','staging','applying'].includes(update?.phase),click:()=>updater?.check(true)},
    {type:'separator'},{label:'종료',click:()=>app.quit()}
  ]));
}
async function smokeTest(){
  const dir=dataDir,errors=[];fs.mkdirSync(dir,{recursive:true});
  win.webContents.on('console-message',details=>{if(details.level>=3)errors.push(details.message);});
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const finishPresentation=()=>wait(Math.max(0,game.data.switchUntil-Date.now())+30);
  await wait(800);
  const inspection=await win.webContents.executeJavaScript("({hero:document.querySelector('#hero-name').textContent,images:[...document.images].every(i=>i.hidden||i.complete&&i.naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth,slots:document.querySelectorAll('[data-slot]').length,facing:getComputedStyle(document.querySelector('#hero-image')).transform})");
  const headerLayout=await win.webContents.executeJavaScript(`(()=>{
    const label=document.querySelector('#connection-label'),original=label.textContent,pin=document.querySelector('#pin').getBoundingClientRect(),brand=document.querySelector('.brand').getBoundingClientRect();
    const fits=['연결됨','연결 대기','미리보기'].every(text=>{label.textContent=text;const r=label.parentElement.getBoundingClientRect();return r.left>=brand.right&&r.right<=pin.left&&pin.left-r.right<=8&&Math.abs((r.top+r.bottom-pin.top-pin.bottom)/2)<2;});
    label.textContent=original;return fits&&label.closest('.toolbar')!==null;
  })()`);
  fs.writeFileSync(path.join(dir,'widget.png'),(await win.webContents.capturePage()).toPNG());
  await openPanel('collection');await wait(600);
  const collection=await panel.webContents.executeJavaScript("({count:document.querySelectorAll('.dex-card').length,caught:document.querySelectorAll('.dex-card.caught').length,unknown:document.querySelector('.dex-card[data-id=\"2\"]').textContent,silhouette:document.querySelector('.dex-card[data-id=\"2\"]').classList.contains('unseen'),noPichu:!document.querySelector('.dex-card[data-id=\"172\"]'),overflow:document.documentElement.scrollWidth>innerWidth})");
  fs.writeFileSync(path.join(dir,'collection.png'),(await panel.webContents.capturePage()).toPNG());
  await finishPresentation();
  await win.webContents.executeJavaScript("document.querySelector('[data-slot=\"2\"]').click()");await wait(30);
  const switchAt=game.data.animation.at;
  await wait(Math.max(0,switchAt+350-Date.now()));
  const recallBall=await win.webContents.executeJavaScript("document.querySelector('#ball-fx').dataset.phase==='recall-throw'&&document.querySelector('#ball-fx').style.display==='block'&&document.querySelector('#hero-image').getAttribute('src')==='assets/25.gif'&&document.querySelector('#hero-battle-name').textContent==='피카츄'");
  fs.writeFileSync(path.join(dir,'switch-recall-throw.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,switchAt+950-Date.now()));
  const recallAbsorb=await win.webContents.executeJavaScript("document.querySelector('#ball-fx').dataset.phase==='absorb'&&!document.querySelector('#switch-beam').hidden&&Number(document.querySelector('#hero-image').style.opacity)<.75&&new DOMMatrix(getComputedStyle(document.querySelector('#hero-image')).transform).m41===0");
  fs.writeFileSync(path.join(dir,'switch-absorb.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,switchAt+1750-Date.now()));
  const recallReturn=await win.webContents.executeJavaScript("document.querySelector('#ball-fx').dataset.phase==='return-ball'&&document.querySelector('#hero-image').style.opacity==='0'&&document.querySelector('#hero-hud').hidden");
  await wait(Math.max(0,switchAt+2850-Date.now()));
  const sendBall=await win.webContents.executeJavaScript("document.querySelector('#ball-fx').dataset.phase==='send-throw'&&document.querySelector('#ball-fx').style.display==='block'&&document.querySelector('#hero-image').style.opacity==='0'&&document.querySelector('#hero-image').getAttribute('src')==='assets/7.gif'");
  fs.writeFileSync(path.join(dir,'switch-send-throw.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,switchAt+3700-Date.now()));
  const sendRelease=await win.webContents.executeJavaScript("document.querySelector('#ball-fx').dataset.phase==='release'&&!document.querySelector('#switch-flash').hidden&&Number(document.querySelector('#hero-image').style.opacity)>0&&Number(document.querySelector('#hero-image').style.opacity)<1&&new DOMMatrix(getComputedStyle(document.querySelector('#hero-image')).transform).m41===0&&document.querySelector('#hero-battle-name').textContent==='꼬부기'");
  fs.writeFileSync(path.join(dir,'switch.png'),(await win.webContents.capturePage()).toPNG());
  await finishPresentation();
  const switched=game.data.activeId===7;
  await panel.webContents.executeJavaScript("document.querySelector('.dex-card[data-id=\"1\"]').click()");await wait(80);
  await panel.webContents.executeJavaScript("document.querySelector('[data-assign=\"2\"]').click()");await wait(80);await finishPresentation();
  const assigned=game.data.slots[2]===1&&game.data.activeId===1;
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"challenge\"]').click()");await wait(100);
  const emptyBadgeCase=await panel.webContents.executeJavaScript("document.querySelectorAll('.badge-slot.empty').length===8&&document.querySelectorAll('.badge-slot .badge-art').length===0");
  fs.writeFileSync(path.join(dir,'challenge.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('[data-challenge=\"0\"]').click()");await wait(100);
  const challengeQueued=game.data.battle?.kind==='wild'&&game.data.pendingChallenge?.index===0&&await panel.webContents.executeJavaScript("!document.querySelector('#ongoing').hidden&&document.querySelector('#ongoing').textContent.includes('도전 예약')&&document.querySelector('[data-challenge=\"0\"]').textContent==='도전 예약됨'");
  fs.writeFileSync(path.join(dir,'challenge-queued.png'),(await panel.webContents.capturePage()).toPNG());
  await panel.webContents.executeJavaScript("document.querySelector('[data-cancel-challenge]').click()");await wait(80);
  const challengeCancelled=!game.data.pendingChallenge&&game.data.battle?.kind==='wild'&&await panel.webContents.executeJavaScript("document.querySelector('#ongoing').hidden&&!document.querySelector('[data-challenge=\"0\"]').disabled");
  await panel.webContents.executeJavaScript("document.querySelector('[data-challenge=\"0\"]').click()");await wait(80);
  game.defeatOpponent(Date.now());publish(true);await finishPresentation();game.tick();publish(true);await wait(100);
  const challenge=game.data.battle?.kind==='trainer'&&game.data.battle.bossIndex===0;
  game.abandon();game.addPokemon(134,20,'fixture');game.addPokemon(132,20,'fixture');publish(true);
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"daycare\"]').click();document.querySelector('#parent-a').value='134';document.querySelector('#parent-b').value='132';document.querySelector('#parent-b').dispatchEvent(new Event('change'))");await wait(180);
  const preview=await panel.webContents.executeJavaScript("({name:document.querySelector('#egg-preview').textContent.includes('이브이의 알'),image:!!document.querySelector('#egg-preview img[src=\"assets/133.gif\"]'),overflow:document.documentElement.scrollWidth>innerWidth})");
  fs.writeFileSync(path.join(dir,'daycare.png'),(await panel.webContents.capturePage()).toPNG());
  await finishPresentation();
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
  await panel.webContents.executeJavaScript("document.querySelector('[data-journal-tab=\"summary\"]').click()");await wait(100);
  const summaryRetained=game.panelState().summary.counts.wins===12&&game.data.journal.length>0&&await panel.webContents.executeJavaScript("!document.querySelector('#journal-ack')");
  game.data.badges=['brock'];publish(true);await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"challenge\"]').click()");await wait(100);
  const earnedGymLocked=await panel.webContents.executeJavaScript("document.querySelector('[data-challenge=\"0\"]').disabled&&document.querySelector('[data-challenge=\"0\"]').textContent==='뱃지 획득 완료'");
  const earnedBadgeCase=await panel.webContents.executeJavaScript("document.querySelectorAll('.badge-slot.earned').length===1&&document.querySelector('.badge-slot[data-badge=\"brock\"] .badge-art').complete&&document.querySelectorAll('.badge-slot.empty').length===7");
  fs.writeFileSync(path.join(dir,'earned-gym.png'),(await panel.webContents.capturePage()).toPNG());
  const {learnedMoves,xpAt}=require('./pokemon.cjs');game.data.owned[25].level=50;game.data.owned[25].xp=xpAt(25,50);game.data.owned[25].moves=learnedMoves(25,50);publish(true);
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"collection\"]').click();document.querySelector('.dex-card[data-id=\"25\"]').click()");await wait(100);
  const allMoves=await panel.webContents.executeJavaScript("document.querySelectorAll('.move-list li').length>4&&document.querySelector('#detail').textContent.includes('특성 · 정전기')");
  fs.writeFileSync(path.join(dir,'all-moves.png'),(await panel.webContents.capturePage()).toPNG());
  game.data.workTokens=2000;game.newWild(Date.now()-require('./battle-pacing.js').pauses.encounter);game.data.switchUntil=0;game.nextTick=0;game.tick(Date.now());const nativeBattle=!!game.data.battle?.sim;
  game=new Game({},Date.now(),{random:()=>.73});
  for(const [uid,level] of [[1,10],[4,24],[25,12]]){const p=game.data.owned[uid];p.level=level;p.xp=xpAt(p.id,level);p.moves=learnedMoves(p.id,level);}
  game.addPokemon(133,1,'fixture');game.data.activeId=4;game.tick();publish(true);await wait(300);
  const autoRotation=game.data.activeId===7&&game.data.workTokens===0&&game.data.slots.join(',')==='1,4,7,25'&&
    await win.webContents.executeJavaScript("document.querySelector('#ball-fx').style.display==='block'&&document.querySelector('[data-id=\"7\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#speech').textContent.includes('레벨 균형')");
  fs.writeFileSync(path.join(dir,'auto-switch.png'),(await win.webContents.capturePage()).toPNG());await finishPresentation();
  const autoSprite=await win.webContents.executeJavaScript("document.querySelector('#hero-image').getAttribute('src')==='assets/7.gif'&&document.documentElement.scrollWidth===innerWidth");
  game.newWild(Date.now());game.data.battle.foe=combatant(18,50,[98]);game.data.battle.party[7].hp=1;
  await finishPresentation();game.data.workTokens=250;game.tick();publish(true);await wait(120);
  const attackBeforeFaint=game.data.animation.kind==='attack'&&game.data.activeId===7&&await win.webContents.executeJavaScript("document.querySelector('#hero-hp-number').textContent.startsWith('1 /')&&document.querySelector('#attack-fx').hidden&&document.querySelector('[data-id=\"7\"]').textContent==='Lv.5'");
  fs.writeFileSync(path.join(dir,'attack-before-faint.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,game.data.animation.at+require('./battle-pacing.js').actionTiming(game.data.animation).impactAt+100-Date.now()));
  const hitBeforeFaint=await win.webContents.executeJavaScript("document.querySelector('#hero').style.filter==='brightness(2)'&&document.querySelector('#hero-hp-number').textContent.startsWith('1 /')");
  fs.writeFileSync(path.join(dir,'hit-before-faint.png'),(await win.webContents.capturePage()).toPNG());
  await finishPresentation();game.tick();publish(true);await wait(1150);
  const faintAfterAttack=game.data.animation.kind==='faint'&&game.data.activeId===7&&await win.webContents.executeJavaScript("document.querySelector('#hero-hp-number').textContent.startsWith('0 /')&&Number(document.querySelector('#hero').style.opacity)<.6&&document.querySelector('#speech').textContent.includes('기절')");
  fs.writeFileSync(path.join(dir,'faint-before-switch.png'),(await win.webContents.capturePage()).toPNG());
  await finishPresentation();game.tick();publish(true);await wait(350);
  const faintRotation=game.data.activeId===1&&game.data.battle?.kind==='wild'&&
    await win.webContents.executeJavaScript("document.querySelector('[data-id=\"7\"]').disabled&&document.querySelector('[data-id=\"7\"]').textContent==='기절'&&document.querySelector('[data-id=\"1\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#speech').textContent.includes('기절')");
  fs.writeFileSync(path.join(dir,'faint-switch.png'),(await win.webContents.capturePage()).toPNG());await wait(1000);
  const moveCatalog=await win.webContents.executeJavaScript(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=185;canvas.height=79;const ctx=canvas.getContext('2d'),results=[];
    for(const p of Object.values(MoveEffects.profiles)){
      const e={moveId:p.id,actor:'hero',at:0,damage:10,outcome:'success',moveTarget:'opponent',hitCount:3};let pixels=0,hash=0;
      for(const u of [.35,.65]){MoveEffects.drawFrame(ctx,e,MoveEffects.frameFor(e,p.duration*u));const a=ctx.getImageData(0,0,185,79).data;for(let i=0;i<a.length;i++){hash=(Math.imul(hash,31)+a[i])>>>0;if(i%4===3&&a[i])pixels++;}}
      results.push({id:p.id,pixels,hash});
    }
    return {count:results.length,empty:results.filter(r=>!r.pixels).map(r=>r.id),distinctFire:new Set(results.filter(r=>[52,53,126].includes(r.id)).map(r=>r.hash)).size};
  })()`);
  game=new Game({},Date.now(),{random:()=>.73});game.newWild(Date.now());game.data.battle.foe=combatant(19,20);game.data.eventSerial=5000;
  const {moves}=require('./pokemon.cjs'),{profileFor}=require('./move-effects.js');
  const moveFixtures=[[52,4,'hero'],[53,4,'hero'],[126,4,'hero'],[55,7,'hero'],[22,1,'hero'],[10,4,'foe'],[45,25,'hero'],[106,7,'hero']];
  let movePlayback=true,actorMessages=true;
  for(const [id,uid,actor] of moveFixtures){
    game.data.activeId=uid;const m=moves.get(id),self=id===106;
    game.animate('attack',{moveId:id,move:m.name,actor,moveTarget:self?'self':'opponent',outcome:'success',hitCount:1,damage:m.damageClass===1?0:12,foe:game.snapshot().foe,text:m.name+'!'},Date.now()-require('./battle-pacing.js').actionTiming({moveId:id}).announceMs-profileFor(id).duration*.56);
    publish(true);await wait(35);movePlayback=movePlayback&&await win.webContents.executeJavaScript(`(()=>{cancelAnimationFrame(moveRaf);moveRaf=0;return !document.querySelector('#attack-fx').hidden&&document.querySelector('#attack-fx').dataset.move==='${id}';})()`);
    actorMessages=actorMessages&&await win.webContents.executeJavaScript(`(()=>{
      const bubble=document.querySelector('#speech'),r=bubble.getBoundingClientRect(),h=document.querySelector('#${actor}-hud').getBoundingClientRect(),scene=document.querySelector('.scene').getBoundingClientRect();
      return bubble.dataset.speaker==='${actor}'&&Math.abs((r.left+r.right-h.left-h.right)/2)<3&&r.left>=scene.left&&r.right<=scene.right&&r.bottom<h.top;
    })()`);
    fs.writeFileSync(path.join(dir,'move-'+id+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  await win.webContents.executeJavaScript("current.animation.at=Date.now()-BattlePacing.duration(current.animation)+10;renderSpeech(current)");await wait(80);
  const actionMessageExpires=await win.webContents.executeJavaScript("document.querySelector('#speech').dataset.speaker==='scene'&&!document.querySelector('#speech').textContent.includes('단단해지기')");
  await win.webContents.executeJavaScript('clearFx()');
  game=new Game({},Date.now(),{random:()=>.73});game.newWild(Date.now());game.data.battle.foe=combatant(143,20);game.data.eventSerial=9000;
  const beforeHp=game.snapshot().foe;game.data.battle.foe.hp-=12;
  game.animate('attack',{moveId:55,actor:'hero',damage:12,outcome:'success',moveTarget:'opponent',foeBefore:beforeHp,foe:game.snapshot().foe,text:'피카츄의 물대포!'});
  const hpEvent=game.data.animation,hpTiming=require('./battle-pacing.js').actionTiming(hpEvent);publish(true);await wait(100);
  const hpBeforeImpact=await win.webContents.executeJavaScript(`document.querySelector('#foe-hp-number').textContent==='${beforeHp.currentHp} / ${beforeHp.maxHp}'&&document.querySelector('#attack-fx').hidden`);
  await wait(Math.max(0,hpEvent.at+hpTiming.healthAt+hpTiming.healthMs/2-Date.now()));
  const hpDraining=await win.webContents.executeJavaScript(`(()=>{const n=parseInt(document.querySelector('#foe-hp-number').textContent);return n<${beforeHp.currentHp}&&n>${beforeHp.currentHp-12};})()`);
  fs.writeFileSync(path.join(dir,'hp-draining.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,hpEvent.at+hpTiming.resultAt+80-Date.now()));
  const hpResultPause=await win.webContents.executeJavaScript(`document.querySelector('#foe-hp-number').textContent==='${beforeHp.currentHp-12} / ${beforeHp.maxHp}'&&document.querySelector('#attack-fx').hidden&&document.querySelector('#speech').dataset.speaker==='hero'`);
  game.data.badges=require('./pokemon.cjs').data.bosses.slice(0,8).map(b=>b.id);publish(true);
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=\"challenge\"]').click();document.querySelector('#challenge').scrollTop=0");await wait(1000);
  const fullBadgeCase=await panel.webContents.executeJavaScript("document.querySelectorAll('.badge-slot.earned').length===8&&[...document.querySelectorAll('.badge-art')].every(i=>i.complete&&i.naturalWidth===1280)&&!document.querySelector('#league-start').disabled&&document.documentElement.scrollWidth===innerWidth");
  fs.writeFileSync(path.join(dir,'badge-case-full.png'),(await panel.webContents.capturePage()).toPNG());
  const {captureTiming}=require('./capture-animation.js');
  const prepareCatch=passes=>{
    game=new Game({},Date.now(),{random:()=>.73});game.newWild(Date.now());game.data.battle.foe=combatant(19,5);game.data.battle.foe.hp=game.data.battle.foe.maxHp*.1;
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
  const captureSparkle=await win.webContents.executeJavaScript("!document.querySelector('#capture-sparkles').hidden&&document.querySelector('#capture-ball').classList.contains('caught')&&document.querySelector('#speech').textContent.includes('포획 성공!')&&document.querySelector('#speech').dataset.speaker==='scene'");
  fs.writeFileSync(path.join(dir,'capture-sparkle.png'),(await win.webContents.capturePage()).toPNG());
  await wait(Math.max(0,caught.at+timing.duration+200-Date.now()));game.tick();publish(true);await wait(80);
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
  const battleHud=await win.webContents.executeJavaScript(`(()=>{
    const h=document.querySelector('#hero-hud'),f=document.querySelector('#foe-hud'),n=document.querySelector('#hero-battle-name'),bar=document.querySelector('#hero-hp'),number=document.querySelector('#hero-hp-number');
    return !h.hidden&&!f.hidden&&getComputedStyle(h).display!=='none'&&n.textContent===${JSON.stringify(game.snapshot().hero.name)}&&number.textContent===${JSON.stringify(game.snapshot().hero.currentHp+' / '+game.snapshot().hero.maxHp)}&&n.getBoundingClientRect().top<bar.getBoundingClientRect().top&&bar.getBoundingClientRect().top<number.getBoundingClientRect().top&&getComputedStyle(document.querySelector('#speech')).display==='none'&&getComputedStyle(document.querySelector('.connection')).display==='none';
  })()`);
  fs.writeFileSync(path.join(dir,'compact.png'),(await win.webContents.capturePage()).toPNG());
  const controls={switched,recallBall,recallAbsorb,recallReturn,sendBall,sendRelease,assigned,challengeQueued,challengeCancelled,challenge,preview:preview.name&&preview.image&&!preview.overflow,boarded,eggVisible,hatched,summary,detail,summaryRetained,earnedGymLocked,allMoves,nativeBattle,autoRotation,autoSprite,attackBeforeFaint,hitBeforeFaint,faintAfterAttack,faintRotation,headerLayout,actorMessages,actionMessageExpires,hpBeforeImpact,hpDraining,hpResultPause,emptyBadgeCase,earnedBadgeCase,fullBadgeCase,moveCatalog:moveCatalog.count===354&&!moveCatalog.empty.length&&moveCatalog.distinctFire===3,movePlayback,battleHud,captureThreeShakes,captureSparkle,caughtBallOnly,captureBreakouts,compact:settings.compact===true,height:win.getSize()[1],pin:settings.pinned===false};
  const ok=inspection.hero==='피카츄'&&inspection.images&&!inspection.overflow&&inspection.slots===4&&inspection.facing.startsWith('matrix(-1')&&collection.count===151&&collection.caught===4&&collection.unknown.includes('???')&&collection.silhouette&&collection.noPichu&&!collection.overflow&&Object.values(controls).every(Boolean)&&controls.height===276&&!errors.length;
  fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({ok,inspection,collection,controls,errors},null,2));console.log(JSON.stringify({smoke:ok,inspection,collection,controls,errors}));app.exit(ok?0:1);
}
app.on('before-quit',()=>{clearInterval(timer);widgetPinning?.dispose();updater?.close();remotes?.close();try{save();}catch{}tray?.destroy();});
app.on('window-all-closed',()=>app.quit());
