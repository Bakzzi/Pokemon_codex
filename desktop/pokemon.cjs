'use strict';
const data=require('./data/game-data.json');
const species=new Map(data.pokemon.map(p=>[p.id,p]));
const moves=new Map(data.moves.map(m=>[m.id,m]));
const STARTER_FAMILY=new Set([1,2,3,4,5,6,7,8,9,25,26,152,153,154,155,156,157,158,159,160]);
// A later-generation baby does not make an original base species evolution-only.
const SPECIAL_EVOLUTIONS=new Set(data.pokemon.flatMap(parent=>parent.evolutions.filter(e=>species.has(e.to)&&parent.generation<=species.get(e.to).generation&&!(e.trigger===1&&e.level>0)).map(e=>e.to)));
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
function wildMinimum(p){return Math.max(p.minWildLevel||2,p.legendary||p.mythical?50:2);}
function wildLevelCap(badgeCount=0,champion=false){return champion?100:[15,20,25,30,35,40,50,60,60][Math.max(0,Math.min(8,badgeCount))];}
function wildEligible(p,maxGeneration,partnerLevel){return p.id!==143&&!STARTER_FAMILY.has(p.id)&&!SPECIAL_EVOLUTIONS.has(p.id)&&p.generation<=maxGeneration&&wildMinimum(p)<=partnerLevel;}
function championBonus(minimumLevel=0){
  const levelMultiplier=minimumLevel>90?5:minimumLevel>80?4:minimumLevel>70?3:1;
  return {levelMultiplier,rareMultiplier:balance.championRareMultiplier*levelMultiplier,uncaughtWeight:balance.championUncaughtWeight*levelMultiplier};
}
function encounterChances(){
  // Rarity is the baseline. Champion and party-level bonuses belong to an
  // unregistered species, never to an entire tier containing caught Pokemon.
  const mythical=balance.mythicalPoolChance,legendary=balance.legendaryPoolChance,rare=balance.rarePoolChance;
  const uncommon=.36-balance.mythicalPoolChance-balance.legendaryPoolChance-balance.rarePoolChance;
  return {mythical,legendary,rare,uncommon,common:1-mythical-legendary-rare-uncommon};
}
function milestoneBonuses({badges=[],champion=false,caught={}}={}){
  const gymBonuses={144:'blaine',145:'sabrina',146:'giovanni'},completed=data.pokemon.filter(p=>p.generation===1&&p.id!==151).every(p=>!!caught[p.id]);
  return [144,145,146,150,151].map(id=>({id,extra:id===151?(completed ? .01 : 0):caught[id]?0:(badges.includes(gymBonuses[id]) ? .001 : 0)+(champion ? .003 : 0)})).filter(b=>b.extra>0);
}
const captureMilestones=[
  {targets:[144,145,146],excluded:[144,145,146,150,151],extra:.04},
  {targets:[150],excluded:[150,151],extra:.03},
  {targets:[151],excluded:[151],extra:.02},
  {generation:2,targets:[243,244,245],excluded:[243,244,245,249,250,251],extra:.04},
  {generation:2,targets:[249,250],excluded:[249,250,251],extra:.03},
  {generation:2,targets:[251],excluded:[251],extra:.02},
];
function captureBonus(id,caught={}){
  const rule=captureMilestones.find(rule=>rule.targets.includes(id));
  return rule&&data.pokemon.every(p=>p.generation!==(rule.generation||1)||rule.excluded.includes(p.id)||!!caught[p.id])?rule.extra:0;
}
function wildDistribution(maxGeneration,partnerLevel,{champion=false,caught={},minimumLevel=0,maximumLevel=100,additions=[],excluded=[]}={}){
  const all=data.pokemon.filter(p=>!excluded.includes(p.id)&&wildEligible(p,maxGeneration,Math.min(partnerLevel,maximumLevel))),baseRates=encounterChances(),common=all.filter(p=>rarity(p)==='common');
  const pokemon=all.map(p=>({id:p.id,tier:rarity(p),base:0,chance:0})),byId=new Map(pokemon.map(p=>[p.id,p])),bonus=championBonus(minimumLevel);
  for(const [tier,rate] of Object.entries(baseRates)){
    const preferred=all.filter(p=>rarity(p)===tier),pool=preferred.length?preferred:common;
    for(const p of pool)byId.get(p.id).base+=rate/pool.length;
  }
  let total=0;
  for(const p of pokemon){
    const missing=champion&&!caught[p.id],rare=['rare','legendary','mythical'].includes(p.tier);
    // Apply the party-level multiplier once. Multiplying both level-adjusted
    // fields would square it and make missing legends excessively common.
    p.weight=missing?bonus.uncaughtWeight*(rare?balance.championRareMultiplier:1):1;
    p.base*=p.weight;total+=p.base;
  }
  // Normalize across the whole eligible population. A tier with no missing
  // species keeps its original weights instead of consuming a raised quota.
  for(const p of pokemon)p.base/=total;
  const eligible=additions.filter(b=>byId.has(b.id)),extraTotal=eligible.reduce((n,b)=>n+b.extra,0),ordinary=pokemon.filter(p=>p.tier==='common'||p.tier==='uncommon').reduce((n,p)=>n+p.base,0);
  if(extraTotal>ordinary)throw new Error('Special encounter bonuses exceed ordinary encounter probability');
  const scale=ordinary?(ordinary-extraTotal)/ordinary:1;
  for(const p of pokemon)p.chance=p.base*(p.tier==='common'||p.tier==='uncommon'?scale:1);
  for(const b of eligible)byId.get(b.id).chance+=b.extra;
  const rates={mythical:0,legendary:0,rare:0,uncommon:0,common:0};for(const p of pokemon)rates[p.tier]+=p.chance;
  return {pokemon,rates,baseRates,extraTotal,additions:additions.map(b=>({...b,eligible:byId.has(b.id),base:byId.get(b.id)?.base||0,chance:byId.get(b.id)?.chance||0}))};
}
function pickWild(maxGeneration,random=Math.random,partnerLevel=100,options={}){
  const {pokemon,rates}=wildDistribution(maxGeneration,partnerLevel,options);
  let category=random(),tier='common';for(const [name,rate] of Object.entries(rates)){category-=rate;if(category<0){tier=name;break;}}
  const pool=pokemon.filter(p=>p.tier===tier&&p.chance>0);let draw=random()*rates[tier];
  for(const p of pool){draw-=p.chance;if(draw<0)return p.id;}return pool.at(-1).id;
}
module.exports={data,species,moves,xpAt,levelAt,learnedMoves,effective,statsAt,view,pickWild,rarity,balance,wildMinimum,wildLevelCap,wildEligible,encounterChances,championBonus,milestoneBonuses,captureBonus,wildDistribution};
