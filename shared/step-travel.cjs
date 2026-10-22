'use strict';
// Mobile map distance is independent of battle activity and lock-time credits.
const walking=require('../desktop/map-walk.js'),cost=2000;
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function world(game){return game.data.johtoUnlocked?game.data.johtoWorld:game.data.kantoWorld;}
function hasIntent(game){return !!world(game)?.journey||game.data.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind));}
function beginIntent(game,previous){if(game.platform==='mobile'&&!previous&&hasIntent(game))game.data.mapTravel={observed:valid(game.mapSteps)?game.mapSteps:null,credit:0};}
function observe(game,total){
 if(game.platform!=='mobile'||!valid(total))return false;
 const saved=game.data.mapTravel,s=world(game),pending=game.data.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind));
 if(valid(saved?.observed)&&total<saved.observed)return false;
 game.mapSteps=total;
 if(!s?.journey&&!pending){if(saved?.credit){saved.credit=0;return true;}return false;}
 const delta=valid(saved?.observed)&&total>=saved.observed?total-saved.observed:0;
 const credit=s?.journey||pending?Math.min(Number.MAX_SAFE_INTEGER,(valid(saved?.credit)?saved.credit:0)+delta):0;
 if(saved?.observed===total&&saved.credit===credit)return false;
 game.data.mapTravel={observed:total,credit};return true;
}
function segments(map,path,id,blocked){
 const result=path.slice(1).map((p,i)=>({location:map.roads.find(c=>c.x===p.x&&c.y===p.y).place,path:[path[i],p]}));
 if(result.length&&!blocked)result.at(-1).location=id;return result;
}
function start(game,state,map,result,id,to,name,now){
 state.journey={mode:'steps',destination:id,position:{...to},name,segments:segments(map,result.path,id,result.blocked),index:0,blocked:result.blocked?{location:id,checkpoint:result.blocked,position:{...to},gatePosition:result.gate,at:now}:null};
 state.walk=null;state.blocked=null;
 // An interior sharing the current map cell has no additional map distance.
 if(!state.journey.segments.length&&!result.blocked){state.location=id;state.position={...to};state.visited[id] ||= now;}
 return true;
}
function migrate(state){
 const trip=state.journey;if(!trip||trip.mode==='steps')return;
 const cells=trip.segments.slice(trip.index+1).flatMap(s=>s.path.slice(1).map(p=>({location:s.location,path:[p]})));
 let from=state.position||trip.segments[trip.index].path.at(-1);
 for(const s of cells){const to=s.path[0];s.path=[from,to];from=to;}
 trip.mode='steps';trip.segments=cells;trip.index=0;state.walk=null;
}
function advance(game,state,now){
 migrate(state);const trip=state.journey;if(!trip)return false;
 if(trip.index<trip.segments.length){
  const account=game.data.mapTravel;if(!valid(account?.credit)||account.credit<cost)return false;
  const s=trip.segments[trip.index++],end=s.path.at(-1);account.credit-=cost;
  state.walk={from:state.location,to:s.location,destination:trip.destination,path:s.path,at:now,duration:walking.duration(s.path),stepTravel:true};
  state.location=s.location;state.position={...end};state.visited[s.location] ||= now;game.holdUntil(now+state.walk.duration);return true;
 }
 state.blocked=trip.blocked;state.journey=null;if(game.data.mapTravel)game.data.mapTravel.credit=0;
 game.log(state.blocked?'길목에 도착했다. 앞을 지키는 사람과 이야기해 보자.':trip.name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
function snapshot(game,state){
 const trip=state.journey;return {travelMode:'steps',roadProgress:null,stepProgress:trip?{completed:Math.min(cost,valid(game.data.mapTravel?.credit)?game.data.mapTravel.credit:0),required:cost,remainingCells:trip.mode==='steps'?trip.segments.length-trip.index:null}:null};
}
module.exports={cost,observe,hasIntent,beginIntent,start,migrate,advance,snapshot};
