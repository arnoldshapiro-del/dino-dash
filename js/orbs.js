// Orbs (tap-when-overlapping in air) + Pads (auto-trigger on touch)
import { Particles } from './particles.js';

const ORB_COLOR = {
  yellow:'#ffe600', red:'#ff3344', blue:'#00f0ff', pink:'#ff2dd4',
  green:'#39ff14', spider:'#b300ff', dash:'#00ffd5'
};
const PAD_COLOR = {
  yellow:'#ffe600', pink:'#ff2dd4', red:'#ff3344', blue:'#00f0ff', spider:'#b300ff'
};

export const Orbs = {
  list: [], pulse: 0,
  clear(){ this.list.length = 0; },
  spawn(opts){ this.list.push({ kind:opts.kind, x:opts.x, y:opts.y, r:14, used:false, fade:0 }); },
  tick(scrollSpeed, player, input, cb){
    this.pulse += 0.18;
    for (const o of this.list){
      o.x -= scrollSpeed;
      if (o.fade > 0) o.fade -= 0.06;
      if (o.used) continue;
      const cx = player.x + player.w/2, cy = player.y + player.h/2;
      const dx = cx - o.x, dy = cy - o.y;
      const overlap = (dx*dx + dy*dy) < (o.r + Math.max(player.w,player.h)/2)**2;
      if (overlap && input.actionPressed){
        o.used = true; o.fade = 1;
        this._activate(o, player);
        cb?.onOrb?.(o);
      }
    }
    this.list = this.list.filter(o => o.x > -50 && (!o.used || o.fade>0));
  },
  _activate(o, p){
    p._cuttableJump = false; // pad/orb launches cannot be cut short
    switch(o.kind){
      case 'yellow': p.vy = -18 * p.gravityDir; p.events.push('jump'); break;
      case 'red':    p.vy = -24 * p.gravityDir; p.events.push('jump'); break;
      case 'pink':   p.vy = -13 * p.gravityDir; p.events.push('jump'); break;
      case 'blue':   p.gravityDir *= -1; p.vy = 0; p.events.push('gravFlip'); break;
      case 'green':  p.gravityDir *= -1; p.vy = -13 * p.gravityDir; p.events.push('gravFlip'); break;
      case 'spider': {
        if (p.gravityDir > 0){ p.y = p.ceilingY; p.gravityDir = -1; }
        else { p.y = p.groundY - p.h; p.gravityDir = 1; }
        p.vy = 0; p.events.push('teleport');
        break;
      }
      case 'dash':   p.vy = -10 * p.gravityDir; p.x += 8; p.events.push('dash'); break;
    }
    Particles.emit(o.x, o.y, { count:18, color:ORB_COLOR[o.kind], speed:5, life:28, gravity:0 });
  },
  draw(ctx){
    for (const o of this.list){
      const a = o.used ? o.fade : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = ORB_COLOR[o.kind]; ctx.shadowBlur = 14;
      ctx.fillStyle = ORB_COLOR[o.kind];
      const pulse = Math.sin(this.pulse + o.x*0.01) * 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r + pulse, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ffffff80'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r + pulse + 3, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  }
};

export const Pads = {
  list: [],
  clear(){ this.list.length = 0; },
  spawn(opts){ this.list.push({ kind:opts.kind, x:opts.x, y:opts.y, w:36, h:8, ceiling:!!opts.ceiling, cool:0 }); },
  tick(scrollSpeed, player, cb){
    for (const pad of this.list){
      pad.x -= scrollSpeed;
      if (pad.cool > 0) pad.cool--;
      if (pad.cool === 0){
        const overlap = player.x + player.w > pad.x && player.x < pad.x + pad.w
                     && player.y + player.h > pad.y && player.y < pad.y + pad.h + 6;
        if (overlap){
          pad.cool = 18;
          this._activate(pad, player);
          cb?.onPad?.(pad);
        }
      }
    }
    this.list = this.list.filter(p => p.x + p.w > -50);
  },
  _activate(pad, p){
    p._cuttableJump = false; // pad launches cannot be cut short
    switch(pad.kind){
      case 'yellow': p.vy = -22 * p.gravityDir; break;   // ~230px — clears platform + orb
      case 'pink':   p.vy = -15 * p.gravityDir; break;   // ~107px — small bounce
      case 'red':    p.vy = -28 * p.gravityDir; break;   // ~373px — very high
      case 'blue':   p.gravityDir *= -1; p.vy = 0; break;
      case 'spider': {
        if (p.gravityDir > 0){ p.y = p.ceilingY; p.gravityDir = -1; }
        else { p.y = p.groundY - p.h; p.gravityDir = 1; }
        p.vy = 0; break;
      }
    }
    Particles.emit(pad.x + pad.w/2, pad.y, { count:14, color:PAD_COLOR[pad.kind], speed:4, life:22, angle:-Math.PI/2, spread:Math.PI/2 });
  },
  draw(ctx){
    for (const pad of this.list){
      ctx.save();
      ctx.shadowColor = PAD_COLOR[pad.kind]; ctx.shadowBlur = 10;
      ctx.fillStyle = PAD_COLOR[pad.kind];
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      ctx.fillStyle = '#ffffff80';
      ctx.fillRect(pad.x+4, pad.y+2, pad.w-8, 2);
      ctx.restore();
    }
  }
};
