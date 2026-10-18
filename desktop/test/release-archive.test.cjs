'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const {tiny,fetcher,release}=require('./helpers/update-fixture.cjs'),{releaseManifest}=require('../scripts/release-manifest.cjs'),{AutoUpdate}=require('../auto-update.cjs');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-archive-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const install=path.join(root,'install'),future=path.join(root,'Pokemon-Codex-0.3.66'),data=path.join(root,'data');tiny(install,'0.3.65');tiny(future,'0.3.66');fs.mkdirSync(data);
  return {root,install,future,data};
}
function archive(root){return JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'../scripts/archive.ps1'),'-ReleaseRoot',root],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));}
test('production portable archive is accepted by the installed Windows updater without path normalization',async t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.future,'Unicode-한글.txt'),'안녕');releaseManifest(f.future,'0.3.66');
  const result=archive(f.future),bytes=fs.readFileSync(result.archive);assert.ok(result.ok);assert.equal(result.files,6);assert.equal(result.bytes,bytes.length);
  const manager=new AutoUpdate({installRoot:f.install,dataDir:f.data,version:'0.3.65',fetch:fetcher(bytes,release(bytes))});
  assert.ok(await manager.check(),manager.lastError);assert.equal(manager.state.phase,'ready');
  assert.equal(fs.readFileSync(path.join(manager.ready.dir,'staged/Unicode-한글.txt'),'utf8'),'안녕');
  assert.equal(fs.readFileSync(result.archive+'.sha256','utf8').split(' ')[0],result.sha256);
  assert.throws(()=>archive(f.future));assert.deepEqual(fs.readFileSync(result.archive),bytes);
});
test('portable archive rejects changed or unlisted source files before creating an output',t=>{
  for(const kind of ['changed','unlisted']){
    const f=fixture(t);fs.writeFileSync(path.join(f.future,kind==='changed'?'PokemonCodex.exe':'my-notes.txt'),'preserve');
    assert.throws(()=>archive(f.future));assert.equal(fs.existsSync(f.future+'-portable.zip'),false);
  }
});
