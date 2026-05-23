// 15 obstacle types. Each has spawn helper + draw + hitbox.
// type: 'tallCactus','shortCactus','cactusCluster','pterodactyl','spike','sawblade','pulsingSpike','laser','rock','wind','platform','crusher','spikeWall','electricFence','firepit'

import { Particles } from './particles.js';

const COLORS = {
  cactus:'#39ff14', spike:'#ff3344', metal:'#cccccc', laser:'#ff2dd4',
  rock:'#a8884d', wind:'#a0e7ff', wood:'#b07a3a', warn:'#ffe600',
  electric:'#00f0ff', fire:'#ff5b1f'
};

export const Obstacles = {
  list: [], t: 0,

  clear(){ this.list.length = 0; this.t = 0; },

  spawn(type, x, opts={}){
    const ob = { type, x, vy:0, t:0, alive:true, ...opts };
    if (!ob.groundY) ob.groundY = (opts.groundY || 0);
    this._init(ob);
    this.list.push(ob);
    return ob;
  },

  _init(o){
    const g = o.groundY;
    switch(o.type){
      case 'tallCactus':   o.w=22; o.h=58; o.y=g - o.h; break;
      case 'shortCactus':  o.w=18; o.h=32; o.y=g - o.h; break;
      case 'cactusCluster':o.w=46; o.h=44; o.y=g - o.h; break;
      case 'pterodactyl':  o.w=44; o.h=24; o.y = g - (o.height==='high'?160 : o.height==='mid'?90 : 50); o.flap=0; break;
      case 'spike':        o.w=24; o.h=22; o.y=g - o.h; break;
      case 'sawblade':     o.w=42; o.h=42; o.y=g - o.h - 4; o.spin=0; break;
      case 'pulsingSpike': o.w=24; o.h=22; o.y=g - o.h; o.phase=Math.random()*Math.PI*2; break;
      case 'laser':        o.w=8; o.h=200; o.y=o.cy != null ? o.cy - 100 : g - 220; break;
      case 'rock':         o.w=26; o.h=26; o.y= -30; o.fall=true; break;
      case 'wind':         o.w=60; o.h=120; o.y= g - 220; break;
      case 'platform':     o.w=80; o.h=10; o.y = o.cy != null ? o.cy : g - 80; o.osc=Math.random()*Math.PI*2; o.baseY = o.y; break;
      case 'crusher':      o.w=46; o.h=46; o.y = -100; o.crushPhase=0; break;
      case 'spikeWall':    o.w=20; o.h=180; o.y = g - 180; o.closeSpeed = 0.3; break;
      case 'electricFence':o.w=18; o.h=90; o.y = g - 90; o.spark=0; break;
      case 'firepit':      o.w=46; o.h=18; o.y=g - o.h; o.flicker=Math.random()*Math.PI*2; break;
    }
  },

  tick(scrollSpeed, player, onDeath){
    this.t += 1;
    for (const o of this.list){
      o.x -= scrollSpeed;
      o.t++;
      switch(o.type){
        case 'pterodactyl': o.flap += 0.15; break;
        case 'sawblade': o.spin += 0.25; break;
        case 'pulsingSpike': o.phase += 0.12; o.h = 14 + 14 * Math.max(0, Math.sin(o.phase)); o.y = o.groundY - o.h; break;
        case 'rock':
          if (o.fall && o.x < player.x + 240 && o.y < o.groundY - 30){
            o.vy += 0.5; o.y += o.vy;
            if (o.y >= o.groundY - 30){ o.fall=false; o.y = o.groundY - 30; o.vy = 0; }
          }
          break;
        case 'wind': o.t++; break;
        case 'platform':
          o.osc += 0.04; o.y = o.baseY + Math.sin(o.osc)*30; break;
        case 'crusher':
          o.crushPhase += 0.05;
          o.y = -50 + (Math.sin(o.crushPhase)*100 + 100); break;
        case 'spikeWall':
          if (o.x < player.x + 700){ o.x -= o.closeSpeed; }
          break;
        case 'electricFence':
          o.spark = (o.spark + 1) % 16; break;
        case 'firepit': o.flicker += 0.25; break;
      }
    }
    // Cull
    this.list = this.list.filter(o => o.x + o.w > -100 && o.alive);

    // Collision
    if (player && player.alive && player.invuln <= 0){
      const hb = player.hitbox();
      for (const o of this.list){
        if (this._hits(hb, o)){
          if (player.shield){
            player.shield = false;
            player.invuln = 60;
            Particles.emit(player.x + player.w/2, player.y + player.h/2, { count:24, color:'#00f0ff', speed:5, life:30 });
            onDeath?.shield?.();
            o.alive = false; // consume
          } else {
            onDeath?.die?.(o);
            return;
          }
        }
      }
    }
  },

  _hits(hb, o){
    if (o.type === 'platform') return false; // platforms are walkable
    if (o.type === 'wind') return false; // wind affects ship/wave but not damage
    if (o.type === 'pulsingSpike' && o.h < 10) return false;
    // basic rect overlap
    return hb.x < o.x + o.w && hb.x + hb.w > o.x && hb.y < o.y + o.h && hb.y + hb.h > o.y;
  },

  draw(ctx){
    for (const o of this.list){
      switch(o.type){
        case 'tallCactus':
        case 'shortCactus':
          ctx.fillStyle = COLORS.cactus; ctx.shadowColor=COLORS.cactus; ctx.shadowBlur=6;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillRect(o.x - 4, o.y + o.h*0.3, 4, o.h*0.4);
          ctx.fillRect(o.x + o.w, o.y + o.h*0.5, 4, o.h*0.3);
          ctx.shadowBlur=0;
          break;
        case 'cactusCluster':
          ctx.fillStyle = COLORS.cactus; ctx.shadowColor=COLORS.cactus; ctx.shadowBlur=6;
          ctx.fillRect(o.x, o.y+10, 18, o.h-10);
          ctx.fillRect(o.x+14, o.y, 16, o.h);
          ctx.fillRect(o.x+30, o.y+16, 16, o.h-16);
          ctx.shadowBlur=0;
          break;
        case 'pterodactyl':
          ctx.fillStyle = '#aaaaaa'; ctx.shadowColor='#444'; ctx.shadowBlur=4;
          const fl = Math.sin(o.flap)*8;
          ctx.beginPath();
          ctx.moveTo(o.x + o.w*0.2, o.y + o.h*0.6);
          ctx.lineTo(o.x, o.y - fl);
          ctx.lineTo(o.x + o.w*0.4, o.y + o.h*0.4);
          ctx.lineTo(o.x + o.w, o.y + o.h*0.5);
          ctx.lineTo(o.x + o.w*0.6, o.y - fl);
          ctx.lineTo(o.x + o.w*0.4, o.y + o.h*0.4);
          ctx.closePath(); ctx.fill();
          ctx.shadowBlur=0;
          break;
        case 'spike':
          ctx.fillStyle = COLORS.spike; ctx.shadowColor=COLORS.spike; ctx.shadowBlur=6;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.h);
          ctx.lineTo(o.x + o.w/2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.closePath(); ctx.fill();
          ctx.shadowBlur=0;
          break;
        case 'sawblade':
          ctx.save();
          ctx.translate(o.x + o.w/2, o.y + o.h/2);
          ctx.rotate(o.spin);
          ctx.fillStyle = COLORS.metal; ctx.shadowColor='#fff'; ctx.shadowBlur=6;
          for (let i=0;i<8;i++){
            ctx.rotate(Math.PI/4);
            ctx.fillRect(0, -3, o.w/2, 6);
          }
          ctx.beginPath(); ctx.arc(0,0,o.w/3,0,Math.PI*2); ctx.fill();
          ctx.shadowBlur=0;
          ctx.restore();
          break;
        case 'pulsingSpike':
          ctx.fillStyle = COLORS.spike; ctx.shadowColor=COLORS.spike; ctx.shadowBlur=10;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.h);
          ctx.lineTo(o.x + o.w/2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.closePath(); ctx.fill();
          ctx.shadowBlur=0;
          break;
        case 'laser':
          ctx.fillStyle = COLORS.laser; ctx.shadowColor=COLORS.laser; ctx.shadowBlur=14;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.shadowBlur=0;
          break;
        case 'rock':
          ctx.fillStyle = COLORS.rock;
          ctx.beginPath(); ctx.arc(o.x + o.w/2, o.y + o.h/2, o.w/2, 0, Math.PI*2); ctx.fill();
          break;
        case 'wind':
          ctx.strokeStyle = 'rgba(160,231,255,.5)'; ctx.lineWidth = 2;
          for (let i=0;i<5;i++){
            const yy = o.y + i*22 + (this.t*0.4 % 22);
            ctx.beginPath();
            ctx.moveTo(o.x, yy);
            ctx.bezierCurveTo(o.x + 20, yy-6, o.x + 40, yy+6, o.x + 60, yy);
            ctx.stroke();
          }
          break;
        case 'platform':
          ctx.fillStyle = COLORS.metal; ctx.shadowColor='#00f0ff'; ctx.shadowBlur=8;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.shadowBlur=0;
          break;
        case 'crusher':
          ctx.fillStyle = '#555'; ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = COLORS.metal; ctx.fillRect(o.x, o.y+o.h-6, o.w, 6);
          break;
        case 'spikeWall':
          ctx.fillStyle = COLORS.warn;
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = COLORS.spike;
          for (let i=0;i<6;i++){
            const sy = o.y + i*30;
            ctx.beginPath();
            ctx.moveTo(o.x + o.w, sy);
            ctx.lineTo(o.x + o.w + 14, sy + 15);
            ctx.lineTo(o.x + o.w, sy + 30);
            ctx.closePath(); ctx.fill();
          }
          break;
        case 'electricFence':
          ctx.fillStyle = '#222'; ctx.fillRect(o.x, o.y, o.w, o.h);
          if ((o.spark % 6) < 3){
            ctx.strokeStyle = COLORS.electric; ctx.shadowColor=COLORS.electric; ctx.shadowBlur=12;
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(o.x+2, o.y+10);
            for (let i=0;i<10;i++) ctx.lineTo(o.x + (i%2===0?2:o.w-2), o.y + 10 + i*8);
            ctx.stroke();
            ctx.shadowBlur=0;
          }
          break;
        case 'firepit':
          ctx.fillStyle = '#3a1a08'; ctx.fillRect(o.x, o.y + o.h - 4, o.w, 4);
          for (let i=0;i<5;i++){
            const fy = Math.sin(o.flicker + i)*4;
            ctx.fillStyle = i%2===0 ? COLORS.fire : COLORS.warn;
            ctx.shadowColor = COLORS.fire; ctx.shadowBlur=10;
            ctx.beginPath();
            ctx.ellipse(o.x + 8 + i*8, o.y + 8 + fy, 4, 8, 0, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.shadowBlur=0;
          break;
      }
    }
  }
};
