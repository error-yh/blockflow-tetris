(function (root) {
  'use strict';
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };
  // Clockwise/counterclockwise SRS kick tests, y positive upwards.
  const KICKS = {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  };
  const IKICKS = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  };
  function matrix(type, rotation=0) {
    let m=SHAPES[type];
    if(type==='O') return m;
    for(let r=0;r<rotation;r++) m=m[0].map((_,x)=>m.map(row=>row[x]).reverse());
    return m;
  }
  class Game {
    constructor(random=Math.random) { this.random=random; this.reset(); }
    reset() {
      this.board=Array.from({length:20},()=>Array(10).fill(null));
      this.queue=[]; this.current=null; this.score=0; this.lines=0;
      this.level=1; this.status='ready'; this.gravity=0; this.lockTime=0;
      this.lockResets=0; this.lastClear=0; this.pieces=0; this.elapsed=0;
    }
    start() { this.reset();this.status='playing';this.spawn(); }
    get interval() { return Math.max(70,800*Math.pow(0.8,this.level-1)); }
    fillQueue() {
      while(this.queue.length<7) {
        const bag=Object.keys(SHAPES);
        for(let i=bag.length-1;i>0;i--) {
          const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];
        }
        this.queue.push(...bag);
      }
    }
    spawn() {
      this.fillQueue();this.current={type:this.queue.shift(),rotation:0,x:3,y:0};
      this.gravity=0;this.lockTime=0;this.lockResets=0;
      if(!this.valid(this.current)) this.status='over';
    }
    cells(piece=this.current) {
      if(!piece) return [];
      return matrix(piece.type,piece.rotation).flatMap((row,y)=>row.flatMap((v,x)=>v?[{x:x+piece.x,y:y+piece.y}]:[]));
    }
    valid(piece) { return this.cells(piece).every(({x,y})=>x>=0&&x<10&&y<20&&y>=-4&&(y<0||!this.board[y][x])); }
    grounded() { return !this.valid({...this.current,y:this.current.y+1}); }
    moved(wasGrounded) {
      if(wasGrounded && this.lockResets<15) {this.lockTime=0;this.lockResets++;}
    }
    move(dx) {
      if(this.status!=='playing') return false;
      const p={...this.current,x:this.current.x+dx};
      if(!this.valid(p)) return false;
      const grounded=this.grounded();this.current=p;this.moved(grounded);return true;
    }
    rotate(dir=1) {
      if(this.status!=='playing'||this.current.type==='O') return false;
      const from=this.current.rotation,to=(from+dir+4)%4;
      const kicks=(this.current.type==='I'?IKICKS:KICKS)[`${from}>${to}`];
      for(const [dx,dy] of kicks) {
        const p={...this.current,rotation:to,x:this.current.x+dx,y:this.current.y-dy};
        if(this.valid(p)) {const grounded=this.grounded();this.current=p;this.moved(grounded);return true;}
      }
      return false;
    }
    softDrop() {
      if(this.status!=='playing') return false;
      const p={...this.current,y:this.current.y+1};
      if(!this.valid(p)) return false;
      this.current=p;this.score++;this.gravity=0;this.lockTime=0;return true;
    }
    ghostY() {
      if(!this.current) return 0;
      let p={...this.current};while(this.valid({...p,y:p.y+1}))p.y++;return p.y;
    }
    hardDrop() {
      if(this.status!=='playing')return;
      const y=this.ghostY();this.score+=(y-this.current.y)*2;this.current.y=y;this.lock();
    }
    lock() {
      if(this.status!=='playing')return;
      const cells=this.cells();
      if(cells.some(c=>c.y<0)) {this.status='over';return;}
      cells.forEach(({x,y})=>this.board[y][x]=this.current.type);
      const remaining=this.board.filter(row=>!row.every(Boolean));
      this.lastClear=20-remaining.length;
      this.score+=[0,100,300,500,800][this.lastClear]*this.level;
      this.lines+=this.lastClear;this.level=1+Math.floor(this.lines/10);
      while(remaining.length<20)remaining.unshift(Array(10).fill(null));
      this.board=remaining;this.pieces++;this.spawn();
    }
    pause() {
      if(this.status==='playing') this.status='paused';
      else if(this.status==='paused') this.status='playing';
    }
    tick(ms) {
      if(this.status!=='playing') return;
      ms=Math.min(ms,100);this.elapsed+=ms;
      if(this.grounded()) {
        this.lockTime+=ms;if(this.lockTime>=500)this.lock();
      } else {
        this.lockTime=0;this.gravity+=ms;
        while(this.gravity>=this.interval) {
          this.gravity-=this.interval;
          if(this.valid({...this.current,y:this.current.y+1}))this.current.y++;
          else break;
        }
      }
    }
  }
  const api={Game,SHAPES,matrix};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.Blockflow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
