'use strict';
require('../../desktop/scripts/check-parity.cjs');
// Bundle the existing, locked CommonJS game without replacing its battle engine.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'mobile/android/app/build/generated/gameAssets/web');
const modules=[],ids=new Map();
function visit(file){
  if(ids.has(file))return ids.get(file);
  const id=modules.length;ids.set(file,id);modules.push(null);
  const source=fs.readFileSync(file,'utf8'),deps={};
  if(!file.endsWith('.json'))for(const m of source.matchAll(/\brequire\(['"]([^'"]+)['"]\)/g)){
    const resolved=require.resolve(m[1],{paths:[path.dirname(file)]});
    if(!path.isAbsolute(resolved))throw Error('Node builtin in mobile game: '+m[1]);
    deps[m[1]]=visit(resolved);
  }
  modules[id]=`[function(require,module,exports){\n${file.endsWith('.json')?'module.exports='+source:source}\n},${JSON.stringify(deps)}]`;
  return id;
}
const game=visit(path.join(root,'desktop/game.cjs')),nursery=visit(path.join(root,'desktop/daycare.cjs')),adventure=visit(path.join(root,'mobile/adventure.cjs'));
fs.mkdirSync(out,{recursive:true});
const bundle=`'use strict';globalThis.MobileCore=(()=>{const m=[${modules.join(',\n')}],cache={};function load(id){if(cache[id])return cache[id].exports;const mod=cache[id]={exports:{}};m[id][0](name=>{if(!(name in m[id][1]))throw Error('Unbundled module: '+name);return load(m[id][1][name]);},mod,mod.exports);return mod.exports;}return {...load(${game}),...load(${adventure}),nursery:load(${nursery})};})();\n`;
fs.writeFileSync(path.join(out,'game.bundle.js'),bundle);
for(const name of ['widget.css','battle-ui.css','panels.css','badge-case.css','capture-animation.js','move-effects.js','battle-pacing.js','connections.css','story-panels.css','story-presentation.js','panel-layout.js','rival-panel.js','rescue-panel.js','exploration-panel.js','league-portraits.js'])fs.copyFileSync(path.join(root,'desktop',name),path.join(out,name));
fs.cpSync(path.join(root,'desktop/assets'),path.join(out,'assets'),{recursive:true});
for(const [source,target] of [['index.html','battle.html'],['panels.html','panels.html']]){
  let html=fs.readFileSync(path.join(root,'desktop',source),'utf8');
  html=html.replace("style-src 'self'","style-src 'self' 'unsafe-inline'"); // Existing renderers animate inline styles.
  html=html.replace('</head>','<link rel="stylesheet" href="frame.css"><script src="bridge.js"></script></head>');
  html=html.replaceAll('AI Agent 포켓몬 키우기','포켓몬 작은 모험').replace('진행은 이 PC에 자동 저장돼요.','진행은 이 기기에 자동 저장돼요.');
  html=html.replaceAll('모험 걸음은 실제 에이전트 작업량에 따라 쌓여요.','모험을 이어가면 알을 돌볼 수 있어요.').replaceAll('네가 코딩하는 동안','함께한 모험').replaceAll('코딩하는 동안','모험하는 동안');
  html=html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/g,'');
  if(source==='panels.html')html=html.replace(/<button data-tab="connections">.*?<\/button>/s,'').replace(/<section id="connections"[\s\S]*?<\/section>/,'');
  if(source==='index.html')html=html.replace('<body>','<body class="battle-frame">');
  else html=html.replace('<body>','<body class="panel-frame">');
  fs.writeFileSync(path.join(out,target),html);
}
let renderer=fs.readFileSync(path.join(root,'desktop/renderer.js'),'utf8');
renderer=renderer.replaceAll('에이전트 작업과 함께 모험 중','걸음과 잠금 시간으로 모험해요').replaceAll('다음 작업과 함께 배틀을 이어가요','동료와 배틀을 이어가요').replaceAll('작업의 여운으로 모험을 이어가는 중','걸음과 함께 모험 중').replaceAll('다음 코딩을 기다리는 중','동료와 함께 모험 중');
fs.writeFileSync(path.join(out,'renderer.js'),renderer);
const panels=fs.readFileSync(path.join(root,'desktop/panels.js'),'utf8')
  .replaceAll('코딩을 이어가면 부화해요.','모험을 이어가면 부화해요.')
  .replaceAll('첫 모험을 기다리고 있어요. Codex에서 작업하면 기록이 쌓여요.','첫 모험을 기다리고 있어요. 동료와 함께 모험하면 기록이 쌓여요.')
  .replace("Math.floor(current/required*100)+'% · '+Math.max(0,required-current).toLocaleString('ko-KR')+' 모험 걸음 남음'","Math.floor(current/required*100)+'%'")
  .replace(/^    root.append\(node\('p','muted','알 발견까지 '[^\n]+\n/m,'');
fs.writeFileSync(path.join(out,'panels.js'),panels);
fs.writeFileSync(path.join(out,'connections.js'),'function initConnections(){};function renderConnections(){};');
fs.cpSync(path.join(root,'mobile/web'),out,{recursive:true});
fs.copyFileSync(path.join(root,'desktop/story.css'),path.join(out,'story.css'));
const notices=['LICENSE','THIRD_PARTY_NOTICES.md','mobile/third-party/pkmn-sets-LICENSE.txt','mobile/third-party/android-background-NOTICES.txt','desktop/assets/trainers/battle/NOTICE.txt','desktop/assets/items/story-NOTICE.txt','desktop/assets/trainers/portraits/NOTICE.txt',...['@pkmn/sim','@pkmn/streams','ts-chacha20'].map(n=>'node_modules/'+n+'/LICENSE')].map(file=>file+'\n'+fs.readFileSync(path.join(root,file),'utf8')).join('\n\n');
fs.writeFileSync(path.join(out,'THIRD-PARTY-NOTICES.txt'),notices);
fs.writeFileSync(path.join(out,'config.js'),'globalThis.MobileConfig='+fs.readFileSync(path.join(root,'mobile/version.json'),'utf8')+';');
const report={modules:modules.length,bundleBytes:Buffer.byteLength(bundle),sha256:crypto.createHash('sha256').update(bundle).digest('hex')};
fs.writeFileSync(path.join(out,'bundle-info.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
