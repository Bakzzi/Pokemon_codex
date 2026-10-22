'use strict';
// PokeAPI item identities; restoration values follow the Gen III ruleset.
// Fixed Kanto reference: five stones share the existing 1.5% drop chance.
// Use FRLG purchase prices, not the modern prices in the PokeAPI snapshot.
const economy=Object.freeze({stonePrice:2100,stonePoolSize:5,evolutionDropChance:.015});
const items=[
  {id:25,identifier:'hyper-potion',name:'고급상처약',referencePrice:1200,description:'체력 200 회복'},
  {id:27,identifier:'full-heal',name:'만병통치제',referencePrice:600,description:'상태이상과 혼란 치료'},
  {id:28,identifier:'revive',name:'기력의조각',referencePrice:1500,description:'기절한 동료를 체력 절반으로 회복'},
  // Ether is not sold in FRLG: value it at twice its 600 sell price.
  {id:38,identifier:'ether',name:'PP에이드',referencePrice:1200,priceEstimated:true,description:'기술 하나의 PP 10 회복'},
].map(item=>({...item,weight:economy.stonePrice/item.referencePrice}));
const byId=new Map(items.map(item=>[item.id,item])),totalWeight=items.reduce((sum,item)=>sum+item.weight,0);
const dropChance=economy.evolutionDropChance/economy.stonePoolSize*totalWeight;
// Finite seasonal supplies. These are not part of the general stone pool.
const limitedEvolutionItems=[
  {id:198,limit:2,sources:[79,61],evolutions:[186,199]},
  {id:210,limit:2,sources:[81],evolutions:[208,212]},
  {id:212,limit:1,sources:[116,117,147,148],evolutions:[230]},
  {id:229,limit:1,sources:[],evolutions:[233]},
];
const limitedById=new Map(limitedEvolutionItems.map(item=>[item.id,item]));
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
function initEvolutionItems(data){
  data.evolutionItemTotals ||= {};
  for(const item of limitedEvolutionItems){
    const stock=count(data.inventory[item.id]);
    if(!Object.hasOwn(data.evolutionItemTotals,item.id)){
      // Older saves have no acquisition ledger. Preserve stock and account for
      // spent items using the surviving seasonal evolution evidence.
      const logged=(data.journal||[]).filter(e=>e.kind==='evolution'&&item.evolutions.includes(e.id)).length;
      const owned=Object.values(data.owned||{}).filter(p=>item.evolutions.includes(p.id)).length;
      const registered=item.evolutions.filter(id=>data.seasonCaught?.[id]).length;
      data.evolutionItemTotals[item.id]=stock+Math.max(logged,owned,registered);
    }
    data.evolutionItemTotals[item.id]=Math.min(item.limit,Math.max(count(data.evolutionItemTotals[item.id]),stock));
  }
}
function grantEvolutionItem(data,id){
  const item=limitedById.get(id);if(!item)return false;
  initEvolutionItems(data);
  if(data.evolutionItemTotals[id]>=item.limit)return false;
  data.inventory[id]=count(data.inventory[id])+1;data.evolutionItemTotals[id]++;return true;
}
function dropEvolutionItem(game,b,captured){
  if(game.maxGeneration()<2||b.kind!=='wild'||captured||b.storyId||b.freeChallenge)return null;
  const item=limitedEvolutionItems.find(item=>item.sources.includes(b.foe.id));if(!item)return null;
  initEvolutionItems(game.data);
  if(game.data.evolutionItemTotals[item.id]>=item.limit||game.random()>=.02)return null;
  return grantEvolutionItem(game.data,item.id)?item.id:null;
}
function drop(random){
  if(random()>=dropChance)return null;
  let draw=random()*totalWeight;
  for(const item of items){draw-=item.weight;if(draw<0)return item;}
  return items.at(-1);
}
function pickEvolutionItem(candidates,inventory,random){
  // Balance current stock, so using a stone makes it more likely again.
  // Three held copies have 1/16 the weight of an unowned kind; no kind is banned.
  const weighted=candidates.map(id=>{
    const count=Number.isSafeInteger(inventory[id])&&inventory[id]>0?inventory[id]:0;
    return {id,weight:1/(count+1)**2};
  });
  if(!weighted.length)return null;
  let draw=random()*weighted.reduce((sum,item)=>sum+item.weight,0);
  for(const item of weighted){draw-=item.weight;if(draw<0)return item.id;}
  return weighted.at(-1).id;
}
function choose(game,b,sim){
  if(b.kind!=='trainer'||b.activityTrainer||b.pendingSwitch||sim.requestState!=='move'||sim.p1.activeRequest?.wait)return null;
  const actor=sim.p1.active[0];if(!actor.hp||actor.fainted)return null;
  const has=id=>Number.isSafeInteger(game.data.inventory[id])&&game.data.inventory[id]>0;
  const target=actor.name;
  if(has(25)&&actor.hp/actor.maxhp<=.25)return {id:25,target};
  const sleeping=actor.status==='slp',wakesNext=actor.statusState.time<=(actor.ability==='earlybird'?2:1);
  if(has(27)&&((actor.status&&(!sleeping||!wakesNext))||(actor.volatiles.confusion?.time||0)>1))return {id:27,target};
  if(has(38)){
    const attacks=actor.moveSlots.filter(slot=>sim.dex.moves.get(slot.id).category!=='Status'&&!slot.disabled);
    if(attacks.length&&!attacks.some(slot=>slot.pp>0)){
      const slot=attacks.filter(slot=>slot.pp<slot.maxpp).sort((a,b)=>sim.dex.moves.get(b.id).basePower-sim.dex.moves.get(a.id).basePower)[0];
      if(slot)return {id:38,target,move:slot.id};
    }
  }
  // Revive a reserve only while the fielded partner can keep fighting. It is
  // never a replacement for the mandatory switch after the active one faints.
  if(has(28)&&actor.hp/actor.maxhp>.5){
    const target=sim.p1.pokemon.filter(mon=>mon.fainted&&game.data.slots.includes(Number(mon.name.slice(1)))&&!game.isBoarded(Number(mon.name.slice(1)))).sort((a,b)=>b.level-a.level)[0];
    if(target)return {id:28,target:target.name};
  }
  return null;
}
function use(game,b,sim,choice){
  if(b.kind!=='trainer'||b.activityTrainer||!byId.has(choice.id)||!(game.data.inventory[choice.id]>0))return false;
  const target=sim.p1.pokemon.find(mon=>mon.name===choice.target),item=byId.get(choice.id);
  if(!target||!game.data.slots.includes(Number(target.name.slice(1)))||game.isBoarded(Number(target.name.slice(1))))return false;
  const slot=target.moveSlots.find(slot=>slot.id===choice.move);
  if(choice.id===28?(!target.fainted||target.hp):target.fainted||!target.hp)return false;
  if(choice.id===25&&target.hp>=target.maxhp||choice.id===27&&!target.status&&!target.volatiles.confusion||choice.id===38&&(!slot||slot.pp>=slot.maxpp))return false;
  game.data.inventory[item.id]--;
  sim.add('buddyitem',sim.p1.active[0],String(item.id),target.name);
  if(item.id===25)sim.heal(200,target,target,sim.dex.items.get('hyperpotion'));
  if(item.id===27){if(target.status)target.cureStatus();target.removeVolatile('confusion');}
  if(item.id===28){
    target.fainted=false;target.faintQueued=false;target.hp=Math.max(1,Math.floor(target.maxhp/2));target.status='';target.statusState=sim.initEffectState({id:'',target});
    target.switchFlag=false;target.forceSwitchFlag=false;target.side.pokemonLeft++;
    sim.add('buddyrevive',target);
  }
  if(item.id===38){slot.pp=Math.min(slot.maxpp,slot.pp+10);const base=target.baseMoveSlots.find(s=>s.id===slot.id);if(base&&base!==slot)base.pp=slot.pp;sim.add('buddypp',target,sim.dex.moves.get(slot.id).name);}
  return true;
}
module.exports={items,byId,economy,dropChance,drop,pickEvolutionItem,choose,use,limitedById,initEvolutionItems,grantEvolutionItem,dropEvolutionItem};
