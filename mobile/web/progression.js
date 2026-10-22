'use strict';
(function(root){
  // Persist this cursor in the SAME atomic file as game progress.
  class Progression{
    constructor(core,saved={}){
      this.game=core;this.consumed=Number.isSafeInteger(saved.consumed)?saved.consumed:0;
      this.dirty=false;
      this.lockConsumed=Number.isSafeInteger(saved.lockConsumed)?saved.lockConsumed:0;
      // Preserve the legacy step cursor for save compatibility; steps never buy actions.
      this.foreground=false;this.pausedAt=Number.isFinite(saved.pausedAt)?saved.pausedAt:0;
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
      if(d.johtoWorld?.walk)d.johtoWorld.walk.at+=delta;
      for(const e of [d.animation,d.captureAnimation])if(e){e.at+=delta;if(e.leadIn)e.leadIn.at+=delta;}
    }
    step(now){
      const g=this.game;if(g.presentation?.())return g.sceneTick(now);
      g.data.workTokens=250;
      const changed=g.tick(now);g.data.workTokens=0;
      if(changed)root.MobileCore.nursery.advance(g,250,now);
      return changed;
    }
    observe(totals){if(Number.isSafeInteger(totals.lockEpoch))this.game.lockEpoch=totals.lockEpoch;if(this.game.recordTravelSteps?.(totals.steps))this.dirty=true;}
    movementActive(){const d=this.game.data,w=d.johtoUnlocked?d.johtoWorld:d.kantoWorld;return !!d.battle?.movementTrainer||!d.battle&&!d.pendingBattle&&!!(w?.journey?.bankLeg||w?.journey?.bankCells>0);}
    movementTick(now){
      const g=this.game,d=g.data;if(!this.movementActive()||g.presentation?.()||d.battle&&!d.battle.movementTrainer)return false;
      const changed=d.battle?.movementTrainer?this.step(now):g.startMovementTrainer?.(now);
      if(changed)this.dirty=true;return !!changed;
    }
    skipWaits(now){
      const g=this.game;g.nextTick=Math.min(g.nextTick,now);g.data.switchUntil=Math.min(g.data.switchUntil||0,now);
      for(const w of [g.data.kantoWorld,g.data.johtoWorld])if(w?.walk)w.walk.at=Math.min(w.walk.at,now-w.walk.duration);
      if(g.data.pendingBattle)g.data.pendingBattle.at=Math.min(g.data.pendingBattle.at,now);
      for(const e of [g.data.animation,g.data.captureAnimation])if(e){e.at=Math.min(e.at,now-86400000);if(e.leadIn)e.leadIn.at=Math.min(e.leadIn.at,now-86400000);}
    }
    mapTick(now){
      const g=this.game,d=g.data,w=d.johtoUnlocked?d.johtoWorld:d.kantoWorld;
      if(g.platform!=='mobile'||!w?.journey&&!d.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind))||d.battle||d.pendingBattle||d.suspendedWild||d.pendingChallenge||g.presentation?.())return false;
      const walk=w?.walk,end=walk&&walk.at+walk.duration;
      // Fast-forward only the map's short arrival animation, never a battle result.
      if(walk?.stepTravel&&g.nextTick<=end&&(d.switchUntil||0)<=end){g.nextTick=Math.min(g.nextTick,now);d.switchUntil=Math.min(d.switchUntil||0,now);walk.at=Math.min(walk.at,now-walk.duration);}
      if(!g.controlTick(now))return false;this.dirty=true;return true;
    }
    live(now,totals={}){
      if(!this.foreground)return false;
      this.observe(totals);
      const g=this.game,b=g.data.battle;
      if(g.presentation?.())return g.sceneTick(now)||this.dirty;
      if(this.movementTick(now))return true;
      if(!b?.activityTrainer&&(b?.kind==='trainer'||b?.storyId))return this.step(now)||this.dirty;
      if(g.controlTick(now))return true;
      // Recorded steps can move the map, but cannot progress an ordinary battle.
      return this.dirty;
    }
    catchUp(total,now,maxActions=100){
      const steps=typeof total==='object'?total.steps:total,locked=typeof total==='object'?total.lockMillis:0;
      this.observe(typeof total==='object'?total:{steps});
      const available=(n,cost,cursor)=>Number.isSafeInteger(n)&&n>=cursor?Math.floor((n-cursor)/cost):0;
      const g=this.game;let used=0,moves=0,travelTurns=0;this.moreMovement=false;
      for(;used<maxActions;used++){
        if(this.movementActive()){
          if(travelTurns>=128){this.moreMovement=true;break;}
          this.skipWaits(now);
          if(this.movementTick(now)){travelTurns++;used--;continue;}
        }
        if(moves<512&&this.mapTick(now)){moves++;used--;continue;}
        if(!available(locked,20000,this.lockConsumed))break;
        // Manual dialogue must preserve every unspent lock-time action.
        if(g.presentation?.()||!g.data.battle?.activityTrainer&&(g.data.battle?.kind==='trainer'||g.data.battle?.storyId))break;
        if(g.data.battle?.resumeAfterLock!==undefined){
          if(g.lockEpoch<=g.data.battle.resumeAfterLock)break;
          delete g.data.battle.resumeAfterLock;
        }
        if(g.activityStep?.(now)){this.lockConsumed+=20000;continue;}
        // Consume recorded activity immediately, never simulate a future calendar.
        // Only presentation waits are skipped; every game transition still uses tick().
        this.skipWaits(now);
        const world=g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
        if(!g.data.battle&&(g.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind))||world?.journey&&!g.data.pendingChallenge)&&g.controlTick(now)){used--;continue;}
        if(!this.step(now))break;
        this.lockConsumed+=20000;
      }
      while(moves<512){
        if(this.movementActive()){
          if(travelTurns>=128){this.moreMovement=true;break;}
          this.skipWaits(now);if(this.movementTick(now)){travelTurns++;continue;}
        }
        if(!this.mapTick(now))break;moves++;
      }
      return used;
    }
    checkpoint(){return {consumed:this.consumed,lockConsumed:this.lockConsumed,pausedAt:this.pausedAt,nextTick:this.game.nextTick};}
  }
  root.MobileProgression=Progression;if(typeof module==='object')module.exports=Progression;
})(globalThis);
