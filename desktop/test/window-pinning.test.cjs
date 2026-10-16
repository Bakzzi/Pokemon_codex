'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {attach}=require('../window-pinning.cjs');
function fixture(pinned=true,platform='win32'){
  class Window extends EventEmitter{
    native=false;cached=false;visible=true;minimized=false;destroyed=false;calls=[];
    isDestroyed(){return this.destroyed;}isVisible(){return this.visible;}isMinimized(){return this.minimized;}
    setAlwaysOnTop(value,level){
      this.calls.push([value,level]);
      if(value!==this.native){this.cached=value;this.native=value;this.emit('always-on-top-changed',{},value);}
    }
    focus(){assert.fail('Pin repairs must never take keyboard focus');}
    show(){assert.fail('Pin repairs must never reveal a hidden window');}
  }
  const win=new Window(),powerMonitor=new EventEmitter(),screen=new EventEmitter(),tasks=new Map(),errors=[];let serial=0;
  const control=attach(win,{pinned,platform,powerMonitor,screen,setTimeout(fn){tasks.set(++serial,fn);return serial;},clearTimeout(id){tasks.delete(id);},onError:error=>errors.push(error.message)});
  function flush(){const pending=[...tasks.values()];tasks.clear();for(const fn of pending)fn();}
  win.calls=[];return {win,powerMonitor,screen,control,tasks,flush,errors};
}
test('Windows blur restores a native demotion while the saved pin preference remains on',()=>{
  const f=fixture();assert.equal(f.win.native,true);f.win.native=false;assert.equal(f.win.cached,true);
  f.win.emit('blur');f.flush();assert.equal(f.win.native,true);assert.deepEqual(f.win.calls,[[true,'pop-up-menu']]);assert.equal(f.tasks.size,0);
});
test('explicit unpin cancels pending repairs and remains off across lifecycle events',()=>{
  const f=fixture();f.win.emit('blur');f.control.setPinned(false);f.flush();
  for(const event of ['blur','show','restore','always-on-top-changed'])f.win.emit(event);
  f.powerMonitor.emit('resume');f.screen.emit('display-metrics-changed');f.flush();assert.equal(f.win.native,false);assert.deepEqual(f.win.calls,[[false,'pop-up-menu']]);
  const savedOff=fixture(false);savedOff.win.emit('show');savedOff.flush();assert.equal(savedOff.win.native,false);assert.equal(savedOff.win.calls.length,0);
});
test('hidden or minimized widgets stay hidden until restored and then recover',()=>{
  const f=fixture();f.win.visible=false;f.win.emit('blur');f.flush();assert.equal(f.win.calls.length,0);
  f.win.visible=true;f.win.minimized=true;f.powerMonitor.emit('unlock-screen');f.flush();assert.equal(f.win.calls.length,0);
  f.win.minimized=false;f.win.native=false;f.win.emit('restore');f.flush();assert.equal(f.win.native,true);
});
test('show, resume and display events coalesce without recurring polling or repair loops',()=>{
  const f=fixture();f.win.native=false;f.win.emit('show');f.powerMonitor.emit('resume');f.powerMonitor.emit('unlock-screen');
  for(const event of ['display-added','display-removed','display-metrics-changed'])f.screen.emit(event);
  assert.equal(f.tasks.size,1);f.flush();assert.equal(f.win.native,true);assert.equal(f.win.calls.length,1);assert.equal(f.tasks.size,0);
});
test('closing removes all listeners and delayed work; transient native errors do not stop the app',()=>{
  const f=fixture();const setter=f.win.setAlwaysOnTop;f.win.setAlwaysOnTop=()=>{throw Error('transient');};f.win.emit('blur');f.flush();assert.deepEqual(f.errors,['transient']);
  f.win.setAlwaysOnTop=setter;f.win.emit('blur');f.flush();assert.equal(f.win.native,true);
  f.win.emit('blur');f.win.emit('closed');assert.equal(f.tasks.size,0);assert.equal(f.powerMonitor.eventNames().length,0);assert.equal(f.screen.eventNames().length,0);assert.equal(f.win.eventNames().length,0);f.control.dispose();
});
test('non-Windows platforms keep their floating level without a needless unpin transition',()=>{
  const f=fixture(true,'darwin');f.win.emit('blur');f.flush();assert.deepEqual(f.win.calls,[[true,'floating']]);
});
