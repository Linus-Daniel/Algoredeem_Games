const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ROOT } = require('./serve.cjs');
const { scriptHashes, pagePolicy, DOWNLOADS } = require('./next-security.cjs');
const Catalog = require('../lib/catalog.cjs');
const dir=path.join(ROOT,'out'), manifest=JSON.parse(fs.readFileSync(path.join(dir,'_security.json'),'utf8'));
const headers=fs.readFileSync(path.join(dir,'_headers'),'utf8');
assert.ok(headers.split('\n').filter(line=>line.startsWith('/')).length<=100,'Static-host header rule limit');
assert.ok(Math.max(...headers.split('\n').map(line=>line.length))<2000,'Static-host header line limit');
assert.equal(Catalog.games.length,31);
const routes=['','favorites/','profile/','downloads/',...Catalog.games.map(g=>'games/'+g.id+'/')];
for(const route of routes) {
  const file=route+'index.html',html=fs.readFileSync(path.join(dir,file),'utf8');
  assert.match(html,/<title>[^<]+/);assert.match(html,/<meta name="description"/);assert.match(html,/<html lang="en"/);
  assert.ok(manifest.files.includes(file));assert.ok(manifest.files.includes(route+'index.txt'),'Missing RSC payload: '+route);
  assert.deepEqual(manifest.hashes[file],scriptHashes(html));
  const csp=pagePolicy(file,manifest.hashes[file],manifest.adsEnabled);assert.ok(headers.includes(csp));assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
  for(const [,src]of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
    const target=decodeURIComponent(src.slice(1));
    assert.ok(fs.existsSync(path.join(dir,target)),route+' missing local reference '+src);
  }
}
const home=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert.equal((home.match(/class="gameCard"/g)||[]).length,31,'Catalogue must be server-rendered');
for(const g of Catalog.games){const html=fs.readFileSync(path.join(dir,'games',g.id,'index.html'),'utf8');assert.ok(html.includes(g.title.replaceAll('&','&amp;')),g.id+' missing title');assert.ok(fs.existsSync(path.join(dir,'assets/posters',g.id+'.svg')));}
assert.ok(fs.readFileSync(path.join(dir,'games/gumdrop/index.html'),'utf8').includes('src="/gumdrop.html"'));
assert.ok(headers.includes("frame-ancestors 'self'"),'Gumdrop must allow same-origin iframe');
assert.ok(manifest.files.some(f=>f.startsWith('_next/static/')&&f.endsWith('.js')));
const clientCode=manifest.files.filter(f=>f.startsWith('_next/static/')&&f.endsWith('.js')).map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
assert.ok(clientCode.includes('data-player')&&clientCode.includes('playScreen'),'Game screen must be bundled with the client');
assert.equal(clientCode.includes('/assets/player-frame.html'),false,'Game startup must not request an HTML fragment');
assert.equal(manifest.files.includes('assets/player-frame.html'),false,'No HTML fragment should be needed in the export');
const worker=fs.readFileSync(path.join(dir,'sw.js'),'utf8');new vm.Script(worker);assert.ok(worker.includes(manifest.id));assert.ok(!worker.includes('__BUILD_ID__'));
const offline=JSON.parse(worker.match(/const FILES=(\[[^;]+\]);/)[1]);
for(const file of manifest.files)if(file!=='sw.js')assert.ok(offline.includes('./'+file),'Missing offline file: '+file);
for(const route of routes)assert.ok(offline.includes('./'+route));
for(const name of DOWNLOADS){assert.ok(fs.existsSync(path.join(dir,name)));assert.ok(headers.includes('filename="'+name+'"'));}
for(const file of ['assets/player.js','assets/ads-consent.js'])new vm.Script(fs.readFileSync(path.join(dir,file),'utf8'),{filename:file});
require('./verify-build.cjs');
console.log('Next.js export verified: 31 pages, server-rendered catalogue, metadata, complete framework/RSC cache, per-page script hashes, iframe and offline editions.');
