'use strict';
const {data}=require('../desktop/pokemon.cjs'),J=require('./johto.cjs');
const training=require('../desktop/training-device.cjs'),rescue=require('./rescue.cjs'),silph=require('./silph.cjs');
function list(game){
 const g=game.data,records=[],add=(id,title,generation,team=[],at=null)=>records.push({id,title,generation,team,at});
 for(const b of data.bosses)if(b.kind==='gym'?g.badges.includes(b.id):b.kind==='elite'?g.champion||g.leagueBest>data.bosses.indexOf(b)-8:g.champion)add(b.id,(b.kind==='gym'?'체육관 · ':'포켓몬리그 · ')+b.name+'에게 승리',1,b.team);
 for(const [id,field]of [['rocket-grunt','gruntWonAt'],['rocket-duo','duoWonAt'],['rocket-giovanni','rocketWonAt'],['road-snorlax','snorlaxWonAt']])if(g.trainingDevice?.[field])add(id,training.battles[id].name+' · 해결',1,training.battles[id].team,g.trainingDevice[field]);
 for(const group of [rescue,silph])for(const e of group.encounters)if(g.mobileStory?.[group===rescue?'rescue':'silph']?.wins[e.stage])add(e.id,e.name+' · 해결',1,e.team,g.mobileStory[group===rescue?'rescue':'silph'].wins[e.stage]);
 for(const e of require('./rivals.cjs').encounters)if(['won','completed'].includes(g.mobileStory?.rivals?.[e.id]?.state)&&!g.mobileStory.rivals[e.id].migratedAt)add(e.id,'그린과의 승부',1,e.team,g.mobileStory.rivals[e.id].wonAt||null);
 for(const n of J.nodes.values())if(J.done(game,n.id)&&!['j-arrival','j-partner','j-league'].includes(n.id))add(n.id,n.type==='rival'?'실버와의 승부':n.title+' · 완료',2,n.team||[],g.johto.cleared[n.id]);
 return records;
}
function remember(game,scene,now){
 if(scene?.mode!=='dialogue'||scene.index!==scene.pages.length-1)return;
 const memories=game.data.dialogueMemories ||= [];
 if(memories.some(s=>s.id===scene.id))return;
 memories.push({id:scene.id,name:scene.name,pages:[...scene.pages],at:now,generation:game.data.johtoUnlocked?2:1});
 if(memories.length>200)memories.splice(0,memories.length-200);
}
module.exports={list,remember};
