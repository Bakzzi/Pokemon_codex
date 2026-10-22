'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function main(){
  require('./check-parity.cjs');
  const root=path.resolve(__dirname,'../..'),pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+$/.test(pkg.version))throw new Error('Invalid version');
  const target=path.join(root,'dist','Pokemon-Codex-'+pkg.version);
  let refresh=false;
  try{
    await fs.stat(target);
    if(!process.argv.includes('--refresh'))throw new Error('Release destination already exists.');
    const installed=JSON.parse(await fs.readFile(path.join(target,'resources/app/package.json'),'utf8'));
    if(installed.name!==pkg.name||installed.version!==pkg.version)throw new Error('Unexpected destination; refusing refresh.');
    refresh=true;
  }catch(e){if(e.code!=='ENOENT')throw e;}
  if(!refresh){
    await fs.mkdir(target,{recursive:true});await fs.cp(path.join(root,'node_modules/electron/dist'),target,{recursive:true});
    await fs.rename(path.join(target,'electron.exe'),path.join(target,'PokemonCodex.exe'));
  }
  const appDir=path.join(target,'resources/app');await fs.mkdir(path.join(appDir,'desktop'),{recursive:true});
  for(const name of ['main.cjs','preload.cjs','game.cjs','game-v2.cjs','battle.cjs','battle-ai.cjs','training-device.cjs','capture-animation.js','move-effects.js','battle-pacing.js','battle-ui.css','badge-case.css','journal.cjs','daycare.cjs','season.cjs','pokemon.cjs','acquisition.cjs','window-placement.cjs','codex-reader.cjs','store.cjs','index.html','widget.css','renderer.js','panels.html','panels.css','panels.js'])
    await fs.copyFile(path.join(root,'desktop',name),path.join(appDir,'desktop',name));
  for(const name of ['assets','data'])await fs.cp(path.join(root,'desktop',name),path.join(appDir,'desktop',name),{recursive:true});
  await fs.cp(path.join(root,'shared'),path.join(appDir,'shared'),{recursive:true});
  for(const name of ['world-map.js','world-map.css'])await fs.copyFile(path.join(root,'desktop',name),path.join(appDir,'desktop',name));
  for(const name of ['adventure.cjs','story-presentation.js','story.css','story-panels.css','panel-layout.js','rival-panel.js','rescue-panel.js','exploration-panel.js','league-portraits.js','challenge-ui.js','johto-art.js','johto-panel.js','johto-panel.css','safari-presentation.js','safari-scene.css'])await fs.copyFile(path.join(root,'desktop',name),path.join(appDir,'desktop',name));
  for(const name of ['remote-agent.cjs','remote-codex.cjs','known-hosts.cjs','connections.js','connections.css','auto-update.cjs','update-helper.ps1','consumables.cjs','claude-reader.cjs','agent-status.js','window-pinning.cjs','move-access.cjs','region-transfer.cjs'])await fs.copyFile(path.join(root,'desktop',name),path.join(appDir,'desktop',name));
  const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
  for(const [location,meta] of Object.entries(lock.packages))if(location.startsWith('node_modules/')&&!meta.dev){
    try{await fs.cp(path.join(root,location),path.join(appDir,location),{recursive:true,filter:file=>!file.endsWith('.map')&&!file.includes(path.sep+'esm'+path.sep)});}
    catch(error){if(!meta.optional||error.code!=='ENOENT')throw error;}
  }
  await fs.writeFile(path.join(appDir,'package.json'),JSON.stringify({name:pkg.name,version:pkg.version,main:'desktop/main.cjs',license:pkg.license},null,2));
  for(const name of ['README.md','THIRD_PARTY_NOTICES.md'])await fs.copyFile(path.join(root,name),path.join(target,name));
  await fs.copyFile(path.join(root,'LICENSE'),path.join(target,'LICENSE-Digimon-mod.txt'));
  require('./release-manifest.cjs').releaseManifest(target,pkg.version);
  console.log('Portable release: '+target);
  const archive=require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'archive.ps1'),'-ReleaseRoot',target],{encoding:'utf8',windowsHide:true});
  console.log(archive.trim());
}
main().catch(e=>{console.error(e);process.exitCode=1;});
