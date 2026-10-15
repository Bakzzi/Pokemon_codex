'use strict';
const fs=require('node:fs'),path=require('node:path');

// Runs only inside the user's separate SSH exec channel. Nothing is installed remotely.
function runAgent(CodexReader){
  const os=require('node:os'),path=require('node:path');
  const root=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions');
  const send=value=>process.stdout.write(JSON.stringify({v:1,...value})+'\n');
  process.stdout.on('error',()=>process.exit(0));
  let initial=new Map(),live=[],busy=false;
  const reader=new CodexReader(root,{observe(id,event,{baseline}){
    if(!baseline){live.push({kind:'event',id,event,baseline:false});return;}
    const saved=initial.get(id)||{};
    saved[event.payload.type==='token_count'?'tokens':'phase']=event;initial.set(id,saved);
  }});
  async function poll(){
    if(busy)return;busy=true;
    try{
      await reader.poll();
      for(const [id,saved] of initial){
        const events=Object.values(saved).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
        for(const event of events)send({kind:'event',id,event,baseline:true});
      }
      initial.clear();for(const event of live)send(event);live=[];
      send({kind:'status',connected:reader.status.connected,files:reader.status.files});
    }catch{send({kind:'status',connected:false,files:0});}
    finally{busy=false;}
  }
  poll();setInterval(poll,1500);
}
function agentScript(){
  const source=fs.readFileSync(path.join(__dirname,'codex-reader.cjs'),'utf8');
  return "'use strict';\nconst mod={exports:{}};\n"+
    'new Function("require","module","exports",'+JSON.stringify(source)+')(require,mod,mod.exports);\n'+
    '('+runAgent.toString()+')(mod.exports.CodexReader);\n';
}
module.exports={agentScript};
