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
    const chunks = Math.floor(len / 700);
    for (let i=0;i<chunks;i++){
      const d = (i < chunks*0.3) ? 0 : (i < chunks*0.7 ? 1 : 2);
      this._placeChunk(x, g, allowed, d, level);
      x += 700 + Math.random()*180;
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

    // Decide layout per allowed
    if (cact.length){
      Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+200, {groundY:g});
      if (d >= 1) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+380, {groundY:g});
      if (d >= 2) Obstacles.spawn(cact[Math.floor(Math.random()*cact.length)], x+520, {groundY:g});
    } else if (lazr.length){
      Obstacles.spawn('laser', x+200, {groundY:g, cy: g - 120 - Math.random()*200});
      if (d>=1) Obstacles.spawn('laser', x+420, {groundY:g, cy: g - 200 - Math.random()*200});
    } else if (spk.length){
      Obstacles.spawn(spk[0], x+200, {groundY:g});
      Obstacles.spawn(spk[0], x+340, {groundY:g});
      if (d>=2) Obstacles.spawn(spk[0], x+480, {groundY:g});
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
