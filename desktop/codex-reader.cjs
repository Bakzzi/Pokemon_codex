'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {StringDecoder}=require('node:string_decoder');
const TAIL_BYTES=256*1024, MAX_LINE=8*1024*1024, SCAN_MS=5000;

async function recordTime(filename,size,now) {
  let handle;
  try {
    handle=await fs.open(filename,'r');
    const length=Math.min(size,8192),start=size-length,bytes=Buffer.alloc(length);
    const {bytesRead}=await handle.read(bytes,0,length,start);
    let tail=bytes.subarray(0,bytesRead).toString('utf8');
    if(start>0){const newline=tail.indexOf('\n');if(newline<0)return 0;tail=tail.slice(newline+1);}
    let latest=0;
    // Only inspect record timestamps; no message body is retained.
    for(const line of tail.split('\n'))try {
      const at=Date.parse(JSON.parse(line).timestamp);if(Number.isFinite(at)&&at<=now+60000)latest=Math.max(latest,at);
    } catch {}
    return latest;
  } catch {return 0;}
  finally {if(handle)await handle.close();}
}

// Strip every record at the input boundary. Never retain prompt/answer text, tool arguments,
// account identifiers, balances, authentication, or arbitrary payload data.
function selectEvent(line) {
  if(!line.includes('"event_msg"')) return null;
  let row; try {row=JSON.parse(line);} catch {return null;}
  if(row.type!=='event_msg'||!row.payload) return null;
  const p=row.payload;
  if(!['task_started','task_complete','task_completed','turn_aborted','error','token_count'].includes(p.type)) return null;
  const clean={type:'event_msg',timestamp:row.timestamp,payload:{type:p.type}};
  if(p.type==='token_count') {
    const c=p.info?.total_token_usage;
    if(c) clean.payload.info={total_token_usage:{output_tokens:c.output_tokens,total_tokens:c.total_tokens}};
    const r=p.rate_limits;
    if(r && (!r.limit_id || r.limit_id==='codex')) {
      clean.payload.rate_limits={};
      for(const key of ['primary','secondary']) if(r[key]) {
        const v=r[key];
        clean.payload.rate_limits[key]={used_percent:v.used_percent,window_minutes:v.window_minutes,resets_at:v.resets_at};
      }
    }
  }
  return clean;
}
class CodexReader {
  constructor(root,game) {this.root=root;this.game=game;this.files=new Map();this.inventory=new Map();this.lastScan=0;this.busy=false;this.status={connected:false,files:0,error:null};}
  async discover(now) {
    const found=[],inventory=this.inventory;
    async function walk(dir,depth) {
      if(depth>3)return;
      const entries=await fs.readdir(dir,{withFileTypes:true});
      for(const entry of entries) {
        const full=path.join(dir,entry.name);
        if(entry.isDirectory()&&/^\d{2,4}$/.test(entry.name)) await walk(full,depth+1);
        else if(entry.isFile()&&entry.name.startsWith('rollout-')&&entry.name.endsWith('.jsonl')) {
          try {
            const stat=await fs.stat(full),previous=inventory.get(full);
            const changed=!previous||stat.size!==previous.size||stat.mtimeMs!==previous.mtime;
            // Windows can leave mtime unchanged while Codex keeps a rollout open.
            const activity=changed?Math.max(await recordTime(full,stat.size,now),previous&&stat.size!==previous.size?now:stat.mtimeMs):previous.activity;
            found.push({full,activity,baselineEnd:previous?Math.min(previous.size,stat.size):stat.size});
            inventory.set(full,{size:stat.size,mtime:stat.mtimeMs,activity});
          } catch {}
        }
      }
    }
    await walk(this.root,0);
    // Keep append reads bounded, but rank open logs by actual records and growth too.
    found.sort((a,b)=>b.activity-a.activity);
    const existing=new Set(found.map(x=>x.full));
    for(const filename of inventory.keys())if(!existing.has(filename))inventory.delete(filename);
    const keep=new Set(found.slice(0,64).map(x=>x.full));
    for(const filename of this.files.keys()) if(!keep.has(filename)) this.files.delete(filename);
    for(const {full,baselineEnd} of found.slice(0,64)) if(!this.files.has(full)) {
      const id=crypto.createHash('sha256').update(path.basename(full)).digest('hex').slice(0,24);
      this.files.set(full,{id,offset:0,carry:'',decoder:new StringDecoder('utf8'),initial:true,baselineEnd});
    }
    this.lastScan=now; this.status.files=this.files.size;
  }
  async poll(now=Date.now()) {
    if(this.busy) return;
    this.busy=true;
    try {
      if(!this.lastScan||now-this.lastScan>=SCAN_MS) await this.discover(now);
      let readable=0;
      for(const [filename,cursor] of this.files) {
        let handle;
        try {
          handle=await fs.open(filename,'r');
          const stat=await handle.stat();
          if(stat.size<cursor.offset) {cursor.offset=0;cursor.initial=true;cursor.baselineEnd=stat.size;cursor.carry='';cursor.decoder=new StringDecoder('utf8');}
          if(cursor.initial) {
            const end=Math.min(stat.size,cursor.baselineEnd),size=Math.min(end,TAIL_BYTES),start=end-size;
            const bytes=Buffer.alloc(size); const {bytesRead}=await handle.read(bytes,0,size,start);
            const decoded=cursor.decoder.write(bytes.subarray(0,bytesRead));
            const parts=decoded.split('\n');
            if(start>0)parts.shift();
            cursor.carry=parts.pop()||'';
            // Baseline the latest observed cumulative counter: no historical backfill or inferred usage.
            for(const line of parts) {const e=selectEvent(line);if(e)this.game.observe(cursor.id,e,{baseline:true,now});}
            cursor.offset=start+bytesRead; cursor.initial=false;
          }
          if(stat.size>cursor.offset) {
            // Bound each poll. The next poll continues at the exact byte offset, including partial UTF-8.
            const size=Math.min(stat.size-cursor.offset,2*1024*1024), bytes=Buffer.alloc(size);
            const {bytesRead}=await handle.read(bytes,0,size,cursor.offset);
            cursor.offset+=bytesRead;
            const parts=(cursor.carry+cursor.decoder.write(bytes.subarray(0,bytesRead))).split('\n');
            cursor.carry=parts.pop()||'';
            for(const line of parts) {const e=selectEvent(line);if(e)this.game.observe(cursor.id,e,{now});}
            if(cursor.carry.length>MAX_LINE) cursor.carry='';
          }
          readable++;
        } catch(error) {if(!['ENOENT','EBUSY'].includes(error.code))this.status.error='일부 Codex 기록을 읽을 수 없어요';}
        finally {if(handle)await handle.close();}
      }
      this.status.connected=readable>0;
      if(readable)this.status.error=null;
    } catch(error) {this.status.connected=false;this.status.error=error.code==='ENOENT'?'Codex의 첫 작업을 기다려요':'Codex 기록 읽기 권한을 확인해 주세요';}
    finally {this.busy=false;}
  }
}
module.exports={CodexReader,selectEvent};
