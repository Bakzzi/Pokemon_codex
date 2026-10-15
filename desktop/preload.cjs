'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('buddy',{
  onState:fn=>{ipcRenderer.on('state',(_event,state)=>fn(state));ipcRenderer.send('ready');},
  onTab:fn=>ipcRenderer.on('tab',(_event,tab)=>fn(tab)),
  onKeyFile:fn=>ipcRenderer.on('key-file',(_event,file)=>fn(file)),
  action:(action,value)=>ipcRenderer.send('action',{action,value})
});
