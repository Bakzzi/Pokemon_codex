'use strict';
const {species}=require('./pokemon.cjs');
const TARGET_LEVEL=5,MAX_COMPANIONS=10;
// Use the departing region's ancestry: later babies do not change a Kanto base species.
function minimumEvolutionLevel(id,generation=1,visited=new Set()){
  const p=species.get(id);if(!p||visited.has(id))return Infinity;
  const parent=species.get(p.preEvolution);
  if(!parent||parent.generation>generation||parent.generation>p.generation)return 1;
  const rules=parent.evolutions.filter(e=>e.to===id);if(!rules.length)return Infinity;
  const path=new Set(visited);path.add(id);
  const base=minimumEvolutionLevel(parent.id,generation,path);
  return Math.min(...rules.map(e=>e.level?Math.max(base,e.level):e.trigger===2||e.happiness?base+1:base));
}
function preview(caught){
  const registered=[...species.values()].filter(p=>p.generation===1&&!!caught[p.id]);
  return {targetLevel:TARGET_LEVEL,maxCompanions:MAX_COMPANIONS,candidates:registered.map(p=>{
    const minimumLevel=minimumEvolutionLevel(p.id),eligible=minimumLevel<=TARGET_LEVEL;
    return {id:p.id,name:p.name,level:TARGET_LEVEL,minimumLevel,eligible,reason:eligible?'도감 등록 완료 · Lv.'+TARGET_LEVEL+'로 출발':'Lv.'+minimumLevel+'부터 가능한 진화 단계'};
  })};
}
function validate(caught,ids){
  if(!Array.isArray(ids)||ids.length<1||ids.length>MAX_COMPANIONS||ids.some(id=>!Number.isSafeInteger(id))||new Set(ids).size!==ids.length)return '도감에 등록한 종 중 함께 갈 동료를 최대 10종 선택해 주세요.';
  const candidates=new Map(preview(caught).candidates.map(p=>[p.id,p]));
  if(ids.some(id=>!candidates.get(id)?.eligible))return '도감에 등록한 종 중 Lv.'+TARGET_LEVEL+'에서 가능한 진화 단계로 선택해 주세요.';
  return null;
}
module.exports={TARGET_LEVEL,MAX_COMPANIONS,minimumEvolutionLevel,preview,validate};
