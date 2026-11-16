const test=require('node:test');const assert=require('node:assert/strict');const {platform}=require('./platform-harness.cjs');const {games}=require('../assets/catalog.js');
test('the platform boots with thirty-one real game cards and supports search and favorites',async(t)=>{
 const p=platform();t.after(()=>p.close());const d=p.doc;
 assert.equal(d.getElementById('gameGrid').children.length,31);assert.equal(d.getElementById('discoverScreen').hidden,false);
 d.getElementById('gameSearch').value='snake';await d.getElementById('gameSearch').dispatch('input');assert.equal(d.getElementById('gameGrid').children.length,1);
 await d.getElementById('gameGrid').querySelector('button').dispatch('click');assert.equal(d.getElementById('favoriteCount').textContent,'1');await p.route('#favorites');assert.equal(d.getElementById('gameGrid').children.length,1);
 d.getElementById('gameSearch').value='not a game';await d.getElementById('gameSearch').dispatch('input');assert.equal(d.getElementById('emptyState').hidden,false);
});
test('every new game launches through the portal and supports pause and resume',async(t)=>{
 const p=platform();t.after(()=>p.close());const d=p.doc;
 for(const game of games.filter(g=>g.type!=='external')){
  await p.route('#game/'+game.id);assert.equal(d.getElementById('playTitle').textContent,game.title);
  await d.getElementById('startGame').dispatch('click');assert.equal(d.getElementById('stageOverlay').hidden,true,game.id);
  if(game.type==='board')assert.ok(d.getElementById('puzzleBoard').children.length,game.id);
  await d.getElementById('pauseGame').dispatch('click');assert.equal(d.getElementById('stageOverlay').hidden,false);assert.equal(d.getElementById('overlayTitle').textContent,'Game paused');
  await d.getElementById('startGame').dispatch('click');assert.equal(d.getElementById('stageOverlay').hidden,true);
 }
 await p.route('#profile');assert.equal(d.getElementById('statPlayed').textContent,'30');
});
test('sudoku, words and strategy games respond to their on-screen controls',async(t)=>{
 const p=platform();t.after(()=>p.close());const d=p.doc;
 await p.route('#game/sudoku');await d.getElementById('startGame').dispatch('click');assert.equal(d.getElementById('puzzleBoard').querySelectorAll('.sudokuCell').length,81);
 await d.getElementById('puzzleBoard').querySelector('.numberButtons button').dispatch('click');
 await p.route('#game/words');await d.getElementById('startGame').dispatch('click');d.getElementById('wordAnswer').value='incorrect';await d.getElementById('wordAnswer').parent.dispatch('submit');assert.match(d.getElementById('gameMessage').textContent,/Not quite/);
 await p.route('#game/connect');await d.getElementById('startGame').dispatch('click');await d.getElementById('puzzleBoard').querySelector('.columnButtons button').dispatch('click');assert.equal(d.getElementById('playScore').textContent,'10');
});
test('missing storage and unknown game routes degrade without a crash',async(t)=>{
 const p=platform({noStorage:true});t.after(()=>p.close());assert.equal(p.doc.getElementById('storageNotice').hidden,false);
 await p.route('#game/not-real');await p.route('#discover');assert.equal(p.doc.getElementById('gameGrid').children.length,31);
});
