// 20 achievements. Each: id, name, desc, check(runStats, lifetime) -> bool, dpReward, skinReward?
import { Storage } from './storage.js';
import { UI } from './ui.js';

export const ACHIEVEMENTS = [
  { id:'firstSteps',   name:'First Steps',     desc:'Complete your first run',          dp:50  },
  { id:'cactusSlayer', name:'Cactus Slayer',   desc:'Jump 100 cacti (lifetime)',        dp:50  },
  { id:'portalMaster', name:'Portal Master',   desc:'Hit all 5 mode portals in one run',dp:100, skin:'neonCube' },
  { id:'coinCollector',name:'Coin Collector',  desc:'Collect 100 coins (lifetime)',     dp:50  },
  { id:'wealthyDino',  name:'Wealthy Dino',    desc:'Collect 1,000 coins (lifetime)',   dp:100 },
  { id:'treasureHunter',name:'Treasure Hunter',desc:'Find a gold secret coin',          dp:100, skin:'pixelBird' },
  { id:'shieldSurvivor',name:'Shield Survivor',desc:'Survive a hit with a shield',      dp:50  },
  { id:'speedDemon',   name:'Speed Demon',     desc:'Reach 4x speed in a run',          dp:100 },
  { id:'miniMaster',   name:'Mini Master',     desc:'Spend 30s in mini mode',           dp:75  },
  { id:'waveRider',    name:'Wave Rider',      desc:'Spend 30s in wave mode',           dp:75  },
  { id:'spiderStyle',  name:'Spider Style',    desc:'50 spider teleports (lifetime)',   dp:75  },
  { id:'comboKing',    name:'Combo King',      desc:'10 coin combo without missing',    dp:100 },
  { id:'score1k',      name:'Score 1K',        desc:'Score 1,000 in one run',           dp:25  },
  { id:'score10k',     name:'Score 10K',       desc:'Score 10,000 in one run',          dp:100, skin:'glowCat' },
  { id:'score50k',     name:'Score 50K',       desc:'Score 50,000 in one run',          dp:250, skin:'robotSkull' },
  { id:'marathon',     name:'Marathon',        desc:'Survive 5 minutes in one run',     dp:150 },
  { id:'pacifist',     name:'Pacifist',        desc:'5,000 without crouching',          dp:100 },
  { id:'orbAce',       name:'Orb Ace',         desc:'5 orbs without touching ground',   dp:100 },
  { id:'dedicated',    name:'Dedicated',       desc:'Complete 50 runs',                 dp:200, skin:'crystal' },
  { id:'konami',       name:'Konami',          desc:'↑↑↓↓←→←→BA on title',             dp:500, skin:'rainbowDino' }
];

export const Achievements = {
  unlocked: new Set(),
  load(){
    const arr = Storage.get('achievements', []);
    this.unlocked = new Set(arr);
  },
  save(){ Storage.set('achievements', [...this.unlocked]); },
  isUnlocked(id){ return this.unlocked.has(id); },
  unlock(id, onUnlock){
    if (this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    this.save();
    const def = ACHIEVEMENTS.find(a=>a.id===id);
    if (def){
      UI.toast(`🏆 ${def.name} — +${def.dp} DP`, '#ffd700');
      onUnlock?.(def);
    }
    return true;
  },
  // Convenience checks called from run-end + during run
  check(stat, val, lifetime, onUnlock){
    // stat-driven
    switch(stat){
      case 'cactiJumped':
        if (lifetime.cactiJumped >= 100) this.unlock('cactusSlayer', onUnlock);
        break;
      case 'coins':
        if (lifetime.coins >= 100) this.unlock('coinCollector', onUnlock);
        if (lifetime.coins >= 1000) this.unlock('wealthyDino', onUnlock);
        break;
      case 'goldCoin':
        this.unlock('treasureHunter', onUnlock);
        break;
      case 'shieldSurvive':
        this.unlock('shieldSurvivor', onUnlock);
        break;
      case 'speedScale':
        if (val >= 4) this.unlock('speedDemon', onUnlock);
        break;
      case 'miniTime':
        if (val >= 1800) this.unlock('miniMaster', onUnlock);
        break;
      case 'waveTime':
        if (val >= 1800) this.unlock('waveRider', onUnlock);
        break;
      case 'teleports':
        if (lifetime.teleports >= 50) this.unlock('spiderStyle', onUnlock);
        break;
      case 'combo':
        if (val >= 10) this.unlock('comboKing', onUnlock);
        break;
      case 'score':
        if (val >= 1000) this.unlock('score1k', onUnlock);
        if (val >= 10000) this.unlock('score10k', onUnlock);
        if (val >= 50000) this.unlock('score50k', onUnlock);
        break;
      case 'runDuration':
        if (val >= 300) this.unlock('marathon', onUnlock);
        break;
      case 'noCrouchDistance':
        if (val >= 5000) this.unlock('pacifist', onUnlock);
        break;
      case 'orbChain':
        if (val >= 5) this.unlock('orbAce', onUnlock);
        break;
      case 'runs':
        if (lifetime.runs >= 50) this.unlock('dedicated', onUnlock);
        break;
      case 'firstRun':
        this.unlock('firstSteps', onUnlock);
        break;
      case 'portalsInRun':
        // val = Set of modes hit
        if (val && val.size >= 5) this.unlock('portalMaster', onUnlock);
        break;
      case 'konami':
        this.unlock('konami', onUnlock);
        break;
    }
  }
};
