'use strict';
const path=require('node:path'),crypto=require('node:crypto');
const {CodexReader}=require('./codex-reader.cjs');
const identity=value=>crypto.createHash('sha256').update('claude:'+value).digest('hex').slice(0,24);
const count=value=>Number.isSafeInteger(value)&&value>=0;
// Only lifecycle markers, message identity hashes and numeric usage leave this
// boundary. Never return conversation content, tool arguments or credentials.
function selectClaudeEvent(line){
  let row;try{row=JSON.parse(line);}catch{return null;}
  const at=Date.parse(row?.timestamp);if(!Number.isFinite(at)||row.isMeta)return null;
  const result={timestamp:new Date(at).toISOString()};
  if(row.type==='user'||row.type==='progress')result.phase='task_started';
  if(row.type==='system'&&row.subtype==='turn_duration')result.phase='task_complete';
  if(row.type==='system'&&row.subtype==='api_error')result.phase='error';
  if(row.type==='assistant'){
    const message=row.message;if(!message||typeof message!=='object')return null;
    result.phase=['end_turn','max_tokens','stop_sequence'].includes(message.stop_reason)?'task_complete':'task_started';
    const usage=message.usage;
    if(typeof message.id==='string'&&message.id.length>0&&message.id.length<=256&&usage&&count(usage.output_tokens)){
      const fields=['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'];
      const values=fields.map(key=>usage[key]??0);
      const total=values.reduce((a,b)=>a+b,0);
      if(values.every(count)&&count(total)){result.usageId=identity(message.id);result.usage={output_tokens:usage.output_tokens,total_tokens:total};}
    }
  }
  return result.phase?result:null;
}
class ClaudeReader extends CodexReader{
  constructor(root,game){super(root,game);this.valid=false;}
  directoryAllowed(name,depth){return depth<3&&!name.startsWith('.');}
  fileAllowed(name){return name.endsWith('.jsonl');}
  identity(full){return identity(path.basename(full));}
  deliver(line,cursor,baseline,now){
    const clean=selectClaudeEvent(line);if(!clean)return;this.valid=true;
    if(clean.usage){
      const previous=this.game.data?.baselines?.[clean.usageId];
      if(!previous||clean.usage.output_tokens>=previous.output&&clean.usage.total_tokens>=previous.total)
        this.game.observe(clean.usageId,{type:'event_msg',timestamp:clean.timestamp,payload:{type:'token_count',info:{total_token_usage:clean.usage}}},{baseline,now,agent:'claude',activityId:cursor.id});
    }
    this.game.observe(cursor.id,{type:'event_msg',timestamp:clean.timestamp,payload:{type:clean.phase}},{baseline,now,agent:'claude'});
  }
  async poll(now=Date.now()){
    await super.poll(now);this.status.connected=this.status.connected&&this.valid;
    if(this.status.error)this.status.error=this.status.error.replaceAll('Codex','Claude Code');
  }
}
module.exports={ClaudeReader,selectClaudeEvent};
