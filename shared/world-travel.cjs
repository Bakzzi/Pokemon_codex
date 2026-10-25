'use strict';
const walking=require('../desktop/map-walk.js');
const steps=require('./step-travel.cjs');
const friendship=require('./friendship.cjs');
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const minimum=10,maximum=20;
const isRoad=id=>/^(?:j-(?:k-)?)?route-?\d+$/.test(id);
function progress(state,random=Math.random){
 if(!isRoad(state.location))return null;
 const saved=state.roadProgress?.location===state.location?state.roadProgress:null;
 const required=Number.isInteger(saved?.required)&&saved.required>=minimum&&saved.required<=maximum?saved.required:minimum+Math.min(maximum-minimum,Math.max(0,Math.floor(random()*(maximum-minimum+1))));
 return state.roadProgress={location:state.location,completed:Math.max(0,Math.min(required,Math.floor(saved?.completed)||0)),required};
}
function plan(map,from,to,open,cross=()=>true){
 const transit=p=>map.transits?.find(t=>same(t,p));
 const cellOpen=p=>open(p.place,p)&&(!transit(p)||open(transit(p).location,p));
 const safe={...map,roads:map.roads.filter(p=>same(p,from)||cellOpen(p))};
 const direct=walking.route(map,from,to);
 // Approach a physical roadblock from this side instead of silently walking
 // around the whole region to reach its other side.
 let path=direct?.some((p,i)=>i>0&&!cross(direct[i-1],p))?null:walking.route(safe,from,to,cross);if(path)return {path,blocked:null};
 path=direct;if(!path)return null;
 const index=path.findIndex((p,i)=>i>0&&(!cellOpen(map.roads.find(c=>same(c,p)))||!cross(path[i-1],p)));
 if(index<0)return null;
 const gate=map.roads.find(c=>same(c,path[index])),entry=transit(gate);return {path:path.slice(0,index),blocked:entry&&!open(entry.location,gate)?entry.location:gate.place,gate:{x:gate.x,y:gate.y},edgeFrom:path[index-1]};
}
function move(game,state,map,id,to,open,name,now,cross){
 const result=plan(map,state.position||map.points[state.location],to,open,cross);if(!result)return false;
 friendship.finishTravel(game,state,now);
 // A town and its interior can share one map pixel while having different gates.
 if(!result.blocked&&!open(id,to)){result.blocked=id;result.gate={...to};}
 const guided=!!game.data.kantoStory&&!game.data.kantoStory.legacy&&!game.data.kantoStory.mapAt&&!game.data.johtoUnlocked;
 if(game.platform==='mobile'&&!guided)return steps.start(game,state,map,result,id,to,name,now);
 if(guided){
  const segments=result.path.slice(1).map((p,i)=>({location:map.roads.find(c=>same(c,p)).place,path:[result.path[i],p]}));
  if(segments.length&&!result.blocked)segments.at(-1).location=id;
  state.journey={mode:'guided',destination:id,position:{...to},name,segments,index:0,blocked:null};state.blocked=null;state.walk=null;state.guideCredit=0;return true;
 }
 const segments=[];
 for(const [i,p] of result.path.entries()){
  const location=i===0?state.location:map.roads.find(c=>same(c,p)).place,last=segments.at(-1);
  if(last?.location===location)last.path.push(p);
  else segments.push({location,path:last?[last.path.at(-1),p]:[p]});
  const transit=map.transits?.find(t=>same(t,p));
  if(transit&&segments.at(-1).location!==transit.location)segments.push({location:transit.location,path:[{...p}],arrival:true});
 }
 // An interior marker may share a road cell. Keep that road's itinerary and
 // encounter quota, then enter the destination without another map step.
 const last=segments.at(-1);if(!result.blocked&&last.location!==id)segments.push({location:id,path:[{...to}],arrival:true});
 state.journey={destination:id,position:{...to},name,segments,index:0,blocked:result.blocked?{location:id,checkpoint:result.blocked,position:{...to},gatePosition:result.gate,edgeFrom:result.edgeFrom,at:now}:null};
 state.blocked=null;enter(game,state,now);return true;
}
function enter(game,state,now){
 const trip=state.journey,segment=trip.segments[trip.index],end=segment.path.at(-1);
 if(!segment.arrival){
  state.walk={from:state.location,to:segment.location,destination:trip.destination,path:segment.path,at:now,duration:walking.duration(segment.path)};
  friendship.startTravel(game,state.walk);game.holdUntil(now+state.walk.duration);
 }
 state.location=segment.location;state.position={x:end.x,y:end.y};state.visited[state.location] ||= now;state.roadProgress=progress(state,game.random);
}
function ready(game,now){return !game.seasonDue?.(now)&&!game.data.battle&&!game.data.suspendedWild&&!game.data.pendingBattle&&!game.data.pendingChallenge&&!game.presentation?.()&&now>=game.nextTick&&now>=game.data.switchUntil&&!game.data.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind));}
function advance(game,state,now){
 friendship.finishTravel(game,state,now);
 const trip=state.journey;
 if(!trip||!ready(game,now))return false;
 if(trip.mode==='guided'){
  if(trip.index<trip.segments.length){if(!(state.guideCredit>0))return false;state.guideCredit--;const segment=trip.segments[trip.index++],end=segment.path.at(-1);state.walk={from:state.location,to:segment.location,destination:trip.destination,path:segment.path,at:now,duration:walking.duration(segment.path),guided:true};friendship.startTravel(game,state.walk);state.location=segment.location;state.position={...end};state.visited[state.location] ||= now;game.holdUntil(now+state.walk.duration);return true;}
  state.journey=null;state.walk=null;return true;
 }
 // Finishing the distance/quota must not skip an area's unplayed ordinary
 // opponents. Control-only ticks run before paid battle ticks on both clients.
 const next=trip.segments[trip.index+(game.platform==='mobile'?0:1)];
 if(next&&next.location!==state.location&&(game.platform==='mobile'?steps.trainerPending(game):game.movementTrainerNode?.()))return false;
 if(game.platform==='mobile')return steps.advance(game,state,now);
 const leaving=trip.index+1<trip.segments.length||trip.blocked;
 const p=progress(state,game.random);if(leaving&&p&&p.completed<p.required)return false;
 if(trip.index+1<trip.segments.length){trip.index++;enter(game,state,now);return true;}
 state.blocked=trip.blocked;state.journey=null;
 game.log(state.blocked?'길목에 도착했다. 앞을 지키는 사람과 이야기해 보자.':trip.name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
function encounterEnded(state,b,random){
 if(!b||b.kind!=='wild'||b.storyId||b.travelCounted||b.location!==state.location||!isRoad(state.location))return false;
 b.travelCounted=true;const p=progress(state,random);p.completed=Math.min(p.required,p.completed+1);return true;
}
function snapshot(state,random){
 const p=progress(state,random);return {roadProgress:p?{...p}:null,journey:state.journey?{destination:state.journey.destination,name:state.journey.name}:null};
}
module.exports={init:progress,same,plan,move,ready,advance,encounterEnded,snapshot,isRoad};
