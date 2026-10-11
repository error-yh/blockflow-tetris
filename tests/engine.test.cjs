const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const enginePath = require('node:path').join(__dirname, '../engine.js');
const { Game } = fs.existsSync(enginePath) ? require(enginePath) : {};
test('game engine is available', () => assert.equal(typeof Game, 'function'));
test('each bag contains all seven pieces and a new game starts empty', () => {
  const g = new Game(() => 0.5); g.start();
  assert.equal(new Set([g.current.type, ...g.queue.slice(0, 6)]).size, 7);
  assert.equal(g.board.flat().filter(Boolean).length, 0);
});
test('pieces cannot move outside the board', () => {
  const g = new Game(); g.start();
  for(let i=0;i<20;i++) g.move(-1);
  assert.equal(Math.min(...g.cells().map(c => c.x)),0);
  assert.equal(g.move(-1),false);
});
test('hard drop lands at the ghost position and scores drop distance', () => {
  const g = new Game(); g.start(); const distance=g.ghostY()-g.current.y;
  const expected=g.cells({...g.current,y:g.ghostY()}); g.hardDrop();
  for(const {x,y} of expected) assert.ok(g.board[y][x]);
  assert.equal(g.score,distance*2);
});
test('clearing four lines shifts rows and awards 800 points at level one', () => {
  const g = new Game(); g.start();
  for(let y=16;y<20;y++) g.board[y]=Array(10).fill('T');
  for(let y=16;y<20;y++) g.board[y][4]=null;
  g.current={type:'I',rotation:1,x:2,y:16};
  g.lock();
  assert.equal(g.lines,4); assert.equal(g.score,800);
  assert.equal(g.board.flat().filter(Boolean).length,0);
  assert.equal(g.lastClear,4);
});
test('pause freezes movement, drops and elapsed gravity', () => {
  const g = new Game(); g.start(); g.pause();
  const snapshot=JSON.stringify({board:g.board,current:g.current,score:g.score});
  g.move(1);g.rotate();g.softDrop();g.hardDrop();g.tick(5000);
  assert.equal(JSON.stringify({board:g.board,current:g.current,score:g.score}),snapshot);
  g.pause(); assert.equal(g.status,'playing');
});
test('rotation near a wall remains valid', () => {
  const g = new Game();g.start();g.current={type:'T',rotation:1,x:-1,y:5};
  assert.equal(g.rotate(-1),true);assert.equal(g.valid(g.current),true);
});
test('a blocked spawn ends the game and restart resets all state', () => {
  const g = new Game();g.start();g.board=Array.from({length:20},()=>Array(10).fill('Z'));
  g.spawn();assert.equal(g.status,'over');
  g.start();assert.equal(g.status,'playing');assert.equal(g.score,0);
  assert.equal(g.board.flat().filter(Boolean).length,0);
});
test('level increases each ten cleared lines', () => {
  const g = new Game();g.start();g.lines=9;
  g.board[19]=Array(10).fill('S');g.board[19][4]=null;g.board[19][5]=null;
  g.current={type:'O',rotation:0,x:3,y:18};g.lock();
  assert.equal(g.level,2);assert.equal(g.lines,10);
  assert.ok(g.interval<800);
});
