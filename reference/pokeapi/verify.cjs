'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const load = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const validation = await load('validation.json');
  const manifest = await load('manifest.json');
  const sprites = await load('sprite-manifest.json');
  for (const artifact of [...manifest.sources, ...validation.artifacts, ...sprites.sources]) {
    const bytes = await fs.readFile(path.join(root, artifact.file));
    assert.equal(bytes.length, artifact.bytes, artifact.file);
    assert.equal(hash(bytes), artifact.sha256, artifact.file);
  }
  const kanto = await load('data/pokemon-kanto.json');
  const johto = await load('data/pokemon-johto-future.json');
  const moves = await load('data/moves-generation-2-3.json');
  const learnsets = await load('data/learnsets-generation-2-3.json');
  assert.equal(kanto.length, 151); assert.equal(johto.length, 100);
  assert.ok(kanto.every((row, i) => row.id === i + 1));
  assert.ok(johto.every((row, i) => row.id === i + 152));
  assert.ok([...kanto, ...johto, ...moves].every(row => /[가-힣]/.test(row.name || '')));
  for (let id = 1; id <= 151; id++) assert.equal(sprites.sources.filter(row => row.speciesId === id).length, 4);
  assert.equal(sprites.sources.length, 604);
  assert.ok(sprites.sources.every(row => row.speciesId >= 1 && row.speciesId <= 151));
  const api = await load('raw/api-pokemon-25.json');
  const sampleChecks = [];
  for (const version of ['crystal', 'firered-leafgreen']) {
    const group = learnsets.versionGroups.find(row => row.identifier === version);
    const fromCsv = [...new Set(learnsets.entries.filter(row => row.pokemon_id === 25 && row.version_group_id === group.id && row.pokemon_move_method_id === 1).map(row => `${row.move_id}:${row.level}`))].sort();
    const fromApi = [...new Set(api.moves.flatMap(row => row.version_group_details.filter(detail => detail.version_group.name === version && detail.move_learn_method.name === 'level-up').map(detail => `${row.move.url.split('/').filter(Boolean).at(-1)}:${detail.level_learned_at}`)))].sort();
    assert.deepEqual(fromCsv, fromApi, `CSV/API level-up cross-check: ${version}`);
    sampleChecks.push({speciesId: 25, version, matchingLevelUpMoves: fromCsv.length});
  }
  const names = new Map(moves.map(row => [row.id, row.name]));
  const crystal = learnsets.versionGroups.find(row => row.identifier === 'crystal');
  const report = {
    passed: true, checkedAt: new Date().toISOString(),
    sources: manifest.sources.length, artifacts: validation.artifacts.length,
    sprites: sprites.sources.length, kanto: kanto.length, johto: johto.length,
    moves: moves.length, sampleChecks,
    squirtleCrystalLevelUpSample: learnsets.entries.filter(row => row.pokemon_id === 7 && row.version_group_id === crystal.id && row.pokemon_move_method_id === 1).sort((a, b) => a.level - b.level).slice(0, 5).map(row => ({level: row.level, move: names.get(row.move_id)})),
    totalDataBytes: manifest.sources.concat(validation.artifacts, sprites.sources).reduce((sum, row) => sum + row.bytes, 0),
  };
  await fs.writeFile(path.join(root, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
