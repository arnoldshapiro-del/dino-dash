// Daily challenge — seeded by date so every player gets the same one each day
import { Storage } from './storage.js';
import { MISSION_POOL } from './missions.js';

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function seedFromKey(key){
  let h = 0;
  for (const c of key) h = (h*31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export const Daily = {
  current: null,
  claimed: false,
  load(){
    const key = todayKey();
    const stored = Storage.get('daily', null);
    if (stored && stored.key === key){
      this.current = stored.mission;
      this.claimed = stored.claimed;
    } else {
      const seed = seedFromKey(key);
      const idx = seed % MISSION_POOL.length;
      this.current = { ...MISSION_POOL[idx], reward: 500, dp: 50, key };
      this.claimed = false;
      this.save();
    }
  },
  save(){ Storage.set('daily', { key: todayKey(), mission: this.current, claimed: this.claimed }); },
  // Called when daily-mission condition becomes true; returns reward { coins, dp } or null
  claim(){
    if (!this.current || this.claimed) return null;
    this.claimed = true;
    this.save();
    return { coins: this.current.reward, dp: this.current.dp };
  },
  // Time until reset
  countdown(){
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
    const ms = tomorrow - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000)/60000);
    return `${h}h ${m}m`;
  }
};
