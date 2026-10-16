'use strict';
exports.travelUids=game=>game.johtoUnlockPreview().candidates.filter(p=>p.eligible).slice(0,10).map(p=>p.uid);
