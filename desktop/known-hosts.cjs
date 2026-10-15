'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const MAX_BYTES=8*1024*1024;
const fingerprint=key=>'SHA256:'+crypto.createHash('sha256').update(key).digest('base64').replace(/=+$/,'');
function keyType(key){try{const size=key.readUInt32BE(0);return size>0&&size<=128&&key.length>size+4?key.subarray(4,4+size).toString('ascii'):null;}catch{return null;}}
function hostToken(host,port){host=host.toLowerCase().replace(/^\[([^\]]+)\]$/,'$1');return Number(port)===22?host:'['+host+']:'+port;}
function patternMatches(pattern,token){
  if(pattern.startsWith('|')){
    const parts=pattern.split('|');if(parts.length!==4||parts[1]!=='1')return false;
    try{const salt=Buffer.from(parts[2],'base64'),expected=Buffer.from(parts[3],'base64');if(!salt.length||expected.length!==20)return false;return crypto.timingSafeEqual(crypto.createHmac('sha1',salt).update(token).digest(),expected);}catch{return false;}
  }
  const regex=pattern.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.');
  return new RegExp('^'+regex+'$','i').test(token);
}
function matches(hosts,token){
  let positive=false;
  for(const pattern of hosts.split(',')){if(!pattern)continue;const negative=pattern[0]==='!',body=negative?pattern.slice(1):pattern;if(patternMatches(body,token)){if(negative)return false;positive=true;}}
  return positive;
}
function parseKnownHosts(text,host,port=22){
  const token=hostToken(host,port),records=[];
  for(const line of text.split(/\r?\n/)){
    const fields=line.trim().split(/\s+/);if(!fields[0]||fields[0].startsWith('#'))continue;
    const marker=fields[0].startsWith('@')?fields.shift():null;
    if(marker&&marker!=='@revoked'&&marker!=='@cert-authority')continue;
    if(fields.length<3||fields[0].includes('|')&&!/^\|1\|[^|]+\|[^|]+$/.test(fields[0])||!matches(fields[0],token)||!/^[-A-Za-z0-9+/]+={0,2}$/.test(fields[2]))continue;
    const key=Buffer.from(fields[2],'base64');if(keyType(key)!==fields[1])continue;
    records.push({type:fields[1],key,marker});
  }
  return records;
}
function defaultFiles(){return [path.join(os.homedir(),'.ssh','known_hosts'),path.join(os.homedir(),'.ssh','known_hosts2'),process.platform==='win32'?path.join(process.env.ProgramData||'C:\\ProgramData','ssh','ssh_known_hosts'):'/etc/ssh/ssh_known_hosts'];}
function loadKnownHosts(host,port,files=defaultFiles()){
  const records=[];let unreadable=false;
  for(const file of files)try{if(fs.statSync(file).size>MAX_BYTES){unreadable=true;continue;}records.push(...parseKnownHosts(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''),host,port));}catch(error){if(error.code!=='ENOENT')unreadable=true;}
  return {records,unreadable};
}
function verifyHost(known,key,pinned){
  const value=fingerprint(key),same=record=>record.key.equals(key),usable=known.records.filter(r=>!r.marker);
  if(known.records.some(r=>r.marker==='@revoked'&&same(r)))return {state:'revoked',fingerprint:value};
  if(pinned&&pinned!==value)return {state:'changed',fingerprint:value};
  if(usable.some(same))return {state:'match',source:'ssh',fingerprint:value};
  if(usable.some(r=>r.type===keyType(key)))return {state:'changed',fingerprint:value};
  if(pinned===value)return {state:'match',source:'app',fingerprint:value};
  return {state:'unknown',fingerprint:value};
}
function preferredAlgorithms(known){
  const types=[...new Set(known.records.filter(r=>!r.marker).map(r=>r.type))],allowed=['ssh-ed25519','ecdsa-sha2-nistp256','ecdsa-sha2-nistp384','ecdsa-sha2-nistp521'];
  return types.flatMap(type=>type==='ssh-rsa'?['rsa-sha2-512','rsa-sha2-256']:allowed.includes(type)?[type]:[]);
}
module.exports={fingerprint,parseKnownHosts,loadKnownHosts,verifyHost,preferredAlgorithms};
