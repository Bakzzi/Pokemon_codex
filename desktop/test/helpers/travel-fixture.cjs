'use strict';
// Geometry fixtures resolve encounter completions without simulating XP or AI.
// road-journey.test.cjs separately exercises real battle/capture result hooks.
function finishJourney(game,now){
 let clock=now;
 for(let i=0;i<300;i++){
  const state=game.data.johtoUnlocked?game.data.johtoWorld:game.data.kantoWorld;
  if(!state.journey&&!game.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind)))return clock;
  clock=Math.max(clock,game.nextTick,game.data.switchUntil||0);
  for(let n=0;n<20;n++)game.onWildEnd({kind:'wild',location:state.location},clock);
  if(!game.controlTick(clock))throw new Error('Fixture journey failed to advance at '+state.location);
 }
 throw new Error('Fixture journey did not finish');
}
module.exports={finishJourney};
