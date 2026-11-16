/* Save validation is shared by the game and the Node test suite. */
(function (root) {
  'use strict';
  const KEY = 'gumdrop-grid-save-v2';
  const MAX_LIVES = 5, LIFE_MS = 20 * 60 * 1000, LEVELS = 40;
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const integer = (v, fallback, max = 1e9) => Number.isSafeInteger(v) && v >= 0 ? Math.min(v, max) : fallback;
  function defaults() {
    return { version: 3, lives: MAX_LIVES, lifeTs: 0, coins: 100, gems: 5,
      boost: { hammer: 1, shuffle: 1, moves: 1 }, unlocked: 0, stars: [],
      daily: { last: '', streak: 0 }, wins: 0, sound: true, active: null };
  }
  function activeRun(v, unlocked) {
    if (!isObject(v) || !Number.isInteger(v.level) || v.level < 0 || v.level > unlocked ||
      !Number.isInteger(v.moves) || v.moves < 0 || v.moves > 10000 ||
      !Number.isInteger(v.totalMoves) || v.totalMoves < 1 || v.totalMoves > 10000 ||
      !Number.isInteger(v.score) || v.score < 0 || v.score > 1e9 ||
      !Number.isInteger(v.collected) || v.collected < 0 || v.collected > 1e6 ||
      !Array.isArray(v.board) || v.board.length !== 64 ||
      !Array.isArray(v.jelly) || v.jelly.length !== 64 || v.jelly.some((j) => typeof j !== 'boolean')) return null;
    const specials = [null, 'h', 'v', 'blast', 'bomb'];
    if (v.board.some((t) => !isObject(t) || !specials.includes(t.sp) ||
      (t.sp === 'bomb' ? t.t !== -1 : !Number.isInteger(t.t) || t.t < 0 || t.t >= 6))) return null;
    return { level: v.level, moves: v.moves, totalMoves: v.totalMoves, score: v.score,
      collected: v.collected, board: v.board.map((t) => ({ t: t.t, sp: t.sp })), jelly: v.jelly.slice() };
  }
  function normalize(value, now = Date.now()) {
    const d = defaults();
    if (!isObject(value)) return d;
    for (const k of ['coins', 'gems', 'wins']) d[k] = integer(value[k], d[k]);
    d.lives = integer(value.lives, MAX_LIVES, MAX_LIVES);
    d.lifeTs = d.lives === MAX_LIVES ? 0 : Math.min(integer(value.lifeTs, now) || now, now);
    d.unlocked = integer(value.unlocked, 0, LEVELS - 1);
    d.sound = typeof value.sound === 'boolean' ? value.sound : true;
    if (isObject(value.boost)) for (const k of Object.keys(d.boost)) d.boost[k] = integer(value.boost[k], 1, 1e6);
    if (Array.isArray(value.stars)) d.stars = value.stars.slice(0, LEVELS).map((n) => integer(n, 0, 3));
    if (isObject(value.daily) && typeof value.daily.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.daily.last)) {
      d.daily = { last: value.daily.last, streak: integer(value.daily.streak, 0, 1e6) };
    }
    d.active = activeRun(value.active, d.unlocked);
    return d;
  }
  function regenerate(save, now = Date.now()) {
    const before = [save.lives, save.lifeTs];
    if (save.lives >= MAX_LIVES) save.lifeTs = 0;
    else {
      if (!save.lifeTs || save.lifeTs > now) save.lifeTs = now;
      const earned = Math.floor((now - save.lifeTs) / LIFE_MS);
      save.lives = Math.min(MAX_LIVES, save.lives + earned);
      save.lifeTs = save.lives === MAX_LIVES ? 0 : save.lifeTs + earned * LIFE_MS;
    }
    return before[0] !== save.lives || before[1] !== save.lifeTs;
  }
  function localDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  const api = { KEY, MAX_LIVES, LIFE_MS, defaults, normalize, regenerate, localDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GumdropSave = Object.freeze(api);
})(typeof window === 'object' ? window : globalThis);
