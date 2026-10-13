'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('buddy',{
  onState:fn=>{ipcRenderer.on('state',(_event,state)=>fn(state));ipcRenderer.send('ready');},
  onTab:fn=>ipcRenderer.on('tab',(_event,tab)=>fn(tab)),
  action:(action,value)=>ipcRenderer.send('action',{action,value})
});
