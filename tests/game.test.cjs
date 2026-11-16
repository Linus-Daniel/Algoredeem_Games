const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('./game-harness.cjs');
const settledBoard = () => Array.from({ length: 64 }, (_, i) => (Math.floor(i / 8) + i % 8) % 5);
test('all 40 levels generate settled playable boards, including bounded fallback', (t) => {
  const h = createGame(); t.after(() => h.close());
  for (let level = 0; level < 40; level++) for (let sample = 0; sample < 10; sample++) {
    h.game.setup({ level }); assert.equal(h.game.findMatches().length, 0); assert.ok(h.game.findMove());
    assert.equal(h.game.snapshot().board.length, 64);
  }
  h.context.Math.random = () => 0; h.game.newBoard(); assert.equal(h.game.findMatches().length, 0); assert.ok(h.game.findMove());
});
test('invalid swaps restore the board and valid swaps consume one move and settle', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup({ def: { kind: 'score', target: 1e8 } });
  let pair;
  for (let i = 0; i < 63; i++) if (i % 8 !== 7 && !h.game.validSwap(i, i + 1)) { pair = [i, i + 1]; break; }
  const before = h.game.snapshot(); await h.game.trySwap(...pair);
  assert.deepEqual(h.game.snapshot().board, before.board); assert.equal(h.game.snapshot().moves, before.moves);
  const move = h.game.findMove(); await h.game.trySwap(move.a, move.b); await h.settled();
  const after = h.game.snapshot(); assert.equal(after.moves, before.moves - 1); assert.ok(after.score > 0);
  assert.equal(h.game.findMatches().length, 0); assert.ok(after.board.every((tile) => tile && tile.s === 1 && tile.a === 1));
  assert.equal(after.save.active.score, after.score); assert.equal(after.save.active.moves, after.moves);
});
test('line, crossing and five matches create the correct specials', (t) => {
  const h = createGame(); t.after(() => h.close());
  for (const [positions, special] of [[[0, 1, 2, 3], 'v'], [[0, 1, 2, 3, 4], 'bomb'], [[0, 1, 2, 8, 16], 'blast']]) {
    const board = settledBoard(); for (const i of positions) board[i] = 5;
    h.game.setup({ board }); const group = h.game.findMatches().find((g) => g.set.has(0));
    assert.equal(h.game.planSpecial(group).sp, special);
  }
});
test('hammer clears jelly and collection targets without spending a move', async (t) => {
  const h = createGame(); t.after(() => h.close());
  const jelly = Array(64).fill(false); jelly[0] = true; jelly[63] = true;
  h.game.setup({ board: settledBoard(), jelly, def: { kind: 'collect', ct: 0, cn: 999 } });
  const before = h.game.snapshot(); await h.game.doHammer(0); await h.settled();
  const after = h.game.snapshot(); assert.equal(after.moves, before.moves); assert.equal(after.jelly[0], false);
  assert.equal(after.save.boost.hammer, 0); assert.ok(after.score > 0);
});
test('winning grants gems once, unlocks the next level and clears the checkpoint', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup({ moves: 15 });
  const before = h.game.snapshot().save; await h.game.finish(true); await h.game.finish(true);
  const after = h.game.snapshot().save; assert.equal(after.gems - before.gems, 9); assert.equal(after.wins - before.wins, 1);
  assert.equal(after.coins - before.coins, 95); assert.equal(after.stars[0], 3); assert.equal(after.active, null);
});
test('failure charges one life immediately and returning to the map does not charge again', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup({ moves: 0 });
  await h.game.finish(false); assert.equal(h.game.snapshot().save.lives, 4);
  h.game.showMap(); assert.equal(h.game.snapshot().save.lives, 4); assert.equal(h.game.snapshot().save.active, null);
});
test('a saved turn survives a fresh runtime with the exact same board and balances', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup({ def: { kind: 'score', target: 1e8 } });
  const move = h.game.findMove(); await h.game.trySwap(move.a, move.b); await h.settled();
  const saved = h.game.snapshot(); const restored = createGame({ rawSave: h.data.get('gumdrop-grid-save-v2') }); t.after(() => restored.close());
  restored.game.resumeLevel(); await restored.settled(); const state = restored.game.snapshot();
  assert.deepEqual(state.board.map((b) => ({ t: b.t, sp: b.sp })), saved.board.map((b) => ({ t: b.t, sp: b.sp })));
  assert.equal(state.moves, saved.moves); assert.equal(state.score, saved.score); assert.equal(state.save.gems, saved.save.gems);
});
test('unavailable storage still boots and displays a save notice', (t) => {
  const h = createGame({ noStorage: true }); t.after(() => h.close()); assert.equal(h.document.getElementById('saveNotice').hidden, false);
  assert.ok(h.document.getElementById('map').children.length);
});
test('keyboard selection cancels with Escape and modals make the app inert', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup(); const canvas = h.document.getElementById('board');
  await canvas.dispatch('keydown', { key: 'Enter' }); assert.ok(h.game.snapshot().selected >= 0);
  await canvas.dispatch('keydown', { key: 'Escape' }); assert.equal(h.game.snapshot().selected, -1);
  await h.document.getElementById('helpBtn').dispatch('click'); assert.equal(h.document.querySelector('.app').inert, true);
  assert.equal(h.document.querySelector('.modalWrap').getAttribute('aria-labelledby'), 'dialogTitle');
  h.game.closeModal(); assert.equal(h.document.querySelector('.app').inert, false);
});
test('a real level start settles, saves its board and rejects locked levels', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.closeModal();
  await h.game.startLevel(1); assert.equal(h.game.snapshot().inGame, false);
  await h.game.startLevel(0); const state = h.game.snapshot();
  assert.equal(state.busy, false); assert.equal(state.moves, 22); assert.equal(state.save.active.level, 0);
  assert.equal(h.game.findMatches().length, 0); assert.ok(h.game.findMove());
  const arcade = JSON.parse(h.data.get('algoredeem-games-profile-v1'));
  assert.equal(arcade.stats.gumdrop.plays, 1); assert.equal(arcade.recent[0], 'gumdrop');
});
test('an unfinished move does not partially write board or balance changes', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.setup({ def: { kind: 'score', target: 1e8 } });
  const saved = h.data.get('gumdrop-grid-save-v2'), move = h.game.findMove();
  const action = h.game.trySwap(move.a, move.b);
  assert.equal(h.game.snapshot().busy, true); assert.equal(h.data.get('gumdrop-grid-save-v2'), saved);
  await action; await h.settled();
  const committed = JSON.parse(h.data.get('gumdrop-grid-save-v2'));
  assert.equal(committed.active.moves, h.game.snapshot().moves); assert.equal(committed.gems, h.game.snapshot().save.gems);
});
test('missing ad configuration disables reward buttons and never creates free ad coins', async (t) => {
  const h = createGame(); t.after(() => h.close()); h.game.closeModal();
  const coins = h.game.snapshot().save.coins;
  await h.document.getElementById('coinsChip').dispatch('click');
  const modal = h.document.querySelector('.modalWrap');
  const watch = modal.querySelectorAll('button').find((b) => b.textContent === 'Watch');
  assert.equal(watch.disabled, true); assert.equal(h.game.snapshot().save.coins, coins);
});
