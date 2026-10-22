'use strict';
// Geography is shared by both products. Story state remains the source of truth.
const habitats=require('./kanto-habitats.json');
const map=require('./kanto-map.json');
const badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
// id, name, map x/y, required badges, local range, habitat, activity/card
const rows=[
 ['pallet','태초마을',2,11,0,2,5,'kanto-route-1'],
 ['route-1','1번도로',2,10,0,2,5,'kanto-route-1'],
 ['viridian','상록시티',2,8,0,3,7,'kanto-route-2','gym:7'],
 ['route-2','2번도로',2,6,0,3,7,'kanto-route-2'],
 ['forest','상록숲',2,4,0,4,10,'viridian-forest'],
 ['pewter','회색시티',2,3,0,4,10,'viridian-forest','gym:0'],
 ['route-3','3번도로',4,3,1,6,12,'kanto-route-3'],
 ['mt-moon','달맞이산',6,2,1,8,14,'mt-moon'],
 ['route-4','4번도로',8,2,1,8,14,'kanto-route-4'],
 ['cerulean','블루시티',10,2,1,8,14,'kanto-route-4','gym:1'],
 ['route-24','24번도로',10,1,1,8,14,'kanto-route-24'],
 ['route-25','25번도로',11,0,1,9,14,'kanto-route-25'],
 ['sea-cottage','이수재의 집',12,0,1,9,14,'kanto-route-25'],
 ['route-5','5번도로',10,3,2,10,16,'kanto-route-5'],
 ['route-6','6번도로',10,8,2,10,16,'kanto-route-6'],
 ['vermilion','갈색시티',10,9,2,10,16,'kanto-route-11','gym:2'],
 ['ss-anne','상트안느호',9,10,2,10,16,'ss-anne'],
 ['route-11','11번도로',12,9,2,11,16,'kanto-route-11'],
 ['diglett','디그다의 굴',3,4,2,10,30,'digletts-cave'],
 ['route-9','9번도로',13,2,3,15,21,'kanto-route-9'],
 ['rock-tunnel','돌산터널',14,3,3,15,21,'rock-tunnel'],
 ['route-10','10번도로',14,4,3,15,21,'kanto-route-10'],
 ['lavender','보라타운',14,5,3,15,21,'kanto-route-8'],
 ['tower','포켓몬타워',15,5,3,17,25,'pokemon-tower','rescue'],
 ['route-8','8번도로',13,5,3,15,21,'kanto-route-8'],
 ['route-7','7번도로',8,5,3,15,21,'kanto-route-7'],
 ['celadon','무지개시티',7,5,3,15,21,'celadon-city','gym:3'],
 ['route-12','12번도로',14,9,4,23,34,'kanto-route-12','road'],
 ['route-16','16번도로',5,5,4,23,34,'kanto-route-16','road'],
 ['route-13','13번도로',13,11,4,24,34,'kanto-route-13'],
 ['route-14','14번도로',11,12,4,24,34,'kanto-route-14'],
 ['route-15','15번도로',10,13,4,24,34,'kanto-route-15'],
 ['route-17','17번도로',4,8,4,24,34,'kanto-route-17'],
 ['route-18','18번도로',6,13,4,24,34,'kanto-route-18'],
 ['fuchsia','연분홍시티',8,13,4,24,34,'kanto-route-15','gym:4'],
 ['safari','사파리존',8,12,4,24,34,'kanto-route-15','safari'],
 ['saffron','노랑시티',10,5,5,26,32,'kanto-route-7','gym:5'],
 ['route-19','19번수로',6,15,6,28,34,'kanto-sea-route-19'],
 ['seafoam','쌍둥이섬',5,15,6,28,52,'seafoam-islands'],
 ['route-20','20번수로',4,15,6,28,34,'kanto-sea-route-20'],
 ['cinnabar','홍련섬',2,15,6,28,34,'cinnabar-island','gym:6'],
 ['mansion','포켓몬저택',1,15,6,28,40,'pokemon-mansion','mansion'],
 ['power-plant','무인발전소',15,4,6,28,52,'kanto-power-plant'],
 ['route-21','21번수로',2,13,7,30,36,'kanto-sea-route-21'],
 ['route-22','22번도로',0,8,0,3,7,'kanto-route-22'],
 ['route-23','23번도로',0,6,8,38,47,'kanto-route-23'],
 ['victory-road','챔피언로드',0,4,8,39,52,'kanto-victory-road-2'],
 ['indigo','석영고원',0,2,8,39,47,'kanto-victory-road-2','league'],
 ['cerulean-cave','블루시티 동굴',9,1,9,45,52,'cerulean-cave']
];
const places=rows.map(([id,name,x,y,stage,min,max,habitat,activity])=>({id,name,x,y,stage,min,max,habitat,activity:activity||null}));
const byId=new Map(places.map(p=>[p.id,p]));
const roadPlaces=new Set(['route-13','route-14','route-15','route-17','route-18','fuchsia','safari']);
const links=[['pallet','route-1','viridian','route-2','forest','pewter','route-3','mt-moon','route-4','cerulean','route-9','rock-tunnel','route-10','lavender','route-8','route-7','celadon','route-16','route-17','route-18','fuchsia','route-15','route-14','route-13','route-12','route-11','vermilion','route-6','saffron','route-5','cerulean','route-24','route-25','sea-cottage'],['viridian','route-22','route-23','victory-road','indigo'],['fuchsia','route-19','seafoam','route-20','cinnabar','route-21','pallet'],['celadon','saffron','lavender'],['route-10','power-plant'],['forest','diglett','route-11'],['vermilion','ss-anne'],['fuchsia','safari'],['cinnabar','mansion'],['cerulean','cerulean-cave']];
function active(game){return !game.data.johtoUnlocked;}
function reachedStage(game){return game.data.champion?9:badges.findIndex(b=>!game.data.badges.includes(b))<0?8:badges.findIndex(b=>!game.data.badges.includes(b));}
function roadOpen(game){return !!(game.data.trainingDevice?.snorlaxWonAt||game.data.trainingDevice?.legacyRoadAccess);}
function unlocked(game,p){return !!p&&reachedStage(game)>=p.stage&&(!roadPlaces.has(p.id)||roadOpen(game))&&(p.id!=='tower'||!!game.data.mobileStory?.scopeObtainedAt);}
function reason(game,p){
 if(unlocked(game,p))return '';
 if(p.stage>reachedStage(game))return '앞선 체육관을 통과하면 갈 수 있어요.';
 if(roadPlaces.has(p.id))return '길을 막는 잠만보를 해결해야 해요.';
 return '이곳을 탐험할 방법을 먼저 찾아야 해요.';
}
function init(game,now=Date.now()){
 if(game.data.kantoWorld?.revision===1&&byId.has(game.data.kantoWorld.location))return game.data.kantoWorld;
 const defaults=['route-1','route-3','route-5','route-9',roadOpen(game)?'route-15':'route-12','saffron','route-19','route-21','route-23','cerulean-cave'];
 const location=defaults[reachedStage(game)];
 return game.data.kantoWorld={revision:1,location,visited:{[location]:now}};
}
function current(game){return byId.get(init(game).location);}
function range(game,p=current(game)){
 const max=Math.min(p.max,game.wildLevelCap());return {min:Math.min(p.min,max),max};
}
function options(game){
 const p=current(game),levels=range(game,p);
 return {habitat:habitats[p.habitat],minimumEncounterLevel:levels.min,maximumLevel:levels.max};
}
function status(game,id){
 if(!active(game))return {state:'invalid',reason:'지금 모험 중인 지방에서 장소를 선택해 주세요.'};
 const p=byId.get(id);if(!p||!unlocked(game,p))return {state:'invalid',reason:p?reason(game,p):'갈 수 없는 장소예요.'};
 if(current(game).id===id)return {state:'done',reason:'지금 탐험 중이에요.'};
 if(game.data.mobileStory?.safari?.trip)return {state:'waiting',reason:'사파리 탐험을 마치면 이동해요.'};
 return null;
}
function travel(game,id,now){
 if(!unlocked(game,byId.get(id))||!active(game)||game.data.battle||game.data.suspendedWild)return false;
 const state=init(game,now);state.location=id;state.visited[id] ||= now;
 game.log(byId.get(id).name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
function snapshot(game){
 const state=init(game),here=current(game),levels=range(game);
 const selected=game.data.pendingActions?.find(a=>a.kind==='travel');
 return {active:active(game),location:here.id,name:here.name,levels,map,pending:selected?.location||null,places:places.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,activity:p.activity,open:unlocked(game,p),visited:!!state.visited[p.id],current:p.id===here.id,levels:range(game,p),reason:reason(game,p)})),links};
}
function locationsFor(id){return places.filter(p=>(habitats[p.habitat]||[]).some(h=>h.id===id));}
module.exports={places,byId,links,active,init,current,range,options,status,travel,snapshot,unlocked,locationsFor};
