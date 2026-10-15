'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {releaseManifest}=require('../../scripts/release-manifest.cjs');
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function zip(entries){
  const parts=[],central=[];let offset=0;
  for(const {name,data=Buffer.alloc(0),attributes=0} of entries){
    const n=Buffer.from(name),raw=Buffer.from(data),body=zlib.deflateRawSync(raw),crc=zlib.crc32(raw),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(body.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(n.length,26);parts.push(h,n,body);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(body.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(attributes>>>0,38);c.writeUInt32LE(offset,42);central.push(c,n);offset+=h.length+n.length+body.length;
  }
  const size=central.reduce((s,b)=>s+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);return Buffer.concat([...parts,...central,end]);
}
function entries(root,prefix){const out=[];function walk(dir,relative=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const r=relative?relative+'/'+e.name:e.name,p=path.join(dir,e.name);if(e.isDirectory())walk(p,r);else out.push({name:prefix+'/'+r,data:fs.readFileSync(p)});}}walk(root);return out;}
function tiny(root,version){
  const files={'PokemonCodex.exe':'fixture executable','resources/app/package.json':JSON.stringify({name:'pokemon-codex-buddy',version,main:'desktop/main.cjs'}),'resources/app/desktop/main.cjs':'// fixture','resources/app/desktop/update-helper.ps1':fs.readFileSync(path.join(__dirname,'../../update-helper.ps1'))};
  for(const [name,body] of Object.entries(files)){const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);}
  return releaseManifest(root,version);
}
function release(buffer,version='0.3.66'){return {tag_name:'v'+version,draft:false,prerelease:false,assets:[{name:`Pokemon-Codex-${version}-portable.zip`,state:'uploaded',size:buffer.length,digest:'sha256:'+sha(buffer),browser_download_url:`https://github.com/Bakzzi/Pokemon_codex/releases/download/v${version}/Pokemon-Codex-${version}-portable.zip`}]};}
function fetcher(buffer,metadata=release(buffer)){return async url=>url.includes('api.github.com')?new Response(JSON.stringify(metadata),{status:200,headers:{etag:'fixture'}}):new Response(buffer,{status:200,headers:{'content-length':String(buffer.length)}});}
module.exports={zip,entries,tiny,release,fetcher,sha};
