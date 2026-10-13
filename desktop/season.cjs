'use strict';
// Adapted from momozzing/Digimon_mod hooks/season.ts (MIT, copyright 2026 momozzing).
// This port awards XP from observed Codex output tokens; it never estimates account usage.
const HOUR_MS=3600000, KST=9*HOUR_MS, MAX_XP=200, TOKENS_PER_XP=5000;
const monthOf=t=>{
  const d=new Date(t+KST), y=d.getUTCFullYear(), m=d.getUTCMonth();
  return {key:`${y}-${String(m+1).padStart(2,'0')}`,start:Date.UTC(y,m,1)-KST,end:Date.UTC(y,m+1,1)-KST};
};
const levelOf=x=>Math.min(100,1+Math.floor(Math.max(0,x)/2));
const tierOf=level=>level>=100?10:Math.floor(level/10);
const tierStart=t=>t<=0?0:(10*t-1)*2;
const foeHp=x=>{const t=tierOf(levelOf(x)); return t>=10?1:Math.max(0,1-(x-tierStart(t))/(tierStart(t+1)-tierStart(t)));};
module.exports={monthOf,levelOf,tierOf,foeHp,MAX_XP,TOKENS_PER_XP};
