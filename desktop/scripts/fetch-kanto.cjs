'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
function columns(line){
  const fields=[];let value='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(ch===','&&!quoted){fields.push(value);value='';}else value+=ch;
  }
  fields.push(value);return fields;
}
async function main(){
  const source='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
  const response=await fetch(source,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Species names: HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  const catalog=bytes.toString('utf8').trim().split(/\r?\n/).slice(1).map(columns)
    .filter(row=>row[1]==='3'&&Number(row[0])>=1&&Number(row[0])<=151)
    .map(row=>({id:Number(row[0]),name:row[2],tag:'관동지방의 포켓몬'})).sort((a,b)=>a.id-b.id);
  if(catalog.length!==151||catalog.some((p,i)=>p.id!==i+1||!/[가-힣]/.test(p.name)))throw new Error('Incomplete Korean Kanto catalog');
  const root=path.resolve(__dirname,'..');
  await fs.writeFile(path.join(root,'kanto.json'),JSON.stringify(catalog,null,2)+'\n');
  await fs.writeFile(path.join(root,'assets','catalog-source.json'),JSON.stringify({source,languageId:3,locale:'ko',range:[1,151],sha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');
  console.log(JSON.stringify({count:catalog.length,first:catalog[0],last:catalog.at(-1)}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
