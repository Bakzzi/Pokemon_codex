'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'desktop/assets'),manifest=[];
const faceCrops={chuck:[2634,850,280,950],bruno:[1169,450,0,450],lance:[2064,1000,100,800],janine:[1761,1000,180,800]};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const previous=fs.existsSync(path.join(__dirname,'asset-progress.json'))?JSON.parse(fs.readFileSync(path.join(__dirname,'asset-progress.json'),'utf8')):[];
function archive(file){const h=crypto.createHash('md5').update(file).digest('hex');return `https://archives.bulbagarden.net/media/upload/${h[0]}/${h.slice(0,2)}/${file}`;}
async function get(url){const cached=previous.find(m=>m.url===url&&fs.existsSync(path.join(base,m.file)));if(cached){const b=fs.readFileSync(path.join(base,cached.file));if(sha(b)===cached.sha256)return b;}const r=await fetch(url,{signal:AbortSignal.timeout(45000)});assert.ok(r.ok,r.status+' '+url);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a',url);return b;}
async function save(file,url,extra={}){const b=await get(url);const p=path.join(base,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);manifest.push({file,url,width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,sha256:sha(b),...extra});}
async function portrait(name,title=name){
 const file=name==='red'?'FireRed_LeafGreen_Red.png':`HeartGold_SoulSilver_${title}.png`,original=archive(file),b=await get(original),width=b.readUInt32BE(16),height=b.readUInt32BE(20),scale=height/384;
 // Archive thumbnail generation is unavailable for uncached dimensions. Keep
 // the original artwork intact and crop its face only in CSS.
 const target='trainers/portraits/j-'+name+'.png';fs.mkdirSync(path.dirname(path.join(base,target)),{recursive:true});fs.writeFileSync(path.join(base,target),b);manifest.push({file:target,url:original,width,height,bytes:b.length,sha256:sha(b),defaultCrop:faceCrops[name]||[width,Math.max(0,Math.round(width/2-55*scale)),0,Math.round(110*scale)]});
}
async function main(){
 const sprites={falkner:'falkner',bugsy:'bugsy',whitney:'whitney',morty:'morty',chuck:'chuck',jasmine:'jasmine',pryce:'pryce',clair:'clair',will:'will',koga:'koga',bruno:'bruno',karen:'karen',lance:'lance',silver:'silver',red:'red',blue:'blue',janine:'janine',brock:'brock',misty:'misty',surge:'ltsurge',erika:'erika',sabrina:'sabrina',blaine:'blaine',sage:'sage',grunt:'rocketgrunt',executive:'rocketexecutive',executivef:'rocketexecutivef',kimono:'kimonogirl',blackbelt:'blackbelt',eusine:'eusine',sailor:'sailor',scientist:'scientist'};
 for(const names of Object.entries(sprites).reduce((a,p,i)=>(a[Math.floor(i/4)]||=[]).push(p)&&a,[]))await Promise.all(names.map(([name,source])=>save('trainers/battle/j-'+name+'.png','https://play.pokemonshowdown.com/sprites/trainers/'+source+'-gen2.png')));
 const portraits=[['Falkner'],['Bugsy'],['Whitney'],['Morty'],['Chuck'],['Jasmine'],['Pryce'],['Clair'],['Will'],['Koga'],['Bruno'],['Karen'],['Lance'],['Silver'],['Red'],['Blue'],['Janine']];
 for(let i=0;i<portraits.length;i+=3)await Promise.all(portraits.slice(i,i+3).map(([name,title])=>portrait(name.toLowerCase(),title||name)));
 await portrait('elm','Professor_Elm');const elm=manifest.find(m=>m.file==='trainers/portraits/j-elm.png');await save('trainers/battle/j-elm.png',elm.url,{originalSource:elm.originalSource});
 const badges={falkner:'Zephyr',bugsy:'Hive',whitney:'Plain',morty:'Fog',chuck:'Storm',jasmine:'Mineral',pryce:'Glacier',clair:'Rising'};
 for(const [name,badge]of Object.entries(badges))await save('badges/j-'+name+'.png',archive(badge+'_Badge.png'));
 for(const item of ['squirt-bottle','secret-potion','clear-bell','silver-wing','rainbow-wing','ss-ticket','machine-part','red-scale'])await save('items/j-'+item+'.png','https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'+item+'.png');
 await save('items/j-gs-ball.png',archive('GS_Ball_Crystal.png'));
 const radio=fs.readFileSync(path.join(base,'items/xtransceiver.png'));fs.writeFileSync(path.join(base,'items/j-expansion-card.png'),radio);manifest.push({file:'items/j-expansion-card.png',sourceFile:'items/xtransceiver.png',usage:'Radio communication feature indicator; existing original item artwork, not a claimed Generation II card sprite',bytes:radio.length,sha256:sha(radio)});
 await save('trainers/battle/j-silver-late.png','https://play.pokemonshowdown.com/sprites/trainers/silver-gen2kanto.png');
 const url='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal/animated/shiny/130.gif',r=await fetch(url);assert.ok(r.ok);const b=Buffer.from(await r.arrayBuffer());assert.match(b.toString('ascii',0,6),/^GIF8[79]a$/);fs.mkdirSync(path.join(base,'shiny'),{recursive:true});fs.writeFileSync(path.join(base,'shiny/130.gif'),b);manifest.push({file:'shiny/130.gif',url,bytes:b.length,sha256:sha(b)});
 fs.writeFileSync(path.join(base,'johto-sources.json'),JSON.stringify({copyright:'Pokemon / Nintendo / Creatures / GAME FREAK. Original assets and unchanged official artwork. Not covered by this project MIT license.',assets:manifest},null,2)+'\n');
 const faces=Object.fromEntries(manifest.filter(a=>a.defaultCrop).map(a=>[path.basename(a.file,'.png'),a.defaultCrop]));
 fs.writeFileSync(path.join(root,'desktop/johto-art.js'),"'use strict';globalThis.JohtoPortraits="+JSON.stringify(faces)+';\n');
 console.log(JSON.stringify({assets:manifest.length,bytes:manifest.reduce((n,m)=>n+m.bytes,0)}));
}
main().catch(error=>{fs.writeFileSync(path.join(__dirname,'asset-progress.json'),JSON.stringify(manifest,null,2));console.error(error);process.exitCode=1;});
