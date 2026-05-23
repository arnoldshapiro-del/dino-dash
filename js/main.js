// Entry + game loop
import { Game, State } from './game.js';
import { Input, onInput } from './input.js';
import { UI } from './ui.js';
import { Storage } from './storage.js';
import * as Parallax from './parallax.js';
import { Portals } from './portals.js';
import { Orbs, Pads } from './orbs.js';
import { PowerUps, POWER_DEFS } from './powerups.js';
import { Coins } from './coins.js';
import { Particles } from './particles.js';
import { Obstacles } from './obstacles.js';
import { ChunkGen } from './chunkgen.js';

const TARGET_W = 1280, TARGET_H = 720;

function resize(){
  const canvas = Game.canvas;
  const wrap = document.getElementById('app');
  const aw = wrap.clientWidth, ah = wrap.clientHeight;
  const aspect = TARGET_W / TARGET_H;
  let w = aw, h = aw / aspect;
  if (h > ah){ h = ah; w = ah * aspect; }
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const dpr = window.devicePixelRatio || 1;
  Game.dpr = dpr;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  Game.ctx.setTransform(dpr,0,0,dpr,0,0);
  Game.w = canvas.width / dpr;
  Game.h = canvas.height / dpr;
}

function showTitle(){
  Game.setState(State.TITLE);
  UI.hideHud();
  UI.showScreen('title', `
    <h1>DINO DASH</h1>
    <p>Endless runner + Geometry Dash + 10 classic games. Tap, hold, swap modes, beat 16 levels, build a shop empire.</p>
    <div class="row">
      <button class="btn" id="btn-play">▶ PLAY</button>
      <button class="btn alt" id="btn-shop">🛒 SHOP</button>
      <button class="btn" id="btn-collection">🏆 COLLECTION</button>
      <button class="btn" id="btn-options">⚙️ OPTIONS</button>
      <button class="btn" id="btn-how">📖 HOW TO PLAY</button>
    </div>
    <p class="muted">Best: ${Game.best}  ·  Coins: ${Game.totalCoins}  ·  DP: ${Game.dashPoints}</p>
  `);
  document.getElementById('btn-play').onclick = () => startRun({ mode:'endless' });
  document.getElementById('btn-shop').onclick = () => UI.toast('Shop opens in Phase 5', '#b300ff');
  document.getElementById('btn-collection').onclick = () => UI.toast('Collection opens in Phase 8');
  document.getElementById('btn-options').onclick = () => UI.toast('Options opens in Phase 8');
  document.getElementById('btn-how').onclick = () => UI.toast('Controls: SPACE / TAP = action, DOWN = crouch, ESC = pause');
}

function startRun(opts){
  Game.resetRun(opts);
  Portals.clear(); Orbs.clear(); Pads.clear(); PowerUps.clear(); Coins.clear(); Particles.clear(); Obstacles.clear();
  seedSandbox();
  Game.setState(State.PLAYING);
  UI.clear();
}

// Phase 2 sandbox: spawn portals/orbs/pads/coins/powerups so all systems are visible.
// Phase 3 will replace this with chunk-driven content.
function seedSandbox(){
  const W = Game.w, H = Game.h;
  const groundY = H * 0.82;
  // Mode portals every ~2000px
  const modes = ['ship','ball','spider','wave','cube'];
  for (let i=0;i<10;i++){
    Portals.spawn({ type:'mode', value:modes[i % modes.length], x: 1400 + i*2400, y: groundY - 130 });
    // Coin trail leading in
    Coins.spawnLine(1100 + i*2400, groundY - 70, 6, 30, i%4===0 ? 'blue' : 'yellow');
    // power-up every other portal
    if (i%2===0){
      const kinds = ['shield','magnet','slowmo','multi2x','jetpack','mystery'];
      PowerUps.spawn({ kind: kinds[i % kinds.length], x: 1700 + i*2400, y: groundY - 130 });
    }
    // orbs in air
    const orbKinds = ['yellow','red','blue','pink','green','spider','dash'];
    Orbs.spawn({ kind: orbKinds[i % orbKinds.length], x: 1850 + i*2400, y: groundY - 180 });
    // pad on ground
    const padKinds = ['yellow','pink','red','blue','spider'];
    Pads.spawn({ kind: padKinds[i % padKinds.length], x: 1500 + i*2400, y: groundY - 8 });
  }
  // Speed portal at 8000
  Portals.spawn({ type:'speed', value:2, x: 8000, y: groundY - 130 });
  Portals.spawn({ type:'speed', value:1, x: 13000, y: groundY - 130 });
  // Mini portal at 11000
  Portals.spawn({ type:'mini', value:true, x: 11000, y: groundY - 130 });
  Portals.spawn({ type:'mini', value:false, x: 15000, y: groundY - 130 });
  // Secret coin in challenging spot
  Coins.spawn({ kind:'gold', x: 9000, y: groundY - 220 });
}

function showDead(){
  Game.setState(State.DEAD);
  if (Game.score > Game.best){ Game.best = Math.floor(Game.score); Storage.set('best', Game.best); }
  Game.totalCoins += Game.coins;
  Storage.set('totalCoins', Game.totalCoins);
  UI.hideHud();
  UI.showScreen('dead', `
    <h1 style="color:#ff3344;-webkit-text-fill-color:#ff3344;background:none">YOU CRASHED</h1>
    <h2>Score ${Math.floor(Game.score)}</h2>
    <p>Coins ${Game.coins} · Best ${Game.best}</p>
    <div class="row">
      <button class="btn" id="btn-retry">RETRY</button>
      <button class="btn alt" id="btn-menu">MENU</button>
    </div>
  `);
  document.getElementById('btn-retry').onclick = () => startRun({ mode:'endless' });
  document.getElementById('btn-menu').onclick = () => showTitle();
}

let pressedThisFrame = false;
let modeChangeCooldown = 0;

const runtimeCb = {
  onPortal(p){ Game.beatPulse = 1; },
  onOrb(){ Game.beatPulse = 0.6; },
  onPad(){ Game.beatPulse = 0.4; },
  onCoin(kind, val, combo){
    const baseVal = val;
    Game.coins += baseVal;
    if (kind === 'gold') Game.score += 100;
    Game.score += baseVal * 5;
  },
  onPickup(kind){ /* hooks for Phase 4 */ },
  onMystery(kind){ UI.toast('Mystery: ' + kind, '#ff2dd4'); },
  onCoinBonus(n){ Game.coins += n; },
  onScoreBonus(n){ Game.score += n; },
  onDpBonus(n){ Game.dashPoints += n; Storage.set('dashPoints', Game.dashPoints); }
};

function tick(dt){
  if (Game.state !== State.PLAYING) return;
  // Speed ramp 6 → 14 over 60s; apply player.speedScale from speed portals
  const elapsedS = (performance.now() - Game.runStartT) / 1000;
  const baseSpeed = Math.min(Game.maxSpeed, Game.baseSpeed + (elapsedS / 60) * (Game.maxSpeed - Game.baseSpeed));
  Game.speed = baseSpeed * (Game.player?.speedScale || 1);

  // Slow-mo
  const slow = PowerUps.isActive('slowmo') ? 0.5 : 1;
  Game.scroll += Game.speed * slow;
  Game.bgScrollX += Game.speed * slow;
  Parallax.scroll(Game.speed * slow);
  Game.score += Game.speed * 0.1 * slow * (PowerUps.isActive('multi2x') ? 2 : 1);
  Game.beatPulse = Math.max(0, Game.beatPulse - 0.05);

  // Input snapshot
  const input = {
    actionHeld: Input.isHeld(),
    crouchHeld: Input.isCrouched(),
    actionPressed: pressedThisFrame
  };
  // Player tick
  Game.player.tick(dt * slow, input);

  // Jetpack overrides: pin to upper half
  if (PowerUps.isActive('jetpack')){
    Game.player.y = Math.max(Game.player.ceilingY + 20, Math.min(Game.h*0.4, Game.player.y - 6));
    Game.player.vy = 0;
  }

  // Tick world entities
  const ss = Game.speed * slow;
  Portals.tick(ss, Game.player, runtimeCb);
  Pads.tick(ss, Game.player, runtimeCb);
  Orbs.tick(ss, Game.player, input, runtimeCb);
  const magnetActive = PowerUps.isActive('magnet');
  Coins.tick(ss, Game.player, magnetActive ? { radius:150 } : null, runtimeCb);
  PowerUps.tick(ss, Game.player, runtimeCb, {});

  Particles.tick();
  pressedThisFrame = false;
}

function render(){
  const ctx = Game.ctx;
  ctx.clearRect(0,0, Game.w, Game.h);
  Parallax.draw(ctx, Game.w, Game.h, Game.beatPulse);
  if (Game.state === State.PLAYING || Game.state === State.PAUSE || Game.state === State.DEAD){
    // ground line
    ctx.strokeStyle = 'rgba(0,240,255,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, Game.h*0.82);
    ctx.lineTo(Game.w, Game.h*0.82);
    ctx.stroke();
    // entities
    Portals.draw(ctx);
    Pads.draw(ctx);
    Coins.draw(ctx);
    PowerUps.draw(ctx);
    Orbs.draw(ctx);
    if (Game.player) Game.player.draw(ctx);
    Particles.draw(ctx);
    // Power-up HUD ring
    PowerUps.drawHud(ctx, Game.w);
    drawHud();
  }
}

function drawHud(){
  UI.showHud(`
    <div class="left">
      <div class="score">${UI.formatNumber(Game.score)}</div>
      <div class="best">BEST ${UI.formatNumber(Game.best)}</div>
    </div>
    <div class="right">
      <div class="coins">◎ ${Game.coins}${Coins.combo>2?` <span style="color:#fff;font-size:13px">×${Coins.combo}</span>`:''}</div>
      <div class="dp">◆ ${Game.dashPoints}</div>
    </div>
  `);
}

let lastT = performance.now();
function loop(now){
  const dt = Math.min(33, now - lastT) / 16.667;
  lastT = now;
  tick(dt);
  render();
  requestAnimationFrame(loop);
}

function bindInputs(){
  Input.init();
  onInput('action', () => { pressedThisFrame = true; });
  onInput('pause', () => {
    if (Game.state === State.PLAYING){ Game.setState(State.PAUSE); UI.showScreen('pause', `<h1>PAUSED</h1><div class="row"><button class="btn" id="btn-resume">RESUME</button><button class="btn alt" id="btn-quit">QUIT</button></div>`); document.getElementById('btn-resume').onclick = () => { UI.clear(); Game.setState(State.PLAYING); }; document.getElementById('btn-quit').onclick = () => showTitle(); }
    else if (Game.state === State.PAUSE){ UI.clear(); Game.setState(State.PLAYING); }
  });
  onInput('restart', () => { if (Game.state === State.PLAYING || Game.state === State.DEAD) startRun({ mode:'endless' }); });
  // Dev: 1-5 to swap mode manually
  onInput('keydown', ({code}) => {
    if (!Game.player) return;
    if (modeChangeCooldown > 0) return;
    const map = { Digit1:'cube', Digit2:'ship', Digit3:'ball', Digit4:'spider', Digit5:'wave' };
    if (map[code]){ Game.player.setMode(map[code]); modeChangeCooldown = 10; }
  });
}

window.addEventListener('load', () => {
  Game.canvas = document.getElementById('game');
  Game.ctx = Game.canvas.getContext('2d');
  Game.load();
  resize();
  window.addEventListener('resize', resize);
  bindInputs();
  showTitle();
  if ('ontouchstart' in window){
    document.getElementById('touch-hint').classList.add('show');
    setTimeout(() => document.getElementById('touch-hint').classList.remove('show'), 3000);
  }
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>null);
  }
  requestAnimationFrame(loop);
});

setInterval(() => {
  if (Game.state === State.PLAYING && Game.player){
    if (Game.player.y > Game.h + 200 || Game.player.y < -200) showDead();
    if (modeChangeCooldown > 0) modeChangeCooldown--;
  }
}, 16);
