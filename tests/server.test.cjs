const test = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../scripts/serve.cjs');
async function request(url, method = 'GET') {
  const headers = {};
  const res = { status: 200, body: '', setHeader: (key, value) => { headers[key.toLowerCase()] = value; },
    writeHead: (status, extra = {}) => { res.status = status; for (const [key, value] of Object.entries(extra)) headers[key.toLowerCase()] = value; },
    end: (body) => { res.body = body?.toString() || ''; } };
  await handler()({ url, method }, res);
  return { ...res, headers };
}
test('public handler sends security headers and never exposes source or directories', async () => {
  const page = await request('/');
  assert.equal(page.status, 200); assert.match(page.headers['content-security-policy'], /script-src 'self'/);
  assert.equal(page.headers['x-content-type-options'], 'nosniff'); assert.match(page.body, /Algoredeem Games/);
  for (const file of ['/package.json', '/.git/config', '/scripts/serve.cjs', '/tests/browser.cjs', '/assets/', '/%2e%2e%2fpackage.json', '/missing']) assert.equal((await request(file)).status, 404, file);
  assert.equal((await request('/%ZZ')).status, 400);
  const method = await request('/', 'POST'); assert.equal(method.status, 405); assert.equal(method.headers.allow, 'GET, HEAD');
  const head = await request('/assets/game.js', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, '');
});
