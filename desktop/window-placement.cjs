'use strict';
const WIDTH=370,TOP_INSET=25,SNAP_DISTANCE=20;
const size=compact=>({width:WIDTH,height:TOP_INSET+(compact?256:466)});
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
  let placing=false,closing=false,dragging=false;
  function record(){if(!closing&&!win.isDestroyed()){const {x,y}=win.getBounds();remember(x,y);}}
  function place(bounds){
    if(closing||win.isDestroyed())return;
    placing=true;
    try{win.setBounds(bounds);record();}finally{placing=false;}
  }
  function dropped(){
    if(!dragging||placing||closing||win.isDestroyed())return;
    dragging=false;
    const bounds=win.getBounds(),next=fit(bounds,screen.getDisplayMatching(bounds).workArea,true);
    if(next.x!==bounds.x||next.y!==bounds.y)place(next);else record();
  }
  win.on('will-move',()=>{if(!placing&&!closing)dragging=true;});
  // Windows sends this only after the native drag loop ends, so even a 1px
  // movement away from an edge stays free while the mouse is held down.
  if(process.platform==='win32'&&typeof win.hookWindowMessage==='function')win.hookWindowMessage(0x0232,dropped);
  else win.on('moved',dropped);
  win.on('move',record);
  win.on('moved',record);
  win.on('close',()=>{dragging=false;record();closing=true;});
  return {place,resize(compact){const bounds=win.getBounds();place(resized(bounds,compact,screen.getDisplayMatching(bounds).workArea));}};
}
module.exports={WIDTH,TOP_INSET,SNAP_DISTANCE,size,fit,resized,attach};
