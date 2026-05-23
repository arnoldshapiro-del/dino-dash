// UI: HUD overlays + menus + screens
import { Storage } from './storage.js';

const layer = () => document.getElementById('ui-layer');

let screens = {};
let toastTimer = null;

export const UI = {
  clear(){
    layer().innerHTML = '';
    screens = {};
  },
  showScreen(id, html){
    this.clear();
    const div = document.createElement('div');
    div.className = 'screen menu';
    div.id = 'screen-' + id;
    div.innerHTML = html;
    layer().appendChild(div);
    screens[id] = div;
    return div;
  },
  showHud(html){
    let h = layer().querySelector('.hud');
    if (!h){
      h = document.createElement('div');
      h.className = 'hud';
      layer().appendChild(h);
    }
    h.innerHTML = html;
    return h;
  },
  hideHud(){
    const h = layer().querySelector('.hud');
    if (h) h.remove();
  },
  toast(text, color){
    const existing = layer().querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    if (color) t.style.borderColor = color;
    layer().appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 3600);
  },
  removeScreen(id){
    if (screens[id]){ screens[id].remove(); delete screens[id]; }
  },
  formatNumber(n){ return Math.floor(n).toString().padStart(5,'0'); }
};

export function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k,v]) => {
    if (k==='class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c==null) return;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}
