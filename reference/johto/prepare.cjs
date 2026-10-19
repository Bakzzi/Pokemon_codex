'use strict';
// Rebuild factual Crystal parties from the pinned, unmodified reference files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),data=require('../../desktop/data/game-data.json'),normalize=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
const species=new Map(data.pokemon.map(p=>[normalize(p.identifier),p.id])),moves=new Map(data.moves.map(m=>[normalize(m.identifier),m.id]));
for(const [key,id]of [['PSYCHICM',94],['FAINTATTACK',185],['HIJUMPKICK',136]])moves.set(key,id);
const learnsets={},evos=fs.readFileSync(path.join(__dirname,'raw/data_pokemon_evos_attacks.asm'),'utf8');
for(const m of evos.matchAll(/^(\w+)EvosAttacks:\r?\n([\s\S]*?)(?=^\w+EvosAttacks:|$(?![\s\S]))/gm)){
 const id=species.get(normalize(m[1]));assert.ok(id,m[1]);const body=m[2].split(/db 0\s*; no more evolutions/)[1];assert.ok(body,m[1]);
 learnsets[id]=[...body.matchAll(/^\s*db\s+(\d+),\s*(\w+)/gm)].map(x=>{const move=moves.get(normalize(x[2]));assert.ok(move,x[2]);return {level:Number(x[1]),move};});
}
assert.equal(Object.keys(learnsets).length,251);
const text=fs.readFileSync(path.join(__dirname,'raw/data_trainers_parties.asm'),'utf8'),parties={};
const selected=new Set(['Falkner','Bugsy','Whitney','Morty','Chuck','Jasmine','Pryce','Clair','Will','Koga','Bruno','Karen','Champion','Brock','Misty','LtSurge','Erika','Janine','Sabrina','Blaine','Blue','Red','Rival1','Rival2','GruntM','GruntF','ExecutiveM','ExecutiveF','Sage','KimonoGirl','Blackbelt','Scientist','Sailor','Mysticalman']);
for(const m of text.matchAll(/^(\w+)Group:\r?\n([\s\S]*?)(?=^\w+Group:|$(?![\s\S]))/gm)){
 if(!selected.has(m[1]))continue;const list=[];
 for(const t of m[2].matchAll(/db\s+"([^"\n]*)@",\s*(TRAINERTYPE_\w+)\r?\n([\s\S]*?)\s*db -1\s*;/g)){
  const team=[];assert.ok(!t[2].includes('ITEM'),'Import item-bearing parties explicitly before using them: '+m[1]);
  for(const row of t[3].matchAll(/^\s*db\s+(\d+),\s*([^\r\n;]+)/gm)){
   const parts=row[2].split(',').map(x=>x.trim()),id=species.get(normalize(parts.shift()));assert.ok(id,row[2]);const level=Number(row[1]);
   let learned=parts.filter(x=>x!=='NO_MOVE').map(x=>{const id=moves.get(normalize(x));assert.ok(id,x);return id;});
   if(!t[2].includes('MOVES')){learned=[];for(const entry of learnsets[id].filter(x=>x.level<=level)){const old=learned.indexOf(entry.move);if(old>=0)learned.splice(old,1);learned.push(entry.move);}learned=learned.slice(-4);}
   assert.ok(learned.length&&learned.length<=4);team.push({id,level,moves:learned});
  }
  assert.ok(team.length>0&&team.length<=6);list.push({name:t[1],team});
 }
 parties[m[1]]=list;
}
assert.equal(Object.keys(parties).length,selected.size);
const upstream=require('./upstream.json'),files=fs.readdirSync(path.join(__dirname,'raw')).filter(f=>f.endsWith('.asm')).map(file=>{const b=fs.readFileSync(path.join(__dirname,'raw',file));return {file,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};});
const output={source:{repository:upstream.repository,commit:upstream.commit,files},parties};
fs.writeFileSync(path.join(root,'desktop/data/johto-data.json'),JSON.stringify(output));
console.log(JSON.stringify({groups:Object.keys(parties).length,parties:Object.values(parties).reduce((n,x)=>n+x.length,0),pokemonLearnsets:Object.keys(learnsets).length,sourceFiles:files.length}));
