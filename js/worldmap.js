// World map: 4 worlds, levels laid out as connected nodes
import { LEVELS, Levels } from './levels.js';
import { UI } from './ui.js';

const WORLD_BG = {
  1: 'linear-gradient(180deg, #ff8d3c, #ff4d8f, #4a2058)',
  2: 'linear-gradient(180deg, #0a0420, #2d1b4e, #ff4d8f)',
  3: 'linear-gradient(180deg, #220a0a, #4a1a1a, #ff3344)',
  4: 'linear-gradient(180deg, #1a0408, #3a0814, #ff1144)'
};
const WORLD_NAME = { 1:'DAWN RIDERS', 2:'CROSSROADS', 3:'APOCALYPSE', 4:'THE END' };

export const WorldMap = {
  open(onPlay, onPractice, onBack){
    Levels.load();
    let world = 1;
    const render = () => {
      const html = `
        <div style="font:800 36px Oxanium;color:#fff;text-shadow:0 0 12px rgba(0,240,255,.6);text-transform:uppercase;letter-spacing:3px">WORLD ${world}: ${WORLD_NAME[world]}</div>
        <div style="font:600 14px Space Mono;color:#cfe9ff">Stars: ${Levels.totalStars()}/48</div>
        <div id="worldmap-body" style="position:relative;width:min(960px,95vw);height:360px;border-radius:12px;background:${WORLD_BG[world]};box-shadow:0 0 40px rgba(0,240,255,.25);overflow:hidden"></div>
        <div class="row">
          <button class="btn" id="w-prev" ${world===1?'disabled style="opacity:.4"':''}>◀ PREV</button>
          <button class="btn" id="w-next" ${world===4?'disabled style="opacity:.4"':''}>NEXT ▶</button>
          <button class="btn alt" id="w-back">BACK</button>
        </div>
      `;
      UI.showScreen('worldmap', html);
      const body = document.getElementById('worldmap-body');
      const levels = LEVELS.filter(l => l.world === world);
      const W = body.clientWidth || 800;
      const H = 360;
      levels.forEach((l, i) => {
        const x = (W / (levels.length + 1)) * (i+1) - 44;
        const y = H/2 - 44 + Math.sin(i * 1.3) * 50;
        const node = document.createElement('div');
        const stars = Levels.stars(l.id);
        const unlocked = Levels.isUnlocked(l.id);
        node.className = 'world-node' + (unlocked ? '' : ' locked');
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.innerHTML = `
          <div style="text-align:center;line-height:1.1">
            <div style="font-size:11px">L${i+1}</div>
            <div style="font-size:9px;font-weight:400">${unlocked ? l.name.slice(0,8) : '???'}</div>
            <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
          </div>`;
        node.onclick = () => {
          if (!unlocked){ UI.toast(`Unlock by clearing ${l.unlockReq}`, '#ff3344'); return; }
          this._showBriefing(l, onPlay, onPractice);
        };
        body.appendChild(node);
        // Connection line to previous
        if (i > 0){
          const prev = levels[i-1];
          const conn = document.createElement('div');
          conn.className = 'world-conn';
          const prevX = (W / (levels.length + 1)) * i;
          const prevY = H/2 + Math.sin((i-1) * 1.3) * 50;
          const dx = (x+44) - prevX;
          const dy = (y+44) - prevY;
          const dist = Math.sqrt(dx*dx+dy*dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          conn.style.left = prevX + 'px';
          conn.style.top = prevY + 'px';
          conn.style.width = dist + 'px';
          conn.style.transform = `rotate(${angle}deg)`;
          body.appendChild(conn);
        }
      });
      document.getElementById('w-prev').onclick = () => { if (world>1){ world--; render(); } };
      document.getElementById('w-next').onclick = () => { if (world<4){ world++; render(); } };
      document.getElementById('w-back').onclick = onBack;
    };
    render();
  },
  _showBriefing(level, onPlay, onPractice){
    const stars = Levels.stars(level.id);
    const modeIcons = level.modes.map(m => ({cube:'🟦',ship:'🚀',ball:'⚪',spider:'🕷️',wave:'⚡'})[m]).join(' ');
    UI.showScreen('briefing', `
      <h1 style="font-size:42px">${level.name}</h1>
      <p>${level.theme}</p>
      <div class="briefing">
        <div style="font:700 16px Oxanium">Modes: ${modeIcons}</div>
        <div style="font:600 13px Space Mono;color:#cfe9ff">Length: ${level.length}s · Speed: ${level.speed}x</div>
        <div style="font:700 15px Oxanium;color:#ffd700">⭐ Objectives:</div>
        <ul style="font:400 12px Space Mono;color:#fff;line-height:1.6;text-align:left">
          <li>${stars>=1?'✅':'☆'} Complete the level</li>
          <li>${stars>=2?'✅':'☆'} Finish with ≤2 deaths</li>
          <li>${stars>=3?'✅':'☆'} 0 deaths + collect all coins</li>
        </ul>
        <div class="row">
          <button class="btn" id="b-play">▶ PLAY</button>
          <button class="btn alt" id="b-prac">PRACTICE</button>
          <button class="btn" id="b-back">BACK</button>
        </div>
      </div>
    `);
    document.getElementById('b-play').onclick = () => onPlay(level);
    document.getElementById('b-prac').onclick = () => onPractice(level);
    document.getElementById('b-back').onclick = () => this.open(onPlay, onPractice, () => UI.toast('Back to title not wired'));
  }
};
