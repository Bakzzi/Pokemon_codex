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
  assert.deepEqual(fit({...bounds,x:100,y:900},second,true),{...bounds,x:-370,y:169});
});
test('changing modes keeps a docked bottom corner anchored and only clamps a free window if needed',()=>{
  const compact={...size(true),x:1550,y:759},expanded=resized(compact,false,area);
  assert.deepEqual(expanded,{...size(false),x:1550,y:549});assert.deepEqual(resized(expanded,true,area),compact);
  assert.deepEqual(resized({...compact,x:500,y:200},false,area),{...size(false),x:500,y:200});
});
test('dragging away stays free at every pixel and only the final drop snaps on the destination monitor',()=>{
  class Window extends EventEmitter{constructor(){super();this.bounds={x:0,y:300,...size(true)};this.hooks=new Map();}getBounds(){return {...this.bounds};}isDestroyed(){return false;}setBounds(b){this.bounds={...b};this.emit('move');}hookWindowMessage(id,fn){this.hooks.set(id,fn);}}
  const win=new Window(),positions=[],screen={getDisplayMatching:b=>({workArea:b.x<0?{x:-1600,y:0,width:1600,height:900}:area})},control=attach(win,screen,(x,y)=>positions.push([x,y]));
  function drag(bounds){win.emit('will-move',{preventDefault(){assert.fail('A drag must never be blocked');}},bounds);win.setBounds(bounds);}
  function drop(){if(process.platform==='win32')win.hooks.get(0x0232)();else win.emit('moved');}
  for(let x=1;x<=30;x++){drag({...win.bounds,x});assert.equal(win.bounds.x,x);assert.deepEqual(positions.at(-1),[x,300]);}
  drop();assert.equal(win.bounds.x,30);
  drag({...win.bounds,x:8});assert.equal(win.bounds.x,8);drop();assert.equal(win.bounds.x,0);
  drag({...win.bounds,x:-1592});assert.equal(win.bounds.x,-1592);drop();assert.equal(win.bounds.x,-1600);
  control.resize(false);assert.equal(win.bounds.height,491);win.emit('close');const last=positions.at(-1);win.bounds.x=0;win.emit('move');win.emit('moved');assert.deepEqual(positions.at(-1),last);
});
