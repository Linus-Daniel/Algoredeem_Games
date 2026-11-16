const CACHE_PREFIX = 'gumdrop-grid-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = CACHE_PREFIX + '__BUILD_ID__';
const FILES = ["./", "./index.html", "./gumdrop.html", "./manifest.webmanifest", "./assets/styles.css", "./assets/config.js", "./assets/ads.js", "./assets/save.js", "./assets/game.js", "./assets/register-sw.js", "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/catalog.js", "./assets/arcade-save.js", "./assets/arcade-engine.js", "./assets/arcade.js", "./assets/arcade.css", "./assets/arcade-icon.svg", "./assets/arcade-icon-192.png", "./assets/arcade-icon-512.png", "./assets/posters/gumdrop.svg", "./assets/posters/snake.svg", "./assets/posters/breakout.svg", "./assets/posters/space.svg", "./assets/posters/runner.svg", "./assets/posters/pong.svg", "./assets/posters/memory.svg", "./assets/posters/merge.svg", "./assets/posters/mines.svg", "./assets/posters/sudoku.svg", "./assets/posters/slide.svg", "./assets/posters/connect.svg", "./assets/posters/tictac.svg", "./assets/posters/simon.svg", "./assets/posters/words.svg", "./assets/posters/mole.svg", "./assets/arena-engine.js", "./assets/arena-renderer.js", "./assets/posters/penalty.svg", "./assets/posters/football.svg", "./assets/posters/racing.svg", "./assets/posters/rally.svg", "./assets/posters/kart.svg", "./assets/posters/basket.svg", "./assets/posters/bowling.svg", "./assets/posters/golf.svg", "./assets/posters/pool.svg", "./assets/posters/tennis.svg", "./assets/posters/hockey.svg", "./assets/posters/archery.svg", "./assets/posters/flight.svg", "./assets/posters/tank.svg", "./assets/posters/rhythm.svg"];
const urls = new Set(FILES.map((file) => new URL(file, self.registration.scope).href));
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url); url.search = '';
  if (event.request.method !== 'GET' || !urls.has(url.href)) return;
  // Keep HTML and code on the same version until the next worker activates.
  event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.href, { ignoreVary: true })) || fetch(event.request)));
});
