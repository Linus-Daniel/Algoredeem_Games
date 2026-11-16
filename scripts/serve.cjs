const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const { games } = require('../assets/catalog.js');
const PUBLIC_FILES = new Set(['index.html', 'gumdrop.html', 'manifest.webmanifest', 'sw.js', 'Gumdrop Grid.html', 'Algoredeem Games.html',
  'assets/catalog.js', 'assets/arcade-save.js', 'assets/arena-engine.js', 'assets/arcade-engine.js', 'assets/arena-renderer.js', 'assets/arcade.js', 'assets/arcade.css', 'assets/arcade-icon.svg', 'assets/arcade-icon-192.png', 'assets/arcade-icon-512.png',
  ...games.map((g) => 'assets/posters/' + g.id + '.svg'),
  'assets/styles.css', 'assets/config.js', 'assets/ads.js', 'assets/save.js', 'assets/game.js', 'assets/register-sw.js', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png']);
function policy(adsEnabled = false) {
  const google = adsEnabled ? ' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.googleadservices.com https://*.googletagservices.com https://fundingchoicesmessages.google.com' : '';
  return `default-src 'self'; script-src 'self'${google}; style-src 'self'${adsEnabled ? " 'unsafe-inline'" : ''}; img-src 'self' data:${google}; font-src 'self'; connect-src 'self'${google}; frame-src 'self'${google}; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`;
}
const CSP = policy(!!process.env.ADSENSE_CLIENT);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function handler(directory = ROOT, csp = CSP) {
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    let file;
    try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    if (!PUBLIC_FILES.has(file)) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const data = await fs.readFile(path.join(directory, file));
      // The downloadable standalone edition embeds code by design.
      if (file === 'Gumdrop Grid.html' || file === 'Algoredeem Games.html') {
        res.setHeader('Content-Disposition', 'attachment; filename="' + file + '"');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      } else res.setHeader('Content-Security-Policy', csp);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Content-Length': data.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('File unavailable');
    }
  };
}
if (require.main === module) {
  const directory = path.resolve(ROOT, process.argv[2] || '.');
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  fs.readFile(path.join(directory, 'assets/config.js'), 'utf8').then((config) => {
  const server = http.createServer(handler(directory, policy(/ca-pub-\d{16}/.test(config))));
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Algoredeem Games: http://${host}:${port}`));
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { handler, PUBLIC_FILES, CSP, policy, ROOT };
