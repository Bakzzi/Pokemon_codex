'use strict';
const {learnedMoves}=require('../desktop/pokemon.cjs');
// Short Korean adaptations of Yellow dialogue. Setting-specific references are
// omitted because these encounters happen at challenge entrances in this game.
// Text sources: pret/pokeyellow/text/{OaksLab,SSAnne2F,PokemonTower2F,Route22}.asm
// Parties: pret/pokeyellow/data/trainers/parties.asm (Rival1Data / Rival2Data).
const encounters=[
  {id:'tutorial-green',stage:0,target:null,sprite:'green',team:[[133,5]],
    intro:['내 포켓몬이 더 강해 보이는데?','잠깐! 네 포켓몬이 얼마나 강한지 보자!'],
    win:['뭐야! 말도 안 돼! 처음부터 잘못 골랐나?'],loss:['그래! 역시 내 포켓몬이 최고야!']},
  {id:'rival-brock',stage:1,target:0,sprite:'green',team:[[21,9],[133,8]],
    intro:['벌써 체육관에 도전하려고? 너답네!','웅을 만나기 전에 나랑 한판 하자. 피카츄는 얼마나 강해졌어?'],
    win:['흥, 제법이네! 웅한테도 그 실력 보여 봐.'],loss:['아직 준비가 덜 됐잖아! 동료들이랑 좀 더 연습하고 와.']},
  {id:'rival-surge',stage:1,target:2,sprite:'green',team:[[21,19],[19,16],[27,18],[133,20]],
    intro:['봉주르! 이런 데서 만나다니!','도감은 좀 채웠어? 난 벌써 40종이나 잡았다고!'],
    win:['흥! 포켓몬을 제법 키웠네!'],loss:['왜 그래? 정신 좀 차리라고!']},
  {id:'rival-middle',stage:2,target:'tower-grunt-1',sprite:'green-late',team:[[22,25],[90,23],[37,22],[27,20],[133,25]],
    intro:['여기서 뭐 하고 있어?','네 포켓몬은 아직 팔팔해 보이네. 내가 기절시켜 주지!'],
    win:['뭐야! 봐줬더니 이러기야?'],loss:['포켓몬들이 너무 약하잖아! 더 단련시키라고!']},
  {id:'rival-silph',stage:3,target:'silph-duo',sprite:'green-late',team:[[28,38],[38,35],[91,37],[64,35],[135,40]],
    intro:['너도 여기까지 왔구나!','로켓단 일은 나중에 하고, 네 포켓몬이 얼마나 강해졌는지 보자!'],
    win:['흥! 제법이네. 난 더 강해질 거야!'],loss:['아직 멀었네! 동료들을 더 단련시키라고!']},
  {id:'rival-league',stage:4,target:8,sprite:'green-late',team:[[28,47],[102,45],[38,45],[91,47],[64,50],[135,53]],
    intro:['너도 뱃지를 전부 모았구나!','리그에 가기 전에 네 실력부터 시험해 보겠어!'],
    win:['뭐라고! 잠깐 방심했을 뿐이야!'],loss:['그게 네 실력이야? 더 연습하고 오라고!']}
].map(e=>({...e,name:'그린',team:e.team.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))}));
const byId=new Map(encounters.map(e=>[e.id,e]));
const champion={id:'champion',name:'그린',kind:'champion',badge:null,team:[[28,61],[65,59],[103,61],[91,61],[38,63],[135,65]].map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}))};
module.exports={encounters,byId,champion};
