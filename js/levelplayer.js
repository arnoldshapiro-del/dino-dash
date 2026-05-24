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
    if (level.id === 'L9'){
      // Pixel platformer — extra platforms
      let xx = this.cursor;
      while (xx < this.endX){
        Obstacles.spawn('platform', xx, { groundY, cy: groundY - 80 - Math.random()*60 });
        if (Math.random() < 0.5) Obstacles.spawn('shortCactus', xx + 100, { groundY });
        if (Math.random() < 0.3) Obstacles.spawn('pterodactyl', xx + 60, { groundY, height:'mid' });
        Coins.spawn({ kind:'yellow', x: xx + 40, y: groundY - 110 });
        xx += 280 + Math.random()*120;
      }
      return;
    }
    this._build(level, groundY);
  },

  _build(level, g){
    // Use the obstacle pool restricted to level.obstacles
    const allowed = new Set(level.obstacles);
    const useObs = (...types) => types.filter(t => allowed.has(t));
    let x = this.cursor;
    const len = (this.endX - this.cursor);
    // Wider chunks → less density. Tutorial levels (world 1) get extra spacing.
    const chunkWidth = level.world === 1 ? 950 : 800;
    const chunks = Math.floor(len / chunkWidth);
    for (let i=0;i<chunks;i++){
      // Difficulty ramp: world 1 stays at d=0 (gentle tutorial). World 2+ uses 0/1/2.
      let d;
      if (level.world === 1) d = 0;
      else d = (i < chunks*0.4) ? 0 : (i < chunks*0.8 ? 1 : 2);
      this._placeChunk(x, g, allowed, d, level);
      x += chunkWidth + Math.random()*180;
    }
    // Coin count
    this.coinsAvailable = Coins.list.length;
    // Place final "FINISH" marker via mode portal sentinel — handled by endX
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
