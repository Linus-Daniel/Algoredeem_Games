const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createGame } = require('../tests/game-harness.cjs');
const { platform } = require('../tests/platform-harness.cjs');
const { games } = require('../assets/catalog.js');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
for (const ref of html.matchAll(/(?:src|href)="((?:assets\/)[^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, 'dist', ref[1])), 'Missing asset: ' + ref[1]);
const standalone = fs.readFileSync(path.join(root, 'Gumdrop Grid.html'), 'utf8');
assert.equal(/(?:src|href)="assets\//.test(standalone), false, 'Standalone has external assets');
assert.equal(/<script[^>]+src=/.test(standalone), false, 'Standalone has external scripts');
const script = standalone.match(/<script>([\s\S]*?)<\/script>/)[1];
const runtime = createGame({ script });
try {
  assert.ok(runtime.document.getElementById('map').children.length);
  assert.equal(runtime.context.GumdropConfig.adsenseClient, '');
} finally { runtime.close(); }
assert.equal(fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8').includes('__BUILD_ID__'), false);
assert.equal(fs.readFileSync(path.join(root, 'dist/assets/game.js'), 'utf8').includes('window.testGame'), false);
const portal = fs.readFileSync(path.join(root, 'Algoredeem Games.html'), 'utf8');
assert.equal(/(?:src|href)="assets\//.test(portal), false);
assert.equal(/<script[^>]+src=/.test(portal), false);
const portalRuntime = platform({ script: portal.match(/<script>([\s\S]*?)<\/script>/)[1] });
try {
  assert.equal(portalRuntime.doc.getElementById('gameGrid').children.length, 31);
  assert.equal(portalRuntime.context.GumdropConfig.adsenseClient, '');
} finally { portalRuntime.close(); }
assert.equal(games.length, 31);
for (const game of games) assert.ok(fs.existsSync(path.join(root, 'dist/assets/posters', game.id + '.svg')));
console.log('Build verified: 31-game portal, both offline editions, complete assets, versioned worker and no test state in production.');
