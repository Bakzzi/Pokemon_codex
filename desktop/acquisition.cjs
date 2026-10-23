'use strict';
const {data,species,wildDistribution,wildEligible,wildMinimum}=require('./pokemon.cjs');
const nursery=require('./daycare.cjs');
const world=require('../shared/kanto-world.cjs');
const aquatic=require('../shared/local-habitats.cjs'),habitatData=require('../shared/kanto-habitats.json');
const parents=new Map(),breedingCache=new Map();
for(const p of data.pokemon)for(const rule of p.evolutions){
  if(!parents.has(rule.to))parents.set(rule.to,[]);
  parents.get(rule.to).push({from:p.id,...rule});
}
const percent=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:5})+'%';
const wildPercent=n=>n>0&&n<.0001?'0.01% 미만':(n*100).toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
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
  const options=game.wildOptions(),distribution=wildDistribution(generation,activeLevel,options),chances=new Map(distribution.pokemon.map(p=>[p.id,p.chance]));
  const eggs=breedingRoutes(generation),owned=new Set(Object.values(game.data.owned).map(p=>p.id));
  const ref=id=>'No.'+id+' '+(game.data.seen[id]?species.get(id).name:'???');
  const result=new Map();
  for(const p of data.pokemon.filter(p=>p.generation<=generation)){
    const routes=[],wildAllowed=wildEligible(p,generation,100),minimum=wildMinimum(p),chance=chances.get(p.id)||0;
    if(wildAllowed){
      const local=!!options.habitat,locations=local?world.locationsFor(p.id):[];
      const text=local&&chance===0&&locations.length?'서식지 · '+[...new Set(locations.map(p=>p.name))].slice(0,4).join(' · ')+(locations.length>4?' 외':'')+'.':options.maximumLevel<minimum?'야생 레벨 상한 Lv.'+minimum+' 이상에서 출현.':activeLevel<minimum?'출전 동료 Lv.'+minimum+'부터 야생에서 출현.':'현재 '+wildPercent(chance)+' 확률로 야생에서 출현.';
      const bonus=[];
      const badge={145:6,144:7,146:8}[p.id];
      if(badge)bonus.push(badge+'번째 뱃지 획득');
      if([144,145,146,150].includes(p.id))bonus.push('챔피언 달성');
      let note=bonus.length?(game.data.caught[p.id]?'포획을 마쳐 추가 출현 보너스가 종료됐어요.':bonus.join(' 또는 ')+' 시 포획에 성공할 때까지 출현 확률이 올라요.'):'';
      if(p.id===151)note='No.1~150을 모두 등록하면 출현 확률이 올라요.';
      if(!aquatic.waterAccess(game)&&aquatic.waterOnly(habitatData,p.id))note=[aquatic.waterHint,note].filter(Boolean).join(' ');
      if(local&&chance===0&&minimum>options.maximumLevel)note=[note,'출현하려면 서식지의 야생 레벨 상한이 Lv.'+minimum+' 이상이어야 해요.'].filter(Boolean).join(' ');
      else if(local&&chance===0&&activeLevel<minimum)note=[note,'출전 동료 Lv.'+minimum+'부터 만날 수 있어요.'].filter(Boolean).join(' ');
      routes.push({kind:'wild',text,chance,minimumLevel:minimum,...(note?{note}:{})});
    }
    if(p.id===25)routes.push({kind:'starter',text:'매 시즌 시작할 때 Lv.5 동료로 지급'});
    if([1,4,7].includes(p.id))routes.push({kind:'event',text:game.data.starterGifts[p.id]?'이번 시즌 모험에서 동료로 받은 포켓몬이에요.':'모험 중 특별한 만남으로 동료가 될 수 있어요.'});
    if(p.id===143)routes.push({kind:'event',text:game.data.trainingDevice.fluteObtainedAt?'타운맵에서 포켓몬피리로 길을 막은 상대를 깨워 도전 · 피리 보유 중':'연분홍시티로 향하는 길목에 깊이 잠든 포켓몬 · 깨울 방법을 찾아야 해요.'});
    for(const rule of parents.get(p.id)||[]){
      if(species.get(rule.from).generation>generation)continue;
      const conditions=[];
      if(rule.level)conditions.push('Lv.'+rule.level);
      if(rule.item)conditions.push((data.items.find(i=>i.id===rule.item)?.name||'진화 도구')+' 1개');
      if(rule.happiness)conditions.push('친밀도 '+rule.happiness+' 이상');
      if(rule.time)conditions.push(rule.time==='day'?'한국시간 04~18시':'한국시간 18~04시');
      if(rule.relativeStats!==null)conditions.push(rule.relativeStats>0?'공격 > 방어':rule.relativeStats<0?'공격 < 방어':'공격 = 방어');
      if(rule.trigger===2)conditions.push('학습장치로 1레벨 상승');
      const ending=rule.trigger===2?' 시 자동진화':rule.trigger===1&&rule.level>0?' 레벨업 시 자동진화':rule.item?' 사용 시 진화':'';
      const text=ref(rule.from)+' · '+conditions.join(' + ')+ending;
      routes.push({kind:'evolution',special:rule.trigger===2||!!rule.item,from:rule.from,text,...(rule.item?{note:'진화 도구는 야생 배틀 승리·포획 후 발견할 수 있어요.'}:{})});
    }
    // Acquiring a missing species must not require already owning that same species.
    const family=[...(eggs.get(p.id)||[])].filter(parent=>parent.from!==p.id).sort((a,b)=>Number(owned.has(b.from))-Number(owned.has(a.from))||Number(!!game.data.seen[b.from])-Number(!!game.data.seen[a.from])||a.from-b.from);
    if(family.length){
      const parent=family[0];
      routes.push({kind:'hatch',from:parent.from,text:'부모 '+ref(parent.from)+' + 메타몽을 키우미집에 맡김 → 부화 결과 '+ref(p.id)+(parent.chance<1?' · 알에서 '+percent(parent.chance):'')+' · 부모 동료를 먼저 마련해야 해요.'});
    }
    const labels={wild:activeLevel<minimum?'Lv.'+minimum+'부터 야생':'야생',starter:'스타팅',event:'이벤트',evolution:'진화',hatch:'부화'};
    const evolutionOnly=routes.length>0&&routes.every(r=>r.kind==='evolution');
    result.set(p.id,{wildAllowed,routes,summary:[...new Set(routes.map(r=>r.kind==='evolution'&&r.special?'특수진화':labels[r.kind]))].join(' · '),note:wildAllowed?'야생 확률은 플레이 중 야생 1회에 만날 확률이에요. 포획 성공률과는 달라요.':evolutionOnly?'진화로만 얻을 수 있어요.':'일반 야생에서는 출현하지 않아요.'});
  }
  return result;
}
module.exports={collectionHints};
