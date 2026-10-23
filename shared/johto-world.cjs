'use strict';
const J=require('./johto.cjs'),original=require('./johto-map.json'),K=require('./kanto-world.cjs'),walking=require('../desktop/map-walk.js'),journey=require('./world-travel.cjs');
const rows=[
 ['newbark','연두마을','NewBarkTown'],['route29','29번도로','Route29'],['cherrygrove','무궁시티','CherrygroveCity'],['route30','30번도로','Route30'],['route31','31번도로','Route31'],['violet','도라지시티','VioletCity'],
 ['route32','32번도로','Route32','j-falkner'],['ruins','알프의유적','RuinsOfAlph','j-falkner'],['union','연결동굴','UnionCave','j-falkner'],['route33','33번도로','Route33','j-falkner'],['azalea','고동마을','AzaleaTown','j-falkner'],['ilex','너도밤나무숲','IlexForest','j-bugsy'],['route34','34번도로','Route34','j-ilex'],['goldenrod','금빛시티','GoldenrodCity','j-ilex'],['route35','35번도로','Route35','j-ilex'],['park','자연공원','NationalPark','j-ilex'],['route36','36번도로','Route36','j-ilex'],['route37','37번도로','Route37','j-sudowoodo'],['ecruteak','인주시티','EcruteakCity','j-sudowoodo'],
 ['route38','38번도로','Route38','j-morty'],['route39','39번도로','Route39','j-morty'],['olivine','담청시티','OlivineCity','j-morty'],['route40','40번수로','Route40','j-lighthouse'],['whirl','소용돌이섬','WhirlIslands','j-lighthouse'],['route41','41번수로','Route41','j-lighthouse'],['cianwood','진청시티','CianwoodCity','j-lighthouse'],
 ['route42','42번도로','Route42','j-jasmine'],['mortar','절구산','MtMortar','j-jasmine'],['mahogany','황토마을','MahoganyTown','j-jasmine'],['route43','43번도로','Route43','j-jasmine'],['rage','분노의호수','LakeOfRage','j-jasmine'],['route44','44번도로','Route44','j-radio-final'],['ice','얼음샛길','IcePath','j-radio-final'],['blackthorn','검은먹시티','BlackthornCity','j-ice-path'],['dragon','용의굴','DragonsDen','j-clair'],['route45','45번도로','Route45','j-clair'],['route46','46번도로','Route46'],['silver','은빛산','SilverCave','j-k-blue']
];
rows.push(['dark','어둠의동굴','DarkCave']);
const places=rows.map(([id,name,landmark,requires])=>({id:'j-'+id,name,zone:'johto',requires:requires||null,point:original.landmarks[landmark]}));
for(const p of K.places)places.push({id:'j-k-'+p.id,name:p.name,zone:'kanto',requires:['indigo','victory-road','route-23'].includes(p.id)?'j-dragon-den':'j-ship',point:require('./kanto-map.json').points[p.id]});
const byId=new Map(places.map(p=>[p.id,p]));
const habitats=require('./johto-habitats.json'),{merge}=require('./local-habitats.cjs');
const localNames={newbark:'new-bark-town',cherrygrove:'cherrygrove-city',violet:'violet-city',ruins:'ruins-of-alph',union:'union-cave',azalea:'azalea-town',ilex:'ilex-forest',goldenrod:'goldenrod-city',park:'national-park',ecruteak:'ecruteak-city',olivine:'olivine-city',whirl:'whirl-islands',cianwood:'cianwood-city',mortar:'mt-mortar',mahogany:'mahogany-town',rage:'lake-of-rage',ice:'ice-path',blackthorn:'blackthorn-city',dragon:'dragons-den',silver:'mt-silver'};
const townRoads={newbark:['route29'],cherrygrove:['route29','route30'],violet:['route31','route32','route36'],azalea:['route33','ilex'],goldenrod:['route34','route35'],ecruteak:['route37','route38','route42'],olivine:['route39','route40'],cianwood:['route41'],mahogany:['route42','route43','route44'],blackthorn:['route45','ice']};
localNames.dark='dark-cave';
function poolNames(p){if(p.id.startsWith('j-k-'))return [K.byId.get(p.id.slice(4)).habitat];const id=p.id.slice(2);return [localNames[id]||'johto-'+([40,41].includes(+id.slice(5))?'sea-':'')+id.replace(/^route(\d+)/,'route-$1'),...(id==='ecruteak'?['bell-tower']:[])];}
function sources(game,p){const ids=p.zone==='kanto'?(K.townRoads[p.id.slice(4)]||[]).map(id=>'j-k-'+id):(townRoads[p.id.slice(2)]||[]).map(id=>'j-'+id);return [p,...ids.map(id=>byId.get(id)).filter(q=>unlocked(game,q))];}
function habitat(game,p=byId.get(init(game).location)){return merge([...new Set(sources(game,p).flatMap(poolNames))].map(key=>habitats[key]));}
function locationsFor(id){return places.filter(p=>poolNames(p).some(key=>habitats[key]?.some(p=>p.id===id)));}
function geometry(zone){
 if(zone==='kanto'){const map=require('./kanto-map.json');return {...map,points:Object.fromEntries(Object.entries(map.points).map(([id,p])=>['j-k-'+id,p])),roads:map.roads.map(p=>({...p,place:'j-k-'+p.place}))};}
 const points=Object.fromEntries(places.filter(p=>p.zone==='johto').map(p=>[p.id,p.point])),roads=original.roads.map(p=>({...p}));
 for(const [place,p]of Object.entries(points))if(!roads.some(q=>journey.same(p,q)))roads.push({...p,place});
 // Assign cells along connected roads, so a nearby branch across empty map
 // space cannot become a compulsory detour in the travel itinerary.
 const key=p=>p.x+','+p.y,cells=new Map(roads.map(p=>[key(p),p])),owners=new Map(),queue=[];
 for(const [id,p]of Object.entries(points))if(!owners.has(key(p))){owners.set(key(p),id);queue.push(p);}
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy]of [[0,-8],[8,0],[0,8],[-8,0]]){const next=cells.get((p.x+dx)+','+(p.y+dy));if(next&&!owners.has(key(next))){owners.set(key(next),owners.get(key(p)));queue.push(next);}}}
 for(const p of roads)p.place=owners.get(key(p));
 return {image:original.image,width:original.width,height:original.height,points,roads};
}
const maps={johto:geometry('johto'),kanto:geometry('kanto')};
function init(game,now=Date.now()){
 if(game.data.johtoWorld?.revision===1&&byId.has(game.data.johtoWorld.location)){journey.init(game.data.johtoWorld,game.random);return game.data.johtoWorld;}
 const location=J.done(game,'j-ship')?'j-k-vermilion':J.done(game,'j-clair')?'j-blackthorn':J.done(game,'j-jasmine')?'j-mahogany':J.done(game,'j-morty')?'j-olivine':J.done(game,'j-sudowoodo')?'j-ecruteak':J.done(game,'j-ilex')?'j-goldenrod':J.done(game,'j-falkner')?'j-azalea':'j-newbark';
 game.data.johtoWorld={revision:1,location,position:{...byId.get(location).point},visited:{[location]:now}};journey.init(game.data.johtoWorld,game.random);return game.data.johtoWorld;
}
function unlocked(game,p){return !!p&&(!p.requires||J.done(game,p.requires));}
function status(game,id,point){if(!J.active(game)||!byId.has(id))return {state:'invalid',reason:'지금 모험 중인 지방의 장소를 선택해 주세요.'};const p=byId.get(id),map=maps[p.zone];if(point&&!map.roads.some(c=>c.place===id&&journey.same(c,point))&&!journey.same(point,p.point))return {state:'invalid',reason:'지도에 표시된 길을 선택해 주세요.'};const s=init(game);if(s.journey?.destination===id&&journey.same(s.journey.position,point||p.point))return {state:'done',reason:'이곳으로 모험하고 있어요.'};if(s.location===id&&journey.same(s.position,point||p.point)&&!s.blocked&&!s.journey)return {state:'done',reason:'지금 탐험 중이에요.'};return null;}
function travel(game,id,now,point){
 if(status(game,id,point)?.state==='invalid'||game.data.battle||game.data.suspendedWild)return false;
 const s=init(game),p=byId.get(id),map=maps[p.zone],to=point||p.point,old=byId.get(s.location);
 if(old.zone!==p.zone||id==='j-silver'){
  if(!unlocked(game,p)){s.journey=null;s.blocked={location:id,checkpoint:id,position:{...to},at:now};game.holdUntil(now+180);return true;}
  const entryId=id==='j-silver'?id:p.zone==='kanto'?(J.done(game,'j-ship')?'j-k-vermilion':'j-k-indigo'):'j-newbark',entry=id==='j-silver'?to:maps[p.zone].points[entryId];
  if(game.platform==='mobile'){
   const arrival={...s,visited:{...s.visited},location:entryId,position:{...entry}};if(!journey.move(game,arrival,map,id,to,place=>unlocked(game,byId.get(place)),p.name,now))return false;
   // Separate regional maps have no shared cell edge. The crossing still costs
   // one movement unit; selecting a remote region never relocates immediately.
   arrival.journey.segments.unshift({location:entryId,path:[{...entry}]});s.journey=arrival.journey;s.walk=null;s.blocked=null;return true;
  }
  s.location=entryId;s.position={...entry};
 }
 return journey.move(game,s,map,id,to,place=>unlocked(game,byId.get(place)),p.name,now);
}
function checkpoint(game){const s=init(game),b=s.blocked;if(!b)return null;const p=byId.get(b.checkpoint);return {...b,name:p.name+' 안내원',sprite:'j-sage',pages:unlocked(game,p)?['길이 열렸어요. 조심히 다녀오세요.']:p.id==='j-route37'?['나무 같은 무언가가 길을 막고 있어요.','금빛시티에서 깨울 방법을 찾아보세요.']:['이 앞의 길은 아직 지나갈 수 없어요.','지금 머무는 마을에서 사람들의 이야기를 들어 보세요.'],canPass:unlocked(game,p)&&unlocked(game,byId.get(b.location)),destination:byId.get(b.location).name};}
function passageStatus(game,id){const c=checkpoint(game);return !c||c.location!==id||!c.canPass?{state:'invalid',reason:'아직 이 길을 지나갈 수 없어요.'}:null;}
function pass(game,id,now){if(passageStatus(game,id))return false;const b=init(game).blocked;return travel(game,id,now,b.position);}
const grouped={'j-lab':'j-newbark','j-early':'j-violet','j-well':'j-azalea','j-tree':'j-route36','j-burned-tower':'j-ecruteak','j-dance':'j-ecruteak','j-rage-lake':'j-rage','j-rocket-hq':'j-mahogany','j-radio-tower':'j-goldenrod','j-bell-tower':'j-ecruteak','j-ship-route':'j-olivine','j-power-plant':'j-k-power-plant','j-kanto-road':'j-k-vermilion'};
const local={'j-falkner':'j-violet','j-bugsy':'j-azalea','j-whitney':'j-goldenrod','j-morty':'j-ecruteak','j-chuck':'j-cianwood','j-jasmine':'j-olivine','j-pryce':'j-mahogany','j-clair':'j-blackthorn','j-ilex':'j-ilex','j-ice-path':'j-ice','j-dragon-den':'j-dragon','j-victory-road':'j-newbark','j-league':'j-k-indigo','j-togepi':'j-violet','j-odd-egg':'j-route34','j-ruins':'j-ruins','j-eusine':'j-cianwood','j-shuckle':'j-cianwood','j-kiyo':'j-mortar','j-bill':'j-goldenrod','j-park':'j-park','j-lighthouse':'j-olivine','j-medicine':'j-cianwood','j-amphy':'j-olivine','j-rainbow':'j-ecruteak','j-silver-wing':'j-k-pewter','j-red':'j-silver','j-gs-ball':'j-goldenrod','j-shrine':'j-ilex','j-k-surge':'j-k-vermilion','j-k-sabrina':'j-k-saffron','j-k-misty':'j-k-cerulean','j-k-erika':'j-k-celadon','j-k-janine':'j-k-fuchsia','j-k-brock':'j-k-pewter','j-k-blaine':'j-k-seafoam','j-k-blue':'j-k-viridian'};
function locationFor(id){const n=J.nodes.get(id);return local[id]||grouped[n?.group]||(n?.target?locationFor(n.target):null);}
function snapshot(game,now=Date.now()){
 const s=init(game),current=byId.get(s.location),map=maps[current.zone],pending=game.data.pendingActions?.find(a=>['travel','world-pass'].includes(a.kind));
 return {active:true,location:s.location,name:current.name,zone:current.zone,map,maps,...journey.snapshot(s,game.random),...(game.platform==='mobile'?require('./step-travel.cjs').snapshot(game,s):{}),position:s.position,levels:{max:game.wildLevelCap()},walk:s.walk&&now<s.walk.at+s.walk.duration?s.walk:null,facing:s.walk?walking.frame(s.walk,s.walk.at+s.walk.duration).direction:'down',pending:pending?.location||null,checkpoint:checkpoint(game),locations:Object.fromEntries([...J.nodes.keys()].map(id=>[id,locationFor(id)])),places:places.map(p=>({id:p.id,name:p.name,zone:p.zone,current:p.id===s.location,open:unlocked(game,p),visited:!!s.visited[p.id],levels:{max:game.wildLevelCap()},notice:[...J.nodes.values()].some(n=>locationFor(n.id)===p.id&&J.available(game,n))}))};
}
module.exports={init,travel,status,checkpoint,passageStatus,pass,locationFor,snapshot,maps,places,byId,townRoads,habitat,poolNames,locationsFor,advance:(game,now)=>journey.advance(game,init(game),now),encounterEnded:(game,b)=>journey.encounterEnded(init(game),b,game.random)};
