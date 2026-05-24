// Firebase Auth + Firestore sync — saves localStorage state to a per-user
// document at users/{uid}/dinoDash so progress follows you across devices.
// Uses Arnie's shapiro-apps Firebase project (Google + Email sign-in enabled,
// Firestore rules: authenticated users can read/write own document).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBWKpWwPRFqjSxCmxSBpqZjLenlL7B7REU',
  authDomain: 'shapiro-apps.firebaseapp.com',
  projectId: 'shapiro-apps',
  storageBucket: 'shapiro-apps.appspot.com',
  messagingSenderId: '33734446646',
  appId: '1:33734446646:web:1d7df4012cf441b1c45297'
};

let app, auth, db;
let pushTimer = null;
const STORAGE_PREFIX = 'dinoDash_';

export const FirebaseSync = {
  user: null,
  status: 'idle', // 'idle' | 'signing-in' | 'signed-in' | 'error'
  lastError: null,
  onChange: null, // optional callback whenever auth state changes

  init(){
    if (app) return;
    try {
      app = initializeApp(FIREBASE_CONFIG);
      auth = getAuth(app);
      db = getFirestore(app);
      onAuthStateChanged(auth, async (u) => {
        this.user = u;
        this.status = u ? 'signed-in' : 'idle';
        if (u){
          // Pull saved state from cloud
          await this.pull();
        }
        if (this.onChange) try { this.onChange(this); } catch(_){}
      });
    } catch(e){
      console.warn('[FirebaseSync] init failed', e);
      this.lastError = e.message;
      this.status = 'error';
    }
  },

  async signIn(){
    this.init();
    if (!auth){ this.lastError = 'auth not ready'; return false; }
    this.status = 'signing-in';
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      return true;
    } catch(e){
      console.warn('[FirebaseSync] sign-in failed', e);
      this.lastError = e.message;
      this.status = 'error';
      return false;
    }
  },

  async signOut(){
    if (!auth) return;
    try { await signOut(auth); } catch(_){}
    this.user = null;
    this.status = 'idle';
  },

  // Pull cloud state → localStorage; only overwrites if cloud has newer data
  async pull(){
    if (!this.user || !db) return;
    try {
      const ref = doc(db, 'dinoDash', this.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const cloud = snap.data();
      const cloudTs = cloud._updatedAt?.seconds || 0;
      const localTs = +(localStorage.getItem(STORAGE_PREFIX + '_syncTs') || 0);
      // Always restore if local has nothing; otherwise newer wins
      const hasLocalData = !!localStorage.getItem(STORAGE_PREFIX + 'totalCoins');
      if (!hasLocalData || cloudTs > localTs){
        for (const [k, v] of Object.entries(cloud)){
          if (k.startsWith('_')) continue;
          try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); }
          catch(_){}
        }
        localStorage.setItem(STORAGE_PREFIX + '_syncTs', String(cloudTs * 1000));
        // Hot-reload game state without full page reload
        if (window.__reloadGameState) window.__reloadGameState();
      }
    } catch(e){
      console.warn('[FirebaseSync] pull failed', e);
    }
  },

  // Push localStorage → cloud. Debounced so rapid writes coalesce.
  schedulePush(){
    if (!this.user || !db) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => this._doPush(), 1500);
  },

  async _doPush(){
    if (!this.user || !db) return;
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if (!k || !k.startsWith(STORAGE_PREFIX) || k === STORAGE_PREFIX + '_syncTs') continue;
        const val = localStorage.getItem(k);
        try { data[k.slice(STORAGE_PREFIX.length)] = JSON.parse(val); }
        catch(_){ data[k.slice(STORAGE_PREFIX.length)] = val; }
      }
      data._updatedAt = serverTimestamp();
      const ref = doc(db, 'dinoDash', this.user.uid);
      await setDoc(ref, data, { merge: true });
      localStorage.setItem(STORAGE_PREFIX + '_syncTs', String(Date.now()));
    } catch(e){
      console.warn('[FirebaseSync] push failed', e);
    }
  }
};

// Patch localStorage so every game save triggers a debounced push to cloud
const _origSet = Storage.prototype.setItem;
Storage.prototype.setItem = function(k, v){
  _origSet.call(this, k, v);
  if (typeof k === 'string' && k.startsWith(STORAGE_PREFIX) && FirebaseSync.user){
    FirebaseSync.schedulePush();
  }
};
