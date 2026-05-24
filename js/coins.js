// Coins — yellow (1pt), blue (5pt), gold secret (100pt)
import { Particles } from './particles.js';

const COLOR = { yellow:'#ffd700', blue:'#00f0ff', gold:'#ffaa00' };
// Doubled values so short sessions feel rewarding
const VALUE = { yellow:2, blue:10, gold:200 };

export const Coins = {
  list: [], pulse: 0, combo: 0, comboTimer: 0,
  clear(){ this.list.length = 0; this.combo = 0; },

  spawn(opts){
    this.list.push({ kind: opts.kind || 'yellow', x: opts.x, y: opts.y, r: opts.kind==='gold'?12:9, taken:false, fade:0 });
  },

  // Helper patterns
  spawnLine(x, y, count, gap=28, kind='yellow'){
    for (let i=0;i<count;i++) this.spawn({ kind, x: x + i*gap, y });
  },
  spawnArc(cx, cy, r, count=8, kind='yellow'){
    for (let i=0;i<count;i++){
      const a = -Math.PI/2 - (i/(count-1) - 0.5) * Math.PI;
      this.spawn({ kind, x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r });
    }
  },
  spawnZigzag(x, y, count, gap=30, amp=20, kind='yellow'){
    for (let i=0;i<count;i++){
      this.spawn({ kind, x: x + i*gap, y: y + Math.sin(i*0.7)*amp });
    }
  },

  tick(scrollSpeed, player, magnet, cb){
    this.pulse += 0.15;
    if (this.comboTimer > 0) this.comboTimer--; else this.combo = 0;

    for (const c of this.list){
      c.x -= scrollSpeed;
      if (c.fade > 0) c.fade -= 0.08;
      if (c.taken) continue;
      const px = player.x + player.w/2, py = player.y + player.h/2;
      const dx = px - c.x, dy = py - c.y;
      const dist2 = dx*dx + dy*dy;
      // magnet
      if (magnet){
        const radius = magnet.radius || 150;
        if (dist2 < radius*radius){
          const d = Math.sqrt(dist2) || 1;
          c.x += (dx / d) * 6;
          c.y += (dy / d) * 6;
        }
      }
      const reach = c.r + Math.max(player.w,player.h)/2 - 4;
      if (dist2 < reach*reach){
        c.taken = true; c.fade = 1;
        this.combo++; this.comboTimer = 60;
        cb?.onCoin?.(c.kind, VALUE[c.kind], this.combo);
        Particles.emit(c.x, c.y, { count:8, color:COLOR[c.kind], speed:4, life:22 });
      }
    }
    this.list = this.list.filter(c => c.x > -40 && (!c.taken || c.fade>0));
  },

  draw(ctx){
    for (const c of this.list){
      const wobble = Math.sin(this.pulse + c.x*0.02) * 0.3 + 1;
      ctx.save();
      ctx.globalAlpha = c.taken ? c.fade : 1;
      ctx.shadowColor = COLOR[c.kind]; ctx.shadowBlur = 10;
      ctx.fillStyle = COLOR[c.kind];
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * Math.abs(wobble), c.r, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0420';
      const inner = c.r * 0.4;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, inner * Math.abs(wobble), inner, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },

  value(kind){ return VALUE[kind]; }
};
