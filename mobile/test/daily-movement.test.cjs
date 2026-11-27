'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const context = vm.createContext({});
for (const file of ['mobile/android/app/build/generated/gameAssets/web/game.bundle.js', 'mobile/android/app/build/generated/gameAssets/web/config.js', 'mobile/web/progression.js', 'mobile/web/background.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const { Adventure, Game } = context.MobileCore;
const Progression = context.MobileProgression;
const now = Date.parse('2026-10-23T14:30:00Z');
const hoursSinceSave = 36 * 60 * 60 * 1000;
const plain = value => JSON.parse(JSON.stringify(value));

function makeStationaryGame() {
  const game = new Adventure(new Game({}, now).data, now);
  game.data.mobileStory.onboarding = 'done';
  game.data.mobileStory.scene = null;
  game.data.battle = null;
  game.data.switchUntil = 0;
  game.nextTick = now;
  game.requestAction('story-travel', false, now);
  return game;
}

test('old timed movement rewards stay dormant after upgrade and reload', () => {
  const game = makeStationaryGame();
  const account = { touchesObserved: 1000, credit: 0, bank: 2345, dailyAt: now };
  game.data.mapTravel = { ...account };
  const mobile = new Progression(game);
  const at = now + hoursSinceSave;
  const status = { touches: 1000, usageActive: false, usageMillis: 0 };
  mobile.resume(at);
  mobile.live(at);
  mobile.catchUp(status, at, 0);
  assert.deepEqual(plain(game.data.mapTravel), account);

  const save = { format: 1, game: game.data, mobile: mobile.checkpoint() };
  const result = JSON.parse(context.MobileBackground.run(JSON.stringify(save), status, at, 0));
  assert.equal(result.used, 0);
  const restored = new Adventure((result.save || save).game, at);
  assert.deepEqual(plain(restored.data.mapTravel), account);
});

test('idle touches still fund explicit banked movement', () => {
  const game = makeStationaryGame();
  const mobile = new Progression(game);
  mobile.resume(now);
  mobile.observe({ touches: 0 });
  mobile.observe({ touches: 1000 });
  assert.equal(game.data.mapTravel.bank, 2000);
  const start = plain(game.panelState(now).kantoWorld.position);
  game.data.kantoWorld.position = { ...start };
  assert.ok(game.requestAction('travel', { location: 'route-1', position: { x: 44, y: 92 } }, now));
  const at = now + hoursSinceSave;
  const status = { touches: 1000, usageActive: true, usageMillis: 0 };
  mobile.catchUp(status, at, 0);
  assert.deepEqual(plain(game.data.kantoWorld.position), start);
  assert.equal(game.data.mapTravel.bank, 2000);
  assert.ok(game.requestAction('travel-bank', undefined, at));
  mobile.catchUp(status, at, 0);
  assert.equal(game.data.mapTravel.bank, 0);
  assert.notDeepEqual(plain(game.data.kantoWorld.position), start);
  assert.equal(mobile.usageConsumed, 0);
});
