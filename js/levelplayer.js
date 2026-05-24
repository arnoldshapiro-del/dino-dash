// Discrete level runner — distinct from endless mode. Has a clear END point,
// tracks deaths within attempt, computes star count.
import { Obstacles } from './obstacles.js';
import { Coins } from './coins.js';
import { Portals } from './portals.js';
import { Orbs, Pads } from './orbs.js';
import { PowerUps } from './powerups.js';
import { Particles } from './particles.js';
import { Special } from './speciallevels.js';

export const LevelPlayer = {
  active: false,
  level: null,
  startT: 0,
  deaths: 0,
  coinsAtStart: 0,
  coinsAvailable: 0,
  coinsCollected: 0,
  cursor: 0,        // x to place next chunk
  spawnAheadPx: 2400,
  endX: Infinity,
  ended: false,
  practice: false,

  init(level, player, groundY, practice=false){
    this.active = true;
    this.level = level;
    this.deaths = 0;
    this.coinsCollected = 0;
    this.cursor = player.x + 1000;
    this.startT = performance.now();
    this.ended = false;
    this.practice = practice;
    // End point: roughly speed * length frames
    const pixelsPerSec = 60 * 6 * level.speed; // approx baseline
    this.endX = this.cursor + pixelsPerSec * level.length;
    this.groundY = groundY;
    Special.reset();
    // Special-level dispatch
    if (level.flappy){ Special.initFlappy(player, groundY, this.endX); return; }
    if (level.lanes){ Special.initTunnel(player, groundY, this.endX); return; }
    if (level.pacman){ Special.initPacman(player, groundY, this.endX); return; }
    if (level.crossy){ Special.initCrossy(player, groundY, this.endX); return; }
    if (level.tron){ Special.initTron(player, groundY, this.endX); return; }
    if (level.boss){ Special.initBoss(player, groundY, this.endX); return; }
    if (level.id === 'L11'){ Special.initJetpack(player, groundY, this.endX); return; }
    if (level.id === 'L10'){
      // Helix tower: vertical falling ball — adapt by spawning many short platforms with gaps
      let yy = 0;
      while (yy < this.endX){
        Obstacles.spawn('platform', this.cursor + yy*0.5, { groundY, cy: groundY - 80 - Math.random()*150 });
        if (Math.random() < 0.4) Obstacles.spawn('spike', this.cursor + yy*0.5 + 30, { groundY });
        yy += 200;
      }
      Coins.spawnLine(this.cursor + 200, groundY - 70, 12);
      return;
    }
    // L9 PIXEL PLATFORM now uses the auto platform-path builder (cube-only,
    // world>=2), so we just fall through to _build() which calls it.
    this._build(level, groundY);
  },

  _build(level, g){
    // Use the obstacle pool restricted to level.obstacles
    const allowed = new Set(level.obstacles);
    let x = this.cursor;
    const len = (this.endX - this.cursor);

    // ────────────────────────────────────────────────────────────────────
    // NEW: PLATFORM-PATH MODE for cube-only levels (W2+).
    // Generates a connected ribbon of floating platforms across the level
    // with hazards (cacti, spikes, sawblades) on the GROUND below. Player
    // hops from platform to platform — falling onto the hazard floor = death.
    // Pads + orbs sprinkled in to keep momentum.
    // ────────────────────────────────────────────────────────────────────
    const isCubeOnly = level.modes.length === 1 && level.modes[0] === 'cube' && level.world >= 2;
    if (isCubeOnly){
      this._buildPlatformPath(level, g, allowed);
      this.coinsAvailable = Coins.list.length;
      return;
    }

    // Wider chunks → less density. Tutorial levels (world 1) get extra spacing.
    const chunkWidth = level.world === 1 ? 1200 : 800;
    const chunks = Math.floor(len / chunkWidth);
    for (let i=0;i<chunks;i++){
      let d;
      if (level.world === 1) d = 0;
      else d = (i < chunks*0.4) ? 0 : (i < chunks*0.8 ? 1 : 2);
      this._placeChunk(x, g, allowed, d, level);
      x += chunkWidth + Math.random()*180;
    }
    this.coinsAvailable = Coins.list.length;
  },

  // ─────────────────────────────────────────────────────────────────────
  // Build a connected path of floating platforms across the level.
  // Constraints:
  //   - Player's jump arc covers ~200px horizontal at apex 132px
  //   - So next platform must be ≤220px horizontal away, ≤110px above
  //   - Spawn cacti/spikes on the ground in the gaps between platforms
  //   - First platform near ground so player can climb on
  //   - Last platform leads to the finish
  // ─────────────────────────────────────────────────────────────────────
  _buildPlatformPath(level, g, allowed){
    const start = this.cursor;
    const end = this.endX - 300;
    // First few "starter" platforms at low height so player can step on
    // them without jumping. Each is close to the previous so the path
    // teaches the player the rhythm.
    Obstacles.spawn('platform', start + 300, { groundY: g, cy: g - 30 });
    Obstacles.spawn('platform', start + 450, { groundY: g, cy: g - 60 });
    Coins.spawnLine(start + 320, g - 90, 6, 26, 'yellow');
    let x = start + 620;
    let py = g - 80;
    const minY = g - 200;
    const maxY = g - 60;

    while (x < end){
      // Place a platform (the path tile)
      Obstacles.spawn('platform', x, { groundY: g, cy: py });
      // Coin floating above each platform
      Coins.spawn({ kind: Math.random() < 0.2 ? 'blue' : 'yellow', x: x + 55, y: py - 32 });

      // Gap to next platform: 90-160px horizontal (tap-jump territory).
      // With cube physics, scroll-during-tap-jump ≈ 130-200px so player
      // naturally arcs onto the next platform with reasonable timing.
      const gap = 90 + Math.random() * 70;
      const nextX = x + 110 + gap;       // 110 = platform width

      // Next platform height: vary so the path zig-zags up and down.
      // Reachable jump: ~120px UP (under max hold-jump of 132), ~80px DOWN
      // (so the recovery jump from a lower platform doesn't undershoot).
      let nextY = py + (Math.random()*180 - 100);
      // Clamp to overall range
      nextY = Math.max(minY, Math.min(maxY, nextY));
      // Cap the height delta so each hop is reachable
      if (py - nextY > 90) nextY = py - 90;       // going UP no more than 90
      if (nextY - py > 100) nextY = py + 100;     // going DOWN no more than 100

      // In the GAP between platforms (on the ground), place a hazard so
      // falling = death. Type depends on what the level allows.
      const hazardX = x + 110 + gap*0.3;
      if (allowed.has('spike')) Obstacles.spawn('spike', hazardX, { groundY: g });
      else if (allowed.has('shortCactus')) Obstacles.spawn('shortCactus', hazardX, { groundY: g });
      else if (allowed.has('tallCactus')) Obstacles.spawn('tallCactus', hazardX, { groundY: g });
      else if (allowed.has('sawblade')) Obstacles.spawn('sawblade', hazardX, { groundY: g });

      // Occasionally: slope back down to ground for variety + recovery
      if (Math.random() < 0.12 && allowed.has('slopeDown')){
        Obstacles.spawn('slopeDown', nextX, { groundY: g, height: 60 });
      }

      // Occasionally: a pad on the ground between platforms (catapult upward)
      if (Math.random() < 0.18){
        Pads.spawn({ kind: 'yellow', x: hazardX + 50, y: g - 8 });
      }
      // Occasionally: a jump orb in the air near the platform
      if (Math.random() < 0.15){
        const ok = ['yellow','pink','green'];
        Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)], x: x + 70, y: py - 60 });
      }
      x = nextX;
      py = nextY;
    }
    // Long landing platform at the end so finish-line is forgiving
    Obstacles.spawn('platform', x, { groundY: g, cy: py });
    Obstacles.spawn('platform', x + 120, { groundY: g, cy: py });
    Coins.spawn({ kind: 'gold', x: x + 60, y: py - 40 });
  },

  _placeChunk(x, g, allowed, d, level){
    const pickFrom = (...arr) => arr.filter(o => allowed.has(o));
    const cact = pickFrom('tallCactus','shortCactus','cactusCluster');
    const ptero = pickFrom('pterodactyl');
    const spk = pickFrom('spike','pulsingSpike');
    const lazr = pickFrom('laser');
    const haz = pickFrom('sawblade','rock','crusher','electricFence','firepit');
    const slope = pickFrom('slopeUp','slopeDown','block');
    // GD-style slope/block chunks (if allowed in this level)
    if (slope.length && Math.random() < 0.5){
      const variant = Math.floor(Math.random() * 3);
      if (variant === 0 && allowed.has('slopeUp')){
        Obstacles.spawn('slopeUp', x+200, {groundY:g, height:70});
        if (allowed.has('block')) Obstacles.spawn('block', x+400, {groundY:g, cy:g-70, size:40});
        if (allowed.has('slopeDown')) Obstacles.spawn('slopeDown', x+500, {groundY:g, height:70});
      } else if (variant === 1 && allowed.has('block')){
        // Stair-step
        Obstacles.spawn('block', x+250, {groundY:g, cy:g-40, size:40});
        Obstacles.spawn('block', x+300, {groundY:g, cy:g-80, size:40});
        Obstacles.spawn('block', x+350, {groundY:g, cy:g-120, size:40});
      } else if (variant === 2 && allowed.has('slopeUp')){
        Obstacles.spawn('slopeUp', x+200, {groundY:g, height:80});
        if (cact.length) Obstacles.spawn(cact[0], x+450, {groundY:g});
      }
      return;
    }

    // W1 = tutorial: ONE small obstacle per chunk, generous coin trail.
    // Chunks are spawned ~1100px apart (set in _build) so this gives
    // ~1100px between obstacles — well over a full jump arc.
    if (level.world === 1){
      if (cact.length){
        const easy = cact.includes('shortCactus') ? 'shortCactus' : cact[0];
        Obstacles.spawn(easy, x+500, {groundY:g});
      } else if (lazr.length){
        Obstacles.spawn('laser', x+500, {groundY:g, cy: g - 180});
      } else if (spk.length){
        Obstacles.spawn(spk[0], x+500, {groundY:g});
      }
      // Long coin trail straight through
      Coins.spawnLine(x+50, g-60, 14, 30, 'yellow');
      return;
    }
    // Decide layout per allowed — spacing 250+ apart so a player tap-jump
    // can complete its arc between obstacles.
    if (cact.length){
      Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+250, {groundY:g});
      if (d >= 1) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+500, {groundY:g});
      if (d >= 2) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+730, {groundY:g});
    } else if (lazr.length){
      Obstacles.spawn('laser', x+250, {groundY:g, cy: g - 140 - Math.random()*160});
      if (d>=1) Obstacles.spawn('laser', x+520, {groundY:g, cy: g - 220 - Math.random()*160});
    } else if (spk.length){
      // For ball/spider modes: alternate floor and ceiling spikes so the player
      // MUST use gravity flip / teleport — can't just hug one surface.
      const ceilingY = g * 0.098;
      if (level.modes.includes('ball') || level.modes.includes('spider')){
        Obstacles.spawn(spk[0], x+250, {groundY:g});
        Obstacles.spawn('spikeCeiling', x+440, {groundY:g, ceilingY});
        if (d>=1) Obstacles.spawn(spk[0], x+630, {groundY:g});
        if (d>=2) Obstacles.spawn('spikeCeiling', x+820, {groundY:g, ceilingY});
      } else {
        Obstacles.spawn(spk[0], x+250, {groundY:g});
        if (d>=1) Obstacles.spawn(spk[0], x+440, {groundY:g});
        if (d>=2) Obstacles.spawn(spk[0], x+630, {groundY:g});
      }
    }
    if (haz.length && d >= 1 && Math.random()<0.5){
      Obstacles.spawn(haz[Math.floor(Math.random()*haz.length)], x+560, {groundY:g});
    }
    if (ptero.length && d >= 1 && Math.random()<0.5){
      Obstacles.spawn('pterodactyl', x+360, {groundY:g, height:['low','mid','high'][Math.floor(Math.random()*3)]});
    }
    // Coins along
    Coins.spawnLine(x+150, g - 60 - Math.random()*40, 4 + d*2);
    if (Math.random() < 0.4) Coins.spawn({ kind:'blue', x: x+440, y: g - 150 });
    if (Math.random() < 0.08) Coins.spawn({ kind:'gold', x: x+330, y: g - 220 });
  },

  // Called on death; level uses its own death policy
  onDeath(){
    this.deaths++;
    return this.practice; // in practice, just respawn at checkpoint
  },

  onCoin(){
    this.coinsCollected++;
  },

  // Called from main tick; checks for end condition
  checkEnd(playerX, scrollAbsX){
    if (this.ended) return null;
    // End condition: world has scrolled past endX equivalent (we use Game.scroll)
    if (scrollAbsX >= this.endX){
      this.ended = true;
      const noDeath = this.deaths === 0;
      const allCoins = this.coinsAvailable > 0 && this.coinsCollected >= this.coinsAvailable;
      let stars = 1;
      if (this.deaths <= 2) stars = 2;
      if (noDeath && allCoins) stars = 3;
      return { stars, deaths: this.deaths, coins: this.coinsCollected, coinsAvailable: this.coinsAvailable };
    }
    return null;
  },

  reset(){
    this.active = false; this.level = null; this.deaths = 0;
    this.coinsCollected = 0; this.ended = false; this.cursor = 0; this.endX = Infinity;
  }
};
