'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const numeric = value => value === '' ? null : /^-?\d+$/.test(value) ? Number(value) : value;

// CSV descriptions contain embedded newlines, commas and escaped quotes.
function parseCSV(text, accept = () => true) {
  const records = [];
  let columns, fields = [], value = '', quoted = false;
  function finish() {
    fields.push(value); value = '';
    if (!columns) columns = fields;
    else if (fields.some(field => field !== '')) {
      assert.equal(fields.length, columns.length, 'CSV column count');
      const row = Object.fromEntries(columns.map((column, i) => [column, numeric(fields[i])]));
      if (accept(row)) records.push(row);
    }
    fields = [];
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {value += '"'; i++;}
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {fields.push(value); value = '';}
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      finish();
    } else value += ch;
  }
  assert.equal(quoted, false, 'Unclosed CSV quote');
  if (value || fields.length) finish();
  return records;
}
const read = async (name, accept) => parseCSV(await fs.readFile(path.join(root, 'raw', `${name}.csv`), 'utf8'), accept);
const index = (rows, key = 'id') => new Map(rows.map(row => [row[key], row]));
const group = (rows, key) => {
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row[key])) result.set(row[key], []);
    result.get(row[key]).push(row);
  }
  return result;
};
const inScope = id => Number.isInteger(id) && id >= 1 && id <= 251;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  for (const source of manifest.sources) {
    const bytes = await fs.readFile(path.join(root, source.file));
    assert.equal(hash(bytes), source.sha256, `Source integrity: ${source.file}`);
  }
  const languages = index(await read('languages'));
  const korean = [...languages.values()].find(row => row.identifier === 'ko').id;
  const versionGroups = index(await read('version_groups'));
  const versions = index(await read('versions'));
  const handheldGroups = new Set(['gold-silver', 'crystal', 'ruby-sapphire', 'emerald', 'firered-leafgreen']);
  const targetGroups = [...versionGroups.values()].filter(row => handheldGroups.has(row.identifier));
  const targetGroupIds = new Set(targetGroups.map(row => row.id));
  const targetVersions = [...versions.values()].filter(row => targetGroupIds.has(row.version_group_id));
  const targetVersionIds = new Set(targetVersions.map(row => row.id));
  const species = await read('pokemon_species', row => inScope(row.id));
  const speciesIndex = index(species);
  const names = index(await read('pokemon_species_names', row => row.local_language_id === korean && inScope(row.pokemon_species_id)), 'pokemon_species_id');
  const pokemon = index(await read('pokemon', row => inScope(row.species_id) && row.is_default === 1));
  const stats = group(await read('pokemon_stats', row => inScope(row.pokemon_id)), 'pokemon_id');
  const pastStats = group(await read('pokemon_stats_past', row => inScope(row.pokemon_id)), 'pokemon_id');
  const types = group(await read('pokemon_types', row => inScope(row.pokemon_id)), 'pokemon_id');
  const pastTypes = group(await read('pokemon_types_past', row => inScope(row.pokemon_id)), 'pokemon_id');
  const abilities = group(await read('pokemon_abilities', row => inScope(row.pokemon_id)), 'pokemon_id');
  const pastAbilities = group(await read('pokemon_abilities_past', row => inScope(row.pokemon_id)), 'pokemon_id');
  const descriptions = group(await read('pokemon_species_flavor_text', row => inScope(row.species_id) && row.language_id === korean), 'species_id');
  const catalog = species.map(row => {
    assert.ok(names.has(row.id), `Missing Korean species name: ${row.id}`);
    assert.equal(pokemon.get(row.id)?.species_id, row.id, 'Default Pokemon species mapping');
    const base = pokemon.get(row.id);
    return {
      id: row.id, identifier: row.identifier, name: names.get(row.id).name,
      genus: names.get(row.id).genus, introducedGeneration: row.generation_id,
      captureRate: row.capture_rate, growthRateId: row.growth_rate_id,
      isLegendary: row.is_legendary === 1, isMythical: row.is_mythical === 1,
      habitatId: row.habitat_id, evolvesFromSpeciesId: row.evolves_from_species_id,
      evolutionChainId: row.evolution_chain_id,
      heightDecimetres: base.height, weightHectograms: base.weight,
      latestReference: {
        baseExperience: base.base_experience,
        stats: stats.get(row.id), types: types.get(row.id), abilities: abilities.get(row.id),
      },
      historicalOverrides: {
        stats: pastStats.get(row.id) || [], types: pastTypes.get(row.id) || [],
        abilities: pastAbilities.get(row.id) || [],
      },
      koreanDescriptions: (descriptions.get(row.id) || []).map(item => ({
        versionId: item.version_id, version: versions.get(item.version_id)?.identifier,
        text: item.flavor_text,
      })),
    };
  }).sort((a, b) => a.id - b.id);

  const learnsets = await read('pokemon_moves', row => inScope(row.pokemon_id) && targetGroupIds.has(row.version_group_id));
  const moveNames = index(await read('move_names', row => row.local_language_id === korean), 'move_id');
  const moveHistory = group(await read('move_changelog'), 'move_id');
  const moveMeta = index(await read('move_meta'), 'move_id');
  const moveStatChanges = group(await read('move_meta_stat_changes'), 'move_id');
  const moveDescriptions = group(await read('move_flavor_text', row => row.language_id === korean), 'move_id');
  // The original CSV also includes XD/Colosseum shadow moves with IDs >= 10000.
  const moves = (await read('moves', row => row.generation_id <= 3 && row.id < 10000)).map(row => ({
    id: row.id, identifier: row.identifier, name: moveNames.get(row.id)?.name,
    introducedGeneration: row.generation_id, latestReference: row,
    historicalChanges: (moveHistory.get(row.id) || []).map(change => ({
      ...change, changedInVersionGroup: versionGroups.get(change.changed_in_version_group_id)?.identifier,
    })),
    latestMetadata: moveMeta.get(row.id) || null,
    latestStatChanges: moveStatChanges.get(row.id) || [],
    koreanDescriptions: (moveDescriptions.get(row.id) || []).map(item => ({
      versionGroup: versionGroups.get(item.version_group_id)?.identifier, text: item.flavor_text,
    })),
  }));
  const moveIds = new Set(moves.map(row => row.id));
  for (const row of learnsets) assert.ok(moveIds.has(row.move_id), `Unknown learnset move ${row.move_id}`);

  const itemNames = index(await read('item_names', row => row.local_language_id === korean), 'item_id');
  const evolutions = (await read('pokemon_evolution', row => inScope(row.evolved_species_id))).map(row => ({
    ...row,
    fromSpeciesId: speciesIndex.get(row.evolved_species_id).evolves_from_species_id,
    versionGroup: versionGroups.get(row.version_group_id)?.identifier,
    triggerItemName: itemNames.get(row.trigger_item_id)?.name || null,
    heldItemName: itemNames.get(row.held_item_id)?.name || null,
  }));
  const neededItemIds = new Set(evolutions.flatMap(row => [row.trigger_item_id, row.held_item_id]).filter(Boolean));
  const items = (await read('items', row => neededItemIds.has(row.id) || row.identifier === 'poke-ball')).map(row => ({...row, name: itemNames.get(row.id)?.name}));
  const growthRates = await read('growth_rates');
  const experience = await read('experience');
  const typeNames = index(await read('type_names', row => row.local_language_id === korean), 'type_id');
  const typeList = (await read('types', row => row.generation_id !== null && row.generation_id <= 3)).map(row => ({...row, name: typeNames.get(row.id)?.name}));
  const typeIds = new Set(typeList.map(row => row.id));
  const typeEfficacy = await read('type_efficacy', row => typeIds.has(row.damage_type_id) && typeIds.has(row.target_type_id));

  const slots = index(await read('encounter_slots'));
  const encounters = await read('encounters', row => inScope(row.pokemon_id) && targetVersionIds.has(row.version_id));
  const encounterIds = new Set(encounters.map(row => row.id));
  const conditionLinks = group(await read('encounter_condition_value_map', row => encounterIds.has(row.encounter_id)), 'encounter_id');
  const conditions = index(await read('encounter_condition_values'));
  const methods = index(await read('encounter_methods'));
  const areas = index(await read('location_areas'));
  const locations = index(await read('locations'));
  const locationNames = index(await read('location_names', row => row.local_language_id === korean), 'location_id');
  const encounterRecords = encounters.map(row => {
    const slot = slots.get(row.encounter_slot_id);
    assert.ok(slot, `Missing encounter slot ${row.encounter_slot_id}`);
    const area = areas.get(row.location_area_id);
    assert.ok(area, `Missing location area ${row.location_area_id}`);
    const location = locations.get(area.location_id);
    return {
      sourceEncounterId: row.id, speciesId: row.pokemon_id,
      version: versions.get(row.version_id).identifier,
      locationAreaId: area.id, location: location.identifier,
      locationName: locationNames.get(location.id)?.name || null,
      area: area.identifier, method: methods.get(slot.encounter_method_id).identifier,
      sourceSlot: slot.slot, chancePercentWithinAreaMethod: slot.rarity,
      minLevel: row.min_level, maxLevel: row.max_level,
      conditions: (conditionLinks.get(row.id) || []).map(link => conditions.get(link.encounter_condition_value_id).identifier),
    };
  });
  const usedAreas = new Set(encounterRecords.map(row => row.locationAreaId));
  const areaRates = await read('location_area_encounter_rates', row => targetVersionIds.has(row.version_id) && usedAreas.has(row.location_area_id));

  const api = JSON.parse(await fs.readFile(path.join(root, 'raw/api-pokemon-25.json'), 'utf8'));
  const crystal = api.sprites.versions['generation-ii'].crystal;
  const fireRed = api.sprites.versions['generation-iii']['firered-leafgreen'];
  const templates = {
    crystalFrontAnimated: crystal.animated.front_default,
    crystalBack: crystal.back_transparent,
    fireRedLeafGreenFront: fireRed.front_default,
    fireRedLeafGreenBack: fireRed.back_default,
  };
  const spriteReferences = catalog.map(row => ({
    id: row.id, introducedGeneration: row.introducedGeneration,
    urls: Object.fromEntries(Object.entries(templates).map(([key, url]) => [key, url.replace(/\/25\.(gif|png)$/, `/${row.id}.$1`)])),
  }));

  const artifacts = [];
  async function write(file, payload) {
    const bytes = Buffer.from(JSON.stringify(payload, null, 2) + '\n');
    await fs.mkdir(path.join(root, 'data'), {recursive: true});
    await fs.writeFile(path.join(root, 'data', file), bytes);
    artifacts.push({file: `data/${file}`, bytes: bytes.length, sha256: hash(bytes)});
  }
  const kanto = catalog.filter(row => row.introducedGeneration === 1);
  const johto = catalog.filter(row => row.introducedGeneration === 2);
  assert.equal(kanto.length, 151); assert.equal(johto.length, 100);
  assert.ok(kanto.every((row, i) => row.id === i + 1 && row.captureRate >= 1 && row.captureRate <= 255));
  assert.ok(johto.every((row, i) => row.id === i + 152));
  assert.equal(kanto.find(row => row.id === 150).captureRate, 3);
  assert.equal(kanto.find(row => row.id === 25).captureRate, 190);
  for (const speciesId of [1, 4, 7, 25]) for (const identifier of ['crystal', 'firered-leafgreen']) {
    const vg = targetGroups.find(row => row.identifier === identifier);
    assert.ok(learnsets.some(row => row.pokemon_id === speciesId && row.version_group_id === vg.id && row.pokemon_move_method_id === 1), `Missing level-up moves for ${speciesId}/${identifier}`);
  }
  for (const growth of growthRates) {
    const levels = experience.filter(row => row.growth_rate_id === growth.id);
    assert.equal(levels.length, 100);
    assert.ok(levels.every((row, i) => row.level === i + 1 && (i === 0 || row.experience >= levels[i - 1].experience)));
  }
  for (const row of encounterRecords) assert.ok(row.chancePercentWithinAreaMethod >= 0 && row.chancePercentWithinAreaMethod <= 100);
  await write('pokemon-kanto.json', kanto);
  await write('pokemon-johto-future.json', johto);
  await write('moves-generation-2-3.json', moves);
  await write('learnsets-generation-2-3.json', {versionGroups: targetGroups, methods: await read('pokemon_move_methods'), entries: learnsets});
  await write('evolution-rules.json', {note: 'Source rules across versions. Version conditions and species-generation gates must be resolved before use.', triggers: await read('evolution_triggers'), items, entries: evolutions});
  await write('growth-and-experience.json', {growthRates, entries: experience});
  await write('types-and-matchups.json', {types: typeList, latestReferenceEfficacy: typeEfficacy, historicalOverrides: await read('type_efficacy_past')});
  await write('encounters-generation-2-3.json', {note: 'Original area/method/condition/slot probabilities, NOT global species spawn chances. Do not add conditional alternatives together.', versions: targetVersions, entries: encounterRecords, areaEncounterRates: areaRates});
  await write('sprites-generation-2-3.json', {sourceExample: 'raw/api-pokemon-25.json', note: 'Original API URLs; local downloaded files are indexed separately in sprite-manifest.json.', entries: spriteReferences});
  await write('reference-lookups.json', {
    stats: await read('stats'), statNames: await read('stat_names', row => row.local_language_id === korean),
    habitats: await read('pokemon_habitats'), habitatNames: await read('pokemon_habitat_names', row => row.local_language_id === korean),
    abilities: await read('abilities'), abilityNames: await read('ability_names', row => row.local_language_id === korean),
    moveTargets: await read('move_targets'), moveAilments: await read('move_meta_ailments'),
    moveAilmentNames: await read('move_meta_ailment_names', row => row.local_language_id === korean),
  });
  const report = {
    validatedAt: new Date().toISOString(), upstreamCommit: manifest.upstreamCommit,
    sourceFilesVerified: manifest.sources.length, kantoSpecies: kanto.length, johtoSpecies: johto.length,
    moves: moves.length, learnsetEntries: learnsets.length,
    evolutionRules: evolutions.length, experienceRows: experience.length,
    encounterSlots: encounterRecords.length,
    kantoSpeciesWithEncounterReferences: new Set(encounterRecords.filter(row => row.speciesId <= 151).map(row => row.speciesId)).size,
    versions: targetVersions.map(row => row.identifier), artifacts,
  };
  await fs.writeFile(path.join(root, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({...report, artifacts: artifacts.length}));
}
if (require.main === module) main().catch(error => {console.error(error); process.exitCode = 1;});
module.exports = {parseCSV};
