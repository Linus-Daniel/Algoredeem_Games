const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const Catalog = require('../lib/catalog.cjs');
const Save = require('../assets/arcade-save.js');
const { createProfileStore, AD_KEY } = require('../lib/profile-store.cjs');
const { platform } = require('./platform-harness.cjs');
const { createPlayer } = require('../scripts/create-player.cjs');
const { finalize, worker } = require('../scripts/finalize-next.cjs');
const { handler } = require('../scripts/serve-next.cjs');
const { scriptHashes } = require('../scripts/next-security.cjs');
createPlayer();
const playerFrame = require('../lib/player-frame.cjs');
function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) };
}
function player(id, extras = {}) {
  const html = '<head></head><body>' + playerFrame + '</body>';
  const p = platform({ html, modules:['config','ads','catalog','arcade-save','arena-engine','arcade-engine','arena-renderer','player'] });
  const store = createProfileStore(() => p.context.localStorage); store.hydrate();
  const results = [], scope = p.doc.body;
  const controller = p.context.ArcadePlayer.mount(scope, { id, getProfile:()=>store.getSnapshot().profile,
    onVisit:id=>store.visit(id), onResult:(...args)=>{results.push(args);return store.result(...args);}, onPreferences:p=>store.preferences(p), ...extras });
  const unsubscribe = store.subscribe(() => controller.refresh());
  const $ = name=>scope.querySelector('[data-player="'+name+'"]')||scope.querySelector('#'+name);
  return { ...p, store, results, controller, $, close(){unsubscribe();controller.destroy();p.close();} };
}
test('migration retains browser profile, Gumdrop save and ad choice without mutating snapshots', () => {
  const old = { name:'Ada',favorites:['racing','snake'],recent:['snake'],sound:false,quality:'balanced',stats:{snake:{plays:4,best:80,wins:1,seconds:33}} };
  const s = storage({ [Save.KEY]:JSON.stringify(old),'gumdrop-grid-save-v2':'existing-gumdrop-save',[AD_KEY]:'yes' });
  const store = createProfileStore(()=>s); let events=0;const unsubscribe=store.subscribe(()=>events++);store.hydrate();
  assert.deepEqual(store.getSnapshot().profile, old); assert.equal(store.getSnapshot().adsAllowed,true);
  const previous = store.getSnapshot().profile; store.toggleFavorite('football'); store.visit('snake'); store.result('snake',120,true,12.9); store.preferences({quality:'high'});
  assert.deepEqual(previous, old); assert.equal(store.getSnapshot().profile.stats.snake.best,120);assert.equal(store.getSnapshot().profile.stats.snake.seconds,45);
  store.allowAds(false); assert.equal(s.data.get(AD_KEY),'no');store.reset();assert.equal(s.data.get('gumdrop-grid-save-v2'),'existing-gumdrop-save');
  assert.ok(events>=7);unsubscribe();
});
test('invalid saves, disabled storage, and cross-tab profile changes recover safely', () => {
  const s=storage({[Save.KEY]:'broken json'}),store=createProfileStore(()=>s);store.hydrate();
  assert.equal(store.getSnapshot().profile.name,'Player one');assert.equal(store.getSnapshot().storageAvailable,true);
  s.setItem(Save.KEY,JSON.stringify({name:'New tab',favorites:['penalty','unknown','penalty'],stats:{snake:{best:-2,plays:5}}}));store.storageChanged({key:Save.KEY});
  assert.equal(store.getSnapshot().profile.name,'New tab');assert.deepEqual(store.getSnapshot().profile.favorites,['penalty']);assert.equal(store.getSnapshot().profile.stats.snake.best,0);
  const blocked=createProfileStore(()=>{throw new Error('Blocked');});blocked.hydrate();blocked.visit('football');blocked.result('football',22,false,1);
  assert.equal(blocked.getSnapshot().storageAvailable,false);assert.equal(blocked.getSnapshot().profile.stats.football.best,22);
});
test('catalogue provides permanent URLs, search, category and favorites ordering', () => {
  assert.equal(Catalog.games.length,31);
  for(const g of Catalog.games)assert.equal(Catalog.gameHref(g),'/games/'+g.id+'/');
  assert.deepEqual(Catalog.selectGames({query:'penalties'}).map(g=>g.id),['penalty']);
  assert.equal(Catalog.selectGames({category:'Racing'}).length,3);
  assert.deepEqual(Catalog.selectGames({favoritesOnly:true,profile:{favorites:['snake']}}).map(g=>g.id),['snake']);
  assert.equal(Catalog.selectGames({sort:'recent',profile:{recent:['words','football']}})[0].id,'words');
});
test('all 30 isolated game players launch, pause, resume, record and remove global listeners and frames', async t => {
  for(const game of Catalog.games.filter(g=>g.type!=='external')) {
    const p=player(game.id);try {
      assert.equal(p.$('overlayTitle').textContent,game.title);
      await p.$('startGame').dispatch('click');assert.equal(p.$('stageOverlay').hidden,true,game.id);
      if(game.type==='board')assert.ok(p.$('puzzleBoard').children.length,game.id);
      p.frame(16);await p.$('pauseGame').dispatch('click');assert.equal(p.$('overlayTitle').textContent,'Game paused');
      p.frame(1000);await p.$('startGame').dispatch('click');assert.equal(p.$('stageOverlay').hidden,true);p.frame(16);
      assert.equal(p.store.getSnapshot().profile.stats[game.id].plays,1);
      p.controller.destroy();p.controller.destroy();assert.equal(p.results.length,1,game.id+' result recorded once');
      assert.equal(p.frames.size,0,game.id+' frame cleanup');assert.equal(p.timers.size,0);
      assert.equal(Object.values(p.doc.listeners).flat().length,0,game.id+' document listener cleanup');assert.equal(Object.values(p.events).flat().length,0,game.id+' window listener cleanup');
    } finally { p.close(); }
  }
});
test('scoped word/strategy controls, keyboard, touch, settings and shell modal work', async () => {
  const words=player('words');try {await words.$('startGame').dispatch('click');assert.equal(words.doc.activeElement,words.$('wordAnswer'));words.$('wordAnswer').value='incorrect';await words.$('wordAnswer').parent.dispatch('submit');assert.match(words.$('gameMessage').textContent,/Not quite/);}finally{words.close();}
  const connect=player('connect');try {await connect.$('startGame').dispatch('click');connect.key('keydown','1');assert.equal(connect.$('playScore').textContent,'10');}finally{connect.close();}
  const p=player('penalty');try {
    await p.$('startGame').dispatch('click');p.key('keydown',' ');assert.equal(p.$('playDetail').textContent,'0 / 1');
    const previous=p.store.getSnapshot().profile;p.$('graphicsQuality').value='balanced';await p.$('graphicsQuality').dispatch('change');assert.equal(previous.quality,'high');assert.equal(p.store.getSnapshot().profile.quality,'balanced');
    p.doc.body.classList.add('modalOpen');p.doc.dispatchEvent({type:'algoredeem:modal'});assert.equal(p.$('overlayTitle').textContent,'Game paused');
    p.doc.body.classList.remove('modalOpen');await p.$('startGame').dispatch('click');
    for(let i=0;i<50;i++)p.frame(60);
    await p.$('touchControls').querySelector('.primaryControl').dispatch('click');assert.match(p.$('playDetail').textContent,/\/ 2$/);
    await p.$('restartGame').dispatch('click');assert.equal(p.results.length,1);p.controller.destroy();assert.equal(p.results.length,2);
  }finally{p.close();}
});
test('blocked async ad does not resurrect a game after unmount', async () => {
  let resolveAd;const p=player('connect',{ads:{available:()=>true,interstitial:()=>new Promise(resolve=>{resolveAd=resolve;})}});
  try {
    p.data.set(AD_KEY,'yes');
    // Finish three real rounds with legal column controls (no state injection).
    for(let round=0;round<3;round++) {
      await p.$('startGame').dispatch('click');
      for(let i=0;i<42&&p.$('stageOverlay').hidden;i++) {
        const buttons=p.$('puzzleBoard').querySelectorAll('.columnButtons button:not(:disabled)');
        await buttons[i%buttons.length].dispatch('click');
        for(let frame=0;frame<10;frame++)p.frame(60);
      }
      assert.equal(p.$('stageOverlay').hidden,false);
    }
    const starting=p.$('startGame').dispatch('click');assert.ok(resolveAd);p.controller.destroy();resolveAd(false);await starting;
    assert.equal(p.store.getSnapshot().profile.stats.connect.plays,3);assert.equal(p.frames.size,0);
  }finally{p.close();}
});
test('ad bridge never loads a provider without opt-in or publisher configuration',async()=>{
  const p=platform({modules:['config','ads','ads-consent'],html:'<head></head><body></body>'});
  try {assert.equal(p.context.GameAdService.available(),false);assert.equal(await p.context.GameAdService.interstitial('test'),false);assert.equal(p.doc.head.children.length,0);}finally{p.close();}
});
test('export server uses per-page script hashes, iframe policy, attachment headers and an allowlist',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'next-export-test-'));
  try {
    fs.mkdirSync(path.join(dir,'assets'));fs.mkdirSync(path.join(dir,'games/football'),{recursive:true});
    const html='<title>Algoredeem Games</title><script>self.__next_f=[];</script><script src="/assets/player.js"></script>';
    for(const file of ['index.html','404.html','games/football/index.html','gumdrop.html','Algoredeem Games.html'])fs.writeFileSync(path.join(dir,file),html);
    fs.writeFileSync(path.join(dir,'assets/config.js'),'window.GumdropConfig={adsenseClient:""}');fs.writeFileSync(path.join(dir,'assets/player.js'),'/* player */');fs.writeFileSync(path.join(dir,'games/football/index.txt'),'RSC navigation');
    const manifest=await finalize(dir),serve=handler(dir);
    async function request(url,method='GET') {const headers={};const res={status:200,body:'',setHeader:(k,v)=>headers[k.toLowerCase()]=v,writeHead:(status,extra={})=>{res.status=status;for(const[k,v]of Object.entries(extra))headers[k.toLowerCase()]=v;},end:body=>res.body=body?.toString()||''};await serve({url,method},res);return{...res,headers};}
    const page=await request('/games/football/');assert.equal(page.status,200);assert.ok(page.headers['content-security-policy'].includes(scriptHashes(html)[0]));assert.doesNotMatch(page.headers['content-security-policy'],/script-src[^;]*unsafe-inline/);
    assert.equal((await request('/games/football')).status,308);assert.equal((await request('/games/football/index.txt?_rsc=cache')).body,'RSC navigation');
    assert.match((await request('/gumdrop.html')).headers['content-security-policy'],/frame-ancestors 'self'/);
    const download=await request('/Algoredeem%20Games.html');assert.match(download.headers['content-disposition'],/attachment/);assert.equal(download.headers['content-security-policy'],"default-src 'none'; sandbox");
    for(const url of ['/package.json','/.next/BUILD_ID','/_security.json','/_headers','/%2e%2e%2findex.html','/assets/'])assert.equal((await request(url)).status,404,url);
    assert.equal((await request('/%ZZ')).status,400);assert.equal((await request('/','POST')).status,405);assert.equal((await request('/','HEAD')).body,'');assert.equal((await request('/missing')).status,404);
    assert.ok(manifest.hashes['index.html'].length);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('export worker caches framework/navigation files, isolates releases and leaves external requests alone',async()=>{
  const handlers={},cached=[],deleted=[],scope='https://games.example/';let request;
  const cache={addAll:async files=>cached.push(...files),match:async url=>url===scope+'games/football/index.txt'?'offline RSC':url===scope+'games/football/'?'offline HTML':undefined};
  vm.runInNewContext(worker(['index.html','games/football/index.html','games/football/index.txt','games/football/__next._tree.txt','_next/static/chunk.js'],'release1'),{
    URL,self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(k,fn)=>handlers[k]=fn},caches:{open:async()=>cache,keys:async()=>['gumdrop-grid-'+encodeURIComponent(scope)+'-old','another-game'],delete:async k=>deleted.push(k)},fetch:async()=>{throw new Error('Offline');}
  });
  handlers.install({waitUntil:p=>request=p});await request;assert.ok(cached.includes('./_next/static/chunk.js'));assert.ok(cached.includes('./games/football/__next._tree.txt'));
  handlers.activate({waitUntil:p=>request=p});await request;assert.deepEqual(deleted,['gumdrop-grid-'+encodeURIComponent(scope)+'-old']);
  handlers.fetch({request:{url:scope+'games/football/index.txt?_rsc=changed',method:'GET'},respondWith:p=>request=p});assert.equal(await request,'offline RSC');
  handlers.fetch({request:{url:scope+'games/football',method:'GET',mode:'navigate'},respondWith:p=>request=p});assert.equal(await request,'offline HTML');
  request=null;for(const url of ['https://ads.google.com/script.js',scope+'profile?private'])handlers.fetch({request:{url,method:'GET'},respondWith:p=>request=p});assert.equal(request,null);
});
