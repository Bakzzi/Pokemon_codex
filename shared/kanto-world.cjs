'use strict';
// Geography is shared by both products. Story state remains the source of truth.
const habitats=require('./kanto-habitats.json');
const map=require('./kanto-map.json');
const walking=require('../desktop/map-walk.js');
const journey=require('./world-travel.cjs');
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
function position(game){const state=init(game);return state.position||map.points[state.location];}
function validPosition(id,point){return !point||point.x===map.points[id]?.x&&point.y===map.points[id]?.y||map.roads.some(p=>p.place===id&&p.x===point.x&&p.y===point.y);}
function status(game,id,point){
 if(!active(game))return {state:'invalid',reason:'지금 모험 중인 지방에서 장소를 선택해 주세요.'};
 const p=byId.get(id);if(!p)return {state:'invalid',reason:'갈 수 없는 장소예요.'};
 if(!validPosition(id,point))return {state:'invalid',reason:'지도에 표시된 길을 선택해 주세요.'};
 const target=point||map.points[id],here=position(game);
 if(init(game).journey?.destination===id&&journey.same(init(game).journey.position,target))return {state:'done',reason:'이곳으로 모험하고 있어요.'};
 if(current(game).id===id&&here.x===target.x&&here.y===target.y&&!init(game).blocked&&!init(game).journey)return {state:'done',reason:'지금 탐험 중이에요.'};
 if(game.data.mobileStory?.safari?.trip)return {state:'waiting',reason:'사파리 탐험을 마치면 이동해요.'};
 return null;
}
function travel(game,id,now,point){
 if(!byId.has(id)||!active(game)||!validPosition(id,point)||game.data.battle||game.data.suspendedWild)return false;
 const state=init(game,now),to=point||map.points[id];
 const open=place=>(unlocked(game,byId.get(place))||place==='saffron'&&id!=='saffron'&&game.data.badges.includes('misty'))&&(!['route-23','victory-road','indigo'].includes(place)||!!state.leaguePass);
 return journey.move(game,state,map,id,to,open,byId.get(id).name,now);
}
function checkpoint(game){
 const state=init(game),block=state.blocked;if(!block)return null;
 const p=byId.get(block.checkpoint),destination=byId.get(block.location);if(!p||!destination)return null;
 const league=['route-23','victory-road','indigo'].includes(p.id),road=roadPlaces.has(p.id)&&!roadOpen(game),ready=unlocked(game,p)&&unlocked(game,destination);
 let name='길목의 안내원',sprite='j-sage',pages;
 if(league){name='포켓몬리그 경비원';sprite='j-sage';const earned=badges.filter(b=>game.data.badges.includes(b));pages=['포켓몬리그로 향하는 트레이너인가요? 배지를 확인하겠습니다.',...earned.map(id=>require('../desktop/pokemon.cjs').data.bosses.find(b=>b.id===id).badge+'를 확인했습니다.'),ready?'모든 배지를 확인했습니다. 챔피언로드로 가셔도 좋습니다.':'아직 확인하지 못한 배지가 있습니다. 체육관에서 실력을 증명하고 돌아오세요.'];}
 else if(road){name='길을 막는 잠만보';sprite='pokemon:143';pages=['커다란 포켓몬이 길 한가운데 잠들어 있다.','아무리 불러도 일어나지 않는다. 깨울 방법을 찾아보자.'];}
 else if(p.id==='tower'){name='포켓몬타워의 주민';pages=['탑 안에서 정체를 알 수 없는 기척이 느껴져요.','보이지 않는 존재를 확인할 방법이 필요하겠어요.'];}
 else {const required=badges[Math.max(0,p.stage-1)],boss=require('../desktop/pokemon.cjs').data.bosses.find(b=>b.id===required);pages=ready?['길이 열렸어요. 조심히 다녀오세요.']:[boss?'이 앞은 조금 더 준비가 필요한 길이에요. '+boss.badge+'를 보여 주시겠어요?':'지금은 이 길로 들어갈 수 없어요.'];}
 return {...block,name,sprite,pages,canPass:ready,destination:destination.name,nearby:road?'snorlax-road':null};
}
function passageStatus(game,id){const b=checkpoint(game);return !b||b.location!==id?{state:'invalid',reason:'이곳에 확인할 길목이 없어요.'}:!b.canPass?{state:'invalid',reason:'아직 이 길을 지나갈 수 없어요.'}:null;}
function pass(game,id,now){if(passageStatus(game,id))return false;const state=init(game),block=state.blocked;state.leaguePass ||= ['route-23','victory-road','indigo'].includes(block.checkpoint);game.log(checkpoint(game).name+'에게 통행을 확인받았다.','gate',null,now);return travel(game,id,now,block.position);}
function snapshot(game,now=Date.now()){
 const state=init(game),here=current(game),levels=range(game);
 const selected=game.data.pendingActions?.find(a=>['travel','world-pass'].includes(a.kind));
 return {active:active(game),location:here.id,name:here.name,levels,map,...journey.snapshot(state),position:position(game),checkpoint:checkpoint(game),facing:state.walk?walking.frame(state.walk,state.walk.at+state.walk.duration).direction:'down',walk:active(game)&&state.walk&&now<state.walk.at+state.walk.duration?state.walk:null,pending:selected?.location||null,places:places.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,activity:p.activity,open:unlocked(game,p),visited:!!state.visited[p.id],current:p.id===here.id,levels:range(game,p),reason:reason(game,p)})),links};
}
function locationsFor(id){return places.filter(p=>(habitats[p.habitat]||[]).some(h=>h.id===id));}
module.exports={places,byId,links,active,init,current,range,options,status,travel,snapshot,unlocked,locationsFor,position,checkpoint,passageStatus,pass,advance:(game,now)=>journey.advance(game,init(game),now),encounterEnded:(game,b)=>journey.encounterEnded(init(game),b)};
