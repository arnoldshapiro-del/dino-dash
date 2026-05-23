// Entry + game loop
import { Game, State } from './game.js';
import { Input, onInput } from './input.js';
import { UI } from './ui.js';
import { Storage } from './storage.js';
import * as Parallax from './parallax.js';

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
  Game.w = canvas.width / dpr;
  Game.h = canvas.height / dpr;
  Game.ctx.setTransform(dpr,0,0,dpr,0,0);
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
  Game.setState(State.PLAYING);
  UI.clear();
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

function tick(dt){
  if (Game.state !== State.PLAYING) return;
  // Speed ramp 6 → 14 over 60s
  const elapsedS = (performance.now() - Game.runStartT) / 1000;
  Game.speed = Math.min(Game.maxSpeed, Game.baseSpeed + (elapsedS / 60) * (Game.maxSpeed - Game.baseSpeed));
  Game.scroll += Game.speed;
  Game.bgScrollX += Game.speed;
  Parallax.scroll(Game.speed);
  Game.score += Game.speed * 0.1;
  Game.beatPulse = Math.max(0, Game.beatPulse - 0.05);
  // Player input snapshot
  const input = {
    actionHeld: Input.isHeld(),
    crouchHeld: Input.isCrouched(),
    actionPressed: pressedThisFrame
  };
  pressedThisFrame = false;
  Game.player.tick(dt, input);
}

let pressedThisFrame = false;
let modeChangeCooldown = 0;

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
    if (Game.player) Game.player.draw(ctx);
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
      <div class="coins">◎ ${Game.coins}</div>
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
  // Mode-cycle test binding: press 1-5 to swap modes manually (will be removed when portals land in Phase 2)
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
  // touch hint
  if ('ontouchstart' in window){
    document.getElementById('touch-hint').classList.add('show');
    setTimeout(() => document.getElementById('touch-hint').classList.remove('show'), 3000);
  }
  // PWA register
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>null);
  }
  requestAnimationFrame(loop);
});

// Detect simple death-out-of-bounds; full obstacle collisions arrive in Phase 3
setInterval(() => {
  if (Game.state === State.PLAYING && Game.player){
    if (Game.player.y > Game.h + 200 || Game.player.y < -200) {
      showDead();
    }
    if (modeChangeCooldown > 0) modeChangeCooldown--;
  }
}, 16);
