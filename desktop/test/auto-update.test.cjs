'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {AutoUpdate,releaseInfo,newer,download,response,canRestart,markHealthy}=require('../auto-update.cjs');
const {zip,entries,tiny,release,fetcher,sha}=require('./helpers/update-fixture.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-updater-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const install=path.join(root,'install'),future=path.join(root,'future'),data=path.join(root,'data');tiny(install,'0.3.65');tiny(future,'0.3.66');fs.mkdirSync(data);return {root,install,future,data,archive:()=>zip(entries(future,'Pokemon-Codex-0.3.66'))};}
function manager(f,options={}){return new AutoUpdate({installRoot:f.install,dataDir:f.data,version:'0.3.65',fetch:fetcher(f.archive()),...options});}
test('stable versions advance numerically and only the pinned ZIP with a GitHub digest is accepted',()=>{
  assert.ok(newer('0.3.10','0.3.9'));assert.ok(!newer('0.3.64','0.3.65'));const r=release(Buffer.from('zip'));
  assert.equal(releaseInfo(r,'0.3.65').version,'0.3.66');assert.equal(releaseInfo({...r,prerelease:true},'0.3.65'),null);assert.equal(releaseInfo(r,'0.3.66'),null);
  for(const change of [{digest:null},{browser_download_url:'https://example.com/payload.zip'},{size:900000000}])assert.throws(()=>releaseInfo({...r,assets:[{...r.assets[0],...change}]},'0.3.65'));
  assert.throws(()=>releaseInfo({...r,tag_name:'v../1'},'0.3.65'));
});
test('download verifies exact bytes and SHA-256 and never deletes an existing file',async t=>{
  const f=fixture(t),bytes=Buffer.from('verified zip'),info={url:release(bytes).assets[0].browser_download_url,bytes:bytes.length,sha256:sha(bytes)},file=path.join(f.root,'download.zip');
  await download(fetcher(bytes),info,file,undefined,()=>{});assert.deepEqual(fs.readFileSync(file),bytes);
  await assert.rejects(download(fetcher(bytes),info,file,undefined,()=>{}));assert.deepEqual(fs.readFileSync(file),bytes);
  const other=path.join(f.root,'bad.zip');await assert.rejects(download(fetcher(bytes),{...info,sha256:'0'.repeat(64)},other,undefined,()=>{}));assert.equal(fs.existsSync(other),false);
});
test('redirects cannot send update requests to HTTP, other hosts, credentials or custom ports',async()=>{
  for(const location of ['http://github.com/file','https://evil.example/file','https://user@github.com/file','https://github.com:444/file'])await assert.rejects(response(async()=>new Response(null,{status:302,headers:{location}}),'https://github.com/start'));
});
test('background download waits for a safe boundary and backs up protected data before restart',async t=>{
  const f=fixture(t),calls=[],protectedValue='{"fixture":"private"}';for(const name of ['progress','remote-connections','remote-secrets'])fs.writeFileSync(path.join(f.data,name+'.json'),protectedValue);
  let safe=false,quits=0;const m=manager(f,{canRestart:()=>safe,runHelper:async(...args)=>calls.push(args),quit:()=>quits++});
  assert.ok(await m.check());assert.equal(m.state.phase,'ready');assert.equal(await m.maybeApply(),false);safe=true;assert.ok(await m.maybeApply());assert.equal(quits,1);assert.deepEqual(calls.map(c=>c[2]),['Stage','Apply']);
  for(const name of ['progress','remote-connections','remote-secrets']){assert.equal(fs.readFileSync(path.join(f.data,name+'.json'),'utf8'),protectedValue);assert.equal(fs.readFileSync(path.join(f.data,fs.readdirSync(f.data).find(p=>p.startsWith(name+'.before-update-'))),'utf8'),protectedValue);}
});
test('network and preparation failures do not restart the application; failed versions do not loop',async t=>{
  const f=fixture(t);let quit=0,count=0;const m=manager(f,{fetch:async()=>{count++;throw Error('offline');},quit:()=>quit++});assert.equal(await m.check(),false);assert.equal(quit,0);
  m.setEnabled(false);await m.check();assert.equal(count,1);
  const n=manager(f,{runHelper:async()=>{throw Error('modified application');},quit:()=>quit++});assert.equal(await n.check(),false);assert.equal(quit,0);assert.ok(fs.existsSync(path.join(n.root,'failures/0.3.66.json')));
  await n.check();assert.equal(n.state.phase,'blocked');
});
test('helper launch failures resume the game and do not retry on every game tick',async t=>{
  const f=fixture(t);let resumed=0;const m=manager(f,{runHelper:async(_script,_plan,mode)=>{if(mode==='Apply')throw Error('launch failed');},resume:()=>resumed++});await m.check();assert.equal(await m.maybeApply(),false);assert.equal(m.ready,null);assert.equal(resumed,1);
});
test('unowned cache folders and linked directories are preserved instead of claimed',t=>{
  const f=fixture(t),root=path.join(f.install,'.pokemon-updates');fs.mkdirSync(root);fs.writeFileSync(path.join(root,'user.txt'),'keep');assert.throws(()=>manager(f));assert.equal(fs.readFileSync(path.join(root,'user.txt'),'utf8'),'keep');
});
test('health confirmation is bound to the installation, exact version and transaction nonce',t=>{
  const f=fixture(t),m=manager(f),nonce='a'.repeat(32),dir=path.join(m.root,'transactions',nonce);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify({product:'pokemon-codex-buddy',nonce,version:'0.3.66',installRoot:f.install}));
  assert.equal(markHealthy(f.install,'0.3.65',nonce),false);assert.equal(markHealthy(f.install,'0.3.66','../bad'),false);assert.ok(markHealthy(f.install,'0.3.66',nonce,123));assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'healthy.json'))).pid,123);
  assert.equal(canRestart({data:{switchUntil:100,pendingBattle:null}},99),false);assert.equal(canRestart({data:{switchUntil:100,pendingBattle:{}}},101),false);assert.equal(canRestart({data:{switchUntil:100,pendingBattle:null}},100),true);
});
test('the actual Windows helper stages only a complete verified package and preserves user files',async t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.install,'my-notes.txt'),'keep');const m=manager(f);assert.ok(await m.check(),m.lastError);assert.equal(m.state.phase,'ready');assert.equal(fs.readFileSync(path.join(f.install,'my-notes.txt'),'utf8'),'keep');assert.equal(JSON.parse(fs.readFileSync(path.join(m.ready.dir,'result.json'))).status,'ready');
});
test('the actual Windows helper rejects traversal, duplicate names and unlisted archive files',async t=>{
  for(const name of ['../../escaped.txt','pokemoncodex.exe','extra.txt']){
    const f=fixture(t),list=entries(f.future,'Pokemon-Codex-0.3.66');list.push({name:'Pokemon-Codex-0.3.66/'+name,data:'bad'});const archive=zip(list),m=manager(f,{fetch:fetcher(archive)});
    assert.equal(await m.check(),false,name);assert.equal(fs.existsSync(path.join(f.root,'escaped.txt')),false);assert.equal(JSON.parse(fs.readFileSync(path.join(f.install,'resources/app/package.json'))).version,'0.3.65');
  }
});
test('the actual Windows helper refuses modified managed files and never overwrites them',async t=>{
  const f=fixture(t),file=path.join(f.install,'resources/app/desktop/main.cjs');fs.writeFileSync(file,'// user modification');const m=manager(f);assert.equal(await m.check(),false);assert.equal(fs.readFileSync(file,'utf8'),'// user modification');
});
