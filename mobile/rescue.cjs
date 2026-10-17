'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// FRLG Pokemon Tower 7F: TeamRocketGrunt19, 20, 21.
const encounters=[[[41,25],[41,25],[42,25]],[[109,26],[96,26]],[[41,23],[19,23],[20,23],[41,23]]].map((team,i)=>({
  id:'tower-grunt-'+(i+1),stage:i,name:'로켓단 조무래기 '+(i+1),sprite:'rocket-grunt',
  team:team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))
}));
const byId=new Map(encounters.map(e=>[e.id,e]));
function init(game,now){
  const story=game.data.mobileStory;if(!story||story.rescue)return;
  // Existing items and opened routes survive this change of reward source.
  const d=game.data.trainingDevice,legacy=!!(d.fluteObtainedAt||d.snorlaxWonAt||d.legacyRoadAccess||game.data.badges.includes('koga'));
  story.rescue={revision:1,wins:legacy?[now,now,now]:[0,0,0],completedAt:legacy?now:0,rewardPending:false,legacy};
}
function ready(game,id){
  const e=byId.get(id),r=game.data.mobileStory?.rescue;
  return !!(e&&r&&game.data.badges.includes('erika')&&!r.completedAt&&!r.rewardPending&&!r.wins[e.stage]&&(e.stage===0||r.wins[e.stage-1]));
}
function snapshot(game){
  const r=game.data.mobileStory.rescue,unlocked=game.data.badges.includes('erika');
  return {unlocked,completed:!!r.completedAt,description:r.completedAt?'로켓단을 물리치고 보라타운 촌장을 무사히 구했어요.':unlocked?'로켓단이 보라타운 촌장을 붙잡고 있어요. 조무래기들을 물리치고 구해 주세요.':'보라타운에서 촌장이 사라졌다는 소문이 들려요.',steps:encounters.map(e=>{
    const done=!!r.wins[e.stage],revealed=unlocked&&(e.stage===0||!!r.wins[e.stage-1]);
    return {id:e.id,stage:e.stage,name:e.name,done,revealed,team:revealed?e.team:[],canChallenge:game.canChallenge(e.id),reason:done?'승리 완료':!unlocked?'민화에게 승리하면 도전할 수 있어요.':e.stage>0&&!r.wins[e.stage-1]?'앞선 조무래기를 물리쳐 주세요.':'도전하기'};
  })};
}
module.exports={encounters,byId,init,ready,snapshot};
