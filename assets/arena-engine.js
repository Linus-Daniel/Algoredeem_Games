/* Sports, driving and action rules. Rendering never changes simulation state. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const state = () => ({ status: 'playing', score: 0, elapsed: 0, revision: 0, flash: 0, feedback: '', dx: 0, dy: 0 });
  const finish = (s, won, message) => { if (s.status !== 'playing') return; s.status = won ? 'won' : 'lost'; s.message = message; s.revision++; };
  const feedback = (s, message) => { s.feedback = message; s.flash = 1.2; s.revision++; };
  const power = (s) => .5 + .5 * Math.sin(s.elapsed * 2.3);
  const move = (s, a) => { if (a.kind === 'move') { s.dx = clamp(a.dx || 0, -1, 1); s.dy = clamp(a.dy || 0, -1, 1); } };
  const vector = (from, to, speed) => { const d = Math.max(1, distance(from, to)); return { vx: (to.x - from.x) / d * speed, vy: (to.y - from.y) / d * speed }; };
  const models = {};

  models.penalty = {
    create(rng) { return { ...state(), aim: { x: 220, y: 165 }, keeper: 360, keeperTarget: 360, keeperY: 190, shot: null, goals: 0, attempts: 0, results: [], delay: 0, seed: rng() * 6 }; },
    action(s, a, rng) {
      if (a.kind === 'pointer' && !s.shot && !s.delay) s.aim = { x: clamp(a.x, 90, 630), y: clamp(a.y, 95, 260) };
      if (a.kind === 'move' && !s.shot) { s.dx = a.dx; s.dy = a.dy; }
      if (a.kind === 'primary' && !s.shot && !s.delay) {
        const p = power(s); s.attempts++; s.keeperTarget = 170 + rng() * 380; s.keeperY = 150 + rng() * 85;
        s.shot = { x: 360, y: 402, start: { x: 360, y: 402 }, target: { x: s.aim.x, y: s.aim.y - Math.max(0, p - .91) * 420 }, t: 0, duration: .9 - p * .32, power: p };
      }
    },
    tick(s, dt) {
      s.aim.x = clamp(s.aim.x + s.dx * 230 * dt, 90, 630); s.aim.y = clamp(s.aim.y + s.dy * 170 * dt, 95, 260);
      if (s.delay) { s.delay = Math.max(0, s.delay - dt); if (!s.delay && s.attempts >= 5) finish(s, s.goals >= 3, s.goals + ' goals from five penalties.'); return; }
      if (!s.shot) { s.keeper = 360 + Math.sin(s.elapsed * 1.4 + s.seed) * 80; return; }
      const b = s.shot; b.t = Math.min(1, b.t + dt / b.duration); b.x = b.start.x + (b.target.x - b.start.x) * b.t; b.y = b.start.y + (b.target.y - b.start.y) * b.t - Math.sin(b.t * Math.PI) * 45;
      s.keeper += clamp(s.keeperTarget - s.keeper, -310 * dt, 310 * dt);
      if (b.t === 1) {
        const inside = b.target.x > 152 && b.target.x < 568 && b.target.y > 113 && b.target.y < 242;
        const saved = Math.abs(b.target.x - s.keeper) < 72 && Math.abs(b.target.y - s.keeperY) < 64;
        const goal = inside && !saved; if (goal) { s.goals++; s.score += 200 + Math.floor(b.power * 80); }
        s.results.push(goal); feedback(s, goal ? 'GOAL! The crowd erupts.' : inside ? 'SAVED! Find the other corner.' : 'OFF TARGET! Keep the power controlled.'); s.shot = null; s.delay = 1.25;
      }
    }
  };

  const resetFootball = (s, direction = 1) => { s.player = { x: 240, y: 240 }; s.rival = { x: 480, y: 240 }; s.ball = { x: 360, y: 240, vx: direction * 40, vy: 0 }; s.target = null; s.delay = .8; };
  models.football = {
    create() { const s = { ...state(), goals: 0, against: 0, remaining: 90, kickClock: 0, rivalClock: 0 }; resetFootball(s); return s; },
    action(s, a) {
      move(s, a); if (a.kind === 'pointer') s.target = { x: clamp(a.x, 65, 655), y: clamp(a.y, 85, 410) };
      if (a.kind === 'move') s.target = null;
      if (a.kind === 'primary' && !s.delay && s.kickClock <= 0 && distance(s.player, s.ball) < 48) { Object.assign(s.ball, vector(s.ball, { x: 710, y: 240 + s.dy * 70 }, 620)); s.kickClock = .5; feedback(s, 'SHOT ON GOAL'); }
    },
    tick(s, dt) {
      s.remaining = Math.max(0, s.remaining - dt); if (!s.remaining) { finish(s, s.goals > s.against, 'Full time: ' + s.goals + ' – ' + s.against + '.'); return; }
      s.kickClock -= dt; s.rivalClock -= dt; if (s.delay > 0) { s.delay -= dt; return; }
      let dx = s.dx, dy = s.dy;
      if (s.target) { const d = distance(s.player, s.target); dx = d > 8 ? (s.target.x - s.player.x) / d : 0; dy = d > 8 ? (s.target.y - s.player.y) / d : 0; }
      const norm = Math.max(1, Math.hypot(dx, dy)); s.player.x = clamp(s.player.x + dx / norm * 215 * dt, 58, 662); s.player.y = clamp(s.player.y + dy / norm * 215 * dt, 82, 413);
      const aim = s.ball.x > 345 ? s.ball : { x: 490, y: clamp(s.ball.y, 135, 345) }; const v = vector(s.rival, aim, 145); s.rival.x = clamp(s.rival.x + v.vx * dt, 340, 655); s.rival.y = clamp(s.rival.y + v.vy * dt, 85, 410);
      if (distance(s.player, s.ball) < 29 && s.kickClock <= 0) { s.ball.vx = dx / norm * 260 + 70; s.ball.vy = dy / norm * 260; }
      if (distance(s.rival, s.ball) < 32 && s.rivalClock <= 0) { Object.assign(s.ball, vector(s.ball, { x: 0, y: 240 }, 380)); s.rivalClock = .8; }
      const b = s.ball; b.x += b.vx * dt; b.y += b.vy * dt; const drag = Math.exp(-.7 * dt); b.vx *= drag; b.vy *= drag;
      if (b.y < 75 || b.y > 420) { b.y = clamp(b.y, 75, 420); b.vy *= -.85; }
      if (b.x < 49 || b.x > 671) {
        if (b.y > 192 && b.y < 288) { const goal = b.x > 671; if (goal) { s.goals++; s.score += 300; } else s.against++; feedback(s, goal ? 'GOAL! Algoredeem takes the lead.' : 'The rival scores. Win it back.'); resetFootball(s, goal ? -1 : 1); }
        else { b.x = clamp(b.x, 49, 671); b.vx *= -.85; }
      }
    }
  };

  function roadCreate(rally) { return { ...state(), x: 0, speed: 0, distance: 0, integrity: 100, nitro: 100, boost: false, traffic: [], next: 1.3, invincible: 0, remaining: rally ? 75 : 120, checkpoint: 1, rally }; }
  const curve = (s) => s.rally ? Math.sin(s.distance / 420) * .65 + Math.sin(s.distance / 950) * .3 : Math.sin(s.distance / 1400) * .15;
  function roadTick(s, dt, rng) {
    s.remaining = Math.max(0, s.remaining - dt); s.invincible = Math.max(0, s.invincible - dt);
    const boosting = s.boost && s.nitro > 0 && s.dy <= 0; s.nitro = clamp(s.nitro + (boosting ? -32 : 10) * dt, 0, 100);
    const target = s.dy > 0 ? 65 : boosting ? 340 : s.rally ? 210 : 240; s.speed += clamp(target - s.speed, -170 * dt, 75 * dt);
    s.x = clamp(s.x + s.dx * dt * (1.05 + s.speed / 300) - curve(s) * s.speed / 300 * dt, -1.55, 1.55);
    const offroad = Math.abs(s.x) > 1.02; if (offroad) { s.speed = Math.max(45, s.speed - 200 * dt); s.integrity = Math.max(0, s.integrity - (s.rally ? 4 : 10) * dt); }
    s.distance += s.speed * dt; s.score = Math.floor(s.distance / 5); s.next -= dt;
    if (s.next <= 0) { s.traffic.push({ x: (Math.floor(rng() * 3) - 1) * .64, z: 1300, speed: s.rally ? 0 : 60 + rng() * 65, color: Math.floor(rng() * 4) }); s.next = s.rally ? 1.4 + rng() * 1.4 : .9 + rng() * .7; }
    for (const car of s.traffic) { const before = car.z; car.z -= (s.speed - car.speed) * dt; if (!s.invincible && before >= 0 && car.z <= 35 && car.z >= -45 && Math.abs(car.x - s.x) < .29) { s.integrity = Math.max(0, s.integrity - 25); s.speed *= .45; s.invincible = 1.4; car.z = -100; feedback(s, s.rally ? 'BARRIER HIT — recover your line' : 'CONTACT — protect your car'); } }
    s.traffic = s.traffic.filter(c => c.z > -120 && c.z < 1800);
    if (s.rally && s.distance >= s.checkpoint * 1200 && s.checkpoint <= 3) { s.remaining += 12; s.checkpoint++; feedback(s, 'CHECKPOINT +12 seconds'); }
    if (s.integrity <= 0) finish(s, false, 'Your vehicle needs repairs.');
    else if (s.distance >= (s.rally ? 4800 : 6000)) { s.score += Math.floor(s.integrity * 10 + s.remaining * 5); finish(s, true, s.rally ? 'Rally complete. Four sectors mastered.' : 'Finish line reached. The night belongs to you.'); }
    else if (!s.remaining) finish(s, false, 'Time expired. Brake less and find a cleaner line.');
  }
  for (const id of ['racing', 'rally']) models[id] = {
    create() { return roadCreate(id === 'rally'); },
    action(s, a) { move(s, a); if (a.kind === 'boost') s.boost = !!a.value; if (a.kind === 'pointer') s.x = clamp((a.x - 360) / 190, -1.5, 1.5); }, tick: roadTick
  };

  models.kart = {
    create() { return { ...state(), angle: -Math.PI / 2, progress: 0, radius: 1, speed: 0, boost: false, nitro: 100, lap: 1, remaining: 65, rivalProgress: 0, trail: [] }; },
    action(s, a) { move(s, a); if (a.kind === 'boost') s.boost = !!a.value; if (a.kind === 'pointer') s.radius = clamp(Math.hypot((a.x - 360) / 250, (a.y - 250) / 145), .55, 1.5); },
    tick(s, dt) {
      const boosting = s.boost && s.nitro > 0; s.nitro = clamp(s.nitro + (boosting ? -27 : 9) * dt, 0, 100);
      s.radius = clamp(s.radius + s.dx * dt * .6, .55, 1.5); const onTrack = s.radius >= .8 && s.radius <= 1.2;
      const desired = s.dy > 0 ? .5 : !onTrack ? .45 : boosting ? 1.9 : 1.35; s.speed += clamp(desired - s.speed, -2 * dt, dt);
      const advance = s.speed * dt / s.radius; s.progress += advance; s.angle += advance; s.lap = Math.min(3, Math.floor(s.progress / (Math.PI * 2)) + 1); s.rivalProgress += 1.23 * dt;
      s.remaining = Math.max(0, s.remaining - dt); s.score = Math.floor(s.progress * 100);
      if (s.progress >= Math.PI * 6) { s.score += Math.floor(s.remaining * 25); finish(s, s.progress >= s.rivalProgress, s.progress >= s.rivalProgress ? 'Three laps. First across the line!' : 'Three laps complete. Your rival got there first.'); }
      else if (s.rivalProgress >= Math.PI * 6) finish(s, false, 'The rival wins. Use the inside line and save your boost.');
      else if (!s.remaining) finish(s, false, 'Race time expired.');
    }
  };

  models.basket = {
    create() { return { ...state(), aim: { x: 525, y: 158 }, ball: null, remaining: 60, baskets: 0, attempts: 0, combo: 0 }; },
    action(s, a) {
      if (a.kind === 'pointer') s.aim = { x: clamp(a.x, 350, 670), y: clamp(a.y, 85, 320) };
      move(s, a);
      if (a.kind === 'primary' && !s.ball) { const t = .7 + power(s) * .45; s.ball = { x: 165, y: 375, vx: (s.aim.x - 165) / t, vy: (s.aim.y - 375 - .5 * 750 * t * t) / t, scored: false, trail: [] }; s.attempts++; }
    },
    tick(s, dt) {
      s.remaining = Math.max(0, s.remaining - dt); s.aim.x = clamp(s.aim.x + s.dx * 170 * dt, 350, 670); s.aim.y = clamp(s.aim.y + s.dy * 150 * dt, 85, 320);
      const b = s.ball; if (b) {
        const oldY = b.y; b.vy += 750 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 18) b.trail.shift();
        if (b.vy > 0 && oldY <= 180 && b.y >= 180 && Math.abs(b.x - 550) < 29 && !b.scored) { b.scored = true; s.baskets++; s.combo++; s.score += 100 + Math.min(5, s.combo) * 20; feedback(s, 'SWISH! Combo ×' + s.combo); }
        if (b.x > 608 && b.y > 105 && b.y < 185) { b.x = 607; b.vx = -Math.abs(b.vx) * .6; }
        if (b.y > 450 || b.x > 735 || b.x < -20) { if (!b.scored) { s.combo = 0; feedback(s, 'Find the arc. Aim near the rim.'); } s.ball = null; }
      }
      if (!s.remaining) finish(s, s.baskets >= 5, s.baskets + ' baskets. ' + (s.baskets >= 5 ? 'Court cleared.' : 'Five baskets unlock the win.'));
    }
  };

  const pinPositions = () => Array.from({ length: 10 }, (_, i) => { const row = i < 1 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3; const start = row * (row + 1) / 2; return { x: 360 + (i - start - row / 2) * 32, y: 145 - row * 26, alive: true, fall: 0 }; });
  models.bowling = {
    create() { return { ...state(), aim: 360, ball: null, pins: pinPositions(), frame: 1, roll: 0, knocked: 0, total: 0, delay: 0, gutter: false }; },
    action(s, a) { move(s, a); if (a.kind === 'pointer' && !s.ball) s.aim = clamp(a.x, 230, 490); if (a.kind === 'primary' && !s.ball && !s.delay) { const p = power(s); s.ball = { x: 360, y: 417, vx: (s.aim - 360) * 1.4, vy: -260 - p * 180, spin: 0, strength: p }; s.roll++; s.gutter = false; } },
    tick(s, dt) {
      s.aim = clamp(s.aim + s.dx * 160 * dt, 230, 490);
      if (s.delay) { s.delay = Math.max(0, s.delay - dt); if (!s.delay && (s.roll >= 2 || s.pins.every(p => !p.alive))) { s.frame++; s.roll = 0; if (s.frame > 10) finish(s, s.total >= 60, s.total + ' pins across ten frames.'); else { s.pins = pinPositions(); s.knocked = 0; } } return; }
      const b = s.ball; if (!b) return; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 9;
      if (b.x < 252 || b.x > 468) s.gutter = true;
      if (!s.gutter) for (const p of s.pins) if (p.alive && distance(b, p) < 25) {
        p.alive = false; p.fall = 1; s.total++; s.knocked++; s.score += 10;
        for (const q of s.pins) if (q.alive && q.y <= p.y && distance(p, q) < 50 + b.strength * 15) { q.alive = false; q.fall = 1; s.total++; s.knocked++; s.score += 10; }
      }
      if (b.y < 35) { const strike = s.roll === 1 && s.pins.every(p => !p.alive); if (strike) s.score += 50; feedback(s, strike ? 'STRIKE! All ten down.' : s.gutter ? 'GUTTER BALL. Adjust your line.' : s.knocked + ' pins down.'); s.ball = null; s.delay = 1; }
    }
  };

  const golfHole = (s) => { s.ball = { x: 110, y: 350, vx: 0, vy: 0 }; s.cup = { x: 585, y: 135 + (s.hole % 3) * 65 }; s.aim = { ...s.cup }; s.walls = [{ x: 260, y: 70, w: 25, h: 205 - s.hole * 12 }, { x: 420, y: 255, w: 25, h: 170 }]; s.strokes = 0; };
  models.golf = {
    create() { const s = { ...state(), hole: 1, totalStrokes: 0, delay: 0 }; golfHole(s); return s; },
    action(s, a) { move(s, a); if (a.kind === 'pointer') s.aim = { x: a.x, y: a.y }; if (a.kind === 'primary' && !s.delay && Math.hypot(s.ball.vx, s.ball.vy) < 6) { Object.assign(s.ball, vector(s.ball, s.aim, 100 + power(s) * 590)); s.strokes++; s.totalStrokes++; s.revision++; } },
    tick(s, dt) {
      s.aim.x = clamp(s.aim.x + s.dx * 200 * dt, 40, 680); s.aim.y = clamp(s.aim.y + s.dy * 200 * dt, 65, 430);
      if (s.delay) { s.delay = Math.max(0, s.delay - dt); if (!s.delay) { s.hole++; if (s.hole > 5) finish(s, true, 'Five holes in ' + s.totalStrokes + ' strokes.'); else golfHole(s); } return; }
      const b = s.ball, oldX = b.x, oldY = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-1.25 * dt); b.vy *= Math.exp(-1.25 * dt);
      if (b.x < 65 || b.x > 655) { b.x = clamp(b.x, 65, 655); b.vx *= -.8; } if (b.y < 85 || b.y > 420) { b.y = clamp(b.y, 85, 420); b.vy *= -.8; }
      for (const wall of s.walls) if (b.x > wall.x - 9 && b.x < wall.x + wall.w + 9 && b.y > wall.y - 9 && b.y < wall.y + wall.h + 9) {
        if (oldX <= wall.x - 9 || oldX >= wall.x + wall.w + 9) { b.x = oldX <= wall.x - 9 ? wall.x - 10 : wall.x + wall.w + 10; b.vx *= -.8; }
        else { b.y = oldY <= wall.y - 9 ? wall.y - 10 : wall.y + wall.h + 10; b.vy *= -.8; }
      }
      if (distance(b, s.cup) < 14 && Math.hypot(b.vx, b.vy) < 190) { b.x = s.cup.x; b.y = s.cup.y; b.vx = b.vy = 0; s.score += Math.max(100, 700 - s.strokes * 75); feedback(s, s.strokes <= 3 ? 'UNDER PAR! Hole complete.' : 'IN THE CUP! On to the next green.'); s.delay = 1.1; }
      else if (s.strokes >= 10 && Math.hypot(b.vx, b.vy) < 6) finish(s, false, 'Ten strokes on this hole. Try a softer approach.');
    }
  };

  const pockets = [{ x: 70, y: 100 }, { x: 360, y: 90 }, { x: 650, y: 100 }, { x: 70, y: 405 }, { x: 360, y: 415 }, { x: 650, y: 405 }];
  models.pool = {
    create() { return { ...state(), aim: { x: 510, y: 250 }, balls: [{ x: 190, y: 250, vx: 0, vy: 0, color: 0, alive: true }, ...Array.from({ length: 6 }, (_, i) => ({ x: 460 + (i < 1 ? 0 : i < 3 ? 1 : 2) * 25, y: 250 + [0, -14, 14, -28, 0, 28][i], vx: 0, vy: 0, color: i + 1, alive: true }))], shots: 0, potted: 0, scratches: 0 }; },
    action(s, a) {
      move(s, a); if (a.kind === 'pointer') s.aim = { x: a.x, y: a.y };
      if (a.kind === 'primary' && s.balls.every(b => !b.alive || Math.hypot(b.vx, b.vy) < 5)) { Object.assign(s.balls[0], vector(s.balls[0], s.aim, 140 + power(s) * 650)); s.shots++; }
    },
    tick(s, dt) {
      s.aim.x = clamp(s.aim.x + s.dx * 220 * dt, 40, 680); s.aim.y = clamp(s.aim.y + s.dy * 220 * dt, 65, 430);
      for (const b of s.balls) if (b.alive) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-1.05 * dt); b.vy *= Math.exp(-1.05 * dt);
        if (Math.hypot(b.vx, b.vy) < 4) b.vx = b.vy = 0;
        if (pockets.some(p => distance(b, p) < 23)) { b.alive = false; b.vx = b.vy = 0; if (b.color) { s.potted++; s.score += 150; feedback(s, 'POCKETED! ' + s.potted + ' of 6 cleared.'); } else { s.scratches++; feedback(s, 'SCRATCH — cue ball returns when the table settles.'); } continue; }
        if (b.x < 82 || b.x > 638) { b.x = clamp(b.x, 82, 638); b.vx *= -.92; } if (b.y < 108 || b.y > 397) { b.y = clamp(b.y, 108, 397); b.vy *= -.92; }
      }
      for (let i = 0; i < s.balls.length; i++) for (let j = i + 1; j < s.balls.length; j++) {
        const a = s.balls[i], b = s.balls[j], d = distance(a, b); if (!a.alive || !b.alive || d >= 24 || d < .001) continue;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, push = (24 - d) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const impulse = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (impulse > 0) { a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny; }
      }
      const settled = s.balls.every(b => !b.alive || Math.hypot(b.vx, b.vy) < 5);
      if (!s.balls[0].alive && settled) { Object.assign(s.balls[0], { x: 190, y: 250, vx: 0, vy: 0, alive: true }); for (const b of s.balls.slice(1)) if (b.alive && distance(b, s.balls[0]) < 30) s.balls[0].y += 32; }
      if (s.potted === 6) { s.score += Math.max(0, 500 - s.shots * 20 - s.scratches * 30); finish(s, true, 'Table cleared in ' + s.shots + ' shots.'); }
      else if (s.shots >= 20 && settled) finish(s, false, 'Twenty shots played. ' + s.potted + ' balls pocketed.');
    }
  };

  const serveTennis = (s, direction) => { s.ball = { x: 360, y: 240, vx: 95 * direction, vy: 235 * direction, trail: [] }; s.delay = .65; };
  models.tennis = {
    create() { const s = { ...state(), player: 360, rival: 360, points: 0, against: 0, rally: 0 }; serveTennis(s, 1); return s; },
    action(s, a) { move(s, a); if (a.kind === 'pointer') s.player = clamp(a.x, 130, 590); },
    tick(s, dt) {
      s.player = clamp(s.player + s.dx * 400 * dt, 130, 590); s.rival = clamp(s.rival + clamp(s.ball.x - s.rival, -190 * dt, 190 * dt), 130, 590); if (s.delay > 0) { s.delay -= dt; return; }
      const b = s.ball, oldY = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 12) b.trail.shift();
      if (b.x < 100 || b.x > 620) { b.x = clamp(b.x, 100, 620); b.vx *= -1; }
      if (b.vy > 0 && oldY <= 402 && b.y >= 402 && Math.abs(b.x - s.player) < 48) { b.y = 400; b.vy = -Math.min(470, Math.abs(b.vy) + 18); b.vx = (b.x - s.player) * 6; s.rally++; s.score += 15; }
      if (b.vy < 0 && oldY >= 100 && b.y <= 100 && Math.abs(b.x - s.rival) < 45) { b.y = 102; b.vy = Math.min(470, Math.abs(b.vy) + 15); b.vx = (b.x - s.rival) * 5; }
      if (b.y < 60 || b.y > 445) { const point = b.y < 60; if (point) { s.points++; s.score += 150; } else s.against++; feedback(s, point ? 'POINT! Keep the pressure on.' : 'Rival point. Read the bounce.'); if (s.points === 5 || s.against === 5) finish(s, s.points === 5, 'Match: ' + s.points + ' – ' + s.against + '.'); else serveTennis(s, point ? 1 : -1); }
    }
  };

  const resetHockey = (s) => { s.player = { x: 360, y: 370 }; s.rival = { x: 360, y: 120 }; s.puck = { x: 360, y: 240, vx: 85, vy: 140 }; s.delay = .6; s.target = null; };
  models.hockey = {
    create() { const s = { ...state(), points: 0, against: 0 }; resetHockey(s); return s; },
    action(s, a) { move(s, a); if (a.kind === 'move') s.target = null; if (a.kind === 'pointer') s.target = { x: clamp(a.x, 110, 610), y: clamp(a.y, 265, 404) }; },
    tick(s, dt) {
      if (s.delay > 0) { s.delay -= dt; return; }
      const prev = { ...s.player }; if (s.target) { const d = distance(s.player, s.target), v = vector(s.player, s.target, Math.min(600, d / Math.max(dt, .001))); s.player.x += v.vx * dt; s.player.y += v.vy * dt; }
      else { s.player.x = clamp(s.player.x + s.dx * 400 * dt, 110, 610); s.player.y = clamp(s.player.y + s.dy * 400 * dt, 265, 404); }
      const p = s.puck; s.rival.x = clamp(s.rival.x + clamp(p.x - s.rival.x, -215 * dt, 215 * dt), 110, 610); s.rival.y = clamp(s.rival.y + clamp(Math.min(195, p.y - 24) - s.rival.y, -120 * dt, 120 * dt), 95, 200);
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-.12 * dt); p.vy *= Math.exp(-.12 * dt);
      if (p.x < 94 || p.x > 626) { p.x = clamp(p.x, 94, 626); p.vx *= -1; }
      for (const [paddle, up] of [[s.player, true], [s.rival, false]]) if (distance(p, paddle) < 35) { const v = vector(paddle, p, 410); p.x = paddle.x + v.vx / 410 * 36; p.y = paddle.y + v.vy / 410 * 36; p.vx = v.vx + (up && dt > 0 ? clamp((s.player.x - prev.x) / dt, -150, 150) : 0); p.vy = up ? -Math.abs(v.vy) - 130 : Math.abs(v.vy) + 120; }
      if (p.y < 72 || p.y > 425) {
        if (p.x > 295 && p.x < 425) { const goal = p.y < 72; if (goal) { s.points++; s.score += 200; } else s.against++; feedback(s, goal ? 'GOAL! Ice cold finish.' : 'Rival goal. Protect your end.'); if (s.points === 5 || s.against === 5) finish(s, s.points === 5, 'Final: ' + s.points + ' – ' + s.against + '.'); else resetHockey(s); }
        else { p.y = clamp(p.y, 72, 425); p.vy *= -1; }
      }
    }
  };

  models.archery = {
    create(rng) { return { ...state(), aim: { x: 360, y: 225 }, arrow: null, arrows: 10, hits: [], wind: (rng() - .5) * 70, delay: 0 }; },
    action(s, a) { move(s, a); if (a.kind === 'pointer') s.aim = { x: clamp(a.x, 110, 610), y: clamp(a.y, 85, 365) }; if (a.kind === 'primary' && !s.arrow && !s.delay && s.arrows > 0) { s.arrows--; const p = power(s); s.arrow = { x: s.aim.x + s.wind * (1.2 - p), y: s.aim.y + Math.sin(s.elapsed * 3.2) * (1 - p) * 22, t: 0 }; } },
    tick(s, dt, rng) {
      s.aim.x = clamp(s.aim.x + s.dx * 200 * dt, 110, 610); s.aim.y = clamp(s.aim.y + s.dy * 180 * dt, 85, 365);
      if (s.delay) { s.delay = Math.max(0, s.delay - dt); if (!s.delay) { if (!s.arrows) finish(s, s.score >= 500, s.score + ' points from ten arrows.'); else s.wind = (rng() - .5) * 70; } return; }
      if (s.arrow) { s.arrow.t += dt * 1.6; if (s.arrow.t >= 1) { const d = Math.hypot(s.arrow.x - 360, s.arrow.y - 225), points = d < 19 ? 100 : d < 38 ? 80 : d < 58 ? 60 : d < 80 ? 40 : d < 103 ? 20 : 0; s.score += points; s.hits.push({ x: s.arrow.x, y: s.arrow.y }); feedback(s, points === 100 ? 'BULLSEYE! +100' : points ? '+' + points + ' — adjust for the wind' : 'Wide of the target.'); s.arrow = null; s.delay = .75; } }
    }
  };

  models.flight = {
    create() { return { ...state(), y: 240, target: null, vy: 0, gates: [], next: .8, rings: 0, lives: 3, invincible: 0, distance: 0 }; },
    action(s, a) { move(s, a); if (a.kind === 'move') s.target = null; if (a.kind === 'pointer') s.target = clamp(a.y, 80, 400); },
    tick(s, dt, rng) {
      s.invincible = Math.max(0, s.invincible - dt); s.distance += dt * 220;
      const axis = s.target != null ? clamp((s.target - s.y) / 65, -1, 1) : s.dy; s.vy += (axis * 650 - s.vy * 5) * dt; s.y = clamp(s.y + s.vy * dt, 63, 419);
      s.next -= dt; if (s.next <= 0) { s.gates.push({ x: 780, y: 145 + rng() * 180, passed: false, cloud: rng() }); s.next = 1.5; }
      for (const g of s.gates) { const oldX = g.x; g.x -= (220 + s.rings * 3) * dt; if (!g.passed && oldX >= 170 && g.x < 170) { g.passed = true; if (Math.abs(s.y - g.y) < 60) { s.rings++; s.score += 100; feedback(s, 'RING ' + s.rings + ' / 20'); } else { s.lives--; s.invincible = .8; feedback(s, 'MISSED THE GATE — stay on the flight path'); } } }
      s.gates = s.gates.filter(g => g.x > -100);
      if (s.rings >= 20) finish(s, true, 'Twenty rings. A flawless skyward journey.'); else if (s.lives <= 0) finish(s, false, 'Three missed gates. Fly again.');
    }
  };

  models.tank = {
    create(rng) { return { ...state(), player: { x: 360, y: 340 }, aim: { x: 360, y: 120 }, target: null, hp: 100, bullets: [], enemies: Array.from({ length: 8 }, (_, i) => ({ x: 90 + (i % 4) * 175, y: 90 + Math.floor(i / 4) * 95, hp: 2, clock: 1 + rng() * 3, angle: 0 })), shotClock: 0, destroyed: 0, invincible: 0 }; },
    action(s, a) {
      move(s, a); if (a.kind === 'pointer') s.aim = { x: a.x, y: a.y };
      if (a.kind === 'aim-turn' && Number.isFinite(a.value)) { const angle = Math.atan2(s.aim.y - s.player.y, s.aim.x - s.player.x) + clamp(a.value, -1, 1) * .14; s.aim = { x: s.player.x + Math.cos(angle) * 300, y: s.player.y + Math.sin(angle) * 300 }; }
      if (a.kind === 'primary' && s.shotClock <= 0) { const v = vector(s.player, s.aim, 480); s.bullets.push({ x: s.player.x, y: s.player.y, ...v, hostile: false }); s.shotClock = .25; }
    },
    tick(s, dt) {
      s.shotClock -= dt; s.invincible = Math.max(0, s.invincible - dt); const norm = Math.max(1, Math.hypot(s.dx, s.dy)); s.player.x = clamp(s.player.x + s.dx / norm * 170 * dt, 48, 672); s.player.y = clamp(s.player.y + s.dy / norm * 170 * dt, 80, 425);
      for (const e of s.enemies) if (e.hp > 0) { const v = vector(e, s.player, distance(e, s.player) > 200 ? 35 : -12); e.x = clamp(e.x + v.vx * dt, 45, 675); e.y = clamp(e.y + v.vy * dt, 75, 420); e.angle = Math.atan2(s.player.y - e.y, s.player.x - e.x); e.clock -= dt; if (e.clock <= 0) { s.bullets.push({ x: e.x, y: e.y, ...vector(e, s.player, 155), hostile: true }); e.clock = 2.8; } }
      for (const b of s.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.hostile) { if (!s.invincible && distance(b, s.player) < 24) { b.dead = true; s.hp = Math.max(0, s.hp - 20); s.invincible = .45; feedback(s, 'ARMOUR HIT — keep moving'); } } else for (const e of s.enemies) if (e.hp > 0 && distance(b, e) < 25) { e.hp--; b.dead = true; if (!e.hp) { s.destroyed++; s.score += 200; feedback(s, 'DRONE DESTROYED ' + s.destroyed + ' / 8'); } break; } }
      s.bullets = s.bullets.filter(b => !b.dead && b.x > 20 && b.x < 700 && b.y > 50 && b.y < 450);
      if (s.destroyed === 8) { s.score += s.hp * 5; finish(s, true, 'All eight drones disabled. Arena secured.'); } else if (s.hp <= 0) finish(s, false, 'Armour depleted. Move between shots.');
    }
  };

  models.rhythm = {
    create(rng) { return { ...state(), notes: Array.from({ length: 72 }, (_, i) => ({ lane: Math.floor(rng() * 4), time: 2 + i * .48, judged: false, hit: false })), combo: 0, maxCombo: 0, hits: 0, misses: 0, lastLane: -1, laneFlash: 0, remaining: 38 }; },
    action(s, a) {
      if (a.kind !== 'lane' || !Number.isInteger(a.index) || a.index < 0 || a.index > 3) return;
      s.lastLane = a.index; s.laneFlash = .16;
      const note = s.notes.filter(n => !n.judged && n.lane === a.index).sort((a, b) => Math.abs(a.time - s.elapsed) - Math.abs(b.time - s.elapsed))[0];
      if (note && Math.abs(note.time - s.elapsed) <= .18) { note.judged = note.hit = true; s.hits++; s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo); const perfect = Math.abs(note.time - s.elapsed) < .075; s.score += (perfect ? 100 : 60) + Math.min(20, s.combo) * 5; feedback(s, perfect ? 'PERFECT' : 'GOOD'); }
      else { s.combo = 0; s.misses++; feedback(s, 'EARLY / LATE'); }
    },
    tick(s, dt) { s.laneFlash = Math.max(0, s.laneFlash - dt); s.remaining = Math.max(0, 38 - s.elapsed); for (const n of s.notes) if (!n.judged && s.elapsed - n.time > .18) { n.judged = true; s.misses++; s.combo = 0; } if (!s.remaining) finish(s, s.hits >= 50, s.hits + ' / 72 notes. Best combo: ' + s.maxCombo + '.'); }
  };

  for (const model of Object.values(models)) {
    const tick = model.tick, action = model.action;
    model.tick = (s, dt, rng) => { s.flash = Math.max(0, s.flash - dt); tick(s, dt, rng); };
    model.action = (s, a, rng) => { if (!a || typeof a.kind !== 'string') return; if (a.kind === 'pointer' && (!Number.isFinite(a.x) || !Number.isFinite(a.y))) return; if (a.kind === 'move' && (!Number.isFinite(a.dx) || !Number.isFinite(a.dy))) return; action(s, a, rng); };
  }
  const api = { models, power, curve, pockets };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArenaModels = Object.freeze(api);
})(typeof window === 'object' ? window : globalThis);
