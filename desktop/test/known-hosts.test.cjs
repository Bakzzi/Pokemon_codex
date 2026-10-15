'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {utils}=require('ssh2'),{parseKnownHosts,loadKnownHosts,verifyHost,preferredAlgorithms,fingerprint}=require('../known-hosts.cjs');
const key=utils.parseKey(crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{format:'pem',type:'pkcs1'},publicKeyEncoding:{format:'pem',type:'spki'}}).privateKey).getPublicSSH();
const line=(host,marker='')=>(marker?marker+' ':'')+host+' ssh-rsa '+key.toString('base64');
const known=records=>({records,unreadable:false});
test('matches exact hosts, aliases, case and port without trusting another endpoint',()=>{
  assert.equal(parseKnownHosts(line('host.example,192.0.2.5'),'HOST.EXAMPLE').length,1);
  assert.equal(parseKnownHosts(line('host.example,192.0.2.5'),'192.0.2.5').length,1);
  assert.equal(parseKnownHosts(line('host.example'),'other.example').length,0);
  assert.equal(parseKnownHosts(line('host.example'),'host.example',2222).length,0);
  assert.equal(parseKnownHosts(line('[host.example]:2222'),'host.example',2222).length,1);
  assert.equal(parseKnownHosts(line('[::1]:2222'),'::1',2222).length,1);
});
test('hashed OpenSSH hosts use the full host and nonstandard port token',()=>{
  const salt=crypto.randomBytes(20),token='[host.example]:2222',hash=crypto.createHmac('sha1',salt).update(token).digest('base64'),host='|1|'+salt.toString('base64')+'|'+hash;
  assert.equal(parseKnownHosts(line(host),'host.example',2222).length,1);assert.equal(parseKnownHosts(line(host),'host.example',22).length,0);assert.equal(parseKnownHosts(line(host),'other.example',2222).length,0);
  assert.equal(parseKnownHosts(line('other.example,'+host),'host.example',2222).length,0);
});
test('wildcards respect exclusions and regex characters are literal',()=>{
  assert.equal(parseKnownHosts(line('*.example,!blocked.example'),'good.example').length,1);assert.equal(parseKnownHosts(line('*.example,!blocked.example'),'blocked.example').length,0);
  assert.equal(parseKnownHosts(line('a?.example'),'ab.example').length,1);assert.equal(parseKnownHosts(line('a.example'),'axexample').length,0);
});
test('revocation wins over an ordinary match and an existing application pin',()=>{
  const records=parseKnownHosts(line('host')+'\n'+line('host','@revoked'),'host');assert.equal(verifyHost(known(records),key,fingerprint(key)).state,'revoked');
});
test('a changed key blocks even if pinned by the app; certificate authorities are not raw host keys',()=>{
  const records=parseKnownHosts(line('host'),'host'),other=Buffer.from(key);other[other.length-1]^=1;
  assert.equal(verifyHost(known(records),other).state,'changed');assert.equal(verifyHost(known(records),other,fingerprint(other)).state,'changed');assert.equal(verifyHost(known(records),key,'SHA256:wrong').state,'changed');
  assert.equal(verifyHost(known(parseKnownHosts(line('host','@cert-authority'),'host')),key).state,'unknown');
});
test('first connections require confirmation while an application pin can verify a known key',()=>{
  assert.equal(verifyHost(known([]),key).state,'unknown');assert.equal(verifyHost(known([]),key,fingerprint(key)).source,'app');assert.equal(verifyHost(known(parseKnownHosts(line('host'),'host')),key).source,'ssh');
  assert.deepEqual(preferredAlgorithms(known(parseKnownHosts(line('host'),'host'))),['rsa-sha2-512','rsa-sha2-256']);
});
test('malformed lines and markers do not create trust records',()=>{
  assert.equal(parseKnownHosts('# comment\n@unknown '+line('host')+'\nhost ssh-rsa not-valid\n|2|invalid|invalid ssh-rsa '+key.toString('base64'),'host').length,0);
});
test('loading trust records is read-only and missing files do not fabricate trust',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-known-hosts-')),file=path.join(dir,'known_hosts'),contents=line('host')+'\n';t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.writeFileSync(file,contents);
  assert.equal(loadKnownHosts('host',22,[file,path.join(dir,'missing')]).records.length,1);assert.equal(fs.readFileSync(file,'utf8'),contents);assert.deepEqual(fs.readdirSync(dir),['known_hosts']);assert.equal(loadKnownHosts('other',22,[file]).records.length,0);
});
