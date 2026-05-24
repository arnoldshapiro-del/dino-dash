// Player entity — wraps mode physics, holds shared state
import { Modes } from './modes.js';

export class Player {
  constructor(x, y){
    this.x = x; this.y = y;
    this.baseW = 28; this.baseH = 28;
    this.w = this.baseW; this.h = this.baseH; this.targetH = this.baseH;
    this.vy = 0;
    this.gravityDir = 1;
    this.groundY = 0; this.ceilingY = 0;
    // Lower jump power + reduced gravity in cube tick = flatter, more diagonal
    // arc. Tap clears tall cactus (58px), hold reaches platforms at 200px.
    this.jumpPowerMax = 15;
    this.jumpPowerMin = 11;
    this.mode = 'cube';
    this.skinColor = null;
    this.spin = 0; this.spinTarget = 0; this.tilt = 0;
    this.trail = [];
    this.coyote = 0; this.jumpBuffer = 0; this.airJumps = 0;
    this.events = [];
    this.alive = true;
    this.mini = false;
    this.speedScale = 1;
    this.teleportStreak = null;
    this.invuln = 0;
    this.shield = false;
  }
  setMode(mode){
    this.mode = mode;
    this.vy = 0;
    this.trail = [];
    this.spinTarget = 0; this.spin = 0; this.tilt = 0;
    this.events.push({type:'modeChange',mode});
  }
  hitbox(){
    const pad = this.mode==='wave' ? 4 : 0;
    return { x:this.x+pad, y:this.y+pad, w:this.w-pad*2, h:this.h-pad*2 };
  }
  tick(dt, input){
    this.events.length = 0;
    const m = Modes[this.mode];
    if (m) m.tick(this, dt, input);
    if (this.invuln > 0) this.invuln--;
  }
  draw(ctx){
    const m = Modes[this.mode];
    if (!m) return;
    ctx.save();
    if (this.invuln > 0 && (this.invuln % 4 < 2)) ctx.globalAlpha = 0.45;
    m.draw(ctx, this);
    if (this.shield){
      ctx.strokeStyle = 'rgba(0,240,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.w/2, this.y + this.h/2, Math.max(this.w,this.h)*0.8, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
