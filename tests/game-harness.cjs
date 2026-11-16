/* Executes the real game in a minimal DOM, without a browser or network sockets. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase(); this.document = document; this.nodeType = 1;
    this.children = []; this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} };
    this.hidden = false; this.disabled = false; this.inert = false; this.className = ''; this._text = '';
    this.classList = { add: (v) => { this.className += ' ' + v; }, remove: (v) => { this.className = this.className.split(' ').filter((n) => n !== v).join(' '); } };
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'disabled') this.disabled = true; if (k === 'id') { this.id = String(v); this.document.ids.set(this.id, this); } }
  getAttribute(k) { return this.attrs[k]; }
  append(...nodes) { for (const child of nodes) { child.parent = this; this.children.push(child); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
  get isConnected() { return this === this.document.body || !!this.parent?.isConnected; }
  contains(node) { return node === this || this.children.some((c) => c.contains?.(node)); }
  matches(selector) {
    if (selector === '[hidden]') return this.hidden;
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    if (selector === '[tabindex="0"]') return this.tabIndex === 0 || this.attrs.tabindex === '0';
    if (selector === '[href]') return !!this.attrs.href;
    if (selector === 'button:not(:disabled)') return this.tagName === 'BUTTON' && !this.disabled;
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map((s) => s.trim()), nodes = [];
    for (const child of this.children) if (child.nodeType === 1) {
      if (selectors.some((s) => child.matches(s))) nodes.push(child);
      nodes.push(...child.querySelectorAll(selector));
    }
    return nodes;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest?.(selector) || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, props = {}) { const event = { target: this, preventDefault() {}, ...props }; return Promise.all((this.listeners[type] || []).map((fn) => fn(event))); }
  focus() { const old = this.document.activeElement; if (old === this) return; old?.dispatch('blur'); this.document.activeElement = this; this.dispatch('focus'); }
  getBoundingClientRect() { return { width: 520, height: 520, left: 0, top: 0 }; }
  setPointerCapture() {}
  getContext() { const gradient = { addColorStop() {} }; return new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => {}, set: () => true }); }
}
function createGame(options = {}) {
  const document = { ids: new Map(), hidden: false, listeners: {}, createElement(tag) { return new Element(tag, this); },
    createTextNode(value) { return { nodeType: 3, textContent: String(value) }; }, getElementById(id) { return this.ids.get(id); },
    querySelector(selector) { return this.body.querySelector(selector); }, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); } };
  document.body = document.createElement('body'); document.activeElement = document.body;
  const html = fs.readFileSync(path.join(__dirname, '../gumdrop.html'), 'utf8');
  const app = document.createElement('div'); app.className = 'app'; document.body.append(app);
  for (const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const element = document.createElement(match[1]); element.id = match[2]; document.ids.set(element.id, element);
    if (match[0].includes(' hidden')) element.hidden = true;
    app.append(element);
  }
  const data = new Map(options.rawSave ? [['gumdrop-grid-save-v2', options.rawSave]] : []);
  const timers = new Set(); let now = 0, seed = options.seed || 12345;
  const math = Object.create(Math); math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const context = { document, Math: math, Date, console, performance: { now: () => now }, navigator: {}, location: { protocol: 'file:' },
    localStorage: { getItem: (key) => { if (options.noStorage) throw new Error('Unavailable'); return data.get(key) || null; }, setItem: (key, v) => { if (options.noStorage) throw new Error('Unavailable'); data.set(key, v); } },
    matchMedia: () => ({ matches: true }), devicePixelRatio: 1, addEventListener() {},
    setTimeout(fn, ms) { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer; },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); }, setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame(fn) { const timer = setTimeout(() => { timers.delete(timer); now += 100; fn(now); }, 0); timers.add(timer); return timer; },
    ResizeObserver: class { observe() {} } };
  context.window = context; context.globalThis = context;
  vm.createContext(context);
  if (!options.script) for (const name of ['config', 'ads', 'arcade-save', 'save']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/' + name + '.js'), 'utf8'), context);
  let code = options.script || fs.readFileSync(path.join(__dirname, '../assets/game.js'), 'utf8');
  const expose = `
  window.testGame = { startLevel, resumeLevel, trySwap, boostClick, doHammer, afterAction, finish, closeModal, showMap, newBoard, findMove, findMatches, validSwap, planSpecial, expand, checkpoint,
    snapshot: () => JSON.parse(JSON.stringify({ save, board, jelly, level, def, score, moves, busy, over, inGame, selected, cursor, hammerArmed })),
    setup: (patch = {}) => { closeModal(); save.unlocked = 39; save.lives = 5; over = false; busy = false; inGame = true; moves = 30; score = shownScore = collected = 0;
      level = patch.level || 0; def = levelDef(level); numTypes = def.types; totalMoves = def.moves;
      jelly = new Array(64).fill(false); jellyLeft = jellyTotal = 0; selected = -1; hint = null; hammerArmed = false;
      if (patch.def) def = { ...def, ...patch.def };
      if (patch.moves !== undefined) moves = patch.moves;
      if (patch.score !== undefined) score = shownScore = patch.score;
      if (patch.board) board = patch.board.map((t, i) => ({ ...makeTile(typeof t === 'number' ? t : t.t, Math.floor(i / N), i % N), sp: typeof t === 'number' ? null : t.sp })); else newBoard();
      if (patch.jelly) { jelly = patch.jelly.slice(); jellyLeft = jellyTotal = jelly.filter(Boolean).length; }
      if (patch.save) Object.assign(save, patch.save);
      show('game'); checkpoint(); updateHud();
    }
  };
`;
  code = code.replace(/\}\)\(\);\s*$/, expose + '})();');
  vm.runInContext(code, context, { filename: 'assets/game.js' });
  const snapshot = context.testGame.snapshot;
  context.testGame.snapshot = () => JSON.parse(JSON.stringify(snapshot()));
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  async function settled() { for (let i = 0; i < 200; i++) { if (!context.testGame.snapshot().busy) return; await tick(); } throw new Error('Game did not settle'); }
  return { game: context.testGame, document, data, context, settled, close() { document.hidden = true; for (const timer of timers) clearTimeout(timer); } };
}
module.exports = { createGame };
