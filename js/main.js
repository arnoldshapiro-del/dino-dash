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
import { Achievements } from './achievements.js';
import { Missions, MISSION_POOL } from './missions.js';
import { Daily } from './daily.js';
import { Stats, newRunStats } from './stats.js';
import { Economy } from './economy.js';
import { Shop } from './shop.js';
import { Levels } from './levels.js';
import { WorldMap } from './worldmap.js';
import { LevelPlayer } from './levelplayer.js';
import * as Parallax2 from './parallax.js';
import { Special } from './speciallevels.js';
import { Practice } from './practice.js';
import { Tutorial } from './tutorial.js';
import { ACHIEVEMENTS } from './achievements.js';
import { SKINS, TRAILS } from './economy.js';
import { Audio } from './audio.js';
import { FirebaseSync } from './firebase-sync.js';

// Haptic helper
function haptic(ms){ if ('vibrate' in navigator) try{ navigator.vibrate(ms); }catch(_){} }

// Hot-reload all module state from localStorage (used by Firestore pull)
window.__reloadGameState = function(){
  Game.load();
  Stats.load();
  Achievements.load();
  Missions.load();
  Daily.load();
  Economy.load();
  Levels.load();
  Tutorial.load();
  Shop.syncAchievementSkins();
  Game.totalCoins = Economy.coins;
  Game.dashPoints = Economy.dp;
  if (Game.state === State.TITLE) showTitle();
};

const TARGET_W = 1280, TARGET_H = 720;
let runStats = newRunStats();

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
  const daily = Daily.current;
  const dailyHtml = daily
    ? `<p class="muted">📅 Daily: ${daily.desc} ${Daily.claimed?'✓':''} · resets in ${Daily.countdown()}</p>`
    : '';
  const cloudHtml = FirebaseSync.user
    ? `<button class="btn cloud-on" id="btn-cloud">☁️ ${(FirebaseSync.user.displayName||'Signed in').slice(0,16)} — synced (sign out)</button>
       <button class="btn danger" id="btn-fresh">🔄 START FRESH</button>`
    : `<button class="btn cloud-off" id="btn-cloud">☁️ Cloud Save — sign in to sync across devices</button>
       <button class="btn danger" id="btn-fresh">🔄 START FRESH</button>`;
  UI.showScreen('title', `
    <h1 class="title-shine">DINO DASH</h1>
    <p>Endless runner + Geometry Dash + 10 classic games. Tap, hold, swap modes, beat 16 levels, build a shop empire.</p>
    <div class="row">
      <button class="btn glow-strong" id="btn-play">▶ PLAY</button>
      <button class="btn alt" id="btn-shop">🛒 SHOP</button>
      <button class="btn" id="btn-collection">🏆 COLLECTION</button>
      <button class="btn" id="btn-stats">📊 STATS</button>
      <button class="btn" id="btn-options">⚙️ OPTIONS</button>
    </div>
    <p class="hud-totals"><span class="best">★ ${Game.best}</span> · <span class="coins">◎ ${Game.totalCoins}</span> · <span class="dp">◆ ${Game.dashPoints}</span></p>
    <p class="muted">Stars: ${Levels.totalStars()}/48 · Levels: ${Object.keys(Levels.progress).length}/16</p>
    ${dailyHtml}
    <div class="row">${cloudHtml}</div>
  `);
  document.getElementById('btn-play').onclick = () => showModeSelect();
  document.getElementById('btn-shop').onclick = () => Shop.open(showTitle);
  document.getElementById('btn-collection').onclick = () => showCollection();
  document.getElementById('btn-stats').onclick = () => showStats();
  document.getElementById('btn-options').onclick = () => showOptions();
  document.getElementById('btn-cloud').onclick = async () => {
    if (FirebaseSync.user){
      await FirebaseSync.signOut();
      UI.toast('Signed out (progress kept locally)', '#ffe600');
      showTitle();
    } else {
      UI.toast('Opening Google sign-in…', '#00f0ff');
      const ok = await FirebaseSync.signIn();
      if (ok) UI.toast('Signed in! Progress now syncs to cloud.', '#39ff14');
      else UI.toast('Sign-in cancelled', '#ff3344');
      showTitle();
    }
  };
  document.getElementById('btn-fresh').onclick = async () => {
    const status = FirebaseSync.user
      ? `This will WIPE your save on this device AND in the cloud.\n\nSigned in as: ${FirebaseSync.user.email || FirebaseSync.user.displayName}\n\nType RESET to confirm:`
      : `This will WIPE all local progress.\n\nType RESET to confirm:`;
    const answer = prompt(status);
    if (answer === 'RESET'){
      await FirebaseSync.resetAll();
      UI.toast('Progress reset. Reloading…', '#ff3344');
      setTimeout(() => location.reload(), 800);
    } else if (answer != null){
      UI.toast('Cancelled — your progress is safe.', '#39ff14');
    }
  };

  // Konami detector
  konamiBuffer.length = 0;
}

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
const konamiBuffer = [];
const cheatBuffer = [];
function konamiCheck(code, key){
  konamiBuffer.push(code);
  if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
  if (konamiBuffer.length === KONAMI.length && konamiBuffer.every((c,i)=>c===KONAMI[i])){
    Achievements.check('konami');
    UI.toast('🌈 RAINBOW DINO UNLOCKED!', '#b300ff');
    Economy.skinsOwned.add('rainbowDino'); Economy.save();
    konamiBuffer.length = 0;
  }
  // Cheat text buffer
  if (key && key.length === 1){
    cheatBuffer.push(key.toLowerCase());
    if (cheatBuffer.length > 12) cheatBuffer.shift();
    const word = cheatBuffer.join('');
    if (word.endsWith('rubrub')){
      Game.options.showFps = !Game.options.showFps;
      Game.options.showHitboxes = !Game.options.showHitboxes;
      Game.saveOptions();
      UI.toast('🔧 DEBUG OVERLAY '+(Game.options.showFps?'ON':'OFF'), '#39ff14');
      cheatBuffer.length = 0;
    }
    if (word.endsWith('dawn')){
      Economy.addCoins(5000); UI.toast('🌅 +5000c (dev cheat)', '#ffd700');
      cheatBuffer.length = 0;
    }
  }
}

function showModeSelect(){
  Game.setState(State.MODE_SELECT);
  UI.showScreen('mode', `
    <h1>SELECT</h1>
    <div class="row">
      <button class="btn" id="m-endless">∞ ENDLESS RUN</button>
      <button class="btn alt" id="m-levels">🗺️ LEVELS</button>
      <button class="btn" id="m-back">BACK</button>
    </div>
    <p class="muted">Endless: infinite procedural. Levels: 16 themed levels + boss.</p>
  `);
  document.getElementById('m-endless').onclick = () => startRun({ mode:'endless' });
  document.getElementById('m-levels').onclick = () => WorldMap.open(
    (lvl) => startRun({ mode:'level', levelId: lvl.id }),
    (lvl) => startRun({ mode:'level', levelId: lvl.id, practice:true }),
    showTitle
  );
  document.getElementById('m-back').onclick = showTitle;
}

function showCollection(){
  Game.setState(State.COLLECTION);
  Achievements.load();
  let tab = 'achievements';
  const render = () => {
    let body = '';
    if (tab === 'achievements'){
      body = ACHIEVEMENTS.map(a => {
        const got = Achievements.isUnlocked(a.id);
        return `<div class="card ${got?'owned':'locked'}">
          <div class="icon">${got?'🏆':'🔒'}</div>
          <div class="name">${a.name}</div>
          <div class="desc">${a.desc}</div>
          <div class="cost dp">${got?'UNLOCKED':'+'+a.dp+' DP'}</div>
        </div>`;
      }).join('');
    } else if (tab === 'skins'){
      body = SKINS.map(s => {
        const owned = Economy.ownsSkin(s.id);
        const equipped = Economy.currentSkin === s.id;
        let swatch;
        if (s.id === 'custom') swatch = `linear-gradient(135deg, ${Economy.customColor}, ${Economy.customColor2})`;
        else if (s.color === 'rainbow') swatch = 'linear-gradient(90deg,red,orange,yellow,green,blue,purple)';
        else swatch = s.color || '#00f0ff';
        const customizeBtn = s.id === 'custom' ? `<button class="btn alt" data-customize="1">🎨 CUSTOMIZE</button>` : '';
        return `<div class="card ${owned?'owned':'locked'}">
          <div class="icon" style="height:30px;background:${swatch};border-radius:4px"></div>
          <div class="name">${s.name}</div>
          <div class="desc">${s.desc}</div>
          ${owned? (equipped?`<button class="btn" disabled style="opacity:.5">EQUIPPED</button>`:`<button class="btn" data-eq="${s.id}">EQUIP</button>`):''}
          ${customizeBtn}
        </div>`;
      }).join('');
    } else if (tab === 'trails'){
      body = TRAILS.map(t => {
        const owned = Economy.ownsTrail(t.id);
        const equipped = Economy.currentTrail === t.id;
        return `<div class="card ${owned?'owned':'locked'}">
          <div class="name">${t.name}</div>
          ${owned? (equipped?`<button class="btn" disabled style="opacity:.5">EQUIPPED</button>`:`<button class="btn" data-eq="${t.id}">EQUIP</button>`):''}
        </div>`;
      }).join('');
    }
    UI.showScreen('coll', `
      <h1>COLLECTION</h1>
      <div class="tabbar">
        <button class="tab ${tab==='achievements'?'active':''}" data-tab="achievements">ACHIEVEMENTS ${Achievements.unlocked.size}/20</button>
        <button class="tab ${tab==='skins'?'active':''}" data-tab="skins">SKINS</button>
        <button class="tab ${tab==='trails'?'active':''}" data-tab="trails">TRAILS</button>
      </div>
      <div class="grid shop-grid">${body}</div>
      <button class="btn alt" id="c-back">BACK</button>
    `);
    document.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { tab = t.dataset.tab; render(); });
    document.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      if (tab === 'skins') Economy.equipSkin(b.dataset.eq); else Economy.equipTrail(b.dataset.eq);
      UI.toast('Equipped!', '#00f0ff'); render();
    });
    document.querySelectorAll('[data-customize]').forEach(b => b.onclick = () => showCustomizer(() => { showCollection(); }));
    document.getElementById('c-back').onclick = showTitle;
  };
  render();
}

function showCustomizer(onClose){
  // Live HSL-picker customizer for the 'custom' skin
  Game.setState(State.COLLECTION);
  const render = () => {
    UI.showScreen('cust', `
      <h1 style="font-size:48px">🎨 CUSTOMIZE</h1>
      <p>Pick your primary and secondary colors — your dino, ship, ball, spider and wave all use them.</p>
      <div class="briefing">
        <canvas id="cust-preview" width="240" height="120" style="background:linear-gradient(180deg,#0a0420,#2d1b4e);border-radius:8px;box-shadow:0 0 18px rgba(0,240,255,.3)"></canvas>
        <div class="col" style="gap:14px;width:100%">
          <div class="cust-row">
            <label>Primary</label>
            <input type="color" id="cust-c1" value="${Economy.customColor}" style="width:60px;height:34px;border:none;border-radius:6px;background:transparent;cursor:pointer">
            <span class="cust-hex" id="cust-hex1">${Economy.customColor}</span>
          </div>
          <div class="cust-row">
            <label>Secondary</label>
            <input type="color" id="cust-c2" value="${Economy.customColor2}" style="width:60px;height:34px;border:none;border-radius:6px;background:transparent;cursor:pointer">
            <span class="cust-hex" id="cust-hex2">${Economy.customColor2}</span>
          </div>
          <div class="row" style="margin-top:6px">
            <button class="btn alt" id="cust-preset-cyan">CYAN</button>
            <button class="btn alt" id="cust-preset-pink">PINK</button>
            <button class="btn alt" id="cust-preset-fire">FIRE</button>
            <button class="btn alt" id="cust-preset-galaxy">GALAXY</button>
            <button class="btn alt" id="cust-preset-mint">MINT</button>
          </div>
        </div>
      </div>
      <div class="row">
        <button class="btn glow-strong" id="cust-equip">✓ EQUIP CUSTOM</button>
        <button class="btn" id="cust-back">BACK</button>
      </div>
    `);
    const c1 = document.getElementById('cust-c1');
    const c2 = document.getElementById('cust-c2');
    const hex1 = document.getElementById('cust-hex1');
    const hex2 = document.getElementById('cust-hex2');
    const preview = document.getElementById('cust-preview');
    const pctx = preview.getContext('2d');
    function drawPreview(){
      pctx.clearRect(0, 0, 240, 120);
      // Draw a small cube + ship + ball + spider + wave preview using current colors
      const slots = [
        { x: 25, y: 60, type: 'cube' },
        { x: 75, y: 60, type: 'ship' },
        { x: 125, y: 60, type: 'ball' },
        { x: 175, y: 60, type: 'spider' },
        { x: 215, y: 60, type: 'wave' }
      ];
      const c1v = c1.value, c2v = c2.value;
      slots.forEach(s => {
        pctx.save();
        pctx.translate(s.x, s.y);
        pctx.shadowColor = c1v; pctx.shadowBlur = 12;
        pctx.fillStyle = c1v;
        if (s.type === 'cube'){
          pctx.fillRect(-12, -12, 24, 24);
          pctx.fillStyle = c2v; pctx.fillRect(-9, -9, 18, 3);
        } else if (s.type === 'ship'){
          pctx.beginPath(); pctx.moveTo(12,0); pctx.lineTo(-12,-10); pctx.lineTo(-8,0); pctx.lineTo(-12,10); pctx.closePath(); pctx.fill();
        } else if (s.type === 'ball'){
          pctx.beginPath(); pctx.arc(0,0,11,0,Math.PI*2); pctx.fill();
          pctx.fillStyle = c2v; pctx.fillRect(-9,-2,18,4);
        } else if (s.type === 'spider'){
          pctx.beginPath(); pctx.arc(0,0,7,0,Math.PI*2); pctx.fill();
          for (let i=0;i<4;i++){
            const a = (i/4) * Math.PI*2;
            pctx.beginPath(); pctx.arc(Math.cos(a)*12, Math.sin(a)*12, 2.5, 0, Math.PI*2); pctx.fill();
          }
        } else if (s.type === 'wave'){
          pctx.beginPath(); pctx.moveTo(10,0); pctx.lineTo(-10,-9); pctx.lineTo(-6,0); pctx.lineTo(-10,9); pctx.closePath(); pctx.fill();
        }
        pctx.restore();
        pctx.fillStyle = '#fff'; pctx.font = '600 8px Oxanium'; pctx.textAlign = 'center';
        pctx.fillText(s.type.toUpperCase(), s.x, s.y + 24);
      });
    }
    drawPreview();
    const update = () => {
      hex1.textContent = c1.value.toUpperCase();
      hex2.textContent = c2.value.toUpperCase();
      Economy.customColor = c1.value;
      Economy.customColor2 = c2.value;
      Economy.save();
      drawPreview();
    };
    c1.oninput = update;
    c2.oninput = update;
    const setPreset = (a, b) => { c1.value = a; c2.value = b; update(); };
    document.getElementById('cust-preset-cyan').onclick = () => setPreset('#00f0ff', '#0a0420');
    document.getElementById('cust-preset-pink').onclick = () => setPreset('#ff2dd4', '#2d0a40');
    document.getElementById('cust-preset-fire').onclick = () => setPreset('#ff5b1f', '#330a00');
    document.getElementById('cust-preset-galaxy').onclick = () => setPreset('#b300ff', '#0a0040');
    document.getElementById('cust-preset-mint').onclick = () => setPreset('#39ffaa', '#0a3322');
    document.getElementById('cust-equip').onclick = () => {
      Economy.equipSkin('custom');
      UI.toast('Custom icon equipped!', '#00f0ff');
      if (onClose) onClose();
    };
    document.getElementById('cust-back').onclick = () => { if (onClose) onClose(); };
  };
  render();
}

function showOptions(){
  Game.setState(State.OPTIONS);
  const o = Game.options;
  UI.showScreen('opt', `
    <h1>OPTIONS</h1>
    <div class="col" style="width:min(520px,90vw);gap:6px;align-items:stretch">
      <div class="slider-row"><label>SFX Volume</label><input type="range" min="0" max="100" value="${o.sfxVol*100}" data-opt="sfxVol"></div>
      <div class="slider-row"><label>Music Volume</label><input type="range" min="0" max="100" value="${o.musicVol*100}" data-opt="musicVol"></div>
      <div class="slider-row"><label>Master Volume</label><input type="range" min="0" max="100" value="${o.masterVol*100}" data-opt="masterVol"></div>
      <div class="slider-row"><label>Screen Shake</label><input type="range" min="0" max="100" value="${o.shake*100}" data-opt="shake"></div>
      <div class="slider-row"><label>Particles</label>
        <select data-opt="particles">
          <option ${o.particles==='low'?'selected':''}>low</option>
          <option ${o.particles==='medium'?'selected':''}>medium</option>
          <option ${o.particles==='high'?'selected':''}>high</option>
        </select></div>
      <div class="slider-row"><label>Reduced Motion</label><input type="checkbox" ${o.reducedMotion?'checked':''} data-opt="reducedMotion"></div>
      <div class="slider-row"><label>High Contrast</label><input type="checkbox" ${o.highContrast?'checked':''} data-opt="highContrast"></div>
      <div class="slider-row"><label>Color-blind Mode</label><input type="checkbox" ${o.colorBlind?'checked':''} data-opt="colorBlind"></div>
      <div class="slider-row"><label>Show FPS</label><input type="checkbox" ${o.showFps?'checked':''} data-opt="showFps"></div>
      <div class="slider-row"><label>Show Hitboxes</label><input type="checkbox" ${o.showHitboxes?'checked':''} data-opt="showHitboxes"></div>
      <div class="slider-row"><label>Skip Tutorial</label><input type="checkbox" ${o.skipTutorial?'checked':''} data-opt="skipTutorial"></div>
    </div>
    <div class="row">
      <button class="btn alt" id="opt-tutorial">REPLAY TUTORIAL</button>
      <button class="btn danger" id="opt-reset">RESET ALL DATA</button>
      <button class="btn" id="opt-back">BACK</button>
    </div>
  `);
  document.querySelectorAll('[data-opt]').forEach(el => {
    el.oninput = el.onchange = () => {
      const key = el.dataset.opt;
      if (el.type === 'range') Game.options[key] = (+el.value)/100;
      else if (el.type === 'checkbox') Game.options[key] = el.checked;
      else Game.options[key] = el.value;
      Game.saveOptions();
      if (key === 'skipTutorial') Tutorial.setSkip(el.checked);
    };
  });
  document.getElementById('opt-tutorial').onclick = () => { Tutorial.reset(); UI.toast('Tutorial reset', '#00f0ff'); };
  document.getElementById('opt-reset').onclick = () => {
    if (prompt('Type RESET to wipe all data') === 'RESET'){
      Storage.clear(); location.reload();
    }
  };
  document.getElementById('opt-back').onclick = showTitle;
}

function showStats(){
  Game.setState(State.STATS);
  const s = Stats.load();
  const ach = Achievements.unlocked.size;
  UI.showScreen('stats', `
    <h1>STATS</h1>
    <div class="grid" style="grid-template-columns:1fr 1fr;max-width:720px">
      <div class="card"><div class="name">Total runs</div><div class="cost">${s.runs}</div></div>
      <div class="card"><div class="name">Total distance</div><div class="cost">${s.distance}</div></div>
      <div class="card"><div class="name">Total coins</div><div class="cost">${s.coins}</div></div>
      <div class="card"><div class="name">Total jumps</div><div class="cost">${s.jumps}</div></div>
      <div class="card"><div class="name">Time played</div><div class="cost">${Math.floor(s.timeS/60)} min</div></div>
      <div class="card"><div class="name">Best score</div><div class="cost">${s.bestOverall}</div></div>
      <div class="card"><div class="name">Highest combo</div><div class="cost">${s.maxCombo}</div></div>
      <div class="card"><div class="name">Achievements</div><div class="cost">${ach}/20</div></div>
      <div class="card"><div class="name">Levels</div><div class="cost">${s.levelsCompleted}/16</div></div>
      <div class="card"><div class="name">Stars</div><div class="cost">${s.totalStars}/48</div></div>
      <div class="card"><div class="name">Teleports</div><div class="cost">${s.teleports}</div></div>
      <div class="card"><div class="name">Secret coins</div><div class="cost">${s.secretCoins}</div></div>
    </div>
    <button class="btn alt" id="btn-back">BACK</button>
  `);
  document.getElementById('btn-back').onclick = showTitle;
}

function startRun(opts){
  // Preserve attempt count + best-pct across instant restarts on same level
  const prevAttempts = (opts._keepAttempts ? Game._attempts : 0) || 0;
  const prevBestPct = (opts._keepAttempts ? Game._bestPct : 0) || 0;
  const prevLevelId = opts._keepAttempts ? Game._restartLevelId : null;
  Game.resetRun(opts);
  Portals.clear(); Orbs.clear(); Pads.clear(); PowerUps.clear(); Coins.clear(); Particles.clear(); Obstacles.clear();
  LevelPlayer.reset();
  applyUpgradesToPlayer();
  Game._attempts = (opts._keepAttempts && opts.levelId === prevLevelId) ? prevAttempts : 0;
  Game._bestPct  = (opts._keepAttempts && opts.levelId === prevLevelId) ? prevBestPct : 0;
  Game._restartLevelId = opts.levelId || null;
  if (opts.mode === 'level'){
    const lvl = Levels.byId(opts.levelId);
    if (!lvl){ UI.toast('Level not found'); return showTitle(); }
    if (lvl.palette) Parallax2.setPalette(lvl.palette);
    Game.player.setMode(lvl.modes[0]);
    LevelPlayer.init(lvl, Game.player, Game.h * 0.82, !!opts.practice);
  } else {
    Parallax2.setPalette(['#0a0420','#2d1b4e','#ff4d8f','#ff8d3c']);
    ChunkGen.init(Game.player, Game.h * 0.82, () => Game.score);
  }
  runStats = newRunStats();

  // Consumable: head start
  if (Economy.useConsumable('headStart')){ Game.score = 2000; }
  // Consumable: power pack — pre-spawn 3 power-ups
  if (Economy.useConsumable('powerPack')){
    const kinds = ['shield','magnet','multi2x'];
    const groundY = Game.h * 0.82;
    for (let i=0;i<3;i++) PowerUps.spawn({ kind:kinds[i], x: 1200 + i*600, y: groundY - 130 });
  }
  // Consumable: mystery charge
  if (Economy.useConsumable('mysteryCharge')){
    PowerUps.spawn({ kind:'mystery', x: 1800, y: Game.h*0.82 - 130 });
  }
  // Consumable: score boost (sets a flag — handled in tick)
  scoreBoostActive = Economy.useConsumable('scoreBoost');
  scoreBoostUntil = scoreBoostActive ? performance.now() + 30000 : 0;
  // Upgrade: start-of-run shield (free, doesn't consume revive token)
  const bonuses = Economy.bonuses();
  if (bonuses.startShield){ Game.player.shield = true; PowerUps.active.shield = 60 * (3 + (bonuses.shieldDur/60||0)); }
  // Revive logic per-run
  Economy.runsSinceRevive++;
  Game.setState(State.PLAYING);
  UI.clear();
}

function applyUpgradesToPlayer(){
  const b = Economy.bonuses();
  // Jump power
  Game.player.jumpPowerMax = 15 * (1 + b.jumpPower);
  Game.player.jumpPowerMin = 11 * (1 + b.jumpPower);
  // Skin color
  const skin = (Economy.currentSkin === 'classic') ? null :
    (Economy.currentSkin === 'custom') ? (Economy.customColor || '#00f0ff') :
    (Economy.currentSkin === 'rainbowDino') ? `hsl(${(performance.now()/8)%360}, 100%, 60%)` :
    ({
      neonCube:'#39ff14', pixelBird:'#ffe600', glowCat:'#ff2dd4',
      robotSkull:'#cccccc', crystal:'#a0e7ff', firePhoenix:'#ff5b1f',
      galaxy:'#b300ff', glitch:'#ff3344'
    })[Economy.currentSkin] || null;
  Game.player.skinColor = skin;
}

let scoreBoostActive = false, scoreBoostUntil = 0;

function onPlayerDeath(cause){
  // Practice mode: respawn at last checkpoint, no scoring penalty
  if (Practice.enabled && Practice.checkpoints.length){
    if (Practice.restore()){ UI.toast('Checkpoint restore', '#00f0ff'); return; }
  }
  if (Game.runMode === 'level' && LevelPlayer.active){
    if (LevelPlayer.practice){
      if (Practice.checkpoints.length && Practice.restore()){ return; }
      LevelPlayer.deaths = 0;
      Game.player.alive = true; Game.player.invuln = 90;
      Game.player.y = Game.h * 0.82 - Game.player.h - 80;
      Game.player.vy = 0;
      return;
    }
    // GD-style INSTANT RESTART. Track best % reached and total attempts;
    // never block the player with a menu. They can quit via ESC pause.
    const lvl = LevelPlayer.level;
    const pct = Math.min(99, Math.floor((Game.scroll / LevelPlayer.endX) * 100));
    if (pct > (Game._bestPct||0)) Game._bestPct = pct;
    Game._attempts = (Game._attempts||0) + 1;
    Game.doShake(8, 6);
    Game.doHitstop(180); // visible flash, then reset
    setTimeout(() => {
      if (Game.state !== State.PLAYING) return;
      startRun({ mode:'level', levelId: lvl.id, _keepAttempts:true });
    }, 220);
    return;
  }
  endRun(cause);
}

function endLevel(result){
  Game.setState(State.LEVEL_COMPLETE);
  const lvl = LevelPlayer.level;
  const stars = result.stars;
  const dpReward = (lvl.rewards?.dp || [50,100,200])[stars-1] || 50;
  const isFirst = Levels.stars(lvl.id) === 0;
  const coinReward = isFirst ? (lvl.rewards?.firstClearCoins || 500) : 25;
  Levels.recordStars(lvl.id, stars);
  Economy.addCoins(coinReward);
  Economy.addDP(dpReward);
  Game.totalCoins = Economy.coins;
  Game.dashPoints = Economy.dp;
  if (Levels.worldCompleted(3) && !Economy.ownsSkin('glitch')){
    Economy.skinsOwned.add('glitch'); Economy.save();
    UI.toast('Skin unlocked: Glitch', '#ffd700');
  }
  // Stats
  Stats.bump('levelsCompleted', isFirst ? 1 : 0);
  Stats.bump('totalStars', Math.max(0, stars - (Levels.progress[lvl.id]?.starsPrev || 0)));
  UI.hideHud();
  const starHtml = '★'.repeat(stars) + '<span style="color:#444">' + '★'.repeat(3-stars) + '</span>';
  UI.showScreen('lvlComplete', `
    <h1 style="color:#39ff14;-webkit-text-fill-color:#39ff14;background:none">LEVEL COMPLETE</h1>
    <div style="font:800 60px Oxanium;color:#ffd700;text-shadow:0 0 22px rgba(255,215,0,.6)">${starHtml}</div>
    <p>${lvl.name} · Deaths ${result.deaths} · Coins ${result.coins}/${result.coinsAvailable||'-'}</p>
    <p style="color:#ffd700">+${coinReward} coins  ·  +${dpReward} DP</p>
    <div class="row">
      <button class="btn" id="b-next">NEXT</button>
      <button class="btn alt" id="b-retry">RETRY</button>
      <button class="btn" id="b-map">WORLD MAP</button>
    </div>
  `);
  document.getElementById('b-retry').onclick = () => startRun({ mode:'level', levelId: lvl.id });
  document.getElementById('b-map').onclick = () => WorldMap.open(
    (l) => startRun({ mode:'level', levelId: l.id }),
    (l) => startRun({ mode:'level', levelId: l.id, practice:true }),
    showTitle
  );
  document.getElementById('b-next').onclick = () => {
    const next = Levels.all[Levels.all.findIndex(l=>l.id===lvl.id) + 1];
    if (next && Levels.isUnlocked(next.id)) startRun({ mode:'level', levelId: next.id });
    else WorldMap.open((l) => startRun({ mode:'level', levelId: l.id }), (l) => startRun({ mode:'level', levelId: l.id, practice:true }), showTitle);
  };
}

function endLevelFailed(){
  Game.setState(State.LEVEL_FAILED);
  const lvl = LevelPlayer.level;
  const progressPct = Math.min(100, Math.floor(((Game.scroll) / (LevelPlayer.endX - 1000)) * 100));
  UI.hideHud();
  UI.showScreen('lvlFailed', `
    <h1 style="color:#ff3344;-webkit-text-fill-color:#ff3344;background:none">YOU CRASHED</h1>
    <p>${progressPct}% of ${lvl.name} · ${LevelPlayer.deaths} deaths</p>
    <div class="row">
      <button class="btn" id="b-retry">RETRY</button>
      <button class="btn alt" id="b-prac">PRACTICE</button>
      <button class="btn" id="b-map">WORLD MAP</button>
    </div>
  `);
  document.getElementById('b-retry').onclick = () => startRun({ mode:'level', levelId: lvl.id });
  document.getElementById('b-prac').onclick = () => startRun({ mode:'level', levelId: lvl.id, practice:true });
  document.getElementById('b-map').onclick = () => WorldMap.open(
    (l) => startRun({ mode:'level', levelId: l.id }),
    (l) => startRun({ mode:'level', levelId: l.id, practice:true }),
    showTitle
  );
}

function endRun(cause){
  // Try revive: free if reviveFreq upgrade is due, or consumable
  const b = Economy.bonuses();
  const freeRevive = b.reviveFreq && Economy.runsSinceRevive >= b.reviveFreq;
  const haveToken = (Economy.consumables.reviveToken||0) > 0;
  if (!Game.player._revived && (freeRevive || haveToken)){
    Game.player._revived = true;
    if (freeRevive){ Economy.runsSinceRevive = 0; Economy.save(); UI.toast('FREE REVIVE!', '#39ff14'); }
    else { Economy.useConsumable('reviveToken'); UI.toast('REVIVE TOKEN USED', '#ff3344'); }
    Game.player.alive = true; Game.player.invuln = 90;
    Game.player.y = Game.h * 0.82 - Game.player.h - 80;
    Game.player.vy = 0;
    Game.beatPulse = 1;
    return;
  }
  Game.setState(State.DEAD);
  runStats.score = Game.score;
  runStats.coins = Game.coins;
  runStats.timeS = (performance.now() - Game.runStartT)/1000;
  runStats.distance = Game.scroll;
  runStats.deathCause = cause || 'unknown';
  Economy.addCoins(Game.coins);
  Game.totalCoins = Economy.coins;
  Stats.applyRun(runStats);
  // Check achievements
  Achievements.check('score', runStats.score, Stats.data);
  Achievements.check('runDuration', runStats.timeS, Stats.data);
  Achievements.check('combo', runStats.maxCombo, Stats.data);
  Achievements.check('cactiJumped', null, Stats.data);
  Achievements.check('coins', null, Stats.data);
  Achievements.check('teleports', null, Stats.data);
  Achievements.check('runs', null, Stats.data);
  Achievements.check('miniTime', runStats.modeTimes.cube && (runStats.powerDurations.mini||0));
  Achievements.check('waveTime', runStats.modeTimes.wave);
  Achievements.check('noCrouchDistance', runStats.noCrouchDistance);
  Achievements.check('portalsInRun', runStats.modesVisited);
  Achievements.check('firstRun');
  // Missions + daily
  Missions.evaluate(runStats, (def) => {
    if (def.reward) Game.totalCoins += def.reward;
    if (def.dp) { Game.dashPoints += def.dp; Storage.set('dashPoints', Game.dashPoints); }
    Stats.bump('missionsCompleted');
  });
  if (Daily.current){
    const dailyDone = Missions._isComplete(Daily.current.id, runStats);
    if (dailyDone && !Daily.claimed){
      const r = Daily.claim();
      if (r){ Game.totalCoins += r.coins; Game.dashPoints += r.dp; Storage.set('totalCoins', Game.totalCoins); Storage.set('dashPoints', Game.dashPoints); Stats.bump('dailiesCompleted'); UI.toast(`🎯 Daily complete! +${r.coins}c +${r.dp}DP`, '#ffe600'); }
    }
  }
  if (Game.score > Game.best){ Game.best = Math.floor(Game.score); Storage.set('best', Game.best); Audio.sfx('highscore'); }
  UI.hideHud();
  UI.showScreen('dead', `
    <h1 style="color:#ff3344;-webkit-text-fill-color:#ff3344;background:none">YOU CRASHED</h1>
    <h2>Score ${Math.floor(Game.score)}</h2>
    <p>Coins ${Game.coins} · Best ${Game.best} · ${Math.floor(runStats.timeS)}s · Modes ${runStats.modesVisited.size}/5</p>
    <p class="muted">Jumps ${runStats.jumps} · Portals ${runStats.portals} · Orbs ${runStats.orbs} · Max combo ×${runStats.maxCombo}</p>
    <div class="row">
      <button class="btn" id="btn-retry">RETRY</button>
      <button class="btn alt" id="btn-menu">MENU</button>
      <button class="btn" id="btn-share">SHARE</button>
    </div>
  `);
  document.getElementById('btn-retry').onclick = () => startRun({ mode:'endless' });
  document.getElementById('btn-menu').onclick = () => showTitle();
  document.getElementById('btn-share').onclick = () => {
    const t = `I scored ${Math.floor(Game.score)} in Dino Dash! ${location.href}`;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => UI.toast('Copied to clipboard!', '#00f0ff'));
  };
}

let pressedThisFrame = false;
let leftPressedFrame = false, rightPressedFrame = false, upPressedFrame = false, downPressedFrame = false;
let modeChangeCooldown = 0;

const runtimeCb = {
  onPortal(p){
    Game.beatPulse = 1;
    Audio.sfx('portal');
    Game.doShake(3, 3);
    Game.doHitstop(60);
    haptic(50);
    Particles.ring(p.x + p.w/2, Game.player.y + Game.player.h/2, 20, '#00f0ff');
    if (p.type === 'mode'){
      runStats.portals++;
      runStats.modesVisited.add(p.value);
      Audio.setMode(p.value);
    }
    if (p.type === 'speed') runStats.maxSpeedScale = Math.max(runStats.maxSpeedScale, p.value);
    Achievements.check('speedScale', runStats.maxSpeedScale);
    Achievements.check('portalsInRun', runStats.modesVisited);
  },
  onOrb(){ Game.beatPulse = 0.6; runStats.orbs++; runStats.orbChain++; Audio.sfx('orb'); haptic(20); Achievements.check('orbChain', runStats.orbChain); },
  onPad(){ Game.beatPulse = 0.4; runStats.pads++; Audio.sfx('pad'); haptic(20); },
  onCoin(kind, val, combo){
    const b = Economy.bonuses();
    const boosted = Math.ceil(val * (1 + b.coinValue));
    Game.coins += boosted;
    runStats.coins += boosted;
    haptic(15);
    Particles.floatText(Game.player.x + Game.player.w/2, Game.player.y, `+${boosted}`, kind==='gold'?'#ffaa00':kind==='blue'?'#00f0ff':'#ffd700');
    if (combo >= 3 && combo % 3 === 0){
      Particles.floatText(Game.player.x + Game.player.w/2, Game.player.y - 20, `PERFECT! ×${combo}`, '#ff2dd4');
    }
    if (LevelPlayer.active) LevelPlayer.onCoin();
    runStats.maxCombo = Math.max(runStats.maxCombo, combo);
    if (kind === 'gold'){
      runStats.secretCoins++;
      Game.score += 100;
      Achievements.check('goldCoin');
    }
    Game.score += boosted * 5;
    Audio.sfx('coin', { combo });
    Achievements.check('combo', combo);
  },
  onPickup(kind){
    runStats.totalPowerUps++;
    runStats.uniquePowerUps.add(kind);
    runStats.powerCounts[kind] = (runStats.powerCounts[kind]||0) + 1;
    if (kind === 'shield') runStats.shieldsUsed++;
    Audio.sfx('powerup');
  },
  onMystery(kind){ UI.toast('Mystery: ' + kind.replace('mystery_',''), '#ff2dd4'); },
  onCoinBonus(n){ Game.coins += n; runStats.coins += n; },
  onScoreBonus(n){ Game.score += n; },
  onDpBonus(n){ Game.dashPoints += n; Storage.set('dashPoints', Game.dashPoints); }
};

function tick(dt){
  if (Game.state !== State.PLAYING) return;
  if (Game.hitstop > 0){ Game.hitstop -= 16; return; }
  const elapsedS = (performance.now() - Game.runStartT) / 1000;
  const baseSpeed = Math.min(Game.maxSpeed, Game.baseSpeed + (elapsedS / 60) * (Game.maxSpeed - Game.baseSpeed));
  Game.speed = baseSpeed * (Game.player?.speedScale || 1);

  const b = Economy.bonuses();
  const slow = PowerUps.isActive('slowmo') ? 0.5 : 1;
  Game.scroll += Game.speed * slow;
  Parallax.scroll(Game.speed * slow);
  let scoreMul = (1 + b.scoreMul);
  if (PowerUps.isActive('multi2x')) scoreMul *= 2;
  if (scoreBoostActive && performance.now() < scoreBoostUntil) scoreMul *= 5;
  else if (scoreBoostActive) scoreBoostActive = false;
  Game.score += Game.speed * 0.1 * slow * scoreMul;
  Game.beatPulse = Math.max(0, Game.beatPulse - 0.05);

  const input = {
    actionHeld: Input.isHeld(),
    crouchHeld: Input.isCrouched(),
    actionPressed: pressedThisFrame
  };
  // Snapshot player.events post-tick to update stats
  // Provide actionPressed flag to player physics (needed for ball, spider, dash orb)
  Game.player._actionPressed = pressedThisFrame;
  // Special level mechanics override standard player physics
  const useSpecial = LevelPlayer.active && Special.active;
  if (!useSpecial){
    Game.player.tick(dt * slow, input);
  } else {
    // Update mode visuals + size only — physics handled in Special.tick
  }
  for (const ev of Game.player.events){
    if (ev === 'jump'){ runStats.jumps++; Audio.sfx('jump'); }
    else if (ev === 'gravFlip') runStats.gravFlips++;
    else if (ev === 'teleport') { runStats.teleports++; runStats.jumps++; Audio.sfx('orb'); }
    else if (typeof ev === 'object' && ev.type === 'modeChange'){
      runStats.modesVisited.add(ev.mode);
      Tutorial.briefMode(ev.mode);
      Audio.setMode(ev.mode);
    }
  }
  // Music BPM tracks speed: 100 → 160 as speed 6 → 14
  Audio.setBpm(100 + ((Game.speed - 6) / 8) * 60);
  // Secret: every 50,000 score → 5-second 10x multiplier window
  const scoreMilestone = Math.floor(Game.score / 50000);
  if (scoreMilestone > (Game._lastMilestone||0)){
    Game._lastMilestone = scoreMilestone;
    Game._megaUntil = performance.now() + 5000;
    UI.toast('💥 10x MULTIPLIER ZONE! 5s!', '#ff2dd4');
    Game.beatPulse = 1;
  }
  if (Game._megaUntil && performance.now() < Game._megaUntil){
    Game.score += Game.speed * 0.9; // big bonus
  }
  // Practice mode checkpoints
  Practice.tick();
  // First-encounter tutorial arrows (only fires if Tutorial.enabled)
  Tutorial.tick(Game, Obstacles, Portals, Orbs, Pads, Coins);
  // Player landed = reset orb chain
  const onGround = Game.player.gravityDir > 0
    ? (Game.player.y + Game.player.h >= Game.player.groundY - 0.5)
    : (Game.player.y <= Game.player.ceilingY + 0.5);
  if (onGround) runStats.orbChain = 0;

  // Track per-mode time
  runStats.modeTimes[Game.player.mode] = (runStats.modeTimes[Game.player.mode]||0) + 1;
  if (Game.player.mode === 'cube') runStats.cubeOnlyScore += Game.speed * 0.1 * slow;
  if (input.crouchHeld) runStats.crouchedDistance += Game.speed * slow;
  else runStats.noCrouchDistance += Game.speed * slow;
  // Power durations
  for (const k of Object.keys(PowerUps.active)){
    runStats.powerDurations[k] = (runStats.powerDurations[k]||0) + 1;
  }

  if (PowerUps.isActive('jetpack')){
    Game.player.y = Math.max(Game.player.ceilingY + 20, Math.min(Game.h*0.4, Game.player.y - 6));
    Game.player.vy = 0;
  }

  const ss = Game.speed * slow;
  if (Game.runMode === 'endless') ChunkGen.tick(ss);
  if (Game.runMode === 'level' && LevelPlayer.active){
    const result = LevelPlayer.checkEnd(Game.player.x, Game.scroll);
    if (result){ endLevel(result); return; }
  }
  Portals.tick(ss, Game.player, runtimeCb);
  Pads.tick(ss, Game.player, runtimeCb);
  Orbs.tick(ss, Game.player, input, runtimeCb);
  const magnetActive = PowerUps.isActive('magnet');
  Coins.tick(ss, Game.player, magnetActive ? { radius:150 + b.magnetRadius } : null, runtimeCb);
  PowerUps.tick(ss, Game.player, runtimeCb, { magnet: b.magnetDur, slowmo: b.slowDur, shield: b.shieldDur/60 });
  Obstacles.tick(ss, Game.player, {
    die: (o) => { Audio.sfx('death'); Audio.duck(1); Game.doShake(12, 8); Game.doHitstop(80); haptic(100); onPlayerDeath(o.type); },
    shield: () => { Audio.sfx('shieldBreak'); Game.doShake(4, 5); Achievements.check('shieldSurvive'); }
  });

  // Special level tick after obstacle tick (Special replaces or augments)
  if (useSpecial){
    const onGround = Game.player.gravityDir > 0
      ? (Game.player.y + Game.player.h >= Game.player.groundY - 0.5)
      : (Game.player.y <= Game.player.ceilingY + 0.5);
    const inputs = {
      actionPressed: pressedThisFrame, actionHeld: input.actionHeld,
      crouchHeld: input.crouchHeld, jumping: !onGround,
      leftPressed: leftPressedFrame, rightPressed: rightPressedFrame,
      upPressed: upPressedFrame, downPressed: downPressedFrame
    };
    if (Special.active === 'flappy') Special.tickFlappy(Game.player, ss, onPlayerDeath);
    else if (Special.active === 'tunnel') Special.tickTunnel(Game.player, ss, onPlayerDeath, inputs);
    else if (Special.active === 'jetpack') Special.tickJetpack(Game.player, ss, onPlayerDeath);
    else if (Special.active === 'pacman') Special.tickPacman(Game.player, ss, onPlayerDeath);
    else if (Special.active === 'crossy') Special.tickCrossy(Game.player, ss, onPlayerDeath);
    else if (Special.active === 'tron') Special.tickTron(Game.player, ss, onPlayerDeath, inputs);
    else if (Special.active === 'boss') Special.tickBoss(Game.player, ss, onPlayerDeath);
  }

  Particles.tick();
  pressedThisFrame = false;
  leftPressedFrame = rightPressedFrame = upPressedFrame = downPressedFrame = false;
}

function render(){
  const ctx = Game.ctx;
  ctx.clearRect(0,0, Game.w, Game.h);
  // Day/night cycle every 1500 score in endless
  if (Game.runMode === 'endless'){
    Game.dayNightT = Math.min(1, (Game.score % 3000) / 1500);
    if ((Game.score % 3000) > 1500) Game.dayNightT = 2 - Game.dayNightT;
    Parallax2.setNightAlpha(Game.dayNightT);
  } else {
    Parallax2.setNightAlpha(0);
  }
  // Screen shake
  let shakeX = 0, shakeY = 0;
  if (Game.shake.time > 0){
    shakeX = (Math.random()-0.5) * Game.shake.amp;
    shakeY = (Math.random()-0.5) * Game.shake.amp;
    Game.shake.time--;
    if (Game.shake.time <= 0) Game.shake.amp = 0;
  }
  ctx.save();
  ctx.translate(shakeX, shakeY);
  Parallax.draw(ctx, Game.w, Game.h, Game.beatPulse);
  if (Game.state === State.PLAYING || Game.state === State.PAUSE || Game.state === State.DEAD){
    ctx.strokeStyle = 'rgba(0,240,255,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, Game.h*0.82);
    ctx.lineTo(Game.w, Game.h*0.82);
    ctx.stroke();
    Obstacles.draw(ctx);
    Portals.draw(ctx);
    Pads.draw(ctx);
    Coins.draw(ctx);
    PowerUps.draw(ctx);
    Orbs.draw(ctx);
    // Special level overlays
    if (Special.active === 'flappy') Special.drawFlappy(ctx);
    else if (Special.active === 'tunnel') Special.drawTunnel(ctx);
    else if (Special.active === 'jetpack') Special.drawJetpack(ctx);
    else if (Special.active === 'pacman') Special.drawPacman(ctx);
    else if (Special.active === 'crossy') Special.drawCrossy(ctx);
    else if (Special.active === 'tron') Special.drawTron(ctx);
    else if (Special.active === 'boss') Special.drawBoss(ctx);
    if (Game.player) Game.player.draw(ctx);
    Particles.draw(ctx);
    PowerUps.drawHud(ctx, Game.w);
    drawHud();
  }
  ctx.restore();
  if (Game.options.showFps){
    fpsCount++;
    const now = performance.now();
    if (now - fpsLastT > 1000){ fpsValue = fpsCount; fpsCount = 0; fpsLastT = now; }
    ctx.fillStyle = '#0f0'; ctx.font = '600 14px Space Mono';
    ctx.fillText(`${fpsValue} FPS`, 8, Game.h - 8);
  }
  if (Game.options.showHitboxes && Game.player){
    const hb = Game.player.hitbox();
    ctx.strokeStyle = 'lime'; ctx.lineWidth=1;
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
  }
}

let fpsCount = 0, fpsLastT = performance.now(), fpsValue = 0;

function drawHud(){
  // Level mode: show progress bar + attempt count + best%
  // Endless: just score/best/coins/DP
  const isLevel = Game.runMode === 'level' && LevelPlayer.active;
  const livePct = isLevel ? Math.min(100, Math.floor((Game.scroll / LevelPlayer.endX) * 100)) : 0;
  const attempts = Game._attempts || 0;
  const bestPct = Game._bestPct || 0;
  const levelName = isLevel ? (LevelPlayer.level?.name || '') : '';
  const progressHtml = isLevel ? `
    <div class="progress-row">
      <div class="progress-label">
        <span>${levelName}</span>
        <span class="muted-sm">ATTEMPT ${attempts + 1}${bestPct ? ` · BEST ${bestPct}%` : ''}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${livePct}%"></div>
        <div class="progress-pct">${livePct}%</div>
      </div>
    </div>` : '';
  UI.showHud(`
    ${progressHtml}
    <div class="hud-row">
      <div class="left">
        <div class="score">${UI.formatNumber(Game.score)}</div>
        <div class="best">BEST ${UI.formatNumber(Game.best)}</div>
      </div>
      <div class="right">
        <div class="coins">◎ ${Game.coins}${Coins.combo>2?` <span style="color:#fff;font-size:13px">×${Coins.combo}</span>`:''}</div>
        <div class="dp">◆ ${Game.dashPoints}</div>
      </div>
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
  onInput('action', () => { Audio.init(); pressedThisFrame = true; });
  onInput('left',  () => { leftPressedFrame = true; });
  onInput('right', () => { rightPressedFrame = true; });
  onInput('keydown', ({code}) => {
    Audio.init();
    if (code === 'ArrowUp' || code === 'KeyW') upPressedFrame = true;
    if (code === 'ArrowDown' || code === 'KeyS') downPressedFrame = true;
  });
  onInput('mute', () => { Audio.setEnabled(!Audio.enabled); UI.toast(Audio.enabled?'SOUND ON':'SOUND OFF','#00f0ff'); });
  onInput('pause', () => {
    if (Game.state === State.PLAYING){
      Game.setState(State.PAUSE);
      const isLevel = Game.runMode === 'level' && LevelPlayer.active;
      const mapBtn = isLevel
        ? `<button class="btn" id="btn-map">🗺️ WORLD MAP</button>`
        : '';
      UI.showScreen('pause', `<h1>PAUSED</h1>
        <p class="muted">${isLevel?`${LevelPlayer.level?.name||''} · Attempt ${(Game._attempts||0)+1}${Game._bestPct?` · Best ${Game._bestPct}%`:''}`:''}</p>
        <div class="row">
          <button class="btn glow-strong" id="btn-resume">▶ RESUME</button>
          <button class="btn alt" id="btn-restart">↻ RESTART</button>
          <button class="btn" id="btn-practice">${Practice.enabled?'EXIT PRACTICE':'PRACTICE MODE'}</button>
          ${mapBtn}
          <button class="btn danger" id="btn-quit">QUIT</button>
        </div>
        <p class="muted">P toggle practice · C checkpoint · X remove last</p>`);
      document.getElementById('btn-resume').onclick = () => { UI.clear(); Game.setState(State.PLAYING); };
      document.getElementById('btn-restart').onclick = () => {
        if (isLevel) startRun({ mode:'level', levelId: LevelPlayer.level.id, _keepAttempts:true });
        else startRun({ mode:'endless' });
      };
      document.getElementById('btn-practice').onclick = () => { Practice.toggle(); UI.clear(); Game.setState(State.PLAYING); UI.toast(Practice.enabled?'PRACTICE ON':'PRACTICE OFF','#00f0ff'); };
      if (isLevel) document.getElementById('btn-map').onclick = () => WorldMap.open(
        (l) => startRun({ mode:'level', levelId: l.id }),
        (l) => startRun({ mode:'level', levelId: l.id, practice:true }),
        showTitle
      );
      document.getElementById('btn-quit').onclick = () => { Practice.disable(); showTitle(); };
    }
    else if (Game.state === State.PAUSE){ UI.clear(); Game.setState(State.PLAYING); }
  });
  onInput('practice', () => { if (Game.state===State.PLAYING){ Practice.toggle(); UI.toast(Practice.enabled?'PRACTICE ON':'PRACTICE OFF','#00f0ff'); } });
  onInput('checkpoint', () => { if (Practice.enabled){ Practice.add(); UI.toast('Checkpoint set','#39ff14'); } });
  onInput('unCheckpoint', () => { if (Practice.enabled){ Practice.removeLast(); UI.toast('Checkpoint removed','#ff3344'); } });
  onInput('restart', () => { if (Game.state === State.PLAYING || Game.state === State.DEAD) startRun({ mode:'endless' }); });
  onInput('keydown', ({code}) => {
    if (Game.state === State.TITLE || Game.state === State.MODE_SELECT || Game.state === State.OPTIONS) konamiCheck(code, code.startsWith('Key') ? code.slice(3) : '');
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
  Stats.load();
  Achievements.load();
  Missions.load();
  Daily.load();
  Economy.load();
  Levels.load();
  Tutorial.load();
  Shop.syncAchievementSkins();
  // Sync Economy currency into Game for HUD compatibility
  Game.totalCoins = Economy.coins;
  Game.dashPoints = Economy.dp;
  // Firebase cross-device sync — if user was signed in last session,
  // this auto-pulls cloud save and refreshes the title screen.
  FirebaseSync.onChange = () => { if (Game.state === State.TITLE) showTitle(); };
  FirebaseSync.init();
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
    if (Game.player.y > Game.h + 200 || Game.player.y < -200) endRun('outOfBounds');
    if (modeChangeCooldown > 0) modeChangeCooldown--;
  }
}, 16);
