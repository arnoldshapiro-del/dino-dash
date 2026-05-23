// 3 active rotating missions from a pool of 25
import { Storage } from './storage.js';
import { UI } from './ui.js';

export const MISSION_POOL = [
  { id:'jump50',     desc:'Jump 50 times in one run',       reward:300 },
  { id:'coin30',     desc:'Collect 30 coins in one run',    reward:200 },
  { id:'score3kCube',desc:'Reach 3,000 cube-only',          reward:400 },
  { id:'portal5',    desc:'Pass 5 portals in one run',      reward:500 },
  { id:'powerup3',   desc:'Use 3 different power-ups',      reward:300 },
  { id:'survive60',  desc:'Survive 60 seconds',             reward:200 },
  { id:'orb10',      desc:'Hit 10 orbs in one run',         reward:400 },
  { id:'secret2',    desc:'Collect 2 secret coins',         reward:500 },
  { id:'coin100',    desc:'Collect 100 coins in one run',   reward:600 },
  { id:'score5k',    desc:'Reach 5,000 score',              reward:300 },
  { id:'score10k',   desc:'Reach 10,000 score',             reward:600 },
  { id:'pad5',       desc:'Touch 5 pads in one run',        reward:200 },
  { id:'survive120', desc:'Survive 2 minutes',              reward:400 },
  { id:'teleport10', desc:'10 spider teleports in one run', reward:300 },
  { id:'shipMode30', desc:'30s in ship mode',               reward:300 },
  { id:'waveMode20', desc:'20s in wave mode',               reward:400 },
  { id:'shield2',    desc:'Use 2 shields in one run',       reward:300 },
  { id:'magnet3',    desc:'Pickup 3 magnets in one run',    reward:300 },
  { id:'combo15',    desc:'15 coin combo no miss',          reward:500 },
  { id:'flip10',     desc:'10 gravity flips in one run',    reward:300 },
  { id:'noPower3k',  desc:'3,000 without power-ups',        reward:400 },
  { id:'speed3x',    desc:'Reach 3x speed',                 reward:300 },
  { id:'jet15',      desc:'15s in jetpack',                 reward:400 },
  { id:'mystery2',   desc:'Open 2 mystery boxes',           reward:400 },
  { id:'allModes',   desc:'Use all 5 modes in one run',     reward:700 }
];

export const Missions = {
  active: [], // array of {id, progress, target, completed}
  load(){
    const stored = Storage.get('missions', null);
    if (stored && stored.length === 3){ this.active = stored; }
    else { this.roll(); }
  },
  save(){ Storage.set('missions', this.active); },
  roll(){
    const ids = MISSION_POOL.map(m=>m.id);
    const shuffled = ids.sort(() => Math.random()-0.5);
    this.active = shuffled.slice(0,3).map(id => ({ id, completed:false }));
    this.save();
  },
  get(id){ return MISSION_POOL.find(m=>m.id===id); },
  // Run completion handler: given runStats + lifetime, mark missions completed
  evaluate(runStats, onComplete){
    let allDone = true;
    for (const m of this.active){
      if (m.completed) continue;
      if (this._isComplete(m.id, runStats)){
        m.completed = true;
        const def = this.get(m.id);
        UI.toast(`✓ Mission: ${def.desc} (+${def.reward}c)`, '#39ff14');
        onComplete?.(def);
      } else { allDone = false; }
    }
    if (allDone && this.active.length === 3){
      UI.toast('All missions complete! +1000c bonus!', '#ffd700');
      onComplete?.({ reward:1000, bonus:true });
      this.roll();
    }
    this.save();
  },
  _isComplete(id, s){
    switch(id){
      case 'jump50':     return (s.jumps||0) >= 50;
      case 'coin30':     return (s.coins||0) >= 30;
      case 'score3kCube':return (s.cubeOnlyScore||0) >= 3000;
      case 'portal5':    return (s.portals||0) >= 5;
      case 'powerup3':   return (s.uniquePowerUps && s.uniquePowerUps.size >= 3);
      case 'survive60':  return (s.timeS||0) >= 60;
      case 'orb10':      return (s.orbs||0) >= 10;
      case 'secret2':    return (s.secretCoins||0) >= 2;
      case 'coin100':    return (s.coins||0) >= 100;
      case 'score5k':    return (s.score||0) >= 5000;
      case 'score10k':   return (s.score||0) >= 10000;
      case 'pad5':       return (s.pads||0) >= 5;
      case 'survive120': return (s.timeS||0) >= 120;
      case 'teleport10': return (s.teleports||0) >= 10;
      case 'shipMode30': return (s.modeTimes?.ship||0) >= 1800;
      case 'waveMode20': return (s.modeTimes?.wave||0) >= 1200;
      case 'shield2':    return (s.shieldsUsed||0) >= 2;
      case 'magnet3':    return (s.powerCounts?.magnet||0) >= 3;
      case 'combo15':    return (s.maxCombo||0) >= 15;
      case 'flip10':     return (s.gravFlips||0) >= 10;
      case 'noPower3k':  return (s.score||0) >= 3000 && (s.totalPowerUps||0) === 0;
      case 'speed3x':    return (s.maxSpeedScale||1) >= 3;
      case 'jet15':      return (s.powerDurations?.jetpack||0) >= 900;
      case 'mystery2':   return (s.powerCounts?.mystery||0) >= 2;
      case 'allModes':   return s.modesVisited && s.modesVisited.size >= 5;
      default: return false;
    }
  }
};
