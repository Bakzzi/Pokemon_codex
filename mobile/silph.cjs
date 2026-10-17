'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// Yellow: Rocket 8F, Jessie/James 11F, Giovanni 11F.
const encounters=[
  {id:'silph-grunt',name:'로켓단 조무래기',sprite:'rocket-grunt',team:[[110,28],[42,28],[109,28]],intro:['여긴 네가 들어올 곳이 아니다!','우리 일을 방해하지 마라!']},
  {id:'silph-duo',name:'로이·로사',sprite:'rocket-duo',team:[[110,31],[24,31],[52,31]],intro:['보라타운에서 만난 꼬마잖아! 또 너야?','보스의 중요한 일을 방해하게 둘 순 없지!']},
  {id:'silph-giovanni',name:'비주기',sprite:'giovanni',team:[[33,37],[53,35],[111,37],[31,41]],intro:['또 너로군. 어른들의 일에 끼어들다니.','이번에는 쉽게 보내 주지 않겠다!']}
].map((e,stage)=>({...e,stage,team:e.team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))}));
const byId=new Map(encounters.map(e=>[e.id,e]));
function init(game,now){
  const story=game.data.mobileStory;if(!story)return;
  if(story.silph){if(byId.has(game.data.battle?.storyId))story.silph.investigatedAt ||= game.data.battle.startedAt||now;return;}
  const b=game.data.battle,legacy=game.data.badges.includes('sabrina')||game.data.champion||b?.kind==='trainer'&&Number.isInteger(b.bossIndex)&&b.bossIndex>=5;
  story.silph={revision:1,wins:legacy?[now,now,now]:[0,0,0],completedAt:legacy?now:0,legacy:!!legacy};
}
function ready(game,id){
  const e=byId.get(id),s=game.data.mobileStory?.silph;
  return !!(e&&s&&game.data.badges.includes('koga')&&!s.completedAt&&!s.wins[e.stage]&&(e.stage===0||s.wins[e.stage-1]));
}
function snapshot(game){
  const s=game.data.mobileStory.silph,unlocked=game.data.badges.includes('koga'),investigated=!!(s.investigatedAt||s.completedAt||s.wins.some(Boolean));
  return {unlocked,visible:unlocked||investigated,investigated,title:'실프주식회사',sprite:investigated?'assets/logos/team-rocket.png':null,inquiry:'실프주식회사 조사',completed:!!s.completedAt,description:s.completedAt?'로켓단을 물리치고 실프주식회사와 노랑시티에 평화가 돌아왔어요.':investigated?'로켓단이 실프주식회사를 점거했어요. 이곳에서 무슨 일을 꾸미는 걸까요?':'실프주식회사와 연락이 끊겼어요. 노랑시티에서 무슨 일이 벌어진 걸까요?',steps:encounters.map(e=>{
    const done=!!s.wins[e.stage],revealed=unlocked&&(e.stage===0||!!s.wins[e.stage-1]);
    return {id:e.id,stage:e.stage,name:revealed?e.name:'???',sprite:e.sprite,done,revealed,team:revealed?e.team:[],canChallenge:game.canChallenge(e.id),reason:done?'승리 완료':!unlocked?'독수에게 승리하면 도전할 수 있어요.':e.stage>0&&!s.wins[e.stage-1]?'앞선 상대에게 승리해 주세요.':'도전하기'};
  })};
}
module.exports={encounters,byId,init,ready,snapshot};
