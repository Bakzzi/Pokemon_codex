'use strict';
const categories={encounter:'발견',catch:'포획',level:'레벨 상승',evolution:'진화',egg:'알 발견',hatch:'부화',badge:'관장·리그 승리',item:'도구 발견',loss:'패배',unlock:'지방 해금'};
function init(data,now){
  if(data.adventure)return;
  data.adventure={startedAt:data.journal[0]?.at||now,totals:{wins:data.battles||0,xp:0},checkpoint:{at:null,totals:{}}};
  for(const entry of data.journal)if(categories[entry.kind])increment(data,entry.kind);
  data.battleJournal=[];
}
function increment(data,key,amount=1){data.adventure.totals[key]=(data.adventure.totals[key]||0)+amount;}
function record(data,entry){
  if(entry.kind==='battle'){data.battleJournal=[...(data.battleJournal||[]),entry].slice(-300);return;}
  data.journal.push(entry);data.journal=data.journal.slice(-300);
  if(categories[entry.kind])increment(data,entry.kind);
}
function acknowledge(data,now){data.adventure.checkpoint={at:now,totals:{...data.adventure.totals}};}
function summary(data){
  const a=data.adventure,counts=Object.fromEntries(Object.keys({...a.totals,...a.checkpoint.totals}).map(k=>[k,Math.max(0,(a.totals[k]||0)-(a.checkpoint.totals[k]||0))]));
  return {since:a.checkpoint.at||a.startedAt,first:!a.checkpoint.at,counts,highlights:data.journal.filter(e=>(!a.checkpoint.at||e.at>a.checkpoint.at)&&['catch','level','evolution','egg','hatch','badge','champion','unlock'].includes(e.kind)).slice(-20).reverse()};
}
module.exports={init,increment,record,acknowledge,summary};
