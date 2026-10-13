'use strict';
const {species,view}=require('./pokemon.cjs');
// Work-based pacing is specific to this widget; egg groups and hatch cycles come from PokeAPI.
const breedingBalance={eggTokens:20000,tokensPerHatchCycle:1000};
function genderFor(id,random=Math.random){
  const rate=species.get(id).genderRate;
  return rate<0?'none':random()*8<rate?'female':'male';
}
function predict(game,parents=[]){
  const fail=reason=>({compatible:false,reason,offspring:[]});
  if(parents.length!==2||!parents.every(uid=>game.data.owned[uid]))return fail('맡길 동료 두 마리를 골라 주세요.');
  if(parents[0]===parents[1])return fail('서로 다른 두 마리를 골라 주세요.');
  const [a,b]=parents.map(uid=>game.data.owned[uid]),[sa,sb]=[species.get(a.id),species.get(b.id)];
  if([sa,sb].some(s=>s.legendary||s.mythical||s.eggGroups.includes(15)))return fail('이 조합에는 알을 얻을 수 없는 포켓몬이 있어요.');
  if(a.id===132&&b.id===132)return fail('메타몽끼리는 알을 얻을 수 없어요.');
  let mother;
  if(a.id===132||b.id===132)mother=a.id===132?b:a;
  else{
    if(a.gender==='none'||b.gender==='none'||a.gender===b.gender)return fail('암컷과 수컷을 고르거나, 메타몽과 함께 맡겨 주세요.');
    if(!sa.eggGroups.some(group=>sb.eggGroups.includes(group)))return fail('알 그룹이 달라서 함께 알을 얻을 수 없어요.');
    mother=a.gender==='female'?a:b;
  }
  let id=mother.id;
  while(species.has(species.get(id).preEvolution))id=species.get(id).preEvolution;
  const possibilities=[29,32].includes(id)?[29,32]:[id];
  if(possibilities.some(id=>species.get(id).generation>game.maxGeneration()))return fail('태어날 포켓몬은 2세대예요. 관동 챔피언이 된 뒤 맡길 수 있어요.');
  return {compatible:true,reason:'이 조합으로 알을 얻을 수 있어요.',offspring:possibilities.map(id=>({...view(id),chance:1/possibilities.length,hatchTokens:species.get(id).hatchCycles*breedingBalance.tokensPerHatchCycle})),eggTokens:breedingBalance.eggTokens};
}
function start(game,parents,now=Date.now()){
  parents=Array.isArray(parents)?parents.map(Number):[];
  if(game.data.battle?.kind==='trainer'||game.data.pendingBattle||now<game.data.switchUntil||game.data.egg||(game.data.daycare&&!game.data.daycare.produced))return false;
  const preview=predict(game,parents);if(!preview.compatible)return false;
  const available=Object.values(game.data.owned).filter(p=>!parents.includes(p.uid));
  if(!available.length)return false;
  if(parents.includes(game.data.activeId)){
    const next=available.find(p=>game.data.slots.includes(p.uid))||available[0];
    // Release the previous nursery pair before selecting a replacement partner.
    const old=game.data.daycare;game.data.daycare=null;
    if(!game.select(next.uid,now)){game.data.daycare=old;return false;}
  }
  game.data.daycare={parents,progress:0,required:preview.eggTokens,produced:false,offspring:preview.offspring.map(p=>p.id),startedAt:now};
  game.daycareSelection=parents;
  game.log(parents.map(uid=>species.get(game.data.owned[uid].id).name).join(' · ')+' 키우미집에 맡김','daycare',null,now);
  return true;
}
function withdraw(game,now=Date.now()){
  if(!game.data.daycare)return false;
  game.log('키우미집의 동료들을 데려왔다','daycare',null,now);game.data.daycare=null;return true;
}
function advance(game,delta,now){
  if(delta<=0)return;
  const care=game.data.daycare;
  let remaining=delta;
  if(care&&!care.produced&&!game.data.egg){
    const used=Math.min(remaining,care.required-care.progress);care.progress+=used;remaining-=used;
    if(care.progress>=care.required){
      const id=care.offspring[Math.floor(game.random()*care.offspring.length)];
      game.data.egg={id,progress:0,required:species.get(id).hatchCycles*breedingBalance.tokensPerHatchCycle,parents:[...care.parents],obtainedAt:now};
      care.produced=true;game.log(species.get(id).name+'의 알을 발견했다!','egg',id,now);
    }
  }
  const egg=game.data.egg;
  if(egg){
    egg.progress=Math.min(egg.required,egg.progress+remaining);
    if(egg.progress>=egg.required){
      const uid=game.addPokemon(egg.id,5,'hatch',now);
      if(uid){game.log(species.get(egg.id).name+' Lv.5 부화! 새로운 동료가 되었다.','hatch',egg.id,now);game.data.egg=null;}
    }
  }
}
function snapshot(game){
  const d=game.data,care=d.daycare,egg=d.egg;
  return {selection:game.daycareSelection||care?.parents||[],preview:predict(game,game.daycareSelection||care?.parents||[]),
    care:care?{...care,parents:care.parents.map(uid=>({uid,...view(d.owned[uid].id),level:d.owned[uid].level})),offspring:care.offspring.map(id=>view(id))}:null,
    egg:egg?{...egg,...view(egg.id)}:null,balance:breedingBalance};
}
module.exports={genderFor,predict,start,withdraw,advance,snapshot,breedingBalance};
