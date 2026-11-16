const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/arcade-engine.js');
const A = require('../assets/arena-engine.js');
const Save = require('../assets/arcade-save.js');
const { games } = require('../assets/catalog.js');
const { platform } = require('./platform-harness.cjs');
const rng = () => .8;
function advance(id, s, seconds, random = rng) { for (let left = seconds; left > 1e-8 && s.status === 'playing'; left -= 1/120) E.tick(id, s, Math.min(left, 1/120), random); }

test('penalties score real corners, reject off-target shots, and finish five attempts', () => {
  const s = E.create('penalty', rng);
  for (let i = 0; i < 5; i++) { s.elapsed = 0; E.action('penalty', s, { kind: 'pointer', x: 170, y: 130 }); E.action('penalty', s, { kind: 'primary' }, rng); advance('penalty', s, 2.2); }
  assert.equal(s.status, 'won'); assert.equal(s.goals, 5); assert.equal(s.results.length, 5);
  const score = s.score; E.action('penalty', s, { kind: 'primary' }); assert.equal(s.score, score);
  const loss = E.create('penalty', rng);
  for (let i = 0; i < 5; i++) { loss.elapsed = 0; E.action('penalty', loss, { kind: 'pointer', x: 90, y: 100 }); E.action('penalty', loss, { kind: 'primary' }, rng); advance('penalty', loss, 2.2); }
  assert.equal(loss.status, 'lost'); assert.equal(loss.goals, 0);
  const saved = E.create('penalty', rng); saved.elapsed = 0; saved.aim = { x: 360, y: 190 }; E.action('penalty', saved, { kind: 'primary' }, () => .5); advance('penalty', saved, 1); assert.equal(saved.goals, 0); assert.match(saved.feedback, /SAVED/);
});
test('football counts goals at each end, kicks only in range, and respects full time', () => {
  const s = E.create('football'); s.delay = 0; s.ball = { x: 675, y: 240, vx: 50, vy: 0 }; E.tick('football', s, 0); assert.equal(s.goals, 1); assert.equal(s.score, 300);
  s.delay = 0; s.ball = { x: 45, y: 240, vx: -50, vy: 0 }; E.tick('football', s, 0); assert.equal(s.against, 1);
  s.delay = 0; s.ball.x = s.player.x + 10; s.ball.y = s.player.y; E.action('football', s, { kind: 'primary' }); assert.ok(s.ball.vx > 500);
  s.goals = 2; s.remaining = .001; E.tick('football', s, .01); assert.equal(s.status, 'won');
  const draw = E.create('football'); draw.remaining = 0; E.tick('football', draw, 0); assert.equal(draw.status, 'lost');
});
test('night racing has finite nitro, collision damage and a reachable finish', () => {
  const s = E.create('racing'); s.speed = 240; E.action('racing', s, { kind: 'boost', value: true }); advance('racing', s, 1); assert.ok(s.nitro < 100); assert.ok(s.speed > 240);
  s.traffic = [{ x: s.x, z: 36, speed: 0, color: 0 }]; E.tick('racing', s, .01, rng); assert.equal(s.integrity, 75); const hp = s.integrity; E.tick('racing', s, .01, rng); assert.equal(s.integrity, hp);
  s.distance = 6001; s.traffic = []; E.tick('racing', s, 0, rng); assert.equal(s.status, 'won');
  const loss = E.create('racing'); loss.integrity = 0; E.tick('racing', loss, 0, rng); assert.equal(loss.status, 'lost');
});
test('rally checkpoints add time once and off-road driving slows the car', () => {
  const s = E.create('rally'); s.distance = 1201; E.tick('rally', s, 0, rng); assert.equal(s.remaining, 87); assert.equal(s.checkpoint, 2); E.tick('rally', s, 0, rng); assert.equal(s.remaining, 87);
  s.x = 1.4; s.speed = 210; E.tick('rally', s, .1, rng); assert.ok(s.speed < 210); assert.ok(s.integrity < 100);
  s.distance = 4801; E.tick('rally', s, 0, rng); assert.equal(s.status, 'won');
});
test('kart racing distinguishes the track from grass and beats or loses to the rival', () => {
  const s = E.create('kart'); E.action('kart', s, { kind: 'move', dx: -1, dy: 0 }); advance('kart', s, .2); assert.ok(s.radius < 1);
  s.progress = Math.PI * 6; s.rivalProgress = 17; E.tick('kart', s, 0); assert.equal(s.status, 'won');
  const loss = E.create('kart'); loss.rivalProgress = Math.PI * 6; E.tick('kart', loss, 0); assert.equal(loss.status, 'lost');
});
test('basketball requires a descending rim crossing and never scores a basket twice', () => {
  const s = E.create('basket'); s.ball = { x: 550, y: 179, vx: 0, vy: 120, scored: false, trail: [] }; E.tick('basket', s, .02); assert.equal(s.baskets, 1); const points = s.score; E.tick('basket', s, .02); assert.equal(s.score, points);
  const up = E.create('basket'); up.ball = { x: 550, y: 181, vx: 0, vy: -120, scored: false, trail: [] }; E.tick('basket', up, .02); assert.equal(up.baskets, 0);
  s.baskets = 5; s.remaining = .001; E.tick('basket', s, .01); assert.equal(s.status, 'won');
});
test('bowling resolves pin collisions, gutters and the ten-frame limit', () => {
  const s = E.create('bowling'); s.ball = { x: 360, y: 151, vx: 0, vy: -300, strength: .8, spin: 0 }; s.roll = 1; E.tick('bowling', s, .02); assert.ok(s.total > 0); const count = s.total; E.tick('bowling', s, 0); assert.equal(s.total, count);
  const gutter = E.create('bowling'); gutter.ball = { x: 490, y: 145, vx: 0, vy: -300, strength: 1, spin: 0 }; E.tick('bowling', gutter, .02); assert.equal(gutter.total, 0); assert.equal(gutter.gutter, true);
  s.frame = 10; s.roll = 2; s.ball = null; s.delay = .01; s.total = 70; advance('bowling', s, .1); assert.equal(s.status, 'won');
});
test('golf reflects off obstacles and completes five cups with stroke limits', () => {
  const s = E.create('golf'); s.ball = { x: 248, y: 160, vx: 100, vy: 0 }; E.tick('golf', s, .05); assert.ok(s.ball.vx < 0); assert.ok(s.ball.x < 251);
  for (let i = 0; i < 5; i++) { Object.assign(s.ball, { ...s.cup, vx: 0, vy: 0 }); s.strokes = 2; E.tick('golf', s, 0); advance('golf', s, 1.2); } assert.equal(s.status, 'won');
  const loss = E.create('golf'); loss.strokes = 10; E.tick('golf', loss, 0); assert.equal(loss.status, 'lost');
});
test('pool transfers momentum, pockets balls, and restores scratched cue balls', () => {
  const s = E.create('pool'); s.balls[0] = { x: 200, y: 250, vx: 300, vy: 0, alive: true, color: 0 }; s.balls[1] = { x: 223, y: 250, vx: 0, vy: 0, alive: true, color: 1 }; E.tick('pool', s, 0); assert.ok(s.balls[1].vx > 200); assert.equal(s.balls[0].vx, 0);
  s.balls[2].x = 70; s.balls[2].y = 100; E.tick('pool', s, 0); assert.equal(s.potted, 1); const score = s.score; E.tick('pool', s, 0); assert.equal(s.score, score);
  s.balls.forEach(b => { b.vx = b.vy = 0; }); s.balls[0].x = 70; s.balls[0].y = 100; E.tick('pool', s, 0); assert.equal(s.scratches, 1); assert.equal(s.balls[0].alive, true);
  for (const b of s.balls.slice(1)) if (b.alive) { b.x = 650; b.y = 405; } E.tick('pool', s, 0); assert.equal(s.status, 'won'); assert.equal(s.potted, 6);
});
test('tennis returns aligned balls and wins at five points', () => {
  const s = E.create('tennis'); s.delay = 0; s.ball = { x: s.player, y: 400, vx: 0, vy: 235, trail: [] }; E.tick('tennis', s, .02); assert.ok(s.ball.vy < 0); assert.equal(s.rally, 1);
  s.points = 4; s.ball.y = 55; s.ball.vy = -230; E.tick('tennis', s, .01); assert.equal(s.status, 'won');
});
test('hockey keeps paddles on their half and resolves both goals', () => {
  const s = E.create('hockey'); s.delay = 0; E.action('hockey', s, { kind: 'pointer', x: 360, y: 20 }); advance('hockey', s, .1); assert.ok(s.player.y >= 265);
  s.puck = { x: 360, y: 60, vx: 0, vy: -100 }; s.points = 4; E.tick('hockey', s, .01); assert.equal(s.status, 'won');
  const loss = E.create('hockey'); loss.delay = 0; loss.against = 4; loss.puck = { x: 360, y: 440, vx: 0, vy: 100 }; E.tick('hockey', loss, 0); assert.equal(loss.status, 'lost');
});
test('archery compensates for wind and counts ten arrows without duplicate awards', () => {
  const s = E.create('archery', () => .5);
  for (let i = 0; i < 10; i++) { s.elapsed = Math.PI / 4.6; s.wind = 0; E.action('archery', s, { kind: 'primary' }); advance('archery', s, 1.5, () => .5); }
  assert.equal(s.status, 'won'); assert.equal(s.arrows, 0); assert.equal(s.score, 1000); assert.equal(s.hits.length, 10);
});
test('flight rings score only on passage and three missed gates end the flight', () => {
  const s = E.create('flight'); s.gates = [{ x: 171, y: s.y, passed: false }]; E.tick('flight', s, .01, rng); assert.equal(s.rings, 1); E.tick('flight', s, .01, rng); assert.equal(s.rings, 1);
  s.rings = 19; s.gates = [{ x: 171, y: s.y, passed: false }]; E.tick('flight', s, .01, rng); assert.equal(s.status, 'won');
  const loss = E.create('flight'); loss.lives = 1; loss.gates = [{ x: 171, y: 90, passed: false }]; E.tick('flight', loss, .01, rng); assert.equal(loss.status, 'lost');
});
test('tank shells damage enemies once, hostile shells consume armour, and the arena ends', () => {
  const s = E.create('tank', rng), e = s.enemies[0]; e.hp = 1; s.bullets = [{ x: e.x, y: e.y, vx: 0, vy: 0, hostile: false }]; E.tick('tank', s, 0); assert.equal(s.destroyed, 1); assert.equal(s.score, 200); assert.equal(s.bullets.length, 0);
  s.hp = 20; s.bullets = [{ x: s.player.x, y: s.player.y, vx: 0, vy: 0, hostile: true }]; E.tick('tank', s, 0); assert.equal(s.status, 'lost');
  const win = E.create('tank', rng); win.destroyed = 8; win.enemies.forEach(e => e.hp = 0); E.tick('tank', win, 0); assert.equal(win.status, 'won');
});
test('rhythm judges timing, prevents repeat hits and requires enough accurate notes', () => {
  const s = E.create('rhythm', () => .5), note = s.notes[0]; s.elapsed = note.time; E.action('rhythm', s, { kind: 'lane', index: note.lane }); assert.equal(s.hits, 1); const score = s.score; E.action('rhythm', s, { kind: 'lane', index: note.lane }); assert.equal(s.hits, 1); assert.equal(s.score, score); assert.equal(s.combo, 0);
  const win = E.create('rhythm', () => .4); for (const n of win.notes) { win.elapsed = n.time; E.action('rhythm', win, { kind: 'lane', index: n.lane }); } win.elapsed = 38; E.tick('rhythm', win, 0); assert.equal(win.status, 'won'); assert.equal(win.hits, 72);
  const loss = E.create('rhythm', rng); loss.elapsed = 38; E.tick('rhythm', loss, 0); assert.equal(loss.status, 'lost'); assert.equal(loss.misses, 72);
});
test('every arena game resists invalid pointer inputs and saves favourites and scores', () => {
  const p = Save.normalize(null);
  for (const g of games.filter(g => g.arena)) { const s = E.create(g.id, rng); E.action(g.id, s, { kind: 'pointer', x: NaN, y: Infinity }); E.action(g.id, s, { kind: 'move', dx: NaN, dy: 0 }); advance(g.id, s, .1); assert.ok(Number.isFinite(s.score)); Save.visit(p, g.id); Save.result(p, g.id, 200, true, 5); p.favorites.push(g.id); }
  const normalized = Save.normalize(p); assert.equal(normalized.favorites.length, 15); assert.equal(Object.keys(normalized.stats).length, 15); assert.equal(normalized.quality, 'high'); assert.equal(Save.normalize({quality:'balanced'}).quality,'balanced');
});
test('arena touch controls, graphics settings and primary actions are connected', async (t) => {
  const p = platform(); t.after(() => p.close()); const d = p.doc;
  await p.route('#game/penalty'); await d.getElementById('startGame').dispatch('click'); await d.getElementById('touchControls').querySelector('.primaryControl').dispatch('click'); assert.equal(d.getElementById('playDetail').textContent, '0 / 1');
  d.getElementById('graphicsQuality').value = 'balanced'; await d.getElementById('graphicsQuality').dispatch('change'); assert.equal(d.getElementById('arcadeCanvas').width,720);
  await p.route('#game/racing'); await d.getElementById('startGame').dispatch('click'); assert.ok(d.getElementById('touchControls').querySelector('.boostButton'));
  await p.route('#game/rhythm'); await d.getElementById('startGame').dispatch('click'); assert.equal(d.getElementById('touchControls').querySelectorAll('.rhythmControl').length,4);
});
test('all new scene posters are produced by the real renderer without mutating game rules', () => {
  const { art, recorder } = require('../scripts/arena-art.cjs');
  for (const game of games.filter(g => g.arena)) { const svg = art(game); assert.match(svg, /^<svg/); assert.match(svg, /linearGradient/); assert.ok(svg.length > 7000, game.id); const s=E.create(game.id,rng),before=JSON.stringify(s); globalThis.ArenaRenderer.draw(recorder().ctx,game.id,s); assert.equal(JSON.stringify(s),before,game.id); }
  assert.ok(A.power({elapsed:0}) >= 0);
});
test('frame simulation connects movement, freezes pause, and scales high graphics', async (t) => {
  const p=platform({density:2});t.after(()=>p.close());const d=p.doc;
  assert.equal(d.getElementById('arcadeCanvas').width,1440);
  await p.route('#game/penalty');await d.getElementById('startGame').dispatch('click');p.key('keydown',' ');
  for(let i=0;i<40;i++)p.frame(20);
  assert.match(d.getElementById('gameMessage').textContent,/GOAL|SAVED|OFF TARGET/);
  await d.getElementById('pauseGame').dispatch('click');const frozen=d.getElementById('gameMessage').textContent;for(let i=0;i<30;i++)p.frame(20);assert.equal(d.getElementById('gameMessage').textContent,frozen);
  await d.getElementById('startGame').dispatch('click');await p.route('#game/racing');await d.getElementById('startGame').dispatch('click');p.key('keydown','Shift');for(let i=0;i<120;i++)p.frame(20);p.key('keyup','Shift');
  assert.notEqual(d.getElementById('playDetail').textContent,'0.0 km');assert.ok(Number(d.getElementById('playScore').textContent)>0);
  d.getElementById('graphicsQuality').value='balanced';await d.getElementById('graphicsQuality').dispatch('change');assert.equal(d.getElementById('arcadeCanvas').width,720);
});
