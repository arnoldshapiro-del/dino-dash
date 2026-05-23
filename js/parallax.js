// 3-layer parallax background — all canvas-drawn, no images
// Layer 0: stars (10% speed). Layer 1: mountains (40% speed). Layer 2: grid floor (100% speed)
const STAR_COUNT = 200;
let stars = null;
let mountains = null;
let scrollX = 0;
let palette = ['#0a0420','#2d1b4e','#ff4d8f','#ff8d3c'];

export function setPalette(p){ palette = p; }
export function getPalette(){ return palette; }

function initStars(w, h){
  stars = [];
  for (let i=0;i<STAR_COUNT;i++){
    stars.push({
      x: Math.random()*w,
      y: Math.random()*h*0.7,
      r: Math.random()*1.5 + 0.3,
      tw: Math.random()*Math.PI*2
    });
  }
}
function initMountains(w){
  mountains = [];
  let x = 0;
  while (x < w * 2.5){
    const peakW = 80 + Math.random()*120;
    const peakH = 60 + Math.random()*120;
    mountains.push({ x, w:peakW, h:peakH });
    x += peakW * 0.8;
  }
}

export function scroll(dx){ scrollX += dx; }

export function draw(ctx, w, h, beatPulse){
  // Background gradient
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, palette[0]);
  g.addColorStop(0.5, palette[1]);
  g.addColorStop(0.85, palette[2]);
  g.addColorStop(1, palette[3]);
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

  if (!stars) initStars(w, h);
  if (!mountains) initMountains(w);

  // Layer 0: stars (10% speed)
  const s0 = scrollX * 0.1;
  ctx.fillStyle = '#fff';
  for (const s of stars){
    const x = ((s.x - s0) % w + w) % w;
    s.tw += 0.03;
    const a = 0.6 + Math.sin(s.tw)*0.3 + (beatPulse||0)*0.2;
    ctx.globalAlpha = Math.max(0,Math.min(1,a));
    ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Layer 1: mountains (40% speed)
  const s1 = scrollX * 0.4;
  const groundY = h * 0.78;
  ctx.fillStyle = `rgba(20,8,50,${0.85 + (beatPulse||0)*0.1})`;
  for (const m of mountains){
    const x = ((m.x - s1) % (w*2) + (w*2)) % (w*2) - w*0.5;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + m.w/2, groundY - m.h);
    ctx.lineTo(x + m.w, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // Layer 2: Tron perspective grid floor (100% speed)
  const gy = h * 0.82;
  ctx.strokeStyle = `rgba(0,240,255,${0.35 + (beatPulse||0)*0.25})`;
  ctx.lineWidth = 1;
  for (let i=0;i<10;i++){
    const t = i / 10;
    const yLine = gy + t * (h - gy);
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(w, yLine);
    ctx.stroke();
  }
  const s2 = scrollX % 60;
  for (let i=-2;i<24;i++){
    const baseX = i * 60 - s2;
    ctx.beginPath();
    ctx.moveTo(baseX, gy);
    const vanish = w/2;
    const slope = (vanish - baseX);
    ctx.lineTo(baseX + slope, h);
    ctx.stroke();
  }
}
