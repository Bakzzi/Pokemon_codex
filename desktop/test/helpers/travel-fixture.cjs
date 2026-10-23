'use strict';
// Resolve wild quotas and actual ordinary-trainer result transactions. Never
// bypass a trainer just because a travel clock/distance has finished.
function finishJourney(game,now){
 let clock=now;
 for(let i=0;i<300;i++){
  const state=game.data.johtoUnlocked?game.data.johtoWorld:game.data.kantoWorld;
  if(!state.journey&&!game.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind)))return clock;
  clock=Math.max(clock,game.nextTick,game.data.switchUntil||0);
  if(game.platform==='mobile'){if(!Number.isSafeInteger(game.data.mapTravel?.observed))game.recordTravelSteps(0);game.recordTravelSteps(game.data.mapTravel.observed+2000);}
  else for(let n=0;n<20;n++)game.onWildEnd({kind:'wild',location:state.location},clock);
  if(!game.controlTick(clock)){
   const id=game.movementTrainerNode?.();if(!id)throw new Error('Fixture journey failed to advance at '+state.location);
   game.data.workTokens=250;if(!game.startAutomaticTrainer(id,clock))throw new Error('Cannot meet '+id);
   for(let j=0;j<20&&game.data.battle;j++){
    for(let k=0;k<4&&game.presentation()?.automatic;k++){const s=game.presentation();game.sceneTick(s.at+(s.duration||3000));}
    clock=Math.max(clock,game.nextTick,game.data.switchUntil||0);game.data.battle.foe.hp=0;game.defeatOpponent(clock);
   }
   if(game.data.battle)throw new Error('Trainer did not resolve '+id);
  }
 }
 throw new Error('Fixture journey did not finish');
}
module.exports={finishJourney};
