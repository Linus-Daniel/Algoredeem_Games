const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('offline cache installs a complete shell, stays in scope and serves cached navigation', async () => {
  const handlers = {}, deleted = [], fetched = [], files = [];
  const scope = 'https://game.example/puzzle/';
  const cache = { addAll: async (items) => files.push(...items), match: async (url) => url === scope ? 'offline HTML' : undefined };
  const context = { URL, self: { registration: { scope }, clients: { claim: async () => {} }, addEventListener: (name, fn) => { handlers[name] = fn; } },
    caches: { open: async () => cache, keys: async () => ['unrelated-cache', 'gumdrop-grid-https%3A%2F%2Fgame.example%2Fpuzzle%2F-old', 'gumdrop-grid-other-scope-old'], delete: async (key) => deleted.push(key) },
    fetch: async (request) => { fetched.push(request); return 'network'; } };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), context);
  let promise;
  handlers.install({ waitUntil: (p) => { promise = p; } }); await promise;
  assert.ok(files.includes('./assets/game.js')); assert.ok(files.includes('./index.html'));
  const { PUBLIC_FILES } = require('../scripts/serve.cjs');
  for (const file of PUBLIC_FILES) if (file !== 'sw.js' && !['Gumdrop Grid.html', 'Algoredeem Games.html'].includes(file)) assert.ok(files.includes('./' + file), 'Missing offline file: ' + file);
  handlers.activate({ waitUntil: (p) => { promise = p; } }); await promise;
  assert.deepEqual(deleted, ['gumdrop-grid-https%3A%2F%2Fgame.example%2Fpuzzle%2F-old']);
  let response;
  handlers.fetch({ request: { method: 'GET', url: scope + '?utm_source=test' }, respondWith: (p) => { response = p; } });
  assert.equal(await response, 'offline HTML'); assert.equal(fetched.length, 0);
  response = null; handlers.fetch({ request: { method: 'POST', url: scope }, respondWith: (p) => { response = p; } }); assert.equal(response, null);
  handlers.fetch({ request: { method: 'GET', url: 'https://other.example/' }, respondWith: (p) => { response = p; } }); assert.equal(response, null);
});
