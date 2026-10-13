'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function dimensions(bytes, file) {
  if (file.endsWith('.gif')) {
    assert.match(bytes.toString('ascii', 0, 6), /^GIF8[79]a$/);
    return {width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8)};
  }
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)};
}
async function main() {
  const references = JSON.parse(await fs.readFile(path.join(root, 'data/sprites-generation-2-3.json'), 'utf8'));
  const manifestFile = path.join(root, 'sprite-manifest.json');
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(manifestFile, 'utf8')).sources; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const old = new Map(previous.map(source => [source.file, source]));
  const sources = [];
  const errors = [];
  const specs = references.entries.filter(row => row.id <= 151).flatMap(row =>
    Object.entries(row.urls).map(([variant, url]) => ({
      speciesId: row.id, variant, url,
      file: `sprites/${variant}/${row.id}${path.extname(new URL(url).pathname)}`,
    })));
  let reusable = [];
  try { reusable = JSON.parse(await fs.readFile(path.resolve(root, '../../desktop/assets/manifest.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const reuseByUrl = new Map(reusable.map(source => [source.url, source]));
  for (let start = 0; start < specs.length; start += 4) {
    const batch = await Promise.allSettled(specs.slice(start, start + 4).map(async spec => {
      const existing = old.get(spec.file);
      if (existing?.url === spec.url) {
        try {
          if (hash(await fs.readFile(path.join(root, spec.file))) === existing.sha256) return existing;
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      let bytes;
      const local = reuseByUrl.get(spec.url);
      if (local) {
        const candidate = await fs.readFile(path.resolve(root, '../../desktop/assets', `${local.id}.gif`));
        if (hash(candidate) === local.sha256) bytes = candidate;
      }
      if (!bytes) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(spec.url, {signal: AbortSignal.timeout(30000)});
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${spec.url}`);
            bytes = Buffer.from(await response.arrayBuffer());
            break;
          } catch (error) {
            if (attempt === 2) throw error;
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }
      const size = dimensions(bytes, spec.file);
      assert.ok(size.width > 0 && size.height > 0 && size.width <= 256 && size.height <= 256);
      await fs.mkdir(path.dirname(path.join(root, spec.file)), {recursive: true});
      await fs.writeFile(path.join(root, spec.file), bytes);
      return {...spec, ...size, bytes: bytes.length, sha256: hash(bytes)};
    }));
    batch.forEach((result, offset) => {
      if (result.status === 'fulfilled') sources.push(result.value);
      else errors.push({file: specs[start + offset].file, error: String(result.reason)});
    });
    if (start % 100 === 0 || start + 4 >= specs.length) console.log(JSON.stringify({sprites: sources.length, expected: specs.length, errors: errors.length}));
    if (start % 100 === 0 || start + 4 >= specs.length) {
      await fs.writeFile(manifestFile, JSON.stringify({createdAt: new Date().toISOString(), sourceRepository: 'https://github.com/PokeAPI/sprites', speciesRange: [1, 151], sources, errors}, null, 2) + '\n');
    }
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(sources.length, 604);
  console.log(JSON.stringify({complete: true, sprites: sources.length, bytes: sources.reduce((total, source) => total + source.bytes, 0)}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
