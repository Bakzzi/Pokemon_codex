'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function releaseManifest(root,version){
  const files=[];
  function walk(directory,relative=''){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const name=relative?relative+'/'+entry.name:entry.name,file=path.join(directory,entry.name);
      if(name==='update-files.json'||name==='.pokemon-updates')continue;
      if(fs.lstatSync(file).isSymbolicLink())throw Error('Release contains a linked entry');
      if(entry.isDirectory())walk(file,name);else if(entry.isFile())files.push({path:name,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
      else throw Error('Unexpected release entry');
    }
  }
  walk(root);const manifest={schema:1,product:'pokemon-codex-buddy',version,platform:'windows-x64',files};
  fs.writeFileSync(path.join(root,'update-files.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(require.main===module){const [root,version]=process.argv.slice(2);releaseManifest(path.resolve(root),version);}
module.exports={releaseManifest};
