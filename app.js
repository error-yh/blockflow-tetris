(() => {
  'use strict';
  const {Game,matrix}=Blockflow;
  const $=id=>document.getElementById(id);
  const game=new Game();
  const canvas=$('board'),ctx=canvas.getContext('2d');
  const next=$('next'),nctx=next.getContext('2d');
  const colors={I:'#65d9e8',O:'#efd065',T:'#b899f0',S:'#c9f46b',Z:'#ee8295',J:'#7da6ed',L:'#eca575'};
  let best=0,sound=false,audio,lastTime=0,toastUntil=0,lastPieces=0,renderedStatus='',resumeAfterDialog=false;
  const held=new Map();
  try {best=Math.max(0,Number(localStorage.getItem('blockflow-best'))||0);} catch {}
  function rememberBest() {
    if(game.score<=best)return;
    best=game.score;
    try{localStorage.setItem('blockflow-best',String(best));}catch{}
  }
  function tone(frequency=400,duration=.05) {
    if(!sound)return;
    try {
      audio??=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')void audio.resume();
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type='sine';osc.frequency.value=frequency;
      gain.gain.setValueAtTime(.07,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
    } catch {}
  }
  function block(context,x,y,size,color,ghost=false) {
    const pad=1.6;
    if(ghost) {
      context.fillStyle=color+'0b';context.fillRect(x+pad,y+pad,size-pad*2,size-pad*2);
      context.strokeStyle=color+'80';context.lineWidth=1;
      context.strokeRect(x+pad+.5,y+pad+.5,size-pad*2-1,size-pad*2-1);return;
    }
    context.fillStyle=color;context.fillRect(x+pad,y+pad,size-pad*2,size-pad*2);
    context.fillStyle='#ffffff28';context.fillRect(x+pad,y+pad,size-pad*2,2);
    context.fillStyle='#00000018';context.fillRect(x+pad,y+size-pad-3,size-pad*2,3);
    context.fillStyle='#ffffff10';context.fillRect(x+pad+4,y+pad+4,size-pad*2-8,size-pad*2-8);
  }
  function draw() {
    ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#10141c';ctx.fillRect(0,0,300,600);
    ctx.strokeStyle='#202632';ctx.lineWidth=.5;
    for(let x=0;x<=10;x++){ctx.beginPath();ctx.moveTo(x*30,0);ctx.lineTo(x*30,600);ctx.stroke();}
    for(let y=0;y<=20;y++){ctx.beginPath();ctx.moveTo(0,y*30);ctx.lineTo(300,y*30);ctx.stroke();}
    game.board.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(ctx,x*30,y*30,30,colors[v]);}));
    if(game.current) {
      if(game.status==='playing') game.cells({...game.current,y:game.ghostY()}).forEach(({x,y})=>{if(y>=0)block(ctx,x*30,y*30,30,colors[game.current.type],true);});
      game.cells().forEach(({x,y})=>{if(y>=0)block(ctx,x*30,y*30,30,colors[game.current.type]);});
    }
    if(game.status==='ready') {
      const demo=[['J',0,18],['S',3,18],['O',6,18],['T',7,16]];
      ctx.globalAlpha=.23;
      demo.forEach(([type,ox,oy])=>matrix(type).forEach((row,y)=>row.forEach((v,x)=>{if(v)block(ctx,(x+ox)*30,(y+oy)*30,30,colors[type]);})));
      ctx.globalAlpha=1;
    }
  }
  let nextKey='';
  function drawNext() {
    const types=game.status==='ready'?['T','I','L']:game.queue.slice(0,3);
    const key=types.join('');if(key===nextKey)return;nextKey=key;
    nctx.setTransform(2,0,0,2,0,0);nctx.clearRect(0,0,160,200);
    types.forEach((type,index)=>{
      const cells=[];matrix(type).forEach((row,y)=>row.forEach((v,x)=>{if(v)cells.push({x,y});}));
      const minX=Math.min(...cells.map(c=>c.x)),maxX=Math.max(...cells.map(c=>c.x));
      const minY=Math.min(...cells.map(c=>c.y)),maxY=Math.max(...cells.map(c=>c.y));
      const size=index===0?23:19,ox=(160-(maxX-minX+1)*size)/2,oy=index*66+(62-(maxY-minY+1)*size)/2;
      nctx.globalAlpha=index===0?1:.6;
      cells.forEach(({x,y})=>block(nctx,ox+(x-minX)*size,oy+(y-minY)*size,size,colors[type]));
    });nctx.globalAlpha=1;
  }
  function focusBoard(){canvas.focus({preventScroll:true});}
  function update() {
    rememberBest();
    $('score').textContent=String(game.score).padStart(6,'0');$('best').textContent=best.toLocaleString();
    $('level').textContent=String(game.level).padStart(2,'0');$('lines').textContent=String(game.lines).padStart(2,'0');
    $('progress-lines').textContent=game.lines%10;$('progress-fill').style.width=(game.lines%10*10)+'%';
    const seconds=Math.floor(game.elapsed/1000);$('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
    $('pause').disabled=!['playing','paused'].includes(game.status);
    $('pause-text').textContent=game.status==='paused'?'继续游戏':'暂停游戏';
    $('status-label').textContent={ready:'准备就绪',playing:'游戏进行中',paused:'已暂停',over:'本局结束'}[game.status];
    $('board-label').textContent={ready:'READY TO PLAY',playing:'FIND YOUR FLOW',paused:'TAKE A BREATH',over:'ONE MORE ROUND?'}[game.status];
    if(renderedStatus!==game.status) {
      renderedStatus=game.status;$('overlay').hidden=game.status==='playing';
      if(game.status!=='playing')held.clear();
      if(game.status==='paused') {
        $('overlay-kicker').textContent='休息一下';$('overlay-title').textContent='节奏，由你掌握';
        $('overlay-copy').textContent='准备好后，继续这一局。';$('primary').innerHTML='继续游戏 <kbd>P</kbd>';
        $('overlay-foot').textContent='切换页面时会自动暂停';
      }else if(game.status==='over') {
        $('overlay-kicker').textContent='下次，一定更好';$('overlay-title').textContent='本局结束';
        $('overlay-copy').textContent=`获得 ${game.score.toLocaleString()} 分 · 消除 ${game.lines} 行`;
        $('primary').innerHTML='再来一局 <kbd>Enter</kbd>';$('overlay-foot').textContent='本机最高 '+best.toLocaleString()+' 分';
        tone(150,.22);
      }
    }
    if(lastPieces!==game.pieces) {
      lastPieces=game.pieces;
      if(game.lastClear) {
        $('toast').textContent=['','单行消除','双行消除','三行消除','四行全消！'][game.lastClear];
        toastUntil=performance.now()+950;tone(580+game.lastClear*100,.15);
      }else tone(180,.045);
    }
    $('toast').classList.toggle('show',performance.now()<toastUntil&&game.status==='playing');
    draw();drawNext();
  }
  function start() {held.clear();game.start();lastPieces=0;toastUntil=0;lastTime=performance.now();tone(620,.09);update();focusBoard();}
  function pause() {held.clear();game.pause();update();focusBoard();}
  function primary() {game.status==='paused'?pause():start();}
  function action(name) {
    if(game.status!=='playing')return;
    switch(name) {
      case 'left':game.move(-1);break;case 'right':game.move(1);break;
      case 'rotate':if(game.rotate())tone(420);break;case 'reverse':if(game.rotate(-1))tone(420);break;
      case 'down':game.softDrop();break;case 'drop':game.hardDrop();break;
    }
    update();
  }
  function hold(name,key) {
    action(name);
    if(game.status==='playing'&&['left','right','down'].includes(name))held.set(key,{name,next:performance.now()+(name==='down'?70:170)});
  }
  $('primary').addEventListener('click',primary);$('pause').addEventListener('click',pause);
  $('sound').addEventListener('click',()=>{
    sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'关闭音效':'开启音效');
    $('sound-state').textContent=sound?'开':'关';tone(540,.1);focusBoard();
  });
  const dialog=$('restart-dialog');
  $('restart').addEventListener('click',()=>{
    if(game.status==='ready'||game.status==='over'){start();return;}
    resumeAfterDialog=game.status==='playing';if(resumeAfterDialog)game.pause();held.clear();update();dialog.showModal();
  });
  function cancelRestart(){dialog.close();if(resumeAfterDialog&&game.status==='paused')game.pause();update();focusBoard();}
  $('cancel-restart').addEventListener('click',cancelRestart);
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancelRestart();});
  $('confirm-restart').addEventListener('click',()=>{dialog.close();start();});
  const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',KeyX:'rotate',KeyZ:'reverse',Space:'drop'};
  document.addEventListener('keydown',event=>{
    if(dialog.open||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.code==='Tab')return;
    if(keys[event.code]) {
      // Keep native activation for focused controls while the start/pause overlay is visible.
      if(event.code==='Space'&&event.target.tagName==='BUTTON'&&game.status!=='playing')return;
      event.preventDefault();if(!event.repeat)hold(keys[event.code],event.code);
    } else if(event.code==='KeyP'||event.code==='Escape') {
      event.preventDefault();if(!event.repeat)pause();
    } else if(event.code==='Enter'&&event.target.tagName!=='BUTTON'&&game.status!=='playing') {
      event.preventDefault();if(!event.repeat)primary();
    }
  });
  document.addEventListener('keyup',event=>held.delete(event.code));
  document.querySelectorAll('[data-action]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();button.setPointerCapture(event.pointerId);hold(button.dataset.action,'pointer'+event.pointerId);
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>held.delete('pointer'+event.pointerId));
    button.addEventListener('click',event=>{if(event.detail===0)action(button.dataset.action);});
  });
  function autoPause(){held.clear();if(game.status==='playing'){game.pause();update();}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});window.addEventListener('blur',autoPause);
  function loop(now) {
    const delta=lastTime?now-lastTime:0;lastTime=now;
    if(game.status==='playing') {
      for(const state of held.values())if(now>=state.next){action(state.name);state.next=now+(state.name==='down'?35:50);}
      game.tick(delta);update();
    }
    requestAnimationFrame(loop);
  }
  update();requestAnimationFrame(loop);
  if(document.modelContext?.registerTool) {
    const lifecycle=new AbortController();
    window.addEventListener('pagehide',event=>{if(!event.persisted)lifecycle.abort();});
    const state=()=>({status:game.status,score:game.score,lines:game.lines,level:game.level,board:game.board,current:game.current,next:game.queue.slice(0,3)});
    const tools=[
      {name:'read_game_state',title:'读取俄罗斯方块状态',description:'Read the current board, falling piece, score, and game status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>state()},
      {name:'control_game',title:'操作俄罗斯方块',description:'Start an idle or finished game, pause or resume, or perform one in-game move. Does not restart an active game.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['start','pause','resume','left','right','down','rotate','reverse','drop']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{
        if(!input||typeof input!=='object'||Object.keys(input).length!==1||!['start','pause','resume','left','right','down','rotate','reverse','drop'].includes(input.action))throw new Error('Invalid game action');
        if(dialog.open)throw new Error('Close the restart dialog first');
        const name=input.action;
        if(name==='start'){if(!['ready','over'].includes(game.status))throw new Error('Game already started');start();}
        else if(name==='pause'||name==='resume'){if(game.status!==(name==='pause'?'playing':'paused'))throw new Error('Action unavailable in current state');pause();}
        else {if(game.status!=='playing')throw new Error('Game is not running');action(name);}
        return state();
      }}
    ];
    for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  }
})();
