/* Independent game rules, shared by the browser and deterministic regression tests. */
(function (root) {
  'use strict';
  const W = 720, H = 480;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (rng, n) => Math.floor(rng() * n);
  const shuffle = (items, rng) => { const a = items.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const base = () => ({ status: 'playing', score: 0, elapsed: 0, revision: 0 });
  const change = (s) => s.revision++;
  const end = (s, won, message) => { if (s.status !== 'playing') return; s.status = won ? 'won' : 'lost'; s.message = message; change(s); };
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const models = {};

  function snakeFruit(s, rng) {
    const empty = [];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (!s.body.some((p) => p.x === x && p.y === y)) empty.push({ x, y });
    s.fruit = empty.length ? empty[rand(rng, empty.length)] : null;
  }
  models.snake = {
    create(rng) { const s = { ...base(), body: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }], dx: 1, dy: 0, queued: null, clock: 0 }; snakeFruit(s, rng); return s; },
    action(s, a) { if (a.kind === 'direction' && Math.abs(a.dx) + Math.abs(a.dy) === 1 && (a.dx !== -s.dx || a.dy !== -s.dy) && !s.queued) s.queued = { dx: a.dx, dy: a.dy }; },
    tick(s, dt, rng) {
      s.clock += dt; const interval = Math.max(.07, .15 - s.score / 6000);
      if (s.clock < interval) return; s.clock -= interval;
      if (s.queued) { s.dx = s.queued.dx; s.dy = s.queued.dy; s.queued = null; }
      const head = { x: s.body[0].x + s.dx, y: s.body[0].y + s.dy };
      const eat = s.fruit && head.x === s.fruit.x && head.y === s.fruit.y;
      const solid = eat ? s.body : s.body.slice(0, -1);
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || solid.some((p) => p.x === head.x && p.y === head.y)) { end(s, false, 'A close encounter. Try a new route.'); return; }
      s.body.unshift(head);
      if (eat) { s.score += 10; snakeFruit(s, rng); if (!s.fruit) end(s, true, 'You filled the entire grid!'); } else s.body.pop();
      change(s);
    }
  };

  function resetBall(s) { s.ball = { x: s.paddle, y: 417, vx: 165, vy: -230 }; }
  models.breakout = {
    create() {
      const s = { ...base(), paddle: W / 2, axis: 0, lives: 3, bricks: [] };
      for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) s.bricks.push({ x: 30 + c * 66, y: 58 + r * 28, w: 60, h: 20, row: r, alive: true });
      resetBall(s); return s;
    },
    action(s, a) { if (a.kind === 'axis') s.axis = clamp(a.value, -1, 1); if (a.kind === 'pointer') s.paddle = clamp(a.x, 60, W - 60); },
    tick(s, dt) {
      s.paddle = clamp(s.paddle + s.axis * 480 * dt, 60, W - 60); const b = s.ball;
      const oldX = b.x, oldY = b.y; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 9 || b.x > W - 9) { b.x = clamp(b.x, 9, W - 9); b.vx *= -1; }
      if (b.y < 9) { b.y = 9; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && oldY <= 437 && b.y >= 437 && Math.abs(b.x - s.paddle) <= 65) {
        b.y = 436; b.vx = (b.x - s.paddle) * 5; b.vy = -Math.max(190, 310 - Math.abs(b.vx) * .15);
      }
      for (const brick of s.bricks) if (brick.alive && overlap({ x: b.x - 8, y: b.y - 8, w: 16, h: 16 }, brick)) {
        brick.alive = false; s.score += (5 - brick.row) * 20;
        if (oldX + 8 <= brick.x || oldX - 8 >= brick.x + brick.w) b.vx *= -1; else b.vy *= -1;
        change(s); break;
      }
      if (s.bricks.every((brick) => !brick.alive)) { end(s, true, 'Every prism cleared. Beautiful work.'); return; }
      if (b.y > H + 10) { s.lives--; change(s); if (s.lives <= 0) end(s, false, 'Out of balls. A fresh wall is waiting.'); else resetBall(s); }
    }
  };

  function spawnWave(s) {
    s.enemies = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) s.enemies.push({ x: 115 + c * 70, y: 42 + r * 42, w: 30, h: 24, alive: true });
    s.direction = 1; s.enemyClock = 0; s.shotClock = 0; s.bullets = []; s.hostile = [];
  }
  models.space = {
    create() { const s = { ...base(), player: W / 2, axis: 0, firing: false, lives: 3, wave: 1, invincible: 0 }; spawnWave(s); return s; },
    action(s, a) { if (a.kind === 'axis') s.axis = clamp(a.value, -1, 1); if (a.kind === 'pointer') s.player = clamp(a.x, 20, W - 20); if (a.kind === 'fire') s.firing = a.value; },
    tick(s, dt, rng) {
      s.player = clamp(s.player + s.axis * 340 * dt, 20, W - 20); s.invincible = Math.max(0, s.invincible - dt); s.shotClock -= dt;
      if (s.firing && s.shotClock <= 0) { s.bullets.push({ x: s.player, y: 420 }); s.shotClock = .18; }
      const alive = s.enemies.filter((e) => e.alive);
      const speed = 18 + s.wave * 8 + (21 - alive.length) * 1.5;
      let edge = false;
      for (const e of alive) { e.x += s.direction * speed * dt; if (e.x < 12 || e.x + e.w > W - 12) edge = true; }
      if (edge) { s.direction *= -1; for (const e of alive) { e.y += 18; e.x = clamp(e.x, 12, W - 12 - e.w); } }
      s.enemyClock -= dt;
      if (s.enemyClock <= 0 && alive.length) { const e = alive[rand(rng, alive.length)]; s.hostile.push({ x: e.x + e.w / 2, y: e.y + e.h }); s.enemyClock = Math.max(.4, 1.4 - s.wave * .15); }
      for (const bullet of s.bullets) {
        bullet.y -= 430 * dt;
        for (const e of alive) if (e.alive && bullet.x >= e.x - 4 && bullet.x <= e.x + e.w + 4 && bullet.y >= e.y && bullet.y <= e.y + e.h) { e.alive = false; bullet.y = -100; s.score += 25; change(s); break; }
      }
      for (const bullet of s.hostile) {
        bullet.y += (150 + s.wave * 18) * dt;
        if (s.invincible <= 0 && Math.abs(bullet.x - s.player) < 22 && bullet.y > 420 && bullet.y < 457) { bullet.y = H + 50; s.lives--; s.invincible = 1.5; change(s); }
      }
      s.bullets = s.bullets.filter((b) => b.y > -10); s.hostile = s.hostile.filter((b) => b.y < H + 10);
      if (s.lives <= 0 || alive.some((e) => e.alive && e.y + e.h >= 418)) { end(s, false, 'The orbit needs another defender.'); return; }
      if (s.enemies.every((e) => !e.alive)) { if (s.wave === 5) end(s, true, 'Five waves cleared. Orbit secured.'); else { s.wave++; s.score += 100; spawnWave(s); change(s); } }
    }
  };

  models.runner = {
    create() { return { ...base(), y: 356, vy: 0, obstacles: [], next: 1.6, speed: 245, distance: 0 }; },
    action(s, a) { if (a.kind === 'jump' && s.y >= 355) { s.vy = -545; change(s); } },
    tick(s, dt, rng) {
      s.speed = Math.min(510, 245 + s.elapsed * 3); s.distance += s.speed * dt; s.score = Math.floor(s.distance / 12);
      s.vy += 1450 * dt; s.y = Math.min(356, s.y + s.vy * dt); if (s.y >= 356) s.vy = 0;
      s.next -= dt;
      if (s.next <= 0) { const height = 32 + rand(rng, 28); s.obstacles.push({ x: W + 10, y: 394 - height, w: 26 + rand(rng, 20), h: height }); s.next = 1.1 + rng() * .6; }
      for (const obstacle of s.obstacles) { obstacle.x -= s.speed * dt; if (overlap({ x: 88, y: s.y + 3, w: 29, h: 35 }, obstacle)) end(s, false, 'A good run. The skyline is yours to try again.'); }
      s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10);
    }
  };

  function servePong(s, direction) { s.ball = { x: W / 2, y: H / 2, vx: direction * 280, vy: direction * 115 }; s.delay = .65; }
  models.pong = {
    create() { const s = { ...base(), player: H / 2, rival: H / 2, axis: 0, points: 0, opponent: 0 }; servePong(s, 1); return s; },
    action(s, a) { if (a.kind === 'axis') s.axis = clamp(a.value, -1, 1); if (a.kind === 'pointer') s.player = clamp(a.y, 48, H - 48); },
    tick(s, dt) {
      s.player = clamp(s.player + s.axis * 390 * dt, 48, H - 48);
      s.rival = clamp(s.rival + clamp(s.ball.y - s.rival, -235 * dt, 235 * dt), 48, H - 48);
      if (s.delay > 0) { s.delay -= dt; return; }
      const b = s.ball; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < 9 || b.y > H - 9) { b.y = clamp(b.y, 9, H - 9); b.vy *= -1; }
      if (b.vx < 0 && b.x <= 44 && b.x >= 20 && Math.abs(b.y - s.player) < 57) { b.x = 45; b.vx = Math.min(540, Math.abs(b.vx) * 1.06); b.vy = (b.y - s.player) * 6; }
      if (b.vx > 0 && b.x >= W - 44 && b.x <= W - 20 && Math.abs(b.y - s.rival) < 57) { b.x = W - 45; b.vx = -Math.min(540, Math.abs(b.vx) * 1.06); b.vy = (b.y - s.rival) * 6; }
      if (b.x < -15 || b.x > W + 15) {
        if (b.x > W) { s.points++; s.score += 100; } else s.opponent++;
        if (s.points === 7) end(s, true, 'Seven points. The rally is yours.');
        else if (s.opponent === 7) end(s, false, 'A worthy rival. Ready for the rematch?');
        else servePong(s, b.x > W ? -1 : 1); change(s);
      }
    }
  };

  models.memory = {
    create(rng) { return { ...base(), cards: shuffle([...Array(8).keys(), ...Array(8).keys()], rng), matched: Array(16).fill(false), open: [], wait: 0, turns: 0 }; },
    action(s, a) {
      const i = a.index; if (a.kind !== 'cell' || !Number.isInteger(i) || i < 0 || i >= 16 || s.wait || s.matched[i] || s.open.includes(i)) return;
      s.open.push(i); change(s);
      if (s.open.length === 2) {
        s.turns++;
        if (s.cards[s.open[0]] === s.cards[s.open[1]]) { s.matched[s.open[0]] = s.matched[s.open[1]] = true; s.open = []; s.score += 100; if (s.matched.every(Boolean)) { s.score += Math.max(0, 400 - s.turns * 10 - Math.floor(s.elapsed)); end(s, true, 'Every pair found. Your garden is complete.'); } }
        else s.wait = .9;
      }
    },
    tick(s, dt) { if (s.wait > 0) { s.wait = Math.max(0, s.wait - dt); if (!s.wait) { s.open = []; change(s); } } }
  };

  function mergeLine(values) {
    const compact = values.filter(Boolean), out = []; let score = 0;
    for (let i = 0; i < compact.length; i++) { if (compact[i] === compact[i + 1]) { const v = compact[i] * 2; out.push(v); score += v; i++; } else out.push(compact[i]); }
    return { values: [...out, ...Array(4 - out.length).fill(0)], score };
  }
  function addMergeTile(s, rng) { const free = s.cells.map((n, i) => n ? -1 : i).filter((i) => i >= 0); if (free.length) s.cells[free[rand(rng, free.length)]] = rng() < .9 ? 2 : 4; }
  function mergePossible(cells) { return cells.some((n, i) => !n || (i % 4 < 3 && n === cells[i + 1]) || (i < 12 && n === cells[i + 4])); }
  models.merge = {
    create(rng) { const s = { ...base(), cells: Array(16).fill(0), moves: 0 }; addMergeTile(s, rng); addMergeTile(s, rng); return s; },
    action(s, a, rng) {
      if (a.kind !== 'direction' || Math.abs(a.dx) + Math.abs(a.dy) !== 1) return;
      const before = s.cells.join(','); let earned = 0;
      for (let line = 0; line < 4; line++) {
        const indices = Array.from({ length: 4 }, (_, k) => a.dx ? line * 4 + (a.dx < 0 ? k : 3 - k) : (a.dy < 0 ? k : 3 - k) * 4 + line);
        const merged = mergeLine(indices.map((i) => s.cells[i])); earned += merged.score;
        indices.forEach((i, k) => { s.cells[i] = merged.values[k]; });
      }
      if (s.cells.join(',') === before) return;
      s.score += earned; s.moves++; addMergeTile(s, rng); change(s);
      if (s.cells.includes(2048)) end(s, true, '2048. A little patience goes a long way.');
      else if (!mergePossible(s.cells)) end(s, false, 'No spaces left. Start a new composition.');
    }
  };

  function neighbors(i, size) {
    const result = [], r = Math.floor(i / size), c = i % size;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && r + dr >= 0 && r + dr < size && c + dc >= 0 && c + dc < size) result.push((r + dr) * size + c + dc);
    return result;
  }
  function plantMines(s, safe, rng) {
    const exclude = new Set([safe, ...neighbors(safe, 9)]);
    const places = shuffle(Array.from({ length: 81 }, (_, i) => i).filter((i) => !exclude.has(i)), rng).slice(0, 10);
    s.mines = Array(81).fill(false); places.forEach((i) => { s.mines[i] = true; });
    s.counts = s.mines.map((_, i) => neighbors(i, 9).filter((j) => s.mines[j]).length); s.planted = true;
  }
  models.mines = {
    create() { return { ...base(), mines: Array(81).fill(false), counts: Array(81).fill(0), revealed: Array(81).fill(false), flags: Array(81).fill(false), flagMode: false, planted: false }; },
    action(s, a, rng) {
      if (a.kind === 'flag-mode') { s.flagMode = !s.flagMode; change(s); return; }
      const i = a.index; if (!Number.isInteger(i) || i < 0 || i >= 81 || s.revealed[i]) return;
      if (a.kind === 'flag' || (a.kind === 'cell' && s.flagMode)) { s.flags[i] = !s.flags[i]; change(s); return; }
      if (a.kind !== 'cell' || s.flags[i]) return;
      if (!s.planted) plantMines(s, i, rng);
      if (s.mines[i]) { s.revealed[i] = true; end(s, false, 'A hidden mine. The next first step is safe.'); return; }
      const queue = [i];
      while (queue.length) { const j = queue.pop(); if (s.revealed[j] || s.flags[j] || s.mines[j]) continue; s.revealed[j] = true; if (!s.counts[j]) queue.push(...neighbors(j, 9)); }
      s.score = s.revealed.filter(Boolean).length * 10; change(s);
      if (s.revealed.filter(Boolean).length === 71) { s.score += Math.max(0, 500 - Math.floor(s.elapsed)); end(s, true, 'All safe spaces found. Field secured.'); }
    }
  };

  const SUDOKU_PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
  const SUDOKU_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  function sudokuConflict(cells, i, value) {
    if (!value) return false; const r = Math.floor(i / 9), c = i % 9;
    return cells.some((v, j) => j !== i && v === value && (Math.floor(j / 9) === r || j % 9 === c || (Math.floor(Math.floor(j / 9) / 3) === Math.floor(r / 3) && Math.floor((j % 9) / 3) === Math.floor(c / 3))));
  }
  models.sudoku = {
    create(rng) { const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng); const map = (str) => [...str].map((n) => n === '0' ? 0 : digits[Number(n) - 1]); const cells = map(SUDOKU_PUZZLE); return { ...base(), cells, solution: map(SUDOKU_SOLUTION), given: cells.map(Boolean), selected: cells.indexOf(0), hints: 3 }; },
    action(s, a) {
      if (a.kind === 'cell' && Number.isInteger(a.index) && a.index >= 0 && a.index < 81) { s.selected = a.index; change(s); return; }
      const i = s.selected;
      if (s.given[i]) return;
      if (a.kind === 'number' && Number.isInteger(a.value) && a.value >= 0 && a.value <= 9) s.cells[i] = a.value;
      else if (a.kind === 'hint' && s.hints > 0) { s.cells[i] = s.solution[i]; s.hints--; }
      else return;
      s.score = Math.max(0, s.cells.filter((n, j) => n && !s.given[j] && !sudokuConflict(s.cells, j, n)).length * 20 - (3 - s.hints) * 100); change(s);
      if (s.cells.every((n, j) => n && !sudokuConflict(s.cells, j, n))) { s.score += Math.max(0, 600 - Math.floor(s.elapsed / 2)); end(s, true, 'Every number in its place.'); }
    }
  };

  function slideCell(s, i) { const blank = s.cells.indexOf(0); if (Math.abs(Math.floor(i / 4) - Math.floor(blank / 4)) + Math.abs(i % 4 - blank % 4) !== 1) return false; [s.cells[i], s.cells[blank]] = [s.cells[blank], s.cells[i]]; return true; }
  models.slide = {
    create(rng) {
      const s = { ...base(), cells: [...Array.from({ length: 15 }, (_, i) => i + 1), 0], moves: 0 };
      let previous = -1;
      for (let k = 0; k < 160; k++) { const blank = s.cells.indexOf(0); const choices = [blank - 4, blank + 4, ...(blank % 4 ? [blank - 1] : []), ...(blank % 4 < 3 ? [blank + 1] : [])].filter((i) => i >= 0 && i < 16 && i !== previous); const chosen = choices[rand(rng, choices.length)]; slideCell(s, chosen); previous = blank; }
      if (s.cells.every((n, i) => n === (i + 1) % 16)) slideCell(s, 14);
      return s;
    },
    action(s, a) {
      let i = a.index;
      if (a.kind === 'direction') { const blank = s.cells.indexOf(0), r = Math.floor(blank / 4) - a.dy, c = blank % 4 - a.dx; if (r < 0 || r > 3 || c < 0 || c > 3) return; i = r * 4 + c; }
      else if (a.kind !== 'cell') return;
      if (!Number.isInteger(i) || i < 0 || i >= 16 || !slideCell(s, i)) return;
      s.moves++; s.score = Math.max(0, 1000 - s.moves * 3 - Math.floor(s.elapsed)); change(s);
      if (s.cells.every((n, j) => n === (j + 1) % 16)) end(s, true, 'One to fifteen. Perfectly in order.');
    }
  };

  function lineWinner(cells, cols, rows, length) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const value = cells[r * cols + c]; if (!value) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const rr = r + dr * (length - 1), cc = c + dc * (length - 1);
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
        if (Array.from({ length }, (_, k) => cells[(r + k * dr) * cols + c + k * dc]).every((v) => v === value)) return value;
      }
    }
    return 0;
  }
  function connectDrop(cells, col, player) { for (let r = 5; r >= 0; r--) if (!cells[r * 7 + col]) { cells[r * 7 + col] = player; return r * 7 + col; } return -1; }
  function connectChoice(cells, rng) {
    const order = [3, 2, 4, 1, 5, 0, 6].filter((c) => !cells[c]);
    for (const player of [2, 1]) for (const col of order) { const board = cells.slice(); connectDrop(board, col, player); if (lineWinner(board, 7, 6, 4) === player) return col; }
    const safe = order.filter((col) => { const board = cells.slice(); connectDrop(board, col, 2); return !order.some((next) => { const b = board.slice(); if (connectDrop(b, next, 1) < 0) return false; return lineWinner(b, 7, 6, 4) === 1; }); });
    const candidates = safe.length ? safe : order; return candidates.length ? candidates[rand(rng, Math.min(3, candidates.length))] : -1;
  }
  function finishBoard(s, cols, rows, length) {
    const win = lineWinner(s.cells, cols, rows, length);
    if (win) { if (win === 1) s.score += 500; end(s, win === 1, win === 1 ? 'Your line. Your win.' : 'The computer found its line. Try again.'); return true; }
    if (s.cells.every(Boolean)) { s.status = 'draw'; s.message = 'A well-played draw. One more round?'; s.score += 100; change(s); return true; }
    return false;
  }
  models.connect = {
    create() { return { ...base(), cells: Array(42).fill(0), turn: 1, wait: 0, moves: 0 }; },
    action(s, a) { if (a.kind !== 'column' || s.turn !== 1 || !Number.isInteger(a.index) || a.index < 0 || a.index > 6 || connectDrop(s.cells, a.index, 1) < 0) return; s.moves++; s.score += 10; change(s); if (!finishBoard(s, 7, 6, 4)) { s.turn = 2; s.wait = .45; } },
    tick(s, dt, rng) { if (s.turn !== 2) return; s.wait -= dt; if (s.wait > 0) return; const col = connectChoice(s.cells, rng); if (col >= 0) connectDrop(s.cells, col, 2); finishBoard(s, 7, 6, 4); s.turn = 1; change(s); }
  };

  function tictacChoice(cells) {
    function search(board, player, depth) {
      const win = lineWinner(board, 3, 3, 3); if (win) return win === 2 ? 10 - depth : depth - 10;
      if (board.every(Boolean)) return 0;
      const values = []; for (let i = 0; i < 9; i++) if (!board[i]) { board[i] = player; values.push(search(board, 3 - player, depth + 1)); board[i] = 0; }
      return player === 2 ? Math.max(...values) : Math.min(...values);
    }
    let best = -Infinity, choice = -1;
    for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (!cells[i]) { cells[i] = 2; const value = search(cells, 1, 0); cells[i] = 0; if (value > best) { best = value; choice = i; } }
    return choice;
  }
  models.tictac = {
    create() { return { ...base(), cells: Array(9).fill(0), turn: 1, wait: 0 }; },
    action(s, a) { if (a.kind !== 'cell' || s.turn !== 1 || !Number.isInteger(a.index) || a.index < 0 || a.index > 8 || s.cells[a.index]) return; s.cells[a.index] = 1; s.score += 25; change(s); if (!finishBoard(s, 3, 3, 3)) { s.turn = 2; s.wait = .4; } },
    tick(s, dt) { if (s.turn !== 2) return; s.wait -= dt; if (s.wait > 0) return; const i = tictacChoice(s.cells); if (i >= 0) s.cells[i] = 2; finishBoard(s, 3, 3, 3); s.turn = 1; change(s); }
  };

  function simonRound(s, rng) { s.sequence.push(rand(rng, 4)); s.phase = 'watch'; s.clock = -.4; s.position = 0; s.lit = -1; change(s); }
  models.simon = {
    create(rng) { const s = { ...base(), sequence: [], phase: 'watch', clock: 0, position: 0, lit: -1 }; simonRound(s, rng); return s; },
    action(s, a, rng) {
      if (a.kind !== 'pad' || s.phase !== 'repeat' || !Number.isInteger(a.index) || a.index < 0 || a.index > 3) return;
      if (a.index !== s.sequence[s.position]) { end(s, false, 'The echo slipped away. Find the rhythm again.'); return; }
      s.position++; s.score += 10; change(s);
      if (s.position === s.sequence.length) { s.score += s.sequence.length * 20; if (s.sequence.length === 15) end(s, true, 'Fifteen flawless echoes.'); else simonRound(s, rng); }
    },
    tick(s, dt) {
      if (s.phase !== 'watch') return; s.clock += dt;
      const step = Math.floor(s.clock / .7);
      const lit = s.clock >= 0 && s.clock % .7 < .45 && step < s.sequence.length ? s.sequence[step] : -1;
      if (lit !== s.lit) { s.lit = lit; change(s); }
      if (step >= s.sequence.length) { s.phase = 'repeat'; s.position = 0; s.lit = -1; change(s); }
    }
  };

  const WORDS = [
    ['planet', 'A world orbiting a star'], ['garden', 'A place where flowers grow'], ['rhythm', 'A repeating pattern in music'], ['puzzle', 'A problem made for solving'], ['sunrise', 'The start of a new day'], ['journey', 'A trip from one place to another'],
    ['ocean', 'A vast body of salt water'], ['rocket', 'A vehicle that travels into space'], ['memory', 'The ability to remember'], ['bridge', 'A crossing over a river'], ['forest', 'A large area filled with trees'], ['copper', 'A reddish metal used in wires'],
    ['velvet', 'A soft fabric with a rich texture'], ['window', 'An opening that lets in light'], ['island', 'Land surrounded by water'], ['market', 'A place to buy and sell'], ['signal', 'A message or sign'], ['lantern', 'A portable light'], ['marble', 'A smooth stone or a small glass ball'], ['silver', 'A precious metal with a pale shine']
  ];
  function scramble(word, rng) { let out = shuffle([...word], rng).join(''); if (out === word) out = word.slice(1) + word[0]; return out; }
  function nextWord(s, rng) { s.scrambled = scramble(s.words[s.round][0], rng); s.hints = 0; s.feedback = ''; change(s); }
  models.words = {
    create(rng) { const s = { ...base(), words: shuffle(WORDS, rng).slice(0, 10), round: 0, solved: 0, hints: 0, feedback: '' }; nextWord(s, rng); return s; },
    action(s, a, rng) {
      if (a.kind === 'hint') { s.hints = Math.min(s.words[s.round][0].length, s.hints + 1); change(s); return; }
      if (a.kind === 'answer') {
        if (typeof a.value !== 'string') return;
        if (a.value.trim().toLowerCase() !== s.words[s.round][0]) { s.feedback = 'Not quite. Try another arrangement.'; change(s); return; }
        s.score += Math.max(10, 100 - s.hints * 15); s.solved++;
      } else if (a.kind !== 'skip') return;
      s.round++;
      if (s.round === 10) end(s, s.solved === 10, s.solved + ' of 10 words solved. A fine remix.'); else nextWord(s, rng);
    }
  };

  models.mole = {
    create(rng) { return { ...base(), holes: Array(9).fill(0), next: .2, remaining: 60, hits: 0 }; },
    action(s, a) { const i = a.index; if (a.kind === 'cell' && Number.isInteger(i) && i >= 0 && i < 9 && s.holes[i] > 0) { s.holes[i] = 0; s.hits++; s.score += 10; change(s); } },
    tick(s, dt, rng) {
      s.remaining = Math.max(0, s.remaining - dt); s.next -= dt;
      for (let i = 0; i < 9; i++) if (s.holes[i] > 0) { const old = s.holes[i]; s.holes[i] = Math.max(0, old - dt); if (!s.holes[i]) change(s); }
      if (s.next <= 0) { const free = s.holes.map((v, i) => v > 0 ? -1 : i).filter((i) => i >= 0); if (free.length) { s.holes[free[rand(rng, free.length)]] = Math.max(.45, 1.05 - s.elapsed / 120); change(s); } s.next = Math.max(.22, .65 - s.elapsed / 140); }
      if (!s.remaining) end(s, true, s.hits + ' critters caught. A minute well spent.');
    }
  };

  Object.assign(models, (typeof module === 'object' && module.exports ? require('./arena-engine.js') : root.ArenaModels).models);
  function create(id, rng = Math.random) { if (!models[id]) throw new Error('Unknown game: ' + id); return models[id].create(rng); }
  function action(id, s, a, rng = Math.random) { if (s.status === 'playing') models[id].action?.(s, a, rng); }
  function tick(id, s, dt, rng = Math.random) { if (s.status !== 'playing' || !Number.isFinite(dt) || dt < 0) return; s.elapsed += dt; models[id].tick?.(s, dt, rng); }
  const api = { models, create, action, tick, W, H, mergeLine, mergePossible, neighbors, sudokuConflict, lineWinner, connectChoice, tictacChoice, shuffle };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeEngine = Object.freeze(api);
})(typeof window === 'object' ? window : globalThis);
