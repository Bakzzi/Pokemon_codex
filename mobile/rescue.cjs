'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// Two FRLG Tower grunts followed by the Yellow Tower Jessie/James party.
// Keep the third stage's save ID so active and queued v0.1.13 battles resume.
const encounters=[[[41,25],[41,25],[42,25]],[[109,26],[96,26]],[[52,27],[24,27],[110,27]]].map((team,i)=>({
  id:'tower-grunt-'+(i+1),stage:i,name:i===2?'로이·로사':'로켓단 조무래기 '+(i+1),sprite:i===2?'rocket-duo':'rocket-grunt',
  ...(i===0?{intro:['그 노인을 구하러 왔나? 우리 일을 방해한 대가를 치르게 하는 중이다!','참견할 생각이라면 먼저 나부터 이겨 봐라!']}:i===2?{intro:['네가 왜 또 여기 있는 거야! 아지트에서 우리 일을 망쳐 놓고!','이번에는 우리가 가만두지 않겠어!']}:{}),
  team:team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))
}));
const byId=new Map(encounters.map(e=>[e.id,e]));
const legacyThird={...encounters[2],name:'로켓단 조무래기 3',sprite:'rocket-grunt',team:[[41,23],[19,23],[20,23],[41,23]].map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))};
function init(game,now){
  const story=game.data.mobileStory;if(!story)return;
  if(story.rescue){if(byId.has(game.data.battle?.storyId))story.rescue.investigatedAt ||= game.data.battle.startedAt||now;return;}
  // Existing items and opened routes survive this change of reward source.
  const d=game.data.trainingDevice,legacy=!!(d.fluteObtainedAt||d.snorlaxWonAt||d.legacyRoadAccess||game.data.badges.includes('koga'));
  story.rescue={revision:1,wins:legacy?[now,now,now]:[0,0,0],completedAt:legacy?now:0,rewardPending:false,legacy};
}
function ready(game,id){
  const e=byId.get(id),r=game.data.mobileStory?.rescue;
  return !!(e&&r&&game.data.badges.includes('erika')&&!r.completedAt&&!r.rewardPending&&!r.wins[e.stage]&&(e.stage===0||r.wins[e.stage-1]));
}
function snapshot(game){
  const r=game.data.mobileStory.rescue,unlocked=game.data.badges.includes('erika'),investigated=!!(r.investigatedAt||r.completedAt||r.wins.some(Boolean));
  return {unlocked,visible:unlocked||investigated,investigated,title:investigated?'보라타운 촌장 구출':'보라타운의 소문',sprite:investigated?'assets/trainers/battle/mr-fuji.png':null,inquiry:'보라타운 조사',completed:!!r.completedAt,description:r.completedAt?'로켓단을 물리치고 보라타운 촌장을 무사히 구했어요.':investigated?'돌아오지 않던 노인이 로켓단에게 붙잡혀 있어요. 노인을 구해야겠어요.':'보라타운에서 포켓몬들이 사라지고 있어요. 조사하러 간 노인도 돌아오지 않는다네요.',steps:encounters.map(e=>{
    const done=!!r.wins[e.stage],revealed=unlocked&&(e.stage===0||!!r.wins[e.stage-1]);
    return {id:e.id,stage:e.stage,name:revealed?e.name:'???',sprite:e.sprite,done,revealed,team:revealed?e.team:[],canChallenge:game.canChallenge(e.id),reason:done?'승리 완료':!unlocked?'민화에게 승리하면 도전할 수 있어요.':e.stage>0&&!r.wins[e.stage-1]?'앞선 상대에게 승리해 주세요.':'도전하기'};
  })};
}
module.exports={encounters,byId,legacyThird,init,ready,snapshot};
