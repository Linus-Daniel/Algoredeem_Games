/* Keep the offline portal and Next.js player on the same tested gameplay code. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
function createPlayer() {
  // Keep the screen in the client bundle: static hosts may not serve HTML fragments.
  const frame=fs.readFileSync(path.join(root,'assets/player-frame.html'),'utf8');
  fs.writeFileSync(path.join(root,'lib/player-frame.cjs'),'/* Generated from assets/player-frame.html. */\nmodule.exports = '+JSON.stringify(frame)+';\n');
  const source=fs.readFileSync(path.join(root,'assets/arcade.js'),'utf8');
  function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw new Error('Player extraction marker missing: '+start);return source.slice(a,b);}
  const helper=between('  const el =','  let profile;');
  const audio=between('  let audio = null;','  function updateSound()');
  let setup=between('  let active = null, state = null','  function updateFavorite()');
  setup=setup.replace('let active = null,','let active = byId(options.id),');
  setup=setup.replace("profile.quality = $('graphicsQuality').value === 'balanced' ? 'balanced' : 'high'; persist();", "const quality = $('graphicsQuality').value === 'balanced' ? 'balanced' : 'high'; options.onPreferences?.({ quality }); profile=options.getProfile();");
  setup=setup.replace("if (state && active?.type === 'canvas') drawCanvas();", "if (state && active?.type === 'canvas') drawCanvas(); else if(active?.arena) window.ArenaRenderer.draw(ctx,active.id,Engine.create(active.id),reducedMotion);");
  let gameplay=between('  function overlay(', '  function route()');
  gameplay=gameplay.replace('    if (!active || loadingAd) return;', '    if (disposed || !active || loadingAd) return;');
  gameplay=gameplay.replace('adChoice &&', 'adsEnabled() &&');
  gameplay=gameplay.replace("loadingAd = false; $('startGame').disabled = false;", "loadingAd = false; if(!disposed)$('startGame').disabled = false;");
  gameplay=gameplay.replace('      roundEnded = 0;', '      if(disposed)return; roundEnded = 0;');
  gameplay=gameplay.replace('    Saves.visit(profile, active.id); persist(); renderRecent();', '    options.onVisit?.(active.id); profile=options.getProfile();');
  gameplay=gameplay.replace('    const best = Saves.result(profile, active.id, state.score, state.status === \'won\', state.elapsed); persist();', '    const best = options.onResult?.(active.id,state.score,state.status===\'won\',state.elapsed); profile=options.getProfile();');
  gameplay=gameplay.replace("    if (!state || paused || modal || loadingAd || state.status !== 'playing') return;", "    if (disposed || !state || paused || modal || loadingAd || state.status !== 'playing') return;");
  gameplay=gameplay.replace("    if (!state || state.status !== 'playing' || paused || document.hidden || modal || $('playScreen').hidden) return;", "    if (disposed || !state || state.status !== 'playing' || paused || document.hidden || modal || $('playScreen').hidden) return;");
  gameplay=gameplay.replace("frameId = 0; if (!state", "frameId = 0; if (disposed || !state");
  gameplay=gameplay.replace("    if (modal || e.ctrlKey", "    if (disposed || !scope.contains(document.activeElement) || modal || e.ctrlKey");
  gameplay=gameplay.replace(/\bmodal\b/g,'modalOpen()');
  gameplay=gameplay.replace("    if (e.key === '/' && $('playScreen').hidden) { e.preventDefault(); if (location.hash !== '#discover') location.hash = 'discover'; $('gameSearch').focus(); return; }\n", '');
  gameplay=gameplay.replace("  $('gameHelp').addEventListener('click', () => { pauseIfPlaying(); if (active) showModal(active.title + ' — How to play', [active.controls, 'Use Pause or press P to take a break. Your best score is saved when a round ends. Restart begins a fresh round.']); });", "  $('gameHelp').addEventListener('click',()=>{pauseIfPlaying();options.onHelp?.();});");
  gameplay=gameplay.replace("  $('playFavorite').addEventListener('click', () => { if (active) toggleFavorite(active.id); });\n",'');
  // Track global listeners and timers so route changes and React Strict Mode do not leak them.
  let code=helper+audio+setup+gameplay;
  code=code.replace(/document\.addEventListener\(/g,'listen(document, ').replace(/window\.addEventListener\(/g,'listen(window, ');
  code=code.replace(/\bsetTimeout\(/g,'later(');
  const prelude=`/* Generated from the offline player's tested gameplay sections. */
(function (window) {
 'use strict';
 function mount(scope,options) {
  const {byId}=window.ArcadeCatalog,Engine=window.ArcadeEngine;
  if(!byId(options.id)||byId(options.id).type==='external')throw new Error('Unknown arcade game');
  let profile=options.getProfile(),disposed=false;
  const modalOpen=()=>document.body.classList.contains('modalOpen');
  const $=name=>scope.querySelector('[data-player="'+name+'"]')||scope.querySelector('#'+name);
  const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString();
  const time=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  const timers=new Set(),listeners=[];
  function listen(target,type,fn){target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));}
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;}
  const ads=options.ads||{available:()=>false,interstitial:async()=>false};
  const adsEnabled=()=>{try{return localStorage.getItem('gumdrop-grid-ad-choice-v1')==='yes';}catch{return false;}};
`;
  const ending=`
  if(!active||active.type==='external')throw new Error('Unknown arcade game');
  canvas.hidden=active.type!=='canvas';$('puzzleBoard').hidden=active.type!=='board';
  canvas.setAttribute('aria-label',active.title+' game board. '+active.controls);
  canvas.setAttribute('aria-describedby','gameInstructions');
  $('gameStage').setAttribute('data-arena',String(!!active.arena));
  $('graphicsQuality').parentNode.hidden=active.type!=='canvas';
  $('playBest').textContent=fmt(profile.stats[active.id]?.best||0);
  $('gameMessage').textContent=active.description;
  overlay('READY WHEN YOU ARE',active.title,active.description,'Play game');
  function saveAbandoned(){if(!state||recorded)return;recorded=true;options.onResult?.(active.id,state.score,false,state.elapsed);}
  listen(window,'pagehide',()=>{saveAbandoned();pauseIfPlaying();});
  listen(window,'pageshow',e=>{if(e.persisted)refresh();});
  listen(document,'algoredeem:modal',()=>{keys.clear();drag=swipe=null;setAxis();pauseIfPlaying();});
  function refresh(){if(disposed)return;profile=options.getProfile();configureCanvas();$('playBest').textContent=fmt(profile.stats[active.id]?.best||0);}
  return {pause:pauseIfPlaying,refresh,destroy(){if(disposed)return;saveAbandoned();disposed=true;keys.clear();if(frameId)window.cancelAnimationFrame(frameId);for(const clear of listeners)clear();for(const timer of timers)clearTimeout(timer);if(audio)audio.close().catch(()=>{});scope.replaceChildren();}};
 }
 window.ArcadePlayer=Object.freeze({mount});
})(window);
`;
  fs.writeFileSync(path.join(root,'assets/player.js'),prelude+code+ending);
}
if(require.main===module)createPlayer();
module.exports={createPlayer};
