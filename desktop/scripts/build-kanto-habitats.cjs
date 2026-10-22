'use strict';
// Reproducible extraction from the already pinned PokeAPI CSV snapshot.
// Map coordinates/order: pret/pokered data/maps/town_map_entries.asm and town_map_order.asm.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
function csv(name){const [header,...rows]=fs.readFileSync(path.join(root,'reference/pokeapi/raw',name+'.csv'),'utf8').trim().split(/\r?\n/).map(l=>l.split(','));return rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));}
const locations=new Map(csv('locations').map(p=>[p.id,p.identifier])),areas=new Map(csv('location_areas').map(p=>[p.id,locations.get(p.location_id)]));
const slots=new Map(csv('encounter_slots').map(p=>[p.id,p]));
const names=['kanto-route-1','kanto-route-2','viridian-forest','kanto-route-3','mt-moon','kanto-route-4','kanto-route-24','kanto-route-25','kanto-route-5','kanto-route-6','kanto-route-11','ss-anne','digletts-cave','kanto-route-9','rock-tunnel','kanto-route-10','kanto-route-8','kanto-route-7','pokemon-tower','celadon-city','kanto-route-12','kanto-route-16','kanto-route-13','kanto-route-14','kanto-route-15','kanto-route-17','kanto-route-18','kanto-sea-route-19','seafoam-islands','kanto-sea-route-20','cinnabar-island','pokemon-mansion','kanto-power-plant','kanto-sea-route-21','kanto-route-22','kanto-route-23','kanto-victory-road-2','cerulean-cave'];
const pools=Object.fromEntries(names.map(n=>[n,new Map()]));
for(const e of csv('encounters')){
 const pool=pools[areas.get(e.location_area_id)],slot=slots.get(e.encounter_slot_id);
 // Walking, rods and surfing only; gifts, trades and static encounters are not wild slots.
 if(!pool||!['3','10','11'].includes(e.version_id)||+slot.encounter_method_id>5||+e.pokemon_id>151)continue;
 const id=+e.pokemon_id,p=pool.get(id)||{id,weight:0};p.weight+=+slot.rarity||1;pool.set(id,p);
}
// Existing game availability is retained for species whose original habitat
// was a gift, trade or an evolved form. No new item/HM system is introduced.
const supplements={
 'viridian-forest':[12,15], 'kanto-route-2':[122], 'kanto-route-11':[97],
 'kanto-route-23':[18], 'kanto-route-21':[149], 'kanto-route-17':[53], 'kanto-route-14':[97,127],
 'celadon-city':[133,137], 'kanto-route-7':[106,107],
 'cinnabar-island':[138,140,142], 'seafoam-islands':[124,144], 'pokemon-mansion':[126],
 'kanto-power-plant':[145], 'kanto-victory-road-2':[78,146], 'cerulean-cave':[139,141,147,148,150,151]
};
// The marine habitat's identifier includes "sea" in the source data.
supplements['kanto-sea-route-21']=supplements['kanto-route-21'];delete supplements['kanto-route-21'];
for(const [name,ids] of Object.entries(supplements))for(const id of ids)if(!pools[name].has(id))pools[name].set(id,{id,weight:1});
const result=Object.fromEntries(Object.entries(pools).map(([name,pool])=>[name,[...pool.values()].sort((a,b)=>a.id-b.id)]));
fs.writeFileSync(path.join(root,'shared/kanto-habitats.json'),JSON.stringify(result,null,2)+'\n');
console.log('Prepared '+Object.keys(result).length+' local habitats from pinned encounter data.');
