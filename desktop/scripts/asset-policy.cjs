'use strict';
// Retain historical source assets, but do not ship obsolete illustration files.
const path=require('node:path');
const oldPortraits=new Set(['blaine','brock','erika','giovanni','james','jessie','koga','misty','rocket-grunts','sabrina','surge']);
// Explicit user exception: badges retain their original illustrated artwork.
const badges=new Set(['brock','misty','surge','erika','koga','sabrina','blaine','giovanni','j-falkner','j-bugsy','j-whitney','j-morty','j-chuck','j-jasmine','j-pryce','j-clair']);
function include(file,root){
 const name=path.relative(root,file).split(path.sep).join('/');
 if(/^trainers\/portraits\/.*\.png$/i.test(name))return false;
 if(name==='logos/team-rocket.png')return false;
 const face=name.match(/^trainers\/([^/]+)\.png$/i);if(face&&oldPortraits.has(face[1]))return false;
 const badge=name.match(/^badges\/([^/]+)\.png$/i);if(badge&&!badges.has(badge[1]))return false;
 return true;
}
module.exports={include};
