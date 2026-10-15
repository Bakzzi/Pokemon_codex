'use strict';
// Windows portable releases, pinned to this project's public GitHub release feed.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{Readable,Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const FEED='https://api.github.com/repos/Bakzzi/Pokemon_codex/releases/latest',PRODUCT='pokemon-codex-buddy';
const MAX_ZIP=512*1024*1024,INTERVAL=6*60*60*1000;
function versionParts(value){if(!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(value))throw Error('Invalid release version');return value.split('.').map(Number);}
function newer(a,b){const x=versionParts(a),y=versionParts(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;}
function releaseInfo(release,current){
  if(release.draft||release.prerelease)return null;
  const version=String(release.tag_name||'').replace(/^v/,'');versionParts(version);if(!newer(version,current))return null;
  const name=`Pokemon-Codex-${version}-portable.zip`,asset=release.assets?.find(a=>a.name===name&&a.state==='uploaded');
  if(!asset||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>MAX_ZIP||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw Error('Release asset is incomplete');
  const expected=`https://github.com/Bakzzi/Pokemon_codex/releases/download/v${version}/${name}`;
  if(asset.browser_download_url!==expected)throw Error('Unexpected release origin');
  return {version,url:expected,bytes:asset.size,sha256:asset.digest.slice(7)};
}
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
function read(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{return fallback;}}
function unlinked(directory){
  let at=path.resolve(directory);while(true){if(fs.existsSync(at)&&fs.lstatSync(at).isSymbolicLink())throw Error('Linked update path');const parent=path.dirname(at);if(at===parent)break;at=parent;}
}
async function response(fetcher,url,options={}){
  let current=url;
  for(let redirects=0;redirects<6;redirects++){
    const u=new URL(current),allowed=['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'];
    if(u.protocol!=='https:'||u.username||u.password||!allowed.includes(u.hostname)||u.port)throw Error('Unexpected download origin');
    const result=await fetcher(current,{...options,redirect:'manual',headers:{'User-Agent':'PokemonCodexBuddy-Updater',...options.headers}});
    if(![301,302,303,307,308].includes(result.status))return result;
    const next=result.headers.get('location');await result.body?.cancel();if(!next)throw Error('Missing redirect');current=new URL(next,current).href;
  }
  throw Error('Too many download redirects');
}
async function boundedJson(result){
  const chunks=[];let bytes=0;for await(const chunk of result.body){bytes+=chunk.length;if(bytes>2*1024*1024)throw Error('Release response too large');chunks.push(Buffer.from(chunk));}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function download(fetcher,info,file,signal,onProgress){
  const result=await response(fetcher,info.url,{signal});if(result.status!==200)throw Error('Download HTTP '+result.status);
  const length=result.headers.get('content-length');if(length&&Number(length)!==info.bytes)throw Error('Download size mismatch');
  const hash=crypto.createHash('sha256');let bytes=0;
  const check=new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;if(bytes>info.bytes)return done(Error('Download exceeded declared size'));hash.update(chunk);onProgress(bytes/info.bytes);done(null,chunk);}});
  let created=false;
  try{
    const output=fs.createWriteStream(file,{flags:'wx'});output.once('open',()=>{created=true;});
    await pipeline(Readable.fromWeb(result.body),check,output,{signal});
    if(bytes!==info.bytes||hash.digest('hex')!==info.sha256)throw Error('Download checksum mismatch');
  }catch(error){if(created)try{fs.unlinkSync(file);}catch{}throw error;}
}
function helper(script,plan,mode,{detached=false}={}){
  return new Promise((resolve,reject)=>{
    // The shell broker owns Apply, so it survives the Electron process exiting.
    // Launch returns only after the worker acknowledges the exact transaction.
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-PlanPath',plan,'-Mode',detached?'Launch':mode],{windowsHide:true,stdio:['ignore','ignore','pipe'],cwd:path.dirname(plan)});
    child.once('error',reject);
    let detail='';child.stderr.on('data',b=>{detail=(detail+b).slice(-3000);});child.once('exit',code=>code===0?resolve():reject(Error('Update preparation failed'+(detail?': '+detail.trim():''))));
  });
}
function canRestart(game,now=Date.now()){
  return now>=Number(game.data.switchUntil||0)&&!game.data.pendingBattle;
}
function markHealthy(installRoot,version,nonce,pid=process.pid){
  if(!/^[a-f0-9]{32}$/.test(nonce||''))return false;
  const dir=path.join(installRoot,'.pokemon-updates','transactions',nonce);unlinked(dir);
  const plan=read(path.join(dir,'plan.json'));
  if(!plan||plan.product!==PRODUCT||plan.nonce!==nonce||plan.version!==version||path.resolve(plan.installRoot)!==path.resolve(installRoot))return false;
  atomic(path.join(dir,'healthy.json'),{nonce,version,pid,at:new Date().toISOString()});return true;
}
class AutoUpdate{
  constructor(options){
    Object.assign(this,{fetch:globalThis.fetch,runHelper:helper,now:Date.now,startDelay:15000,interval:INTERVAL,onChange:()=>{},canRestart:()=>true,prepareRestart:()=>{},quit:()=>{},resume:()=>{},enabled:true},options);
    versionParts(this.version);this.installRoot=fs.realpathSync(this.installRoot);this.root=path.join(this.installRoot,'.pokemon-updates');unlinked(this.root);
    const owner=read(path.join(this.root,'owner.json'));
    if(fs.existsSync(this.root)&&!owner&&fs.readdirSync(this.root).length)throw Error('Update directory is not managed by this application');
    if(owner&&(owner.schema!==1||owner.product!==PRODUCT))throw Error('Unexpected update directory identity');
    fs.mkdirSync(this.root,{recursive:true});if(!owner)atomic(path.join(this.root,'owner.json'),{schema:1,product:PRODUCT});
    const installed=read(path.join(this.installRoot,'update-files.json'));
    if(installed?.product!==PRODUCT||installed.version!==this.version)throw Error('Installed release identity is unavailable');
    this.state={phase:'idle',version:this.version,available:null,percent:0};this.busy=false;this.applying=false;this.ready=null;this.manual=false;
  }
  snapshot(){
    const {phase,available,percent}=this.state;
    const label={idle:'자동 업데이트 대기',checking:'업데이트 확인 중',downloading:`새 버전 다운로드 중 · ${percent}%`,staging:'새 버전 준비 중',ready:'새 버전 준비 완료 · 연출과 열린 창을 마치면 재시작해요',applying:'진행을 저장하고 업데이트해요',current:'최신 버전 사용 중',error:'업데이트를 나중에 다시 확인해요',blocked:'업데이트 적용을 보류했어요'}[phase];
    return {...this.state,enabled:this.enabled,label,notice:['ready','applying'].includes(phase)||this.manual?label:''};
  }
  set(phase,extra={}){Object.assign(this.state,{phase},extra);this.onChange(this.snapshot());}
  failure(phase,error){this.lastError=error.message;try{atomic(path.join(this.root,'last-error.json'),{phase,reason:error.message,at:new Date().toISOString()});}catch{}this.set(phase);}
  start(){this.first=setTimeout(()=>this.check(),this.startDelay);this.timer=setInterval(()=>this.check(),this.interval);this.first.unref?.();this.timer.unref?.();}
  close(){clearTimeout(this.first);clearInterval(this.timer);this.abort?.abort();}
  setEnabled(value){this.enabled=!!value;if(!this.enabled)this.abort?.abort();this.onChange(this.snapshot());if(this.enabled)this.check();}
  async check(manual=false){
    if(this.busy||this.applying||!manual&&!this.enabled)return false;
    if(this.ready){if(manual)this.manual=true;this.onChange(this.snapshot());return true;}
    this.busy=true;this.manual=manual;this.set('checking');
    try{
      unlinked(this.root);fs.mkdirSync(this.root,{recursive:true});
      const cache=read(path.join(this.root,'feed.json'),{}),abort=this.abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),20*60*1000);timeout.unref?.();
      try{
        const result=await response(this.fetch,FEED,{signal:abort.signal,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(cache.etag?{'If-None-Match':cache.etag}:{})}});
        let release;if(result.status===304)release=cache.release;
        else{if(result.status!==200)throw Error('Release HTTP '+result.status);release=await boundedJson(result);atomic(path.join(this.root,'feed.json'),{etag:result.headers.get('etag'),release});}
        const info=releaseInfo(release||{},this.version);
        if(!info){this.set('current');return false;}
        if(!manual&&fs.existsSync(path.join(this.root,'failures',info.version+'.json'))){this.set('blocked',{available:info.version});return false;}
        const nonce=crypto.randomBytes(16).toString('hex'),dir=path.join(this.root,'transactions',nonce);unlinked(dir);fs.mkdirSync(dir,{recursive:true});
        const plan={schema:1,product:PRODUCT,nonce,installRoot:this.installRoot,currentVersion:this.version,version:info.version,parentPid:this.pid||process.pid,zipBytes:info.bytes,zipSha256:info.sha256,createdAt:new Date(this.now()).toISOString()};
        atomic(path.join(dir,'plan.json'),plan);
        const script=path.join(dir,'helper.ps1');fs.copyFileSync(path.join(this.installRoot,'resources/app/desktop/update-helper.ps1'),script);
        this.set('downloading',{available:info.version,percent:0});let last=-1;
        await download(this.fetch,info,path.join(dir,'release.zip'),abort.signal,progress=>{const percent=Math.floor(progress*20)*5;if(percent!==last){last=percent;this.set('downloading',{percent});}});
        this.set('staging');
        try{await this.runHelper(script,path.join(dir,'plan.json'),'Stage');}
        catch(error){atomic(path.join(this.root,'failures',info.version+'.json'),{version:info.version,phase:'prepare',at:new Date().toISOString()});throw error;}
        this.ready={dir,script,plan};this.set('ready');return true;
      }finally{clearTimeout(timeout);this.abort=null;}
    }catch(error){this.failure('error',error);return false;}
    finally{this.busy=false;}
  }
  async maybeApply(){
    if(!this.ready||this.applying||!this.enabled&&!this.manual||!this.canRestart())return false;
    this.applying=true;
    try{
      if(await this.prepareRestart()===false){this.applying=false;return false;}
      const {dir,script,plan}=this.ready;
      // User data stays outside the install tree; preserve recovery snapshots.
      for(const name of ['progress','remote-connections','remote-secrets']){
        const file=path.join(this.dataDir,name+'.json');if(!fs.existsSync(file))continue;
        JSON.parse(fs.readFileSync(file,'utf8'));
        fs.copyFileSync(file,path.join(this.dataDir,`${name}.before-update-${plan.version}-${plan.nonce}.json`),fs.constants.COPYFILE_EXCL);
      }
      this.set('applying');await this.runHelper(script,path.join(dir,'plan.json'),'Apply',{detached:true});this.quit();return true;
    }catch(error){this.applying=false;this.ready=null;this.resume();this.failure('blocked',error);return false;}
  }
}
module.exports={AutoUpdate,releaseInfo,newer,download,response,canRestart,markHealthy,PRODUCT,FEED};
