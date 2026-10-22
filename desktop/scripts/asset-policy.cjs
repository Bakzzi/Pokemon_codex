'use strict';
// Retain historical source assets, but do not ship obsolete illustration files.
const path=require('node:path');
const oldPortraits=new Set(['blaine','brock','erika','giovanni','james','jessie','koga','misty','rocket-grunts','sabrina','surge']);
function include(file,root){
 const name=path.relative(root,file).split(path.sep).join('/');
 if(/^trainers\/portraits\/.*\.png$/i.test(name))return false;
 if(name==='logos/team-rocket.png')return false;
 const face=name.match(/^trainers\/([^/]+)\.png$/i);if(face&&oldPortraits.has(face[1]))return false;
 if(/^badges\/.*\.png$/i.test(name)&&!/^badges\/(?:kanto|johto)-pixel\.png$/.test(name))return false;
 return true;
}
module.exports={include};
