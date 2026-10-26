'use strict';
// A local, explicitly requested run of ordinary opponents. Never crosses a
// case boundary into a rival, leader, NPC conversation, gift or reward choice.
const K=require('./kanto-journey.cjs'),J=require('./johto.cjs');
const johtoGroups=[['j-sprout-sage-1','j-sprout-sage-2'],Array.from({length:5},(_,i)=>'j-kimono-'+i),Array.from({length:3},(_,i)=>'j-bell-sage-'+i)];
function plan(g,id){
 if(g.data.johtoUnlocked){
  const entries=johtoGroups.find(ids=>ids.includes(id));
  return entries&&{region:2,group:entries[0],location:require('./johto-world.cjs').locationFor(id),entries};
 }
 const n=K.nodes.get(id);
 if(!K.modern(g)||!n?.trainer||n.automatic||['k-moon-scientist','k-bridge-rocket','k-robber'].includes(id))return null;
 return {region:1,group:n.case,location:n.location,entries:K.cases.find(c=>c.id===n.case).entries};
}
function completed(g,id){return g.data.johtoUnlocked?J.done(g,id):K.done(g,id);}
function valid(g,q){
 const p=q&&plan(g,q.current),world=g.data.johtoUnlocked?g.data.johtoWorld:g.data.kantoWorld;
 return !!p&&p.group===q.group&&p.region===q.region&&p.location===q.location&&world?.location===q.location;
}
function withTrainerSequence(Base){return class TrainerSequence extends Base{
 constructor(...args){super(...args);if(this.data.trainerSequence&&!valid(this,this.data.trainerSequence))delete this.data.trainerSequence;}
 challenge(id,now=Date.now()){
  const p=plan(this,id),ok=super.challenge(id,now);
  if(ok){
   delete this.data.trainerSequence;
   // A hidden rival interception owns its own manual dialogue, not this run.
   if(p&&(this.data.battle?.storyId===id||this.data.pendingChallenge?.index===id)){
    this.data.trainerSequence={region:p.region,group:p.group,location:p.location,current:id};this.attachTrainerSequence();
   }
  }
  return ok;
 }
 startChallenge(id,now){const ok=super.startChallenge(id,now);if(ok&&this.data.trainerSequence?.current===id){if(this.data.battle?.storyId===id)this.attachTrainerSequence();else delete this.data.trainerSequence;}return ok;}
 attachTrainerSequence(){
  const q=this.data.trainerSequence,b=this.data.battle;
  if(!valid(this,q)||b?.storyId!==q.current||completed(this,q.current))return;
  b.sequenceTrainer=true;this.sequenceIntro();
 }
 sequenceIntro(){
  const b=this.data.battle,s=this.presentation();
  if(b?.sequenceTrainer&&b.foeIndex===0&&s?.next==='sendout')Object.assign(s,{mode:'trainer-intro',automatic:true,duration:1800,pages:[s.name+'의 도전!']});
 }
 nextTrainer(now){super.nextTrainer(now);this.sequenceIntro();}
 defeatOpponent(now,captured=false){
  const b=this.data.battle;
  if(!b?.sequenceTrainer||b.foeIndex!==this.battleBoss(b).team.length-1)return super.defeatOpponent(now,captured);
  const id=b.storyId;this.data.pendingBattle=null;
  if(b.johtoId){b.johtoResolution='win';this.finishJohtoWin(now);}else this.finishTrainerWin(now);
  const q=this.data.trainerSequence,p=valid(this,q)&&plan(this,id);
  if(!p||q.current!==id||!completed(this,id)){delete this.data.trainerSequence;return;}
  // Select the next unplayed row in this case. Do not skip a manual branch.
  const next=p.entries.slice(p.entries.indexOf(id)+1).find(other=>!completed(this,other));
  const nextPlan=next&&plan(this,next),rival=this.rivalGate?.(next);
  if(!nextPlan||nextPlan.group!==p.group||!this.canChallenge(next)||rival&&!['won','completed'].includes(this.rivalProgress(rival.id)?.state)){
   delete this.data.trainerSequence;return;
  }
  q.current=next;q.waiting=true;
 }
 sequenceTick(now){
  const q=this.data.trainerSequence;if(!q?.waiting)return false;
  if(!valid(this,q)||this.seasonDue(now)||this.presentation()||this.data.pendingChallenge||this.data.pendingActions.some(a=>['travel','world-pass'].includes(a.kind))){delete this.data.trainerSequence;return false;}
  if(now<this.nextTick||now<this.data.switchUntil||this.data.pendingBattle)return false;
  if(!this.canChallenge(q.current)){delete this.data.trainerSequence;return false;}
  // Reuse the normal handoff to preserve an interrupted wild encounter.
  this.data.pendingChallenge={index:q.current,queuedAt:now};delete q.waiting;
  return super.controlTick(now);
 }
 controlTick(now=Date.now()){return this.sequenceTick(now)||super.controlTick(now);}
 tick(now=Date.now()){
  if(this.data.trainerSequence?.waiting){if(this.sequenceTick(now))return true;if(this.data.trainerSequence?.waiting)return false;}
  return super.tick(now);
 }
 cancelChallenge(now=Date.now()){const ok=super.cancelChallenge(now);if(ok)delete this.data.trainerSequence;return ok;}
 endChallenge(won,now){if(!won)delete this.data.trainerSequence;return super.endChallenge(won,now);}
 abandon(now=Date.now()){delete this.data.trainerSequence;return super.abandon(now);}
 requestAction(kind,value,now=Date.now()){
  const ok=super.requestAction(kind,value,now);
  if(ok&&['travel','world-pass','travel-bank'].includes(kind)){
   if(this.data.trainerSequence?.current===this.data.pendingChallenge?.index)this.cancelChallenge(now);
   delete this.data.trainerSequence;
  }
  return ok;
 }
};}
module.exports={withTrainerSequence,plan};
