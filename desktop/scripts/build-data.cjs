'use strict';
const fs=require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'), ref=path.join(root,'reference/pokeapi');
const read=async name=>JSON.parse(await fs.readFile(path.join(ref,'data',name+'.json'),'utf8'));
async function main(){
  const species=[...await read('pokemon-kanto'),...await read('pokemon-johto-future')];
  const learning=await read('learnsets-generation-2-3'), moveSource=await read('moves-generation-2-3');
  const growth=await read('growth-and-experience'), typeSource=await read('types-and-matchups'), lookup=await read('reference-lookups');
  const evolution=await read('evolution-rules');
  const {parseCSV}=require('../../reference/pokeapi/prepare.cjs');
  const groups=parseCSV(await fs.readFile(path.join(ref,'raw/version_groups.csv'),'utf8'));
  const breedingSpecies=new Map(parseCSV(await fs.readFile(path.join(ref,'raw/pokemon_species.csv'),'utf8')).map(p=>[p.id,p]));
  const eggGroups=parseCSV(await fs.readFile(path.join(ref,'raw/pokemon_egg_groups.csv'),'utf8'));
  const abilityRows=parseCSV(await fs.readFile(path.join(ref,'raw/abilities.csv'),'utf8'));
  const abilityNames=parseCSV(await fs.readFile(path.join(ref,'raw/ability_names.csv'),'utf8'));
  const abilities=abilityRows.filter(a=>a.generation_id<=3).map(a=>({id:a.id,identifier:a.identifier,name:abilityNames.find(n=>n.ability_id===a.id&&n.local_language_id===3)?.name||a.identifier}));
  const order=new Map(groups.map(g=>[g.id,g.order]));
  const version=learning.versionGroups.find(g=>g.identifier==='firered-leafgreen');
  const typeById=new Map(typeSource.types.map(t=>[t.id,t]));
  const ailments=new Map(lookup.moveAilments.map(a=>[a.id,a.identifier]));
  const pokemon=species.map(p=>{
    const stats={};
    for(const s of p.latestReference.stats){
      const old=p.historicalOverrides.stats.filter(x=>x.stat_id===s.stat_id&&x.generation_id>=3).sort((a,b)=>a.generation_id-b.generation_id)[0];
      stats[s.stat_id]=(old||s).base_stat;
    }
    const oldTypes=p.historicalOverrides.types.filter(t=>t.generation_id>=3).sort((a,b)=>a.generation_id-b.generation_id);
    const types=(oldTypes.length?oldTypes.filter(t=>t.generation_id===oldTypes[0].generation_id):p.latestReference.types).sort((a,b)=>a.slot-b.slot).map(t=>t.type_id);
    const learn=learning.entries.filter(r=>r.pokemon_id===p.id&&r.version_group_id===version.id&&r.pokemon_move_method_id===1).sort((a,b)=>a.level-b.level||(a.order||0)-(b.order||0)).map(r=>({level:r.level,move:r.move_id}));
    const evolutions=evolution.entries.filter(e=>e.fromSpeciesId===p.id&&e.is_default===1&&(order.get(e.version_group_id)||0)<=version.order&&(!e.required_pokemon_form_id||e.required_pokemon_form_id===p.id)&&(!e.evolved_pokemon_form_id||e.evolved_pokemon_form_id===e.evolved_species_id)).map(e=>({to:e.evolved_species_id,trigger:e.evolution_trigger_id,level:e.minimum_level,item:e.trigger_item_id||e.held_item_id,happiness:e.minimum_happiness?220:null,time:e.time_of_day,relativeStats:e.relative_physical_stats}));
    const breeding=breedingSpecies.get(p.id);
    const normalAbilities=[1,2].map(slot=>{
      const past=p.historicalOverrides.abilities.filter(a=>a.slot===slot&&a.generation_id>=3).sort((a,b)=>a.generation_id-b.generation_id)[0];
      return (past||p.latestReference.abilities.find(a=>a.slot===slot&&!a.is_hidden))?.ability_id;
    }).filter(id=>abilities.some(a=>a.id===id));
    return {id:p.id,name:p.name,identifier:p.identifier,generation:p.introducedGeneration,catchRate:p.captureRate,growth:p.growthRateId,legendary:p.isLegendary,mythical:p.isMythical,types,stats,abilities:[...new Set(normalAbilities)],baseExperience:p.latestReference.baseExperience,learn,evolutions,genderRate:breeding.gender_rate,hatchCycles:breeding.hatch_counter,preEvolution:p.evolvesFromSpeciesId,eggGroups:eggGroups.filter(g=>g.species_id===p.id).map(g=>g.egg_group_id),description:p.koreanDescriptions.at(-1)?.text?.replace(/\s+/g,' ')||p.genus};
  });
  const minimum=(p,visited=new Set())=>{
    if(visited.has(p.id))throw new Error('Evolution cycle');
    const parents=pokemon.flatMap(parent=>parent.evolutions.filter(e=>e.to===p.id).map(e=>({parent,rule:e})));
    return parents.length?Math.min(...parents.map(({parent,rule})=>Math.max(rule.level||2,minimum(parent,new Set([...visited,p.id]))))):2;
  };
  for(const p of pokemon){p.minWildLevel=minimum(p);assert.ok(p.abilities.length,'Missing Gen III ability: '+p.id);}
  const moves=moveSource.map(m=>{
    const value={...m.latestReference};
    for(const c of [...m.historicalChanges].filter(c=>(order.get(c.changed_in_version_group_id)||0)>version.order).sort((a,b)=>order.get(b.changed_in_version_group_id)-order.get(a.changed_in_version_group_id)))
      for(const key of ['type_id','power','pp','accuracy','priority','target_id','effect_id','effect_chance'])if(c[key]!==null)value[key]=c[key];
    return {id:m.id,name:m.name,identifier:m.identifier,type:value.type_id,power:value.power,pp:value.pp,accuracy:value.accuracy,priority:value.priority,target:value.target_id,damageClass:value.damage_class_id===1?1:typeById.get(value.type_id)?.damage_class_id||2,effect:value.effect_id,effectChance:value.effect_chance,ailment:ailments.get(m.latestMetadata?.meta_ailment_id)||'none',meta:m.latestMetadata||{},changes:m.latestStatChanges};
  });
  const matchups=typeSource.latestReferenceEfficacy.map(r=>{
    const old=typeSource.historicalOverrides.filter(x=>x.damage_type_id===r.damage_type_id&&x.target_type_id===r.target_type_id&&x.generation_id>=3).sort((a,b)=>a.generation_id-b.generation_id)[0];
    return [r.damage_type_id,r.target_type_id,(old||r).damage_factor/100];
  });
  const source=await fs.readFile(path.join(ref,'raw/firered-trainer-parties.h'),'utf8');
  const key=x=>x.toUpperCase().replaceAll('-','_');
  const speciesIds=new Map(pokemon.map(p=>[key(p.identifier),p.id]));speciesIds.set('MR_MIME',122);
  const moveIds=new Map(moves.map(m=>[key(m.identifier),m.id]));
  const definitions=[
    ['brock','웅','회색배지','LeaderBrock'],['misty','이슬','블루배지','LeaderMisty'],['surge','마티스','오렌지배지','LeaderLtSurge'],['erika','민화','무지개배지','LeaderErika'],
    ['koga','독수','핑크배지','LeaderKoga'],['sabrina','초련','골드배지','LeaderSabrina'],['blaine','강연','진홍색배지','LeaderBlaine'],['giovanni','비주기','그린배지','LeaderGiovanni'],
    ['lorelei','칸나',null,'EliteFourLorelei'],['bruno','시바',null,'EliteFourBruno'],['agatha','국화',null,'EliteFourAgatha'],['lance','목호',null,'EliteFourLance'],['champion','그린',null,'ChampionFirstCharmander']
  ];
  const bosses=definitions.map(([id,name,badge,party],i)=>{
    const body=source.match(new RegExp('sParty_'+party+'\\[\\] = \\{([\\s\\S]*?)\\n\\};'))?.[1];assert.ok(body,party);
    const team=[...body.matchAll(/\.lvl\s*=\s*(\d+),\s*\.species\s*=\s*SPECIES_([A-Z0-9_]+),([\s\S]*?)(?=\.lvl|$)/g)].map(m=>({id:speciesIds.get(m[2]),level:Number(m[1]),moves:[...(m[3].match(/\.moves = \{([^}]+)\}/)?.[1]||'').matchAll(/MOVE_([A-Z0-9_]+)/g)].filter(x=>x[1]!=='NONE').map(x=>{const id=moveIds.get(x[1]);assert.ok(id,`Move ${x[1]}`);return id;})}));
    assert.ok(team.length&&team.every(p=>p.id),party);
    return {id,name,badge,kind:i<8?'gym':i<12?'elite':'champion',team};
  });
  const experience=Object.fromEntries(growth.growthRates.map(g=>[g.id,growth.entries.filter(e=>e.growth_rate_id===g.id).map(e=>e.experience)]));
  const data={version:2,ruleset:'firered-leafgreen',pokemon,moves,abilities,types:typeSource.types,matchups,experience,items:evolution.items,bosses,sources:{data:'https://github.com/PokeAPI/pokeapi/tree/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv',trainers:'https://github.com/pret/pokefirered/blob/master/src/data/trainer_parties.h',battle:'https://github.com/pkmn/ps/tree/main/sim'}};
  assert.equal(pokemon.length,251);assert.equal(bosses.length,13);
  await fs.mkdir(path.join(root,'desktop/data'),{recursive:true});
  await fs.writeFile(path.join(root,'desktop/data/game-data.json'),JSON.stringify(data));
  await fs.copyFile(path.join(ref,'raw/UPSTREAM-LICENSE'),path.join(root,'desktop/data/LICENSE-PokeAPI.txt'));
  // Keep the existing 1st-generation Crystal animations and fetch missing future sprites only.
  let spriteManifest=JSON.parse(await fs.readFile(path.join(root,'desktop/assets/manifest.json'),'utf8'));
  const crypto=require('node:crypto');
  for(let start=1;start<=251;start+=4){
    const results=await Promise.all(Array.from({length:Math.min(4,252-start)},(_,i)=>start+i).map(async id=>{
      const old=spriteManifest.find(x=>x.id===id);
      if(old){const bytes=await fs.readFile(path.join(root,'desktop/assets',id+'.gif'));if(crypto.createHash('sha256').update(bytes).digest('hex')===old.sha256)return old;}
      const url=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal/animated/${id}.gif`;
      const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok,`Sprite ${id}: ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());assert.match(bytes.toString('ascii',0,6),/^GIF8[79]a$/);
      await fs.writeFile(path.join(root,'desktop/assets',id+'.gif'),bytes);
      return {id,url,width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    }));
    for(const r of results)spriteManifest=[...spriteManifest.filter(x=>x.id!==r.id),r];
  }
  await fs.writeFile(path.join(root,'desktop/assets/manifest.json'),JSON.stringify(spriteManifest.sort((a,b)=>a.id-b.id),null,2));
  console.log(JSON.stringify({pokemon:pokemon.length,moves:moves.length,bosses:bosses.map(b=>({name:b.name,team:b.team})),sprites:spriteManifest.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
