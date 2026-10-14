'use strict';
const data=require('./data/game-data.json');
const species=new Map(data.pokemon.map(p=>[p.id,p]));
const moves=new Map(data.moves.map(m=>[m.id,m]));
const colors={1:'#d0c8b4',2:'#e79571',3:'#b5b4ec',4:'#cb91e2',5:'#d3b78b',6:'#c8bd8a',7:'#b4cb72',8:'#ac9de0',9:'#aac1ca',10:'#ff9975',11:'#79cdf4',12:'#9ee5a2',13:'#f5ce52',14:'#f29bb9',15:'#99e2e4',16:'#aea0ed',17:'#ad9a91'};
const effectMap=new Map(data.matchups.map(([a,b,value])=>[`${a}:${b}`,value]));
function xpAt(id,level){return data.experience[species.get(id).growth][Math.max(1,Math.min(100,level))-1];}
function levelAt(id,xp){const table=data.experience[species.get(id).growth];let level=1;while(level<100&&xp>=table[level])level++;return level;}
function learnedMoves(id,level,previous=[],fromLevel=0){
  const learned=species.get(id).learn.filter(m=>m.level<=level&&(!previous.length||m.level>fromLevel)).map(m=>m.move);
  const distinct=[];for(const move of [...previous,...learned]){const i=distinct.indexOf(move);if(i>=0)distinct.splice(i,1);distinct.push(move);}
  return distinct;
}
function effective(type,defenderTypes){return defenderTypes.reduce((n,t)=>n*(effectMap.get(`${type}:${t}`)??1),1);}
function statsAt(id,level){
  const base=species.get(id).stats,stats={};
  for(let i=1;i<=6;i++)stats[i]=Math.floor((2*base[i]+15)*level/100)+(i===1?level+10:5);
  return stats;
}
function view(id){const p=species.get(id);return {id:p.id,name:p.name,types:p.types.map(t=>data.types.find(x=>x.id===t).name),accent:colors[p.types[0]]||colors[1]};}
// Game-specific encounter balance, distinct from original area-specific encounter slots.
const balance={tokensPerAction:250,legendaryPoolChance:0.001,mythicalPoolChance:0.0001,rarePoolChance:0.08,championRareMultiplier:1.5,championUncaughtWeight:2};
function rarity(p){if(p.mythical)return 'mythical';if(p.legendary)return 'legendary';if(p.catchRate<=75||Object.values(p.stats).reduce((a,b)=>a+b,0)>=480)return 'rare';return p.catchRate>=190?'common':'uncommon';}
function wildMinimum(p){return Math.max(p.minWildLevel||2,p.legendary?50:p.mythical?30:2);}
function championBonus(minimumLevel=0){
  const multiplier=minimumLevel>90?5:minimumLevel>80?4:minimumLevel>70?3:null;
  return {rareMultiplier:multiplier||balance.championRareMultiplier,uncaughtWeight:multiplier||balance.championUncaughtWeight};
}
function encounterChances(champion=false,minimumLevel=0){
  const multiplier=champion?championBonus(minimumLevel).rareMultiplier:1;
  const mythical=balance.mythicalPoolChance*multiplier,legendary=balance.legendaryPoolChance*multiplier,rare=balance.rarePoolChance*multiplier;
  const uncommon=.36-balance.mythicalPoolChance-balance.legendaryPoolChance-balance.rarePoolChance;
  return {mythical,legendary,rare,uncommon,common:1-mythical-legendary-rare-uncommon};
}
function pickWild(maxGeneration,random=Math.random,partnerLevel=100,{champion=false,caught={},minimumLevel=0}={}){
  const all=data.pokemon.filter(p=>p.generation<=maxGeneration&&wildMinimum(p)<=partnerLevel);
  const rates=encounterChances(champion,minimumLevel),roll=random();
  const tier=roll<rates.mythical?'mythical':roll<rates.mythical+rates.legendary?'legendary':roll<rates.mythical+rates.legendary+rates.rare?'rare':roll<rates.mythical+rates.legendary+rates.rare+rates.uncommon?'uncommon':'common';
  const preferred=all.filter(p=>rarity(p)===tier),pool=preferred.length?preferred:all.filter(p=>rarity(p)==='common');
  if(!champion)return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id;
  const uncaughtWeight=championBonus(minimumLevel).uncaughtWeight,weights=pool.map(p=>caught[p.id]?1:uncaughtWeight);let pick=random()*weights.reduce((sum,w)=>sum+w,0);
  for(let i=0;i<pool.length;i++){pick-=weights[i];if(pick<0)return pool[i].id;}
  return pool.at(-1).id;
}
module.exports={data,species,moves,xpAt,levelAt,learnedMoves,effective,statsAt,view,pickWild,rarity,balance,wildMinimum,encounterChances,championBonus};
