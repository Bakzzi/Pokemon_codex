'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
// PokeAPI's latest base_experience is not the Generation III experience yield.
// Read the original, pinned table instead; reject altered reference bytes.
function load(){
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'firered-experience-source.json'),'utf8'));
  const sources=new Map(manifest.sources.map(entry=>{
    const bytes=fs.readFileSync(path.join(__dirname,'raw',entry.file));
    assert.equal(bytes.length,entry.bytes,entry.file);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.file);
    return [entry.file,bytes.toString('utf8')];
  }));
  const growth={SLOW:1,MEDIUM_FAST:2,FAST:3,MEDIUM_SLOW:4,ERRATIC:5,FLUCTUATING:6};
  const facts=new Map();
  for(const match of sources.get('firered-species-info.h').matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*=\s*\{[ \t]*\r?\n([\s\S]*?)\n\s*\},/g)){
    const baseExperience=Number(match[2].match(/\.expYield\s*=\s*(\d+)/)?.[1]);
    const rate=match[2].match(/\.growthRate\s*=\s*GROWTH_([A-Z_]+)/)?.[1];
    if(baseExperience>0&&growth[rate])facts.set(match[1],{baseExperience,growth:growth[rate]});
  }
  assert.ok(facts.size>=251,'Incomplete original experience table');
  return {facts,manifest};
}
module.exports={load};
