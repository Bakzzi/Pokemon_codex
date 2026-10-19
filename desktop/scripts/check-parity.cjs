'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const name of ['adventure','rivals','rescue','silph','safari','mansion'])assert.equal(require('../../mobile/'+name+'.cjs'),require('../../shared/'+name+'.cjs'),'Forked shared module: '+name);
const shared=require('../../shared/adventure.cjs').Adventure,desktop=require('../adventure.cjs').Adventure;
assert.ok(desktop.prototype instanceof shared,'Desktop must use shared adventure');
assert.ok(read('desktop/main.cjs').includes("require('./adventure.cjs')"),'Desktop runtime must start the shared adventure');
for(const name of ['panel-layout.js','rival-panel.js','rescue-panel.js','exploration-panel.js','league-portraits.js','johto-art.js','johto-panel.js']){
  assert.equal(fs.existsSync(path.join(root,'mobile/web',name)),false,'Duplicated UI: '+name);
  assert.equal(read('desktop/panels.html').split('src="'+name+'"').length,2,'Missing or duplicate PC script: '+name);
  assert.ok(read('mobile/scripts/build-web.cjs').includes("'"+name+"'"),'Android must bundle shared UI: '+name);
}
assert.ok(read('desktop/scripts/package.cjs').includes("path.join(root,'shared')"),'PC package must include shared game');
assert.ok(read('mobile/android/app/build.gradle').includes("fileTree('../../../shared')"),'Android cache must track shared changes');
for(const name of ['battle','portraits'])assert.ok(fs.existsSync(path.join(root,'desktop/assets/trainers',name,'NOTICE.txt')),'Artwork attribution missing');
console.log('Shared PC/Android game, UI, artwork and build inputs verified.');
