'use strict';
const {species}=require('./pokemon.cjs');
const TARGET_LEVEL=15,MAX_COMPANIONS=10;
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
function preview(owned){
  return {targetLevel:TARGET_LEVEL,maxCompanions:MAX_COMPANIONS,candidates:Object.values(owned).map(p=>{
    const minimumLevel=minimumEvolutionLevel(p.id),eligible=species.get(p.id)?.generation===1&&minimumLevel<=TARGET_LEVEL;
    return {uid:p.uid,id:p.id,name:species.get(p.id)?.name,level:p.level,minimumLevel,eligible,reason:eligible?'Lv.15로 함께 출발':Number.isFinite(minimumLevel)?'Lv.'+minimumLevel+'부터 가능한 진화 단계':'이번 이동에서 선택할 수 없는 동료'};
  })};
}
function validate(owned,uids){
  if(!Array.isArray(uids)||uids.length<1||uids.length>MAX_COMPANIONS||uids.some(uid=>!Number.isSafeInteger(uid))||new Set(uids).size!==uids.length)return '함께 갈 동료를 1~10마리 선택해 주세요.';
  const candidates=new Map(preview(owned).candidates.map(p=>[p.uid,p]));
  if(uids.some(uid=>!candidates.get(uid)?.eligible))return '선택한 동료가 바뀌었어요. Lv.15에서 가능한 진화 단계로 다시 선택해 주세요.';
  return null;
}
module.exports={TARGET_LEVEL,MAX_COMPANIONS,minimumEvolutionLevel,preview,validate};
