// First-run + replayable tutorial briefings
import { Storage } from './storage.js';
import { UI } from './ui.js';

const MODE_TIPS = {
  cube:'Tap to jump. Hold longer for higher jump. ↓ to crouch.',
  ship:'Hold to thrust up, release to fall.',
  ball:'Tap to flip gravity instantly.',
  spider:'Tap to teleport to the opposite surface.',
  wave:'Hold to angle up, release to angle down (45°).'
};

export const Tutorial = {
  seenModes: new Set(),
  enabled: true,
  load(){
    this.enabled = !Storage.get('skipTutorial', false);
    this.seenModes = new Set(Storage.get('seenModes', []));
  },
  save(){ Storage.set('seenModes', [...this.seenModes]); },
  reset(){ this.seenModes = new Set(); Storage.set('seenModes', []); },
  setSkip(v){ Storage.set('skipTutorial', v); this.enabled = !v; },
  briefMode(mode){
    if (!this.enabled) return;
    if (this.seenModes.has(mode)) return;
    this.seenModes.add(mode); this.save();
    UI.toast(`▶ ${mode.toUpperCase()}: ${MODE_TIPS[mode]||''}`, '#00f0ff');
  },
  briefTooltip(key, text){
    if (!this.enabled) return;
    if (this.seenModes.has(key)) return;
    this.seenModes.add(key); this.save();
    UI.toast(text, '#ffe600');
  }
};
