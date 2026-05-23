// Particle pool — fully wired in Phase 10
const POOL_SIZE = 500;
const pool = [];
for (let i=0;i<POOL_SIZE;i++) pool.push({active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:1,size:2,color:'#fff',text:null,gravity:0.1});
const texts = []; // float text { x,y,vy,text,color,life,maxLife }

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
    for (let i=texts.length-1;i>=0;i--){
      const t = texts[i]; t.y += t.vy; t.life--;
      if (t.life <= 0) texts.splice(i,1);
    }
  },
  draw(ctx){
    for (const p of pool){
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    for (const t of texts){
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color || '#fff';
      ctx.font = '800 16px Oxanium';
      ctx.textAlign='center';
      ctx.shadowColor = t.color || '#fff'; ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  },
  floatText(x, y, text, color='#fff'){
    texts.push({ x, y, vy: -1.5, text, color, life: 50, maxLife: 50 });
  },
  ring(x, y, count, color){
    for (let i=0;i<count;i++){
      const a = (i / count) * Math.PI * 2;
      const p = pool.find(p => !p.active); if (!p) return;
      p.active = true; p.x = x; p.y = y;
      p.vx = Math.cos(a)*6; p.vy = Math.sin(a)*6; p.gravity = 0;
      p.life = p.maxLife = 30; p.size = 4; p.color = color;
    }
  },
  clear(){ for (const p of pool) p.active = false; texts.length = 0; }
};
