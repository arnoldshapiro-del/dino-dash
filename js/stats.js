// Stats — filled in Phase 4
import { Storage } from './storage.js';
export const Stats = {
  data: null,
  load(){
    this.data = Storage.get('stats', {
      runs:0, distance:0, coins:0, jumps:0, time:0,
      bestByMode:{cube:0,ship:0,ball:0,spider:0,wave:0},
      deathsBy:{}, timePerMode:{cube:0,ship:0,ball:0,spider:0,wave:0},
      levelsCompleted:0, totalStars:0, combo:0,
      teleports:0, secretCoins:0
    });
    return this.data;
  },
  save(){ Storage.set('stats', this.data); },
  bump(key, n=1){ if(!this.data) this.load(); this.data[key] = (this.data[key]||0)+n; this.save(); }
};
