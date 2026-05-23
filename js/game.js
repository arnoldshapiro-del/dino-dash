// Central state machine + active-run state shared across modules
import { Storage } from './storage.js';
import { Player } from './player.js';

export const State = {
  SPLASH:'SPLASH', TITLE:'TITLE', MODE_SELECT:'MODE_SELECT',
  PLAYING:'PLAYING', PAUSE:'PAUSE', DEAD:'DEAD',
  SHOP:'SHOP', COLLECTION:'COLLECTION', OPTIONS:'OPTIONS', HOW:'HOW',
  WORLD_MAP:'WORLD_MAP', BRIEFING:'BRIEFING', LEVEL_COMPLETE:'LEVEL_COMPLETE', LEVEL_FAILED:'LEVEL_FAILED',
  STATS:'STATS'
};

export const Game = {
  state: State.SPLASH,
  prevState: null,
  canvas: null, ctx: null,
  w: 1280, h: 720,
  dpr: 1,

  // Run-time
  player: null,
  scroll: 0,
  speed: 6,
  baseSpeed: 6,
  maxSpeed: 14,
  score: 0,
  coins: 0,
  runStartT: 0,
  paused: false,

  // Persistent (loaded by storage)
  best: 0,
  totalCoins: 0,
  dashPoints: 0,
  practiceMode: false,
  checkpoints: [],

  // Mode context for runtime
  runMode: 'endless', // 'endless' or 'level'
  currentLevelId: null,

  // Beat pulse 0-1 for visuals
  beatPulse: 0,
  bgScrollX: 0,

  // Settings
  options: {
    sfxVol: 0.7, musicVol: 0.5, masterVol: 1,
    shake: 0.8, particles: 'high',
    reducedMotion: false, highContrast: false, colorBlind: false,
    showFps: false, showHitboxes: false, skipTutorial: false
  },

  setState(s){ this.prevState = this.state; this.state = s; },
  load(){
    this.best = Storage.get('best', 0);
    this.totalCoins = Storage.get('totalCoins', 0);
    this.dashPoints = Storage.get('dashPoints', 0);
    const opts = Storage.get('options', null);
    if (opts) Object.assign(this.options, opts);
  },
  saveOptions(){ Storage.set('options', this.options); },
  resetRun(opts={}){
    const startX = this.w * 0.18;
    const groundY = this.h * 0.82;
    this.player = new Player(startX, groundY - 28);
    this.player.groundY = groundY;
    this.player.ceilingY = this.h * 0.08;
    this.scroll = 0;
    this.score = 0;
    this.coins = 0;
    this.speed = this.baseSpeed;
    this.runStartT = performance.now();
    this.paused = false;
    this.checkpoints = [];
    this.runMode = opts.mode || 'endless';
    this.currentLevelId = opts.levelId || null;
  }
};
