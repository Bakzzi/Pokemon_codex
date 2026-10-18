'use strict';
const {Adventure:SharedAdventure}=require('../shared/adventure.cjs');
const {balance}=require('./pokemon.cjs');
const safari=require('../shared/safari.cjs');
class Adventure extends SharedAdventure{
  constructor(saved={},now=Date.now(),options={}){super(saved,now,{...options,platform:'desktop'});}
  snapshot(now=Date.now()){return {...super.snapshot(now),scene:this.presentation(),activityMode:'tokens'};}
  tick(now=Date.now()){return this.presentation()?this.sceneTick(now):super.tick(now);}
  observe(id,event,options={}){
    const before=this.data.outputTokens;super.observe(id,event,options);
    const gained=this.data.outputTokens-before,t=this.data.mobileStory.safari.trip;
    if(!t||gained<=0||this.presentation()||this.seasonDue(options.now))return;
    // A walking action is ten steps; the same expedition takes the equivalent
    // number of agent-work actions on PC. Only new, deduplicated work is routed.
    const perStep=balance.tokensPerAction/10,remainder=t.activityRemainder||0;
    const used=Math.min(gained,Math.max(0,(safari.DISTANCE-t.steps)*perStep-remainder));
    const credit=remainder+used,steps=Math.floor(credit/perStep);
    t.activityRemainder=credit-steps*perStep;this.data.workTokens-=used;
    if(steps)this.walkingStep(steps,options.now??Date.now());
  }
  resetProgress(now=Date.now()){
    const baselines=structuredClone(this.data.baselines),sessions=this.sessions,lastEvent=this.lastEvent;
    Object.assign(this,new Adventure({},now));
    this.data.baselines=baselines;this.sessions=sessions;this.lastEvent=lastEvent;
  }
}
module.exports={Adventure};
