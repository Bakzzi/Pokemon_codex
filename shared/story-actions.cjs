'use strict';
const K=require('./kanto-journey.cjs'), J=require('./johto.cjs');
const KW=require('./kanto-world.cjs'), JW=require('./johto-world.cjs');
const {data}=require('../desktop/pokemon.cjs');

const kantoBattles={
 pewter:[0], 'route-22':['rival-league'], 'route-24':['rival-cerulean'], cerulean:[1],
 'ss-anne':['rival-surge'], vermilion:[2], celadon:[3,'rocket-grunt','rocket-duo','rocket-giovanni'],
 tower:['rival-middle','tower-grunt-1','tower-grunt-2','tower-grunt-3'],
 saffron:['rival-silph','silph-grunt','silph-duo','silph-giovanni',5],
 'route-12':['road-snorlax'], 'route-16':['road-snorlax'], fuchsia:[4],
 safari:['safari-start'], mansion:['mansion-investigate'], cinnabar:[6], viridian:[7], indigo:[8]
};
const kantoLocations=new Map(K.cases.map(({location})=>[location,[]]));
for(const n of K.nodes.values())if(!n.automatic)kantoLocations.get(n.location).push(n.id);
const johtoLocations=new Map();
for(const n of J.nodes.values()){
 const location=JW.locationFor(n.id);
 if(!location||n.starter||n.type==='league')continue;
 if(!johtoLocations.has(location))johtoLocations.set(location,[]);
 johtoLocations.get(location).push(n.id);
}

function partyKey(game){
 return game.data.slots.filter(uid=>uid!==null&&game.data.owned[uid]&&!game.isBoarded(uid))
  .map(uid=>{const p=game.data.owned[uid];return `${uid}:${p.id}:${p.level}`;}).sort().join(',');
}
function rememberLoss(game,battle){
 if(!battle||battle.activityTrainer||(!battle.storyId&&battle.kind!=='trainer'))return;
 const id=battle.johtoLeague?'j-league':battle.mobileLeagueRevision?8:battle.storyId??battle.bossIndex;
 (game.data.storyLosses ||= {})[id]=partyKey(game);
}
function kantoPending(d,id,location){
 if(Number.isInteger(id))return id===8?!d.champion:!d.badges.includes(data.bosses[id].id);
 if(id==='road-snorlax')return !d.kantoStory.roads[location];
 if(id==='safari-start')return !d.mobileStory.safari.completedAt&&!d.mobileStory.safari.last?.returned;
 return true;
}
function candidateActions(game){
 const d=game.data,johto=!!d.johtoUnlocked,w=johto?d.johtoWorld:d.kantoWorld;
 if(d.mobileStory.onboarding!=='done'||d.battle||d.pendingBattle||d.pendingChallenge||d.suspendedWild||
    d.trainerSequence||d.mobileStory.safari.trip||d.pendingActions.some(a=>['travel','world-pass'].includes(a.kind))||!w)return [];
 const checkpoint=w.blocked&&(johto?JW:KW).checkpoint(game);
 if(checkpoint?.canPass)return [{checkpoint}];
 if(w.journey&&!w.blocked)return [];
 if(!johto&&!d.kantoStory?.mapAt&&K.modern(game))return [];
 const location=w.location,key=partyKey(game);
 const canStart=id=>d.storyLosses?.[id]!==key&&game.canChallenge(id);
 const ids=johto?(johtoLocations.get(location)||[]).filter(id=>!J.done(game,id)&&(id!=='j-league'||!d.johto.champion)):
  [...(kantoLocations.get(location)||[]),...(kantoBattles[location]||[])].filter(id=>kantoPending(d,id,location));
 // The first visit still uses the surprise arrival trigger. Only a rematch
 // at that location can be started here after an earlier defeat.
 if(!johto&&location==='route-22'&&!d.badges.includes('brock')&&game.rivalProgress('rival-brock')?.state==='retry')ids.push('rival-brock');
 return ids.filter(canStart).map(id=>({id}));
}
function autoPage(scene){return scene?.mode==='dialogue'&&!scene.awaitChoice&&scene.next!=='close-recollection';}
function pageDuration(scene){return Math.min(3200,Math.max(1400,(scene.pages[scene.index]?.length||0)*55));}
function workPending(game){
 const scene=game.presentation();
 if(scene)return autoPage(scene);
 return candidateActions(game).length>0;
}
function tick(game,now){
 const scene=game.presentation();
 if(scene){
  if(!autoPage(scene)||now<scene.at+pageDuration(scene))return false;
  const index=scene.index;
  const changed=game.advanceScene(scene.id+':'+index,now);
  if(changed&&game.presentation()===scene)scene.at=now;
  return changed;
 }
 const d=game.data,w=d.johtoUnlocked?d.johtoWorld:d.kantoWorld;
 if(!game.storySafe(now)||w?.walk&&now<w.walk.at+w.walk.duration)return false;
 for(const {id,checkpoint} of candidateActions(game)){
  if(checkpoint){
   game.dialogue('checkpoint',checkpoint.name,checkpoint.sprite,checkpoint.pages,'story-pass:'+checkpoint.location,now);
   return true;
  }
  if(game.startChallenge(id,now))return true;
 }
 return false;
}
module.exports={tick,autoPage,workPending,rememberLoss};
