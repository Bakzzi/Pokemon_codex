'use strict';
// Identity/lineup availability is separate from learning an opponent's levels.
function init(data){
 data.challengeSeen=Object.fromEntries(Object.entries(data.challengeSeen||{}).filter(([id,at])=>/^[a-z][a-z0-9-]{0,63}$/.test(id)&&Number.isSafeInteger(at)&&at>0));
}
function remember(game,id,now){game.data.challengeSeen[id] ||= now;}
function known(game,id,completed=false){return !!(completed||game.data.challengeSeen?.[id]);}
function restore(game,entries,now){
 const journal=game.data.journal||[],battle=game.data.battle;
 // Only exact, unambiguous start records count. Reservations never do.
 const counts=new Map();for(const e of entries)for(const text of [...(e.starts||[]),...(e.loss?[e.loss]:[])])counts.set(text,(counts.get(text)||0)+1);
 for(const e of entries){
  const met=journal.find(log=>log.kind==='challenge'&&(e.starts||[]).some(text=>counts.get(text)===1&&text===log.text)||log.kind==='loss'&&e.loss&&counts.get(e.loss)===1&&log.text?.startsWith(e.loss));
  const active=battle?.foe&&(battle.storyId===e.id||!battle.storyId&&Number.isInteger(e.index)&&battle.bossIndex===e.index);
  if(e.completed||met||active)remember(game,e.id,active?battle.startedAt||now:met?.at||now);
 }
}
module.exports={init,remember,known,restore};
