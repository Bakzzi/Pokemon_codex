'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/pokeapi/manifest.json'),'utf8'));
function csv(name){const file='raw/'+name+'.csv',bytes=fs.readFileSync(path.join(root,'reference/pokeapi',file));if(crypto.createHash('sha256').update(bytes).digest('hex')!==manifest.sources.find(f=>f.file===file)?.sha256)throw Error('Pinned input differs: '+name);const [header,...rows]=bytes.toString().trim().split(/\r?\n/).map(l=>l.split(','));return rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));}
const locations=new Map(csv('locations').map(p=>[p.id,p.identifier])),areas=new Map(csv('location_areas').map(p=>[p.id,locations.get(p.location_id)])),slots=new Map(csv('encounter_slots').map(p=>[p.id,p]));
const pools=new Map(),pool=name=>{if(!pools.has(name))pools.set(name,new Map());return pools.get(name);},add=(name,id,weight=1)=>{const p=pool(name);p.set(id,{id,weight:(p.get(id)?.weight||0)+weight});};
for(const e of csv('encounters')){const s=slots.get(e.encounter_slot_id),method=+s.encounter_method_id;if(!['4','5','6'].includes(e.version_id)||+e.pokemon_id>251||!(method<=7||[22,23,24].includes(method)))continue;add(areas.get(e.location_area_id),+e.pokemon_id,+s.rarity||1);}
// Preserve this game's existing legal level evolutions and first-region special
// habitats while keeping gifts, trade evolutions and story exclusions in runtime.
const {species,wildEligible}=require('../pokemon.cjs'),kanto=require('../../shared/kanto-habitats.json');
const nativeIds=new Set([...pools.values()].flatMap(p=>[...p.keys()]));
for(const [name,entries]of Object.entries(kanto)){const missing=!pools.has(name);for(const p of entries)if(missing||!nativeIds.has(p.id)||species.get(p.id).legendary||species.get(p.id).mythical)add(name,p.id,p.weight);}
add('union-cave',131);
add('national-park',123);add('mt-mortar',237);
for(const [name,p]of pools){for(let pass=0;pass<3;pass++)for(const parent of [...p.values()])for(const e of species.get(parent.id).evolutions)if(e.trigger===1&&!e.item&&species.get(e.to)&&wildEligible(species.get(e.to),2,100)&&!p.has(e.to))add(name,e.to);}
for(const name of [...pools.keys()].filter(n=>/^johto-(?:sea-)?route-/.test(n)))for(const id of [243,244,245])add(name,id);
for(const [name,id]of [['whirl-islands',249],['bell-tower',250],['ilex-forest',251]])add(name,id);
fs.writeFileSync(path.join(root,'shared/johto-habitats.json'),JSON.stringify(Object.fromEntries([...pools].sort(([a],[b])=>a.localeCompare(b)).map(([name,p])=>[name,[...p.values()].sort((a,b)=>a.id-b.id)])),null,2)+'\n');
console.log('Prepared '+pools.size+' pinned Gold/Silver/Crystal habitats.');
