'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// Preserve the three save IDs while replacing the second grunt with the ghost.
// Old in-progress battles retain their original parties in Adventure.battleBoss.
const encounters=[[[41,25],[41,25],[42,25]],[[105,30]],[[52,27],[24,27],[110,27]]].map((team,i)=>({
  id:'tower-grunt-'+(i+1),stage:i,name:i===2?'로이·로사':i===1?'텅구리의 유령':'로켓단 조무래기',sprite:i===2?'rocket-duo':i===1?'pokemon:105':'rocket-grunt',...(i===1?{ghost:true,xpTrainer:false,intro:['차가운 기운이 계단을 막았다. “물러가라……!”','실프스코프가 반응했다. 유령의 정체는 새끼를 지키다 로켓단에게 목숨을 잃은 어미 텅구리였다.']}:{}),
  ...(i===0?{intro:['그 노인을 구하러 왔나? 우리 일을 방해한 대가를 치르게 하는 중이다!','참견할 생각이라면 먼저 나부터 이겨 봐라!']}:i===2?{intro:['네가 왜 또 여기 있는 거야! 아지트에서 우리 일을 망쳐 놓고!','이번에는 우리가 가만두지 않겠어!']}:{}),
  team:team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))
}));
const byId=new Map(encounters.map(e=>[e.id,e]));
const legacyThird={...encounters[2],name:'로켓단 조무래기 3',sprite:'rocket-grunt',team:[[41,23],[19,23],[20,23],[41,23]].map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))};
const legacySecond={id:'tower-grunt-2',stage:1,name:'로켓단 조무래기 2',sprite:'rocket-grunt',team:[[109,26],[96,26]].map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))};
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
  return {unlocked,visible:unlocked||investigated,investigated,title:investigated?'포켓몬타워':'보라타운의 소문',sprite:investigated?'assets/trainers/battle/mr-fuji.png':null,inquiry:'보라타운 조사',completed:!!r.completedAt,description:r.completedAt?'어미 텅구리의 영혼이 안식을 찾고, 등나무노인도 무사히 돌아왔어요.':investigated?'등나무노인이 로켓단에게 붙잡혀 있어요. 위층으로 향하는 계단에서는 차가운 기운이 느껴져요.':'보라타운에서 포켓몬들이 사라지고 있어요. 조사하러 간 노인도 돌아오지 않는다네요.',steps:encounters.map(e=>{
    const done=!!r.wins[e.stage],revealed=unlocked&&(e.stage===0||!!r.wins[e.stage-1]);
    return {id:e.id,stage:e.stage,name:revealed?e.name:'???',sprite:e.sprite,done,revealed,team:revealed?e.team:[],canChallenge:game.canChallenge(e.id),reason:done?'승리 완료':!unlocked?'민화에게 승리하면 도전할 수 있어요.':e.stage>0&&!r.wins[e.stage-1]?'앞선 상대에게 승리해 주세요.':'도전하기'};
  })};
}
module.exports={encounters,byId,legacyThird,legacySecond,init,ready,snapshot};
