'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ids = [...Array.from({length:151},(_,i)=>i+1),172];
const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal/animated/';
async function main() {
  const dir = path.join(__dirname, '..', 'assets');
  await fs.mkdir(dir, {recursive:true});
  const manifest = [];
  for (let i=0; i<ids.length; i+=4) {
    const batch = await Promise.all(ids.slice(i,i+4).map(async id => {
      const url = `${base}${id}.gif`;
      const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.subarray(0,6).toString().startsWith('GIF8')) throw new Error(`Invalid GIF: ${id}`);
      const width=bytes.readUInt16LE(6),height=bytes.readUInt16LE(8);
      if(width!==56||height!==56)throw new Error(`Unexpected Crystal sprite dimensions: ${id} ${width}x${height}`);
      await fs.writeFile(path.join(dir, `${id}.gif`), bytes);
      return {id, game:'Pokemon Crystal (Generation II)', width, height, url, sha256:crypto.createHash('sha256').update(bytes).digest('hex'), bytes:bytes.length};
    }));
    manifest.push(...batch);
  }
  await fs.writeFile(path.join(dir,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
  console.log(`Downloaded ${manifest.length} animated sprites (${manifest.reduce((n,x)=>n+x.bytes,0)} bytes).`);
}
main().catch(error=>{console.error(error.message); process.exitCode=1;});
