'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{Server,utils}=require('ssh2');
const {Game}=require('../game.cjs'),{CodexReader,selectEvent}=require('../codex-reader.cjs');
const {RemoteCodex,connectionConfig}=require('../remote-codex.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await delay(25);}assert.fail('Timed out waiting for fixture state');}
const event=(type,output,at=Date.now())=>({type:'event_msg',timestamp:new Date(at).toISOString(),payload:{type,...(type==='token_count'?{info:{total_token_usage:{output_tokens:output,total_tokens:output*2}}}:{})}});
const tokens=(n,at)=>JSON.stringify(event('token_count',n,at))+'\n';
const key=crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs1',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
async function fixture(t,{acceptPassword=true,publicKey=null}={}){
  const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'pokemon-remote-')),home=path.join(dir,'remote'),sessions=path.join(home,'sessions');await fsp.mkdir(sessions,{recursive:true});
  const file=path.join(sessions,'rollout-remote-fixture.jsonl');await fsp.writeFile(file,tokens(100));
  const children=new Set(),clients=new Set();let authentications=0,executions=0;
  const server=new Server({hostKeys:[key]},client=>{
    clients.add(client);client.on('error',()=>{}).on('close',()=>clients.delete(client));
    client.on('authentication',ctx=>{
      authentications++;
      if(publicKey&&ctx.method==='publickey'&&ctx.username==='fixture'&&ctx.key.data.equals(publicKey.getPublicSSH())&&(!ctx.signature||publicKey.verify(ctx.blob,ctx.signature,ctx.hashAlgo)===true))ctx.accept();
      else if(acceptPassword&&ctx.method==='password'&&ctx.username==='fixture'&&ctx.password==='fixture-secret')ctx.accept();else ctx.reject();
    });
    client.on('ready',()=>client.on('session',accept=>accept().on('exec',(accept,reject,info)=>{
      if(info.command!=='"node" -'){reject();return;}executions++;
      const stream=accept(),child=spawn(process.execPath,['-'],{env:{...process.env,CODEX_HOME:home},windowsHide:true,stdio:['pipe','pipe','pipe']});children.add(child);
      child.on('error',()=>{});child.stdin.on('error',()=>{});stream.on('error',()=>{});
      stream.pipe(child.stdin);child.stdout.on('data',data=>{if(!stream.destroyed)stream.write(data);});child.stderr.on('data',()=>{});
      child.on('close',code=>{children.delete(child);if(!stream.destroyed){stream.exit(code||0);stream.end();}});
      stream.on('close',()=>child.kill());
    })));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const game=new Game(),manager=new RemoteCodex(game,path.join(dir,'local'),{knownHosts:()=>({records:[],unreadable:false})});
  const config={host:'127.0.0.1',port:server.address().port,username:'fixture',name:'Fixture PC',auth:'password'};
  t.after(async()=>{manager.close();for(const c of clients)c.end();for(const c of children)c.kill();await new Promise(r=>server.close(r));await fsp.rm(dir,{recursive:true,force:true});});
  return {manager,game,config,dir,file,sessions,children,clients,authentications:()=>authentications,executions:()=>executions};
}
async function connected(f){
  const id=f.manager.add(f.config,'fixture-secret');await until(()=>f.manager.entries.get(id).state==='trust');
  const entry=f.manager.entries.get(id);assert.equal(f.authentications(),0,'No credential sent before trust');
  assert.equal(f.manager.trust(id,'SHA256:wrong'),false);assert.equal(f.manager.trust(id,entry.candidate),true);
  await until(()=>entry.connected);return {id,entry};
}
test('SSH collector connects only after fingerprint trust, strips private content and counts new work',async t=>{
  const f=await fixture(t),{entry}=await connected(f);
  assert.equal(f.game.data.outputTokens,0);assert.equal(f.game.data.workTokens,0);assert.equal(f.executions(),1);
  const before=await fsp.readFile(f.file,'utf8'),record=event('token_count',1100);record.payload.secret='PRIVATE-CONTENT';record.payload.info.prompt='PRIVATE-CONTENT';
  await fsp.appendFile(f.file,JSON.stringify({type:'response_item',payload:{text:'PRIVATE-CONTENT'}})+'\n'+JSON.stringify(record)+'\n');
  await until(()=>f.game.data.outputTokens===1000);assert.equal(f.game.snapshot().phase,'working');assert.equal(entry.files,1);
  assert(!JSON.stringify(f.game.data).includes('PRIVATE-CONTENT'));assert(!JSON.stringify(f.manager.snapshot()).includes('fixture-secret'));
  await fsp.appendFile(f.file,JSON.stringify(event('task_complete'))+'\n');await until(()=>f.game.snapshot().phase==='done');
  assert((await fsp.readFile(f.file,'utf8')).startsWith(before));assert.deepEqual(await fsp.readdir(path.dirname(f.sessions)),['sessions']);
});
test('reconnect and widget restart recover observed-session growth exactly once',async t=>{
  const f=await fixture(t),{id,entry}=await connected(f);
  await fsp.appendFile(f.file,tokens(1100));await until(()=>f.game.data.outputTokens===1000);
  f.manager.stop(id);await fsp.appendFile(f.file,tokens(2100));f.manager.connect(id);await until(()=>entry.connected);
  assert.equal(f.game.data.outputTokens,2000);f.manager.stop(id);f.manager.connect(id);await until(()=>entry.connected);assert.equal(f.game.data.outputTokens,2000);
  f.manager.stop(id);await fsp.appendFile(f.file,tokens(3100));
  const restoredGame=new Game(f.game.data),restored=new RemoteCodex(restoredGame,path.join(f.dir,'local'));t.after(()=>restored.close());
  restored.connect(id,{secret:'fixture-secret'});await until(()=>restored.entries.get(id).connected);assert.equal(restoredGame.data.outputTokens,3000);
});
test('local and remote mirrors of the same rollout never count the same work twice',async t=>{
  const f=await fixture(t),{entry}=await connected(f),local=new CodexReader(f.sessions,f.game);await local.poll();
  await fsp.appendFile(f.file,tokens(600));await local.poll();assert.equal(f.game.data.outputTokens,500);
  await until(()=>entry.connected&&[...f.manager.entries.values()][0].lastMessage>0);await delay(1700);assert.equal(f.game.data.outputTokens,500);
  await fsp.appendFile(f.file,tokens(900));await until(()=>f.game.data.outputTokens===800);await local.poll();assert.equal(f.game.data.outputTokens,800);
});
test('saved credentials are encrypted and never published; without save a restart asks for login',async t=>{
  const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'pokemon-secrets-')),game=new Game();t.after(()=>fsp.rm(dir,{recursive:true,force:true}));
  const vault={available:()=>true,encrypt:s=>'encrypted:'+Buffer.from(s).toString('base64'),decrypt:s=>Buffer.from(s.slice(10),'base64').toString()};
  const a=new RemoteCodex(game,dir,{vault});t.after(()=>a.close());a.connect=()=>true;
  const id=a.add({host:'127.0.0.1',username:'fixture'},'sensitive-password',true);
  assert(!fs.readFileSync(a.file,'utf8').includes('sensitive-password'));assert(!fs.readFileSync(a.secretFile,'utf8').includes('sensitive-password'));assert(!JSON.stringify(a.snapshot()).includes('sensitive-password'));
  const b=new RemoteCodex(game,dir,{vault});t.after(()=>b.close());assert.equal(b.secret(id),'sensitive-password');
  a.setSecret(id,'temporary-password',false);const c=new RemoteCodex(game,dir,{vault});t.after(()=>c.close());c.start();assert.equal(c.entries.get(id).state,'login');assert.equal(c.secret(id),'');
});
test('a changed pinned host key and bad login cannot execute the collector',async t=>{
  const f=await fixture(t),id=f.manager.add(f.config,'wrong-password');await until(()=>f.manager.entries.get(id).state==='trust');
  let entry=f.manager.entries.get(id);f.manager.trust(id,entry.candidate);await until(()=>entry.state==='login');assert.equal(f.executions(),0);
  entry.config.fingerprint='SHA256:'+'A'.repeat(43);f.manager.connect(id,{secret:'fixture-secret'});await until(()=>entry.state==='changed');assert.equal(f.executions(),0);assert.equal(f.manager.trust(id,entry.candidate),false);
});
test('removal stops reconnect and preserves gameplay and unrelated configuration',async t=>{
  const f=await fixture(t),{id,entry}=await connected(f),before=JSON.stringify(f.game.data.owned);
  f.manager.stop(id);assert.equal(entry.config.enabled,false);assert.equal(entry.connected,false);assert.equal(f.manager.remove(id),true);
  assert.equal(f.manager.snapshot().connections.length,0);assert.equal(JSON.stringify(f.game.data.owned),before);assert.equal(JSON.parse(fs.readFileSync(f.manager.file)).connections.length,0);
});
test('connection validation rejects commands and malformed incoming payloads',()=>{
  assert.throws(()=>connectionConfig({host:'host',username:'user',nodePath:'node; touch /tmp/no'}));assert.throws(()=>connectionConfig({host:'host\ncommand',username:'user'}));
  const record=event('token_count',5);record.payload.info.total_token_usage.output_tokens={secret:'PRIVATE'};record.payload.rate_limits={primary:{used_percent:'PRIVATE',window_minutes:300,resets_at:123}};
  assert(!JSON.stringify(selectEvent(JSON.stringify(record))).includes('PRIVATE'));
});
test('SSH private-key login uses a selected file and does not copy it into settings',async t=>{
  const f=await fixture(t,{acceptPassword:false,publicKey:utils.parseKey(key)}),keyFile=path.join(f.dir,'fixture-private-key');await fsp.writeFile(keyFile,key);
  Object.assign(f.config,{auth:'key',keyPath:keyFile});const {entry}=await connected(f);assert.equal(entry.connected,true);
  assert(!fs.readFileSync(f.manager.file,'utf8').includes('PRIVATE KEY'));assert.equal(fs.readFileSync(keyFile,'utf8'),key);
});
test('unexpected network closure retries automatically and applies missed growth once',async t=>{
  const f=await fixture(t),{entry}=await connected(f);await fsp.appendFile(f.file,tokens(400));await until(()=>f.game.data.outputTokens===300);
  for(const client of f.clients)client.end();await until(()=>entry.state==='retry');assert.equal(entry.connected,false);
  await fsp.appendFile(f.file,tokens(700));await until(()=>entry.connected,10000);assert.equal(f.game.data.outputTokens,600);assert.equal(f.executions(),2);
});
test('missing remote runtime shows a stable actionable error instead of a retry loop',async t=>{
  const f=await fixture(t);f.config.nodePath='missing-node';const id=f.manager.add(f.config,'fixture-secret');await until(()=>f.manager.entries.get(id).state==='trust');
  const entry=f.manager.entries.get(id);f.manager.trust(id,entry.candidate);await until(()=>entry.state==='runtime');assert.equal(entry.connected,false);assert.equal(entry.retry,null);
});
test('an existing trusted OpenSSH record verifies and pins the server without a manual prompt',async t=>{
  const f=await fixture(t),{loadKnownHosts}=require('../known-hosts.cjs'),file=path.join(f.dir,'known_hosts'),publicKey=utils.parseKey(key).getPublicSSH();
  const record='[127.0.0.1]:'+f.config.port+' ssh-rsa '+publicKey.toString('base64')+'\n';await fsp.writeFile(file,record);
  f.manager.knownHosts=(host,port)=>loadKnownHosts(host,port,[file]);const id=f.manager.add(f.config,'fixture-secret'),entry=f.manager.entries.get(id);await until(()=>entry.connected);
  assert.equal(entry.trustSource,'ssh');assert(entry.config.fingerprint.startsWith('SHA256:'));assert.equal(await fsp.readFile(file,'utf8'),record);assert.equal(f.executions(),1);
});
test('a conflicting or revoked OpenSSH key blocks authentication and cannot be manually bypassed',async t=>{
  const f=await fixture(t),{parseKnownHosts}=require('../known-hosts.cjs'),different=crypto.generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'der'});
  const trusted=utils.parseKey(key).getPublicSSH();const bad=Buffer.from(trusted);bad[bad.length-1]^=1;
  let records=parseKnownHosts('[127.0.0.1]:'+f.config.port+' ssh-rsa '+bad.toString('base64'),f.config.host,f.config.port);
  f.manager.knownHosts=()=>({records,unreadable:false});const id=f.manager.add(f.config,'fixture-secret'),entry=f.manager.entries.get(id);await until(()=>entry.state==='changed');assert.equal(f.authentications(),0);assert.equal(f.manager.trust(id,entry.candidate),false);
  records=parseKnownHosts('@revoked [127.0.0.1]:'+f.config.port+' ssh-rsa '+trusted.toString('base64'),f.config.host,f.config.port);f.manager.connect(id);await until(()=>entry.state==='revoked');assert.equal(f.authentications(),0);assert.equal(f.executions(),0);
});
