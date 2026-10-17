'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// Two FRLG Tower grunts followed by the Yellow Tower Jessie/James party.
// Keep the third stage's save ID so active and queued v0.1.13 battles resume.
const encounters=[[[41,25],[41,25],[42,25]],[[109,26],[96,26]],[[52,27],[24,27],[110,27]]].map((team,i)=>({
  id:'tower-grunt-'+(i+1),stage:i,name:i===2?'로이·로사':'로켓단 조무래기 '+(i+1),sprite:i===2?'rocket-duo':'rocket-grunt',
  ...(i===2?{intro:['네가 왜 또 여기 있는 거야! 아지트에서 우리 일을 망쳐 놓고!','이번에는 우리가 가만두지 않겠어!']}:{}),
  team:team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))
}));
const byId=new Map(encounters.map(e=>[e.id,e]));
const legacyThird={...encounters[2],name:'로켓단 조무래기 3',sprite:'rocket-grunt',team:[[41,23],[19,23],[20,23],[41,23]].map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))};
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
  return {unlocked,completed:!!r.completedAt,description:r.completedAt?'로켓단을 물리치고 보라타운 촌장을 무사히 구했어요.':unlocked?'보라타운에서 포켓몬들이 사라지고 있어요. 조사하러 간 노인도 돌아오지 않는다네요.':'보라타운에서 수상한 소문이 들려와요.',steps:encounters.map(e=>{
    const done=!!r.wins[e.stage],revealed=unlocked&&(e.stage===0||!!r.wins[e.stage-1]);
    return {id:e.id,stage:e.stage,name:revealed?e.name:'???',sprite:e.sprite,done,revealed,team:revealed?e.team:[],canChallenge:game.canChallenge(e.id),reason:done?'승리 완료':!unlocked?'민화에게 승리하면 도전할 수 있어요.':e.stage>0&&!r.wins[e.stage-1]?'앞선 상대에게 승리해 주세요.':'도전하기'};
  })};
}
module.exports={encounters,byId,legacyThird,init,ready,snapshot};
