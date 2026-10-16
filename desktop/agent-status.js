(function(){
  'use strict';
  const name='AI Agent 포켓몬 키우기';
  function combine(codex={},claude={},remotes=[]){
    const agents={};
    for(const [id,local] of [['codex',codex],['claude',claude]]){
      const remoteConnected=remotes.filter(row=>row.connected&&(row.agents?row.agents[id]:id==='codex')).length;
      agents[id]={connected:!!local.connected||remoteConnected>0,localConnected:!!local.connected,remoteConnected,files:local.files||0,error:local.error||null};
    }
    return {connected:Object.values(agents).some(a=>a.connected),agents,localConnected:Object.values(agents).some(a=>a.localConnected),remoteConnected:remotes.filter(r=>r.connected).length,files:(codex.files||0)+(claude.files||0),limitsProvider:agents.codex.connected?'codex':null};
  }
  function presentation(source={}){
    const agents=source.agents||{codex:{connected:!!source.connected}},connected=['codex','claude'].filter(id=>agents[id]?.connected);
    const label=connected.length?connected.map(id=>id.toUpperCase()).join(' + '):'AI AGENT';
    const detail=['codex','claude'].map(id=>{
      const a=agents[id]||{},name=id==='codex'?'Codex':'Claude Code';
      return name+' · '+(a.connected?[a.localConnected?'로컬':null,a.remoteConnected?'원격 '+a.remoteConnected+'대':null].filter(Boolean).join(' / ')||'연결됨':a.error||'첫 작업을 기다려요');
    }).join('\n');
    return {label,connected:connected.length>0,connection:connected.length?'연결됨':'연결 대기',detail,claudeOnly:connected.length===1&&connected[0]==='claude',both:connected.length===2};
  }
  const api={name,combine,presentation};if(typeof module==='object'&&module.exports)module.exports=api;else globalThis.AgentStatus=api;
})();
