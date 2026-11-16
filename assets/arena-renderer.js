/* Procedural artwork stays sharp at any screen density and works offline. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, colors = ['#33e7ff', '#ff4f88', '#ffd66d', '#9b79ff', '#72f4ab', '#ff9b51', '#e8f4ff'];
  function draw(ctx, id, s, reducedMotion = false) {
    const t = reducedMotion ? 0 : s.elapsed;
    const grad = (x, y, x2, y2, a, b) => { const g = ctx.createLinearGradient(x, y, x2, y2); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    const rect = (x, y, w, h, fill, r = 0) => { ctx.fillStyle = fill; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
    const ellipse = (x, y, rx, ry, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
    const circle = (x, y, r, fill) => ellipse(x, y, r, r, fill);
    const path = (points, fill, stroke, width = 1) => { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); } };
    const line = (x, y, x2, y2, color, width = 1) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };
    const text = (value, x, y, size = 14, fill = '#e9f6ff', align = 'center') => { ctx.fillStyle = fill; ctx.font = '800 ' + size + 'px system-ui,sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y); };
    const glow = (x, y, radius, color) => { const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, color); g.addColorStop(1, '#00000000'); circle(x, y, radius, g); };
    const shadow = (x, y, rx, ry = rx * .32) => ellipse(x + 3, y + 5, rx, ry, '#00000055');
    function ball(x, y, r = 10, color = '#f7faff', football = false) {
      shadow(x, y + r, r * 1.1); circle(x, y, r, grad(x - r, y - r, x + r, y + r, color, '#273c55'));
      circle(x - r * .3, y - r * .35, r * .32, '#ffffff70');
      if (football) { const points = Array.from({ length: 5 }, (_, i) => [x + Math.cos(i * TAU / 5 - 1.6) * r * .38, y + Math.sin(i * TAU / 5 - 1.6) * r * .38]); path(points, '#1b2439'); for (const [px, py] of points) line(px, py, x + (px - x) * 2.2, y + (py - y) * 2.2, '#263a4a', .9); }
    }
    function person(x, y, color, scale = 1, angle = 0, number = '7') {
      shadow(x, y + 17 * scale, 17 * scale, 6 * scale); ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
      rect(-12, 8, 9, 20, '#101b32', 4); rect(3, 8, 9, 20, '#101b32', 4); rect(-14, 24, 12, 5, '#f4f8ff', 2); rect(3, 24, 12, 5, '#f4f8ff', 2);
      rect(-21, -10, 9, 23, '#c88867', 5); rect(12, -10, 9, 23, '#c88867', 5);
      rect(-15, -17, 30, 30, grad(-15, -17, 15, 13, color, '#152b49'), 7); rect(-13, -15, 26, 4, '#ffffff80', 2); text(number, 0, -1, 13, '#fff');
      circle(0, -23, 10, '#dca17c'); ellipse(0, -28, 10, 5, '#211e28'); ctx.restore();
    }
    function car(x, y, scale, color, rear = true, rotation = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale); shadow(0, 9, 34, 16);
      rect(-28, -34, 9, 20, '#060b15', 3); rect(19, -34, 9, 20, '#060b15', 3); rect(-28, 17, 9, 19, '#060b15', 3); rect(19, 17, 9, 19, '#060b15', 3);
      path([[-24, 39], [-25, -21], [-15, -43], [15, -43], [25, -21], [24, 39]], grad(-22, -43, 24, 39, color, '#111d33'), '#ffffff50', 1.4);
      path([[-15, -20], [-11, -33], [11, -33], [15, -20]], '#b8e6f2'); rect(-15, -15, 30, 35, grad(-15, -15, 15, 20, '#133957', '#051221'), 7);
      line(-14, -12, 10, 13, '#9ef7ff65', 2); rect(-18, 27, 36, 5, color, 2); rect(-25, 22, 50, 5, '#121b2a', 2);
      rect(-20, rear ? 34 : -39, 12, 4, rear ? '#ff527a' : '#d6faff', 2); rect(8, rear ? 34 : -39, 12, 4, rear ? '#ff527a' : '#d6faff', 2);
      if (rear) { glow(-15, 40, 16, '#ff335944'); glow(15, 40, 16, '#ff335944'); } ctx.restore();
    }
    function target(x, y, radius, color = '#42e7ff') { circle(x, y, radius, '#07152470'); ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke(); line(x - radius - 7, y, x + radius + 7, y, color); line(x, y - radius - 7, x, y + radius + 7, color); }
    function hud(title, subtitle) { rect(0, 0, 720, 54, grad(0, 0, 0, 54, '#040917ee', '#04091755')); text(title, 24, 25, 12, '#e1efff', 'left'); text(subtitle, 696, 25, 12, '#77e8ff', 'right'); }
    function meter(label, value, x = 26, y = 411, width = 155, color = '#32e7ff') { rect(x - 10, y - 24, width + 20, 54, '#061024dc', 8); text(label, x, y - 11, 9, '#b2c6da', 'left'); rect(x, y + 4, width, 7, '#394459', 4); rect(x, y + 4, Math.max(1, width * Math.min(1, Math.max(0, value))), 7, grad(x, y, x + width, y, '#a5ffdc', color), 4); }
    function crowd(y = 70, height = 80) {
      rect(0, y, 720, height, grad(0, y, 0, y + height, '#192b44', '#070d1c'));
      for (let row = 0; row < 7; row++) for (let c = 0; c < 64; c++) { const x = c * 12 + row % 2 * 5; circle(x, y + 10 + row * 10, 1.8, ['#b3d1db66', '#23e7ff66', '#f281a655', '#ffd88755'][(row * 3 + c * 7) % 4]); }
      for (const x of [65, 655]) { line(x, y - 10, x, y + 24, '#48657c', 3); rect(x - 34, y - 17, 68, 10, '#ecfaff', 2); glow(x, y - 10, 130, '#b6f6ff26'); path([[x - 28, y - 10], [x + 28, y - 10], [x + 120, 420], [x - 150, 420]], '#b7edff08'); }
    }
    function pitch() {
      crowd(30, 420); rect(42, 69, 636, 363, '#1c7259', 5);
      for (let i = 0; i < 12; i++) rect(46 + i * 52.3, 74, 52.3, 350, i % 2 ? '#228564' : '#207c5b');
      ctx.strokeStyle = '#e0ffee9c'; ctx.lineWidth = 2; ctx.strokeRect(50, 76, 620, 344); line(360, 76, 360, 420, '#e0ffee9c', 2); ctx.beginPath(); ctx.arc(360, 248, 58, 0, TAU); ctx.stroke(); circle(360, 248, 3, '#e0ffee');
      ctx.strokeRect(50, 161, 100, 173); ctx.strokeRect(570, 161, 100, 173); ctx.strokeRect(50, 195, 39, 104); ctx.strokeRect(631, 195, 39, 104);
      for (const x of [25, 671]) { rect(x, 192, 24, 96, '#d6ffff25'); for (let n = 0; n < 8; n++) line(x, 195 + n * 12, x + 24, 195 + n * 12, '#d8f5ff66'); }
      rect(44, 434, 632, 20, '#0c1c31'); text('ALGOREDEEM  •  PLAY THE MOMENT  •  ALGOREDEEM', 360, 444, 10, '#49e9ff');
    }
    ctx.save(); rect(0, 0, 720, 480, '#071023');
    if (id === 'penalty') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#081728', '#0b3631')); crowd(65, 170);
      path([[0, 255], [720, 255], [720, 480], [0, 480]], grad(0, 255, 0, 480, '#228064', '#0e423b'));
      for (let i = 0; i < 9; i++) path([[360 + (i - 4.5) * 50, 255], [360 + (i - 3.5) * 50, 255], [360 + (i - 3.5) * 100, 480], [360 + (i - 4.5) * 100, 480]], i % 2 ? '#8bffc906' : '#041b250a');
      path([[130, 251], [590, 251], [681, 375], [39, 375]], null, '#e4fffaaa', 2); line(360, 251, 360, 480, '#b8fff110');
      path([[154, 116], [568, 116], [595, 90], [127, 90]], '#b8efff13', '#d5faff8a', 2); path([[154, 116], [127, 90], [127, 242], [154, 242]], '#b8efff12', '#d5faff8a', 2); path([[568, 116], [595, 90], [595, 242], [568, 242]], '#b8efff12', '#d5faff8a', 2);
      rect(155, 116, 412, 127, '#b8efff0b'); for (let x = 155; x < 570; x += 17) line(x, 116, x, 242, '#daffff33'); for (let y = 116; y < 244; y += 16) line(155, y, 568, y, '#daffff33');
      line(152, 245, 152, 113, '#e4faff', 6); line(152, 113, 568, 113, '#e4faff', 6); line(568, 113, 568, 245, '#e4faff', 6);
      const diving = !!s.shot; person(s.keeper, diving ? s.keeperY : 209, '#ffb72e', 1.15, diving ? (s.keeperTarget < 360 ? -1 : 1) * .8 : 0, '1');
      person(320, 392, '#3bdcff', 1.3, -.12, '9');
      if (s.shot) { const b = s.shot; glow(b.x, b.y, 28, '#e9ffff20'); ball(b.x, b.y, 14 - b.t * 5, '#f7faff', true); } else { ball(360, 402, 14, '#f7faff', true); target(s.aim.x, s.aim.y, 16); }
      for (let i = 0; i < 5; i++) circle(292 + i * 34, 65, 8, i >= s.results.length ? '#506478' : s.results[i] ? '#63ffd5' : '#ff6388');
      meter('SHOT POWER · AVOID THE TOP', root.ArenaModels.power(s)); hud('STADIUM PENALTIES', s.goals + ' GOALS   /   ' + s.attempts + ' SHOTS');
    } else if (id === 'football') {
      pitch(); person(s.rival.x, s.rival.y, '#ff4f85', .8, -.2, '10'); person(s.player.x, s.player.y, '#32dfff', .8, .15, '7'); ball(s.ball.x, s.ball.y, 9, '#f8ffff', true);
      if (s.target) target(s.target.x, s.target.y, 9, '#ffffff45'); hud('FLOODLIGHT FOOTBALL', 'YOU ' + s.goals + '  :  ' + s.against + ' RIVAL    ' + Math.ceil(s.remaining) + 's');
    } else if (id === 'racing' || id === 'rally') {
      const rally = id === 'rally', bend = root.ArenaModels.curve(s);
      rect(0, 0, 720, 210, grad(0, 0, 0, 210, rally ? '#33405b' : '#060b27', rally ? '#ffc089' : '#5b2765')); glow(540, 100, 90, rally ? '#ffc873aa' : '#fe49ba38'); circle(540, 105, 34, rally ? '#ffe0a5' : '#ff6eaf');
      for (let layer = 0; layer < 3; layer++) { const points = [[0, 195]]; for (let x = 0; x <= 760; x += 38) points.push([x, 148 - layer * 13 - Math.sin(x * .014 + layer * 1.2) * (27 + layer * 8)]); points.push([720, 210], [0, 210]); path(points, rally ? ['#ad826d', '#846e68', '#575d65'][layer] : ['#503052', '#302746', '#192438'][layer]); }
      if (!rally) for (let i = 0; i < 31; i++) { const x = i * 26 - (s.distance * .025) % 26, h = 15 + (i * 29) % 65; rect(x, 178 - h, 22, h, '#101c31'); for (let j = 0; j < 4; j++) rect(x + 4 + j % 2 * 9, 180 - h + Math.floor(j / 2) * 14, 3, 5, i % 3 ? '#43e6ff55' : '#fd57b166'); }
      const project = (z, lane = 0) => { const f = 1 / (1 + Math.max(0, z) / 180); return { y: 166 + f * 300, half: 15 + f * 325, x: 360 + bend * (1 - f) ** 2 * 175 + lane * (15 + f * 325) }; };
      const road = Array.from({ length: 106 }, (_, i) => { const y = 166 + i * 3, f = (y - 166) / 300, half = 15 + f * 325, x = 360 + bend * (1 - f) ** 2 * 175, z = f ? 180 * (1 / f - 1) : 99999; return { x, y, half, f, stripe: Math.floor((z + s.distance) / 60) % 2 }; });
      rect(0, 166, 720, 314, rally ? '#a77a56' : '#10182c');
      path([...road.map(p => [p.x - p.half - 12 * p.f, p.y]), ...road.slice().reverse().map(p => [p.x + p.half + 12 * p.f, p.y])], rally ? '#d65a43' : '#28efff');
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i], b = road[i + 1]; if (a.stripe) for (const side of [-1, 1]) path([[a.x + side * (a.half + 12 * a.f), a.y], [a.x + side * a.half, a.y], [b.x + side * b.half, b.y + .2], [b.x + side * (b.half + 12 * b.f), b.y + .2]], '#dcdfde');
      }
      path([...road.map(p => [p.x - p.half, p.y]), ...road.slice().reverse().map(p => [p.x + p.half, p.y])], rally ? '#67605b' : grad(0, 166, 0, 480, '#1b273d', '#1a2337'));
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i], b = road[i + 1];
        if (a.stripe) {
          path([[a.x - a.half, a.y], [a.x + a.half, a.y], [b.x + b.half, b.y + .2], [b.x - b.half, b.y + .2]], rally ? '#ffffff03' : '#00000006');
          for (const lane of [-.33, .33]) path([[a.x + a.half * lane - Math.max(1, a.f * 2), a.y], [a.x + a.half * lane + Math.max(1, a.f * 2), a.y], [b.x + b.half * lane + Math.max(1, b.f * 2), b.y + .2], [b.x + b.half * lane - Math.max(1, b.f * 2), b.y + .2]], rally ? '#e0d3b180' : '#adf5ff7a');
        }
      }
      if (!rally) { glow(150, 390, 110, '#2beaff12'); glow(590, 410, 125, '#ff31c615'); }
      for (const c of s.traffic.slice().sort((a, b) => b.z - a.z)) if (c.z >= 0 && c.z < 1500) { const p = project(c.z, c.x), scale = Math.max(.08, p.half / 260); if (rally) { rect(p.x - 19 * scale, p.y - 27 * scale, 38 * scale, 25 * scale, '#d65536', 3); line(p.x - 15 * scale, p.y - 24 * scale, p.x + 15 * scale, p.y - 7 * scale, '#ffc87c', 4 * scale); } else car(p.x, p.y - 16 * scale, scale, colors[c.color]); }
      if (!s.invincible || Math.floor(t * 12) % 2) car(360 + s.x * 190, 385, 1.4, rally ? '#ffcf61' : '#3ee7ff', true, s.dx * .045);
      if (s.boost && s.nitro > 0) { glow(338 + s.x * 190, 455, 32, '#38e9ff88'); glow(383 + s.x * 190, 455, 32, '#38e9ff88'); }
      text(Math.round(s.speed) + ' KM/H', 690, 436, 23, '#f2faff', 'right'); meter('NITRO · SHIFT / BOOST', s.nitro / 100, 26, 410, 125); meter('BODYWORK', s.integrity / 100, 26, 350, 125, '#ffba63');
      hud(rally ? 'DUSTLINE RALLY' : 'NIGHTSHIFT RACING', (s.distance / 1000).toFixed(1) + ' / ' + (rally ? '4.8' : '6.0') + ' KM   ' + Math.ceil(s.remaining) + 's');
    } else if (id === 'kart') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#21463e', '#0b262c')); for (let i = 0; i < 70; i++) circle((i * 173) % 720, 70 + (i * 97) % 400, 10 + i % 4 * 2, '#488f4920');
      ellipse(360, 258, 311, 206, '#102524'); ellipse(360, 250, 306, 198, '#6d7181'); ellipse(360, 250, 293, 186, '#333c51'); ellipse(360, 250, 206, 110, '#b3b6b5'); ellipse(360, 250, 201, 104, '#368253');
      ctx.strokeStyle = '#d3dbe880'; ctx.lineWidth = 2; ctx.setLineDash([12, 14]); ctx.beginPath(); ctx.ellipse(360, 250, 250, 145, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) rect(349 + j * 11, 53 + i * 7, 11, 7, (i + j) % 2 ? '#08111e' : '#effaff');
      rect(300, 210, 120, 56, '#123b35', 10); text('AG', 360, 239, 36, '#aaffc5'); text('MOTOR CLUB', 360, 278, 10, '#afffd299');
      const angle = s.angle, rival = -Math.PI / 2 + s.rivalProgress; car(360 + Math.cos(rival) * 255, 250 + Math.sin(rival) * 147, .48, '#ff577e', true, rival + Math.PI / 2);
      car(360 + Math.cos(angle) * 250 * s.radius, 250 + Math.sin(angle) * 145 * s.radius, .55, '#2ceaff', true, angle + Math.PI / 2);
      meter('BOOST', s.nitro / 100, 25, 430, 115); hud('TURBO KART', 'LAP ' + s.lap + ' / 3   ' + (s.progress >= s.rivalProgress ? '1ST' : '2ND'));
    } else if (id === 'basket') {
      crowd(28, 185); rect(0, 215, 720, 265, grad(0, 215, 0, 480, '#c88a52', '#784c38'));
      for (let row = 0; row < 13; row++) { line(0, 220 + row * 22, 720, 220 + row * 22, '#56332c66'); for (let col = 0; col < 8; col++) line(col * 99 + row % 2 * 40, 220 + row * 22, col * 99 + row % 2 * 40, 242 + row * 22, '#56332c44'); }
      path([[418, 220], [622, 220], [704, 440], [313, 440]], null, '#ffe9c29a', 2); ellipse(510, 420, 90, 25, '#ffffff06'); line(607, 123, 652, 123, '#99bec6', 8); rect(650, 121, 10, 246, '#3a4a64', 3); shadow(655, 373, 27);
      rect(598, 88, 12, 96, '#d9fcff99', 2); rect(559, 87, 44, 78, '#cff3ff2b', 2); ctx.strokeStyle = '#f4ffffbb'; ctx.lineWidth = 2; ctx.strokeRect(571, 121, 27, 35);
      for (let i = 0; i < 6; i++) line(521 + i * 11, 181, 536 + i * 5, 225, '#f5ffed80', 1.5); ellipse(550, 180, 31, 6, '#ff6c3799'); ctx.strokeStyle = '#ff7744'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(550, 180, 31, 6, 0, 0, TAU); ctx.stroke();
      person(130, 368, '#ff8646', 1.5, -.1, '23'); target(s.aim.x, s.aim.y, 12, '#fff3c566');
      if (!s.ball) { const duration = .7 + root.ArenaModels.power(s) * .45, vx = (s.aim.x - 165) / duration, vy = (s.aim.y - 375 - .5 * 750 * duration ** 2) / duration; for (let i = 1; i < 19; i++) { const at = i * duration / 18; circle(165 + vx * at, 375 + vy * at + .5 * 750 * at ** 2, 2, '#ffe5b2aa'); } }
      const b = s.ball; if (b) { b.trail.forEach((p, i) => circle(p.x, p.y, 3 + i / b.trail.length * 5, '#ffc87922')); ball(b.x, b.y, 13, '#ffb852'); line(b.x - 11, b.y, b.x + 11, b.y, '#7a422c', 1.5); line(b.x, b.y - 11, b.x, b.y + 11, '#7a422c', 1.5); } else ball(165, 375, 13, '#ffb852');
      meter('ARC POWER', root.ArenaModels.power(s)); hud('SKYCOURT HOOPS', s.baskets + ' BASKETS    ' + Math.ceil(s.remaining) + 's');
    } else if (id === 'bowling') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#161131', '#0a1326')); glow(200, 140, 140, '#a63bff33'); glow(520, 140, 140, '#34e9ff2a');
      path([[270, 55], [450, 55], [605, 480], [115, 480]], '#0a0d1c'); path([[283, 55], [437, 55], [515, 480], [205, 480]], grad(0, 55, 0, 480, '#a77a50', '#dfb67c'));
      for (let i = 0; i <= 9; i++) line(283 + i * 17.1, 55, 205 + i * 34.4, 480, '#77513c50'); line(258, 55, 183, 480, '#8e6dff', 3); line(461, 55, 538, 480, '#43e7ff', 3); line(244, 55, 168, 480, '#d8d8ff22', 2); line(477, 55, 552, 480, '#d8d8ff22', 2);
      for (let i = 0; i < 7; i++) path([[306 + i * 18, 244], [302 + i * 18, 252], [310 + i * 18, 252]], '#805838bb');
      for (const p of s.pins.slice().sort((a, b) => a.y - b.y)) { if (!p.alive) { ellipse(p.x + 9, p.y + 7, 16, 4, '#c4d3d944'); continue; } shadow(p.x, p.y + 5, 10); ctx.save(); ctx.translate(p.x, p.y); path([[-7, 7], [-9, -3], [-4, -13], [-4, -24], [4, -24], [4, -13], [9, -3], [7, 7]], grad(-7, -20, 9, 7, '#fff', '#acbec9'), '#d3e2ee', .6); circle(0, -24, 5, '#f5ffff'); rect(-4, -19, 8, 3, '#fd477c'); rect(-4, -15, 8, 2, '#fd477c'); ctx.restore(); }
      if (s.ball) { ball(s.ball.x, s.ball.y, 16, '#9874ff'); for (let i = 0; i < 3; i++) circle(s.ball.x + Math.cos(i * 1.6 + s.ball.spin) * 6, s.ball.y + Math.sin(i * 1.6 + s.ball.spin) * 5, 2, '#252041'); } else { ball(360, 417, 19, '#9874ff'); target(s.aim, 210, 12); }
      meter('ROLL POWER', root.ArenaModels.power(s)); hud('COSMIC BOWLING', 'FRAME ' + Math.min(10, s.frame) + ' / 10    ' + s.total + ' PINS');
    } else if (id === 'golf') {
      rect(0, 0, 720, 480, grad(0, 0, 720, 480, '#1b6053', '#102e36')); for (let i = 0; i < 65; i++) { const x = (i * 167 + 27) % 720, y = (i * 127) % 480; ellipse(x, y, 22, 15, '#58ba6c12'); }
      rect(53, 75, 614, 361, '#122f29', 18); rect(58, 80, 604, 350, grad(58, 80, 662, 430, '#509a5a', '#2c7a58'), 14);
      for (let i = 0; i < 13; i++) rect(63 + i * 46, 85, 46, 335, i % 2 ? '#e0ffab04' : '#071d1906');
      for (const w of s.walls) { rect(w.x + 5, w.y + 7, w.w, w.h, '#001b2455', 5); rect(w.x, w.y, w.w, w.h, grad(w.x, w.y, w.x + w.w, w.y, '#b5c4aa', '#738477'), 5); rect(w.x + 2, w.y + 2, w.w - 4, 3, '#f0f7dc80', 2); }
      for (let i = 0; i < 22; i++) { const x = 20 + i * 32, y = i % 2 ? 455 : 56; shadow(x, y, 15); circle(x, y, 15, '#1a5348'); circle(x - 3, y - 4, 11, '#437853'); }
      circle(s.cup.x, s.cup.y, 14, '#183c34'); circle(s.cup.x, s.cup.y, 8, '#071d23'); line(s.cup.x, s.cup.y, s.cup.x, s.cup.y - 41, '#e7faef', 2); path([[s.cup.x, s.cup.y - 41], [s.cup.x + 31, s.cup.y - 31], [s.cup.x, s.cup.y - 23]], '#ff7689');
      if (Math.hypot(s.ball.vx, s.ball.vy) < 6 && !s.delay) { ctx.setLineDash([5, 7]); line(s.ball.x, s.ball.y, s.aim.x, s.aim.y, '#eaffbb88', 1.5); ctx.setLineDash([]); target(s.aim.x, s.aim.y, 9, '#d9ffcf55'); } ball(s.ball.x, s.ball.y, 8, '#ffffec');
      meter('PUTT POWER', root.ArenaModels.power(s)); hud('EMERALD LINKS', 'HOLE ' + Math.min(5, s.hole) + ' / 5    STROKES ' + s.strokes);
    } else if (id === 'pool') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#1b162a', '#0a1221')); glow(360, 210, 390, '#42ffb412');
      rect(44, 73, 635, 366, '#050c14', 31); rect(43, 66, 635, 366, grad(43, 66, 678, 432, '#9a6347', '#3d2a29'), 28); rect(60, 82, 601, 334, '#0d393e', 15); rect(73, 96, 574, 310, grad(73, 96, 647, 406, '#197567', '#0f4b53'), 8);
      for (const p of root.ArenaModels.pockets) { circle(p.x, p.y, 24, '#bc8b50'); circle(p.x, p.y, 20, '#03121b'); circle(p.x - 3, p.y - 2, 14, '#01070f'); }
      for (let i = 0; i < 6; i++) { circle(124 + i * 89, 76, 2, '#fff0c8'); circle(124 + i * 89, 423, 2, '#fff0c8'); }
      const cue = s.balls[0], moving = s.balls.some(b => b.alive && Math.hypot(b.vx, b.vy) > 5);
      if (!moving && cue.alive) { const angle = Math.atan2(s.aim.y - cue.y, s.aim.x - cue.x); ctx.setLineDash([4, 7]); line(cue.x, cue.y, cue.x + Math.cos(angle) * 175, cue.y + Math.sin(angle) * 175, '#d5ffea88'); ctx.setLineDash([]); line(cue.x - Math.cos(angle) * 18, cue.y - Math.sin(angle) * 18, cue.x - Math.cos(angle) * 140, cue.y - Math.sin(angle) * 140, '#d9ba89', 5); line(cue.x - Math.cos(angle) * 18, cue.y - Math.sin(angle) * 18, cue.x - Math.cos(angle) * 28, cue.y - Math.sin(angle) * 28, '#53b9d3', 5); }
      for (const b of s.balls) if (b.alive) { ball(b.x, b.y, 12, b.color ? colors[b.color - 1] : '#fff8e1'); if (b.color) { circle(b.x, b.y, 5.5, '#fff4e3'); text(b.color, b.x, b.y, 7, '#14263c'); } }
      meter('CUE POWER', root.ArenaModels.power(s), 26, 446); hud('VELVET POOL', s.potted + ' / 6 POCKETED    SHOTS ' + s.shots + ' / 20');
    } else if (id === 'tennis') {
      crowd(30, 410); rect(81, 67, 558, 366, '#185f62', 5); rect(97, 79, 526, 346, grad(97, 79, 623, 425, '#376bad', '#254c83'));
      ctx.strokeStyle = '#d8f6ffbb'; ctx.lineWidth = 2; ctx.strokeRect(102, 83, 516, 338); ctx.strokeRect(161, 150, 398, 180); line(360, 150, 360, 330, '#d8f6ffbb', 2); line(161, 83, 161, 421, '#d8f6ffbb', 2); line(559, 83, 559, 421, '#d8f6ffbb', 2);
      line(90, 247, 630, 247, '#0b213ca0', 8); for (let i = 0; i < 60; i++) line(96 + i * 9, 230, 96 + i * 9, 246, '#d3f1ff77'); line(90, 230, 630, 230, '#e6ffff', 3);
      person(s.rival, 104, '#ff738f', .75, Math.PI, '4'); person(s.player, 405, '#63e7ff', .85, 0, '1'); ellipse(s.player + 31, 391, 15, 21, '#b8e6ec80'); ellipse(s.rival - 27, 115, 14, 18, '#b8e6ec80');
      s.ball.trail.forEach((p, i) => circle(p.x, p.y, 2 + i / 7, '#dcff8725')); ball(s.ball.x, s.ball.y, 7, '#d8fa54'); hud('CENTRE COURT', 'YOU ' + s.points + '  :  ' + s.against + ' RIVAL');
    } else if (id === 'hockey') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#08172c', '#1a253c')); glow(110, 250, 150, '#32e7ff20'); glow(620, 250, 150, '#9c68ff20');
      rect(73, 57, 575, 386, '#43daf357', 31); rect(82, 67, 556, 367, grad(82, 67, 638, 434, '#d0e6f0', '#8eafc6'), 26);
      for (let i = 0; i < 70; i++) line(100 + (i * 73) % 510, 80 + (i * 97) % 320, 123 + (i * 73) % 510, 80 + (i * 97) % 320, '#faffff27');
      line(94, 249, 626, 249, '#7971b777', 2); ctx.strokeStyle = '#7971b788'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(360, 249, 57, 0, TAU); ctx.stroke();
      rect(295, 67, 130, 11, '#161a37', 5); rect(295, 421, 130, 11, '#161a37', 5); glow(360, 72, 80, '#ff5da930'); glow(360, 425, 80, '#36edff40');
      for (const [p, color] of [[s.rival, '#ff639e'], [s.player, '#30e6ff']]) { shadow(p.x, p.y, 27); circle(p.x, p.y, 25, '#0e294c'); circle(p.x, p.y - 3, 22, grad(p.x - 20, p.y - 20, p.x + 20, p.y + 20, color, '#264167')); circle(p.x, p.y - 7, 12, color); circle(p.x - 4, p.y - 11, 6, '#ffffff60'); }
      shadow(s.puck.x, s.puck.y, 13); circle(s.puck.x, s.puck.y, 12, '#13213b'); circle(s.puck.x, s.puck.y - 3, 11, '#333251'); circle(s.puck.x - 3, s.puck.y - 5, 3, '#8c88bb'); hud('GLACIER HOCKEY', 'YOU ' + s.points + '  :  ' + s.against + ' RIVAL');
    } else if (id === 'archery') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#253747', '#183a38')); glow(560, 82, 160, '#ffdc9733');
      for (let i = 0; i < 20; i++) { const x = (i * 79) % 740, y = 145 + i % 3 * 35; rect(x, y, 9, 300, '#0c242e77'); path([[x - 53, y + 132], [x + 4, y - 75], [x + 57, y + 132]], '#1b394566'); path([[x - 38, y + 76], [x + 4, y - 100], [x + 41, y + 76]], '#244b4866'); }
      rect(0, 365, 720, 115, grad(0, 365, 0, 480, '#466149', '#122d31')); shadow(360, 370, 110); line(325, 273, 300, 383, '#765b47', 9); line(391, 273, 422, 383, '#765b47', 9);
      circle(360, 228, 109, '#131f2ba0'); for (const [r, color] of [[103, '#ddd7c6'], [80, '#304954'], [58, '#3d91b7'], [38, '#eb6673'], [19, '#ffd064']]) circle(360, 225, r, color);
      for (const r of [19, 38, 58, 80, 103]) { ctx.beginPath(); ctx.arc(360, 225, r, 0, TAU); ctx.strokeStyle = '#0c1d3455'; ctx.lineWidth = 1; ctx.stroke(); }
      for (const h of s.hits) { line(h.x, h.y, h.x - 7, h.y - 35, '#c9d0bc', 2); path([[h.x - 7, h.y - 35], [h.x - 16, h.y - 28], [h.x - 6, h.y - 19]], '#ffbc76'); }
      target(s.aim.x, s.aim.y, 14, '#f1ffe3'); if (s.arrow) { const a = s.arrow, x = 360 + (a.x - 360) * Math.min(1, a.t), y = 455 + (a.y - 455) * Math.min(1, a.t); line(x, y, x - 14 * (1 - a.t), y + 55 * (1 - a.t), '#fff1c8', 3); }
      meter('DRAW STRENGTH', root.ArenaModels.power(s)); text('WIND ' + (s.wind < 0 ? '←' : '→') + ' ' + Math.abs(Math.round(s.wind)), 685, 432, 12, '#dcdfc5', 'right'); hud('EMBER ARCHERY', s.arrows + ' ARROWS LEFT');
    } else if (id === 'flight') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#264e85', '#98d8e7')); glow(580, 90, 130, '#fff2caa0'); circle(580, 90, 25, '#fff0ca');
      for (let layer = 0; layer < 3; layer++) { const points = [[0, 480]]; for (let i = -1; i < 16; i++) { const x = i * 60 - (s.distance * (.1 + layer * .1)) % 60; points.push([x, 320 + layer * 44 - Math.sin(i * .77 + layer) * (40 - layer * 8)]); } points.push([720, 480]); path(points, ['#5a8dae', '#477d98', '#2b687f'][layer]); }
      for (let i = 0; i < 8; i++) { const x = (i * 137 + 110 - s.distance * .12) % 900 + 40, y = 80 + i % 3 * 74; ellipse(x, y, 63, 15, '#efffff33'); ellipse(x - 10, y - 8, 32, 19, '#efffff33'); }
      for (const g of s.gates) { line(g.x, 50, g.x, g.y - 65, '#ffffff15', 5); line(g.x, g.y + 65, g.x, 480, '#ffffff15', 5); glow(g.x, g.y, 85, g.passed ? '#7affbb22' : '#ffce6422'); ctx.strokeStyle = g.passed ? '#71ffd2' : '#ffda7c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(g.x, g.y, 21, 61, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#fff8cfaa'; ctx.lineWidth = 2; ctx.stroke(); }
      if (!s.invincible || Math.floor(t * 12) % 2) { ctx.save(); ctx.translate(170, s.y); ctx.rotate(s.vy * .0014); shadow(0, 17, 38); path([[-42, 5], [-10, -5], [8, -31], [23, -31], [17, -2], [48, 7], [25, 15], [5, 14], [-8, 34], [-22, 34], [-19, 13], [-42, 16]], grad(-30, -15, 30, 24, '#ffdfa3', '#dc7449'), '#fff0cf', 1.5); ellipse(15, 2, 13, 8, '#337799'); line(47, -10, 47, 28, '#b9f7ff', 2); ctx.restore(); }
      hud('SKYWING', s.rings + ' / 20 RINGS    ' + s.lives + ' CHANCES');
    } else if (id === 'tank') {
      rect(0, 0, 720, 480, grad(0, 0, 720, 480, '#283640', '#111e2d')); for (let row = 0; row < 9; row++) for (let col = 0; col < 14; col++) { rect(col * 53, row * 53, 52, 52, (row + col) % 2 ? '#fff6ce04' : '#030b160a'); if ((row * 3 + col) % 9 === 0) line(col * 53 + 5, row * 53 + 22, col * 53 + 40, row * 53 + 33, '#030b162a', 2); }
      rect(28, 59, 664, 392, '#1a2f390c', 10); ctx.strokeStyle = '#54f0cf55'; ctx.lineWidth = 2; ctx.strokeRect(30, 62, 660, 386);
      function tank(p, color, angle, hp) { shadow(p.x, p.y, 31); ctx.save(); ctx.translate(p.x, p.y); rect(-27, -23, 11, 48, '#0a121c', 4); rect(16, -23, 11, 48, '#0a121c', 4); for (let i = 0; i < 7; i++) { rect(-27, -20 + i * 6, 11, 3, '#536371', 1); rect(16, -20 + i * 6, 11, 3, '#536371', 1); } rect(-20, -22, 40, 44, grad(-20, -22, 20, 22, color, '#253448'), 7); ctx.rotate(angle); rect(0, -5, 38, 10, '#131e2a', 2); rect(8, -4, 32, 6, color, 2); circle(0, 0, 15, color); circle(-4, -4, 7, '#e6fff633'); ctx.restore(); rect(p.x - 22, p.y - 35, 44, 4, '#091625', 2); rect(p.x - 22, p.y - 35, 44 * hp, 4, color, 2); }
      for (const e of s.enemies) if (e.hp > 0) tank(e, '#ff967c', e.angle, e.hp / 2); else { ellipse(e.x, e.y, 25, 18, '#08121b77'); rect(e.x - 17, e.y - 12, 34, 24, '#3b444a', 4); }
      if (!s.invincible || Math.floor(t * 10) % 2) tank(s.player, '#6cecc6', Math.atan2(s.aim.y - s.player.y, s.aim.x - s.player.x), s.hp / 100);
      for (const b of s.bullets) { const color = b.hostile ? '#ff8c7b' : '#a8ffe1'; line(b.x, b.y, b.x - b.vx * .025, b.y - b.vy * .025, color, 3); glow(b.x, b.y, 15, b.hostile ? '#ff884433' : '#79ffc433'); circle(b.x, b.y, 3, '#fff9cf'); } target(s.aim.x, s.aim.y, 13, '#79ffbb99'); hud('IRON ARENA', s.destroyed + ' / 8 DRONES    ARMOUR ' + s.hp + '%');
    } else if (id === 'rhythm') {
      rect(0, 0, 720, 480, grad(0, 0, 0, 480, '#150b30', '#0b1b37')); glow(360, 150, 240, '#a548ff22'); glow(570, 400, 170, '#29e4ff22');
      for (let i = 0; i < 15; i++) { const y = 70 + (i * 34 + t * 80) % 410; line(0, y, 720, y, '#4a459f18'); }
      const laneColors = ['#37e7ff', '#bc81ff', '#ff79ad', '#ffc966'];
      for (let i = 0; i < 4; i++) { const x = 180 + i * 90; rect(x, 62, 82, 371, '#090d248a', 8); rect(x, 63, 1, 365, laneColors[i] + '33'); rect(x, 405, 82, 6, laneColors[i], 2); rect(x + 8, 428, 66, 27, '#ffffff08', 5); text(['D', 'F', 'J', 'K'][i], x + 41, 442, 14, laneColors[i]); if (s.lastLane === i && s.laneFlash) { glow(x + 41, 404, 66, laneColors[i] + '77'); rect(x + 3, 385, 76, 22, laneColors[i] + '44', 4); } }
      for (const n of s.notes) { const y = 405 - (n.time - s.elapsed) * 180; if (!n.judged && y > 62 && y < 430) { const x = 185 + n.lane * 90; glow(x + 36, y, 38, laneColors[n.lane] + '20'); rect(x, y - 8, 72, 16, grad(x, y - 8, x, y + 8, '#fff8ff', laneColors[n.lane]), 5); } }
      text('×' + s.combo, 96, 230, 39, '#ecdbff'); text('COMBO', 96, 267, 10, '#baa0de'); text(Math.round(s.hits / Math.max(1, s.hits + s.misses) * 100) + '%', 641, 230, 23, '#b3faff'); text('ACCURACY', 641, 259, 9, '#86a6c6'); hud('PULSE CIRCUIT', s.hits + ' / 72 NOTES');
    }
    if (s.flash > 0 && s.feedback) { const width = Math.min(650, 42 + s.feedback.length * 8); rect(360 - width / 2, 56, width, 33, '#061023de', 7); text(s.feedback, 360, 73, 12, '#f0faff'); }
    // Lens shading anchors every scene without post-processing dependencies.
    const vignette = ctx.createRadialGradient(360, 240, 130, 360, 240, 450); vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#02061355'); rect(0, 0, 720, 480, vignette);
    ctx.restore();
  }
  root.ArenaRenderer = Object.freeze({ draw });
})(typeof window === 'object' ? window : globalThis);
