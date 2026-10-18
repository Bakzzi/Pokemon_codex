'use strict';
const {species,captureBonus,wildMinimum}=require('../desktop/pokemon.cjs');
const {tryCatch}=require('../desktop/battle.cjs');
// Yellow encounter tables, condensed into one walking expedition. Rare entries
// keep small weights. Adventure excludes these species from ordinary wilds.
const pool=[[32,20],[29,20],[102,20],[111,10],[33,8],[30,8],[46,5],[47,4],[104,2],[114,1],[128,1],[115,.5],[113,.3],[123,.2]];
const DISTANCE=1500,INTERVAL=50,BALLS=30;
function init(game){game.data.mobileStory.safari ||= {visitedAt:0,trip:null,last:null,serial:0};}
function unlocked(game){return !!(game.data.trainingDevice.snorlaxWonAt||game.data.trainingDevice.legacyRoadAccess||game.data.badges.includes('koga'));}
function start(game,now){
  const s=game.data.mobileStory.safari;if(!unlocked(game)||s.trip)return false;
  s.visitedAt ||= now;s.trip={id:++s.serial,startedAt:now,steps:0,balls:BALLS,encounters:[],caught:[]};
  game.log('사파리존 탐험을 시작했다.','info',null,now);return true;
}
function finish(game,now,returned=false){
  const s=game.data.mobileStory.safari;if(!s.trip)return false;
  s.last={...s.trip,finishedAt:now,returned};s.trip=null;
  game.log(s.last.caught.length?'사파리존에서 새 동료 '+s.last.caught.length+'마리와 함께 돌아왔다.':'사파리존에서 돌아왔다. 이번 탐험에서는 포획에 성공하지 못했다.','info',null,now);return true;
}
function walk(game,steps,now){
  const s=game.data.mobileStory.safari,t=s.trip;if(!t||game.seasonDue(now)||!Number.isSafeInteger(steps)||steps<=0)return false;
  const before=Math.floor(t.steps/INTERVAL);t.steps=Math.min(DISTANCE,t.steps+steps);
  for(let i=before;i<Math.floor(t.steps/INTERVAL)&&t.balls>0;i++){
    const sum=pool.reduce((n,e)=>n+e[1],0);let roll=game.random()*sum,id=pool.at(-1)[0];
    for(const entry of pool){roll-=entry[1];if(roll<0){id=entry[0];break;}}
    const level=Math.max(wildMinimum(species.get(id)),20+Math.min(10,Math.floor(game.random()*11))),entry={id,level,outcome:'observed'};game.data.seen[id] ||= now;
    if(game.captureRequested(id)){
      t.balls--;entry.outcome='fled';
      // No HP manipulation or combat: an ordinary ball against a healthy mon.
      if(tryCatch(species.get(id).catchRate,1,1,null,game.random,captureBonus(id,game.data.caught)).caught){
        const uid=game.addPokemon(id,level,'safari',now);entry.outcome='caught';entry.uid=uid;t.caught.push({id,level,uid});
        if(game.data.captureReservations?.[id])delete game.data.captureReservations[id];
        game.log(species.get(id).name+' Lv.'+level+' · 사파리존에서 포획!','catch',id,now);
      }
    }
    t.encounters.push(entry);
  }
  if(t.steps>=DISTANCE||t.balls===0)finish(game,now);
  return true;
}
function snapshot(game){
  const s=game.data.mobileStory.safari,t=s.trip,last=s.last;
  const visual=trip=>{const e=trip.encounters.at(-1);return {tripId:trip.id,encounterCount:trip.encounters.length,lastEncounter:e?{...e,sequence:trip.encounters.length,name:species.get(e.id).name}:null};};
  return {visible:unlocked(game)||!!s.visitedAt,active:!!t,visited:!!s.visitedAt,remaining:t?DISTANCE-t.steps:DISTANCE,balls:t?.balls??BALLS,progress:t?t.steps/DISTANCE:0,caught:t?.caught.length||0,...(t?visual(t):{}),last:last?{id:last.id,...visual(last),returned:!!last.returned,balls:last.balls,steps:last.steps,encounters:last.encounters.length,caught:last.caught.map(p=>({...p,name:species.get(p.id).name})),finishedAt:last.finishedAt}:null};
}
module.exports={init,unlocked,start,finish,walk,snapshot,DISTANCE,INTERVAL,BALLS,pool};
