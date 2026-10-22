(function(root){
 'use strict';
 const key=p=>p.x+','+p.y;
 function route(map,from,to){
  const cells=new Map(map.roads.map(p=>[key(p),p])),start=key(from),end=key(to);if(!cells.has(start)||!cells.has(end))return null;
  const queue=[start],parents=new Map([[start,null]]);let found=false;
  for(let i=0;i<queue.length;i++){const id=queue[i];if(id===end){found=true;break;}const p=cells.get(id);for(const [dx,dy] of [[0,-8],[8,0],[0,8],[-8,0]]){const next=(p.x+dx)+','+(p.y+dy);if(cells.has(next)&&!parents.has(next)){parents.set(next,id);queue.push(next);}}}
  if(!found)return null;const result=[];for(let id=end;id!==null;id=parents.get(id)){const p=cells.get(id);result.push({x:p.x,y:p.y});}return result.reverse();
 }
 function duration(path){return Math.max(180,Math.min(6000,(path.length-1)*140));}
 function frame(walk,now){
  const progress=Math.max(0,Math.min(1,(now-walk.at)/walk.duration)),last=walk.path.length-1,step=Math.min(Math.floor(progress*last),Math.max(0,last-1)),a=walk.path[step],b=walk.path[Math.min(last,step+1)],mix=progress===1?1:progress*last-step;
  const direction=b.x>a.x?'right':b.x<a.x?'left':b.y<a.y?'up':'down',walking=progress<1&&last>0;
  const phase=Math.floor(Math.max(0,now-walk.at)/120)%2,frames={down:[0,3,4],up:[1,5,6],left:[2,7,8],right:[2,7,8]};
  return {x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix,direction,walking,progress,sprite:walking?frames[direction][1+phase]:frames[direction][0]};
 }
 const api={route,duration,frame};if(typeof module==='object'&&module.exports)module.exports=api;else root.MapWalk=api;
})(typeof globalThis==='object'?globalThis:this);
