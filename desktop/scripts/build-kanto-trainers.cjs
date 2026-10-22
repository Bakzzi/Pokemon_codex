'use strict';
// Offline, reproducible extraction from pinned Yellow object and party sources.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'desktop/data/kanto-trainer-source'),read=f=>fs.readFileSync(f,'utf8');
const source=JSON.parse(read(path.join(dir,'sources.json'))),dex=new Map([...read(path.join(dir,'pokedex_constants.asm')).matchAll(/\bconst DEX_(\w+)\s*;\s*(\d+)/g)].map(m=>[m[1],Number(m[2])]));
assert.equal(dex.size,151);const parties=new Map();let label=null;
for(const raw of read(path.join(root,'desktop/data/kanto-story-parties.asm')).split(/\r?\n/)){
 const line=raw.split(';')[0].trim(),head=line.match(/^(\w+)Data:$/);if(head){label=head[1].replaceAll('_','').toUpperCase();parties.set(label,[]);continue;}
 if(!label||!line.startsWith('db '))continue;
 const fields=line.slice(3).split(',').map(x=>x.trim());if(fields.at(-1)!=='0')continue;fields.pop();
 const team=[];if(fields[0]==='$FF'){for(let i=1;i<fields.length;i+=2)team.push({id:dex.get(fields[i+1]),level:Number(fields[i])});}
 else for(const name of fields.slice(1))team.push({id:dex.get(name),level:Number(fields[0])});
 assert.ok(team.length&&team.every(p=>p.id&&p.level>0),'Invalid party '+raw);parties.get(label).push(team);
}
const names={GENTLEMAN:'신사',YOUNGSTER:'반바지 꼬마',BUG_CATCHER:'곤충채집 소년',LASS:'아가씨',SAILOR:'선원',JR_TRAINER_M:'보이스카우트',JR_TRAINER_F:'걸스카우트',POKEMANIAC:'포켓몬 마니아',SUPER_NERD:'이과계 남자',HIKER:'등산가',BIKER:'폭주족',BURGLAR:'도둑',ENGINEER:'전기공',FISHER:'낚시꾼',SWIMMER:'수영팬',CUE_BALL:'불량배',GAMBLER:'도박꾼',BEAUTY:'아름다운 아가씨',PSYCHIC_TR:'초능력자',ROCKER:'로커',JUGGLER:'저글러',TAMER:'조련사',BIRD_KEEPER:'새 조련사',BLACKBELT:'태권왕',SCIENTIST:'연구원',ROCKET:'로켓단 조무래기',COOLTRAINER_M:'엘리트 트레이너',COOLTRAINER_F:'엘리트 트레이너',CHANNELER:'무당'};
const art={GENTLEMAN:'gentleman',YOUNGSTER:'youngster',BUG_CATCHER:'bug-catcher',LASS:'lass',SAILOR:'sailor',JR_TRAINER_M:'camper',JR_TRAINER_F:'picnicker',POKEMANIAC:'pokemaniac',SUPER_NERD:'super-nerd',HIKER:'hiker',BIKER:'biker',BURGLAR:'burglar',ENGINEER:'engineer',FISHER:'fisherman',SWIMMER:'swimmer',CUE_BALL:'cue-ball',GAMBLER:'gamer',BEAUTY:'beauty',PSYCHIC_TR:'psychic',ROCKER:'rocker',JUGGLER:'juggler',TAMER:'tamer',BIRD_KEEPER:'bird-keeper',BLACKBELT:'black-belt',SCIENTIST:'scientist',ROCKET:'rocket-grunt',COOLTRAINER_M:'cooltrainer',COOLTRAINER_F:'cooltrainer-f',CHANNELER:'channeler'};
const trainers=[],counts={},maps={};
for(const [map,location]of Object.entries(source.locations)){
 const wildFile=path.join(dir,'wild-'+map+'.asm'),wild=fs.existsSync(wildFile)&&[...read(wildFile).matchAll(/def_(?:grass|water)_wildmons\s+(\d+)/g)].some(m=>Number(m[1])>0);
 let index=0;maps[map]={location,trainers:0,wild};for(const line of read(path.join(dir,map+'.asm')).split(/\r?\n/)){
  const m=line.match(/object_event\s+(\d+),\s*(\d+),.*?,\s*(TEXT_\w+),\s*OPP_(\w+),\s*(\d+)\s*(?:;.*)?$/);if(!m||!names[m[4]])continue;
  const klass=m[4],key=klass==='PSYCHIC_TR'?'PSYCHIC':klass.replaceAll('_',''),team=parties.get(key)?.[Number(m[5])-1];assert.ok(team,'Missing '+map+' '+klass+' '+m[5]);
  assert.ok(location,'Unmapped trainer map '+map);maps[map].trainers++;
  trainers.push({id:'k-npc-'+map.toLowerCase()+'-'+(++index),location,map,event:m[3],x:Number(m[1]),y:Number(m[2]),class:klass,partyIndex:Number(m[5]),name:names[klass],sprite:art[klass],automatic:wild,team});counts[location]=(counts[location]||0)+1;
 }
}
const result={version:'yellow',sourceCommit:source.sources['pokedex_constants.asm'].url.split('/')[5],maps,trainers,counts};
fs.writeFileSync(path.join(root,'shared/kanto-trainers.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({trainers:trainers.length,counts}));
