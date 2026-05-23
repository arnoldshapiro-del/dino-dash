// Special level mechanics for L7-L14 + L16 boss
// Each special level exports init(), tick(), draw(), and signals end via Game.scroll vs endX

import { Obstacles } from './obstacles.js';
import { Coins } from './coins.js';
import { Particles } from './particles.js';
import { Game } from './game.js';
import { Modes } from './modes.js';

// ─────────────────────────────────────────────────
// Custom obstacle drawer helper (we extend Obstacles via Obstacles.list pushes)
// ─────────────────────────────────────────────────

export const Special = {
  active: null, // name of active special-level mechanic
  state: null,
  hp: 0, maxHp: 0,
  bossPhase: 0,

  reset(){ this.active = null; this.state = null; this.hp = 0; this.bossPhase = 0; },

  // ─────────── L7 FLAPPY ───────────
  initFlappy(player, groundY, endX){
    this.active = 'flappy';
    this.state = { pipes: [], gapY: groundY/2, nextPipeX: 800, endX };
    player.setMode('ship');
    // Heavy gravity ship: amped by overriding tick
    player.flappyMode = true;
    // Generate pipes
    let x = 1000;
    while (x < endX){
      const gap = 140 + Math.random()*60;
      const gapCenter = 200 + Math.random()*(Game.h*0.5);
      this.state.pipes.push({ x, gap, gapCenter, passed:false, scored:false });
      x += 360 + Math.random()*120;
    }
  },
  tickFlappy(player, scrollSpeed, onDeath){
    // Heavy gravity overrides ship.tick — handled by setting vy after standard tick is bypassed.
    // We'll just custom physics here:
    const G = 0.9;
    if (player._actionPressed) player.vy = -8;
    player.vy += G;
    player.y += player.vy;
    if (player.y < player.ceilingY){ player.y = player.ceilingY; player.vy = 0; }
    if (player.y + player.h > player.groundY){ onDeath('floor'); return; }
    // Move pipes left
    for (const p of this.state.pipes){
      p.x -= scrollSpeed;
      // Collide
      const topH = p.gapCenter - p.gap/2;
      const botY = p.gapCenter + p.gap/2;
      if (player.x + player.w > p.x && player.x < p.x + 50){
        if (player.y < topH || player.y + player.h > botY){ onDeath('pipe'); return; }
      }
      if (!p.scored && p.x + 50 < player.x){ p.scored = true; Game.score += 100; }
    }
  },
  drawFlappy(ctx){
    if (!this.state) return;
    for (const p of this.state.pipes){
      const topH = p.gapCenter - p.gap/2;
      const botY = p.gapCenter + p.gap/2;
      ctx.fillStyle = '#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=8;
      ctx.fillRect(p.x, 0, 50, topH);
      ctx.fillRect(p.x, botY, 50, ctx.canvas.height - botY);
      ctx.fillStyle = '#2ad910';
      ctx.fillRect(p.x-3, topH-12, 56, 12);
      ctx.fillRect(p.x-3, botY, 56, 12);
      ctx.shadowBlur=0;
    }
  },

  // ─────────── L8 TUNNEL SURFER (3 lanes) ───────────
  initTunnel(player, groundY, endX){
    this.active = 'tunnel';
    this.state = { lane: 1, lanes:[groundY-28, groundY-28, groundY-28], obstacles:[], endX };
    // Spawn obstacles
    let x = 1200;
    while (x < endX){
      const lane = Math.floor(Math.random()*3);
      const type = Math.random() < 0.5 ? 'high' : 'low';
      this.state.obstacles.push({ x, lane, type, hit:false });
      // Coin trail in a different lane
      const coinLane = (lane + 1 + Math.floor(Math.random()*2)) % 3;
      for (let i=0;i<5;i++){
        Coins.spawn({ kind:'yellow', x: x - 100 + i*22, y: this._tunnelY(coinLane, groundY) });
      }
      x += 360 + Math.random()*200;
    }
    player.tunnelLane = 1;
  },
  _tunnelY(lane, g){ return g - 40 + (lane - 1) * 60; },
  tickTunnel(player, scrollSpeed, onDeath, inputs){
    if (inputs.leftPressed && player.tunnelLane > 0) player.tunnelLane--;
    if (inputs.rightPressed && player.tunnelLane < 2) player.tunnelLane++;
    // Smooth y toward target lane y
    const targetY = this._tunnelY(player.tunnelLane, player.groundY);
    player.y += (targetY - player.y) * 0.25;
    for (const o of this.state.obstacles){
      o.x -= scrollSpeed;
      if (o.hit) continue;
      if (o.lane === player.tunnelLane && o.x < player.x + player.w && o.x + 40 > player.x){
        // Use crouch/jump to dodge: high = crouch, low = jump
        if (o.type === 'high' && !inputs.crouchHeld){ onDeath('tunnelHigh'); return; }
        if (o.type === 'low' && !inputs.jumping){ onDeath('tunnelLow'); return; }
        o.hit = true;
      }
    }
  },
  drawTunnel(ctx){
    if (!this.state) return;
    const g = Game.h * 0.82;
    // Lane lines
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
    for (let i=0;i<4;i++){
      const y = g - 70 + i * 30;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Game.w, y); ctx.stroke();
    }
    for (const o of this.state.obstacles){
      const y = this._tunnelY(o.lane, g);
      ctx.fillStyle = o.type === 'high' ? '#ff3344' : '#39ff14';
      ctx.shadowColor = o.type === 'high' ? '#ff3344' : '#39ff14';
      ctx.shadowBlur = 8;
      if (o.type === 'high') ctx.fillRect(o.x, y - 40, 40, 26);
      else ctx.fillRect(o.x, y + 14, 40, 20);
      ctx.shadowBlur = 0;
    }
  },

  // ─────────── L11 JETPACK ───────────
  initJetpack(player, groundY, endX){
    this.active = 'jetpack';
    this.state = { lasers:[], missiles:[], nextMissileT:0, endX };
    player.setMode('ship');
    // Pre-spawn lasers
    let x = 1000;
    while (x < endX){
      this.state.lasers.push({ x, y: 80 + Math.random()*(groundY-160), h: 6, w: 200, hit:false });
      x += 200 + Math.random()*180;
    }
  },
  tickJetpack(player, scrollSpeed, onDeath){
    // Lasers
    for (const l of this.state.lasers){
      l.x -= scrollSpeed;
      if (l.hit) continue;
      if (player.x + player.w > l.x && player.x < l.x + l.w
        && player.y + player.h > l.y && player.y < l.y + l.h){ onDeath('laser'); return; }
    }
    // Missiles (homing)
    if (--this.state.nextMissileT <= 0){
      this.state.nextMissileT = 180;
      this.state.missiles.push({ x: Game.w + 60, y: player.y, warn: 60 });
    }
    for (const m of this.state.missiles){
      if (m.warn > 0){ m.warn--; m.x = Game.w - 80; continue; }
      const dx = player.x - m.x; const dy = player.y - m.y;
      const d = Math.sqrt(dx*dx+dy*dy)||1;
      m.x += (dx/d) * 5;
      m.y += (dy/d) * 3;
      if (m.x + 20 > player.x && m.x < player.x + player.w
        && m.y + 20 > player.y && m.y < player.y + player.h){ onDeath('missile'); return; }
    }
    this.state.missiles = this.state.missiles.filter(m => m.x > -100);
  },
  drawJetpack(ctx){
    if (!this.state) return;
    for (const l of this.state.lasers){
      ctx.fillStyle = '#ff2dd4'; ctx.shadowColor='#ff2dd4'; ctx.shadowBlur=12;
      ctx.fillRect(l.x, l.y, l.w, l.h);
    }
    for (const m of this.state.missiles){
      if (m.warn > 0){
        ctx.strokeStyle = '#ffe600';
        ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI*2); ctx.stroke();
      } else {
        ctx.fillStyle = '#ff3344'; ctx.shadowColor='#ff3344'; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.moveTo(m.x+12, m.y); ctx.lineTo(m.x, m.y-8); ctx.lineTo(m.x-6, m.y); ctx.lineTo(m.x, m.y+8); ctx.closePath(); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  },

  // ─────────── L12 PAC-MAZE ───────────
  initPacman(player, groundY, endX){
    this.active = 'pacman';
    this.state = { ghosts:[], powerT:0, dots:[], endX };
    // Pellets in line
    for (let x=800; x < endX; x += 24) this.state.dots.push({ x, y: groundY - 60, eaten:false });
    // Few power pellets
    for (let x=1600; x < endX; x += 1800) this.state.dots.push({ x, y: groundY - 60, eaten:false, power:true });
    // Ghosts
    for (let i=0;i<3;i++){
      this.state.ghosts.push({ x: Game.w + i*200, y: groundY - 80, dir:-1, color:['#ff3344','#ff8d3c','#ff2dd4'][i], fright:0 });
    }
  },
  tickPacman(player, scrollSpeed, onDeath){
    // Dots
    for (const d of this.state.dots){
      d.x -= scrollSpeed;
      if (!d.eaten && Math.abs(d.x - (player.x+player.w/2)) < 14 && Math.abs(d.y - (player.y+player.h/2)) < 14){
        d.eaten = true;
        Game.score += 10;
        if (d.power){ this.state.powerT = 600; }
      }
    }
    // Ghosts
    for (const g of this.state.ghosts){
      g.x -= scrollSpeed;
      // Sine sway
      g.y += Math.sin(performance.now()/300 + g.x*0.01) * 0.6;
      if (this.state.powerT > 0){ g.fright = 1; g.x += 2; }
      else { g.fright = 0; const dx = player.x - g.x; g.x += Math.sign(dx)*0.6; }
      if (Math.abs(g.x - (player.x+player.w/2)) < 16 && Math.abs(g.y - (player.y+player.h/2)) < 16){
        if (this.state.powerT > 0){ g.x = -200; Game.score += 200; }
        else { onDeath('ghost'); return; }
      }
    }
    if (this.state.powerT > 0) this.state.powerT--;
  },
  drawPacman(ctx){
    if (!this.state) return;
    for (const d of this.state.dots){
      if (d.eaten) continue;
      ctx.fillStyle = d.power ? '#ffe600' : '#ffdc00';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.power?6:3, 0, Math.PI*2); ctx.fill();
    }
    for (const g of this.state.ghosts){
      ctx.fillStyle = g.fright ? '#3333ff' : g.color;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 14, Math.PI, 0);
      ctx.lineTo(g.x+14, g.y+10);
      ctx.lineTo(g.x+8, g.y+6);
      ctx.lineTo(g.x, g.y+10);
      ctx.lineTo(g.x-8, g.y+6);
      ctx.lineTo(g.x-14, g.y+10);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(g.x-5, g.y-2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(g.x+5, g.y-2, 3, 0, Math.PI*2); ctx.fill();
    }
  },

  // ─────────── L13 CROSSY ───────────
  initCrossy(player, groundY, endX){
    this.active = 'crossy';
    this.state = { lanes:[], endX };
    // Build alternating road/river/safe lanes spanning the level
    let x = 1000;
    while (x < endX){
      const kind = ['safe','road','river','safe'][Math.floor(Math.random()*4)];
      this.state.lanes.push({ x, w: 80, kind, vehicles:[] });
      if (kind === 'road' || kind === 'river'){
        for (let i=0;i<3;i++){
          this.state.lanes[this.state.lanes.length-1].vehicles.push({
            offset: Math.random()*600, speed: 2 + Math.random()*4, kind
          });
        }
      }
      x += 90;
    }
  },
  tickCrossy(player, scrollSpeed, onDeath){
    for (const ln of this.state.lanes){
      ln.x -= scrollSpeed;
      // Check player overlap with vehicles
      if (player.x + player.w > ln.x && player.x < ln.x + ln.w){
        for (const v of ln.vehicles){
          v.offset += v.speed;
          const vy = player.groundY - 50 + (ln.kind === 'river' ? -10 : 0);
          const vx = ln.x + ((v.offset) % 600);
          if (Math.abs(vx - (player.x+player.w/2)) < 20 && Math.abs(vy - (player.y+player.h/2)) < 16){
            if (ln.kind === 'road'){ onDeath('car'); return; }
          }
        }
      }
    }
  },
  drawCrossy(ctx){
    if (!this.state) return;
    const g = Game.h * 0.82;
    for (const ln of this.state.lanes){
      ctx.fillStyle = ln.kind === 'safe' ? '#4caf50' : ln.kind === 'road' ? '#222' : '#2196f3';
      ctx.fillRect(ln.x, g - 60, ln.w, 50);
      for (const v of ln.vehicles){
        const vx = ln.x + ((v.offset) % 600) - 20;
        const vy = g - 50 + (ln.kind === 'river' ? -10 : 0);
        ctx.fillStyle = ln.kind === 'road' ? '#ffe600' : '#a8884d';
        ctx.fillRect(vx, vy, 40, 16);
      }
    }
  },

  // ─────────── L14 TRON ───────────
  initTron(player, groundY, endX){
    this.active = 'tron';
    this.state = { trails:[[]], aiCycles:[
      { x: Game.w + 200, y: groundY-200, dir:0, trail:[], color:'#ff3344' },
      { x: Game.w + 400, y: groundY-100, dir:0, trail:[], color:'#39ff14' }
    ], endX };
    player.setMode('cube'); player.gravityDir = 0; player.vy = 0;
    player.tronDir = 0; // 0=right, 1=down, 2=left, 3=up
  },
  tickTron(player, scrollSpeed, onDeath, inputs){
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    if (inputs.leftPressed) player.tronDir = 2;
    if (inputs.rightPressed) player.tronDir = 0;
    if (inputs.upPressed) player.tronDir = 3;
    if (inputs.downPressed) player.tronDir = 1;
    const [dx,dy] = dirs[player.tronDir];
    player.x += dx * 4; player.y += dy * 4;
    if (player.x < 0 || player.x > Game.w || player.y < 0 || player.y > Game.h){ onDeath('wall'); return; }
    // Trail
    const t = this.state.trails[0];
    t.push({ x: player.x + player.w/2, y: player.y + player.h/2 });
    if (t.length > 400) t.shift();
    // Self collide (skip latest 8 segments)
    for (let i=0;i<t.length-12;i++){
      if (Math.abs(t[i].x - (player.x+player.w/2)) < 6 && Math.abs(t[i].y - (player.y+player.h/2)) < 6){ onDeath('selfTrail'); return; }
    }
    // AI cycles
    for (const ai of this.state.aiCycles){
      ai.x -= scrollSpeed * 0.5;
      ai.trail.push({ x: ai.x, y: ai.y });
      if (ai.trail.length > 200) ai.trail.shift();
      // Player collides with ai trail
      for (const seg of ai.trail){
        if (Math.abs(seg.x - (player.x+player.w/2)) < 6 && Math.abs(seg.y - (player.y+player.h/2)) < 6){ onDeath('aiTrail'); return; }
      }
    }
  },
  drawTron(ctx){
    if (!this.state) return;
    // Player trail
    ctx.strokeStyle = '#00ffd5'; ctx.lineWidth=3; ctx.shadowColor='#00ffd5'; ctx.shadowBlur=10;
    ctx.beginPath();
    const t = this.state.trails[0];
    for (let i=0;i<t.length;i++){ if (i===0) ctx.moveTo(t[i].x,t[i].y); else ctx.lineTo(t[i].x,t[i].y); }
    ctx.stroke();
    // AI trails
    for (const ai of this.state.aiCycles){
      ctx.strokeStyle = ai.color; ctx.shadowColor = ai.color;
      ctx.beginPath();
      for (let i=0;i<ai.trail.length;i++){ if (i===0) ctx.moveTo(ai.trail[i].x,ai.trail[i].y); else ctx.lineTo(ai.trail[i].x,ai.trail[i].y); }
      ctx.stroke();
      ctx.fillStyle = ai.color;
      ctx.fillRect(ai.x-6, ai.y-6, 12, 12);
    }
    ctx.shadowBlur=0;
  },

  // ─────────── L16 BOSS T-REX REX ───────────
  initBoss(player, groundY, endX){
    this.active = 'boss';
    this.hp = 300; this.maxHp = 300; this.bossPhase = 1;
    this.state = { phaseT:0, attacks:[], endX };
    player.setMode('cube');
  },
  tickBoss(player, scrollSpeed, onDeath){
    this.state.phaseT++;
    // Phase 1: stomp shockwaves
    if (this.bossPhase === 1){
      if (player.mode !== 'cube') player.setMode('cube');
      if (this.state.phaseT % 90 === 0){
        this.state.attacks.push({ kind:'shock', x: Game.w, y: player.groundY-10, vx:-8, life:120 });
      }
      if (this.state.phaseT > 60*60){ this.bossPhase = 2; this.state.phaseT = 0; player.setMode('ship'); }
    }
    // Phase 2: fire breath
    else if (this.bossPhase === 2){
      if (player.mode !== 'ship') player.setMode('ship');
      if (this.state.phaseT % 60 === 0){
        const fy = 80 + Math.random()*(Game.h - 200);
        this.state.attacks.push({ kind:'fire', x: Game.w, y: fy, vx:-9, life:160, h:20 });
      }
      if (this.state.phaseT > 60*90){ this.bossPhase = 3; this.state.phaseT = 0; player.setMode('wave'); }
    }
    // Phase 3: mixed chaos
    else if (this.bossPhase === 3){
      if (player.mode !== 'wave') player.setMode('wave');
      if (this.state.phaseT % 70 === 0){
        const fy = 100 + Math.random()*(Game.h - 240);
        this.state.attacks.push({ kind:'shard', x: Game.w, y: fy, vx:-12, life:120 });
      }
      if (this.state.phaseT > 60*90){
        // boss defeated
        this.hp = 0;
      }
    }
    // Move attacks + collide
    for (const a of this.state.attacks){
      a.x += a.vx;
      a.life--;
      if (a.x < player.x + player.w && a.x + 30 > player.x){
        if (Math.abs((a.y) - (player.y + player.h/2)) < 30){
          onDeath(a.kind); return;
        }
      }
    }
    this.state.attacks = this.state.attacks.filter(a => a.life > 0 && a.x > -50);
    // HP slowly drops as time goes
    this.hp = Math.max(0, this.maxHp - (this.state.phaseT + (this.bossPhase-1)*60*60)*0.04);
  },
  drawBoss(ctx){
    if (!this.state) return;
    // Background giant Rex silhouette
    ctx.save();
    ctx.fillStyle = 'rgba(80,20,20,.5)';
    ctx.beginPath();
    ctx.moveTo(Game.w - 200, Game.h*0.82);
    ctx.lineTo(Game.w - 220, Game.h*0.3);
    ctx.lineTo(Game.w - 140, Game.h*0.2);
    ctx.lineTo(Game.w - 80, Game.h*0.25);
    ctx.lineTo(Game.w - 60, Game.h*0.5);
    ctx.lineTo(Game.w - 100, Game.h*0.82);
    ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#ff3344';
    ctx.beginPath(); ctx.arc(Game.w - 140, Game.h*0.28, 6 + Math.sin(performance.now()/200)*2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // Attacks
    for (const a of this.state.attacks){
      if (a.kind === 'shock'){
        ctx.strokeStyle = '#ffe600'; ctx.shadowColor='#ffe600'; ctx.shadowBlur=10; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(a.x, a.y, 30, 0, Math.PI, true); ctx.stroke();
      } else if (a.kind === 'fire'){
        ctx.fillStyle = '#ff5b1f'; ctx.shadowColor='#ff5b1f'; ctx.shadowBlur=14;
        ctx.fillRect(a.x, a.y - 10, 80, 20);
      } else {
        ctx.fillStyle = '#ff2dd4'; ctx.shadowColor='#ff2dd4'; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x+30, a.y-8); ctx.lineTo(a.x+30, a.y+8); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur=0;
    }
    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(Game.w/2 - 200, 16, 400, 18);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(Game.w/2 - 198, 18, 396 * (this.hp / this.maxHp), 14);
    ctx.font = '700 12px Oxanium'; ctx.fillStyle = '#fff'; ctx.textAlign='center';
    ctx.fillText(`T-REX REX — PHASE ${this.bossPhase}/3`, Game.w/2, 30);
  }
};
