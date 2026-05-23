// Particle pool — filled in Phase 10 (light version available now)
const POOL_SIZE = 500;
const pool = [];
for (let i=0;i<POOL_SIZE;i++) pool.push({active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:1,size:2,color:'#fff'});

export const Particles = {
  emit(x, y, opts={}){
    const n = opts.count || 8;
    for (let i=0;i<n;i++){
      const p = pool.find(p=>!p.active);
      if (!p) return;
      p.active = true;
      p.x = x; p.y = y;
      const a = (opts.angle != null) ? opts.angle + (Math.random()-0.5)*(opts.spread||Math.PI*2) : Math.random()*Math.PI*2;
      const sp = (opts.speed||3) * (0.5 + Math.random()*0.7);
      p.vx = Math.cos(a)*sp; p.vy = Math.sin(a)*sp;
      p.life = p.maxLife = (opts.life||40);
      p.size = opts.size || 3;
      p.color = opts.color || '#fff';
      p.gravity = opts.gravity || 0.1;
    }
  },
  tick(){
    for (const p of pool){
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      p.life--;
      if (p.life <= 0) p.active = false;
    }
  },
  draw(ctx){
    for (const p of pool){
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },
  clear(){ for (const p of pool) p.active = false; }
};
