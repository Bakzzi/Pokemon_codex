'use strict';
const walking=require('../desktop/map-walk.js');
const same=(a,b)=>a.x===b.x&&a.y===b.y;
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
 const end=result.path.at(-1),cell=map.roads.find(p=>same(p,end)),location=result.blocked?cell.place:id;
 state.walk={from:state.location,to:location,destination:id,path:result.path,at:now,duration:walking.duration(result.path)};
 state.location=location;state.position={x:end.x,y:end.y};state.visited[location] ||= now;
 state.blocked=result.blocked?{location:id,checkpoint:result.blocked,position:{...to},gatePosition:result.gate,at:now}:null;
 game.holdUntil(now+state.walk.duration);
 game.log(result.blocked?'길목에 도착했다. 앞을 지키는 사람과 이야기해 보자.':name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
module.exports={same,plan,move};
