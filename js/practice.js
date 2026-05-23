// Practice mode — checkpoint system
import { Game } from './game.js';

export const Practice = {
  enabled: false,
  checkpoints: [], // {scroll, y, mode, gravityDir}
  autoIntervalPx: 200,
  lastAutoAtPx: 0,

  toggle(){ this.enabled = !this.enabled; this.checkpoints = []; this.lastAutoAtPx = 0; },
  enable(){ this.enabled = true; this.checkpoints = []; this.lastAutoAtPx = 0; },
  disable(){ this.enabled = false; this.checkpoints = []; },

  tick(){
    if (!this.enabled || !Game.player) return;
    if (Game.scroll - this.lastAutoAtPx > this.autoIntervalPx){
      this.add();
      this.lastAutoAtPx = Game.scroll;
    }
  },
  add(){
    if (!Game.player) return;
    this.checkpoints.push({
      scroll: Game.scroll, y: Game.player.y, mode: Game.player.mode,
      gravityDir: Game.player.gravityDir, score: Game.score
    });
    if (this.checkpoints.length > 20) this.checkpoints.shift();
  },
  removeLast(){ this.checkpoints.pop(); },
  restore(){
    const cp = this.checkpoints[this.checkpoints.length-1];
    if (!cp || !Game.player) return false;
    Game.player.y = cp.y;
    Game.player.vy = 0;
    Game.player.setMode(cp.mode);
    Game.player.gravityDir = cp.gravityDir;
    Game.player.alive = true; Game.player.invuln = 60;
    return true;
  }
};
