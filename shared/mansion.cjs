'use strict';
// Short adaptations of Yellow's July 5/10, February 6 and September 1 diaries.
const entries=[
  ['불에 그슬린 일지를 찾았다. “7월 5일. 남아메리카의 정글 깊은 곳에서 새로운 포켓몬을 발견했다.”','“7월 10일. 우리는 그 포켓몬에게 뮤라는 이름을 붙였다.”'],
  ['“2월 6일. 뮤가 새끼를 낳았다. 우리는 그 포켓몬을 뮤츠라 이름 지었다.”','글씨 아래에는 낯선 포켓몬의 스케치가 남아 있다. 다음 장은 찢겨 나갔다.'],
  ['“9월 1일. 뮤츠는 너무 강력하다. 우리는 그 난폭한 성향을 억제하는 데 실패했다……”','일지가 여기서 끝났다. 부서진 석상 뒤에서 낡은 열쇠를 찾았다. 홍련체육관의 표식이 새겨져 있다.']
];
function init(game,now,pending){
  const story=game.data.mobileStory;if(story.mansion)return;
  story.mansion={startedAt:0,wins:0,read:0,keyObtainedAt:0,completedAt:0,legacy:false};
}
function unlocked(game){return game.data.badges.includes('sabrina');}
function ready(game){const m=game.data.mobileStory.mansion;return unlocked(game)&&!m.startedAt&&!m.completedAt;}
function snapshot(game){
  const m=game.data.mobileStory.mansion;return {visible:unlocked(game)||!!m.completedAt,started:!!m.startedAt,completed:!!m.completedAt,read:m.read,entries:entries.slice(0,m.read).map((pages,index)=>({index,pages})),description:m.completedAt?'저택의 기록을 살펴보고 홍련체육관의 문을 열었어요.':m.startedAt?'동료와 모험하며 저택의 흔적을 조사하고 있어요. 새로운 단서를 찾으면 함께 살펴봐요.':'홍련체육관의 문이 잠겨 있어요. 섬의 오래된 저택에 단서가 남아 있을지도 몰라요.'};
}
module.exports={init,unlocked,ready,snapshot,entries};
