// 16 themed level definitions (5+5+5+1 boss)
// Each level: id, world (1-4), name, theme, modes, length (sec), speed,
// palette, obstaclesAllowed, unlockReq, build(ctx) that pre-fills entities,
// onTick (optional), starObjectives, rewards
import { Storage } from './storage.js';

const W1 = 1, W2 = 2, W3 = 3, W4 = 4;

export const LEVELS = [
  // ── WORLD 1: DAWN RIDERS ──
  { id:'L1',  world:W1, name:'GENESIS',       theme:'Pure Chrome Dino tribute', modes:['cube'],
    length:45, speed:0.8,
    palette:['#ffffff','#e6e6e6','#bbbbbb','#888888'],
    obstacles:['shortCactus','tallCactus'],
    unlockReq:null,
    starObjectives:['Complete','≤2 deaths','0 deaths + all coins'],
    rewards:{ dp:[50,100,200], firstClearCoins:500 } },

  { id:'L2',  world:W1, name:'FIRST FLIGHT',  theme:'Pure ship intro', modes:['ship'],
    length:60, speed:0.85,
    palette:['#88c8ff','#3477b8','#1a3a5c','#0a1a30'],
    obstacles:['laser','platform'],
    unlockReq:'L1' },
  { id:'L3',  world:W1, name:'SPIDER CRAWL',  theme:'Pure spider intro', modes:['spider'],
    length:70, speed:0.85,
    palette:['#1a0a3a','#3a1c66','#7a36cc','#b300ff'],
    obstacles:['spike'],
    unlockReq:'L2' },
  { id:'L4',  world:W1, name:'BOUNCING BALL', theme:'Pure ball intro', modes:['ball'],
    length:70, speed:0.85,
    palette:['#2a1408','#5a2c14','#cc6d2a','#ff8d3c'],
    obstacles:['shortCactus','spike'],
    unlockReq:'L3' },
  { id:'L5',  world:W1, name:'WAVE RIDER',    theme:'Pure wave intro', modes:['wave'],
    length:70, speed:0.9,
    palette:['#1a3a1a','#2c662c','#56cc56','#a0ff60'],
    obstacles:['laser'],
    unlockReq:'L4' },

  // ── WORLD 2: CROSSROADS ──
  { id:'L6',  world:W2, name:'GEOMETRIC BEAT',theme:'Platform hop over the hazard floor — pure GD', modes:['cube'],
    length:90, speed:1.2,
    palette:['#0a0420','#2d1b4e','#ff4d8f','#ff8d3c'],
    obstacles:['spike','shortCactus','tallCactus','sawblade','slopeDown'],
    unlockReq:'L5' },
  { id:'L7',  world:W2, name:'FLAPPY SKIES',  theme:'Flappy Bird (heavy gravity ship)', modes:['ship'],
    length:90, speed:1.0, flappy:true,
    palette:['#88c8ff','#aef0ff','#5dc8ff','#3aa8cc'],
    obstacles:['flappyPipe'],
    unlockReq:'L6' },
  { id:'L8',  world:W2, name:'TUNNEL SURFER', theme:'Subway Surfers 3-lane', modes:['cube'],
    length:120, speed:1.2, lanes:true,
    palette:['#1a1a2a','#3a3a5a','#5a5a7a','#7a7a9a'],
    obstacles:['shortCactus','tallCactus'],
    unlockReq:'L7' },
  { id:'L9',  world:W2, name:'PIXEL PLATFORM',theme:'Mario-inspired precise', modes:['cube'],
    length:120, speed:1.1, platforming:true,
    palette:['#5588cc','#88ccaa','#cc8855','#664422'],
    obstacles:['shortCactus','pterodactyl','platform'],
    unlockReq:'L8' },
  { id:'L10', world:W2, name:'HELIX TOWER',   theme:'Helix Jump vertical', modes:['ball'],
    length:90, speed:1.0, vertical:true,
    palette:['#ffd6e9','#c4a8e6','#a8d6e6','#e6d6a8'],
    obstacles:['spike'],
    unlockReq:'L9' },

  // ── WORLD 3: APOCALYPSE ──
  { id:'L11', world:W3, name:'JETPACK MAD',   theme:'Jetpack Joyride', modes:['ship'],
    length:120, speed:1.3,
    palette:['#220a0a','#4a1a1a','#ff3344','#ff6655'],
    obstacles:['laser','rock','missile'],
    unlockReq:'L10' },
  { id:'L12', world:W3, name:'PAC-MAZE',      theme:'Pac-Man maze', modes:['cube'],
    length:90, speed:1.0, pacman:true,
    palette:['#000000','#0033ff','#ffe600','#ffffff'],
    obstacles:['ghost','wall'],
    unlockReq:'L11' },
  { id:'L13', world:W3, name:'CROSSY PATH',   theme:'Crossy Road / Frogger', modes:['cube'],
    length:120, speed:1.0, crossy:true,
    palette:['#4caf50','#2196f3','#ffc107','#9c27b0'],
    obstacles:['car','log'],
    unlockReq:'L12' },
  { id:'L14', world:W3, name:'TRON CYCLE',    theme:'Snake / Tron', modes:['cube'],
    length:90, speed:1.2, tron:true,
    palette:['#000000','#001a1a','#00ffd5','#ff3344'],
    obstacles:['trail'],
    unlockReq:'L13' },
  { id:'L15', world:W3, name:'WAVE TUNNEL',   theme:'Wave hell at 4x', modes:['wave'],
    length:60, speed:4.0,
    palette:['#000000','#0a0a0a','#ffe600','#fff700'],
    obstacles:['laser'],
    unlockReq:'L14' },

  // ── WORLD 4: THE END ──
  { id:'L16', world:W4, name:'T-REX REX',     theme:'Boss battle (3 phases)', modes:['cube','ship','wave'],
    length:240, speed:1.0, boss:true,
    palette:['#1a0408','#3a0814','#ff1144','#ff4d28'],
    obstacles:['stomp','fire','spike','laser','tallCactus','pulsingSpike'],
    unlockReq:'L15' }
];

export const Levels = {
  all: LEVELS,
  byId(id){ return LEVELS.find(l=>l.id===id); },
  load(){
    const stored = Storage.get('levelProgress', {});
    this.progress = stored;
  },
  save(){ Storage.set('levelProgress', this.progress); },
  progress: {},
  stars(id){ return this.progress[id]?.stars || 0; },
  isUnlocked(id){
    const lvl = this.byId(id); if (!lvl) return false;
    if (!lvl.unlockReq) return true;
    return this.stars(lvl.unlockReq) >= 1;
  },
  recordStars(id, stars){
    const cur = this.stars(id);
    const isFirst = cur === 0 && stars > 0;
    this.progress[id] = {
      stars: Math.max(cur, stars),
      bestScore: Math.max(this.progress[id]?.bestScore || 0, 0),
      clears: (this.progress[id]?.clears || 0) + 1,
      firstClearAwarded: this.progress[id]?.firstClearAwarded || (stars > 0)
    };
    this.save();
    return { isFirst, prev: cur, now: this.progress[id].stars };
  },
  totalStars(){ return Object.values(this.progress).reduce((s,p)=> s+(p.stars||0), 0); },
  worldCompleted(world){
    return LEVELS.filter(l => l.world===world).every(l => this.stars(l.id) >= 1);
  }
};
