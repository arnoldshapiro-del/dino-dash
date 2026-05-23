// Unified input handler — keyboard, mouse, touch, gamepad, swipe
// Emits semantic actions: action, actionUp, crouch, crouchUp, left, right, pause, mute, restart, practice, checkpoint, unCheckpoint
const listeners = new Map();
const heldKeys = new Set();
let actionHeld = false;
let crouchHeld = false;
let lastTouchX = 0, lastTouchY = 0;
let touchStartT = 0;
let swipeAxis = null;

export function onInput(name, fn){
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name).delete(fn);
}
function emit(name, data){
  const set = listeners.get(name);
  if (set) set.forEach(fn => { try{ fn(data||{}); }catch(e){ console.warn(e); } });
}

export const Input = {
  init(){
    window.addEventListener('keydown', e => {
      if (heldKeys.has(e.code)) return;
      heldKeys.add(e.code);
      const k = e.code;
      if (k==='Space' || k==='ArrowUp' || k==='KeyW'){ actionHeld = true; emit('action'); e.preventDefault(); }
      else if (k==='ArrowDown' || k==='KeyS'){ crouchHeld = true; emit('crouch'); e.preventDefault(); }
      else if (k==='ArrowLeft' || k==='KeyA') emit('left');
      else if (k==='ArrowRight' || k==='KeyD') emit('right');
      else if (k==='Escape') emit('pause');
      else if (k==='KeyM') emit('mute');
      else if (k==='KeyR') emit('restart');
      else if (k==='KeyP') emit('practice');
      else if (k==='KeyC') emit('checkpoint');
      else if (k==='KeyX') emit('unCheckpoint');
      emit('keydown', { code:k, key:e.key });
    });
    window.addEventListener('keyup', e => {
      heldKeys.delete(e.code);
      const k = e.code;
      if (k==='Space' || k==='ArrowUp' || k==='KeyW'){ actionHeld = false; emit('actionUp'); }
      else if (k==='ArrowDown' || k==='KeyS'){ crouchHeld = false; emit('crouchUp'); }
      emit('keyup', { code:k, key:e.key });
    });

    const canvas = document.getElementById('game');
    canvas.addEventListener('mousedown', e => { actionHeld = true; emit('action'); e.preventDefault(); });
    window.addEventListener('mouseup', () => { if (actionHeld){ actionHeld = false; emit('actionUp'); } });

    canvas.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      lastTouchX = t.clientX; lastTouchY = t.clientY;
      touchStartT = performance.now();
      swipeAxis = null;
      actionHeld = true; emit('action');
      e.preventDefault();
    }, { passive:false });
    canvas.addEventListener('touchmove', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - lastTouchX, dy = t.clientY - lastTouchY;
      if (!swipeAxis){
        if (Math.abs(dx)>30 || Math.abs(dy)>30) swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (swipeAxis==='y' && dy>50){ if(!crouchHeld){ crouchHeld = true; emit('crouch'); } }
      if (swipeAxis==='x'){
        if (dx>50){ emit('right'); lastTouchX = t.clientX; }
        else if (dx<-50){ emit('left'); lastTouchX = t.clientX; }
      }
      e.preventDefault();
    }, { passive:false });
    canvas.addEventListener('touchend', e => {
      const dt = performance.now() - touchStartT;
      if (dt>700 && !swipeAxis) emit('pause');
      actionHeld = false; emit('actionUp');
      if (crouchHeld){ crouchHeld = false; emit('crouchUp'); }
      swipeAxis = null;
      e.preventDefault();
    }, { passive:false });

    // Gamepad polling
    window.addEventListener('gamepadconnected', () => {
      if (!this._gpLoop){
        this._gpLoop = true;
        const poll = () => {
          const pads = navigator.getGamepads ? navigator.getGamepads() : [];
          for (const p of pads){
            if (!p) continue;
            const A = p.buttons[0]?.pressed;
            if (A && !this._gpA){ actionHeld = true; emit('action'); }
            else if (!A && this._gpA){ actionHeld = false; emit('actionUp'); }
            this._gpA = A;
            const D = p.buttons[13]?.pressed;
            if (D && !this._gpD){ crouchHeld = true; emit('crouch'); }
            else if (!D && this._gpD){ crouchHeld = false; emit('crouchUp'); }
            this._gpD = D;
          }
          requestAnimationFrame(poll);
        };
        poll();
      }
    });
  },
  isHeld(){ return actionHeld; },
  isCrouched(){ return crouchHeld; },
  isKey(code){ return heldKeys.has(code); }
};
