/* Run on a machine that permits Chrome and localhost sockets: npm run test:browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { handler, ROOT } = require('../scripts/serve.cjs');
const { launch } = require('./cdp.cjs');
async function main() {
  await fs.access(path.join(ROOT, 'dist/index.html'));
  const server = http.createServer(handler(path.join(ROOT, 'dist')));
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    browser = await launch();
    const errors = [];
    browser.on((message) => { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text); });
    await browser.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await browser.call('Emulation.setTouchEmulationEnabled', { enabled: true });
    await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const base = `http://127.0.0.1:${server.address().port}/`;
    await browser.call('Page.navigate', { url: base });
    await browser.until("document.getElementById('gameGrid')?.children.length === 31");
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile portal overflows');
    await browser.evaluate("document.getElementById('gameSearch').value = 'snake'; document.getElementById('gameSearch').dispatchEvent(new Event('input'))");
    assert.equal(await browser.evaluate("document.getElementById('gameGrid').children.length"), 1);
    await browser.evaluate("document.querySelector('.cardFavorite').click()");
    assert.equal(await browser.evaluate("document.getElementById('favoriteCount').textContent"), '1');
    await browser.evaluate("document.getElementById('gameSearch').value = ''; document.getElementById('gameSearch').dispatchEvent(new Event('input'))");
    await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true });
    const portalShot = await browser.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(ROOT, 'artifacts/mobile-platform.png'), Buffer.from(portalShot.data, 'base64'));
    for (const { id } of require('../assets/catalog.js').games.filter(g => g.type !== 'external')) {
      await browser.evaluate("location.hash = 'game/" + id + "'");
      await browser.until("!document.getElementById('playScreen').hidden && !document.getElementById('stageOverlay').hidden");
      await browser.evaluate("document.getElementById('startGame').click()");
      await browser.until("document.getElementById('stageOverlay').hidden");
      await browser.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, id + ' mobile game overflows');
      if (['penalty', 'racing', 'football', 'pool', 'rhythm'].includes(id)) {
        const shot = await browser.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        await fs.writeFile(path.join(ROOT, 'artifacts/' + id + '-mobile.png'), Buffer.from(shot.data, 'base64'));
      }
      if (id === 'penalty') {
        await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        assert.equal(await browser.evaluate("document.getElementById('playDetail').textContent"), '0 / 1');
      }
      await browser.evaluate("document.getElementById('pauseGame').click()");
      assert.equal(await browser.evaluate("document.getElementById('overlayTitle').textContent"), 'Game paused');
    }
    const url = base + 'gumdrop.html';
    await browser.call('Page.navigate', { url });
    await browser.until("document.querySelector('.modalWrap h2')?.textContent === 'Day 1'");
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile layout overflows');
    await browser.evaluate("document.querySelector('.modalWrap button').click()");
    await browser.evaluate("document.querySelector('#map button:not(:disabled)').click()");
    await browser.evaluate("document.querySelector('.modalWrap .primary').click()");
    await browser.until("!document.getElementById('gameScreen').hidden && document.getElementById('board').getAttribute('aria-busy') === 'false'");
    await browser.until('navigator.serviceWorker.controller !== null');
    const getSave = () => browser.evaluate("JSON.parse(localStorage.getItem('gumdrop-grid-save-v2'))");
    const initial = await getSave(); assert.equal(initial.active.board.length, 64);
    await browser.evaluate("document.getElementById('b-moves').click()");
    assert.equal((await getSave()).active.moves, initial.active.moves + 5);
    await browser.evaluate("document.getElementById('helpBtn').click()");
    assert.equal(await browser.evaluate("document.querySelector('.app').inert"), true);
    await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await browser.evaluate("document.querySelector('.modalWrap').contains(document.activeElement)"), true);
    await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await browser.evaluate("document.querySelector('.modalWrap') === null"), true);
    const saved = await getSave();
    await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true });
    const screenshot = await browser.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(ROOT, 'artifacts/mobile-board.png'), Buffer.from(screenshot.data, 'base64'));
    await browser.call('Network.enable');
    await browser.call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await browser.call('Page.reload');
    await browser.until("document.getElementById('resumeBtn') && !document.getElementById('resumeBtn').hidden");
    await browser.evaluate("document.getElementById('resumeBtn').click()");
    await browser.until("document.getElementById('board').getAttribute('aria-busy') === 'false'");
    const resumed = await getSave(); assert.deepEqual(resumed.active, saved.active);
    await browser.call('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'desktop layout overflows');
    await browser.call('Page.navigate', { url: base });
    await browser.until("document.getElementById('gameGrid')?.children.length === 31");
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'desktop portal overflows');
    const desktopShot = await browser.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(ROOT, 'artifacts/desktop-platform.png'), Buffer.from(desktopShot.data, 'base64'));
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: platform search/favorites, all thirty arcade game launches and pauses, mobile/desktop layouts, Gumdrop level/booster, modal focus, offline portal and exact save resume.');
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
