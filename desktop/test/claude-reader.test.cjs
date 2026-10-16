'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {Game}=require('../game.cjs'),{ClaudeReader,selectClaudeEvent}=require('../claude-reader.cjs'),agents=require('../agent-status.js');
const now=Date.parse('2026-10-16T03:00:00Z');
const row=(id,output,at=now,stop='tool_use')=>({type:'assistant',timestamp:new Date(at).toISOString(),message:{id,content:[{type:'text',text:'PRIVATE-CONTENT'}],usage:{output_tokens:output,input_tokens:10,cache_read_input_tokens:20,cache_creation_input_tokens:30},stop_reason:stop},apiKey:'PRIVATE-CONTENT'});
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'pokemon-claude-')),project=path.join(root,'C--fixture'),file=path.join(project,'session.jsonl');await fs.mkdir(project);await fs.writeFile(file,JSON.stringify(row('old',100,now-2000,'end_turn'))+'\n');const game=new Game({},now),reader=new ClaudeReader(root,game);t.after(()=>fs.rm(root,{recursive:true,force:true}));return {root,file,game,reader};}
async function append(f,value){await fs.appendFile(f.file,JSON.stringify(value)+'\n');await f.reader.poll(Date.parse(value.timestamp)+1);}

test('Claude boundary returns only phase, hashed identity and validated numerical usage',()=>{
  const clean=selectClaudeEvent(JSON.stringify(row('PRIVATE-CONTENT',42)));assert.equal(clean.usage.output_tokens,42);assert.equal(clean.usage.total_tokens,102);assert.match(clean.usageId,/^[a-f0-9]{24}$/);assert(!JSON.stringify(clean).includes('PRIVATE'));
  for(const invalid of [null,{},'bad',NaN,-1,1.5]){const r=row('x',invalid);assert.equal(selectClaudeEvent(JSON.stringify(r)).usage,undefined);}
  assert.equal(selectClaudeEvent('not-json'),null);assert.equal(selectClaudeEvent(JSON.stringify({type:'user',timestamp:'bad',message:'PRIVATE'})),null);
  assert.equal(selectClaudeEvent(JSON.stringify({type:'user',timestamp:new Date(now).toISOString(),isMeta:true,message:'PRIVATE'})),null);
});
test('historical usage is baseline only; new messages and streamed counter growth count exactly once',async t=>{
  const f=await fixture(t);await f.reader.poll(now);assert.equal(f.reader.status.connected,true);assert.equal(f.game.data.outputTokens,0);
  await append(f,row('new',500,now+100));assert.equal(f.game.data.outputTokens,500);assert.equal(f.game.data.workTokens,500);
  await append(f,row('new',650,now+200));assert.equal(f.game.data.outputTokens,650);
  await append(f,row('new',650,now+300,'end_turn'));assert.equal(f.game.data.outputTokens,650);assert.equal(f.game.snapshot(now+301).phase,'done');assert.equal(f.game.sessions.size,1);
  assert(!JSON.stringify(f.game.data).includes('PRIVATE'));
});
test('message counters cannot regress and replayed mirrors never award duplicate work',async t=>{
  const f=await fixture(t);await f.reader.poll(now);await append(f,row('one',100,now+100));await append(f,row('one',50,now+200));await append(f,row('one',100,now+300));assert.equal(f.game.data.outputTokens,100);
  const mirror=path.join(f.root,'mirror');await fs.mkdir(mirror);const mirrored=path.join(mirror,'session.jsonl');await fs.copyFile(f.file,mirrored);const other=new ClaudeReader(f.root,f.game);await other.poll(now+301);
  await fs.appendFile(f.file,JSON.stringify(row('one',200,now+400))+'\n');await fs.appendFile(mirrored,JSON.stringify(row('one',200,now+400))+'\n');await f.reader.poll(now+401);await other.poll(now+401);assert.equal(f.game.data.outputTokens,200);
});
test('restart, partial UTF-8 appends and fresh message ids preserve the saved usage ledger',async t=>{
  const f=await fixture(t);await f.reader.poll(now);await append(f,row('one',100,now+100));const restored=new Game(f.game.data,now+200),reader=new ClaudeReader(f.root,restored);await reader.poll(now+200);assert.equal(restored.data.outputTokens,100);
  const bytes=Buffer.from(JSON.stringify({...row('two',250,now+300,'end_turn'),ignored:'한글 PRIVATE'})+'\n'),split=bytes.indexOf(Buffer.from('한글'))+1;await fs.appendFile(f.file,bytes.subarray(0,split));await reader.poll(now+300);assert.equal(restored.data.outputTokens,100);await fs.appendFile(f.file,bytes.subarray(split));await reader.poll(now+301);assert.equal(restored.data.outputTokens,350);assert.equal(restored.snapshot(now+302).phase,'done');
});
test('user, tool progress, turn completion and errors affect one activity without retaining content',async t=>{
  const f=await fixture(t);await f.reader.poll(now);
  let at=now;for(const [value,phase] of [[{type:'user',message:{content:'PRIVATE'}},'working'],[{type:'progress',data:{command:'PRIVATE'}},'working'],[{type:'system',subtype:'turn_duration',durationMs:50},'done'],[{type:'system',subtype:'api_error',error:'PRIVATE'},'error']]){
    await append(f,{...value,timestamp:new Date(at+=100).toISOString()});assert.equal(f.game.snapshot(at+1).phase,phase);
  }
  assert.equal(f.game.sessions.size,1);assert(!JSON.stringify([...f.game.sessions]).includes('PRIVATE'));
});
test('subagent directories are observed read-only; missing or empty roots never claim a connection',async t=>{
  const f=await fixture(t),before=await fs.readFile(f.file),nested=path.join(f.root,'project','session','subagents');await fs.mkdir(nested,{recursive:true});await fs.writeFile(path.join(nested,'agent-test.jsonl'),JSON.stringify(row('sub',100,now))+'\n');await f.reader.poll(now);assert.equal(f.reader.status.files,2);assert.deepEqual(await fs.readFile(f.file),before);
  const missing=new ClaudeReader(path.join(f.root,'missing'),f.game);await missing.poll(now);assert.equal(missing.status.connected,false);assert.match(missing.status.error,/Claude Code/);assert.equal((await fs.readdir(f.root)).includes('missing'),false);
});
test('Claude usage never overwrites Codex quota windows',async t=>{
  const f=await fixture(t);await f.reader.poll(now);f.game.limits={at:now,primary:{used:25,minutes:300,resetsAt:Math.floor(now/1000)+300}};const before=structuredClone(f.game.limits),value=row('new',100,now+100);value.rate_limits={primary:{used_percent:99,window_minutes:300,resets_at:9999999999}};await append(f,value);assert.deepEqual(f.game.limits,before);
});
test('an incomplete historical message finishing after startup is baselined rather than backfilled',async t=>{
  const f=await fixture(t),old=JSON.stringify(row('old-partial',1000,now-100));await fs.appendFile(f.file,old.slice(0,-10));await f.reader.poll(now);await fs.appendFile(f.file,old.slice(-10)+'\n'+JSON.stringify(row('fresh',50,now+100))+'\n');await f.reader.poll(now+101);assert.equal(f.game.data.outputTokens,50);
});
test('agent labels reflect independent local and SSH sources, not the last message or installation presence',()=>{
  for(const [a,b,label] of [[false,false,'AI AGENT'],[true,false,'CODEX'],[false,true,'CLAUDE'],[true,true,'CODEX + CLAUDE']])assert.equal(agents.presentation(agents.combine({connected:a},{connected:b})).label,label);
  const source=agents.combine({connected:false},{connected:true},[{connected:true,agents:{codex:true,claude:false}},{connected:false,agents:{codex:true,claude:true}}]);assert.equal(agents.presentation(source).label,'CODEX + CLAUDE');assert.equal(source.agents.codex.remoteConnected,1);assert.equal(source.agents.claude.remoteConnected,0);assert.equal(source.limitsProvider,'codex');assert.equal(agents.presentation(agents.combine({}, {connected:true})).claudeOnly,true);
});
