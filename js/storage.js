// localStorage wrapper — all keys prefixed "dinoDash_"
const P = 'dinoDash_';
export const Storage = {
  get(k, fallback=null){
    try{ const v = localStorage.getItem(P+k); return v==null ? fallback : JSON.parse(v); }
    catch(_){ return fallback; }
  },
  set(k, v){
    try{ localStorage.setItem(P+k, JSON.stringify(v)); }catch(_){}
  },
  del(k){ try{ localStorage.removeItem(P+k); }catch(_){} },
  clear(){
    try{
      const keys = [];
      for (let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if (k && k.startsWith(P)) keys.push(k);
      }
      keys.forEach(k=>localStorage.removeItem(k));
    }catch(_){}
  }
};
