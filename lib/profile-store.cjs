const Save = require('../assets/arcade-save.js');
const AD_KEY = 'gumdrop-grid-ad-choice-v1';
const serverSnapshot = Object.freeze({ profile: Save.normalize(null), hydrated: false, storageAvailable: true, adsAllowed: false });
function createProfileStore(storage = () => globalThis.localStorage) {
  let snapshot = serverSnapshot;
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  function hydrate() {
    let profile, adsAllowed = false, storageAvailable = true;
    try { const s = storage(); let value; try { value = JSON.parse(s.getItem(Save.KEY)); } catch { value = null; } profile = Save.normalize(value); adsAllowed = s.getItem(AD_KEY) === 'yes'; }
    catch { profile = Save.normalize(null); storageAvailable = false; }
    snapshot = { profile, adsAllowed, storageAvailable, hydrated: true }; emit();
  }
  function update(change) {
    if (!snapshot.hydrated) hydrate();
    const profile = Save.normalize(snapshot.profile); const result = change(profile);
    let storageAvailable = true;
    try { storage().setItem(Save.KEY, JSON.stringify(profile)); } catch { storageAvailable = false; }
    snapshot = { ...snapshot, profile, storageAvailable }; emit(); return result;
  }
  function allowAds(allowed) {
    if (!snapshot.hydrated) hydrate();
    let storageAvailable = snapshot.storageAvailable;
    try { storage().setItem(AD_KEY, allowed ? 'yes' : 'no'); } catch { storageAvailable = false; }
    snapshot = { ...snapshot, adsAllowed: !!allowed, storageAvailable }; emit();
  }
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    hydrate,
    storageChanged(event) { if (event.key == null || [Save.KEY, AD_KEY].includes(event.key)) hydrate(); },
    toggleFavorite(id) { update(p => { if (!require('./catalog.cjs').byId(id)) return; p.favorites = p.favorites.includes(id) ? p.favorites.filter(v => v !== id) : [...p.favorites, id]; }); },
    visit(id) { update(p => Save.visit(p,id)); },
    result(id, score, won, seconds) { return update(p => Save.result(p,id,score,won,seconds)); },
    preferences(prefs) { update(p => { Object.assign(p, Save.normalize({ ...p, ...prefs })); }); },
    reset() { update(p => Object.assign(p,Save.normalize(null))); },
    allowAds,
  };
}
module.exports = { createProfileStore, AD_KEY, serverSnapshot };
