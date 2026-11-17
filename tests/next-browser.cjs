/* Real browser checks for the static React/Next.js export. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { ROOT } = require('../scripts/serve.cjs');
const { handler } = require('../scripts/serve-next.cjs');
const { launch } = require('./cdp.cjs');
const Catalog = require('../lib/catalog.cjs');
async function main() {
  await fs.access(path.join(ROOT,'out/_security.json'));
  const server=http.createServer(handler());let browser;
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    browser=await launch();const errors=[],violations=[];
    browser.on(message=>{if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Runtime.bindingCalled'&&message.params.name==='reportCSP')violations.push(message.params.payload);});
    await browser.call('Runtime.addBinding',{name:'reportCSP'});
    await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:"document.addEventListener('securitypolicyviolation',e=>window.reportCSP(e.violatedDirective+' '+e.blockedURI));"});
    await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await browser.call('Emulation.setTouchEmulationEnabled',{enabled:true});
    // Reproduce hosts that reject HTML fragments. Every game must still open.
    await browser.call('Network.enable');
    await browser.call('Network.setBlockedURLs',{urls:['*player-frame.html*']});
    const base=`http://127.0.0.1:${server.address().port}/`;
    await browser.call('Page.navigate',{url:base});await browser.until("document.querySelectorAll('.gameCard').length===31");
    await browser.evaluate("localStorage.setItem('algoredeem-games-profile-v1',JSON.stringify({name:'Ada',favorites:['snake'],sound:false,stats:{snake:{best:42,plays:2,wins:1,seconds:14}}}));location.reload()");
    await browser.until("document.querySelector('.avatar')?.textContent==='AD'");
    assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"Favorite Neon Snake\"]').getAttribute('aria-pressed')"),'true');
    // Native input setter is required to exercise React's controlled input.
    await browser.evaluate("const input=document.querySelector('input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'penalt');input.dispatchEvent(new Event('input',{bubbles:true}))");
    await browser.until("document.querySelectorAll('.gameCard').length===1");
    await browser.evaluate("document.querySelector('.cardFavorite').click()");
    await browser.until("JSON.parse(localStorage.getItem('algoredeem-games-profile-v1')).favorites.includes('penalty')");
    await browser.evaluate("document.querySelector('nav a[href=\"/favorites/\"]').click()");await browser.until("location.pathname==='/favorites/'&&document.querySelectorAll('.gameCard').length===2");
    await browser.evaluate("document.querySelector('nav a[href=\"/\"]').click()");await browser.until("location.pathname==='/'&&document.querySelectorAll('.gameCard').length===31");
    await browser.until('navigator.serviceWorker.controller!==null',30000);
    await browser.evaluate("window.__clientNavigation='alive'");
    await fs.mkdir(path.join(ROOT,'artifacts'),{recursive:true});
    async function capture(name){const shot=await browser.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(path.join(ROOT,'artifacts',name+'.png'),Buffer.from(shot.data,'base64'));}
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'mobile catalogue overflow');await capture('next-mobile-platform');
    for(const game of Catalog.games.filter(g=>g.type!=='external')) {
      await browser.evaluate(`document.querySelector('a[href="${Catalog.gameHref(game)}"]').click()`);
      await browser.until(`location.pathname==='${Catalog.gameHref(game)}'&&document.querySelector('[data-player="startGame"]')&&!document.querySelector('.gameRuntime').hidden`);
      assert.equal(await browser.evaluate('window.__clientNavigation'),'alive','route should retain React shell');
      await browser.evaluate("document.querySelector('[data-player=startGame]').click()");await browser.until("document.querySelector('[data-player=stageOverlay]').hidden");
      if(game.id==='penalty'){
        await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
        assert.equal(await browser.evaluate("document.querySelector('[data-player=playDetail]').textContent"),'0 / 1');
        await browser.evaluate("[...document.querySelectorAll('footer button')].find(b=>b.textContent.includes('Privacy')).click()");await browser.until("document.querySelector('[role=dialog]')!==null");
        assert.equal(await browser.evaluate("document.querySelector('[data-player=overlayTitle]').textContent"),'Game paused');
        await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        assert.equal(await browser.evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"),true);
        await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Close').click()");await browser.evaluate("document.querySelector('[data-player=startGame]').click()");
      }
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,game.id+' mobile overflow');
      if(['penalty','racing','football','pool','rhythm'].includes(game.id))await capture('next-'+game.id+'-mobile');
      await browser.evaluate("document.querySelector('[data-player=pauseGame]').click()");assert.equal(await browser.evaluate("document.querySelector('[data-player=overlayTitle]').textContent"),'Game paused');
      await browser.evaluate("document.querySelector('.playHeading a').click()");await browser.until("location.pathname==='/'&&document.querySelectorAll('.gameCard').length===31");
      assert.equal(await browser.evaluate("document.querySelector('.gameRuntime')===null"),true,'player removed on route change');
    }
    // The original game is embedded at the same origin so existing saves remain available.
    await browser.evaluate("document.querySelector('a[href=\"/games/gumdrop/\"]').click()");await browser.until("document.querySelector('iframe')?.contentDocument?.querySelector('.modalWrap h2')?.textContent==='Day 1'");
    await browser.evaluate("document.querySelector('iframe').contentDocument.querySelector('.modalWrap button').click()");
    await browser.evaluate("document.querySelector('iframe').contentDocument.querySelector('#map button:not(:disabled)').click()");await browser.evaluate("document.querySelector('iframe').contentDocument.querySelector('.modalWrap .primary').click()");
    await browser.until("document.querySelector('iframe').contentDocument.querySelector('#board').getAttribute('aria-busy')==='false'");
    const saved=await browser.evaluate("JSON.parse(localStorage.getItem('gumdrop-grid-save-v2')).active");assert.equal(saved.board.length,64);
    await browser.evaluate("document.querySelector('nav a[href=\"/\"]').click()");await browser.until("location.pathname==='/'&&document.querySelectorAll('.gameCard').length===31");
    await browser.call('Network.enable');await browser.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await browser.call('Page.reload');await browser.until("document.querySelectorAll('.gameCard').length===31");
    await browser.evaluate("document.querySelector('a[href=\"/games/racing/\"]').click()");await browser.until("document.querySelector('[data-player=startGame]')&&!document.querySelector('.gameRuntime').hidden");
    await browser.evaluate("document.querySelector('[data-player=startGame]').click()");await browser.until("document.querySelector('[data-player=stageOverlay]').hidden");
    await browser.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'desktop game overflow');await capture('next-racing-desktop');
    await browser.call('Page.navigate',{url:base+'games/gumdrop/'});await browser.until("document.querySelector('iframe')?.contentDocument?.querySelector('#resumeBtn')&&!document.querySelector('iframe').contentDocument.querySelector('#resumeBtn').hidden");
    await browser.evaluate("document.querySelector('iframe').contentDocument.querySelector('#resumeBtn').click()");await browser.until("document.querySelector('iframe').contentDocument.querySelector('#board').getAttribute('aria-busy')==='false'");
    assert.deepEqual(await browser.evaluate("JSON.parse(localStorage.getItem('gumdrop-grid-save-v2')).active"),saved);
    await browser.call('Page.navigate',{url:base});await browser.until("document.querySelectorAll('.gameCard').length===31");assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'desktop catalogue overflow');await capture('next-desktop-platform');
    assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
    console.log('Next.js browser checks passed: React hydration, saved profile, search/favorites, 30 games, client navigation, modal pause/focus, responsive layouts, offline navigation and Gumdrop save resume.');
  }finally{if(browser)await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
