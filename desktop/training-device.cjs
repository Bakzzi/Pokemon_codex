'use strict';
// FRLG Rocket Hideout party: pret/pokefirered, sParty_BossGiovanni.
// These story victories are separate from the Viridian Gym badge and wild captures.
const {learnedMoves}=require('./pokemon.cjs');
const battles=Object.assign(Object.create(null),{
  'rocket-giovanni':{id:'rocket-giovanni',name:'로켓단 비주기',kind:'story',team:[{id:95,level:25},{id:111,level:24},{id:115,level:29}]},
  'road-snorlax':{id:'road-snorlax',name:'길을 막는 잠만보',kind:'story',xpTrainer:false,team:[{id:143,level:30}]}
});
for(const battle of Object.values(battles))for(const p of battle.team)p.moves=learnedMoves(p.id,p.level).slice(-4);
function init(game){
  const saved=game.data.trainingDevice||{},stamp=n=>Number.isSafeInteger(n)&&n>0?n:null;
  game.data.trainingDevice={rocketWonAt:stamp(saved.rocketWonAt),snorlaxWonAt:stamp(saved.snorlaxWonAt),obtainedAt:stamp(saved.obtainedAt),learnerUid:game.data.owned[saved.learnerUid]?Number(saved.learnerUid):null};
}
function has(game){return !!game.data.trainingDevice.obtainedAt;}
function requirements(game){
  const d=game.data.trainingDevice;
  return [{id:'erika',name:'민화의 무지개배지',done:game.data.badges.includes('erika')},{id:'rocket',name:'로켓단 비주기에게 승리',done:!!d.rocketWonAt},{id:'snorlax',name:'길을 막는 잠만보에게 승리',done:!!d.snorlaxWonAt},{id:'dex',name:'관동 도감 '+game.kantoCaughtCount()+' / 50종 등록',done:game.kantoCaughtCount()>=50}];
}
function canClaim(game){return !has(game)&&requirements(game).every(r=>r.done);}
function canChallenge(game,id){
  const d=game.data.trainingDevice;if(!battles[id]||!game.data.badges.includes('erika'))return false;
  return id==='rocket-giovanni'?!d.rocketWonAt:!!d.rocketWonAt&&!d.snorlaxWonAt;
}
function win(game,id,now){
  const key=id==='rocket-giovanni'?'rocketWonAt':id==='road-snorlax'?'snorlaxWonAt':null;
  if(!key||game.data.trainingDevice[key])return false;
  game.data.trainingDevice[key]=now;
  const text=id==='rocket-giovanni'?'로켓단 비주기에게 승리! 포켓몬피리로 잠만보를 깨울 수 있게 되었다.':'길을 막는 잠만보에게 승리! 15번도로로 가는 길이 열렸다.';
  game.log(text,'story',id==='road-snorlax'?143:null,now);return true;
}
function claim(game,now){
  if(!canClaim(game))return false;
  game.data.trainingDevice.obtainedAt=now;
  game.log('오박사의 도감 의뢰 완료! 15번도로의 조수에게 학습장치를 받았다.','device',null,now);
  game.animate('result',{text:'오박사 조수에게 학습장치를 받았다!'},now);return true;
}
function snapshot(game){
  const d=game.data.trainingDevice,p=game.data.owned[d.learnerUid];
  return {...d,obtained:has(game),canClaim:canClaim(game),requirements:requirements(game),learner:p?{uid:p.uid,id:p.id,level:p.level,boarded:game.isBoarded(p.uid),active:p.uid===game.data.activeId}:null,
    steps:Object.values(battles).map(b=>({...b,done:!!d[b.id==='rocket-giovanni'?'rocketWonAt':'snorlaxWonAt'],available:canChallenge(game,b.id)}))};
}
module.exports={battles,init,has,requirements,canClaim,canChallenge,win,claim,snapshot};
