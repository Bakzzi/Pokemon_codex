'use strict';
// Imported progress is evidence, not a reason to waive unplayed story events.
function restore(game,now){
 const s=game.data.kantoStory;if(s.revision>=2&&!s.legacy)return;
 const legacy=!!s.legacy,story=game.data.mobileStory;
 s.revision=2;s.legacy=false;
 if(legacy)s.importedAt ||= now;
 // Existing players already have these controls. Do not restart the tutorial.
 if(legacy){s.mapAt ||= now;s.dexAt ||= now;s.parcelAt ||= now;s.deliveredAt ||= now;}
 for(const [id,p]of Object.entries(story.rivals||{}))if(id!=='tutorial-green'&&p.state==='completed'&&p.migratedAt&&!p.wonAt&&!p.outcome){p.state='unseen';delete p.migratedAt;}
 // These legacy flags explicitly identify synthetic completion from badges or
 // old reward sources. Keep held items and separately recorded actual wins.
 for(const key of ['rescue','silph']){
  const p=story[key];if(p?.legacy){p.wins=[0,0,0];p.completedAt=0;p.rewardPending=false;p.legacy=false;}
 }
 if(story.mansion?.legacy)Object.assign(story.mansion,{startedAt:0,wins:0,read:0,keyObtainedAt:0,completedAt:0,legacy:false});
 for(const [species,id]of [[1,'k-bulbasaur'],[4,'k-charmander'],[7,'k-squirtle']])if(game.data.starterGifts[species])s.cleared[id] ||= game.data.starterGifts[species];
 if(s.fossil)s.cleared['k-fossil-choice'] ||= s.startedAt||now;
 // A former single road encounter was an actual win, unlike legacyRoadAccess.
 if(game.data.trainingDevice.snorlaxWonAt&&!Object.values(s.roads).some(Boolean))for(const id of ['route-12','route-16'])s.roads[id]=game.data.trainingDevice.snorlaxWonAt;
 const b=game.data.battle;if(legacy&&b?.kind==='trainer')s.importedBattle={storyId:b.storyId,startedAt:b.startedAt};
 const w=game.data.kantoWorld,trip=w?.journey;
 if(trip&&legacy&&!game.data.johtoUnlocked){
  // Recheck the existing destination after the current battle/result finishes.
  // Queued newer choices take precedence; no party or battle state is replaced.
  if(!game.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind)))game.data.pendingActions.push({id:++game.data.actionSerial,kind:'travel',location:trip.destination,position:{...trip.position},queuedAt:now});
  w.journey=null;
 }
}
module.exports={restore};
