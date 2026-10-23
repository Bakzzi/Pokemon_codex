'use strict';
const K=require('./kanto-journey.cjs');
const endings={
 brock:['단단함만으로는 막을 수 없었군. 회색배지를 받아.','3번도로를 지나면 달맞이산이야. 그 너머 블루시티에서도 실력을 겨뤄 봐.'],
 misty:['좋아! 블루배지를 줄게.','북쪽 금구슬다리에도 트레이너들이 기다리고 있어. 동료들과 함께 실력을 겨뤄 봐!'],
 surge:['훌륭한 승부였다! 오렌지배지를 받을 자격이 있어!','동쪽 11번도로에 디그다의 굴이 있다. 그 너머에서도 모험에 도움이 될 사람을 만날 수 있을 거다!'],
 erika:['당신과 동료들의 힘, 잘 보았어요. 무지개배지를 받아 주세요.','게임코너에서 수상한 사람들이 드나든다는 이야기가 있어요. 무슨 일인지 살펴봐 주시겠어요?'],
 sabrina:['앞을 읽었는데도 막을 수 없었네요. 배지를 받아 주세요.','다음 체육관은 연분홍시티에 있어요. 잠든 포켓몬 때문에 길이 막혔다던데, 이제 방법을 알고 있겠지요?'],
 koga:['우리 체육관을 이겨 내다니, 훌륭하군!','이 마을의 사파리존에도 가 보거라. 배틀과는 다른 만남이 기다리고 있을 거다.'],
 blaine:['뜨거운 승부였네! 진홍색배지를 받아 주게.','상록시티의 체육관이 다시 문을 열었다더군. 마지막 배지에 도전해 보게.'],
 giovanni:['내가 졌다. 그린배지를 가져가라.','로켓단은 해산하겠다. 난 다시 포켓몬을 연구하는 일에 전념하겠어.','배지를 모두 모았군. 서쪽 22번도로 너머가 포켓몬리그로 향하는 길이다.'],
 'rocket-grunt':['쳇! 아지트 안쪽에는 우리 동료들이 더 있다고!','지하 통로가 열렸다. 남아 있는 로켓단을 찾아보자.'],
 'rocket-duo':['또 당했잖아! 보스한테까지 갈 수 있을 것 같아?','지휘실 쪽으로 향하는 길이 열렸다.'],
 'rocket-giovanni':['내가 졌군. 이 아지트에서는 물러나겠다.','비주기가 떠난 자리에 낯선 물건이 남아 있다. 확인해 보자.']
};
const forward={'forest-path':'상록숲을 통과했어요. 회색시티의 체육관을 찾아가 보세요.','route3-path':'달맞이산 입구로 향해요.','moon-path':'연구원이 화석 하나를 골라도 좋다고 해요.','anne-visit':'선장실을 찾아가 보세요.','route11-path':'디그다의 굴을 건너 보세요.','route9-path':'돌산터널 입구로 향해요.','tunnel-path':'돌산터널을 빠져나왔어요. 보라타운으로 향해요.','victory-path':'챔피언로드를 통과했어요. 석영고원에서 리그에 도전해 보세요.','trainers-hideout':'조무래기들이 떠난 곳을 살펴보세요.','trainers-silph':'닫힌 사무실로 가는 방법을 찾아보세요.'};
function result(g,boss){
 if(!K.modern(g))return null;
 if(boss.source||boss.adaptedFrom){const group=K.cases.find(c=>c.id===boss.case),remaining=group.entries.filter(id=>K.nodes.get(id).trainer&&id!==boss.id&&!K.done(g,id)).length;if(remaining)return '아직 이곳에서 기다리는 트레이너가 있어요.';if(boss.originalLocation?.startsWith('gym:'))return '관장에게 도전할 준비가 됐어요.';return forward[boss.case]||'이곳의 트레이너들과 승부를 마쳤어요.';}
 return endings[boss.id]?.at(-1)||null;
}
function victory(g,boss){if(!K.modern(g))return null;if(endings[boss.id])return endings[boss.id];if(boss.source||boss.adaptedFrom){const text={ROCKET:'쳇! 여기까지 밀고 들어오다니!',HIKER:'단단한 내 동료들을 이겨 냈군!',BUG_CATCHER:'내가 키운 포켓몬들이 졌다니!',SAILOR:'좋은 승부였어! 네 동료들도 제법이군!',SCIENTIST:'내 계산이 틀렸군. 네 실력은 인정하겠어.',CHANNELER:'아…… 이제 정신이 드는구나. 도와줘서 고맙다.'}[boss.source?.class]||'네가 이겼어. 좋은 승부였어!';return [text,result(g,boss)];}return null;}
module.exports={victory,result};
