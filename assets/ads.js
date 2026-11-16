(function (root) {
  'use strict';
  function create(options = {}) {
    const config = options.config || {};
    const host = options.host || root;
    const timeoutMs = options.timeoutMs || 90000;
    let initialized = null, active = false, ready = false;
    const available = () => /^ca-pub-\d{16}$/.test(config.adsenseClient || '');
    async function init() {
      if (!available()) return false;
      if (initialized) return initialized;
      initialized = (async () => {
        if (!(await options.consent())) return false;
        host.adsbygoogle = host.adsbygoogle || [];
        host.adBreak = host.adConfig = (params) => host.adsbygoogle.push(params);
        await options.loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.adsenseClient, {
          'data-ad-client': config.adsenseClient, 'data-ad-frequency-hint': '120s',
          ...(config.adsTestMode ? { 'data-adbreak-test': 'on' } : {})
        });
        return new Promise((resolve) => {
          const timer = setTimeout(() => resolve(false), 12000);
          host.adConfig({ preloadAdBreaks: 'on', sound: 'off', onReady: () => { clearTimeout(timer); ready = true; resolve(true); } });
        });
      })().catch(() => false);
      const result = await initialized;
      if (!result) initialized = null;
      return result;
    }
    async function request(type, name, hooks = {}) {
      if (!available() || active) return false;
      active = true;
      try {
        if (!ready) { if (!(await init())) return false; }
        else if (!(await options.consent())) { ready = false; initialized = null; return false; }
        return await new Promise((resolve) => {
          let earned = false, done = false, restored = false;
          const after = () => { if (!restored) { restored = true; hooks.afterAd?.(); } };
          const finish = () => {
            if (done) return;
            done = true; clearTimeout(timer); after(); resolve(earned);
          };
          const timer = setTimeout(finish, timeoutMs);
          const params = { type, name, beforeAd: () => { if (!done) hooks.beforeAd?.(); },
            afterAd: after, adBreakDone: finish };
          if (type === 'reward') {
            params.beforeReward = (showAd) => { if (!done) showAd(); };
            params.adViewed = () => { if (!done) earned = true; };
            params.adDismissed = () => { if (!done) earned = false; };
          }
          try { host.adBreak(params); } catch { finish(); }
        });
      } finally { active = false; }
    }
    return { available, init, rewarded: (name, hooks) => request('reward', name, hooks), interstitial: (name, hooks) => request('next', name, hooks), reset: () => { ready = false; initialized = null; } };
  }
  if (typeof module === 'object' && module.exports) module.exports = { create };
  else root.GumdropAds = Object.freeze({ create });
})(typeof window === 'object' ? window : globalThis);
