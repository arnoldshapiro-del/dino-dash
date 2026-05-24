// All 5 Geometry Dash mode physics — fed via Player.mode
// Each mode exports a tick(player, dt, input) and a draw(ctx, player) function
const PI = Math.PI;

// Common helpers
function gravityClamp(p){
  const limit = 24;
  if (p.vy > limit) p.vy = limit;
  if (p.vy < -limit) p.vy = -limit;
}

export const Modes = {
  cube: {
    label:'CUBE', color:'#00f0ff',
    tick(p, dt, input){
      const G = 1.05 * p.gravityDir;
      const onSurface = p.gravityDir > 0
        ? (p.y + p.h >= p.groundY - 0.5 || p._onPlatform)
        : (p.y <= p.ceilingY + 0.5);
      // jump-buffer + coyote
      if (input.actionPressed) p.jumpBuffer = 8;
      if (onSurface){ p.coyote = 6; p.airJumps = 0; }
      else { p.coyote--; }
      const onGround = onSurface;
      p.jumpBuffer--;
      const canJump = (onGround || p.coyote > 0) && p.jumpBuffer > 0;
      if (canJump){
        // Tap or hold both give a generous full jump for forgiving gameplay.
        // Hold gives a slight bump for skilled players who want more air.
        const power = input.actionHeld ? p.jumpPowerMax : p.jumpPowerMin;
        p.vy = -power * p.gravityDir;
        p.jumpBuffer = 0; p.coyote = 0;
        p.spinTarget += 90 * p.gravityDir;
        p.events.push('jump');
      }
      // No variable-jump cut — every jump completes naturally. This guarantees
      // that pad and orb launches (which set vy beyond jumpPowerMax) reach
      // their full apex, and tap jumps actually clear obstacles.
      // crouch
      p.targetH = input.crouchHeld && onGround ? p.baseH * 0.5 : p.baseH;
      p.h += (p.targetH - p.h) * 0.4;
      p.vy += G;
      p.y += p.vy;
      gravityClamp(p);
      // ground/ceiling clamp
      if (p.gravityDir > 0 && p.y + p.h > p.groundY){ p.y = p.groundY - p.h; p.vy = 0; }
      if (p.gravityDir < 0 && p.y < p.ceilingY){ p.y = p.ceilingY; p.vy = 0; }
      // spin lerp
      p.spin += (p.spinTarget - p.spin) * 0.18;
    },
    draw(ctx, p){
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.spin * PI/180);
      ctx.shadowColor = p.skinColor || this.color; ctx.shadowBlur = 12;
      ctx.fillStyle = p.skinColor || this.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(-p.w/2+5, -p.h/2+5, p.w-10, 4); // detail
      ctx.restore();
    }
  },

  ship: {
    label:'SHIP', color:'#00f0ff',
    tick(p, dt, input){
      const thrust = -0.55 * p.gravityDir;
      const fall = 0.55 * p.gravityDir;
      p.vy += input.actionHeld ? thrust : fall;
      if (p.vy * p.gravityDir > 9) p.vy = 9 * p.gravityDir;
      if (p.vy * p.gravityDir < -9) p.vy = -9 * p.gravityDir;
      p.y += p.vy;
      // tilt visual
      const targetTilt = (input.actionHeld ? -30 : 30) * (p.gravityDir>0?1:-1);
      p.tilt += (targetTilt - p.tilt) * 0.2;
      // clamp to corridor
      if (p.y + p.h > p.groundY){ p.y = p.groundY - p.h; p.vy = 0; }
      if (p.y < p.ceilingY){ p.y = p.ceilingY; p.vy = 0; }
    },
    draw(ctx, p){
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate((p.tilt||0) * PI/180);
      ctx.shadowColor = p.skinColor || this.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.skinColor || this.color;
      ctx.beginPath();
      ctx.moveTo(p.w/2, 0);
      ctx.lineTo(-p.w/2, -p.h/2);
      ctx.lineTo(-p.w/2+6, 0);
      ctx.lineTo(-p.w/2, p.h/2);
      ctx.closePath();
      ctx.fill();
      // thrust trail
      ctx.fillStyle = 'rgba(255,141,60,.7)';
      ctx.beginPath();
      ctx.moveTo(-p.w/2, -p.h/4);
      ctx.lineTo(-p.w/2 - 10 - Math.random()*6, 0);
      ctx.lineTo(-p.w/2, p.h/4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  ball: {
    label:'BALL', color:'#ff8d3c',
    tick(p, dt, input){
      const G = 0.85 * p.gravityDir;
      if (input.actionPressed){
        p.gravityDir *= -1;
        p.events.push('gravFlip');
      }
      p.vy += G;
      if (p.vy * p.gravityDir > 14) p.vy = 14 * p.gravityDir;
      p.y += p.vy;
      if (p.y + p.h > p.groundY){ p.y = p.groundY - p.h; p.vy = 0; }
      if (p.y < p.ceilingY){ p.y = p.ceilingY; p.vy = 0; }
      p.spin += 8 * p.speedScale;
    },
    draw(ctx, p){
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.spin * PI/180);
      ctx.shadowColor = p.skinColor || this.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.skinColor || this.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.w/2, 0, PI*2);
      ctx.fill();
      ctx.fillStyle = '#0a0420';
      ctx.fillRect(-p.w/2+4, -2, p.w-8, 4);
      ctx.restore();
    }
  },

  spider: {
    label:'SPIDER', color:'#ff2dd4',
    tick(p, dt, input){
      // gravity-influenced; spider walks surfaces.
      if (input.actionPressed){
        // instant teleport to opposite surface
        const oldY = p.y;
        if (p.gravityDir > 0){
          p.y = p.ceilingY;
          p.gravityDir = -1;
        } else {
          p.y = p.groundY - p.h;
          p.gravityDir = 1;
        }
        p.teleportStreak = { from:oldY, to:p.y, life:6 };
        p.events.push('teleport');
        p.vy = 0;
      } else {
        // stick to current surface (low gravity)
        p.vy += 0.5 * p.gravityDir;
        p.y += p.vy;
        if (p.y + p.h > p.groundY){ p.y = p.groundY - p.h; p.vy = 0; }
        if (p.y < p.ceilingY){ p.y = p.ceilingY; p.vy = 0; }
      }
      if (p.teleportStreak) p.teleportStreak.life--;
      if (p.teleportStreak && p.teleportStreak.life <= 0) p.teleportStreak = null;
    },
    draw(ctx, p){
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.shadowColor = p.skinColor || this.color; ctx.shadowBlur = 12;
      ctx.fillStyle = p.skinColor || this.color;
      ctx.beginPath(); ctx.arc(0,0, p.w/2.5, 0, PI*2); ctx.fill();
      // legs (4 dots around body)
      const r = p.w/2 + 4;
      for (let i=0;i<4;i++){
        const a = (i / 4) * PI*2 + (p.spin*PI/180);
        ctx.beginPath(); ctx.arc(Math.cos(a)*r, Math.sin(a)*r, 2.5, 0, PI*2); ctx.fill();
      }
      // teleport streak
      if (p.teleportStreak){
        const t = p.teleportStreak;
        const alpha = t.life / 6;
        ctx.strokeStyle = `rgba(255,45,212,${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, (t.from - p.y - p.h/2));
        ctx.lineTo(0, (t.to - p.y - p.h/2));
        ctx.stroke();
      }
      p.spin += 6;
      ctx.restore();
    }
  },

  wave: {
    label:'WAVE', color:'#ffe600',
    tick(p, dt, input){
      // 45° sawtooth: hold = up, release = down. Wave hitbox is point-like.
      const step = 6 * p.speedScale;
      if (input.actionHeld){ p.y -= step; }
      else { p.y += step; }
      p.vy = 0;
      // trail
      p.trail.push({ x:p.x + p.w/2, y:p.y + p.h/2 });
      if (p.trail.length > 80) p.trail.shift();
      if (p.y + p.h > p.groundY){ p.y = p.groundY - p.h; }
      if (p.y < p.ceilingY){ p.y = p.ceilingY; }
    },
    draw(ctx, p){
      // trail
      if (p.trail.length > 1){
        ctx.strokeStyle = (p.skinColor || this.color);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i=0;i<p.trail.length;i++){
          const a = i / p.trail.length;
          const pt = p.trail[i];
          if (i===0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.shadowColor = p.skinColor || this.color; ctx.shadowBlur = 12;
      ctx.fillStyle = p.skinColor || this.color;
      ctx.beginPath();
      ctx.moveTo(p.w/2, 0);
      ctx.lineTo(-p.w/2, -p.h/2);
      ctx.lineTo(-p.w/3, 0);
      ctx.lineTo(-p.w/2, p.h/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
};

export const MODE_LIST = ['cube','ship','ball','spider','wave'];
