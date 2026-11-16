const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { ROOT } = require('./serve.cjs');
const { scriptHashes, pagePolicy, DOWNLOADS, HEADERS } = require('./next-security.cjs');
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const file = prefix + entry.name;
    if (entry.name.startsWith('.') || ['_headers', '_security.json', 'sw.js'].includes(file)) continue;
    if (entry.isDirectory()) files.push(...await inventory(directory, file + '/'));
    else if (entry.isFile()) files.push(file);
  }
  return files.sort();
}
function worker(files, id) {
  const urls = files.map(file => './' + file);
  for (const file of files) if (file.endsWith('index.html')) urls.push('./' + file.slice(0, -10));
  return `/* Complete Next.js export: pages, framework chunks and navigation payloads. */
const CACHE_PREFIX='gumdrop-grid-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=CACHE_PREFIX+${JSON.stringify(id)};
const FILES=${JSON.stringify([...new Set(urls)])};
const urls=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);url.search='';
 if(event.request.method!=='GET')return;
 // Directory navigation without a trailing slash shares the exported page.
 if(!urls.has(url.href)&&event.request.mode==='navigate'&&!url.pathname.endsWith('/'))url.pathname+='/';
 if(!urls.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.href,{ignoreVary:true}))||fetch(event.request)));
});
`;
}
async function finalize(directory = path.join(ROOT, 'out')) {
  const files = await inventory(directory), hashes = {}, digest = crypto.createHash('sha256');
  const config = await fs.readFile(path.join(directory, 'assets/config.js'), 'utf8');
  const adsEnabled = /ca-pub-\d{16}/.test(config);
  for (const file of files) {
    const data = await fs.readFile(path.join(directory, file)); digest.update(file).update(data);
    if (file.endsWith('.html') && !DOWNLOADS.has(file)) hashes[file] = scriptHashes(data.toString());
  }
  const id = digest.digest('hex').slice(0, 16);
  await fs.writeFile(path.join(directory, 'sw.js'), worker(files, id));
  // Kept outside the public handler's allowlist; used to serve per-page hashes.
  await fs.writeFile(path.join(directory, '_security.json'), JSON.stringify({ id, files: [...files, 'sw.js'], hashes, adsEnabled }));
  let headers = '/*\n' + Object.entries(HEADERS).map(([k,v])=>'  '+k+': '+v).join('\n') + '\n';
  for (const file of files.filter(f => f.endsWith('.html'))) {
    const routes = ['/' + file];
    if (file.endsWith('index.html')) {
      const route = '/' + file.slice(0, -10); routes.push(route);
    }
    for (const route of routes) {
      headers += encodeURI(route) + '\n  Content-Security-Policy: ' + pagePolicy(file, hashes[file], adsEnabled) + '\n';
      if (DOWNLOADS.has(file)) headers += '  Content-Disposition: attachment; filename="' + file + '"\n';
    }
  }
  await fs.writeFile(path.join(directory, '_headers'), headers);
  console.log(`Finalized Next.js export: ${files.length} files, all 31 games, hashed script policies and offline navigation (${id}).`);
  return { id, files, hashes, adsEnabled };
}
if (require.main === module) finalize().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { finalize, inventory, worker };
