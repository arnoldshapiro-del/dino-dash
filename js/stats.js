// Lifetime stats
import { Storage } from './storage.js';

const DEFAULTS = {
  runs:0, distance:0, coins:0, jumps:0, timeS:0,
  bestByMode:{cube:0,ship:0,ball:0,spider:0,wave:0},
  bestOverall:0,
  deathsBy:{}, timePerMode:{cube:0,ship:0,ball:0,spider:0,wave:0},
  levelsCompleted:0, totalStars:0, maxCombo:0,
  teleports:0, secretCoins:0, cactiJumped:0,
  missionsCompleted:0, dailiesCompleted:0,
  gravFlips:0
};

export const Stats = {
  data: null,
  load(){
    this.data = Object.assign({}, DEFAULTS, Storage.get('stats', {}));
    if (!this.data.bestByMode) this.data.bestByMode = {...DEFAULTS.bestByMode};
    if (!this.data.timePerMode) this.data.timePerMode = {...DEFAULTS.timePerMode};
    if (!this.data.deathsBy) this.data.deathsBy = {};
    return this.data;
  },
  save(){ Storage.set('stats', this.data); },
  bump(key, n=1){ if(!this.data) this.load(); this.data[key] = (this.data[key]||0)+n; this.save(); },
  applyRun(runStats){
    if (!this.data) this.load();
    this.data.runs++;
    this.data.distance += Math.floor(runStats.distance||0);
    this.data.coins += runStats.coins||0;
    this.data.jumps += runStats.jumps||0;
    this.data.timeS += Math.floor(runStats.timeS||0);
    this.data.cactiJumped += runStats.cactiJumped||0;
    this.data.teleports += runStats.teleports||0;
    this.data.secretCoins += runStats.secretCoins||0;
    this.data.gravFlips += runStats.gravFlips||0;
    this.data.maxCombo = Math.max(this.data.maxCombo, runStats.maxCombo||0);
    if (runStats.score > this.data.bestOverall) this.data.bestOverall = Math.floor(runStats.score);
    if (runStats.modeTimes){
      for (const [m, t] of Object.entries(runStats.modeTimes)){
        this.data.timePerMode[m] = (this.data.timePerMode[m]||0) + t/60;
      }
    }
    if (runStats.deathCause){
      this.data.deathsBy[runStats.deathCause] = (this.data.deathsBy[runStats.deathCause]||0)+1;
    }
    this.save();
  }
};

// Run-scoped accumulator
export function newRunStats(){
  return {
    score:0, coins:0, jumps:0, timeS:0, distance:0,
    cactiJumped:0, teleports:0, secretCoins:0, gravFlips:0,
    portals:0, orbs:0, pads:0, shieldsUsed:0,
    uniquePowerUps:new Set(), modesVisited:new Set(['cube']),
    modeTimes:{cube:0,ship:0,ball:0,spider:0,wave:0},
    cubeOnlyScore:0, totalPowerUps:0,
    powerCounts:{}, powerDurations:{},
    maxCombo:0, maxSpeedScale:1, deathCause:null,
    crouchedDistance:0, noCrouchDistance:0,
    orbChain:0
  };
}
