'use strict';
(function(root){
  // Persist this cursor in the SAME atomic file as game progress.
  class Progression{
    constructor(core,saved={},stepsPerAction=10){
      this.game=core;this.consumed=Number.isSafeInteger(saved.consumed)?saved.consumed:0;
      this.stepsPerAction=stepsPerAction;this.foreground=false;this.pausedAt=Number.isFinite(saved.pausedAt)?saved.pausedAt:0;
      // Game recreates nextTick at launch. Restore its old clock before shifting
      // paused presentation waits; otherwise the entire offline interval is added twice.
      if(this.pausedAt>0)this.game.nextTick=Number.isFinite(saved.nextTick)?saved.nextTick:this.pausedAt;
      this.game.data.workTokens=0;
    }
    pause(now){if(!this.foreground)return;this.foreground=false;this.pausedAt=now;this.game.data.workTokens=0;}
    resume(now){if(this.foreground)return;this.shift(Math.max(0,now-(this.pausedAt||now)));this.foreground=true;this.pausedAt=0;}
    shift(delta){
      const g=this.game,d=g.data;g.nextTick+=delta;if(d.switchUntil)d.switchUntil+=delta;
      if(g.presentation?.())g.presentation().at+=delta;
      if(d.pendingBattle)d.pendingBattle.at+=delta;
      for(const e of [d.animation,d.captureAnimation])if(e){e.at+=delta;if(e.leadIn)e.leadIn.at+=delta;}
    }
    step(now){
      const g=this.game;if(g.presentation?.())return g.sceneTick(now);
      g.data.workTokens=250;
      const changed=g.tick(now);g.data.workTokens=0;
      if(changed)root.MobileCore.nursery.advance(g,250,now);
      return changed;
    }
    live(now){return this.foreground&&this.step(now);}
    catchUp(total,now,maxActions=100){
      if(!Number.isSafeInteger(total)||total<this.consumed)return 0;
      const count=Math.min(maxActions,Math.floor((total-this.consumed)/this.stepsPerAction));
      if(!count)return 0;
      const g=this.game;let used=0;
      for(;used<count;used++){
        // Manual dialogue must preserve every unspent walking action.
        if(g.presentation?.())break;
        // Safari replaces walking actions only. Foreground play keeps its
        // ordinary battles, and a saved dialogue never spends unseen steps.
        if(g.walkingStep?.(this.stepsPerAction,now)){this.consumed+=this.stepsPerAction;continue;}
        // Consume recorded activity immediately, never simulate a future calendar.
        // Only presentation waits are skipped; every game transition still uses tick().
        g.nextTick=Math.min(g.nextTick,now);g.data.switchUntil=Math.min(g.data.switchUntil||0,now);
        if(g.data.pendingBattle)g.data.pendingBattle.at=Math.min(g.data.pendingBattle.at,now);
        for(const e of [g.data.animation,g.data.captureAnimation])if(e){e.at=Math.min(e.at,now-86400000);if(e.leadIn)e.leadIn.at=Math.min(e.leadIn.at,now-86400000);}
        if(!this.step(now))break;
        this.consumed+=this.stepsPerAction;
      }
      return used;
    }
    checkpoint(){return {consumed:this.consumed,pausedAt:this.pausedAt,nextTick:this.game.nextTick};}
  }
  root.MobileProgression=Progression;if(typeof module==='object')module.exports=Progression;
})(globalThis);
