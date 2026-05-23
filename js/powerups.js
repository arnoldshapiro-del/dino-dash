// 8 power-ups + mystery box
import { Particles } from './particles.js';

export const POWER_DEFS = {
  shield:    { icon:'🛡️', label:'Shield',       duration: 0,    color:'#00f0ff' },
  magnet:    { icon:'🧲', label:'Coin Magnet',   duration: 480,  color:'#ff3344' },
  slowmo:    { icon:'⏱️', label:'Slow-Mo',       duration: 180,  color:'#b300ff' },
  multi2x:   { icon:'✨', label:'2x Score',      duration: 600,  color:'#ffe600' },
  jetpack:   { icon:'🚀', label:'Jetpack',       duration: 300,  color:'#ff8d3c' },
  mini:      { icon:'🤏', label:'Mini Mode',     duration: 480,  color:'#39ff14' },
  mystery:   { icon:'💎', label:'Mystery',       duration: 0,    color:'#ff2dd4' },
  phase:     { icon:'🌀', label:'Phase Shift',   duration: 120,  color:'#ffffff' }
};

const KINDS = Object.keys(POWER_DEFS).filter(k => k !== 'mystery');

export const PowerUps = {
  list: [],
  active: {}, // { kind: remainingFrames }
  pulse: 0,

  clear(){ this.list.length = 0; this.active = {}; },

  spawn(opts){
    this.list.push({ kind: opts.kind, x: opts.x, y: opts.y, r: 16, taken:false, bob: Math.random()*Math.PI*2 });
  },

  tick(scrollSpeed, player, cb, upgradeBonus){
    this.pulse += 0.08;
    for (const pu of this.list){
      pu.x -= scrollSpeed;
      pu.bob += 0.06;
      if (pu.taken) continue;
      const dx = (player.x + player.w/2) - pu.x;
      const dy = (player.y + player.h/2) - (pu.y + Math.sin(pu.bob)*4);
      if (dx*dx + dy*dy < (pu.r + Math.max(player.w,player.h)/2)**2){
        pu.taken = true;
        this._pickup(pu, player, cb, upgradeBonus);
      }
    }
    this.list = this.list.filter(pu => pu.x > -50 && !pu.taken);
    // Tick active
    for (const k of Object.keys(this.active)){
      this.active[k]--;
      if (this.active[k] <= 0){
        delete this.active[k];
        this._onExpire(k, player);
        cb?.onExpire?.(k);
      }
    }
  },

  _pickup(pu, player, cb, upgradeBonus){
    upgradeBonus = upgradeBonus || {};
    let kind = pu.kind;
    if (kind === 'mystery'){
      const pool = KINDS.concat(['mystery_coins','mystery_score','mystery_dp']);
      kind = pool[Math.floor(Math.random()*pool.length)];
      cb?.onMystery?.(kind);
      if (kind === 'mystery_coins'){ cb?.onCoinBonus?.(50); Particles.emit(pu.x, pu.y, {count:30, color:'#ffd700', speed:5, life:30}); return; }
      if (kind === 'mystery_score'){ cb?.onScoreBonus?.(500); Particles.emit(pu.x, pu.y, {count:30, color:'#00f0ff', speed:5, life:30}); return; }
      if (kind === 'mystery_dp'){ cb?.onDpBonus?.(10); Particles.emit(pu.x, pu.y, {count:30, color:'#b300ff', speed:5, life:30}); return; }
    }
    this._activate(kind, player, upgradeBonus);
    cb?.onPickup?.(kind);
    Particles.emit(pu.x, pu.y, {count:22, color:POWER_DEFS[kind].color, speed:5, life:30});
  },

  _activate(kind, player, bonus){
    const def = POWER_DEFS[kind];
    if (kind === 'shield'){
      player.shield = true;
      this.active.shield = 60 * (3 + (bonus.shield||0)); // duration upgrade adds frames @ 60fps
    } else if (kind === 'mini'){
      player.mini = true;
      player.w = player.baseW * 0.5;
      player.baseH = player.baseH; player.h = player.h * 0.5;
      this.active.mini = def.duration;
    } else {
      this.active[kind] = def.duration + (bonus[kind]||0);
    }
  },

  _onExpire(kind, player){
    if (kind === 'shield'){ player.shield = false; }
    if (kind === 'mini'){
      player.mini = false; player.w = player.baseW;
      player.h = player.baseH;
    }
  },

  isActive(kind){ return this.active[kind] > 0; },

  draw(ctx){
    for (const pu of this.list){
      const def = POWER_DEFS[pu.kind];
      const y = pu.y + Math.sin(pu.bob)*4;
      ctx.save();
      ctx.shadowColor = def.color; ctx.shadowBlur = 18;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(pu.x, y, pu.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0420';
      ctx.beginPath(); ctx.arc(pu.x, y, pu.r-4, 0, Math.PI*2); ctx.fill();
      ctx.font = '14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(def.icon, pu.x, y);
      // outer ring
      ctx.strokeStyle = def.color + '88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pu.x, y, pu.r + 4 + Math.sin(this.pulse + pu.x*0.01)*2, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  },

  drawHud(ctx, w){
    // active power-up indicators with countdown ring
    let x = w - 90;
    for (const [k, rem] of Object.entries(this.active)){
      const def = POWER_DEFS[k];
      if (!def) continue;
      const max = def.duration || 60;
      const ratio = Math.min(1, rem / max);
      ctx.save();
      ctx.shadowColor = def.color; ctx.shadowBlur = 12;
      ctx.strokeStyle = def.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, 50, 18, -Math.PI/2, -Math.PI/2 + Math.PI*2*ratio); ctx.stroke();
      ctx.fillStyle = 'rgba(10,4,32,.6)';
      ctx.beginPath(); ctx.arc(x, 50, 14, 0, Math.PI*2); ctx.fill();
      ctx.font = '16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(def.icon, x, 50);
      ctx.restore();
      x -= 46;
    }
  }
};
