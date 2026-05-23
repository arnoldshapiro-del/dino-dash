// Procedural skin renderers — drawn via Player.skinColor + canvas fills
// Most skins simply override player draw color; rainbowDino uses time-based hue
import { Economy, SKINS } from './economy.js';

export const Skins = {
  current(){ return SKINS.find(s => s.id === Economy.currentSkin) || SKINS[0]; },
  colorAt(t){
    const s = this.current();
    if (s.id === 'rainbowDino') return `hsl(${(t/8)%360}, 100%, 60%)`;
    return s.color;
  },
  // Trail render hook called from particles/main per frame
  trailEmit(player, t){
    const trail = Economy.currentTrail;
    if (trail === 'none' || trail === 'dots') return; // handled by mode default
    // Other trails emit at player tail
    const x = player.x + player.w/2;
    const y = player.y + player.h/2;
    return { x, y, color: trail === 'rainbow' ? `hsl(${t%360},100%,60%)` : trail === 'sparkle' ? '#ffd700' : '#00f0ff' };
  }
};
