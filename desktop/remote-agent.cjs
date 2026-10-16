'use strict';
const fs=require('node:fs'),path=require('node:path');

// Runs only inside the user's separate SSH exec channel. Nothing is installed remotely.
function runAgent(CodexReader,ClaudeReader){
  const os=require('node:os'),path=require('node:path');
  const root=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions');
  const send=value=>process.stdout.write(JSON.stringify({v:1,...value})+'\n');
  process.stdout.on('error',()=>process.exit(0));
  let initial=new Map(),live=[],busy=false;
  const sink=agent=>({observe(id,event,{baseline,activityId=id}){
    const value={kind:'event',id,event,baseline,agent,activityId};
    if(!baseline){live.push(value);return;}
    const key=id+':'+(event.payload.type==='token_count'?'tokens':'phase');initial.set(key,value);
  }});
  const reader=new CodexReader(root,sink('codex')),claude=new ClaudeReader(path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'projects'),sink('claude'));
  async function poll(){
    if(busy)return;busy=true;
    try{
      await Promise.all([reader.poll(),claude.poll()]);
      for(const value of [...initial.values()].sort((a,b)=>Date.parse(a.event.timestamp)-Date.parse(b.event.timestamp)))send(value);
      initial.clear();for(const event of live)send(event);live=[];
      send({kind:'status',connected:reader.status.connected||claude.status.connected,files:reader.status.files+claude.status.files,agents:{codex:reader.status.connected,claude:claude.status.connected}});
    }catch{send({kind:'status',connected:false,files:0});}
    finally{busy=false;}
  }
  poll();setInterval(poll,1500);
}
function agentScript(){
  const source=fs.readFileSync(path.join(__dirname,'codex-reader.cjs'),'utf8');
  const claude=fs.readFileSync(path.join(__dirname,'claude-reader.cjs'),'utf8');
  return "'use strict';\nconst mod={exports:{}},claude={exports:{}};\n"+
    'new Function("require","module","exports",'+JSON.stringify(source)+')(require,mod,mod.exports);\n'+
    'new Function("require","module","exports",'+JSON.stringify(claude)+')(name=>name==="./codex-reader.cjs"?mod.exports:require(name),claude,claude.exports);\n'+
    '('+runAgent.toString()+')(mod.exports.CodexReader,claude.exports.ClaudeReader);\n';
}
module.exports={agentScript};
