// First-run + replayable tutorial briefings — with animated arrow overlays
// pointing at obstacles/portals/orbs when the player first encounters them.
import { Storage } from './storage.js';
import { UI } from './ui.js';

const MODE_TIPS = {
  cube:'Tap to jump · Hold for higher jump · ↓ to crouch under flying obstacles',
  ship:'Hold to thrust UP · Release to fall · Navigate through gaps in the laser corridors',
  ball:'Tap to instantly FLIP gravity · Avoid spikes on both surfaces',
  spider:'Tap to teleport to the opposite surface in an instant',
  wave:'Hold to angle 45° UP · Release to angle 45° DOWN · Thread through the spike tunnel'
};

const ARROW_TIPS = {
  firstCactus:'TAP to JUMP over the cactus!',
  firstPortal:'Run THROUGH the portal — it changes your mode!',
  firstPad:'Step on the PAD — it catapults you up to a platform!',
  firstOrb:'TAP when you overlap the orb mid-air for a boost!',
  firstCoin:'Collect coins to spend in the shop!'
};

export const Tutorial = {
  seenModes: new Set(),
  enabled: true,
  activeOverlay: null,

  load(){
    this.enabled = !Storage.get('skipTutorial', false);
    this.seenModes = new Set(Storage.get('seenModes', []));
  },
  save(){ Storage.set('seenModes', [...this.seenModes]); },
  reset(){
    this.seenModes = new Set();
    Storage.set('seenModes', []);
    this.dismiss();
  },
  setSkip(v){ Storage.set('skipTutorial', v); this.enabled = !v; },

  briefMode(mode){
    if (!this.enabled) return;
    if (this.seenModes.has(mode)) return;
    this.seenModes.add(mode); this.save();
    UI.toast(`▶ ${mode.toUpperCase()}: ${MODE_TIPS[mode]||''}`, '#00f0ff');
  },

  briefTooltip(key, text){
    if (!this.enabled) return;
    if (this.seenModes.has(key)) return;
    this.seenModes.add(key); this.save();
    UI.toast(text, '#ffe600');
  },

  // ─── ARROW OVERLAY ───
  // Shows a pulsing arrow pointing to a screen-space (x,y) with caption.
  // Auto-dismisses after `ttl` ms, or on next showArrow call.
  // The position is screen-space (canvas px), we use the canvas's bounding rect.
  showArrow(key, worldX, worldY, caption, ttl = 3500){
    if (!this.enabled) return;
    if (this.seenModes.has(key)) return;
    this.seenModes.add(key); this.save();
    this.dismiss();
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // worldX/Y are canvas-coord pixels; map to screen
    const sx = rect.left + (worldX / canvas.width) * rect.width;
    const sy = rect.top + (worldY / canvas.height) * rect.height;
    const layer = document.getElementById('ui-layer');
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-arrow';
    overlay.innerHTML = `
      <div class="tut-arrow-wrap">
        <div class="tut-arrow"></div>
        <div class="tut-caption">${caption}</div>
      </div>
    `;
    overlay.style.left = sx + 'px';
    overlay.style.top  = (sy - 80) + 'px';
    layer.appendChild(overlay);
    this.activeOverlay = overlay;
    setTimeout(() => {
      if (this.activeOverlay === overlay){
        overlay.classList.add('fade-out');
        setTimeout(() => { try { overlay.remove(); } catch(_){} this.activeOverlay = null; }, 400);
      }
    }, ttl);
  },

  dismiss(){
    if (this.activeOverlay){
      try { this.activeOverlay.remove(); } catch(_){}
      this.activeOverlay = null;
    }
  },

  // Called every frame from main tick — checks if there's an obstacle/portal/etc
  // in the visible area that should trigger a first-encounter arrow.
  tick(game, obstacles, portals, orbs, pads, coins){
    if (!this.enabled) return;
    if (game.state !== 'PLAYING') return;
    const player = game.player;
    if (!player) return;
    const w = game.w, h = game.h;
    // First cactus / spike on screen and within 350px ahead of player
    if (!this.seenModes.has('firstCactus')){
      const o = obstacles.list.find(o => (o.type === 'shortCactus' || o.type === 'tallCactus' || o.type === 'cactusCluster' || o.type === 'spike') &&
        o.x < player.x + 400 && o.x + o.w > player.x + 100);
      if (o){
        this.showArrow('firstCactus', o.x + o.w/2, o.y - 10, ARROW_TIPS.firstCactus);
      }
    }
    // First portal on screen
    if (!this.seenModes.has('firstPortal')){
      const p = portals.list.find(p => p.x < w + 100 && p.x + p.w > 0);
      if (p){
        this.showArrow('firstPortal', p.x + p.w/2, (p.y!=null?p.y:h*0.5) - 20, ARROW_TIPS.firstPortal);
      }
    }
    // First pad
    if (!this.seenModes.has('firstPad')){
      const pad = pads.list.find(p => p.x < w + 100 && p.x + p.w > 0);
      if (pad){
        this.showArrow('firstPad', pad.x + pad.w/2, pad.y - 30, ARROW_TIPS.firstPad);
      }
    }
    // First orb
    if (!this.seenModes.has('firstOrb')){
      const o = orbs.list.find(o => o.x < w + 100 && o.x + o.r > 0);
      if (o){
        this.showArrow('firstOrb', o.x, o.y - 30, ARROW_TIPS.firstOrb);
      }
    }
  }
};
