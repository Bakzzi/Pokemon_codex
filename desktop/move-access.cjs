'use strict';
const {species,moves}=require('./pokemon.cjs');
function merge(entries){
  const levels=new Map();
  for(const entry of entries)if(moves.has(entry?.move)&&Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=100)levels.set(entry.move,Math.min(levels.get(entry.move)??100,entry.level));
  return [...levels].map(([move,level])=>({move,level})).sort((a,b)=>a.level-b.level||a.move-b.move);
}
function legacyLevel(id,move){
  const original=species.get(id),levels=[];let p=original;
  while(p&&p.generation<=original.generation){for(const entry of p.learn)if(entry.move===move)levels.push(entry.level);p=species.get(p.preEvolution);}
  // Preserve non-level techniques in older saves; they have no level gate.
  return levels.length?Math.min(...levels):1;
}
function catalog(p){return merge([...species.get(p.id).learn,...(Array.isArray(p.moveMemory)?p.moveMemory:[])]);}
function update(p){
  const legacy=!Array.isArray(p.moveMemory),memory=merge(legacy?[]:p.moveMemory),remembered=new Set(memory.map(entry=>entry.move)),own=new Map(merge(species.get(p.id).learn).map(entry=>[entry.move,entry.level]));
  p.moveMemory=merge([...memory,...(p.moves||[]).filter(id=>moves.has(id)&&!remembered.has(id)).map(move=>({move,level:legacy?legacyLevel(p.id,move):own.get(move)??legacyLevel(p.id,move)}))]);
  const all=catalog(p),active=all.filter(entry=>entry.level<=p.level);
  p.moveMemory=merge([...p.moveMemory,...active]);p.moves=active.map(entry=>entry.move);
  return all;
}
module.exports={catalog,update};
