(function (root) {
  'use strict';
  const KEY = 'algoredeem-games-profile-v1';
  const ids = ['gumdrop', 'snake', 'breakout', 'space', 'runner', 'pong', 'memory', 'merge', 'mines', 'sudoku', 'slide', 'connect', 'tictac', 'simon', 'words', 'mole', 'penalty', 'football', 'racing', 'rally', 'kart', 'basket', 'bowling', 'golf', 'pool', 'tennis', 'hockey', 'archery', 'flight', 'tank', 'rhythm'];
  const num = (n) => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1e9) : 0;
  function normalize(value) {
    const d = { name: 'Player one', favorites: [], recent: [], stats: {}, sound: true, quality: 'high' };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return d;
    if (typeof value.name === 'string' && value.name.trim()) d.name = value.name.trim().slice(0, 24);
    for (const k of ['favorites', 'recent']) if (Array.isArray(value[k])) d[k] = [...new Set(value[k].filter((id) => ids.includes(id)))].slice(0, k === 'recent' ? 6 : ids.length);
    d.sound = typeof value.sound === 'boolean' ? value.sound : true;
    d.quality = value.quality === 'balanced' ? 'balanced' : 'high';
    if (value.stats && typeof value.stats === 'object') for (const id of ids) {
      const s = value.stats[id]; if (!s || typeof s !== 'object') continue;
      d.stats[id] = { best: num(s.best), plays: num(s.plays), wins: num(s.wins), seconds: num(s.seconds) };
    }
    return d;
  }
  function visit(profile, id) {
    if (!ids.includes(id)) return;
    profile.recent = [id, ...profile.recent.filter((v) => v !== id)].slice(0, 6);
    const s = profile.stats[id] ||= { best: 0, plays: 0, wins: 0, seconds: 0 }; s.plays++;
  }
  function result(profile, id, score, won, seconds) {
    if (!ids.includes(id)) return false;
    const s = profile.stats[id] ||= { best: 0, plays: 0, wins: 0, seconds: 0 };
    const personalBest = num(Math.floor(score)) > s.best;
    s.best = Math.max(s.best, num(Math.floor(score))); s.wins += won ? 1 : 0; s.seconds += num(Math.floor(seconds));
    return personalBest;
  }
  const api = { KEY, normalize, visit, result };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeSave = Object.freeze(api);
})(typeof window === 'object' ? window : globalThis);
