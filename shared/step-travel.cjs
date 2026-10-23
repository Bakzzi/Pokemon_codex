'use strict';
// Mobile map distance is independent of battle activity and lock-time credits.
const walking=require('../desktop/map-walk.js'),cost=2000;
const friendship=require('./friendship.cjs');
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function world(game){return game.data.johtoUnlocked?game.data.johtoWorld:game.data.kantoWorld;}
function hasIntent(game){return !!world(game)?.journey||game.data.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind));}
const count=n=>valid(n)?n:0;
function bankRemainder(game){const a=game.data.mapTravel;if(!a)return false;const credit=count(a.credit);a.bank=Math.min(Number.MAX_SAFE_INTEGER,count(a.bank)+credit);a.credit=0;return credit>0;}
function beginIntent(game,previous){if(game.platform==='mobile'&&!previous&&hasIntent(game))bankRemainder(game);}
function observe(game,total){
 if(game.platform!=='mobile'||!valid(total))return false;
 const saved=game.data.mapTravel;
 if(valid(saved?.observed)&&total<saved.observed)return false;
 game.mapSteps=total;
 const delta=valid(saved?.observed)&&total>=saved.observed?total-saved.observed:0;
 const moving=hasIntent(game),credit=moving?Math.min(Number.MAX_SAFE_INTEGER,count(saved?.credit)+delta):0;
 const bank=Math.min(Number.MAX_SAFE_INTEGER,count(saved?.bank)+(moving?0:count(saved?.credit)+delta));
 if(saved?.observed===total&&saved.credit===credit&&saved.bank===bank)return false;
 game.data.mapTravel={observed:total,credit,bank};return true;
}
function useBank(game,executing=false){
 if(game.platform!=='mobile'||count(game.data.mapTravel?.bank)<cost)return false;
 const queued=!executing&&game.data.pendingActions?.find(a=>['travel','world-pass'].includes(a.kind));
 if(queued){queued.useBank=true;return true;}
 const trip=world(game)?.journey;if(!trip||trip.mode!=='steps'||trip.index>=trip.segments.length)return false;
 // Reserve only the cells requested now. Future walks do not silently spend the bank.
 const remaining=trip.segments.slice(trip.index).filter(s=>!s.arrival).length;if(!remaining)return false;
 trip.bankCells=Math.min(Math.floor(game.data.mapTravel.bank/cost),remaining);trip.bankLeg=true;return true;
}
function trainerPending(game){return game.movementTrainerNode?.()||null;}
function bankActive(game){const trip=world(game)?.journey;return game.platform==='mobile'&&!!trip&&(trip.bankLeg||trip.bankCells>0);}
function segments(map,path,id,blocked){
 const result=path.slice(1).map((p,i)=>({location:map.roads.find(c=>c.x===p.x&&c.y===p.y).place,path:[path[i],p]}));
 if(result.length&&!blocked&&result.at(-1).location!==id)result.push({location:id,path:[{...path.at(-1)}],arrival:true});return result;
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
 const cells=trip.segments.slice(trip.index+1).flatMap(s=>s.arrival?[{...s,path:[{...s.path.at(-1)}]}]:s.path.slice(1).map(p=>({location:s.location,path:[p]})));
 let from=state.position||trip.segments[trip.index].path.at(-1);
 for(const s of cells){const to=s.path[0];s.path=s.arrival?[to]:[from,to];from=to;}
 trip.mode='steps';trip.segments=cells;trip.index=0;state.walk=null;
}
function advance(game,state,now){
 migrate(state);const trip=state.journey;if(!trip)return false;
 // Every ordinary opponent in the entered area must be resolved before leaving.
 if(trip.bankLeg&&trainerPending(game))return false;
 const bankArrival=trip.bankLeg;trip.bankLeg=false;
 if(trip.index<trip.segments.length){
  const s=trip.segments[trip.index],account=game.data.mapTravel,charge=s.arrival?0:cost,banked=s.arrival?bankArrival:trip.bankCells>0;
  if(charge&&(!account||count(account[banked?'bank':'credit'])<charge))return false;
  trip.index++;const end=s.path.at(-1);if(charge)account[banked?'bank':'credit']-=charge;
  if(banked){if(charge)trip.bankCells--;trip.bankLeg=true;}
  if(!s.arrival){
   state.walk={from:state.location,to:s.location,destination:trip.destination,path:s.path,at:now,duration:walking.duration(s.path),stepTravel:true};
   friendship.startTravel(game,state.walk);game.holdUntil(now+state.walk.duration);
  }
  state.location=s.location;state.position={...end};state.visited[s.location] ||= now;return true;
 }
 state.blocked=trip.blocked;state.journey=null;bankRemainder(game);
 game.log(state.blocked?'길목에 도착했다. 앞을 지키는 사람과 이야기해 보자.':trip.name+'에 도착했다. 주변을 탐험해 보자.','travel',null,now);return true;
}
function snapshot(game,state){
 const trip=state.journey,bank=count(game.data.mapTravel?.bank);return {travelMode:'steps',roadProgress:null,movement:{count:Math.floor(bank/cost),remainder:bank%cost,usingBank:!!(trip?.bankLeg||trip?.bankCells>0)},stepProgress:trip?{completed:Math.min(cost,count(game.data.mapTravel?.credit)),required:cost,remainingCells:trip.mode==='steps'?trip.segments.slice(trip.index).filter(s=>!s.arrival).length:null}:null};
}
module.exports={cost,observe,hasIntent,beginIntent,bankRemainder,useBank,bankActive,start,migrate,advance,snapshot};
