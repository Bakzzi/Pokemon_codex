'use strict';
const aquatic=method=>[2,3,4,5].includes(Number(method));
function waterAccess(game){
 const d=game.data;
 const rod=!!(d.kantoStory?.items?.['fishing-rod']||d.johto?.items?.['fishing-rod']);
 const surf=d.johtoUnlocked?!!d.johto?.cleared?.['j-kimono-4']:!!d.mobileStory?.safari?.completedAt;
 return rod||surf;
}
function accessible(pool,water){
 return (pool||[]).map(p=>({...p,weight:Object.entries(p.methods).reduce((sum,[method,weight])=>sum+(water||!aquatic(method)?weight:0),0)})).filter(p=>p.weight>0);
}
const waterSpecies=new WeakMap();
function waterOnly(pools,id){
 if(!waterSpecies.has(pools)){const found=new Set(),land=new Set();for(const p of Object.values(pools).flat()){found.add(p.id);if(Object.keys(p.methods).some(m=>!aquatic(m)))land.add(p.id);}waterSpecies.set(pools,new Set([...found].filter(id=>!land.has(id))));}
 return waterSpecies.get(pools).has(id);
}
const waterHint='낚싯대가 있거나 물길이 열린 뒤 만날 수 있어요.';
// Give each connected habitat an equal share before combining duplicate species.
function merge(pools){
 const result=new Map();
 for(const pool of pools.filter(p=>p?.length)){const total=pool.reduce((n,p)=>n+(p.weight||1),0);for(const p of pool)result.set(p.id,(result.get(p.id)||0)+(p.weight||1)/total);}
 return [...result].map(([id,weight])=>({id,weight})).sort((a,b)=>a.id-b.id);
}
module.exports={merge,accessible,waterAccess,waterOnly,waterHint};
