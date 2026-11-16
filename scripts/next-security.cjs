const crypto = require('node:crypto');
const { policy } = require('./serve.cjs');
const DOWNLOADS = new Set(['Algoredeem Games.html', 'Gumdrop Grid.html']);
function scriptHashes(html) {
  return [...new Set([...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([,attrs,body]) => !/\bsrc\s*=/.test(attrs) && body.trim())
    .map(([, , body]) => "'sha256-" + crypto.createHash('sha256').update(body).digest('base64') + "'"))];
}
function pagePolicy(file, hashes = [], adsEnabled = false) {
  if (DOWNLOADS.has(file)) return "default-src 'none'; sandbox";
  let csp = policy(adsEnabled).replace("script-src 'self'", "script-src 'self'" + (hashes.length ? ' ' + hashes.join(' ') : ''));
  // React emits inline style attributes for cover accents and hidden boundaries.
  if (!adsEnabled) csp = csp.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");
  if (file === 'gumdrop.html') csp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
  return csp;
}
const HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cache-Control': 'no-cache',
};
module.exports = { scriptHashes, pagePolicy, DOWNLOADS, HEADERS };
