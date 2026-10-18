# Third-party notices

## Pokemon Codex Buddy

Project additions and modifications: Copyright (c) 2026 Bakzzi. MIT License, as set out in LICENSE. The upstream copyright notice and license terms are retained. Pokemon artwork and other third-party materials retain the rights, licenses and notices described below.

## Digimon_mod

Original: https://github.com/momozzing/Digimon_mod
Revision: 687711ee4524e9cdaaf6849825fc837ab96038d7 (2026-10-13).
Copyright (c) 2026 momozzing. MIT License. The original copyright notice and MIT terms are preserved in LICENSE, alongside the copyright notice for this project's additions and modifications. The upstream artwork notice is preserved verbatim below:

~~~text
This license covers the source code only. Digimon characters, names and
artwork (art/, sprites/, hooks/img/, docs/) are the property of Bandai Namco and
Toei Animation. They are not covered by this license and are included for
non-commercial fan use only. This project is not affiliated with or endorsed
by Bandai Namco or Toei Animation.
~~~

The concept is visibly credited to **원작 모모찡 · momozzing**. desktop/season.cjs adapts original season helpers; the new engine uses month formatting and the legacy level conversion for save migration. New collection, battle, nursery, host and Codex reader code are separate implementations. The upstream source and artwork stay in the source checkout for provenance and are not loaded by the portable widget.

## PokeAPI data and sprites

Data: https://github.com/PokeAPI/pokeapi/tree/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv
PokeAPI's license is copied to desktop/data/LICENSE-PokeAPI.txt.

Runtime sprites: https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-ii/crystal/animated
Original Crystal animated sprites.
Per-file URLs, byte counts and SHA-256 hashes are in desktop/assets/manifest.json.
The reference directory also preserves original Generation III assets and offline source tables.

Item sprites are downloaded unchanged from https://github.com/PokeAPI/sprites/tree/master/sprites/items . Their per-file URLs, byte counts and SHA-256 hashes are recorded in desktop/assets/items/sources.json. Runtime uses local copies without network requests.

Pokémon names, characters and game artwork belong to their respective rights holders, including Nintendo, Creatures, GAME FREAK and The Pokémon Company. They are separate from the MIT-licensed project source. This is an unofficial noncommercial fan project.

## Game rule references

FRLG trainer party facts:
https://github.com/pret/pokefirered/blob/master/src/data/trainer_parties.h

Trainer and encounter references are credited in the source data and artwork manifests. Event progression, encounter selection and other game-specific adjustments are implemented by this project; their solutions are omitted from public player guidance.

Evolution and breeding references:
https://github.com/pret/pokefirered/blob/master/src/data/pokemon/evolution.h
https://github.com/pret/pokefirered/blob/master/src/daycare.c

The runtime uses extracted species, level and move identifiers. Battle mechanics use the pinned Gen III simulator described below; encounter selection, automatic move selection, coding-work pacing, collection and capture thresholds are this project's rules.

## Pokemon Showdown simulator

The unchanged Generation III Substitute sprite is stored at desktop/assets/substitute.png.
Source: https://play.pokemonshowdown.com/sprites/gen3/substitute.png
SHA-256: 060cfd5e6e78d448a1de361c6c2b3991bb6d6803f28dac1e2c377afa220ceb91
Original Pokemon game artwork; the artwork rights remain with the Pokemon rights holders.

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

Additional trainer illustrations use original game and animation artwork. Images are unchanged Bulbagarden Archives thumbnails displayed through small CSS face viewports; their pages, URLs, dimensions, byte counts and SHA-256 hashes are recorded in desktop/assets/trainers/rocket-sources.json. These images retain the original Pokemon rights holders' copyright and are not MIT-licensed code.

Recovery-tool icons also use unchanged PokeAPI sprite images. Pinned source URLs, item identities, sizes and SHA-256 hashes are recorded in `desktop/assets/items/consumable-sources.json`. Their artwork remains with the original Pokemon rights holders. Item descriptions were checked against PokeAPI item data; effect values use this project's Gen III ruleset.

## SSH transport

ssh2 1.17.0: https://github.com/mscdex/ssh2/tree/v1.17.0 . MIT License. The package and dependency licenses are retained in the portable runtime under resources/app/node_modules. Exact versions and integrity hashes are pinned in package-lock.json. Only explicitly configured SSH endpoints are contacted; no third-party relay service is used.

## Electron runtime

Electron 44.7.0 — https://www.electronjs.org/
The portable runtime includes Electron's unchanged LICENSE and LICENSES.chromium.html.
