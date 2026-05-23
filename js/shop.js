// Shop UI: 4 tabs — upgrades, consumables, skins, trails
import { Economy, UPGRADES, CONSUMABLES, SKINS, TRAILS } from './economy.js';
import { Achievements } from './achievements.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

let currentTab = 'upgrades';

export const Shop = {
  open(onClose){
    Economy.load();
    Achievements.load();
    this.render(onClose);
  },
  render(onClose){
    const html = `
      <h1>SHOP</h1>
      <div class="row" style="font:700 16px Oxanium">
        <span style="color:#ffd700">◎ ${Economy.coins}</span>
        <span style="color:#b300ff">◆ ${Economy.dp}</span>
      </div>
      <div class="tabbar">
        <button class="tab ${currentTab==='upgrades'?'active':''}" data-tab="upgrades">UPGRADES</button>
        <button class="tab ${currentTab==='consumables'?'active':''}" data-tab="consumables">CONSUMABLES</button>
        <button class="tab ${currentTab==='skins'?'active':''}" data-tab="skins">SKINS</button>
        <button class="tab ${currentTab==='trails'?'active':''}" data-tab="trails">TRAILS</button>
      </div>
      <div id="shop-body" class="grid shop-grid"></div>
      <button class="btn alt" id="btn-shop-close">CLOSE</button>
    `;
    UI.showScreen('shop', html);
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => { currentTab = t.dataset.tab; this.render(onClose); });
    document.getElementById('btn-shop-close').onclick = () => { onClose?.(); };
    this.renderTab();
  },
  renderTab(){
    const body = document.getElementById('shop-body');
    body.innerHTML = '';
    if (currentTab === 'upgrades') this._renderUpgrades(body);
    else if (currentTab === 'consumables') this._renderConsumables(body);
    else if (currentTab === 'skins') this._renderSkins(body);
    else if (currentTab === 'trails') this._renderTrails(body);
  },
  _renderUpgrades(body){
    for (const u of UPGRADES){
      const tier = Economy.tier(u.id);
      const maxed = tier >= u.tiers.length;
      const next = maxed ? null : u.tiers[tier];
      const can = next ? Economy.canUpgrade(u.id) : false;
      const card = document.createElement('div');
      card.className = 'card' + (tier > 0 ? ' owned' : '');
      card.innerHTML = `
        <div class="icon">${u.icon}</div>
        <div class="name">${u.name}</div>
        <div class="desc">${u.desc}</div>
        <div class="tier">Tier ${tier}/${u.tiers.length}</div>
        ${ maxed ? `<div class="cost" style="color:#39ff14">MAX</div>` :
           `<div class="cost dp">◆ ${next.dp}</div><div class="cost">◎ ${next.c}</div>
            <button class="btn" ${can?'':'disabled style="opacity:.4"'} data-buy="${u.id}">BUY T${tier+1}</button>` }
      `;
      body.appendChild(card);
    }
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const ok = Economy.upgrade(b.dataset.buy);
      if (ok){ Audio.sfx('purchase'); UI.toast('Upgrade purchased!', '#39ff14'); this.render(); }
      else UI.toast('Insufficient funds', '#ff3344');
    });
  },
  _renderConsumables(body){
    for (const c of CONSUMABLES){
      const have = Economy.consumables[c.id] || 0;
      const maxed = c.max && have >= c.max;
      const can = !maxed && Economy.coins >= c.cost;
      const card = document.createElement('div');
      card.className = 'card' + (have > 0 ? ' owned' : '');
      card.innerHTML = `
        <div class="icon">${c.icon}</div>
        <div class="name">${c.name}</div>
        <div class="desc">${c.desc}</div>
        <div class="tier">Owned ${have}${c.max?'/'+c.max:''}</div>
        ${maxed ? `<div class="cost" style="color:#39ff14">MAX</div>` :
          `<div class="cost">◎ ${c.cost}</div>
           <button class="btn" ${can?'':'disabled style="opacity:.4"'} data-buy="${c.id}">BUY</button>`}
      `;
      body.appendChild(card);
    }
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const ok = Economy.buyConsumable(b.dataset.buy);
      if (ok){ Audio.sfx('purchase'); UI.toast('Purchased!', '#39ff14'); this.render(); }
      else UI.toast('Insufficient funds', '#ff3344');
    });
  },
  _renderSkins(body){
    for (const s of SKINS){
      const owned = Economy.ownsSkin(s.id);
      const equipped = Economy.currentSkin === s.id;
      const unlockable = !owned && this._skinUnlockable(s);
      const locked = !owned && !unlockable;
      const card = document.createElement('div');
      card.className = 'card' + (owned ? ' owned' : '') + (locked ? ' locked' : '');
      const swatch = s.color === 'rainbow' ? 'linear-gradient(90deg,red,orange,yellow,green,blue,purple)' : s.color;
      card.innerHTML = `
        <div class="icon" style="height:30px;background:${swatch};border-radius:4px"></div>
        <div class="name">${s.name}</div>
        <div class="desc">${s.desc}</div>
        ${owned ? (equipped ? `<button class="btn" disabled style="opacity:.5">EQUIPPED</button>` :
                              `<button class="btn" data-eq="${s.id}">EQUIP</button>`)
                : (s.konami ? `<div class="cost" style="color:#ff2dd4">KONAMI ONLY</div>` :
                              `<div class="cost dp">◆ ${s.dp}</div>
                               <button class="btn" ${Economy.dp>=s.dp?'':'disabled style="opacity:.4"'} data-buy="${s.id}">BUY</button>`)}
      `;
      body.appendChild(card);
    }
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const ok = Economy.buySkin(b.dataset.buy);
      if (ok){ Audio.sfx('purchase'); UI.toast('Skin unlocked!', '#39ff14'); this.render(); }
      else UI.toast('Insufficient DP', '#ff3344');
    });
    body.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      Economy.equipSkin(b.dataset.eq); UI.toast('Equipped!', '#00f0ff'); this.render();
    });
  },
  _skinUnlockable(s){
    if (s.achievement && Achievements.isUnlocked(s.achievement)) return true;
    return false;
  },
  _renderTrails(body){
    for (const t of TRAILS){
      const owned = Economy.ownsTrail(t.id);
      const equipped = Economy.currentTrail === t.id;
      const card = document.createElement('div');
      card.className = 'card' + (owned ? ' owned' : '');
      card.innerHTML = `
        <div class="icon" style="font-size:18px">${t.name}</div>
        <div class="name">${t.name}</div>
        <div class="desc">Cosmetic trail effect</div>
        ${owned ? (equipped ? `<button class="btn" disabled style="opacity:.5">EQUIPPED</button>` :
                              `<button class="btn" data-eq="${t.id}">EQUIP</button>`)
                : `<div class="cost">◎ ${t.cost}</div>
                   <button class="btn" ${Economy.coins>=t.cost?'':'disabled style="opacity:.4"'} data-buy="${t.id}">BUY</button>`}
      `;
      body.appendChild(card);
    }
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const ok = Economy.buyTrail(b.dataset.buy);
      if (ok){ Audio.sfx('purchase'); UI.toast('Trail unlocked!', '#39ff14'); this.render(); }
      else UI.toast('Insufficient coins', '#ff3344');
    });
    body.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      Economy.equipTrail(b.dataset.eq); UI.toast('Equipped!', '#00f0ff'); this.render();
    });
  },
  // Auto-grant achievement skins
  syncAchievementSkins(){
    Achievements.load();
    for (const s of SKINS){
      if (s.achievement && Achievements.isUnlocked(s.achievement) && !Economy.ownsSkin(s.id)){
        Economy.skinsOwned.add(s.id);
        UI.toast(`Skin unlocked: ${s.name}`, '#ffd700');
      }
    }
    Economy.save();
  }
};
