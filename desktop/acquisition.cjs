'use strict';
const {data,species,wildDistribution,wildEligible,wildMinimum}=require('./pokemon.cjs');
const nursery=require('./daycare.cjs');
const starters=new Set([1,4,7,25]),parents=new Map(),breedingCache=new Map();
for(const p of data.pokemon)for(const rule of p.evolutions){
  if(!parents.has(rule.to))parents.set(rule.to,[]);
  parents.get(rule.to).push({from:p.id,...rule});
}
const percent=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:5})+'%';
function breedingRoutes(generation){
  if(breedingCache.has(generation))return breedingCache.get(generation);
  const routes=new Map();
  for(const p of data.pokemon.filter(p=>p.generation<=generation)){
    // Use the same nursery rules as real eggs, including babies, Nidoran and generation gates.
    const preview=nursery.predict({maxGeneration:()=>generation,data:{owned:{1:{id:p.id,gender:'female'},2:{id:132,gender:'none'}}}},[1,2]);
    for(const child of preview.offspring){
      if(!routes.has(child.id))routes.set(child.id,[]);
      routes.get(child.id).push({from:p.id,chance:child.chance});
    }
  }
  breedingCache.set(generation,routes);return routes;
}
function collectionHints(game){
  const generation=game.maxGeneration(),activeLevel=game.data.owned[game.data.activeId].level;
  const distribution=wildDistribution(generation,activeLevel,game.wildOptions()),chances=new Map(distribution.pokemon.map(p=>[p.id,p.chance]));
  const eggs=breedingRoutes(generation),owned=new Set(Object.values(game.data.owned).map(p=>p.id));
  const ref=id=>'No.'+id+' '+(game.data.seen[id]?species.get(id).name:'???');
  const result=new Map();
  for(const p of data.pokemon.filter(p=>p.generation<=generation)){
    const routes=[],wildAllowed=wildEligible(p,generation,100),minimum=wildMinimum(p),chance=chances.get(p.id)||0;
    if(wildAllowed){
      let text=activeLevel<minimum?'현재 0% · 출전 동료 Lv.'+minimum+'부터 야생에서 출현 가능':'현재 '+percent(chance)+' 확률로 야생에서 출현';
      const bonus=[];
      const badge={145:6,144:7,146:8}[p.id];
      if(badge)bonus.push(badge+'번째 뱃지');
      if([144,145,146,150].includes(p.id))bonus.push('챔피언 달성');
      if(bonus.length)text+=' · 미등록 상태에서는 '+bonus.join('·')+'으로 추가 출현 보너스';
      if(p.id===151)text+=' · No.1~150을 모두 등록하면 추가 출현 보너스';
      routes.push({kind:'wild',text,chance,minimumLevel:minimum});
    }
    if(starters.has(p.id))routes.push({kind:'starter',text:'매 시즌 시작할 때 Lv.5 동료로 지급'});
    if(p.id===143)routes.push({kind:'event',text:'도전하기에서 포켓몬피리로 길을 막은 상대를 깨워 도전 · '+(game.data.trainingDevice.fluteObtainedAt?'피리 보유 중':'피리 입수 방법은 비밀')});
    for(const rule of parents.get(p.id)||[]){
      if(species.get(rule.from).generation>generation)continue;
      const conditions=[];
      if(rule.level)conditions.push('Lv.'+rule.level);
      if(rule.item)conditions.push((data.items.find(i=>i.id===rule.item)?.name||'진화 도구')+' 1개');
      if(rule.happiness)conditions.push('친밀도 '+rule.happiness+' 이상');
      if(rule.time)conditions.push(rule.time==='day'?'한국시간 04~18시':'한국시간 18~04시');
      if(rule.relativeStats!==null)conditions.push(rule.relativeStats>0?'공격 > 방어':rule.relativeStats<0?'공격 < 방어':'공격 = 방어');
      if(rule.trigger===2)conditions.push('이 모습에서 학습장치 경험치로 한 레벨 상승');
      const automatic=rule.trigger===1&&rule.level>0||rule.trigger===2;
      const text=ref(rule.from)+' · '+conditions.join(' + ')+' → '+(automatic?'배틀·결과 연출 후 자동진화':'도감에서 진화 선택·예약');
      routes.push({kind:'evolution',from:rule.from,text,...(rule.item?{note:'진화 도구는 야생 배틀 승리·포획 후 발견할 수 있어요.'}:{})});
    }
    const family=[...(eggs.get(p.id)||[])].sort((a,b)=>Number(owned.has(b.from))-Number(owned.has(a.from))||Number(!!game.data.seen[b.from])-Number(!!game.data.seen[a.from])||a.from-b.from);
    if(family.length){
      const parent=family[0];
      routes.push({kind:'hatch',from:parent.from,text:ref(parent.from)+' 계열의 번식 가능한 동료와 메타몽을 포켓기어의 키우미집에 맡겨 부화'+(parent.chance<1?' · 알에서 '+percent(parent.chance):'')+' · 부모 동료를 먼저 마련해야 해요.'});
    }
    const labels={wild:activeLevel<minimum?'Lv.'+minimum+'부터 야생':'야생',starter:'스타팅',event:'피리 이벤트',evolution:'진화',hatch:'부화'};
    result.set(p.id,{wildAllowed,routes,summary:[...new Set(routes.map(r=>labels[r.kind]))].join(' · '),note:wildAllowed?'야생 확률은 현재 출전 동료와 진행 상태에서 다음 야생 1회에 만날 확률이에요. 포획 성공률과는 달라요.':'일반 야생에서는 출현하지 않아요.'});
  }
  return result;
}
module.exports={collectionHints};
