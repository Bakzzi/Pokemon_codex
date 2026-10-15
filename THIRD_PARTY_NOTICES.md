# Third-party notices

## Digimon_mod

Original: https://github.com/momozzing/Digimon_mod
Revision: 687711ee4524e9cdaaf6849825fc837ab96038d7 (2026-10-13).
Copyright (c) 2026 momozzing. MIT License. The original LICENSE remains unmodified.

The concept is visibly credited to **원작 모모찡 · momozzing**. desktop/season.cjs adapts original season helpers; the new engine uses month formatting and the legacy level conversion for save migration. New collection, battle, nursery, host and Codex reader code are separate implementations. The upstream source and artwork stay in the source checkout for provenance and are not loaded by the portable widget.

## PokeAPI data and sprites

Data: https://github.com/PokeAPI/pokeapi/tree/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv
PokeAPI's license is copied to desktop/data/LICENSE-PokeAPI.txt.

Runtime sprites: https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-ii/crystal/animated
Original Crystal animated sprites, national numbers 1–251; only 1–151 are available before the champion unlock.
Per-file URLs, byte counts and SHA-256 hashes are in desktop/assets/manifest.json.
The reference directory also preserves original Generation III assets and offline source tables.

Item sprites, including Exp. Share, Poke Flute, evolution stones, held evolution items and the Xtransceiver used for the daycare phone contact, are downloaded unchanged from https://github.com/PokeAPI/sprites/tree/master/sprites/items . Their per-file URLs, byte counts and SHA-256 hashes are recorded in desktop/assets/items/sources.json. Runtime uses local copies without network requests. Xtransceiver is used as an in-game contact illustration; phone-based daycare requests are this project's presentation.

Pokémon names, characters and game artwork belong to their respective rights holders, including Nintendo, Creatures, GAME FREAK and The Pokémon Company. They are separate from the MIT-licensed project source. This is an unofficial noncommercial fan project.

## Game rule references

FRLG trainer party facts:
https://github.com/pret/pokefirered/blob/master/src/data/trainer_parties.h

The Rocket grunt uses the FRLG Rocket Hideout Raticate / Zubat level-20 party. The separate Giovanni event uses sParty_BossGiovanni (Onix 25, Rhyhorn 24, Kangaskhan 29) from the same source. Jessie and James use their Yellow Rocket Hideout party (Koffing, Meowth, Ekans, all 25), as recorded at https://www.serebii.net/yellow/Walkthrough/28-game_corner.shtml and https://bulbapedia.bulbagarden.net/wiki/Jessie_and_James . Opponents use extracted FRLG level-up data for their default four moves. The route-blocking Snorlax is level 30 and can be caught with ordinary Gen III capture rules. The three-stage campaign, flute-only Snorlax encounters, fifth-gym access after clearing that encounter, replacement of trade evolution with one level gained from device experience in the prior form, and extra 10% experience for one registered learner are this project's rules. Item acquisition clues and undiscovered rewards are intentionally omitted from advance player guidance.

Evolution and breeding references:
https://github.com/pret/pokefirered/blob/master/src/data/pokemon/evolution.h
https://github.com/pret/pokefirered/blob/master/src/daycare.c

The runtime uses extracted species, level and move identifiers. Battle mechanics use the pinned Gen III simulator described below; encounter selection, automatic move selection, coding-work pacing, collection and capture thresholds are this project's rules.

## Pokemon Showdown simulator

@pkmn/sim 0.10.11: https://github.com/pkmn/ps/tree/main/sim
Derived from Pokemon Showdown: https://github.com/smogon/pokemon-showdown
MIT License. Copyright notices and full licenses are preserved in resources/app/node_modules/@pkmn/sim/LICENSE and the dependency package folders.

Only the local simulator is used; this project does not connect to Showdown servers. Gen III is selected explicitly. Exact dependency versions and integrity hashes are pinned in package-lock.json. Runtime dependencies include @pkmn/sets, @pkmn/streams, @pkmn/types and ts-chacha20; their package licenses remain with the distributed files.

Catch formula requested by the user:
https://pokemon.fandom.com/ko/wiki/포획률

## Kanto badge artwork

The eight Kanto badge illustrations were downloaded unchanged from Bulbagarden Archives. Original file pages, image URLs and SHA-256 hashes are recorded in desktop/assets/badges/sources.json. Example source: https://archives.bulbagarden.net/wiki/File:Boulder_Badge.png

These are Pokemon artwork, not MIT-licensed code. Copyright remains with the original Pokemon rights holders. The source archive identifies these as copyrighted images. The holder UI, empty recess treatment and seating animation are this project's code; no asset is fetched at runtime.

## Kanto trainer artwork and Team Rocket logo

The eight Gym Leader illustrations are official Pokemon FireRed and LeafGreen character artwork by Ken Sugimori, downloaded as unchanged thumbnails requested at up to 384 pixels in height from Bulbagarden Archives. Source image pages, original URLs, downloaded thumbnail URLs, dimensions, byte counts and SHA-256 hashes are recorded in desktop/assets/trainers/sources.json. Example source: https://archives.bulbagarden.net/wiki/File:FireRed_LeafGreen_Brock.png

The Team Rocket R logo is downloaded unchanged from https://archives.bulbagarden.net/wiki/File:Rocket-logo.png . Its URL, dimensions, byte count and SHA-256 hash are recorded in desktop/assets/logos/sources.json. These images retain the original Pokemon rights holders' copyright and are not MIT-licensed code. All artwork is loaded from local files at runtime.

The Rocket Hideout uses the existing Erika and Giovanni illustrations, official FireRed/LeafGreen Team Rocket grunt artwork, and original-series animation artwork for Jessie and James. New images are unchanged Bulbagarden Archives thumbnails displayed through small CSS face viewports; their pages, URLs, dimensions, byte counts and SHA-256 hashes are recorded in desktop/assets/trainers/rocket-sources.json. Unrevealed opponents are rendered as black silhouettes. These images retain the original Pokemon rights holders' copyright and are not MIT-licensed code.

## Electron runtime

Electron 44.7.0 — https://www.electronjs.org/
The portable runtime includes Electron's unchanged LICENSE and LICENSES.chromium.html.
