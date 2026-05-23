// Procedural audio: synthesized SFX + per-mode music loops, Web Audio API
import { Game } from './game.js';

export const Audio = {
  ctx: null,
  master: null, sfxGain: null, musicGain: null,
  initialized: false,
  enabled: true,
  mode: 'cube',
  bpm: 100,
  nextBeatTime: 0,
  beatStep: 0,
  duckUntil: 0,
  musicLoopHandle: null,
  comboTone: 880,
  comboResetT: 0,

  init(){
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = Game.options.masterVol;
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = Game.options.sfxVol;
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = Game.options.musicVol;
      this.sfxGain.connect(this.master); this.musicGain.connect(this.master); this.master.connect(this.ctx.destination);
      this.initialized = true;
      this.nextBeatTime = this.ctx.currentTime;
      this._scheduleMusic();
    } catch(_){ this.initialized = false; }
  },

  updateVolumes(){
    if (!this.initialized) return;
    this.master.gain.value = Game.options.masterVol;
    this.sfxGain.gain.value = Game.options.sfxVol;
    this.musicGain.gain.value = Game.options.musicVol;
  },

  setMode(mode){
    this.mode = mode;
    if (this.duckUntil < this.ctx?.currentTime) this.duckUntil = (this.ctx?.currentTime||0);
  },

  setBpm(bpm){ this.bpm = bpm; },

  // ───── SFX ─────
  _osc(type, freq, dur, gain=0.2, pitchTo=null){
    if (!this.initialized || !this.enabled) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    if (pitchTo != null){
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(pitchTo, ctx.currentTime + dur);
    } else {
      o.frequency.value = freq;
    }
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  },
  _noise(dur, gain=0.2, filterFreq=2000){
    if (!this.initialized || !this.enabled) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate*dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * (1 - i/data.length);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value = filterFreq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start();
  },

  sfx(name, data={}){
    if (!this.initialized) return;
    switch(name){
      case 'jump':       this._osc('square', 220, 0.08, 0.18, 440); break;
      case 'crouch':     this._osc('square', 110, 0.05, 0.12); break;
      case 'coin':       this._osc('sine',   data.combo>1 ? Math.min(1700, 880 + (data.combo-1)*50) : 880, 0.06, 0.16, 1320); break;
      case 'powerup':    this._osc('triangle', 523, 0.06, 0.2, 698); setTimeout(()=>this._osc('triangle', 698, 0.06, 0.2, 880), 60); setTimeout(()=>this._osc('triangle', 880, 0.08, 0.2, 1175), 120); break;
      case 'portal':     this._osc('sawtooth', 440, 0.18, 0.2, 880); setTimeout(()=>this._osc('sawtooth', 660, 0.12, 0.15, 1100), 80); break;
      case 'orb':        this._osc('sine', 660 + Math.random()*220, 0.12, 0.18, 220); break;
      case 'pad':        this._osc('square', 110, 0.1, 0.22, 330); break;
      case 'death':      this._osc('sawtooth', 400, 0.4, 0.3, 50); this._noise(0.25, 0.15, 800); break;
      case 'shieldBreak':this._noise(0.2, 0.25, 4000); this._osc('triangle', 1200, 0.1, 0.18, 200); break;
      case 'achievement':this._osc('triangle', 523, 0.08, 0.22, 659); setTimeout(()=>this._osc('triangle', 659, 0.08, 0.22, 784),80); setTimeout(()=>this._osc('triangle', 784, 0.1, 0.22, 1047),160); setTimeout(()=>this._osc('triangle', 1047, 0.12, 0.22, 1319),240); break;
      case 'highscore':  this._osc('square', 523, 0.12, 0.2, 1047); setTimeout(()=>this._osc('square', 784, 0.12, 0.2, 1319),120); setTimeout(()=>this._osc('square', 1047, 0.2, 0.22, 1568),240); break;
      case 'hover':      this._osc('square', 110, 0.04, 0.08); break;
      case 'select':     this._osc('square', 220, 0.05, 0.14, 440); break;
      case 'purchase':   this._osc('triangle', 800, 0.05, 0.18); setTimeout(()=>this._osc('triangle', 1000, 0.05, 0.18),60); setTimeout(()=>this._osc('triangle', 1200, 0.08, 0.22),120); break;
      case 'levelComp':  this._osc('triangle', 523, 0.1, 0.22, 659); setTimeout(()=>this._osc('triangle', 659, 0.1, 0.22, 784),100); setTimeout(()=>this._osc('triangle', 784, 0.1, 0.22, 1047),200); setTimeout(()=>this._osc('triangle', 1047, 0.1, 0.22, 1319),300); setTimeout(()=>this._osc('triangle', 1319, 0.16, 0.24, 1568),400); break;
      case 'star':       this._osc('sine', 1568, 0.1, 0.18, 2093); break;
      case 'bossHit':    this._osc('sawtooth', 60, 0.2, 0.3, 30); this._noise(0.1, 0.15, 200); break;
      case 'bossDefeat': for (let i=0;i<8;i++) setTimeout(()=> this._osc('triangle', 220 + i*80, 0.15, 0.2, 880), i*80); break;
    }
  },

  // ───── MUSIC ─────
  _scheduleMusic(){
    if (!this.initialized) return;
    const tick = () => {
      const ctx = this.ctx;
      const beatLen = 60 / this.bpm;
      while (this.nextBeatTime < ctx.currentTime + 0.2){
        this._beat(this.beatStep);
        this.nextBeatTime += beatLen / 2; // 8ths
        this.beatStep = (this.beatStep + 1) % 16;
      }
    };
    if (!this.musicLoopHandle) this.musicLoopHandle = setInterval(tick, 30);
  },
  _beat(step){
    if (!this.enabled) return;
    const ctx = this.ctx;
    const t = this.nextBeatTime;
    const isQuarter = (step % 2) === 0;
    const beatIdx = Math.floor(step/2);
    const onBeat = isQuarter;
    // Kick on every quarter
    if (onBeat){
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(40, t+0.15);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t+0.2);
    }
    // Hi-hat off-beats
    if (!onBeat){
      const buf = ctx.createBuffer(1, ctx.sampleRate*0.03, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.value = 0.08;
      s.connect(f); f.connect(g); g.connect(this.musicGain);
      s.start(t);
    }
    // Lead synth per-mode every 4 beats
    if (step % 4 === 0){
      const NOTES = {
        cube:   [523, 622, 698, 622],
        ship:   [440, 554, 659, 554],
        ball:   [349, 415, 466, 415],
        spider: [311, 370, 415, 370],
        wave:   [415, 466, 554, 622]
      };
      const seq = NOTES[this.mode] || NOTES.cube;
      const freq = seq[Math.floor(step/4) % seq.length];
      const o = ctx.createOscillator();
      o.type = this.mode === 'ship' ? 'sine' : this.mode === 'wave' ? 'sawtooth' : 'square';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 0.5);
    }
  },

  duck(seconds=1){
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(Game.options.musicVol*0.4, now);
    this.musicGain.gain.linearRampToValueAtTime(Game.options.musicVol, now + seconds);
  },

  setEnabled(v){ this.enabled = v; }
};
