'use strict';
const os=require('node:os');
const path=require('node:path');
const fs=require('node:fs');
const {Game}=require('../game.cjs');
const {CodexReader}=require('../codex-reader.cjs');
async function main(){
  const game=new Game(),reader=new CodexReader(path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions'),game);
  await reader.poll();const first=game.snapshot();
  console.log(JSON.stringify({connected:reader.status.connected,observedFiles:reader.status.files,phase:first.phase,limits:first.limits,baselineXp:first.xp}));
  for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,2000));await reader.poll();}
  const last=game.snapshot();
  const evidence={checkedAt:new Date().toISOString(),source:reader.status,initialPhase:first.phase,finalPhase:last.phase,observedOutputDelta:last.outputTokens,observedTotalDelta:last.totalTokens,limits:last.limits};
  const dir=path.join(__dirname,'..','.smoke');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'live.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
  if(!reader.status.connected)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
