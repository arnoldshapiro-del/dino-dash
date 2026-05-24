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

    // Wave levels in W2+ → use spike tunnel (GD Blast Processing style)
    const isWaveOnly = level.modes.length === 1 && level.modes[0] === 'wave';
    if (isWaveOnly){
      this._buildWaveTunnel(level, g);
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
    // ALL platform-path levels are forgiving by default (per user playtest).
    // The path is the gameplay; the hazards are decoration not death-walls.
    // 60% of gaps are safe-fall with pads as recovery → very accessible.
    const forgiving = true;
    // First few "starter" platforms at low height so player can step on
    // them without jumping. Each is close to the previous so the path
    // teaches the player the rhythm. In forgiving mode, give EXTRA starter
    // platforms so they have time to get the rhythm.
    // Use the same wide platforms as the main path so starters feel continuous
    const starterW = forgiving ? 140 : 110;
    Obstacles.spawn('platform', start + 280, { groundY: g, cy: g - 30, size: starterW });
    Obstacles.spawn('platform', start + 410, { groundY: g, cy: g - 45, size: starterW });
    Obstacles.spawn('platform', start + 540, { groundY: g, cy: g - 60, size: starterW });
    if (forgiving){
      Obstacles.spawn('platform', start + 660, { groundY: g, cy: g - 70, size: starterW });
      Obstacles.spawn('platform', start + 780, { groundY: g, cy: g - 60, size: starterW });
    }
    Coins.spawnLine(start + 290, g - 100, 10, 26, 'yellow');
    let x = start + (forgiving ? 900 : 660);
    let py = g - (forgiving ? 60 : 80);
    const minY = g - (forgiving ? 160 : 200);
    const maxY = g - 60;
    // Wider platforms in forgiving mode = bigger landing target
    const platW = forgiving ? 140 : 110;
    // In forgiving mode, hazard density drops to 40% (60% of gaps are safe-fall)
    const hazardChance = forgiving ? 0.4 : 1.0;

    while (x < end){
      // Place a platform (the path tile) — wider in forgiving mode
      Obstacles.spawn('platform', x, { groundY: g, cy: py, size: platW });
      // Coin floating above each platform
      Coins.spawn({ kind: Math.random() < 0.2 ? 'blue' : 'yellow', x: x + platW/2, y: py - 32 });

      // Gap to next platform — wider gap in non-forgiving mode for challenge
      const gap = (forgiving ? 80 : 90) + Math.random() * (forgiving ? 50 : 70);
      const nextX = x + platW + gap;

      // Next platform height — gentler variance in forgiving mode
      const variance = forgiving ? 100 : 180;
      let nextY = py + (Math.random()*variance - variance/2);
      nextY = Math.max(minY, Math.min(maxY, nextY));
      const maxUp = forgiving ? 60 : 90;
      const maxDown = forgiving ? 70 : 100;
      if (py - nextY > maxUp) nextY = py - maxUp;
      if (nextY - py > maxDown) nextY = py + maxDown;

      // In the GAP between platforms, optionally place a hazard.
      // Forgiving mode: only 40% of gaps have hazards (the rest are safe
      // ground falls — player can recover by jumping up to next platform).
      const hazardX = x + platW + gap*0.3;
      if (Math.random() < hazardChance){
        if (allowed.has('spike')) Obstacles.spawn('spike', hazardX, { groundY: g });
        else if (allowed.has('shortCactus')) Obstacles.spawn('shortCactus', hazardX, { groundY: g });
        else if (allowed.has('tallCactus')) Obstacles.spawn('tallCactus', hazardX, { groundY: g });
        else if (allowed.has('sawblade')) Obstacles.spawn('sawblade', hazardX, { groundY: g });
      } else if (forgiving){
        // No hazard → put a YELLOW PAD on the ground as a safety net so
        // falling here actually catapults you BACK up to the platforms.
        Pads.spawn({ kind: 'yellow', x: hazardX, y: g - 8 });
      }

      // Occasionally: slope back down to ground for variety + recovery
      if (Math.random() < 0.12 && allowed.has('slopeDown')){
        Obstacles.spawn('slopeDown', nextX, { groundY: g, height: 60 });
      }

      // Pads: in forgiving mode, MORE pads to help recovery
      if (Math.random() < (forgiving ? 0.3 : 0.18)){
        Pads.spawn({ kind: 'yellow', x: hazardX + 50, y: g - 8 });
      }
      // Jump orbs in the air near platforms (extra mid-air boost option)
      if (Math.random() < (forgiving ? 0.22 : 0.15)){
        const ok = ['yellow','pink','green'];
        Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)], x: x + 70, y: py - 60 });
      }
      x = nextX;
      py = nextY;
    }
    // Long landing platform at the end so finish-line is forgiving
    Obstacles.spawn('platform', x, { groundY: g, cy: py, size: platW });
    Obstacles.spawn('platform', x + platW + 10, { groundY: g, cy: py, size: platW });
    Obstacles.spawn('platform', x + 2*platW + 20, { groundY: g, cy: py, size: platW });
    Coins.spawn({ kind: 'gold', x: x + platW/2, y: py - 40 });

    // ── DECORATIVE TOP-SIDE GENERATION ──
    // Hang occasional ceiling spike clusters in the upper half of the arena
    // so the level has visual variety in both top and bottom halves.
    // These are non-blocking (they don't kill the cube on the floor/platforms
    // below) — placed too high to reach with a normal jump.
    const ceilingY = g * 0.098;
    let cx = start + 600;
    while (cx < end){
      // Cluster of 2 ceiling spikes — decorative since they're up at
      // ceilingY, well above platform height (max g-160)
      Obstacles.spawn('spikeCeiling', cx, { groundY: g, ceilingY });
      Obstacles.spawn('spikeCeiling', cx + 30, { groundY: g, ceilingY });
      cx += 700 + Math.random()*400;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // GD Blast Processing-style wave tunnel.
  // The safe path is a slow oscillating sine wave through the middle of
  // the arena. Spikes on the floor and ceiling form jagged "teeth" that
  // narrow the corridor. Player threads through at 45° sawtooth.
  // ─────────────────────────────────────────────────────────────────────
  _buildWaveTunnel(level, g){
    const ceilingY = g * 0.098;
    const start = this.cursor;
    const end = this.endX - 200;
    const centerY = (g + ceilingY) / 2;
    // VERY gentle wave tunnel: single spikes far apart, alternating sides,
    // so even a poor player has time to react and angle the wave correctly.
    const period = 1000;
    const amp = (g - ceilingY) * 0.18;

    let x = start + 300;
    let lastSide = null;
    while (x < end){
      const t = (x - start) / period * Math.PI * 2;
      const pathY = centerY + Math.sin(t) * amp;
      // Alternate sides — never two spikes on the same side in a row
      // (so the player always knows: hit spike on floor → go up,
      // hit spike on ceiling → go down)
      const onTop = lastSide === 'bottom' ? true
                   : lastSide === 'top' ? false
                   : (pathY > centerY);
      if (onTop){
        Obstacles.spawn('spikeCeiling', x, { groundY: g, ceilingY });
        lastSide = 'top';
      } else {
        Obstacles.spawn('spike', x, { groundY: g });
        lastSide = 'bottom';
      }
      // Coin along the safe-path
      Coins.spawn({ kind:'yellow', x: x + 50, y: pathY });
      x += 320 + Math.random()*80;                      // 320-400px between spikes (was 240-300)
    }
    // Gold finish coin
    Coins.spawn({ kind:'gold', x: end - 60, y: centerY });
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

    // W1 = tutorial: ONE small obstacle per chunk, BUT now with more
    // entertainment: floating orbs, ceiling-spike clusters (decorative),
    // varied coin patterns. Each chunk is its own little visual scene.
    if (level.world === 1){
      const ceilingY = g * 0.098;
      if (cact.length){
        const easy = cact.includes('shortCactus') ? 'shortCactus' : cact[0];
        Obstacles.spawn(easy, x+500, {groundY:g});
      } else if (lazr.length){
        Obstacles.spawn('laser', x+500, {groundY:g, cy: g - 180});
      } else if (spk.length){
        Obstacles.spawn(spk[0], x+500, {groundY:g});
      }
      // Varied coin pattern: 33% line, 33% arc over obstacle, 33% zigzag
      const pat = Math.floor(Math.random()*3);
      if (pat === 0)      Coins.spawnLine(x+50, g-60, 14, 30, 'yellow');
      else if (pat === 1) Coins.spawnArc(x+500, g-80, 60, 9, 'yellow');
      else                Coins.spawnZigzag(x+80, g-90, 12, 32, 25, 'yellow');
      // Decorative ceiling-spike cluster — high enough that a normal jump
      // never reaches it, but adds visual interest to the top half
      if (Math.random() < 0.7){
        const cx = x + 200 + Math.random()*400;
        Obstacles.spawn('spikeCeiling', cx, {groundY:g, ceilingY});
        Obstacles.spawn('spikeCeiling', cx + 30, {groundY:g, ceilingY});
      }
      // Floating jump-orb in the air — bonus bounce + collectible
      if (Math.random() < 0.5){
        const ok = ['yellow','pink','green'];
        Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)],
                     x: x + 700 + Math.random()*100,
                     y: g - 110 - Math.random()*40 });
      }
      // Top-row blue coin trail in the upper half for extra collectibles
      if (Math.random() < 0.4){
        Coins.spawnLine(x+150, g - 220, 5, 40, 'blue');
      }
      return;
    }
    // Decide layout per allowed — spacing 250+ apart so a player tap-jump
    // can complete its arc between obstacles.
    if (cact.length){
      Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+250, {groundY:g});
      if (d >= 1) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+500, {groundY:g});
      if (d >= 2) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+730, {groundY:g});
    } else if (lazr.length){
      // For ship/wave: alternate top + bottom lasers so player navigates
      // vertically (uses both upper and lower half of arena). Place each
      // laser closer to ceiling OR floor on alternating spawns.
      const ceilingY = g * 0.098;
      const topY = ceilingY + 60 + Math.random()*60;     // near ceiling
      const botY = g - 80 - Math.random()*60;            // near floor
      Obstacles.spawn('laser', x+250, {groundY:g, cy: topY});
      if (d>=1) Obstacles.spawn('laser', x+520, {groundY:g, cy: botY});
      if (d>=2) Obstacles.spawn('laser', x+760, {groundY:g, cy: (topY + botY)/2});
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

    // ── TOP-SIDE additions for every standard level ──
    // Decorative ceiling-spike cluster (2 spikes) high in the arena
    const ceilingY2 = g * 0.098;
    if (Math.random() < 0.55){
      const cx = x + 150 + Math.random()*500;
      Obstacles.spawn('spikeCeiling', cx, {groundY:g, ceilingY: ceilingY2});
      Obstacles.spawn('spikeCeiling', cx + 30, {groundY:g, ceilingY: ceilingY2});
    }
    // Floating mid-air jump orb (extra bounce option)
    if (Math.random() < 0.35){
      const ok = ['yellow','pink','green'];
      Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)],
                   x: x + 350 + Math.random()*200,
                   y: g - 130 - Math.random()*40 });
    }
    // High-altitude blue coin trail for the bold players who jump high
    if (Math.random() < 0.25){
      Coins.spawnLine(x+200, g - 200, 4, 36, 'blue');
    }
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
