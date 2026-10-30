'use strict';
// Select destinations only. Existing travel pays distance, meets ordinary
// trainers and enforces gates; story actions and rewards remain manual.
const K=require('./kanto-journey.cjs'),J=require('./johto.cjs');
const KW=require('./kanto-world.cjs'),JW=require('./johto-world.cjs');
function kantoGoal(g){
 const d=g.data,s=d.kantoStory,m=d.mobileStory,w=d.kantoWorld;
 if(!s?.mapAt||m.onboarding!=='done')return null;
 const done=id=>K.done(g,id),badge=id=>d.badges.includes(id);
 const stages=[
  ['pewter',badge('brock')],['mt-moon',K.cases.find(c=>c.id==='moon-path').entries.every(done)],['cerulean',badge('misty')],
  ['route-24',done('k-bridge-rocket')],['sea-cottage',done('k-bill')],['cerulean',done('k-robber')],
  ['ss-anne',done('k-captain')],['vermilion',badge('surge')],['diglett',!!w.visited.diglett],
  ['route-2',done('k-aide')],['rock-tunnel',K.trainersDone(g,'tunnel-path')],
  ['tower',done('k-tower-visit')||!!m.scopeObtainedAt||!!m.rescue.completedAt],
  ['celadon',badge('erika')&&!!m.scopeObtainedAt],['tower',!!m.rescue.completedAt],
  ['saffron',!!s.drinkAt&&!!m.silph.completedAt&&badge('sabrina')],
  ['route-16',!!s.roads['route-16']],['fuchsia',badge('koga')],['safari',!!m.safari.completedAt],
  ['seafoam',done('k-seafoam-2')],['mansion',!!m.mansion.completedAt],['cinnabar',badge('blaine')],
  ['viridian',badge('giovanni')],['route-22',['won','completed'].includes(g.rivalProgress('rival-league')?.state)],
  ['route-23',!!w.leaguePass],['victory-road',K.trainersDone(g,'victory-path')],
  ['indigo',!!d.champion]
 ];
 return stages.find(([,done])=>!done)?.[0]||null;
}
const johtoOrder=[
 'j-sprout','j-falkner','j-well-boss','j-bugsy','j-ilex','j-whitney','j-sudowoodo','j-burned','j-morty',
 'j-kimono-4','j-lighthouse','j-chuck','j-medicine','j-amphy','j-jasmine','j-red-gyarados','j-generator-3',
 'j-pryce','j-radio-final','j-ice-path','j-clair','j-dragon-den','j-victory-road','j-league-lance',
 'j-ship','j-k-surge','j-k-sabrina','j-power-return','j-k-misty','j-k-erika','j-k-janine','j-k-snorlax',
 'j-k-brock','j-k-blaine','j-k-blue','j-red'
];
function johtoGoal(g){
 const id=johtoOrder.find(id=>!J.done(g,id));
 return id==='j-league-lance'?'j-k-indigo':id?JW.locationFor(id):null;
}
function goal(g){return g.data.johtoUnlocked?johtoGoal(g):kantoGoal(g);}
function state(g){return g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;}
function enabled(g){return g.data.storyTravel?.enabled!==false;}
function progressKey(g,target){
 const d=g.data,k=d.kantoStory,m=d.mobileStory;
 return JSON.stringify([target,d.badges,d.champion,k?.cleared,k?.roads,k?.drinkAt,m.scopeObtainedAt,
  m.rescue.completedAt,m.silph.completedAt,m.safari.completedAt,m.mansion.completedAt,d.johto?.cleared]);
}
function withStoryTravel(Base){return class StoryTravel extends Base{
 constructor(saved={},now=Date.now(),options={}){
  super(saved,now,options);
  // Let an existing trip finish before choosing the following story destination.
  this.data.storyTravel ||= {enabled:options.storyAuto!==false};
 }
 resetSeason(now){super.resetSeason(now);this.data.storyTravel={enabled:true};this.autoTravelAttempt=null;}
 unlockJohto(now=Date.now(),ids){const ok=super.unlockJohto(now,ids);if(ok){this.data.storyTravel={enabled:true};this.autoTravelAttempt=null;}return ok;}
 storyTravelTick(now){
  const d=this.data,w=state(this);
  if(!enabled(this)||!w||!this.storySafe(now)||d.suspendedWild||d.trainerSequence||d.mobileStory.safari.trip||d.pendingActions.length||w.journey||w.walk&&now<w.walk.at+w.walk.duration)return false;
  const target=goal(this);
  // A migrated save may already stand inside an unchecked entrance. Restore
  // its local checkpoint rather than waiting forever with no passage action.
  const checkpoint=!d.johtoUnlocked&&!w.blocked&&(target==='saffron'&&!d.kantoStory.drinkAt||target==='route-23'&&!w.leaguePass);
  if(!target||w.location===target&&!checkpoint)return false;
  const key=progressKey(this,target);if(key===this.autoTravelAttempt)return false;
  this.autoTravelAttempt=key;
  const steps=require('./step-travel.cjs'),before=steps.hasIntent(this);
  if(!this.travelTo(target,now))return false;
  if(w.journey)w.journey.storyAuto=true;
  if(this.platform==='mobile')steps.beginIntent(this,before);
  return true;
 }
 controlTick(now=Date.now()){return super.controlTick(now)||this.storyTravelTick(now);}
 tick(now=Date.now()){return this.storyTravelTick(now)||super.tick(now);}
 requestAction(kind,value,now=Date.now()){
  if(kind==='story-travel'){
   const on=value===true,w=state(this);this.data.storyTravel={enabled:on};this.autoTravelAttempt=null;
   if(!on&&w?.journey?.storyAuto){w.journey=null;if(this.platform==='mobile')require('./step-travel.cjs').bankRemainder(this);}
   return true;
  }
  const ok=super.requestAction(kind,value,now);
  if(ok&&kind==='travel'){this.data.storyTravel={enabled:false};this.autoTravelAttempt=null;}
  return ok;
 }
 panelState(now=Date.now()){
  const s=super.panelState(now),key=this.data.johtoUnlocked?'johtoWorld':'kantoWorld',w=s[key];
  if(w)w.storyTravel={enabled:enabled(this),complete:!goal(this),available:!!this.data.johtoUnlocked||!!this.data.kantoStory?.mapAt};
  return s;
 }
};}
module.exports={withStoryTravel,goal,kantoGoal,johtoGoal,johtoOrder};
