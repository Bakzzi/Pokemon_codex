'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {size,fit,resized,attach}=require('../window-placement.cjs');
const area={x:0,y:0,width:1920,height:1040};
test('all four edges and corners attract nearby drops while the middle and positions beyond 20px stay free',()=>{
  const dimensions=size(true),right=area.width-dimensions.width,bottom=area.height-dimensions.height;
  for(const [x,y,wantX,wantY] of [[7,300,0,300],[right-7,300,right,300],[500,7,500,0],[500,bottom-7,500,bottom],[7,7,0,0],[right-7,bottom-7,right,bottom],[21,21,21,21],[500,300,500,300]])assert.deepEqual(fit({x,y,...dimensions},area,true),{x:wantX,y:wantY,...dimensions});
});
test('negative monitor origins and taskbar work areas keep every edge in the selected display',()=>{
  const second={x:-1600,y:-200,width:1600,height:860},bounds={x:-1592,y:-191,...size(false)};
  assert.deepEqual(fit(bounds,second,true),{...bounds,x:-1600,y:-200});
  assert.deepEqual(fit({...bounds,x:100,y:900},second,true),{...bounds,x:-370,y:179});
});
test('changing modes keeps a docked bottom corner anchored and only clamps a free window if needed',()=>{
  const compact={...size(true),x:1550,y:769},expanded=resized(compact,false,area);
  assert.deepEqual(expanded,{...size(false),x:1550,y:559});assert.deepEqual(resized(expanded,true,area),compact);
  assert.deepEqual(resized({...compact,x:500,y:200},false,area),{...size(false),x:500,y:200});
});
test('native manual-move events snap, allow leaving an edge, choose the destination monitor and ignore close-time moves',()=>{
  class Window extends EventEmitter{constructor(){super();this.bounds={x:500,y:300,...size(true)};}getBounds(){return {...this.bounds};}isDestroyed(){return false;}setBounds(b){this.bounds={...b};this.emit('move');}}
  const win=new Window(),positions=[],screen={getDisplayMatching:b=>({workArea:b.x<0?{x:-1600,y:0,width:1600,height:900}:area})},control=attach(win,screen,(x,y)=>positions.push([x,y]));
  function drag(bounds){let stopped=false;win.emit('will-move',{preventDefault(){stopped=true;}},bounds);if(!stopped)win.setBounds(bounds);win.emit('moved');return stopped;}
  assert.equal(drag({...win.bounds,x:8}),true);assert.equal(win.bounds.x,0);assert.deepEqual(positions.at(-1),[0,300]);
  assert.equal(drag({...win.bounds,x:100}),false);assert.equal(win.bounds.x,100);
  assert.equal(drag({...win.bounds,x:-1592}),true);assert.equal(win.bounds.x,-1600);
  control.resize(false);assert.equal(win.bounds.height,481);win.emit('close');const last=positions.at(-1);win.bounds.x=0;win.emit('move');win.emit('moved');assert.deepEqual(positions.at(-1),last);
});
