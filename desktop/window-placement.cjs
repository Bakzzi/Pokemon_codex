'use strict';
const WIDTH=370,TOP_INSET=15,SNAP_DISTANCE=20;
const size=compact=>({width:WIDTH,height:compact?271:481});
function fit(bounds,area,snap=false){
  const right=Math.max(area.x,area.x+area.width-bounds.width),bottom=Math.max(area.y,area.y+area.height-bounds.height);
  let x=Math.max(area.x,Math.min(bounds.x,right)),y=Math.max(area.y,Math.min(bounds.y,bottom));
  if(snap){
    if(Math.min(x-area.x,right-x)<=SNAP_DISTANCE)x=x-area.x<=right-x?area.x:right;
    if(Math.min(y-area.y,bottom-y)<=SNAP_DISTANCE)y=y-area.y<=bottom-y?area.y:bottom;
  }
  return {...bounds,x,y};
}
function resized(bounds,compact,area){
  const next={...bounds,...size(compact)};
  if(Math.abs(bounds.x+bounds.width-area.x-area.width)<=1)next.x=area.x+area.width-next.width;
  if(Math.abs(bounds.y+bounds.height-area.y-area.height)<=1)next.y=area.y+area.height-next.height;
  return fit(next,area);
}
function attach(win,screen,remember){
  let placing=false,closing=false;
  function record(){if(!closing&&!win.isDestroyed()){const {x,y}=win.getBounds();remember(x,y);}}
  function place(bounds){
    if(closing||win.isDestroyed())return;
    placing=true;
    try{win.setBounds(bounds);record();}finally{placing=false;}
  }
  win.on('will-move',(event,bounds)=>{
    if(placing||closing)return;
    const next=fit(bounds,screen.getDisplayMatching(bounds).workArea,true);
    if(next.x!==bounds.x||next.y!==bounds.y){event.preventDefault();place(next);}
  });
  win.on('move',record);
  win.on('moved',record);
  win.on('close',()=>{record();closing=true;});
  return {place,resize(compact){const bounds=win.getBounds();place(resized(bounds,compact,screen.getDisplayMatching(bounds).workArea));}};
}
module.exports={WIDTH,TOP_INSET,SNAP_DISTANCE,size,fit,resized,attach};
