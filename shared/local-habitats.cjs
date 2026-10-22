'use strict';
// Give each connected habitat an equal share before combining duplicate species.
function merge(pools){
 const result=new Map();
 for(const pool of pools.filter(p=>p?.length)){const total=pool.reduce((n,p)=>n+(p.weight||1),0);for(const p of pool)result.set(p.id,(result.get(p.id)||0)+(p.weight||1)/total);}
 return [...result].map(([id,weight])=>({id,weight})).sort((a,b)=>a.id-b.id);
}
module.exports={merge};
