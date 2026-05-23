// Portals — mode change, speed change, mini, dual
// Each portal is a tall pulsing gate. Touching changes player state.
import { Particles } from './particles.js';

const MODE_COLOR = { cube:'#39ff14', ship:'#ff2dd4', ball:'#ff3344', spider:'#b300ff', wave:'#ffe600' };
const SPEED_COLOR = { 0.5:'#3366ff', 1:'#39ff14', 2:'#ff2dd4', 3:'#ff3344', 4:'#ff8d3c' };

export const Portals = {
  list: [],
  pulse: 0,

  clear(){ this.list.length = 0; },

  spawn(opts){
    // type: 'mode'|'speed'|'mini'|'dual'
    this.list.push({
      type: opts.type,
      value: opts.value,
      x: opts.x,
      y: opts.y != null ? opts.y : null,
      w: 30, h: 100,
      hit: false
    });
  },

  tick(scrollSpeed, player, callbacks){
    this.pulse += 0.1;
    for (const p of this.list){
      p.x -= scrollSpeed;
      if (!p.hit && player && p.x < player.x + player.w && p.x + p.w > player.x){
        const py = p.y != null ? p.y : player.y + player.h/2 - p.h/2;
        if (py < player.y + player.h && py + p.h > player.y){
          p.hit = true;
          this._apply(p, player, callbacks);
        }
      }
    }
    this.list = this.list.filter(p => p.x + p.w > -50);
  },

  _apply(p, player, cb){
    if (p.type === 'mode'){
      player.setMode(p.value);
      Particles.emit(p.x + p.w/2, player.y + player.h/2, { count:24, color:MODE_COLOR[p.value], speed:5, life:30, gravity:0 });
      cb?.onPortal?.(p);
    } else if (p.type === 'speed'){
      player.speedScale = p.value;
      Particles.emit(p.x + p.w/2, player.y + player.h/2, { count:20, color:SPEED_COLOR[p.value]||'#fff', speed:6, life:30 });
      cb?.onPortal?.(p);
    } else if (p.type === 'mini'){
      player.mini = p.value;
      const factor = p.value ? 0.5 : 1;
      player.w = player.baseW * factor;
      player.baseH = player.baseH; // size locked by targetH on next tick
      player.h = player.h * factor;
      Particles.emit(p.x + p.w/2, player.y + player.h/2, { count:18, color:'#cccccc', speed:4, life:30 });
      cb?.onPortal?.(p);
    } else if (p.type === 'dual'){
      // Phase 5+: split into 2 mirrored players. Stub.
      cb?.onPortal?.(p);
    }
  },

  draw(ctx){
    const wobble = Math.sin(this.pulse) * 0.18 + 1;
    for (const p of this.list){
      const cy = p.y != null ? p.y + p.h/2 : ctx.canvas.height*0.45;
      const color = p.type==='mode' ? MODE_COLOR[p.value]
                  : p.type==='speed' ? (SPEED_COLOR[p.value]||'#fff')
                  : p.type==='mini' ? '#cccccc' : '#ffffff';
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 22;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w/2, cy, p.w/2 * wobble, p.h/2, 0, 0, Math.PI*2);
      ctx.stroke();
      // inner glow
      ctx.fillStyle = color + '30';
      ctx.fill();
      // icon
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px Oxanium';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = p.type==='mode' ? p.value.slice(0,1).toUpperCase()
                  : p.type==='speed' ? p.value+'x'
                  : p.type==='mini' ? (p.value?'mini':'BIG') : 'DUAL';
      ctx.fillText(label, p.x + p.w/2, cy);
      ctx.restore();
    }
  }
};
