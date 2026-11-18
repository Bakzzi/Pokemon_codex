'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'desktop/assets/trainers/npc'),manifest=require('../assets/trainers/npc/sources.json'),{frames}=require('../npc-portraits.js');
assert.deepEqual(manifest.sprites.map(s=>s.id).sort(),Object.keys(frames).sort());
for(const s of manifest.sprites){
 const source=fs.readFileSync(path.join(folder,s.file)),frame=frames[s.id];
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),s.sha256,s.id+' original source changed');
 assert.equal(frame.file,s.file);assert.deepEqual(frame.frame,s.frame);
 const png=source.toString('ascii',1,4)==='PNG',width=png?source.readUInt32BE(16):source.readUInt16LE(6),height=png?source.readUInt32BE(20):source.readUInt16LE(8),[x,y,w,h]=s.frame;
 assert.ok(x>=0&&y>=0&&w>=24&&h>=32&&x+w<=width&&y+h<=height,s.id+' full-body frame outside source');
}
console.log('Verified '+manifest.sprites.length+' full-body NPC source hashes and sprite-sheet frames.');
