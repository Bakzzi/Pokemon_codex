'use strict';
// FRLG Rocket Hideout grunt / Giovanni parties, plus the Yellow Jessie-James party.
// Story victories are separate from the Viridian Gym badge.
const {learnedMoves,species}=require('./pokemon.cjs');
const battles=Object.assign(Object.create(null),{
  'rocket-grunt':{id:'rocket-grunt',name:'로켓단 조무래기',stage:1,kind:'story',team:[{id:20,level:20},{id:41,level:20}]},
  'rocket-duo':{id:'rocket-duo',name:'로이·로사',stage:2,kind:'story',team:[{id:109,level:25},{id:52,level:25},{id:23,level:25}]},
  'rocket-giovanni':{id:'rocket-giovanni',name:'로켓단 비주기',stage:3,kind:'story',team:[{id:95,level:25},{id:111,level:24},{id:115,level:29}]},
  'road-snorlax':{id:'road-snorlax',name:'길을 막는 잠만보',kind:'story',xpTrainer:false,team:[{id:143,level:30}]}
});
for(const battle of Object.values(battles))for(const p of battle.team)p.moves=learnedMoves(p.id,p.level).slice(-4);
const rocketOrder=['rocket-grunt','rocket-duo','rocket-giovanni'];
const progressKeys={'rocket-grunt':'gruntWonAt','rocket-duo':'duoWonAt','rocket-giovanni':'rocketWonAt','road-snorlax':'snorlaxWonAt'};
function init(game,now=Date.now()){
  const saved=game.data.trainingDevice||{},stamp=n=>Number.isSafeInteger(n)&&n>0?n:null;
  const rocket=stamp(saved.rocketWonAt),legacy=!(saved.storyRevision>=2);
  const activeLegacy=legacy&&game.data.battle?.storyId==='rocket-giovanni'?stamp(game.data.battle.startedAt):null;
  const legacyRoadAccess=saved.legacyRoadAccess===true||saved.routeRevision!==1&&(!!stamp(saved.obtainedAt)||['koga','sabrina','blaine','giovanni'].some(id=>game.data.badges.includes(id))||game.data.battle?.kind==='trainer'&&Number.isInteger(game.data.battle.bossIndex)&&game.data.battle.bossIndex>=4);
  game.data.trainingDevice={storyRevision:3,routeRevision:1,legacyRoadAccess,gruntWonAt:stamp(saved.gruntWonAt)||(legacy?rocket||activeLegacy:null),duoWonAt:stamp(saved.duoWonAt)||(legacy?rocket||activeLegacy:null),rocketWonAt:rocket,fluteObtainedAt:stamp(saved.fluteObtainedAt)||(legacy?rocket:null),snorlaxWonAt:stamp(saved.snorlaxWonAt),obtainedAt:stamp(saved.obtainedAt),learnerUid:game.data.owned[saved.learnerUid]?Number(saved.learnerUid):null};
  // A badge already earned under the old order keeps its new reward, once.
  if(saved.storyRevision!==3&&game.data.badges.includes('erika'))awardFlute(game,now);
  if(canClaim(game))claim(game,now,false);
  for(const p of Object.values(game.data.owned)){
    const lesson=p.deviceLevelUp;
    if(!hasLearnedLevel(game,p))delete p.deviceLevelUp;
    else p.deviceLevelUp={from:lesson.from,before:lesson.before,level:lesson.level,at:lesson.at,autoPending:lesson.autoPending===true};
  }
  if(legacy&&game.data.pendingChallenge?.index==='rocket-giovanni'&&!rocket&&!activeLegacy)game.data.pendingChallenge.index=nextRocket(game);
  const b=game.data.battle;
  if(b?.storyId==='road-snorlax'&&b.kind==='trainer'){
    // Keep the old pending native turn and animation; only enable normal wild capture.
    b.kind='wild';b.captureByHealth ||= {yellow:0,red:0};
  }
}
function nextRocket(game){return rocketOrder.find(id=>!game.data.trainingDevice[progressKeys[id]])||null;}
function rocketUnlocked(game){return game.data.badges.includes('surge');}
function has(game){return !!game.data.trainingDevice.obtainedAt;}
function routeOpen(game){return !!game.data.trainingDevice.snorlaxWonAt||game.data.trainingDevice.legacyRoadAccess===true;}
function hasLearnedLevel(game,p){
  const lesson=p?.deviceLevelUp;
  const reduction=game.data.johtoLevelReduction,previous=reduction?.changes?.find(c=>c.uid===p?.uid&&c.id===p.id&&lesson?.at<=reduction.at);
  // An earned device evolution survives the one-time regional level reduction.
  const reachedLevel=Math.max(p?.level||0,previous?.from||0);
  return !!(has(game)&&lesson&&lesson.from===p.id&&Number.isInteger(lesson.before)&&lesson.before>=1&&Number.isInteger(lesson.level)&&lesson.level>lesson.before&&lesson.level<=reachedLevel&&Number.isSafeInteger(lesson.at)&&lesson.at>=game.data.trainingDevice.obtainedAt&&species.get(p.id)?.evolutions.some(e=>e.trigger===2));
}
function queueEvolutions(game,now,records=Object.values(game.data.owned)){
  for(const p of records){
    if(!p.deviceLevelUp?.autoPending||!hasLearnedLevel(game,p))continue;
    const rule=species.get(p.id).evolutions.find(e=>e.trigger===2&&species.get(e.to)?.generation<=game.maxGeneration());
    if(!rule)continue;
    const lesson=p.deviceLevelUp;
    if(game.requestAction('evolve',{id:p.uid,to:rule.to},now)){lesson.autoPending=false;return true;}
  }
  return false;
}
function learnedLevel(game,p,before,now){
  if(!has(game)||game.data.trainingDevice.learnerUid!==p.uid||p.level<=before||!species.get(p.id).evolutions.some(e=>e.trigger===2))return false;
  p.deviceLevelUp={from:p.id,before,level:p.level,at:now,autoPending:true};
  queueEvolutions(game,now,[p]);return true;
}
function requirements(game){
  const d=game.data.trainingDevice,unlocked=rocketUnlocked(game),next=nextRocket(game);
  return rocketOrder.map((id,i)=>{
    const done=!!d[progressKeys[id]],revealed=done||unlocked&&id===next;
    return {id,name:revealed?['조무래기','로이·로사','비주기'][i]+'에게 승리':'???에게 승리',done,revealed};
  });
}
function canClaim(game){return !has(game)&&!!game.data.trainingDevice.snorlaxWonAt;}
function canChallenge(game,id){
  const d=game.data.trainingDevice;if(!battles[id])return false;
  return id==='road-snorlax'?!!d.fluteObtainedAt&&(!d.snorlaxWonAt||!game.registeredThisSeason(143)):rocketUnlocked(game)&&id===nextRocket(game);
}
function win(game,id,now,captured=false){
  const key=Object.hasOwn(progressKeys,id)?progressKeys[id]:null;
  if(!key||game.data.trainingDevice[key])return false;
  game.data.trainingDevice[key]=now;
  const text=id==='rocket-giovanni'?'로켓단 비주기에게 승리! 로켓단 3단계를 모두 물리쳤다.':id==='road-snorlax'?(captured?'피리로 깨운 잠만보를 포획했다!':'피리로 깨운 잠만보를 기절시켰다!')+' 길이 열리고 5번째 체육관에 도전할 수 있게 되었다.':battles[id].name+'에게 승리! 로켓단 '+battles[id].stage+'단계를 돌파했다.';
  game.log(text,'story',id==='road-snorlax'?143:null,now);if(id==='road-snorlax')claim(game,now,false);return true;
}
function awardFlute(game,now){
  const d=game.data.trainingDevice;if(!game.data.badges.includes('erika')||d.fluteObtainedAt)return false;
  d.fluteObtainedAt=now;game.log('민화에게 포켓몬피리를 받았다! 잠만보를 깨울 수 있을 것 같다.','item',null,now);return true;
}
function claim(game,now,present=true){
  if(!canClaim(game))return false;
  game.data.trainingDevice.obtainedAt=now;
  game.log('길을 막던 잠만보를 해결하고 학습장치를 받았다!','device',null,now);
  if(present)game.animate('result',{text:'학습장치 획득! 5번째 체육관에 도전할 수 있어요.'},now);return true;
}
function snapshot(game){
  const d=game.data.trainingDevice,p=game.data.owned[d.learnerUid],rows=requirements(game);
  return {...d,routeOpen:routeOpen(game),rocketUnlocked:rocketUnlocked(game),fluteObtained:!!d.fluteObtainedAt,snorlaxCaught:game.registeredThisSeason(143),rocketCompleted:rocketOrder.filter(id=>d[progressKeys[id]]).length,nextRocket:nextRocket(game),obtained:has(game),canClaim:canClaim(game),requirements:rows,learner:p?{uid:p.uid,id:p.id,level:p.level,boarded:game.isBoarded(p.uid),active:p.uid===game.data.activeId}:null,
    steps:Object.values(battles).map(b=>{
      const revealed=rows.find(r=>r.id===b.id)?.revealed!==false;
      return {...b,name:revealed?b.name:'???',team:revealed?b.team.map(p=>({...p,name:species.get(p.id).name})):[],revealed,done:!!d[progressKeys[b.id]],available:canChallenge(game,b.id)};
    })};
}
module.exports={battles,rocketOrder,nextRocket,init,has,routeOpen,hasLearnedLevel,learnedLevel,queueEvolutions,requirements,canClaim,canChallenge,win,awardFlute,claim,snapshot};
