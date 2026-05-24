// Procedural chunk generator — picks chunks from per-mode pools, spawns ahead, GCs behind
import { Obstacles } from './obstacles.js';
import { Coins } from './coins.js';
import { Portals } from './portals.js';
import { Orbs, Pads } from './orbs.js';
import { PowerUps } from './powerups.js';

// Each chunk is { width, build(x, groundY, ctx) }
// Difficulty: 0=easy, 1=medium, 2=hard

// Helper: cube chunks
const cubeChunks = [
  { w: 800, d:0, build(x,g){ Obstacles.spawn('tallCactus', x+200, {groundY:g}); Coins.spawnArc(x+200, g-90, 30, 5); } },
  { w: 900, d:0, build(x,g){ Obstacles.spawn('shortCactus', x+200, {groundY:g}); Obstacles.spawn('shortCactus', x+360, {groundY:g}); Coins.spawnLine(x+150, g-50, 8); } },
  { w: 850, d:0, build(x,g){ Obstacles.spawn('cactusCluster', x+250, {groundY:g}); Coins.spawnArc(x+250, g-80, 26, 6); } },
  { w: 950, d:1, build(x,g){ Obstacles.spawn('tallCactus', x+150, {groundY:g}); Obstacles.spawn('tallCactus', x+330, {groundY:g}); Obstacles.spawn('shortCactus', x+520, {groundY:g}); } },
  { w: 900, d:1, build(x,g){ Obstacles.spawn('pterodactyl', x+250, {groundY:g, height:'mid'}); Coins.spawnLine(x+150, g-100, 6); } },
  { w:1000, d:1, build(x,g){ Obstacles.spawn('pterodactyl', x+200, {groundY:g, height:'low'}); Obstacles.spawn('pterodactyl', x+540, {groundY:g, height:'high'}); Coins.spawnZigzag(x+120, g-120, 8); } },
  { w:1100, d:2, build(x,g){ Obstacles.spawn('cactusCluster', x+200, {groundY:g}); Obstacles.spawn('pterodactyl', x+540, {groundY:g, height:'low'}); Obstacles.spawn('cactusCluster', x+800, {groundY:g}); } },
  { w:1200, d:2, build(x,g){ Obstacles.spawn('tallCactus', x+150, {groundY:g}); Obstacles.spawn('tallCactus', x+260, {groundY:g}); Obstacles.spawn('tallCactus', x+370, {groundY:g}); Coins.spawnLine(x+150, g-90, 8); } },
  { w:1000, d:2, build(x,g){ Obstacles.spawn('spike', x+200, {groundY:g}); Obstacles.spawn('spike', x+260, {groundY:g}); Obstacles.spawn('spike', x+320, {groundY:g}); Obstacles.spawn('pulsingSpike', x+500, {groundY:g}); } },
  { w:1000, d:1, build(x,g){ Obstacles.spawn('sawblade', x+300, {groundY:g}); Coins.spawnArc(x+300, g-130, 60, 9); } },
  { w:1050, d:2, build(x,g){ Obstacles.spawn('electricFence', x+250, {groundY:g}); Coins.spawnLine(x+450, g-100, 6, 28, 'blue'); } },
  { w:1100, d:1, build(x,g){ Obstacles.spawn('firepit', x+250, {groundY:g}); Obstacles.spawn('firepit', x+400, {groundY:g}); } },
  { w:1200, d:2, build(x,g){ Obstacles.spawn('crusher', x+400, {groundY:g}); Obstacles.spawn('crusher', x+700, {groundY:g}); Coins.spawnLine(x+550, g-50, 4); } },
  { w:1300, d:2, build(x,g){ Obstacles.spawn('rock', x+300, {groundY:g}); Obstacles.spawn('rock', x+600, {groundY:g}); Obstacles.spawn('spike', x+450, {groundY:g}); } },
  { w:1100, d:1, build(x,g){ Obstacles.spawn('spikeWall', x+800, {groundY:g}); Coins.spawnLine(x+200, g-60, 12); } },
  // ── NEW GD-style chunks: slopes, blocks, slope-jump combos ──
  { w: 900, d:0, build(x,g){
    Obstacles.spawn('slopeUp',   x+200, {groundY:g, height:60});
    Obstacles.spawn('block',     x+380, {groundY:g, cy:g-60, size:40});
    Coins.spawnArc(x+280, g-90, 30, 6);
  }},
  { w:1000, d:1, build(x,g){
    Obstacles.spawn('slopeUp',   x+150, {groundY:g, height:80});
    Obstacles.spawn('block',     x+330, {groundY:g, cy:g-80, size:40});
    Obstacles.spawn('slopeDown', x+450, {groundY:g, height:80});
    Coins.spawnLine(x+200, g-110, 8);
  }},
  { w:1100, d:2, build(x,g){
    Obstacles.spawn('slopeUp',   x+150, {groundY:g, height:80});
    Obstacles.spawn('block',     x+330, {groundY:g, cy:g-80, size:40});
    Obstacles.spawn('tallCactus',x+450, {groundY:g});
    Obstacles.spawn('slopeDown', x+550, {groundY:g, height:80});
  }},
  { w:1000, d:1, build(x,g){
    // Stair-step blocks (GD-classic)
    Obstacles.spawn('block', x+200, {groundY:g, cy:g-40, size:40});
    Obstacles.spawn('block', x+250, {groundY:g, cy:g-80, size:40});
    Obstacles.spawn('block', x+300, {groundY:g, cy:g-120, size:40});
    Obstacles.spawn('tallCactus', x+450, {groundY:g});
  }},
];

// Ship chunks (corridors)
const shipChunks = [
  { w: 900, d:0, build(x,g){
    Obstacles.spawn('laser', x+300, {groundY:g, cy:g-280});
    Obstacles.spawn('platform', x+500, {groundY:g, cy:g-60});
    Coins.spawnLine(x+200, g-220, 6, 28, 'yellow');
  }},
  { w:1100, d:1, build(x,g){
    Obstacles.spawn('laser', x+250, {groundY:g, cy:g-100});
    Obstacles.spawn('laser', x+450, {groundY:g, cy:g-320});
    Obstacles.spawn('laser', x+650, {groundY:g, cy:g-150});
    Coins.spawnZigzag(x+150, g-200, 10, 30, 30, 'blue');
  }},
  { w:1000, d:2, build(x,g){
    for (let i=0;i<5;i++){
      Obstacles.spawn('laser', x+150 + i*180, {groundY:g, cy: g - 120 - (i%2)*180});
    }
    Coins.spawnLine(x+200, g-100, 6);
  }}
];

// Ball chunks — alternate floor and ceiling spikes to FORCE gravity flips
const ballChunks = [
  { w:1000, d:0, build(x,g){
    // Easy: spike on floor → flip to ceiling
    Obstacles.spawn('spike', x+250, {groundY:g});
    Coins.spawnLine(x+100, g-50, 5);
  }},
  { w:1100, d:1, build(x,g){
    // Floor spike then ceiling spike → flip, flip
    Obstacles.spawn('spike', x+200, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+500, {groundY:g, ceilingY: g * 0.098});
    Coins.spawnLine(x+250, g-80, 5);
  }},
  { w:1200, d:2, build(x,g){
    // Alternating floor/ceiling spikes — must time flips
    Obstacles.spawn('spike', x+180, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+360, {groundY:g, ceilingY: g * 0.098});
    Obstacles.spawn('spike', x+540, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+720, {groundY:g, ceilingY: g * 0.098});
  }}
];

// Spider chunks — same idea: ceiling spikes force teleports
const spiderChunks = [
  { w:1000, d:0, build(x,g){
    Obstacles.spawn('spike', x+250, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+500, {groundY:g, ceilingY: g * 0.098});
    Coins.spawnLine(x+100, g-30, 4);
  }},
  { w:1100, d:1, build(x,g){
    Obstacles.spawn('spike', x+200, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+400, {groundY:g, ceilingY: g * 0.098});
    Obstacles.spawn('spike', x+600, {groundY:g});
    Obstacles.spawn('spikeCeiling', x+800, {groundY:g, ceilingY: g * 0.098});
  }}
];

// Wave chunks
const waveChunks = [
  { w: 900, d:0, build(x,g){ Obstacles.spawn('laser', x+300, {groundY:g, cy:g-180}); Obstacles.spawn('laser', x+500, {groundY:g, cy:g-280}); } },
  { w:1100, d:1, build(x,g){
    for (let i=0;i<6;i++) Obstacles.spawn('laser', x+150 + i*150, {groundY:g, cy: g - 130 - (i%2)*120});
  }}
];

const POOLS = { cube: cubeChunks, ship: shipChunks, ball: ballChunks, spider: spiderChunks, wave: waveChunks };

export const ChunkGen = {
  cursor: 0,
  player: null,
  groundY: 0,
  spawnAheadPx: 2400,
  modeChunksRemaining: 0,
  currentMode: 'cube',
  scoreRef: () => 0,

  init(player, groundY, scoreRef){
    this.cursor = (player.x + 1400);
    this.player = player;
    this.groundY = groundY;
    this.scoreRef = scoreRef;
    this.currentMode = player.mode;
    this.modeChunksRemaining = 0;
  },

  tick(scrollSpeed){
    if (!this.player) return;
    // Pull cursor leftward as world scrolls
    this.cursor -= scrollSpeed;
    while (this.cursor < this.spawnAheadPx){
      this._emitOne();
    }
  },

  _emitOne(){
    // If in a non-cube mode, count down chunks until forced return-to-cube portal
    const isCube = this.currentMode === 'cube';
    if (!isCube && this.modeChunksRemaining <= 0){
      Portals.spawn({ type:'mode', value:'cube', x: this.cursor, y: this.groundY - 130 });
      this.cursor += 200;
      this.currentMode = 'cube';
      return;
    }
    // Choose chunk
    const pool = POOLS[this.currentMode] || cubeChunks;
    const score = this.scoreRef();
    const maxD = score < 3000 ? 0 : score < 10000 ? 1 : 2;
    const candidates = pool.filter(c => c.d <= maxD);
    const ch = candidates[Math.floor(Math.random()*candidates.length)] || pool[0];
    ch.build(this.cursor, this.groundY);
    this.cursor += ch.w;
    if (!isCube) this.modeChunksRemaining--;

    // Gap
    const gap = 150 + Math.random()*250;
    this.cursor += gap;

    // Maybe spawn a feature
    const r = Math.random();
    if (isCube){
      // 1 per ~800-1500 score worth of distance: power-up
      if (r < 0.15){
        const kinds = ['shield','magnet','slowmo','multi2x','jetpack','mystery'];
        PowerUps.spawn({ kind: kinds[Math.floor(Math.random()*kinds.length)], x: this.cursor, y: this.groundY - 130 });
        this.cursor += 200;
      }
      // 1 per 3000-5000 secret coin
      if (r > 0.97){
        Coins.spawn({ kind:'gold', x: this.cursor, y: this.groundY - 220 });
        this.cursor += 120;
      }
      // Mode portal — placed ON THE GROUND with WALLS above and below the
      // portal opening. Forces the player to go THROUGH the portal (GD-style).
      if (Math.random() < 0.20){
        const modes = ['ship','ball','spider','wave'];
        const m = modes[Math.floor(Math.random()*modes.length)];
        const portalX = this.cursor;
        const portalY = this.groundY - 100;
        Portals.spawn({ type:'mode', value:m, x: portalX, y: portalY });
        // Wall ABOVE the portal opening (from top of canvas down to portal top)
        Obstacles.spawn('portalWall', portalX + 5, { groundY: this.groundY, cy: 0, height: portalY });
        this.cursor += 240;
        this.currentMode = m;
        this.modeChunksRemaining = 2 + Math.floor(Math.random()*3);
      }
      // PAD → PLATFORM → ORB combo: pad on ground catapults you onto a small
      // platform 200px ahead (so it scrolls into position by the time you
      // reach apex), orb floats just above the platform.
      // - Yellow pad vy=-22 → apex 230px above ground
      // - Platform top at groundY-200 → player lands ON it near apex
      // - Orb at platY-30 → tap mid-air after landing for double-jump effect
      if (Math.random() < 0.45){
        const padKind = ['yellow','red'][Math.floor(Math.random()*2)];
        Pads.spawn({ kind: padKind, x: this.cursor, y: this.groundY - 8 });
        // Platform spawns 200px ahead — accounts for ~25 frames of scroll
        // during the jump rise at avg speed 8 px/frame.
        const platX = this.cursor + 200;
        const platY = this.groundY - 200;
        Obstacles.spawn('platform', platX, { groundY: this.groundY, cy: platY });
        // Orb just above platform top — reachable from the platform or apex
        const ok = ['yellow','red','blue','pink','green'];
        Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)], x: platX + 40, y: platY - 30 });
        // Coin trail leading TO the pad so player knows to step on it
        Coins.spawnLine(this.cursor - 100, this.groundY - 40, 5, 22, 'yellow');
        this.cursor += 380;
      }
      // Standalone low orb (reachable by normal jump, no pad)
      else if (Math.random() < 0.20){
        const ok = ['yellow','red','blue','pink','green'];
        Orbs.spawn({ kind: ok[Math.floor(Math.random()*ok.length)], x: this.cursor + 60, y: this.groundY - 100 - Math.random()*30 });
      }
      // Standalone pad (pure bounce, no orb)
      else if (Math.random() < 0.10){
        const pk = ['yellow','pink','red','blue'];
        Pads.spawn({ kind: pk[Math.floor(Math.random()*pk.length)], x: this.cursor, y: this.groundY - 8 });
      }
    }
  },

  clear(){ this.cursor = 0; this.player = null; this.modeChunksRemaining = 0; this.currentMode = 'cube'; }
};
