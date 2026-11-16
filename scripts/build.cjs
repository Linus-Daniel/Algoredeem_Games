const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
require('./generate-posters.cjs');
const { ROOT, PUBLIC_FILES, policy } = require('./serve.cjs');
async function build() {
  const files = [...PUBLIC_FILES].filter((f) => !['Gumdrop Grid.html', 'Algoredeem Games.html'].includes(f));
  const contents = await Promise.all(files.map((f) => fs.readFile(path.join(ROOT, f))));
  const adsenseClient = process.env.ADSENSE_CLIENT || '';
  const cmpUrl = process.env.GOOGLE_CMP_URL || '';
  const adsTestMode = process.env.ADS_TEST_MODE === 'true';
  if (adsenseClient && !/^ca-pub-\d{16}$/.test(adsenseClient)) throw new Error('ADSENSE_CLIENT must be a public ca-pub- ID with 16 digits.');
  if (cmpUrl && !/^https:\/\/fundingchoicesmessages\.google\.com\/i\/pub-\d{16}\?[^\s]*$/.test(cmpUrl)) throw new Error('GOOGLE_CMP_URL must be the Google Funding Choices script URL.');
  if (process.env.NODE_ENV === 'production' && adsTestMode) throw new Error('Test ads cannot be enabled in a production build.');
  contents[files.indexOf('assets/config.js')] = Buffer.from('window.GumdropConfig = Object.freeze(' + JSON.stringify({ adsenseClient, cmpUrl, adsTestMode }) + ');\n');
  const CSP = policy(!!adsenseClient);
  for (let i = 0; i < files.length; i++) if (files[i].endsWith('.js')) new vm.Script(contents[i].toString(), { filename: files[i] });
  const manifest = JSON.parse(contents[files.indexOf('manifest.webmanifest')]);
  for (const icon of manifest.icons) if (!files.includes(icon.src)) throw new Error('Missing icon: ' + icon.src);
  const id = crypto.createHash('sha256').update(Buffer.concat(contents)).digest('hex').slice(0, 16);
  const dist = path.join(ROOT, 'dist');
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(path.join(dist, 'assets/posters'), { recursive: true });
  for (let i = 0; i < files.length; i++) {
    const data = files[i] === 'sw.js' ? contents[i].toString().replace('__BUILD_ID__', id) : contents[i];
    await fs.writeFile(path.join(dist, files[i]), data);
  }
  let standalone = contents[files.indexOf('gumdrop.html')].toString();
  const css = contents[files.indexOf('assets/styles.css')].toString();
  standalone = standalone.replace('  <link rel="stylesheet" href="assets/styles.css">', `<style>${css}</style>`);
  for (const name of ['config', 'ads', 'arcade-save', 'save', 'game']) standalone = standalone.replace(`  <script src="assets/${name}.js" defer></script>`, '');
  // The downloadable edition is offline only, so it never loads live advertising.
  const js = ['config', 'ads', 'arcade-save', 'save', 'game'].map((name) => name === 'config' ? 'window.GumdropConfig = Object.freeze({ adsenseClient: "", cmpUrl: "", adsTestMode: false });' : contents[files.indexOf(`assets/${name}.js`)].toString()).join('\n');
  standalone = standalone.replace('</body>', `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);
  standalone = standalone.replace(/  <(?:link[^\n]*(?:icon|manifest)[^\n]*|script src="assets\/register-sw.js"[^\n]*)\n/g, '');
  standalone = standalone.replace('href="index.html"', 'href="Algoredeem Games.html"');
  await fs.writeFile(path.join(ROOT, 'Gumdrop Grid.html'), standalone);
  await fs.writeFile(path.join(dist, 'Gumdrop Grid.html'), standalone);
  let portal = contents[files.indexOf('index.html')].toString();
  portal = portal.replace('  <link rel="stylesheet" href="assets/arcade.css">', '<style>' + contents[files.indexOf('assets/arcade.css')].toString() + '</style>');
  const posters = {};
  for (let i = 0; i < files.length; i++) if (files[i].startsWith('assets/posters/')) posters[path.basename(files[i], '.svg')] = 'data:image/svg+xml;base64,' + contents[i].toString('base64');
  portal = portal.replace('src="assets/posters/racing.svg"', 'src="' + posters.racing + '"');
  const portalScripts = ['config', 'ads', 'catalog', 'arcade-save', 'arena-engine', 'arcade-engine', 'arena-renderer', 'arcade'];
  for (const name of portalScripts) portal = portal.replace(`  <script src="assets/${name}.js" defer></script>`, '');
  const portalCode = 'window.ArcadePosters = ' + JSON.stringify(posters) + ';\n' + portalScripts.map((name) => name === 'config' ? 'window.GumdropConfig = Object.freeze({ adsenseClient: "", cmpUrl: "", adsTestMode: false });' : contents[files.indexOf(`assets/${name}.js`)].toString()).join('\n');
  portal = portal.replace('</body>', '<script>' + portalCode.replace(/<\/script/gi, '<\\/script') + '</script>\n</body>');
  portal = portal.replace(/  <(?:link[^\n]*(?:icon|manifest)[^\n]*|script src="assets\/register-sw.js"[^\n]*)\n/g, '');
  await fs.writeFile(path.join(ROOT, 'Algoredeem Games.html'), portal);
  await fs.writeFile(path.join(dist, 'Algoredeem Games.html'), portal);
  await fs.writeFile(path.join(dist, '_headers'), `/*\n  Content-Security-Policy: ${CSP}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  Cross-Origin-Opener-Policy: same-origin\n  Cache-Control: no-cache\n/Gumdrop%20Grid.html\n  Content-Disposition: attachment; filename="Gumdrop Grid.html"\n  Content-Security-Policy: default-src 'none'; sandbox\n/Algoredeem%20Games.html\n  Content-Disposition: attachment; filename="Algoredeem Games.html"\n  Content-Security-Policy: default-src 'none'; sandbox\n`);
  console.log(`Built Algoredeem Games: 31 games in dist/ plus both offline editions (${id}).`);
}
build().catch((error) => { console.error(error); process.exitCode = 1; });
