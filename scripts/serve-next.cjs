const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT } = require('./serve.cjs');
const { pagePolicy, DOWNLOADS, HEADERS } = require('./next-security.cjs');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function handler(directory = path.join(ROOT, 'out')) {
  const security = fs.readFile(path.join(directory, '_security.json'), 'utf8').then(JSON.parse);
  // Attach a rejection handler immediately, even if no request is made.
  security.catch(() => {});
  return async (req, res) => {
    for (const [key, value] of Object.entries(HEADERS)) res.setHeader(key, value);
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    let file;
    try {
      file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1);
      if (file.includes('\\') || file.includes('\0') || file.split('/').some(p=>p.startsWith('.')||p==='..')) { res.writeHead(404); res.end('Not found'); return; }
    } catch { res.writeHead(400); res.end('Bad request'); return; }
    try {
      const manifest = await security, allowed = new Set(manifest.files);
      if (!file || file.endsWith('/')) file += 'index.html';
      else if (!allowed.has(file) && allowed.has(file + '/index.html')) {
        res.writeHead(308, { Location: '/' + file + '/' + new URL(req.url, 'http://localhost').search }); res.end(); return;
      }
      let status = 200;
      if (!allowed.has(file)) {
        if (path.extname(file) || file.split('/').some(p=>p.startsWith('_'))) { res.writeHead(404); res.end('Not found'); return; }
        file = '404.html'; status = 404;
      }
      const data = await fs.readFile(path.join(directory, file));
      res.setHeader('Content-Security-Policy', pagePolicy(file, manifest.hashes[file], manifest.adsEnabled));
      if (DOWNLOADS.has(file)) res.setHeader('Content-Disposition', 'attachment; filename="' + file + '"');
      if(file==='sw.js')res.setHeader('Service-Worker-Allowed','/');
      res.writeHead(status, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Build unavailable. Run npm run build.'); }
  };
}
if (require.main === module) {
  const port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
  const server = http.createServer(handler());
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Algoredeem Games: http://${host}:${port}`));
}
module.exports = { handler, MIME };
