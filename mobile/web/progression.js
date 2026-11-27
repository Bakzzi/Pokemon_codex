'use strict';
(function(root){
  const usageMillisPerAction=20000;
  // Persist this cursor in the SAME atomic file as game progress.
  class Progression{
    constructor(core,saved={}){
      this.game=core;this.consumed=Number.isSafeInteger(saved.consumed)?saved.consumed:0;
      this.dirty=false;
      this.lockConsumed=Number.isSafeInteger(saved.lockConsumed)?saved.lockConsumed:0;
      this.usageConsumed=Number.isSafeInteger(saved.usageConsumed)&&saved.usageConsumed>=0?saved.usageConsumed:0;
      this.usageBonusConsumed=Number.isSafeInteger(saved.usageBonusConsumed)&&saved.usageBonusConsumed>=0?saved.usageBonusConsumed:0;
      this.usageAt=saved.usageAt;this.usageMillis=saved.usageMillis;
      this.movementFixRewardClaimed=saved.movementFixRewardClaimed===true;
      // Preserve the legacy step cursor for save compatibility; steps never buy actions.
      this.foreground=false;this.pausedAt=Number.isFinite(saved.pausedAt)?saved.pausedAt:0;
      // Game recreates nextTick at launch. Restore its old clock before shifting
      // paused presentation waits; otherwise the entire offline interval is added twice.
      if(this.pausedAt>0)this.game.nextTick=Number.isFinite(saved.nextTick)?saved.nextTick:this.pausedAt;
      this.game.data.workTokens=0;
    }
    pause(now){if(!this.foreground)return;this.foreground=false;this.pausedAt=now;this.game.data.workTokens=0;}
    resume(now){if(this.foreground)return;if(!Number.isSafeInteger(this.usageAt))this.shift(Math.max(0,now-(this.pausedAt||now)));this.foreground=true;this.pausedAt=0;}
    shift(delta){
      const g=this.game,d=g.data;g.nextTick+=delta;if(d.switchUntil)d.switchUntil+=delta;
      if(g.presentation?.())g.presentation().at+=delta;
      if(d.pendingBattle)d.pendingBattle.at+=delta;
      if(d.kantoWorld?.walk)d.kantoWorld.walk.at+=delta;
      if(d.johtoWorld?.walk)d.johtoWorld.walk.at+=delta;
      for(const e of [d.animation,d.captureAnimation])if(e){e.at+=delta;if(e.leadIn)e.leadIn.at+=delta;}
    }
    step(now,bonus=false){
      const g=this.game;if(g.presentation?.())return g.sceneTick(now);
      const data=g.data;g.data.workTokens=250;
      const changed=g.tick(now),paid=g.data===data&&g.data.workTokens<250;
      g.data.workTokens=0;
      if(changed&&(!bonus||paid))root.MobileCore.nursery.advance(g,250,now);
      if(changed&&bonus&&paid)this.spendBonusAction();
      return changed;
    }
    spendBonusAction(){
      const d=this.game.data,account=d.mapTravel;
      if(--account.bonusActions===0&&d.pendingBattle)account.finishBonusTurn=true;
      this.dirty=true;
    }
    usageActions(total,bonuses){
      const timed=Number.isSafeInteger(total)&&total>=this.usageConsumed?Math.floor((total-this.usageConsumed)/usageMillisPerAction):0;
      const earned=Number.isSafeInteger(bonuses)&&bonuses>=this.usageBonusConsumed?bonuses-this.usageBonusConsumed:0;
      return Math.min(Number.MAX_SAFE_INTEGER,timed+earned);
    }
    spendUsageAction(total){
      if(this.usageActions(total)>0)this.usageConsumed+=usageMillisPerAction;
      else this.usageBonusConsumed++;
    }
    observe(totals,now){
      if(Number.isSafeInteger(now)&&Number.isSafeInteger(totals.usageMillis)&&totals.usageMillis>=0){
        if(!this.foreground&&!Number.isSafeInteger(this.usageAt)&&this.pausedAt>0)this.shift(Math.max(0,now-this.pausedAt));
        if(!this.foreground&&Number.isSafeInteger(this.usageAt)&&Number.isSafeInteger(this.usageMillis)&&now>=this.usageAt&&totals.usageMillis>=this.usageMillis){
          // Freeze presentation/turn waits for the portion actually spent locked.
          this.shift(Math.max(0,now-this.usageAt-(totals.usageMillis-this.usageMillis)));
        }
        this.usageAt=now;this.usageMillis=totals.usageMillis;
        if(this.game.data.battle)delete this.game.data.battle.resumeAfterLock;
      }
      if(this.game.recordTravelTouches?.(totals.touches))this.dirty=true;
    }
    claimMovementFixReward(now){
      if(this.game.platform!=='mobile'||this.movementFixRewardClaimed||!Number.isSafeInteger(now)||now<0)return false;
      const distance=this.game.data.mapTravel ||= {credit:0,bank:0};
      const bank=Number.isSafeInteger(distance.bank)&&distance.bank>=0?distance.bank:0;
      // The resource and its receipt are persisted in the same atomic save.
      distance.bank=Math.min(Number.MAX_SAFE_INTEGER,bank+2000);
      this.movementFixRewardClaimed=true;this.dirty=true;
      this.game.log('업데이트 보상으로 이동 자원 1개를 받았다!','item',null,now);return true;
    }
    automaticSceneTick(now){
      const g=this.game,s=g.presentation?.();
      if(!g.data.battle?.activityTrainer||!s?.automatic||!['trainer-intro','sendout'].includes(s.mode))return false;
      // No player is watching during catch-up. Finish only this timed visual;
      // never tap through manual dialogue or charge an extra battle action.
      s.at=Math.min(s.at,now-s.duration);const changed=g.sceneTick(now);if(changed)this.dirty=true;return changed;
    }
    movementActive(){const d=this.game.data,w=d.johtoUnlocked?d.johtoWorld:d.kantoWorld,bank=!!(w?.journey?.bankLeg||w?.journey?.bankCells>0||d.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind)&&a.useBank));return !!d.battle?.movementTrainer||bank&&(!d.battle||d.battle.kind==='wild'&&!d.battle.storyId)&&!d.pendingChallenge&&!d.suspendedWild;}
    movementTick(now,canGrow=true){
      const g=this.game,d=g.data;if(!this.movementActive()||g.presentation?.())return false;
      if(!canGrow&&(!d.battle||d.battle.kind!=='wild'||d.pendingBattle||d.battle.foe.hp<=0||d.battle.party[d.activeId]?.hp<=0))return false;
      if(g.handoffTravel?.(now)){this.dirty=true;return true;}
      if(d.battle&&!d.battle.movementTrainer)return false;
      const changed=d.battle?.movementTrainer?this.step(now):g.startMovementTrainer?.(now);
      if(changed)this.dirty=true;return !!changed;
    }
    skipWaits(now){
      const g=this.game;g.nextTick=Math.min(g.nextTick,now);g.data.switchUntil=Math.min(g.data.switchUntil||0,now);
      for(const w of [g.data.kantoWorld,g.data.johtoWorld])if(w?.walk)w.walk.at=Math.min(w.walk.at,now-w.walk.duration);
      if(g.data.pendingBattle)g.data.pendingBattle.at=Math.min(g.data.pendingBattle.at,now);
      for(const e of [g.data.animation,g.data.captureAnimation])if(e){e.at=Math.min(e.at,now-86400000);if(e.leadIn)e.leadIn.at=Math.min(e.leadIn.at,now-86400000);}
    }
    mapTick(now,canGrow=true){
      const g=this.game,d=g.data,w=d.johtoUnlocked?d.johtoWorld:d.kantoWorld;
      if(!canGrow&&d.battle&&(d.battle.kind!=='wild'||d.pendingBattle||d.battle.foe.hp<=0||d.battle.party[d.activeId]?.hp<=0))return false;
      if(g.handoffTravel?.(now)){this.dirty=true;return true;}
      if(g.platform==='mobile'&&g.storyTravelTick?.(now)){this.dirty=true;return true;}
      if(g.platform!=='mobile'||!w?.journey&&!d.pendingActions?.some(a=>['travel','world-pass'].includes(a.kind))||d.battle||d.pendingBattle||d.suspendedWild||d.pendingChallenge||g.presentation?.())return false;
      const walk=w?.walk,end=walk&&walk.at+walk.duration;
      // Fast-forward only the map's short arrival animation, never a battle result.
      if(walk?.stepTravel&&g.nextTick<=end&&(d.switchUntil||0)<=end){g.nextTick=Math.min(g.nextTick,now);d.switchUntil=Math.min(d.switchUntil||0,now);walk.at=Math.min(walk.at,now-walk.duration);}
      if(!g.controlTick(now))return false;this.dirty=true;return true;
    }
    live(now,totals={}){
      if(!this.foreground)return false;
      this.observe(totals,now);
      const g=this.game,b=g.data.battle;
      if(g.automaticStoryTick?.(now)){this.dirty=true;return true;}
      if(g.presentation?.())return g.sceneTick(now)||this.dirty;
      if(this.movementTick(now))return true;
      if(!b?.activityTrainer&&(b?.kind==='trainer'||b?.storyId))return this.step(now)||this.dirty;
      if(g.controlTick(now))return true;
      const account=g.data.mapTravel;
      if(account?.finishBonusTurn){
        if(g.data.pendingBattle)return g.tick(now)||this.dirty;
        delete account.finishBonusTurn;this.dirty=true;
      }
      if(Number.isSafeInteger(account?.bonusActions)&&account.bonusActions>0){
        if(g.activityStep?.(now)){this.spendBonusAction();return true;}
        return this.step(now,true)||this.dirty;
      }
      if(this.usageActions(totals.usageMillis,totals.usageBonusActions)>0){
        if(g.activityStep?.(now)||this.step(now)){this.spendUsageAction(totals.usageMillis);this.dirty=true;return true;}
      }
      return this.dirty;
    }
    catchUp(totals,now,maxActions=100){
      const usage=totals?.usageMillis,bonuses=totals?.usageBonusActions,active=totals?.usageActive===true;
      this.observe(totals??{},now);
      const g=this.game;let used=0,moves=0,travelTurns=0;this.moreMovement=false;
      for(;used<maxActions;used++){
        if(active&&g.automaticStoryTick?.(now)){this.dirty=true;break;}
        if(!active&&g.data.trainerSequence)break;
        if(active&&(g.data.trainerSequence||!g.data.battle?.activityTrainer&&(g.data.battle?.kind==='trainer'||g.data.battle?.storyId))){
          if(this.challengeTick(now))this.dirty=true;
          break;
        }
        if(active&&moves<512&&this.automaticSceneTick(now)){moves++;used--;continue;}
        if(this.movementActive()){
          if(travelTurns>=128){this.moreMovement=true;break;}
          if(active||!g.data.battle)this.skipWaits(now);
          if(this.movementTick(now,active)){travelTurns++;used--;continue;}
        }
        if(moves<512&&this.mapTick(now,active)){moves++;used--;continue;}
        if(!active||!this.usageActions(usage,bonuses))break;
        // Presentation and choices never spend phone-use actions.
        if(g.presentation?.()||!g.data.battle?.activityTrainer&&(g.data.battle?.kind==='trainer'||g.data.battle?.storyId))break;
        if(g.activityStep?.(now)){this.spendUsageAction(usage);continue;}
        // Consume recorded activity immediately, never simulate a future calendar.
        // Only presentation waits are skipped; every game transition still uses tick().
        this.skipWaits(now);
        const world=g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
        if(!g.data.battle&&(g.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind))||world?.journey&&!g.data.pendingChallenge)&&g.controlTick(now)){used--;continue;}
        if(!this.step(now))break;
        this.spendUsageAction(usage);
      }
      while(moves<512){
        if(g.data.trainerSequence)break;
        if(active&&this.automaticSceneTick(now)){moves++;continue;}
        if(this.movementActive()){
          if(travelTurns>=128){this.moreMovement=true;break;}
          if(active||!g.data.battle)this.skipWaits(now);if(this.movementTick(now,active)){travelTurns++;continue;}
        }
        if(!this.mapTick(now,active))break;moves++;
      }
      return used;
    }
    challengeTick(now){const g=this.game;if(g.presentation?.())return g.sceneTick(now);return this.step(now)||g.controlTick(now);}
    checkpoint(){return {consumed:this.consumed,lockConsumed:this.lockConsumed,usageConsumed:this.usageConsumed,usageBonusConsumed:this.usageBonusConsumed,usageAt:this.usageAt,usageMillis:this.usageMillis,pausedAt:this.pausedAt,nextTick:this.game.nextTick,movementFixRewardClaimed:this.movementFixRewardClaimed,storyPending:!!this.game.storyWorkPending?.()};}
  }
  root.MobileProgression=Progression;if(typeof module==='object')module.exports=Progression;
})(globalThis);
