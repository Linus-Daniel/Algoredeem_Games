const test = require('node:test');
const assert = require('node:assert/strict');
const { defaults, normalize, regenerate, localDate, LIFE_MS } = require('../assets/save.js');
test('invalid saves cannot corrupt balances, stars or nested state', () => {
  for (const value of [null, [], 'text', 42]) assert.deepEqual(normalize(value), defaults());
  const save = normalize({ lives: -2, coins: '900', gems: null, stars: [99, -1, '3'], boost: { hammer: -4, shuffle: 3 }, unlocked: 999, daily: { last: {}, streak: -2 }, sound: 'yes', active: {} });
  assert.equal(save.lives, 5); assert.equal(save.coins, 100); assert.equal(save.gems, 5);
  assert.deepEqual(save.stars, [3, 0, 0]); assert.deepEqual(save.boost, { hammer: 1, shuffle: 3, moves: 1 });
  assert.equal(save.unlocked, 39); assert.equal(save.sound, true); assert.equal(save.active, null);
});
test('v2 progress migrates without keeping payment or unknown properties', () => {
  const save = normalize({ coins: 345, gems: 19, noAds: true, unlocked: 4, stars: [3, 2], daily: { last: '2026-11-15', streak: 5 }, boost: { hammer: 0, shuffle: 2, moves: 4, rogue: 8 } });
  assert.equal(save.version, 3); assert.equal(save.coins, 345); assert.equal(save.unlocked, 4);
  assert.equal(save.noAds, undefined); assert.equal(save.boost.rogue, undefined);
  assert.deepEqual(save.daily, { last: '2026-11-15', streak: 5 });
});
test('only complete, bounded and unlocked active runs can resume', () => {
  const active = { level: 0, moves: 12, totalMoves: 22, score: 120, collected: 0,
    board: Array.from({ length: 64 }, () => ({ t: 0, sp: null })), jelly: Array(64).fill(false) };
  assert.deepEqual(normalize({ active }).active, active);
  for (const edit of [{ level: 40 }, { level: 1 }, { moves: -1 }, { moves: Infinity }, { score: '1' }, { totalMoves: 0 }, { board: active.board.slice(1) }, { jelly: Array(64).fill(0) }]) {
    assert.equal(normalize({ active: { ...active, ...edit } }).active, null);
  }
  active.board[0] = { t: -1, sp: 'bomb' }; assert.ok(normalize({ active }).active);
  active.board[0] = { t: 0, sp: 'bomb' }; assert.equal(normalize({ active }).active, null);
});
test('life regeneration handles elapsed intervals, full lives and clock rollback', () => {
  const now = 10 * LIFE_MS;
  const save = normalize({ lives: 1, lifeTs: now - LIFE_MS * 2 - 500 }, now);
  assert.equal(regenerate(save, now), true); assert.equal(save.lives, 3); assert.equal(save.lifeTs, now - 500);
  assert.equal(regenerate(save, now), false);
  regenerate(save, now + 10 * LIFE_MS); assert.equal(save.lives, 5); assert.equal(save.lifeTs, 0);
  const future = normalize({ lives: 0, lifeTs: now + LIFE_MS * 50 }, now);
  assert.equal(future.lifeTs, now); assert.equal(regenerate(future, now), false);
});
test('daily reward dates use local calendar fields independent of locale', () => {
  assert.equal(localDate(new Date(2026, 0, 2, 1)), '2026-01-02');
  assert.equal(localDate(new Date(2026, 10, 16, 23)), '2026-11-16');
});
