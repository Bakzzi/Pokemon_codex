'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('ssh2');
const {selectEvent}=require('./codex-reader.cjs');
const {agentScript}=require('./remote-agent.cjs');
const MAX_LINE=32768;
function connectionConfig(input){
  if(!input||typeof input!=='object')throw new Error('연결 정보를 입력해 주세요.');
  const text=(key,max)=>typeof input[key]==='string'?input[key].trim().slice(0,max):'';
  const host=text('host',253),username=text('username',128),port=Number(input.port||22),name=text('name',60)||host;
  if(!host||!username||/[\s\x00-\x1f]/.test(host+username)||!Number.isInteger(port)||port<1||port>65535)throw new Error('호스트·계정·포트를 확인해 주세요.');
  const auth=input.auth==='key'?'key':'password',keyPath=text('keyPath',1024),nodePath=text('nodePath',1024)||'node';
  // Only an executable path is accepted, never shell arguments or commands.
  if(!/^[a-zA-Z0-9_./:\\ -]+$/.test(nodePath)||nodePath.startsWith('-'))throw new Error('Node.js 실행 파일 경로를 확인해 주세요.');
  if(auth==='key'&&!keyPath)throw new Error('SSH 개인키 파일을 선택해 주세요.');
  return {id:typeof input.id==='string'&&/^[a-f0-9-]{36}$/.test(input.id)?input.id:crypto.randomUUID(),name,host,username,port,auth,keyPath,nodePath,enabled:input.enabled!==false};
}
class RemoteCodex {
  constructor(game,dir,{vault,clientFactory=()=>new Client(),onChange=()=>{}}={}){
    this.game=game;this.dir=dir;this.vault=vault;this.clientFactory=clientFactory;this.onChange=onChange;
    this.entries=new Map();this.secrets=new Map();this.encrypted={};this.closed=false;this.error=null;
    this.file=path.join(dir,'remote-connections.json');this.secretFile=path.join(dir,'remote-secrets.json');
    try{
      const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));
      for(const value of saved.connections.slice(0,8)){
        const config=connectionConfig(value);if(/^SHA256:[A-Za-z0-9+/]{43}$/.test(value.fingerprint||''))config.fingerprint=value.fingerprint;
        this.entries.set(config.id,{config,state:'stopped',connected:false,files:0,ids:new Set()});
      }
    }catch(e){if(e.code!=='ENOENT')this.error='원격 연결 설정을 읽지 못했어요. 기존 파일을 보존했어요.';}
    try{this.encrypted=JSON.parse(fs.readFileSync(this.secretFile,'utf8'));}catch{}
  }
  write(file,data){fs.mkdirSync(this.dir,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file);}
  save(){if(this.error)throw new Error(this.error);this.write(this.file,{version:1,connections:[...this.entries.values()].map(e=>e.config)});}
  snapshot(){return {error:this.error,canRemember:!!this.vault?.available(),connections:[...this.entries.values()].map(e=>({...e.config,state:e.state,connected:e.connected,files:e.files,message:e.message||'',candidate:e.candidate||null,hasSavedSecret:!!this.encrypted[e.config.id]}))};}
  changed(){this.onChange();}
  add(input,secret='',remember=false){
    if(this.entries.size>=8)throw new Error('원격 PC는 최대 8대까지 연결할 수 있어요.');
    const config=connectionConfig({...input,id:null});const entry={config,state:'stopped',connected:false,files:0,ids:new Set()};
    this.entries.set(config.id,entry);
    try{this.setSecret(config.id,secret,remember);this.save();}catch(e){this.entries.delete(config.id);this.secrets.delete(config.id);throw e;}
    this.connect(config.id);return config.id;
  }
  setSecret(id,secret,remember){
    if(typeof secret!=='string'||secret.length>8192)throw new Error('로그인 정보를 확인해 주세요.');
    if(remember&&!this.vault?.available())throw new Error('이 PC에서 안전한 로그인 정보 저장을 지원하지 않아요. 저장 옵션을 꺼 주세요.');
    this.secrets.set(id,secret);
    if(remember)this.encrypted[id]=this.vault.encrypt(secret);else delete this.encrypted[id];
    if(remember||fs.existsSync(this.secretFile))this.write(this.secretFile,this.encrypted);
  }
  secret(id){if(this.secrets.has(id))return this.secrets.get(id);try{return this.vault?.decrypt(this.encrypted[id])||'';}catch{return '';}}
  start(){if(this.error)return;for(const e of this.entries.values())if(e.config.enabled)this.connect(e.config.id);}
  connect(id,credentials){
    const e=this.entries.get(id);if(!e||this.closed)return false;
    if(credentials)this.setSecret(id,credentials.secret,!!credentials.remember);
    this.stop(id,false);e.config.enabled=true;this.save();
    const secret=this.secret(id);
    if(e.config.auth==='password'&&!secret){e.state='login';e.message='로그인 정보를 입력하면 연결할 수 있어요.';this.changed();return true;}
    let privateKey;
    if(e.config.auth==='key')try{privateKey=fs.readFileSync(e.config.keyPath);}catch{e.state='login';e.message='개인키 파일을 읽을 수 없어요. 연결을 다시 추가해 주세요.';this.changed();return false;}
    e.state='connecting';e.message='SSH 연결 중…';e.candidate=null;const client=this.clientFactory();e.client=client;
    const fail=(state,message)=>{if(e.client!==client)return;e.state=state;e.message=message;e.connected=false;this.changed();};
    client.on('error',error=>{
      if(e.state==='trust'||e.state==='changed')return;
      fail(error.level==='client-authentication'?'login':'error',error.level==='client-authentication'?'로그인에 실패했어요. 계정과 인증 정보를 확인해 주세요.':'연결하지 못했어요. 주소·포트·네트워크를 확인해 주세요.');
    });
    client.on('close',()=>{
      if(e.client!==client)return;e.client=null;e.connected=false;
      for(const id of e.ids){const s=this.game.sessions.get(id);if(s?.phase==='working')s.at=Math.min(s.at,Date.now()-600001);}
      if(e.config.enabled&&!this.closed&&!['trust','changed','login','runtime'].includes(e.state)){
        e.state='retry';e.message='연결이 끊겨 다시 연결을 기다리고 있어요.';
        e.attempts=(e.attempts||0)+1;e.retry=setTimeout(()=>this.connect(id),Math.min(60000,2000*2**Math.min(e.attempts,5)));e.retry.unref?.();
      }
      this.changed();
    });
    client.on('keyboard-interactive',(_name,_instructions,_lang,prompts,finish)=>finish(e.config.auth==='password'&&prompts.length===1&&!prompts[0].echo?[secret]:[]));
    client.on('ready',()=>{
      if(e.client!==client)return;
      client.exec('"'+e.config.nodePath+'" -',(error,stream)=>{
        if(e.client!==client){stream?.close();return;}
        if(error){fail('runtime','원격 수집기를 실행하지 못했어요. Node.js 실행 경로를 확인해 주세요.');client.end();return;}
        e.stream=stream;e.carry='';e.lastMessage=Date.now();
        stream.on('data',chunk=>{
          if(e.client!==client)return;e.carry+=chunk.toString('utf8');
          if(e.carry.length>MAX_LINE&&!e.carry.includes('\n')){fail('runtime','원격 응답 형식이 올바르지 않아요.');client.end();return;}
          const lines=e.carry.split('\n');e.carry=lines.pop();
          for(const line of lines)if(line.length<=MAX_LINE)this.receive(e,line);
        });
        // Never publish raw stderr: it can contain host details or arbitrary shell output.
        stream.stderr.on('data',()=>{});
        stream.on('close',()=>{if(e.client===client){if(!e.ready){e.state='runtime';e.message='원격 PC에서 Node.js를 실행할 수 없어요. 실행 경로를 확인해 주세요.';}client.end();}});
        stream.end(agentScript());
      });
    });
    try{client.connect({host:e.config.host,port:e.config.port,username:e.config.username,privateKey,password:e.config.auth==='password'?secret:undefined,passphrase:e.config.auth==='key'?secret:undefined,tryKeyboard:e.config.auth==='password',readyTimeout:12000,keepaliveInterval:5000,keepaliveCountMax:2,
      hostVerifier:key=>{
        const fingerprint='SHA256:'+crypto.createHash('sha256').update(key).digest('base64').replace(/=+$/,'');
        if(e.config.fingerprint===fingerprint)return true;
        e.candidate=fingerprint;e.state=e.config.fingerprint?'changed':'trust';
        e.message=e.config.fingerprint?'서버 키가 변경되어 연결을 중단했어요. 서버를 확인한 뒤 연결을 다시 추가해 주세요.':'처음 연결하는 서버예요. 지문을 확인한 뒤 연결을 허용해 주세요.';this.changed();return false;
      }
    });}catch{fail('login','SSH 키 또는 로그인 정보를 확인해 주세요.');client.destroy();}
    this.changed();return true;
  }
  trust(id,fingerprint){const e=this.entries.get(id);if(!e||e.state!=='trust'||e.candidate!==fingerprint||e.config.fingerprint)return false;e.config.fingerprint=fingerprint;this.save();return this.connect(id);}
  receive(e,line){
    let value;try{value=JSON.parse(line);}catch{return;}
    if(value.v!==1)return;
    if(value.kind==='status'&&typeof value.connected==='boolean'&&Number.isInteger(value.files)&&value.files>=0&&value.files<=64){
      e.lastMessage=Date.now();e.ready=true;e.attempts=0;e.connected=value.connected;e.files=value.files;e.state=value.connected?'connected':'waiting';
      e.message=value.connected?'원격 Codex 연결됨':'원격 PC의 첫 Codex 작업을 기다려요.';this.changed();return;
    }
    if(value.kind!=='event'||!/^[a-f0-9]{24}$/.test(value.id)||typeof value.baseline!=='boolean')return;
    const event=selectEvent(JSON.stringify(value.event));if(!event)return;
    const previous=this.game.data.baselines[value.id],counter=event.payload.info?.total_token_usage;
    // One global rollout identity also deduplicates a log mirrored on two PCs.
    if(previous&&counter&&(counter.output_tokens<previous.output||counter.total_tokens<previous.total))delete event.payload.info;
    this.game.observe(value.id,event,{baseline:value.baseline&&(event.payload.type!=='token_count'||!previous)});
    e.ids.add(value.id);e.lastMessage=Date.now();
  }
  poll(){for(const e of this.entries.values())if(e.client&&e.ready&&Date.now()-e.lastMessage>20000)e.client.destroy();}
  stop(id,persist=true){const e=this.entries.get(id);if(!e)return false;clearTimeout(e.retry);e.retry=null;const client=e.client;e.client=null;e.ready=false;client?.destroy();for(const session of e.ids){const s=this.game.sessions.get(session);if(s?.phase==='working')s.at=Math.min(s.at,Date.now()-600001);}e.stream=null;e.connected=false;e.files=0;e.state='stopped';e.message='연결 중지';if(persist){e.config.enabled=false;this.save();}this.changed();return true;}
  remove(id){if(!this.stop(id,false))return false;this.entries.delete(id);this.secrets.delete(id);delete this.encrypted[id];this.save();if(fs.existsSync(this.secretFile))this.write(this.secretFile,this.encrypted);this.changed();return true;}
  close(){this.closed=true;for(const id of this.entries.keys())this.stop(id,false);this.secrets.clear();}
}
module.exports={RemoteCodex,connectionConfig};
