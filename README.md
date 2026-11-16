# Algoredeem Games

A React/Next.js browser gaming platform with **31 playable games**, including Gumdrop Grid, football, penalties, racing, sports, action, rhythm, puzzles and strategy. The neon arcade design includes search, filters, favourites, recent games, a daily pick, player settings and personal bests. No account is required.

## Development and production preview

Use Node 22 or later. Dependencies are pinned in `package-lock.json` (Next.js 16.4.3, React/React DOM 19.3.1).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. React manages the catalogue, navigation, settings, favourites and dialogs. Game engines and canvas rendering remain independent modules, loaded when opening a game. Gumdrop Grid uses a same-origin iframe with its original save/resume system.

```sh
npm run check
npm run preview
```

`check` runs regression and migration tests, creates the complete Next.js static export in **`out/`**, rebuilds both offline downloads, and verifies pages, assets, security policies and offline coverage. The production preview serves `out/` at http://127.0.0.1:4173; `PORT` and `HOST` configure its address. `npm start` is an alias for the development server. Use `npm run preview` for the production export.

The website installs as a PWA over HTTPS or localhost. Its service worker caches the full export, including React/Next.js chunks, page navigation payloads, all game files and downloads. Offline support is available after that initial cache completes. Ads require a connection.

## Standalone offline editions

```sh
npm run build:offline
npm run preview:offline
```

The original offline build remains available in `dist/`. Open **Algoredeem Games.html** directly in a browser to play its 30 embedded arcade games. Keep **Gumdrop Grid.html** beside it for the original game. Both are also available from `/downloads/` on the Next.js platform. These portable editions disable advertising and use the original lightweight portal.

## The game library

| Game | Category | Goal |
| --- | --- | --- |
| Gumdrop Grid | Puzzle | Match gumdrops and explore 40 levels across Nigeria |
| Neon Snake | Arcade | Collect fruit without hitting walls or your tail |
| Prism Breaker | Arcade | Clear a wall of prisms with three balls |
| Orbit Defender | Arcade | Defend your ship through five enemy waves |
| Midnight Dash | Arcade | Jump obstacles in an endless skyline run |
| Velocity Pong | Sports | Beat the computer to seven points |
| Memory Garden | Memory | Find all eight matching pairs |
| 2048 Studio | Puzzle | Slide equal tiles together to reach 2048 |
| Minefield | Puzzle | Reveal 71 safe cells around ten mines |
| Sudoku Sunday | Puzzle | Complete a valid nine-by-nine Sudoku |
| Fifteen Tiles | Puzzle | Slide shuffled tiles into numerical order |
| Four in a Row | Strategy | Connect four discs before the computer |
| Noughts & Crosses | Strategy | Form a line of three against a minimax opponent |
| Echo Sequence | Memory | Repeat increasingly long sequences through 15 rounds |
| Word Remix | Words | Unscramble ten words using their clues |
| Pop Patrol | Quick play | Catch as many critters as possible in 60 seconds |
| Stadium Penalties | Sports | Score at least three of five penalties against a goalkeeper |
| Floodlight Football | Sports | Outscore the rival in a 90-second football duel |
| Nightshift Racing | Racing | Race through traffic to the 6 km finish with nitro and braking |
| Dustline Rally | Racing | Counter the curves and complete 4.8 km before the clock expires |
| Turbo Kart | Racing | Choose your line and beat a rival over three oval laps |
| Skycourt Hoops | Sports | Land five descending baskets in 60 seconds |
| Cosmic Bowling | Sports | Knock down 60 pins across ten arcade-scored frames |
| Emerald Links | Sports | Complete five obstacle greens within the stroke limit |
| Velvet Pool | Sports | Pocket six balls in at most twenty shots |
| Centre Court | Sports | Beat the computer to five arcade-tennis points |
| Glacier Hockey | Sports | Score five goals with your paddle on a polished rink |
| Ember Archery | Sports | Compensate for wind and score 500 with ten arrows |
| Skywing | Action | Fly through twenty rings before missing three gates |
| Iron Arena | Action | Aim your turret and disable eight hostile drones |
| Pulse Circuit | Music | Time D/F/J/K or touch inputs to hit fifty of seventy-two notes |

Every game has instructions and touch controls. Arcade games support keyboard movement, dragging or swiping where appropriate. Board games use accessible buttons and keyboard controls. Pause freezes game time; P and Escape pause an active round. Backgrounding a tab also pauses the arcade. Restart begins a new round. Personal bests are saved after a round or when leaving it. The daily pick rotates through the new games without pretending to be an online leaderboard.

The arcade profile is local to this browser. It stores the player name, favorites, recent games, scores, plays, wins, play time, sound and graphics preferences. It does not provide cloud accounts, online multiplayer or shared leaderboards. Gumdrop Grid keeps its existing validated v2 save key and resumable level state, and reports starts and results to the arcade profile. Use one tab at a time to keep local progress consistent.

## Source and maintenance

- `app/` contains the App Router pages, metadata, sitemap, robots file and global styles. Every game has a permanent `/games/{id}/` page.
- `components/` contains the React catalogue, player settings, accessible dialogs and navigation. `GameClient.jsx` mounts and destroys the isolated player when routes change.
- `lib/profile-store.cjs` validates local profiles and provides immutable React snapshots. `lib/catalog.cjs` provides shared catalogue selection and permanent URLs.
- `assets/catalog.js` contains metadata and controls for all 31 games.
- `assets/arcade-engine.js` and `assets/arena-engine.js` implement game rules. `assets/arena-renderer.js` draws the detailed sports, racing and action scenes.
- `assets/arcade.js` remains the offline portal/player source. `scripts/create-player.cjs` extracts its gameplay into **generated** `assets/player.js`, so both editions use the same rules, inputs and renderer. Edit the source and generator; rebuilding overwrites the generated player.
- `assets/player-frame.html` scopes player controls independently of React. `assets/ads-consent.js` connects the hosted player to the optional ad adapter.
- `gumdrop.html`, `assets/game.js`, `assets/save.js` and `assets/styles.css` contain the original game.
- `scripts/prepare-next.cjs` builds the offline editions and prepares game assets in generated `public/` before Next.js starts.
- `scripts/finalize-next.cjs` generates release-specific offline caching and script hashes after export. `scripts/serve-next.cjs` serves only the exported allowlist with the same security policies.
- `scripts/arena-art.cjs` captures the procedural renderer as SVG game covers; every build regenerates all 31 posters.

`public/`, `.next/`, `out/`, `dist/`, both portable HTML editions and `assets/player.js` are generated. Keep game source and shared styles; do not hand-edit build output. The games use local artwork and system fonts. High graphics uses up to 2× display density; Balanced uses 1×. Reduced-motion preferences disable decorative motion. The scenes are illustrated 2D and perspective 2.5D graphics.

The migration retains `algoredeem-games-profile-v1`, `gumdrop-grid-save-v2` and `gumdrop-grid-ad-choice-v1`. Keep the same origin to preserve existing scores and Gumdrop progress. Moving domains does not transfer browser storage. No backend, cloud accounts, payments, multiplayer or shared leaderboards are included.

## Google AdSense / H5 Games

Ads are currently disabled because no approved publisher ID has been supplied. All games remain free and playable. There are no demo ads, pretend rewards or payments.

After Google approves the site and grants H5 Games / Ad Placement API access, configure the public publisher ID and the Funding Choices script URL from the certified CMP setup:

```sh
ADSENSE_CLIENT=ca-pub-YOUR_16_DIGIT_ID \
GOOGLE_CMP_URL='https://fundingchoicesmessages.google.com/i/pub-YOUR_16_DIGIT_ID?ers=1' \
NODE_ENV=production npm run build
```

Use real IDs. `.env.example` is a reference. Set ad variables in your shell or host build settings; the game asset preparation step does not load `.env` files. Next.js loads `.env` files for its own metadata settings. Set `SITE_URL` to the real public HTTPS origin when building. A publisher with another certified CMP can expose `window.GumdropConsentReady`, an async function returning true only when that CMP permits ads, and configure the CSP for its provider. Without a consent integration, ad loading remains disabled.

Players choose ads in **Privacy & preferences**. Gumdrop Grid also offers opt-in when requesting a reward. No external ad or consent script loads before opt-in. The adapter checks the CMP before the Google SDK and subsequent placements. The CMP remains responsible for regional consent messages and revocation; configure those in Google before launch.

The portal requests an interstitial before replay after every third completed round, with a 120-second frequency hint. Gumdrop Grid offers optional rewards for coins, lives, continues and doubling level coins. Only Google's `adViewed` callback grants a reward. Dismissal, no fill, blocked scripts, errors and timeouts grant nothing. Google's availability rules determine whether an ad displays.

For testing with an approved test account, set `ADS_TEST_MODE=true` without `NODE_ENV=production`. `npm run build` always rejects test ads. Do not click live ads to test them. Provider callback tests use a stub and do not establish Google approval or live ad compatibility.

## Deploy and verify

Set the real public HTTPS origin for canonical metadata and the sitemap, then publish the **complete contents of `out/`** to a static host:

```sh
SITE_URL=https://your-real-domain.example npm run check
```

Configure the host with build command `npm run build` and output directory `out`. This version deploys at the domain root (`/`); subdirectory deployment requires configuring both Next.js and the game's root-relative asset paths. The default origin is localhost for development, so configure `SITE_URL` before publishing. It is a build-time setting.

`_headers` supplies per-page CSP hashes and security headers for hosts supporting that format, such as Netlify and Cloudflare Pages. Preserve its exact page paths and hashes: Next.js exports inline hydration scripts, and a blanket policy blocking all inline scripts will prevent React from starting. The CSP allows inline styles for React's visual attributes. Gumdrop allows same-origin embedding. Portable editions are attachments with a sandbox policy. Other hosts must apply equivalent policies from `scripts/next-security.cjs` using the generated `out/_security.json`; the preview server already does this. The security manifest contains public build metadata only. Ensure custom 404 responses receive the exported 404 page policy too.

Serve `.txt` navigation payloads as `text/plain`, and JavaScript, SVG, PNG and the manifest with their correct MIME types. Avoid SPA fallback rewrites for asset or payload requests. Exported routes use directory `index.html` files; redirect bare game URLs to their trailing-slash form. The included preview server handles these routes and rejects access to source or build-control files. Use your host's HTTPS proxy for public traffic.

Deploy the entire release together. The service worker keeps pages, framework code and games on one build ID. Updates activate after old tabs close; caches are scoped to the installation and old matching caches are removed on activation. Close existing tabs when testing a fresh release. Development previews should use a separate origin or unregister the production worker in browser devtools to avoid cached production pages.

```sh
npm run test:browser
npm run test:browser:offline
```

The regression suite verifies game rules, opponents, puzzle validity, save/resume, ads, HTTP access restrictions and the offline portal. Migration checks additionally launch all 30 isolated arcade players, verify keyboard/touch and modal pause, record results, check listener/frame cleanup, test async-ad unmount, preserve local saves, and exercise the new server and offline navigation cache.

The Next.js browser suite checks actual React hydration, search and favourites, client navigation, all 30 player screens, mobile/desktop overflow, modal focus, CSP, offline navigation and exact Gumdrop resume. The offline browser suite retains the original portal tests. Both require Chrome/Chromium and localhost sockets; set `CHROME_BIN` if needed. Screenshots go to `artifacts/`. CI installs locked dependencies and runs both suites on Ubuntu.

This workspace blocks localhost sockets (`listen EPERM`), so the rendered browser suites cannot run here. Run them in an unrestricted environment and play on real Android Chrome and iOS Safari before publishing. Live Google ads also require domain approval and provider configuration. The local build has not been deployed.
