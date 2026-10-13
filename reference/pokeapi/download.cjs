'use strict';
// Reference data only. Nothing in the desktop application imports this folder.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const tables = [
  'languages', 'generations', 'version_groups', 'versions',
  'pokemon_species', 'pokemon_species_names', 'pokemon_species_flavor_text',
  'pokemon', 'pokemon_stats', 'pokemon_stats_past', 'pokemon_types', 'pokemon_types_past',
  'pokemon_moves', 'pokemon_move_methods', 'pokemon_evolution',
  'pokemon_habitats', 'pokemon_habitat_names',
  'pokemon_abilities', 'pokemon_abilities_past', 'abilities', 'ability_names',
  'moves', 'move_names', 'move_changelog', 'move_meta', 'move_meta_ailments',
  'move_meta_ailment_names', 'move_meta_stat_changes', 'move_targets',
  'move_effects', 'move_effect_prose', 'move_flavor_text',
  'growth_rates', 'experience', 'evolution_triggers', 'items', 'item_names',
  'types', 'type_names', 'type_efficacy', 'type_efficacy_past', 'stats', 'stat_names',
  'encounters', 'encounter_slots', 'encounter_methods', 'encounter_conditions',
  'encounter_condition_values', 'encounter_condition_value_map',
  'encounter_pokemon_details', 'location_areas', 'location_names', 'locations',
  'location_area_encounter_rates',
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {'User-Agent': 'PokemonCodex-reference-data/1.0'},
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
async function main() {
  const manifestFile = path.join(root, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!manifest) {
    const upstream = JSON.parse((await request('https://api.github.com/repos/PokeAPI/pokeapi/commits/master')).toString('utf8'));
    assert.match(upstream.sha, /^[0-9a-f]{40}$/);
    manifest = {
      schemaVersion: 1,
      purpose: 'Offline reference data for design; not loaded by the widget',
      project: 'https://pokeapi.co/',
      documentation: 'https://pokeapi.co/docs/v2/',
      upstreamRepository: 'https://github.com/PokeAPI/pokeapi',
      upstreamCommit: upstream.sha,
      createdAt: new Date().toISOString(),
      sources: [],
    };
    await fs.mkdir(root, {recursive: true});
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  }
  const specs = tables.map(name => ({
    file: `raw/${name}.csv`,
    url: `https://raw.githubusercontent.com/PokeAPI/pokeapi/${manifest.upstreamCommit}/data/v2/csv/${name}.csv`,
  }));
  // One API example preserves the service's documented sprite URLs and schema.
  specs.push({file: 'raw/api-pokemon-25.json', url: 'https://pokeapi.co/api/v2/pokemon/25/'});
  specs.push({file: 'raw/UPSTREAM-LICENSE', url: `https://raw.githubusercontent.com/PokeAPI/pokeapi/${manifest.upstreamCommit}/LICENSE.md`});
  await fs.mkdir(path.join(root, 'raw'), {recursive: true});
  const errors = [];
  for (let index = 0; index < specs.length; index += 4) {
    const batch = await Promise.allSettled(specs.slice(index, index + 4).map(async spec => {
      const previous = manifest.sources.find(source => source.file === spec.file);
      if (previous) {
        try {
          const cached = await fs.readFile(path.join(root, spec.file));
          if (previous.sha256 === hash(cached) && previous.url === spec.url) return previous;
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const bytes = await request(spec.url);
      if (spec.file.endsWith('.csv')) assert.ok(bytes.indexOf(10) > 0, `Invalid CSV: ${spec.file}`);
      if (spec.file.endsWith('.json')) JSON.parse(bytes.toString('utf8'));
      await fs.writeFile(path.join(root, spec.file), bytes);
      return {...spec, bytes: bytes.length, sha256: hash(bytes), fetchedAt: new Date().toISOString()};
    }));
    batch.forEach((result, offset) => {
      if (result.status === 'fulfilled') {
        manifest.sources = manifest.sources.filter(source => source.file !== result.value.file);
        manifest.sources.push(result.value);
      } else errors.push({file: specs[index + offset].file, error: String(result.reason)});
    });
    manifest.sources.sort((a, b) => a.file.localeCompare(b.file));
    manifest.downloadErrors = errors;
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({downloaded: manifest.sources.length, expected: specs.length, errors: errors.length}));
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log(JSON.stringify({complete: true, tables: tables.length, sources: manifest.sources.length, bytes: manifest.sources.reduce((sum, source) => sum + source.bytes, 0), commit: manifest.upstreamCommit}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
