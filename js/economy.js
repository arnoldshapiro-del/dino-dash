// Dual currency wrapper + upgrade/consumable persistence
import { Storage } from './storage.js';

// Prices cut ~50-60% across the board so upgrades feel reachable in
// short sessions. Coin pickup value is also doubled in coins.js.
export const UPGRADES = [
  { id:'shieldDur',   name:'Shield Duration',   icon:'🛡️', desc:'Shield lasts longer; T1 grants start-of-run shield',
    tiers:[ {dp:25, c:200}, {dp:75, c:600}, {dp:200, c:2000} ] },
  { id:'magnetDur',   name:'Coin Magnet',       icon:'🧲', desc:'+2s & +50px radius per tier',
    tiers:[ {dp:20, c:150}, {dp:50, c:400}, {dp:125, c:1200} ] },
  { id:'slowDur',     name:'Slow-Mo Duration',  icon:'⏱️', desc:'+1/+2/+3s per tier',
    tiers:[ {dp:20, c:200}, {dp:50, c:500}, {dp:125, c:1400} ] },
  { id:'scoreMul',    name:'Score Multiplier',  icon:'✨', desc:'+2/5/10% baseline score',
    tiers:[ {dp:40, c:300}, {dp:100, c:1000}, {dp:250, c:3000} ] },
  { id:'coinValue',   name:'Coin Value',        icon:'◎', desc:'+10/25/50% per coin',
    tiers:[ {dp:30, c:200}, {dp:75, c:600}, {dp:175, c:1800} ] },
  { id:'luckyDrops',  name:'Lucky Drops',       icon:'🎲', desc:'+10/25/50% power-up spawn rate',
    tiers:[ {dp:25, c:200}, {dp:60, c:600}, {dp:150, c:1600} ] },
  { id:'jumpPower',   name:'Jump Power',        icon:'⬆️', desc:'+5/10/15% cube jump height',
    tiers:[ {dp:35, c:300}, {dp:85, c:800}, {dp:200, c:2000} ] },
  { id:'reviveFreq',  name:'Revive Frequency',  icon:'❤️', desc:'1 free revive every 5/3/1 runs',
    tiers:[ {dp:50, c:400}, {dp:125, c:1200}, {dp:300, c:3200} ] }
];

export const CONSUMABLES = [
  { id:'reviveToken',  name:'Revive Token',      icon:'❤️', desc:'One free continue from death (stack 5)',  cost:100,  max:5 },
  { id:'headStart',    name:'Head Start',        icon:'🚀', desc:'Start next run at 2000 score',           cost:250 },
  { id:'mysteryCharge',name:'Mystery Box Charge',icon:'💎', desc:'Guaranteed mystery box next run',         cost:150 },
  { id:'powerPack',    name:'Power-Up Pack',     icon:'⭐', desc:'Guaranteed 3 power-ups next run',         cost:200 },
  { id:'scoreBoost',   name:'Score Boost',       icon:'✨', desc:'5x multiplier first 30s of next run',     cost:500 },
  { id:'practicePass', name:'Practice Pass 24h', icon:'🎯', desc:'Unlimited practice for 24h',             cost:50 }
];

export const SKINS = [
  { id:'classic',      name:'Classic Dino', desc:'Default skin', cost:0, defaultOwned:true, color:'#00f0ff' },
  { id:'neonCube',     name:'Neon Cube',    desc:'Earned by Portal Master OR 250 DP', dp:250, achievement:'portalMaster', color:'#39ff14' },
  { id:'pixelBird',    name:'Pixel Bird',   desc:'Earned by Treasure Hunter OR 350 DP', dp:350, achievement:'treasureHunter', color:'#ffe600' },
  { id:'glowCat',      name:'Glow Cat',     desc:'Earned by Score 10K OR 500 DP', dp:500, achievement:'score10k', color:'#ff2dd4' },
  { id:'robotSkull',   name:'Robot Skull',  desc:'Earned by Score 50K OR 1000 DP', dp:1000, achievement:'score50k', color:'#cccccc' },
  { id:'crystal',      name:'Crystal',      desc:'Earned by Dedicated OR 750 DP', dp:750, achievement:'dedicated', color:'#a0e7ff' },
  { id:'firePhoenix',  name:'Fire Phoenix', desc:'Shop only', dp:1500, color:'#ff5b1f' },
  { id:'galaxy',       name:'Galaxy',       desc:'Shop only', dp:2500, color:'#b300ff' },
  { id:'glitch',       name:'Glitch',       desc:'Complete World 3 OR 5000 DP', dp:5000, world3:true, color:'#ff3344' },
  { id:'rainbowDino',  name:'Rainbow Dino', desc:'Konami only', konami:true, color:'rainbow' }
];

export const TRAILS = [
  { id:'dots',     name:'Dots',         cost:0, defaultOwned:true },
  { id:'line',     name:'Solid Line',   cost:200 },
  { id:'rainbow',  name:'Rainbow',      cost:600 },
  { id:'sparkle',  name:'Sparkles',     cost:1000 },
  { id:'none',     name:'None',         cost:0, defaultOwned:true }
];

export const Economy = {
  coins: 0, dp: 0,
  upgrades: {},   // id -> tier (0..3)
  consumables: {},// id -> qty
  skinsOwned: new Set(['classic']),
  trailsOwned: new Set(['dots','none']),
  currentSkin: 'classic',
  currentTrail: 'dots',
  practicePassUntil: 0,
  runsSinceRevive: 0,

  load(){
    this.coins = Storage.get('totalCoins', 0);
    this.dp = Storage.get('dashPoints', 0);
    this.upgrades = Storage.get('upgrades', {});
    this.consumables = Storage.get('consumables', {});
    this.skinsOwned = new Set(Storage.get('skinsOwned', ['classic']));
    this.trailsOwned = new Set(Storage.get('trailsOwned', ['dots','none']));
    this.currentSkin = Storage.get('currentSkin', 'classic');
    this.currentTrail = Storage.get('currentTrail', 'dots');
    this.practicePassUntil = Storage.get('practicePassUntil', 0);
    this.runsSinceRevive = Storage.get('runsSinceRevive', 0);
  },
  save(){
    Storage.set('totalCoins', this.coins);
    Storage.set('dashPoints', this.dp);
    Storage.set('upgrades', this.upgrades);
    Storage.set('consumables', this.consumables);
    Storage.set('skinsOwned', [...this.skinsOwned]);
    Storage.set('trailsOwned', [...this.trailsOwned]);
    Storage.set('currentSkin', this.currentSkin);
    Storage.set('currentTrail', this.currentTrail);
    Storage.set('practicePassUntil', this.practicePassUntil);
    Storage.set('runsSinceRevive', this.runsSinceRevive);
  },
  addCoins(n){ this.coins += n; this.save(); },
  addDP(n){ this.dp += n; this.save(); },
  spend(coins=0, dp=0){
    if (this.coins<coins || this.dp<dp) return false;
    this.coins -= coins; this.dp -= dp; this.save(); return true;
  },
  // Upgrade tier 0=not bought, 1-3 = tier
  tier(id){ return this.upgrades[id] || 0; },
  canUpgrade(id){
    const def = UPGRADES.find(u=>u.id===id); if (!def) return false;
    const t = this.tier(id); if (t>=def.tiers.length) return false;
    const cost = def.tiers[t];
    return this.coins>=cost.c && this.dp>=cost.dp;
  },
  upgrade(id){
    const def = UPGRADES.find(u=>u.id===id); if (!def) return false;
    const t = this.tier(id); if (t>=def.tiers.length) return false;
    const cost = def.tiers[t];
    if (!this.spend(cost.c, cost.dp)) return false;
    this.upgrades[id] = t+1; this.save();
    return true;
  },
  buyConsumable(id){
    const def = CONSUMABLES.find(c=>c.id===id); if (!def) return false;
    const have = this.consumables[id] || 0;
    if (def.max && have >= def.max) return false;
    if (!this.spend(def.cost, 0)) return false;
    this.consumables[id] = have + 1;
    if (id === 'practicePass') this.practicePassUntil = Date.now() + 86400000;
    this.save();
    return true;
  },
  useConsumable(id){
    if ((this.consumables[id]||0) > 0){ this.consumables[id]--; this.save(); return true; }
    return false;
  },
  ownsSkin(id){ return this.skinsOwned.has(id); },
  buySkin(id){
    const s = SKINS.find(x=>x.id===id); if (!s) return false;
    if (this.ownsSkin(id)) return false;
    if (s.konami) return false;
    if (!this.spend(0, s.dp||0)) return false;
    this.skinsOwned.add(id); this.save(); return true;
  },
  equipSkin(id){ if (this.ownsSkin(id)){ this.currentSkin = id; this.save(); return true; } return false; },
  ownsTrail(id){ return this.trailsOwned.has(id); },
  buyTrail(id){
    const t = TRAILS.find(x=>x.id===id); if (!t || this.ownsTrail(id)) return false;
    if (!this.spend(t.cost, 0)) return false;
    this.trailsOwned.add(id); this.save(); return true;
  },
  equipTrail(id){ if (this.ownsTrail(id)){ this.currentTrail = id; this.save(); return true; } return false; },
  hasPracticePass(){ return Date.now() < this.practicePassUntil; },

  // Computed upgrade bonuses
  bonuses(){
    const t = (id) => this.tier(id);
    return {
      shieldDur:    [0,60,120,180][t('shieldDur')],     // extra frames (60fps)
      magnetDur:    [0,120,240,360][t('magnetDur')],
      magnetRadius: [0,50,100,150][t('magnetDur')],
      slowDur:      [0,60,120,180][t('slowDur')],
      scoreMul:     [0,0.02,0.05,0.10][t('scoreMul')],
      coinValue:    [0,0.10,0.25,0.50][t('coinValue')],
      luckyDrops:   [0,0.10,0.25,0.50][t('luckyDrops')],
      jumpPower:    [0,0.05,0.10,0.15][t('jumpPower')],
      reviveFreq:   [0,5,3,1][t('reviveFreq')],
      startShield:  t('shieldDur') >= 1
    };
  }
};
