(() => {
  'use strict';
  const { games, byId } = window.ArcadeCatalog;
  const Engine = window.ArcadeEngine, Saves = window.ArcadeSave;
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, '');
      else if (value !== false && value != null) node.setAttribute(key, String(value));
    }
    for (const child of children.flat()) if (child != null) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return node;
  };
  let profile;
  try { profile = Saves.normalize(JSON.parse(localStorage.getItem(Saves.KEY))); } catch { profile = Saves.normalize(null); }
  function persist() { try { localStorage.setItem(Saves.KEY, JSON.stringify(profile)); $('storageNotice').hidden = true; } catch { $('storageNotice').hidden = false; } }
  const gameHref = (g) => g.id === 'gumdrop' ? (location.protocol === 'file:' ? 'Gumdrop Grid.html' : 'gumdrop.html') : '#game/' + g.id;
  const poster = (g) => window.ArcadePosters?.[g.id] || 'assets/posters/' + g.id + '.svg';
  const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString();
  const time = (seconds) => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  let toastTimer = 0;
  function toast(message) { $('arcadeToast').textContent = message; $('arcadeToast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('arcadeToast').hidden = true; }, 2500); }
  function toggleFavorite(id) {
    if (profile.favorites.includes(id)) profile.favorites = profile.favorites.filter((v) => v !== id); else profile.favorites.push(id);
    persist(); updateFavorite(); renderLibrary(); renderRecent();
  }
  let category = 'All games', query = '', sort = 'featured', favoritesOnly = false;
  const categories = ['All games', 'Racing', 'Sports', 'Action', 'Music', 'Arcade', 'Puzzle', 'Strategy', 'Memory', 'Words', 'Quick play'];
  function renderCategories() {
    $('categories').replaceChildren(...categories.map((name) => el('button', { class: 'categoryButton', text: name, 'aria-pressed': name === category, onclick: () => { category = name; renderCategories(); renderLibrary(); $('categories').querySelectorAll('button')[categories.indexOf(name)].focus({ preventScroll: true }); } })));
  }
  function renderLibrary() {
    let list = games.filter((g) => (!favoritesOnly || profile.favorites.includes(g.id)) && (category === 'All games' || category === g.category) && (g.title + ' ' + g.description + ' ' + g.category).toLowerCase().includes(query.toLowerCase()));
    if (sort === 'featured') list = list.slice().sort((a, b) => Number(!!b.arena) - Number(!!a.arena));
    if (sort === 'az') list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'recent') list = list.slice().sort((a, b) => { const rank = (g) => profile.recent.indexOf(g.id) < 0 ? 99 : profile.recent.indexOf(g.id); return rank(a) - rank(b); });
    $('gameGrid').replaceChildren(...list.map((g) => {
      const link = gameHref(g);
      const card = el('article', { class: 'gameCard' },
        el('a', { class: 'gameCover', href: link, 'aria-label': 'Play ' + g.title }, el('img', { src: poster(g), alt: '', width: 640, height: 400, loading: 'lazy' }), el('span', { class: 'coverBadge', text: g.tag })),
        el('button', { class: 'cardFavorite', text: profile.favorites.includes(g.id) ? '♥' : '♡', 'aria-label': 'Favorite ' + g.title, 'aria-pressed': profile.favorites.includes(g.id), onclick: () => {
          toggleFavorite(g.id);
          const button = [...$('gameGrid').querySelectorAll('.cardFavorite')].find((b) => b.getAttribute('aria-label') === 'Favorite ' + g.title); button?.focus({ preventScroll: true });
        } }),
        el('div', { class: 'gameCardInfo' }, el('div', { class: 'gameMeta' }, el('span', { text: g.category }), el('span', { text: g.minutes + ' min' })), el('h3', {}, el('a', { href: link, text: g.title })), el('p', { text: g.description }), el('a', { class: 'cardPlay', href: link }, el('span', { text: 'Play now' }), el('span', { text: '↗', 'aria-hidden': 'true' }))));
      card.style.setProperty('--accent', g.accent); return card;
    }));
    $('libraryCount').textContent = list.length; $('libraryTitle').firstChild.textContent = favoritesOnly ? 'Your favorites ' : 'Explore the arcade ';
    $('emptyState').hidden = list.length > 0;
    $('emptyText').textContent = favoritesOnly && !profile.favorites.length ? 'Tap a heart on any game to save it here.' : 'Try another search or category.';
    $('favoriteCount').textContent = profile.favorites.length;
  }
  function miniGame(g, cls) { return el('a', { class: cls, href: gameHref(g) }, el('img', { src: poster(g), alt: '', width: 66, height: 47 }), el('span', {}, el('b', { text: g.title }), el('small', { text: g.category })), cls === 'recentGame' ? el('span', { text: '↗', 'aria-hidden': 'true' }) : null); }
  function renderRecent() { $('recentSection').hidden = profile.recent.length === 0; $('recentGames').replaceChildren(...profile.recent.map((id) => miniGame(byId(id), 'recentGame'))); }
  function renderProfile() {
    $('profileGreeting').textContent = 'Hey, ' + profile.name + '.'; $('playerName').value = profile.name;
    const stats = Object.values(profile.stats); const sum = (k) => stats.reduce((n, s) => n + s[k], 0);
    $('statPlayed').textContent = fmt(sum('plays')); $('statWins').textContent = fmt(sum('wins')); $('statFavorites').textContent = profile.favorites.length;
    const minutes = Math.floor(sum('seconds') / 60); $('statTime').textContent = minutes >= 60 ? Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm' : minutes + 'm';
    const played = games.filter((g) => profile.stats[g.id]?.plays);
    $('bestScores').replaceChildren(...(played.length ? played.map((g) => el('div', { class: 'scoreRow' }, el('a', { href: gameHref(g) }, el('img', { src: poster(g), alt: '' }), el('span', { text: g.title })), el('strong', { text: fmt(profile.stats[g.id].best) }))) : [el('p', { text: 'Your first personal best is one game away.' })]));
  }
  $('gameSearch').addEventListener('input', () => { query = $('gameSearch').value; renderLibrary(); });
  $('gameSort').addEventListener('change', () => { sort = $('gameSort').value; renderLibrary(); });
  $('clearFilters').addEventListener('click', () => { category = 'All games'; query = ''; favoritesOnly = false; $('gameSearch').value = ''; if (location.hash !== '#discover') location.hash = 'discover'; else { renderCategories(); renderLibrary(); } });
  $('surpriseBtn').addEventListener('click', () => { $('surpriseBtn').href = '#game/' + games[1 + Math.floor(Math.random() * (games.length - 1))].id; });
  $('featuredLink').href = gameHref(byId('racing'));
  $('spotlightGames').replaceChildren(...['penalty', 'football', 'rally'].map((id) => { const g = byId(id); return el('a', { class: 'spotlightCard', href: gameHref(g) }, el('img', { src: poster(g), alt: '', width: 640, height: 400 }), el('div', { class: 'spotlightCaption' }, el('span', { class: 'eyebrow', text: g.category + ' / NEW RELEASE' }), el('h3', { text: g.title }), el('span', { class: 'spotlightPlay', text: 'Jump in ↗' }))); }));
  const today = new Date(); const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000); const daily = games[1 + dayNumber % (games.length - 1)];
  $('dailyTitle').textContent = daily.title; $('dailyDescription').textContent = daily.description; $('dailyLink').href = gameHref(daily);
  $('year').textContent = today.getFullYear();
  $('profileShortcut').addEventListener('click', () => { location.hash = 'profile'; });
  $('nameForm').addEventListener('submit', (e) => { e.preventDefault(); const name = $('playerName').value.trim(); if (!name) return; profile.name = name.slice(0, 24); persist(); renderProfile(); toast('Player name saved.'); });

  let modal = null, previousFocus = null;
  function closeModal() { if (!modal) return; modal.remove(); modal = null; $('platformApp').inert = false; document.body.classList.remove('modalOpen'); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); previousFocus = null; }
  function showModal(title, paragraphs, buttons = []) {
    closeModal(); previousFocus = document.activeElement;
    const heading = el('h2', { id: 'modalTitle', text: title });
    const card = el('div', { class: 'modalCard', tabindex: '-1' }, heading, ...paragraphs.map((p) => typeof p === 'string' ? el('p', { text: p }) : p), el('div', { class: 'modalButtons' }, ...buttons, el('button', { class: 'secondary', text: 'Close', onclick: closeModal })));
    modal = el('div', { class: 'modalWrap', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modalTitle' }, card);
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
    $('platformApp').inert = true; document.body.classList.add('modalOpen'); document.body.append(modal); card.querySelector('button').focus();
  }
  document.addEventListener('keydown', (e) => {
    if (!modal) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.key === 'Tab') { const focusable = [...modal.querySelectorAll('button:not(:disabled),a[href],input')]; const first = focusable[0], last = focusable[focusable.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  $('aboutBtn').addEventListener('click', () => { pauseIfPlaying(); showModal('Welcome to Algoredeem Games', ['An independent browser arcade with ' + games.length + ' games. Football, racing, sports, action, rhythm, puzzles and strategy — choose your next challenge.', 'All games are free. Your favourites and scores stay on this device. Most games work offline once the platform files have been cached. Gumdrop Grid keeps its own level progress.']); });
  const AD_KEY = 'gumdrop-grid-ad-choice-v1'; let adChoice = false;
  try { adChoice = localStorage.getItem(AD_KEY) === 'yes'; } catch {}
  const loadScript = (src, attrs = {}) => new Promise((resolve, reject) => { const script = el('script', { src, crossorigin: 'anonymous', ...attrs }); script.async = true; const timer = setTimeout(() => { script.remove(); reject(new Error('Ad service unavailable')); }, 12000); script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Ad service unavailable')); }; document.head.append(script); });
  async function consent() {
    if (typeof window.GumdropConsentReady === 'function') return !!(await window.GumdropConsentReady());
    if (!window.GumdropConfig.cmpUrl) return false;
    if (typeof window.__tcfapi !== 'function') await loadScript(window.GumdropConfig.cmpUrl);
    if (typeof window.__tcfapi !== 'function') return false;
    return new Promise((resolve) => {
      let finished = false;
      const finish = (allowed, listenerId) => { if (finished) return; finished = true; clearTimeout(timer); if (listenerId != null) window.__tcfapi('removeEventListener', 2, () => {}, listenerId); resolve(allowed); };
      const timer = setTimeout(() => finish(false), 20000);
      window.__tcfapi('addEventListener', 2, (data, success) => { if (success && data && ['tcloaded', 'useractioncomplete'].includes(data.eventStatus)) finish(data.gdprApplies === false || (data.gdprApplies === true && data.vendor?.consents?.[755] && data.purpose?.consents?.[1] && data.purpose?.consents?.[2]), data.listenerId); });
    });
  }
  const ads = window.GumdropAds.create({ config: window.GumdropConfig, consent, loadScript });
  function privacy() {
    pauseIfPlaying();
    showModal('Privacy & preferences', ['Your player name, favourites, recent games, best scores and sound setting are stored in this browser. There is no account, payment service or game analytics. Your host may keep normal website access logs.', 'Optional Google ads may use device information. Ads require your permission and the publisher’s consent setup. Offline advertising is unavailable. Clearing browser data removes local scores and game progress.'], [
      el('a', { href: 'https://policies.google.com/privacy', target: '_blank', rel: 'noopener noreferrer', text: 'Google Privacy Policy' }),
      el('button', { class: 'secondary', text: adChoice ? 'Disable ads' : 'Enable optional ads', disabled: !adChoice && !ads.available(), onclick: () => { adChoice = !adChoice; try { localStorage.setItem(AD_KEY, adChoice ? 'yes' : 'no'); } catch {} if (!adChoice) ads.reset(); privacy(); } })
    ]);
  }
  $('privacyBtn').addEventListener('click', privacy);
  $('resetStats').addEventListener('click', () => showModal('Reset your arcade stats?', ['This removes the arcade player name, favourites, recent games and personal bests. Gumdrop Grid’s level progress is managed inside that game.'], [el('button', { class: 'primary', text: 'Reset arcade stats', onclick: () => { profile = Saves.normalize(null); persist(); updateSound(); configureCanvas(); renderProfile(); renderRecent(); renderLibrary(); closeModal(); toast('Arcade stats reset.'); } })]));
  let audio = null;
  function beep(freq = 520) {
    if (!profile.sound) return;
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.frequency.value = freq; oscillator.type = 'sine'; gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .12); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .13); } catch {}
  }
  function updateSound() { $('soundToggle').textContent = profile.sound ? 'Sound on' : 'Sound off'; $('soundToggle').setAttribute('aria-pressed', String(profile.sound)); }
  $('soundToggle').addEventListener('click', () => { profile.sound = !profile.sound; persist(); updateSound(); if (profile.sound) beep(); });

  let active = null, state = null, paused = false, recorded = false, frameId = 0, lastFrame = 0, displayedRevision = -1, displayedSecond = -1, roundEnded = 0, loadingAd = false;
  const keys = new Set(), canvas = $('arcadeCanvas'), ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  function configureCanvas() {
    const density = profile.quality === 'balanced' ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Engine.W * density; canvas.height = Engine.H * density;
    ctx?.setTransform(density, 0, 0, density, 0, 0);
    $('graphicsQuality').value = profile.quality;
    if (state && active?.type === 'canvas') drawCanvas();
  }
  $('graphicsQuality').addEventListener('change', () => { profile.quality = $('graphicsQuality').value === 'balanced' ? 'balanced' : 'high'; persist(); configureCanvas(); });
  window.addEventListener('resize', configureCanvas);
  configureCanvas();
  function updateFavorite() { $('favoriteCount').textContent = profile.favorites.length; if (active) { const favorite = profile.favorites.includes(active.id); $('playFavorite').textContent = (favorite ? '♥' : '♡') + ' Favorite'; $('playFavorite').setAttribute('aria-pressed', String(favorite)); } }
  function openGame(id) {
    const game = byId(id); if (!game || game.type === 'external') { location.hash = 'discover'; return; }
    active = game; state = null; paused = false; recorded = false; keys.clear(); displayedRevision = -1;
    $('playTitle').textContent = game.title; $('playCategory').textContent = game.category; $('playInstructions').textContent = game.controls; $('controlBadge').textContent = game.type === 'canvas' ? 'Keyboard + touch' : 'Touch + keyboard';
    canvas.setAttribute('aria-label', game.title + ' game board. ' + game.controls); canvas.hidden = game.type !== 'canvas'; $('puzzleBoard').hidden = game.type !== 'board'; $('puzzleBoard').replaceChildren();
    $('gameStage').setAttribute('data-arena', String(!!game.arena)); $('graphicsQuality').parentNode?.setAttribute('hidden', '');
    if (game.type === 'canvas') $('graphicsQuality').parentNode?.removeAttribute('hidden');
    if (game.arena && ctx) window.ArenaRenderer.draw(ctx, game.id, Engine.create(game.id), reducedMotion);
    $('playScore').textContent = '0'; $('playBest').textContent = fmt(profile.stats[id]?.best || 0); $('detailLabel').textContent = 'TIME'; $('playDetail').textContent = '0:00'; $('gameMessage').textContent = game.description;
    $('pauseGame').disabled = true; $('restartGame').disabled = true; $('touchControls').hidden = true;
    $('relatedGames').replaceChildren(...games.filter((g) => g.id !== id).sort((a, b) => Number(b.category === game.category) - Number(a.category === game.category)).slice(0, 3).map((g) => miniGame(g, 'relatedGame')));
    overlay('READY WHEN YOU ARE', game.title, game.description, 'Play game'); updateFavorite(); $('startGame').focus({ preventScroll: true });
  }
  function overlay(kicker, title, message, button) { $('stageOverlay').hidden = false; $('overlayKicker').textContent = kicker; $('overlayTitle').textContent = title; $('overlayText').textContent = message; $('startGame').textContent = button; }
  async function start() {
    if (!active || loadingAd) return;
    if (paused && state?.status === 'playing') { paused = false; $('stageOverlay').hidden = true; $('pauseGame').textContent = 'Pause'; if (active.type === 'board') renderBoard(); wake(); focusBoard(); return; }
    if (roundEnded && roundEnded % 3 === 0 && adChoice && ads.available() && navigator.onLine !== false) {
      loadingAd = true; $('startGame').disabled = true; $('overlayText').textContent = 'A short break before your next round.';
      try { await ads.interstitial('arcade_between_rounds', { beforeAd: () => { if (audio) audio.suspend().catch(() => {}); }, afterAd: () => {} }); } finally { loadingAd = false; $('startGame').disabled = false; }
      roundEnded = 0;
    }
    state = Engine.create(active.id); paused = false; recorded = false; displayedRevision = -1; displayedSecond = -1; keys.clear();
    Saves.visit(profile, active.id); persist(); renderRecent();
    $('stageOverlay').hidden = true; $('pauseGame').disabled = false; $('pauseGame').textContent = 'Pause'; $('restartGame').disabled = false;
    renderControls(); renderGame(); wake(); focusBoard(); beep(600);
  }
  function focusBoard() { if (active.type === 'canvas') canvas.focus({ preventScroll: true }); else if (active.id === 'words') $('wordAnswer')?.focus({ preventScroll: true }); else ($('puzzleBoard').querySelector('button:not(:disabled)') || $('puzzleBoard')).focus({ preventScroll: true }); }
  function pauseIfPlaying() { if (state?.status === 'playing' && !paused) pause(); }
  function pause() {
    if (!state || state.status !== 'playing' || loadingAd) return;
    paused = !paused; keys.clear(); setAxis();
    $('pauseGame').textContent = paused ? 'Resume' : 'Pause';
    if (paused) { overlay('TAKE YOUR TIME', 'Game paused', 'Your round will be right here when you are ready.', 'Resume game'); $('startGame').focus({ preventScroll: true }); }
    else { $('stageOverlay').hidden = true; wake(); focusBoard(); }
  }
  function act(action) {
    if (!state || paused || modal || loadingAd || state.status !== 'playing') return;
    const oldScore = state.score; Engine.action(active.id, state, action); if (state.score > oldScore) beep(active.id === 'simon' ? [420, 520, 620, 720][action.index] : 580);
    renderGame(); finishIfNeeded();
  }
  function finishIfNeeded() {
    if (!state || state.status === 'playing' || recorded) return;
    recorded = true; keys.clear(); roundEnded++;
    const best = Saves.result(profile, active.id, state.score, state.status === 'won', state.elapsed); persist();
    $('playBest').textContent = fmt(profile.stats[active.id].best); $('pauseGame').disabled = true;
    const title = state.status === 'won' ? 'Nicely played!' : state.status === 'draw' ? 'An even match.' : 'One more round?';
    overlay(best ? 'NEW PERSONAL BEST' : 'ROUND COMPLETE', title, state.message + ' Your score: ' + fmt(state.score) + '.', 'Play again');
    $('arcadeLive').textContent = title + ' ' + state.message + ' Score ' + fmt(state.score); beep(state.status === 'won' ? 880 : 330);
    $('startGame').focus({ preventScroll: true });
  }
  function wake() { if (!frameId && state?.status === 'playing' && !paused && !document.hidden && !modal) { lastFrame = performance.now(); frameId = requestAnimationFrame(frame); } }
  function frame(now) {
    frameId = 0; if (!state || state.status !== 'playing' || paused || document.hidden || modal || $('playScreen').hidden) return;
    const before = state.elapsed;
    let dt = Math.min(.06, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    while (dt > 0 && state.status === 'playing') { const step = Math.min(dt, 1 / 120); Engine.tick(active.id, state, step); dt -= step; }
    if (active.id === 'rhythm') for (const note of state.notes) if (note.time > before && note.time <= state.elapsed) beep([294, 370, 440, 587][note.lane]);
    renderGame(); finishIfNeeded(); if (state.status === 'playing') frameId = requestAnimationFrame(frame);
  }
  function detail() {
    if (!state) return ['TIME', '0:00'];
    switch (active.id) {
      case 'snake': return ['LENGTH', state.body.length];
      case 'breakout': return ['LIVES', state.lives];
      case 'space': return ['WAVE / SHIELDS', state.wave + ' / ' + state.lives];
      case 'pong': return ['RALLY', state.points + ' : ' + state.opponent];
      case 'memory': return ['TURNS', state.turns];
      case 'merge': case 'slide': return ['MOVES', state.moves];
      case 'mines': return ['FLAGS / MINES', state.flags.filter(Boolean).length + ' / 10'];
      case 'sudoku': return ['HINTS LEFT', state.hints];
      case 'simon': return ['ROUND', state.sequence.length + ' / 15'];
      case 'words': return ['WORD', Math.min(10, state.round + 1) + ' / 10'];
      case 'mole': return ['TIME LEFT', time(Math.ceil(state.remaining))];
      case 'penalty': return ['GOALS / SHOTS', state.goals + ' / ' + state.attempts];
      case 'football': return ['MATCH', state.goals + ' : ' + state.against];
      case 'racing': case 'rally': return ['DISTANCE', (state.distance / 1000).toFixed(1) + ' km'];
      case 'kart': return ['LAP', state.lap + ' / 3'];
      case 'basket': return ['BASKETS', state.baskets];
      case 'bowling': return ['FRAME', Math.min(10, state.frame) + ' / 10'];
      case 'golf': return ['HOLE', Math.min(5, state.hole) + ' / 5'];
      case 'pool': return ['POCKETED', state.potted + ' / 6'];
      case 'tennis': case 'hockey': return ['MATCH', state.points + ' : ' + state.against];
      case 'archery': return ['ARROWS', state.arrows];
      case 'flight': return ['RINGS', state.rings + ' / 20'];
      case 'tank': return ['ARMOUR', state.hp + '%'];
      case 'rhythm': return ['COMBO', state.combo];
      default: return ['TIME', time(state.elapsed)];
    }
  }
  function renderGame() {
    if (!state) return;
    $('playScore').textContent = fmt(state.score); const [label, value] = detail(); $('detailLabel').textContent = label; $('playDetail').textContent = value;
    if (active.type === 'canvas') drawCanvas();
    else if (displayedRevision !== state.revision) { displayedRevision = state.revision; renderBoard(); }
    const message = active.id === 'connect' || active.id === 'tictac' ? (state.turn === 1 ? 'Your turn.' : 'The computer is thinking…') : active.id === 'simon' ? (state.phase === 'watch' ? 'Watch the sequence.' : 'Your turn — repeat the sequence.') : active.id === 'words' ? state.feedback || 'Trust the clue. Rearrange the letters.' : active.id === 'mines' ? (state.flagMode ? 'Flag mode: mark a suspected mine.' : 'Reveal mode: find the safe spaces.') : active.id === 'sudoku' ? 'Select a cell and place a number. Conflicts appear in pink.' : active.description;
    $('gameMessage').textContent = active.arena && state.flash > 0 ? state.feedback : message;
    if (displayedSecond !== Math.floor(state.elapsed)) displayedSecond = Math.floor(state.elapsed);
  }
  const flowers = ['✿', '✦', '♥', '☀', '☾', '◇', '♣', '★'];
  function boardCell(index, text, className = '', disabled = false, kind = 'cell', label) {
    return el('button', { class: 'boardCell ' + className, type: 'button', text, disabled, 'data-cell': index, 'aria-label': label || 'Cell ' + (index + 1) + ': ' + (text || 'empty'), onclick: () => act({ kind, index }) });
  }
  function renderBoard() {
    const root = $('puzzleBoard'), focus = document.activeElement?.getAttribute?.('data-cell');
    if (active.id === 'words') {
      if ($('wordAnswer') && Number($('wordAnswer').getAttribute('data-round')) === state.round) { $('wordHint').textContent = state.words[state.round]?.[0].slice(0, state.hints).padEnd(state.words[state.round]?.[0].length || 0, '·'); return; }
      if (state.round >= 10) return;
      const form = el('form', { onsubmit: (e) => { e.preventDefault(); act({ kind: 'answer', value: $('wordAnswer').value }); } },
        el('input', { id: 'wordAnswer', 'data-round': state.round, 'aria-label': 'Your word answer', placeholder: 'Your answer', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '32' }), el('button', { class: 'primary', type: 'submit', text: 'Check word' }));
      root.replaceChildren(el('div', { class: 'wordBoard' }, el('span', { class: 'eyebrow', text: 'WORD ' + (state.round + 1) + ' OF 10' }), el('div', { class: 'scramble', text: state.scrambled.toUpperCase() }), el('p', { class: 'wordClue', text: state.words[state.round][1] }), el('div', { class: 'wordHint', id: 'wordHint', text: '·'.repeat(state.words[state.round][0].length) }), form,
        el('div', { class: 'boardToolbar' }, el('button', { text: 'Letter hint', onclick: () => act({ kind: 'hint' }) }), el('button', { text: 'Skip word', onclick: () => act({ kind: 'skip' }) }))));
      if (recorded === false && !paused) $('wordAnswer').focus({ preventScroll: true }); return;
    }
    let grid, children = [];
    if (active.id === 'memory') { grid = el('div', { class: 'boardGrid cols4', role: 'group', 'aria-label': 'Memory cards' }); children = state.cards.map((v, i) => { const face = state.matched[i] || state.open.includes(i); return boardCell(i, face ? flowers[v] : '◇', 'face' + (state.matched[i] ? ' matched' : ''), state.matched[i], 'cell', 'Card ' + (i + 1) + (state.matched[i] ? ', matched ' + flowers[v] : face ? ', ' + flowers[v] : ', face down')); }); }
    if (active.id === 'merge') {
      grid = el('div', { class: 'boardGrid cols4 mergeBoard', role: 'group', 'aria-label': '2048 tile board' });
      children = state.cells.map((v, i) => { const cell = el('div', { class: 'boardCell mergeTile' + (!v ? ' blank' : ''), text: v || '', 'aria-label': 'Row ' + (Math.floor(i / 4) + 1) + ', column ' + (i % 4 + 1) + ': ' + (v || 'empty') }); if (v) { const colors = ['#d8e5cd', '#d1dda3', '#eed38a', '#edb782', '#e89a82', '#d58dba', '#b19dde', '#95bade', '#83cbbf', '#bafa75', '#edeea5']; cell.style.setProperty('--tile-bg', colors[Math.min(colors.length - 1, Math.log2(v) - 1)]); cell.style.setProperty('--tile-ink', '#27362b'); } return cell; });
    }
    if (active.id === 'mines') {
      grid = el('div', { class: 'boardGrid cols9', role: 'group', 'aria-label': '9 by 9 minefield' });
      children = state.revealed.map((open, i) => { const showMine = state.status === 'lost' && state.mines[i]; const value = showMine ? '✹' : state.flags[i] ? '⚑' : open ? state.counts[i] || '' : ''; const cell = boardCell(i, value, 'mineCell' + (open ? ' revealed' : '') + (showMine ? ' mineHit' : ''), open, 'cell', 'Row ' + (Math.floor(i / 9) + 1) + ', column ' + (i % 9 + 1) + ': ' + (showMine ? 'mine' : state.flags[i] ? 'flagged' : open ? state.counts[i] + ' adjacent mines' : 'hidden')); cell.addEventListener('contextmenu', (e) => { e.preventDefault(); act({ kind: 'flag', index: i }); }); return cell; });
    }
    if (active.id === 'sudoku') {
      grid = el('div', { class: 'boardGrid cols9', role: 'group', 'aria-label': 'Sudoku grid' });
      children = state.cells.map((v, i) => boardCell(i, v || '', 'sudokuCell' + (state.given[i] ? ' given' : '') + (state.selected === i ? ' selected' : '') + (Engine.sudokuConflict(state.cells, i, v) ? ' conflict' : '') + (i % 9 === 2 || i % 9 === 5 ? ' boxRight' : '') + (Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? ' boxBottom' : ''), false, 'cell', 'Row ' + (Math.floor(i / 9) + 1) + ', column ' + (i % 9 + 1) + ': ' + (v || 'empty') + (state.given[i] ? ', fixed' : '')));
    }
    if (active.id === 'slide') { grid = el('div', { class: 'boardGrid cols4 slideBoard', role: 'group', 'aria-label': 'Fifteen sliding tiles' }); children = state.cells.map((v, i) => boardCell(i, v || '', !v ? 'blank' : '', !v, 'cell', v ? 'Tile ' + v : 'Empty space')); }
    if (active.id === 'connect') { grid = el('div', { class: 'boardGrid cols7', 'aria-label': 'Connect four board', role: 'group' }); children = state.cells.map((v, i) => el('div', { class: 'boardCell connectCell player' + v, 'aria-label': 'Row ' + (Math.floor(i / 7) + 1) + ', column ' + (i % 7 + 1) + ': ' + (v === 1 ? 'coral' : v === 2 ? 'cyan' : 'empty') })); }
    if (active.id === 'tictac') { grid = el('div', { class: 'boardGrid cols3', role: 'group', 'aria-label': 'Noughts and crosses' }); children = state.cells.map((v, i) => boardCell(i, v === 1 ? 'X' : v === 2 ? 'O' : '', 'tictacCell player' + v, v > 0 || state.turn !== 1)); }
    if (active.id === 'simon') { grid = el('div', { class: 'boardGrid simonGrid', role: 'group', 'aria-label': 'Sequence pads' }); children = ['Green', 'Purple', 'Orange', 'Cyan'].map((name, i) => { const button = el('button', { class: 'simonPad' + (state.lit === i ? ' lit' : ''), text: i + 1, disabled: state.phase !== 'repeat', 'aria-label': name + ' pad, key ' + (i + 1), 'data-cell': i, onclick: () => act({ kind: 'pad', index: i }) }); button.style.setProperty('--pad-color', ['#bafa75', '#b4a2ff', '#ffb395', '#88e4e2'][i]); return button; }); }
    if (active.id === 'mole') { grid = el('div', { class: 'boardGrid cols3', role: 'group', 'aria-label': 'Nine critter holes' }); children = state.holes.map((v, i) => { const cell = boardCell(i, v > 0 ? '●' : '', 'moleCell' + (v > 0 ? ' active' : ''), false, 'cell', 'Hole ' + (i + 1) + (v > 0 ? ', critter visible' : ', empty')); cell.append(el('small', { text: i + 1, 'aria-hidden': 'true' })); return cell; }); }
    if (!grid) return;
    grid.append(...children); const content = [];
    if (active.id === 'connect') content.push(el('div', { class: 'columnButtons' }, ...Array.from({ length: 7 }, (_, i) => el('button', { text: '↓', disabled: state.turn !== 1 || state.cells[i] > 0, 'data-cell': i, 'aria-label': 'Drop disc in column ' + (i + 1), onclick: () => act({ kind: 'column', index: i }) }))));
    if (active.id === 'simon') content.push(el('div', { class: 'simonLabel', text: state.phase === 'watch' ? 'Watch the lights…' : 'Repeat the pattern.' }));
    content.push(grid);
    if (active.id === 'mines') content.push(el('div', { class: 'boardToolbar' }, el('button', { text: state.flagMode ? 'Flag mode on' : 'Reveal mode', 'aria-pressed': state.flagMode, onclick: () => act({ kind: 'flag-mode' }) })));
    if (active.id === 'sudoku') content.push(el('div', { class: 'numberButtons' }, ...Array.from({ length: 9 }, (_, i) => el('button', { text: i + 1, 'aria-label': 'Place number ' + (i + 1), onclick: () => act({ kind: 'number', value: i + 1 }) }))), el('div', { class: 'boardToolbar' }, el('button', { text: 'Erase', onclick: () => act({ kind: 'number', value: 0 }) }), el('button', { text: 'Hint (' + state.hints + ')', disabled: !state.hints, onclick: () => act({ kind: 'hint' }) })));
    root.replaceChildren(...content);
    if (focus != null) root.querySelector('[data-cell="' + focus + '"]:not(:disabled)')?.focus({ preventScroll: true });
  }
  function drawCanvas() {
    if (!ctx || !state) return;
    if (active.arena) { window.ArenaRenderer.draw(ctx, active.id, state, reducedMotion); return; }
    const w = Engine.W, h = Engine.H;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#090f20'; ctx.fillRect(0, 0, w, h);
    const rect = (x, y, width, height, color, radius = 5) => { ctx.fillStyle = color; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius); else ctx.rect(x, y, width, height); ctx.fill(); };
    const circle = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const text = (value, x, y, size, color = '#a3adc5') => { ctx.fillStyle = color; ctx.font = '700 ' + size + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); };
    if (active.id === 'snake') {
      const size = 21, x0 = 150, y0 = 30;
      rect(x0 - 8, y0 - 8, 436, 436, '#182d2a', 12);
      for (let r = 0; r < 20; r++) for (let c = 0; c < 20; c++) rect(x0 + c * size, y0 + r * size, size - 1, size - 1, (r + c) % 2 ? '#101f25' : '#102329', 2);
      state.body.forEach((p, i) => rect(x0 + p.x * size + 1, y0 + p.y * size + 1, size - 3, size - 3, i === 0 ? '#d4ffaf' : '#8bea9c', 4));
      if (state.fruit) { const x = x0 + state.fruit.x * size + size / 2, y = y0 + state.fruit.y * size + size / 2; circle(x, y, 7, '#ff9caa'); rect(x - 1, y - 10, 3, 4, '#bafa75', 1); }
      const head = state.body[0]; circle(x0 + head.x * size + 8 + state.dx * 3, y0 + head.y * size + 7 + state.dy * 3, 1.6, '#1c3925'); circle(x0 + head.x * size + 13 + state.dx * 3, y0 + head.y * size + 12 + state.dy * 3, 1.6, '#1c3925');
    }
    if (active.id === 'breakout') {
      ctx.strokeStyle = '#263653'; ctx.strokeRect(12, 12, w - 24, h - 24);
      const colors = ['#ac8be4', '#c39feb', '#e8a2cd', '#ffb395', '#e9d493'];
      for (const brick of state.bricks) if (brick.alive) { rect(brick.x, brick.y, brick.w, brick.h, colors[brick.row], 5); rect(brick.x + 4, brick.y + 3, brick.w - 8, 2, '#ffffff35', 1); }
      rect(state.paddle - 56, 445, 112, 14, '#d6a2ff', 7); circle(state.ball.x, state.ball.y, 8, '#fff5ff');
      text(state.bricks.filter((b) => b.alive).length + ' prisms left', 360, 30, 12);
    }
    if (active.id === 'space') {
      for (let i = 0; i < 65; i++) circle((i * 173 + 49) % w, (i * 131 + state.elapsed * (i % 3 + 1) * 3) % h, i % 4 ? 1 : 1.8, '#64759c88');
      for (const e of state.enemies) if (e.alive) { ctx.fillStyle = state.wave % 2 ? '#7ec8ff' : '#b4a2ff'; ctx.beginPath(); ctx.moveTo(e.x, e.y + 12); ctx.lineTo(e.x + 8, e.y); ctx.lineTo(e.x + 22, e.y); ctx.lineTo(e.x + 30, e.y + 12); ctx.lineTo(e.x + 30, e.y + 24); ctx.lineTo(e.x + 22, e.y + 17); ctx.lineTo(e.x + 8, e.y + 17); ctx.lineTo(e.x, e.y + 24); ctx.closePath(); ctx.fill(); }
      state.bullets.forEach((b) => rect(b.x - 2, b.y, 4, 13, '#c9fff1', 2)); state.hostile.forEach((b) => rect(b.x - 2, b.y, 4, 13, '#ffb0c1', 2));
      if (!state.invincible || Math.floor(state.elapsed * 10) % 2) { ctx.fillStyle = '#bafa75'; ctx.beginPath(); ctx.moveTo(state.player, 420); ctx.lineTo(state.player - 22, 452); ctx.lineTo(state.player, 445); ctx.lineTo(state.player + 22, 452); ctx.closePath(); ctx.fill(); }
      text('WAVE ' + state.wave, 70, 26, 12, '#9cadd0');
    }
    if (active.id === 'runner') {
      const shift = state.distance * .16;
      for (let i = -1; i < 13; i++) { const x = i * 72 - shift % 72, height = 60 + ((i + 50) * 31) % 120; rect(x, 330 - height, 58, height + 64, '#252e48', 2); for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) rect(x + 9 + col * 15, 338 - height + row * 24, 5, 7, '#46506a', 1); }
      circle(610, 75, 29, '#edd5a6'); rect(0, 394, w, 86, '#101b2d', 0); rect(0, 394, w, 3, '#ffc47e', 0);
      for (let i = 0; i < 13; i++) rect(i * 65 - state.distance % 65, 425, 28, 3, '#5f657a', 0);
      state.obstacles.forEach((o) => { rect(o.x, o.y, o.w, o.h, '#d796ba', 6); rect(o.x + 4, o.y + 4, o.w - 8, 3, '#efbdd0', 1); });
      rect(84, state.y, 38, 38, '#ffc47e', 8); circle(112, state.y + 10, 3, '#503e31'); rect(91, state.y + 38, 7, 5, '#e29b58', 2); rect(111, state.y + 36, 7, 7, '#e29b58', 2);
      text('DISTANCE ' + Math.floor(state.distance / 10) + ' m', 120, 42, 13);
    }
    if (active.id === 'pong') {
      ctx.strokeStyle = '#263d50'; ctx.strokeRect(12, 12, w - 24, h - 24);
      for (let y = 22; y < h; y += 26) rect(w / 2 - 2, y, 4, 13, '#e7ffff25', 1);
      rect(28, state.player - 48, 14, 96, '#88e4e2', 6); rect(w - 42, state.rival - 48, 14, 96, '#b4a2ff', 6);
      circle(state.ball.x, state.ball.y, 8, '#f4ffff'); text(state.points, 285, 65, 44, '#c3fffa'); text(state.opponent, 435, 65, 44, '#d3c7ff');
      if (state.delay > 0) text('Next rally…', w / 2, h / 2 + 55, 14);
    }
  }
  const directionMap = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  function setAxis() {
    if (!active || !state) return;
    if (active.arena) {
      const dx = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
      const dy = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
      Engine.action(active.id, state, { kind: 'move', dx, dy });
      Engine.action(active.id, state, { kind: 'boost', value: keys.has('Shift') }); return;
    }
    const vertical = active.id === 'pong';
    const negative = vertical ? keys.has('ArrowUp') || keys.has('w') : keys.has('ArrowLeft') || keys.has('a');
    const positive = vertical ? keys.has('ArrowDown') || keys.has('s') : keys.has('ArrowRight') || keys.has('d');
    if (['breakout', 'space', 'pong'].includes(active.id)) Engine.action(active.id, state, { kind: 'axis', value: Number(positive) - Number(negative) });
    if (active.id === 'space') Engine.action(active.id, state, { kind: 'fire', value: keys.has(' ') });
  }
  document.addEventListener('keydown', (e) => {
    if (modal || e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === '/' && $('playScreen').hidden) { e.preventDefault(); if (location.hash !== '#discover') location.hash = 'discover'; $('gameSearch').focus(); return; }
    if (!active || $('playScreen').hidden || !state) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (!e.repeat) pause(); return; }
    if (paused) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (active.arena && active.input === 'rhythm' && ['d', 'f', 'j', 'k'].includes(key)) { e.preventDefault(); if (!e.repeat) act({ kind: 'lane', index: ['d', 'f', 'j', 'k'].indexOf(key) }); return; }
    if (active.id === 'tank' && ['q', 'e'].includes(key)) { e.preventDefault(); act({ kind: 'aim-turn', value: key === 'q' ? -1 : 1 }); return; }
    if (active.arena && key === 'Shift') { e.preventDefault(); keys.add(key); setAxis(); return; }
    if (active.arena && (key === ' ' || key === 'Enter') && active.primary) { e.preventDefault(); act({ kind: 'primary' }); return; }
    if (directionMap[key]) {
      e.preventDefault(); const [dx, dy] = directionMap[key]; keys.add(key); setAxis();
      if (['snake', 'merge', 'slide'].includes(active.id)) act({ kind: 'direction', dx, dy });
      else if (active.id === 'runner' && dy < 0) act({ kind: 'jump' });
      else if (active.type === 'board') { const current = Number(document.activeElement.getAttribute('data-cell')); const cols = active.id === 'memory' ? 4 : active.id === 'sudoku' ? 9 : active.id === 'connect' ? 7 : active.id === 'simon' ? 2 : 3; if (Number.isInteger(current)) { const next = current + dx + dy * cols; if (active.id === 'sudoku' && next >= 0 && next < 81) act({ kind: 'cell', index: next }); $('puzzleBoard').querySelector('[data-cell="' + next + '"]:not(:disabled)')?.focus({ preventScroll: true }); } }
    } else if (key === ' ' && ['runner', 'space'].includes(active.id)) { e.preventDefault(); keys.add(key); setAxis(); if (active.id === 'runner') act({ kind: 'jump' }); }
    else if (/^[1-9]$/.test(key)) { if (active.id === 'sudoku') act({ kind: 'number', value: Number(key) }); if (active.id === 'simon') act({ kind: 'pad', index: Number(key) - 1 }); if (active.id === 'mole') act({ kind: 'cell', index: Number(key) - 1 }); if (active.id === 'connect') act({ kind: 'column', index: Number(key) - 1 }); }
    else if (active.id === 'sudoku' && (key === 'Backspace' || key === 'Delete' || key === '0')) { e.preventDefault(); act({ kind: 'number', value: 0 }); }
  });
  document.addEventListener('keyup', (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); setAxis(); });
  let drag = null;
  function pointerPosition(e) { const box = canvas.getBoundingClientRect(); return { x: (e.clientX - box.left) / box.width * Engine.W, y: (e.clientY - box.top) / box.height * Engine.H }; }
  canvas.addEventListener('pointerdown', (e) => { if (!e.isPrimary || e.button !== 0 || !state || paused) return; canvas.focus({ preventScroll: true }); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch {} if (active.id === 'runner') act({ kind: 'jump' }); else if (active.id !== 'snake') act({ kind: 'pointer', ...pointerPosition(e) }); });
  canvas.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; if (active.id === 'snake') { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) > 16) { act({ kind: 'direction', dx: Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, dy: Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0 }); drag.moved = true; } } else act({ kind: 'pointer', ...pointerPosition(e) }); });
  canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  let swipe = null;
  $('puzzleBoard').addEventListener('pointerdown', (e) => { if (active && ['merge', 'slide'].includes(active.id)) swipe = { x: e.clientX, y: e.clientY }; });
  $('puzzleBoard').addEventListener('pointerup', (e) => { if (!swipe) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.hypot(dx, dy) > 25) { e.preventDefault(); act({ kind: 'direction', dx: Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, dy: Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0 }); } });
  $('puzzleBoard').addEventListener('pointercancel', () => { swipe = null; });
  function renderControls() {
    if (active.arena) { renderArenaControls(); return; }
    const continuous = ['breakout', 'space', 'pong'].includes(active.id); const buttons = [];
    if (['snake', 'merge', 'slide', 'breakout', 'space', 'pong'].includes(active.id)) {
      const entries = active.id === 'pong' ? [['↑', 'ArrowUp'], ['↓', 'ArrowDown']] : ['breakout', 'space'].includes(active.id) ? [['←', 'ArrowLeft'], ['→', 'ArrowRight']] : [['←', 'ArrowLeft'], ['↑', 'ArrowUp'], ['↓', 'ArrowDown'], ['→', 'ArrowRight']];
      for (const [label, key] of entries) { const button = el('button', { text: label, 'aria-label': ({ ArrowUp: 'Move up', ArrowDown: 'Move down', ArrowLeft: 'Move left', ArrowRight: 'Move right' })[key] });
        if (continuous) { button.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(key); setAxis(); try { button.setPointerCapture(e.pointerId); } catch {} }); for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { keys.delete(key); setAxis(); }); button.addEventListener('click', (e) => { if (e.detail === 0) { keys.add(key); setAxis(); setTimeout(() => { keys.delete(key); setAxis(); }, 160); } }); }
        else button.addEventListener('click', () => { const [dx, dy] = directionMap[key]; act({ kind: 'direction', dx, dy }); }); buttons.push(button);
      }
    }
    if (active.id === 'runner') buttons.push(el('button', { text: '↑ Jump', class: 'wide', onclick: () => act({ kind: 'jump' }) }));
    if (active.id === 'space') { const fire = el('button', { text: 'Fire', class: 'wide', 'aria-label': 'Hold to fire' }); fire.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(' '); setAxis(); try { fire.setPointerCapture(e.pointerId); } catch {} }); for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) fire.addEventListener(event, () => { keys.delete(' '); setAxis(); }); fire.addEventListener('click', (e) => { if (e.detail === 0) { keys.add(' '); setAxis(); setTimeout(() => { keys.delete(' '); setAxis(); }, 300); } }); buttons.push(fire); }
    $('touchControls').replaceChildren(...buttons); $('touchControls').hidden = buttons.length === 0;
  }
  function renderArenaControls() {
    const buttons = [];
    const hold = (label, key, name) => {
      const button = el('button', { text: label, 'aria-label': name, class: key === 'Shift' ? 'wide boostButton' : '' });
      button.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(key); setAxis(); try { button.setPointerCapture(e.pointerId); } catch {} });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { keys.delete(key); setAxis(); });
      button.addEventListener('click', (e) => { if (e.detail === 0) { keys.add(key); setAxis(); setTimeout(() => { keys.delete(key); setAxis(); }, key === 'Shift' ? 450 : 180); } }); return button;
    };
    const input = active.input;
    if (input === 'rhythm') {
      ['D', 'F', 'J', 'K'].forEach((label, index) => {
        const button = el('button', { class: 'rhythmControl', text: label, 'aria-label': 'Hit lane ' + (index + 1) + ', key ' + label });
        button.addEventListener('pointerdown', (e) => { e.preventDefault(); act({ kind: 'lane', index }); });
        button.addEventListener('click', (e) => { if (e.detail === 0) act({ kind: 'lane', index }); }); buttons.push(button);
      });
    } else {
      if (input !== 'vertical') buttons.push(hold('←', 'ArrowLeft', 'Move left'));
      if (['aim', 'move', 'vertical'].includes(input)) buttons.push(hold('↑', 'ArrowUp', 'Move up'));
      if (['aim', 'move', 'vertical', 'drive'].includes(input)) buttons.push(hold(input === 'drive' ? 'Brake' : '↓', 'ArrowDown', input === 'drive' ? 'Brake' : 'Move down'));
      if (input !== 'vertical') buttons.push(hold('→', 'ArrowRight', 'Move right'));
      if (input === 'drive') buttons.push(hold('⚡ Boost', 'Shift', 'Hold to boost'));
      if (active.primary) buttons.push(el('button', { class: 'wide primaryControl', text: active.primary, 'aria-label': active.primary + ', or press Space', onclick: () => act({ kind: 'primary' }) }));
    }
    $('touchControls').replaceChildren(...buttons); $('touchControls').hidden = false;
  }
  $('startGame').addEventListener('click', start); $('pauseGame').addEventListener('click', pause);
  $('restartGame').addEventListener('click', () => { if (loadingAd) return; saveAbandoned(); paused = false; start(); });
  $('gameHelp').addEventListener('click', () => { pauseIfPlaying(); if (active) showModal(active.title + ' — How to play', [active.controls, 'Use Pause or press P to take a break. Your best score is saved when a round ends. Restart begins a fresh round.']); });
  $('playFavorite').addEventListener('click', () => { if (active) toggleFavorite(active.id); });
  window.addEventListener('blur', () => { keys.clear(); drag = swipe = null; setAxis(); pauseIfPlaying(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseIfPlaying(); if (audio) audio.suspend().catch(() => {}); } });
  function route() {
    closeModal(); const hash = location.hash.slice(1) || 'discover';
    $('discoverScreen').hidden = hash.startsWith('game/') || hash === 'profile'; $('playScreen').hidden = !hash.startsWith('game/'); $('profileScreen').hidden = hash !== 'profile';
    for (const [id, page] of [['navDiscover', 'discover'], ['navFavorites', 'favorites'], ['navProfile', 'profile']]) { if (hash === page) $(id).setAttribute('aria-current', 'page'); else $(id).removeAttribute('aria-current'); }
    if (hash.startsWith('game/')) { if (loadingAd) return; if (state?.status === 'playing' && active?.id !== hash.slice(5)) saveAbandoned(); openGame(hash.slice(5)); document.title = (active?.title || 'Arcade') + ' · Algoredeem Games'; }
    else { if (state?.status === 'playing') saveAbandoned(); active = null; state = null; paused = false; keys.clear(); favoritesOnly = hash === 'favorites'; if (hash === 'profile') renderProfile(); else { renderLibrary(); renderCategories(); renderRecent(); } document.title = 'Algoredeem Games — Find your next favourite'; }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function saveAbandoned() { if (!state || recorded) return; recorded = true; Saves.result(profile, active.id, state.score, false, state.elapsed); persist(); }
  window.addEventListener('hashchange', () => { if (location.hash === '#library') { $('library').scrollIntoView({ behavior: 'smooth' }); return; } route(); });
  window.addEventListener('pagehide', saveAbandoned);
  window.addEventListener('pageshow', (event) => { if (event.persisted) { try { profile = Saves.normalize(JSON.parse(localStorage.getItem(Saves.KEY))); } catch {} updateSound(); route(); } });
  persist(); updateSound(); renderCategories(); renderLibrary(); renderRecent(); route();
})();
