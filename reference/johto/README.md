# Johto reference inputs

Original Crystal trainer parties, level learnsets and map references are pinned to the pret/pokecrystal commit in `upstream.json`. The unchanged inputs in `raw/` are reference data, not runtime downloads or a distributed ROM. Original game content remains with its rights holders.

From the repository root:

```powershell
node reference/johto/prepare.cjs
node reference/johto/fetch-assets.cjs
npm.cmd test
npm.cmd run mobile:bundle
npm.cmd run package
```

`prepare.cjs` validates the selected party formats and writes `desktop/data/johto-data.json`, including source hashes. Player combat uses the existing FRLG ruleset; trainer parties use their original Crystal moves.

`fetch-assets.cjs` retrieves original sprites and unchanged official illustrations, validates PNG signatures and dimensions, and writes `desktop/assets/johto-sources.json` and `desktop/johto-art.js`. Face framing is CSS metadata; original image files are preserved. A failed download may leave `asset-progress.json` as an untracked local recovery cache. No network fetch is needed during gameplay.

Progression and acquisition rules are shared in `shared/johto*.cjs`; PC and Android bundle the same implementation and UI. Detailed scenario reports stay in ignored `desktop/.smoke/` rather than player documentation.
