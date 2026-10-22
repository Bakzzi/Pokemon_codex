'use strict';
(function(root){
  // Persist this cursor in the SAME atomic file as game progress.
  class Progression{
    constructor(core,saved={},stepsPerAction=10){
      this.game=core;this.consumed=Number.isSafeInteger(saved.consumed)?saved.consumed:0;
      this.lockConsumed=Number.isSafeInteger(saved.lockConsumed)?saved.lockConsumed:0;
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
      if(d.kantoWorld?.walk)d.kantoWorld.walk.at+=delta;
      for(const e of [d.animation,d.captureAnimation])if(e){e.at+=delta;if(e.leadIn)e.leadIn.at+=delta;}
    }
    step(now){
      const g=this.game;if(g.presentation?.())return g.sceneTick(now);
      g.data.workTokens=250;
      const changed=g.tick(now);g.data.workTokens=0;
      if(changed)root.MobileCore.nursery.advance(g,250,now);
      return changed;
    }
    observe(totals){this.game.lockEpoch=Number.isSafeInteger(totals.lockEpoch)?totals.lockEpoch:0;}
    walkingReady(steps){return Number.isSafeInteger(steps)&&steps>=this.consumed+this.stepsPerAction;}
    live(now,totals={}){
      if(!this.foreground)return false;
      const g=this.game,b=g.data.battle;
      if(g.presentation?.())return g.sceneTick(now);
      if(b?.kind==='trainer'||b?.storyId)return this.step(now);
      if(g.controlTick(now))return true;
      // New foreground steps use ordinary animation waits, one paid action at a
      // time. The offline fast-forward path must not hide these live actions.
      if(!this.walkingReady(totals.steps)||now<g.nextTick||now<g.data.switchUntil)return false;
      if(b)delete b.resumeAfterLock;
      if(!g.walkingStep?.(this.stepsPerAction,now)&&!this.step(now))return false;
      this.consumed+=this.stepsPerAction;return true;
    }
    catchUp(total,now,maxActions=100){
      const steps=typeof total==='object'?total.steps:total,locked=typeof total==='object'?total.lockMillis:0;
      this.observe(typeof total==='object'?total:{});
      const available=(n,cost,cursor)=>Number.isSafeInteger(n)&&n>=cursor?Math.floor((n-cursor)/cost):0;
      const g=this.game;let used=0;
      for(;used<maxActions;used++){
        const walking=available(steps,this.stepsPerAction,this.consumed)>0;
        if(!walking&&!available(locked,10000,this.lockConsumed))break;
        // Manual dialogue must preserve every unspent walking action.
        if(g.presentation?.()||g.data.battle?.kind==='trainer'||g.data.battle?.storyId)break;
        if(g.data.battle?.resumeAfterLock!==undefined){
          if(!walking&&g.lockEpoch<=g.data.battle.resumeAfterLock)break;
          delete g.data.battle.resumeAfterLock;
        }
        // Safari replaces walking actions only. Foreground play keeps its
        // ordinary battles, and a saved dialogue never spends unseen steps.
        if(walking&&g.walkingStep?.(this.stepsPerAction,now)){this.consumed+=this.stepsPerAction;continue;}
        // Consume recorded activity immediately, never simulate a future calendar.
        // Only presentation waits are skipped; every game transition still uses tick().
        g.nextTick=Math.min(g.nextTick,now);g.data.switchUntil=Math.min(g.data.switchUntil||0,now);
        if(g.data.kantoWorld?.walk)g.data.kantoWorld.walk.at=Math.min(g.data.kantoWorld.walk.at,now-g.data.kantoWorld.walk.duration);
        if(g.data.pendingBattle)g.data.pendingBattle.at=Math.min(g.data.pendingBattle.at,now);
        for(const e of [g.data.animation,g.data.captureAnimation])if(e){e.at=Math.min(e.at,now-86400000);if(e.leadIn)e.leadIn.at=Math.min(e.leadIn.at,now-86400000);}
        if(!g.data.battle&&g.data.pendingActions.some(a=>a.kind==='travel')&&g.controlTick(now)){used--;continue;}
        if(!this.step(now))break;
        if(walking)this.consumed+=this.stepsPerAction;else this.lockConsumed+=10000;
      }
      return used;
    }
    checkpoint(){return {consumed:this.consumed,lockConsumed:this.lockConsumed,pausedAt:this.pausedAt,nextTick:this.game.nextTick};}
  }
  root.MobileProgression=Progression;if(typeof module==='object')module.exports=Progression;
})(globalThis);
