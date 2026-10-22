'use strict';
const walking=require('../desktop/map-walk.js');
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const required=10;
const isRoad=id=>/^(?:j-(?:k-)?)?route-?\d+$/.test(id);
function progress(state){
 if(!isRoad(state.location))return null;
 return {location:state.location,completed:state.roadProgress?.location===state.location?Math.max(0,Math.min(required,Math.floor(state.roadProgress.completed)||0)):0};
}
function plan(map,from,to,open){
 const safe={...map,roads:map.roads.filter(p=>same(p,from)||open(p.place))};
 let path=walking.route(safe,from,to);if(path)return {path,blocked:null};
 path=walking.route(map,from,to);if(!path)return null;
 const index=path.findIndex((p,i)=>i>0&&!open(map.roads.find(c=>same(c,p)).place));
 if(index<0)return null;
 const gate=map.roads.find(c=>same(c,path[index]));return {path:path.slice(0,index),blocked:gate.place,gate:{x:gate.x,y:gate.y}};
}
function move(game,state,map,id,to,open,name,now){
 const result=plan(map,state.position||map.points[state.location],to,open);if(!result)return false;
 // A town and its interior can share one map pixel while having different gates.
 if(!result.blocked&&!open(id)){result.blocked=id;result.gate={...to};}
 const segments=[];
 for(const p of result.path){
  const location=map.roads.find(c=>same(c,p)).place,last=segments.at(-1);
  if(last?.location===location)last.path.push(p);
  else segments.push({location,path:last?[last.path.at(-1),p]:[p]});
 }
 const last=segments.at(-1);if(!result.blocked)last.location=id;
 state.journey={destination:id,position:{...to},name,segments,index:0,blocked:result.blocked?{location:id,checkpoint:result.blocked,position:{...to},gatePosition:result.gate,at:now}:null};
 state.blocked=null;enter(game,state,now);return true;
}
function enter(game,state,now){
 const trip=state.journey,segment=trip.segments[trip.index],end=segment.path.at(-1);
 state.walk={from:state.location,to:segment.location,destination:trip.destination,path:segment.path,at:now,duration:walking.duration(segment.path)};
 state.location=segment.location;state.position={x:end.x,y:end.y};state.visited[state.location] ||= now;state.roadProgress=progress(state);
 game.holdUntil(now+state.walk.duration);
}
function advance(game,state,now){
 const trip=state.journey;
 if(!trip||game.seasonDue?.(now)||game.data.battle||game.data.suspendedWild||game.data.pendingBattle||game.data.pendingChallenge||game.presentation?.()||now<game.nextTick||now<game.data.switchUntil||game.data.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind)))return false;
 const leaving=trip.index+1<trip.segments.length||trip.blocked;
 if(leaving&&isRoad(state.location)&&progress(state).completed<required)return false;
 if(trip.index+1<trip.segments.length){trip.index++;enter(game,state,now);return true;}
 state.blocked=trip.blocked;state.journey=null;
 game.log(state.blocked?'길목에 도착했다. 앞을 지키는 사람과 이야기해 보자.':trip.name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
function encounterEnded(state,b){
 if(!b||b.kind!=='wild'||b.storyId||b.travelCounted||b.location!==state.location||!isRoad(state.location))return false;
 b.travelCounted=true;const p=state.roadProgress=progress(state);p.completed=Math.min(required,p.completed+1);return true;
}
function snapshot(state){
 const p=progress(state);return {roadProgress:p?{...p,required}:null,journey:state.journey?{destination:state.journey.destination,name:state.journey.name}:null};
}
module.exports={same,plan,move,advance,encounterEnded,snapshot,required,isRoad};
