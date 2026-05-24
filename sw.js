const VERSION = 'dinodash-v3-5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.svg',
  './js/main.js',
  './js/game.js',
  './js/player.js',
  './js/modes.js',
  './js/input.js',
  './js/storage.js',
  './js/ui.js',
  './js/parallax.js',
  './js/portals.js',
  './js/orbs.js',
  './js/powerups.js',
  './js/coins.js',
  './js/particles.js',
  './js/obstacles.js',
  './js/chunkgen.js',
  './js/achievements.js',
  './js/missions.js',
  './js/daily.js',
  './js/stats.js',
  './js/economy.js',
  './js/shop.js',
  './js/levels.js',
  './js/worldmap.js',
  './js/levelplayer.js',
  './js/speciallevels.js',
  './js/practice.js',
  './js/tutorial.js',
  './js/skins.js',
  './js/audio.js',
  './js/firebase-sync.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(()=>null)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // Don't intercept Firebase / Google domains — auth needs live network
  if (url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('google') ||
      url.hostname.includes('firestore')) return;
  e.respondWith(
    caches.match(r).then(hit => hit || fetch(r).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => { try { c.put(r, copy); } catch(_){} });
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
