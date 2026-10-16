'use strict';
// Other scenarios keep their existing cast; registry-only selection is covered by region-transfer.test.
exports.travelSpecies=game=>{const owned=new Set(Object.values(game.data.owned).map(p=>p.id));return game.johtoUnlockPreview().candidates.filter(p=>p.eligible&&owned.has(p.id)).slice(0,10).map(p=>p.id);};
