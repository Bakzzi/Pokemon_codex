'use strict';
// Per-individual friendship. Existing saves keep their bond; no elapsed-time decay.
const max=255,initial=70;
const value=p=>Number.isFinite(p?.happiness)?Math.max(0,Math.min(max,Math.floor(p.happiness))):initial;
function init(p){p.happiness=value(p);}
function change(p,amount){const before=value(p);p.happiness=Math.max(0,Math.min(max,before+amount));return p.happiness-before;}
function levelUp(p,count=1){
 let gained=0;
 for(let i=0;i<count;i++){const n=value(p);gained+=change(p,n<100?5:n<200?3:2);}
 return gained;
}
function faint(p){return change(p,-1);}
function companions(game){
 return [...new Set(game.data.slots)].filter(uid=>{
  const p=game.data.owned[uid],mon=game.data.battle?.party[uid]||game.data.suspendedWild?.party[uid];
  return p&&!game.isBoarded(uid)&&(!mon||mon.hp>0);
 });
}
function startTravel(game,walk){
 const cells=Math.max(0,(walk?.path?.length||0)-1);
 if(cells)walk.friendship={uids:companions(game),cells};
}
function finishTravel(game,state,now){
 const walk=state.walk,bond=walk?.friendship;
 if(!bond||now<walk.at+walk.duration)return false;
 delete walk.friendship;
 if(!Number.isInteger(bond.cells)||bond.cells<1||bond.cells>256||!Array.isArray(bond.uids))return false;
 const eligible=new Set(companions(game));
 for(const uid of new Set(bond.uids))if(eligible.has(uid))change(game.data.owned[uid],bond.cells);
 return true;
}
function snapshot(p){
 const n=value(p),stage=n<50?0:n<100?1:n<150?2:n<200?3:n<255?4:5;
 const labels=['아직 낯설어해요.','조금씩 익숙해지고 있어요.','함께하는 모험이 즐거워 보여요.','당신을 많이 믿고 있어요.','당신을 무척 좋아해요.','둘도 없는 단짝이에요.'];
 const reactions=['조심스럽게 당신을 바라봐요.','당신을 가만히 바라봐요.','반가운 듯 몸을 들썩여요.','당신을 보고 기쁘게 뛰어요.','당신 곁에서 행복해해요.','당신에게 한껏 애정을 표현해요.'];
 return {value:n,max,stage,label:labels[stage],text:reactions[stage],reaction:stage<2?'watch':stage<4?'hop':'heart'};
}
module.exports={max,initial,value,init,change,levelUp,faint,startTravel,finishTravel,snapshot};
