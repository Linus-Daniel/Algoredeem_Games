const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/arcade-engine.js');
const Catalog = require('../assets/catalog.js');
const Save = require('../assets/arcade-save.js');
function rng(seed = 12) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
test('the platform has the original game and thirty distinct playable models', () => {
 assert.equal(Catalog.games.length,31); assert.equal(new Set(Catalog.games.map(g=>g.id)).size,31);
 const ids=Catalog.games.filter(g=>g.type!=='external').map(g=>g.id);
 assert.deepEqual(ids.sort(),Object.keys(E.models).sort());
 for(const id of ids){const s=E.create(id,rng()); assert.equal(s.status,'playing'); assert.equal(s.score,0); E.tick(id,s,.016,rng()); assert.ok(Number.isFinite(s.elapsed));}
});
test('snake grows on fruit, rejects reverse turns and ends on a wall',()=>{
 const r=rng(),s=E.create('snake',r);s.fruit={x:8,y:10};E.action('snake',s,{kind:'direction',dx:-1,dy:0});E.tick('snake',s,.16,r);
 assert.equal(s.body.length,4);assert.equal(s.score,10);assert.equal(s.body[0].x,8);assert.ok(!s.body.some(p=>p.x===s.fruit.x&&p.y===s.fruit.y));
 s.body=[{x:19,y:10}];E.tick('snake',s,.16,r);assert.equal(s.status,'lost');
});
test('breaker clears a brick, wins the wall and spends a life on a missed ball',()=>{
 const s=E.create('breakout');s.bricks=[{x:100,y:80,w:60,h:20,row:0,alive:true}];s.ball={x:125,y:108,vx:0,vy:-300};E.tick('breakout',s,.03);assert.equal(s.status,'won');assert.equal(s.score,100);
 const loss=E.create('breakout');loss.ball.y=E.H+20;E.tick('breakout',loss,0);assert.equal(loss.lives,2);assert.ok(loss.ball.y<E.H);
 loss.lives=1;loss.ball.y=E.H+20;E.tick('breakout',loss,0);assert.equal(loss.status,'lost');
});
test('space defender completes the fifth wave and loses its last shield to a bullet',()=>{
 const s=E.create('space');s.wave=5;s.enemies=[{x:s.player-15,y:100,w:30,h:24,alive:true}];s.bullets=[{x:s.player,y:132}];E.tick('space',s,.025,rng());assert.equal(s.status,'won');assert.equal(s.score,25);
 const loss=E.create('space');loss.lives=1;loss.hostile=[{x:loss.player,y:425}];E.tick('space',loss,.01,rng());assert.equal(loss.status,'lost');
});
test('runner jumps, lands and collides with actual obstacles',()=>{
 const s=E.create('runner');E.action('runner',s,{kind:'jump'});E.tick('runner',s,.1,rng());assert.ok(s.y<356);const initial=s.vy;E.action('runner',s,{kind:'jump'});assert.equal(s.vy,initial);
 s.y=356;s.vy=0;s.obstacles=[{x:88,y:356,w:35,h:38}];E.tick('runner',s,0,rng());assert.equal(s.status,'lost');
});
test('pong ends when either side reaches seven and preserves the correct winner',()=>{
 for(const [side,status] of [['points','won'],['opponent','lost']]){const s=E.create('pong');s[side]=6;s.delay=0;s.ball.x=side==='points'?E.W+20:-20;E.tick('pong',s,0);assert.equal(s.status,status);assert.equal(s[side],7);}
});
test('memory locks mismatches until they close and can match every pair',()=>{
 const s=E.create('memory',rng());const first=0,other=s.cards.findIndex(v=>v!==s.cards[first]);E.action('memory',s,{kind:'cell',index:first});E.action('memory',s,{kind:'cell',index:other});
 assert.equal(s.turns,1);E.action('memory',s,{kind:'cell',index:3});assert.equal(s.open.length,2);E.tick('memory',s,1);assert.equal(s.open.length,0);
 for(let v=0;v<8;v++){const pair=s.cards.map((n,i)=>n===v?i:-1).filter(i=>i>=0);for(const i of pair)E.action('memory',s,{kind:'cell',index:i});}assert.equal(s.status,'won');assert.ok(s.matched.every(Boolean));
});
test('2048 merges each tile once, does not spawn on an unchanged move and detects the goal',()=>{
 assert.deepEqual(E.mergeLine([2,2,2,2]),{values:[4,4,0,0],score:8});
 const s=E.create('merge',rng());s.cells=[2,0,0,0,...Array(12).fill(0)];E.action('merge',s,{kind:'direction',dx:-1,dy:0},rng());assert.equal(s.moves,0);assert.equal(s.cells.filter(Boolean).length,1);
 s.cells=[1024,1024,0,0,...Array(12).fill(0)];E.action('merge',s,{kind:'direction',dx:-1,dy:0},rng());assert.equal(s.status,'won');assert.equal(s.score,2048);
 assert.equal(E.mergePossible([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2]),false);
});
test('minefield protects the first reveal, honors flags and wins only after all safe cells',()=>{
 const s=E.create('mines');E.action('mines',s,{kind:'cell',index:40},rng());assert.equal(s.mines.filter(Boolean).length,10);assert.equal(s.mines[40],false);assert.equal(s.counts[40],0);
 const mine=s.mines.indexOf(true);E.action('mines',s,{kind:'flag',index:mine});E.action('mines',s,{kind:'cell',index:mine});assert.equal(s.status,'playing');
 for(let i=0;i<81;i++)if(!s.mines[i])E.action('mines',s,{kind:'cell',index:i},rng());assert.equal(s.status,'won');assert.equal(s.revealed.filter(Boolean).length,71);
 const loss=E.create('mines');E.action('mines',loss,{kind:'cell',index:0},rng());E.action('mines',loss,{kind:'cell',index:loss.mines.indexOf(true)},rng());assert.equal(loss.status,'lost');
});
test('Sudoku keeps fixed clues, detects conflicts and accepts a completed valid grid',()=>{
 const s=E.create('sudoku',rng());const fixed=s.given.indexOf(true),old=s.cells[fixed];E.action('sudoku',s,{kind:'cell',index:fixed});E.action('sudoku',s,{kind:'number',value:1});assert.equal(s.cells[fixed],old);
 for(let i=0;i<81;i++)if(!s.given[i]){E.action('sudoku',s,{kind:'cell',index:i});E.action('sudoku',s,{kind:'number',value:s.solution[i]});}assert.equal(s.status,'won');
 assert.equal(E.sudokuConflict([1,1,...Array(79).fill(0)],0,1),true);
});
test('sliding tiles start solvable and reject nonadjacent moves',()=>{
 for(let seed=1;seed<=30;seed++){const s=E.create('slide',rng(seed));const tiles=s.cells.filter(Boolean);let inversions=0;for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++)if(tiles[i]>tiles[j])inversions++;assert.equal((inversions+4-Math.floor(s.cells.indexOf(0)/4))%2,1);}
 const s=E.create('slide',rng());s.cells=[...Array.from({length:14},(_,i)=>i+1),0,15];E.action('slide',s,{kind:'cell',index:0});assert.equal(s.moves,0);E.action('slide',s,{kind:'cell',index:15});assert.equal(s.status,'won');
});
test('connect four detects diagonal lines and the computer blocks immediate wins',()=>{
 const cells=Array(42).fill(0);cells[35]=cells[36]=cells[37]=1;assert.equal(E.connectChoice(cells,rng()),3);
 const s=E.create('connect');s.cells=cells;E.action('connect',s,{kind:'column',index:3});assert.equal(s.status,'won');
 const diagonal=Array(42).fill(0);for(const i of [35,29,23,17])diagonal[i]=2;assert.equal(E.lineWinner(diagonal,7,6,4),2);
});
test('noughts and crosses computer takes a win and blocks a human threat',()=>{
 const winning=[2,2,0,1,1,0,0,0,0];assert.equal(E.tictacChoice(winning),2);
 const blocking=[1,1,0,0,2,0,0,0,0];assert.equal(E.tictacChoice(blocking),2);
 for(const order of [[0,1,2,3,4,5,6,7,8],[4,0,8,2,6,1,3,5,7],[1,3,5,7,0,2,4,6,8]]){const s=E.create('tictac');while(s.status==='playing'){const i=order.find(i=>!s.cells[i]);E.action('tictac',s,{kind:'cell',index:i});E.tick('tictac',s,.5);}assert.notEqual(s.status,'won');}
});
test('echo sequence ignores input during playback and supports fifteen complete rounds',()=>{
 const s=E.create('simon',rng());E.action('simon',s,{kind:'pad',index:s.sequence[0]},rng());assert.equal(s.score,0);
 while(s.status==='playing'){E.tick('simon',s,s.sequence.length*.7+.6,rng());assert.equal(s.phase,'repeat');for(const index of s.sequence.slice())E.action('simon',s,{kind:'pad',index},rng());}assert.equal(s.status,'won');assert.equal(s.sequence.length,15);
 const loss=E.create('simon',rng());E.tick('simon',loss,2,rng());E.action('simon',loss,{kind:'pad',index:(loss.sequence[0]+1)%4},rng());assert.equal(loss.status,'lost');
});
test('word remix checks answers, charges hints and finishes ten different words',()=>{
 const s=E.create('words',rng());assert.equal(new Set(s.words.map(w=>w[0])).size,10);E.action('words',s,{kind:'answer',value:'wrong'},rng());assert.equal(s.round,0);E.action('words',s,{kind:'hint'},rng());
 while(s.status==='playing')E.action('words',s,{kind:'answer',value:' '+s.words[s.round][0].toUpperCase()+' '},rng());assert.equal(s.status,'won');assert.equal(s.solved,10);assert.equal(s.score,985);
 const skipped=E.create('words',rng());while(skipped.status==='playing')E.action('words',skipped,{kind:'skip'},rng());assert.equal(skipped.status,'lost');assert.equal(skipped.score,0);
});
test('pop patrol awards a hit once and stops exactly at sixty seconds',()=>{
 const s=E.create('mole',rng());s.holes[4]=1;E.action('mole',s,{kind:'cell',index:4});E.action('mole',s,{kind:'cell',index:4});assert.equal(s.score,10);E.tick('mole',s,60,rng());assert.equal(s.remaining,0);assert.equal(s.status,'won');
 E.action('mole',s,{kind:'cell',index:4});assert.equal(s.score,10);
});
test('local profiles validate data, de-duplicate favorites and preserve best scores',()=>{
 const p=Save.normalize({name:'  Sky  ',favorites:['snake','snake','bad'],recent:['mole','bad'],stats:{snake:{best:'999',plays:2,wins:-1,seconds:20}},sound:false});assert.equal(p.name,'Sky');assert.deepEqual(p.favorites,['snake']);assert.equal(p.stats.snake.best,0);
 Save.visit(p,'snake');Save.result(p,'snake',120,true,45);Save.result(p,'snake',30,false,10);assert.equal(p.stats.snake.best,120);assert.equal(p.stats.snake.plays,3);assert.equal(p.stats.snake.wins,1);assert.equal(p.stats.snake.seconds,75);
});
