const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function launch() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'gumdrop-browser-'));
  const candidates = [process.env.CHROME_BIN, '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  let bin;
  for (const candidate of candidates) { try { await fs.access(candidate); bin = candidate; break; } catch {} }
  if (!bin) throw new Error('Chrome/Chromium is required for browser tests; set CHROME_BIN to its executable.');
  const chrome = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let logs = '';
  chrome.stderr.on('data', (chunk) => { logs += chunk; });
  const cleanup = async () => {
    chrome.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => chrome.once('exit', resolve)), delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  let endpoint;
  for (let i = 0; i < 200; i++) {
    endpoint = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    if (endpoint) break;
    if (chrome.exitCode !== null) break;
    await delay(50);
  }
  if (!endpoint) { await cleanup(); throw new Error('Chrome did not start: ' + logs.slice(-3000)); }
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map(), listeners = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const p = pending.get(message.id); if (!p) return;
      pending.delete(message.id); clearTimeout(p.timer);
      if (message.error) p.reject(new Error(JSON.stringify(message.error))); else p.resolve(message.result);
    } else listeners.forEach((fn) => fn(message));
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timed out: ' + method)); }, 20000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  async function until(expression, timeout = 10000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await evaluate(expression)) return; await delay(30); }
    throw new Error('Browser condition timed out: ' + expression);
  }
  await call('Page.enable'); await call('Runtime.enable');
  return { call, evaluate, until, on: (fn) => listeners.push(fn), close: async () => { ws.close(); await cleanup(); } };
}
module.exports = { launch, delay };
