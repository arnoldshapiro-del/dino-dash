// Economy — filled in Phase 5
import { Storage } from './storage.js';
export const Economy = {
  coins:0, dp:0, upgrades:{}, consumables:{},
  load(){ this.coins = Storage.get('totalCoins',0); this.dp = Storage.get('dashPoints',0); this.upgrades = Storage.get('upgrades',{}); this.consumables = Storage.get('consumables',{}); },
  save(){ Storage.set('totalCoins',this.coins); Storage.set('dashPoints',this.dp); Storage.set('upgrades',this.upgrades); Storage.set('consumables',this.consumables); },
  addCoins(n){ this.coins+=n; this.save(); },
  addDP(n){ this.dp+=n; this.save(); },
  spend(coins=0, dp=0){ if(this.coins<coins||this.dp<dp) return false; this.coins-=coins; this.dp-=dp; this.save(); return true; }
};
