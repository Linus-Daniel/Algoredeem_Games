const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../assets/ads.js');
function sdk(behavior, consent = true, timeoutMs = 50) {
  const requests = [], scripts = [];
  const host = { adsbygoogle: { push(params) { requests.push(params); if (params.onReady) params.onReady(); else behavior(params); } } };
  const ads = create({ host, config: { adsenseClient: 'ca-pub-1234567890123456' }, timeoutMs,
    consent: async () => consent, loadScript: async (url, attrs) => { scripts.push({ url, attrs }); } });
  return { ads, requests, scripts };
}
test('missing publisher and denied consent load no ad scripts and earn no rewards', async () => {
  const missing = create({ config: {}, consent: () => { throw new Error('Must not run'); } });
  assert.equal(missing.available(), false); assert.equal(await missing.rewarded('coins'), false);
  const denied = sdk(() => {}, false); assert.equal(await denied.ads.rewarded('coins'), false); assert.equal(denied.scripts.length, 0);
});
test('only the adViewed callback earns a reward and the game restores once', async () => {
  let before = 0, after = 0;
  const h = sdk((params) => { params.beforeReward(() => { params.beforeAd(); params.adViewed(); params.afterAd(); params.adBreakDone(); params.adBreakDone(); }); });
  assert.equal(await h.ads.rewarded('coins', { beforeAd: () => before++, afterAd: () => after++ }), true);
  assert.equal(before, 1); assert.equal(after, 1); assert.equal(h.requests[1].type, 'reward');
  assert.equal(h.scripts[0].attrs['data-adbreak-test'], undefined);
});
test('dismissal, no fill, provider exceptions and timeout do not earn rewards', async () => {
  for (const behavior of [(p) => { p.adDismissed(); p.adBreakDone(); }, (p) => p.adBreakDone(), () => { throw new Error('Provider error'); }, () => {}]) {
    const h = sdk(behavior); assert.equal(await h.ads.rewarded('coins'), false);
  }
});
test('late callbacks after timeout cannot grant rewards or start an ad', async () => {
  let callbacks;
  const h = sdk((p) => { callbacks = p; }); assert.equal(await h.ads.rewarded('coins'), false);
  let shown = false; callbacks.beforeReward(() => { shown = true; }); callbacks.adViewed(); callbacks.adBreakDone();
  assert.equal(shown, false);
});
test('concurrent placements cannot start duplicate ads', async () => {
  let complete;
  const h = sdk((p) => { complete = p; }); const first = h.ads.rewarded('coins');
  assert.equal(await h.ads.rewarded('coins'), false);
  while (!complete) await new Promise((resolve) => setTimeout(resolve, 0));
  complete.adViewed(); complete.adBreakDone(); assert.equal(await first, true);
  assert.equal(h.requests.filter((p) => p.type === 'reward').length, 1);
});
