'use strict';
// Android presentation belongs to the saved adventure, not to a renderer timer.
// The underlying battle engine and desktop product are unchanged.
const {Game:Engine}=require('../desktop/game.cjs');
const journal=require('../desktop/journal.cjs');
const training=require('../desktop/training-device.cjs');
const rescue=require('./rescue.cjs');
const {encounters,byId:rivals}=require('./rivals.cjs');
const rival=encounters[0];
const oakIntro=[
  '반갑다! 나는 포켓몬을 연구하는 오박사란다. 작은 모험에 온 걸 환영한다!',
  '이 피카츄가 네 첫 동료란다. 함께 포켓몬을 만나고, 잡고, 키워 보렴.',
  '앱을 켜 두면 자동으로 모험한단다. 꺼 둔 동안에는 10걸음마다 모험이 이어지지.',
  '포켓기어에서 동료를 살펴보고, 도전하기에서 실력을 시험해 보렴. 물건은 가방에 있단다.'
];
const oakClose=['첫 배틀은 어땠니? 이기든 지든 동료와 함께 배우면 된단다. 피카츄는 회복해 두었단다.','이제 너희의 모험이 시작이다! 새로 만난 동료와 모험 기록도 가끔 살펴보렴.'];
function portrait(boss){return rivals.get(boss.id)?.sprite||rescue.byId.get(boss.id)?.sprite||(boss.id==='rocket-giovanni'?'giovanni':boss.id);}
class Adventure extends Engine{
  constructor(saved={},now=Date.now(),options={}){
    super(saved,now,options);
    if(!this.data.mobileStory){
      // Any pre-existing game is a migration, including one at the first level.
      const existing=Object.keys(saved).length>0;
      this.data.mobileStory={revision:1,onboarding:existing?'done':'oak',serial:0,giftReceived:existing};
      if(!existing)this.dialogue('oak','오박사','oak',oakIntro,'rival',now);
    }
    rescue.init(this,now);this.initRivals(now);
    const pending=saved.pendingChallenge;
    if((rivals.has(pending?.index)&&this.rivalProgress(pending.index)?.state==='retry')||rescue.byId.has(pending?.index)&&this.canChallenge(pending.index))this.data.pendingChallenge={...pending};
  }
  resetSeason(now){
    const story=this.data.mobileStory;
    super.resetSeason(now);
    if(story){this.data.mobileStory={...story,onboarding:'done',scene:null,rivals:null,rescue:null};rescue.init(this,now);this.initRivals(now);}
  }
  initRivals(now){
    const story=this.data.mobileStory;if(!story)return;
    if(!story.rivals){
      story.rivals={};
      for(const e of encounters){
        const progressed=e.stage===0?story.onboarding==='done'||story.onboarding==='closing':
          e.target===8?this.data.champion||this.data.leagueBest>0||this.data.battle?.kind==='trainer'&&Number.isInteger(this.data.battle.bossIndex)&&this.data.battle.bossIndex>=8:
          typeof e.target==='string'?!!story.rescue?.completedAt:
          e.target!==null&&this.data.badges.includes(['brock','misty','surge','erika','koga'][e.target]);
        story.rivals[e.id]={state:progressed?'completed':'unseen',...(progressed?{migratedAt:now}:{})};
      }
    }
    const middle=story.rivals['rival-middle'];
    if(story.rescue?.legacy&&middle?.state==='unseen'){middle.state='completed';middle.migratedAt=now;}
    const b=this.data.battle;
    if(rivals.has(b?.storyId)&&!b.rivalResolution)this.rivalProgress(b.storyId).state='active';
  }
  rivalProgress(id){return this.data.mobileStory?.rivals?.[id];}
  canReceiveFlute(){const r=this.data.mobileStory?.rescue;return !!(r?.completedAt&&r.wins.every(Boolean));}
  fluteRewardText(){return '보라타운 촌장에게 포켓몬피리를 받았다!';}
  rivalGate(index){return encounters.find(e=>e.target!==null&&e.target===index);}
  rivalState(){
    return encounters.map(e=>{
      const p=this.rivalProgress(e.id)||{state:'unseen'},met=e.stage===0||p.state!=='unseen';
      return {id:e.id,stage:e.stage,state:p.state,met,sprite:met?e.sprite:null,name:met?'그린':'???',team:met?e.team:[],canRetry:e.stage>0&&this.canChallenge(e.id)};
    });
  }
  dialogue(kind,name,sprite,pages,next,now){
    const s=this.data.mobileStory;
    s.scene={id:++s.serial,kind,name,sprite,pages,index:0,next,at:now,mode:'dialogue'};
  }
  presentation(){return this.data.mobileStory?.scene||null;}
  advanceScene(id,now=Date.now()){
    const story=this.data.mobileStory,s=story.scene;
    if(!s||s.mode!=='dialogue'||id!==s.id+':'+s.index)return false;
    if(s.kind==='oak'&&s.next==='rival'&&s.index===1&&!story.giftReceived){
      story.giftReceived=true;this.log('피카츄가 첫 동료가 되었다!','gift',25,now);
    }
    if(s.index+1<s.pages.length){s.index++;return true;}
    story.scene=null;
    if(s.next==='rival'){this.startRival(now);return true;}
    if(s.next==='sendout'){
      story.scene={id:++story.serial,mode:'sendout',kind:'sendout',at:now,duration:2700,name:s.name,sprite:s.sprite};
      return true;
    }
    if(s.next==='tutorial-end'){
      this.rivalProgress(rival.id).state='completed';
      this.data.pendingBattle=null;this.data.battle=null;story.onboarding='closing';
      this.dialogue('oak','오박사','oak',oakClose,'adventure',now);return true;
    }
    if(s.next==='adventure'){
      story.onboarding='done';story.completedAt=now;
      this.data.animation=null;this.holdUntil(now+1000);return true;
    }
    if(s.next==='rival-win'||s.next==='rival-loss'){this.completeRival(s.next==='rival-win',now);return true;}
    if(s.next==='rescue-reward'){
      const r=story.rescue;if(!r.rewardPending||!r.wins.every(Boolean))return false;
      r.completedAt=now;r.rewardPending=false;training.awardFlute(this,now);
      this.animate('result',{text:'보라타운 촌장을 구하고 포켓몬피리를 받았다!'},now);return true;
    }
    if(s.next==='win'){this.finishTrainerWin(now);return true;}
    if(s.next==='loss'){super.endChallenge(false,now);return true;}
    return false;
  }
  startRival(now){
    const story=this.data.mobileStory;story.onboarding='rival';
    const uid=this.data.activeId,p=this.data.owned[uid];
    this.data.pendingBattle=null;this.data.animation=null;this.data.switchUntil=0;this.nextTick=now;
    this.data.battle={kind:'trainer',bossIndex:rival.id,storyId:rival.id,foeIndex:0,party:{[uid]:this.memberCombatant(p)},turn:0,startedAt:now};
    this.rivalProgress(rival.id).state='active';
    this.nextTrainer(now);
  }
  battleBoss(b=this.data.battle){return rivals.get(b?.storyId)||rescue.byId.get(b?.storyId)||super.battleBoss(b);}
  challengeName(index){return rivals.has(index)?'그린 재도전':rescue.byId.get(index)?.name||super.challengeName(index);}
  challenge(index,now=Date.now()){
    if(!rivals.has(index)&&!rescue.byId.has(index))return super.challenge(index,now);
    if(!this.canChallenge(index)||this.data.battle?.kind==='trainer')return false;
    if(this.data.pendingChallenge)return this.data.pendingChallenge.index===index;
    if(this.data.battle||this.data.pendingBattle||now<this.data.switchUntil||now<this.nextTick){
      this.data.pendingChallenge={index,queuedAt:now};this.log(this.challengeName(index)+' 예약','challenge',null,now);return true;
    }
    return this.startChallenge(index,now);
  }
  startChallenge(index,now){
    const gate=this.rivalGate(index),encounter=gate&&this.rivalProgress(gate.id)?.state==='unseen'?gate:rivals.get(index)||rescue.byId.get(index);
    if(!encounter)return super.startChallenge(index,now);
    if(!this.canChallenge(index)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
    const e=encounter;
    this.data.pendingChallenge=null;this.data.captureAnimation=null;this.data.suspendedWild=null;this.data.manualSelection=false;
    const party=Object.fromEntries(this.data.slots.filter(uid=>uid!==null&&!this.isBoarded(uid)).map(uid=>[uid,this.memberCombatant(this.data.owned[uid])]));
    this.data.battle={kind:'trainer',bossIndex:e.id,storyId:e.id,foeIndex:0,party,turn:0,startedAt:now};
    if(rivals.has(e.id)){const p=this.rivalProgress(e.id);p.state='active';p.metAt ||= now;}
    this.log(rivals.has(e.id)?'그린이 나타났다!':e.name+'에게 도전!','challenge',null,now);this.nextTrainer(now);return true;
  }
  resolveRival(won,now,abandoned=false){
    const b=this.data.battle,e=rivals.get(b?.storyId);if(!e||b.rivalResolution)return;
    this.data.pendingBattle=null;b.rivalResolution={won,at:now,abandoned};
    if(won){this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');}
    this.log(won?'그린과의 배틀에서 승리했다!':abandoned?'그린과의 배틀을 중단했다.':'그린과의 배틀에서 패배했다.',won?'win':'loss',null,now);
    this.dialogue('trainer','그린',e.sprite,won?e.win:e.loss,won?'rival-win':'rival-loss',now);
  }
  completeRival(won,now){
    const b=this.data.battle,e=rivals.get(b?.storyId);if(!e||!b.rivalResolution)return;
    const p=this.rivalProgress(e.id);p.state=e.stage===0?'completed':won?'won':'retry';p.outcome=won?'win':'loss';if(won)p.wonAt=now;
    this.data.pendingBattle=null;this.data.pendingChallenge=null;this.data.battle=null;this.data.suspendedWild=null;
    if(e.stage===0){this.data.mobileStory.onboarding='closing';this.dialogue('oak','오박사','oak',oakClose,'adventure',now);}
    else this.animate('result',{text:won?'그린에게 승리했다! 모험을 계속하자.':'동료들을 회복했어요. 도전하기에서 그린에게 다시 도전하세요.'},now);
  }
  abandon(now=Date.now()){
    if(rivals.has(this.data.battle?.storyId)){if(this.presentation())return false;this.resolveRival(false,now,true);return true;}
    return super.abandon(now);
  }
  nextTrainer(now){
    const b=this.data.battle,boss=this.battleBoss(b),first=b.foeIndex===0;
    super.nextTrainer(now);
    if(b.kind==='trainer'&&first){
      const pages=rivals.get(boss.id)?.intro||[boss.name+'의 도전!','좋아, 포켓몬 배틀을 시작하자!'];
      this.dialogue('trainer',boss.name,portrait(boss),pages,'sendout',now);
    }
  }
  defeatOpponent(now,captured=false){
    const b=this.data.battle;
    if(b?.kind==='trainer'&&b.foeIndex===this.battleBoss(b).team.length-1){
      const boss=this.battleBoss(b);
      this.data.pendingBattle=null;
      if(rivals.has(b.storyId))this.resolveRival(true,now);
      else this.dialogue('trainer',boss.name,portrait(boss),['멋진 배틀이었어! 내 패배를 인정할게.'],'win',now);
      return;
    }
    super.defeatOpponent(now,captured);
  }
  finishTrainerWin(now){
    const b=this.data.battle,e=rescue.byId.get(b?.storyId);
    if(!e){super.defeatOpponent(now);return;}
    const r=this.data.mobileStory.rescue;
    if(!r.wins[e.stage]){this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');r.wins[e.stage]=now;this.log(e.name+'에게 승리!','story',null,now);}
    this.data.battle=null;this.data.pendingBattle=null;this.data.pendingChallenge=null;this.data.suspendedWild=null;
    if(r.wins.every(Boolean)){
      r.rewardPending=true;this.dialogue('elder','보라타운 촌장','mr-fuji',['구해 줘서 정말 고맙구나. 이 피리를 받아 주렴.'],'rescue-reward',now);
    }else this.animate('result',{text:e.name+'에게 승리했다! 다음 조무래기에게 도전하자.'},now);
  }
  endChallenge(won,now){
    const b=this.data.battle;
    if(rivals.has(b?.storyId)){this.resolveRival(false,now);return;}
    if(!won&&b?.kind==='trainer'){
      const boss=this.battleBoss(b);this.data.pendingBattle=null;
      this.dialogue('trainer',boss.name,portrait(boss),['동료들과 더 성장해서 다시 만나자!'],'loss',now);return;
    }
    super.endChallenge(won,now);
  }
  sceneTick(now){
    const s=this.presentation();
    if(s?.mode!=='sendout'||now<s.at+s.duration)return false;
    this.data.mobileStory.scene=null;this.data.animation=null;
    this.holdUntil(now+650);return true;
  }
  tick(now=Date.now()){return this.presentation()?false:super.tick(now);}
  actionStatus(a,now=Date.now()){
    if(this.presentation())return {state:'waiting',reason:'대화가 끝나면 실행해요.'};
    return super.actionStatus(a,now);
  }
  canChallenge(index){
    if(this.presentation())return false;
    if(rivals.has(index))return rivals.get(index).stage>0&&this.rivalProgress(index)?.state==='retry';
    const gate=this.rivalGate(index);if(gate&&this.rivalProgress(gate.id)?.state==='retry')return false;
    if(rescue.byId.has(index))return rescue.ready(this,index);
    return super.canChallenge(index);
  }
  panelState(now=Date.now()){
    const s=super.panelState(now),locks={};for(const e of encounters)if(e.target!==null&&this.rivalProgress(e.id)?.state==='retry')locks[e.target]='그린에게 승리해야 도전할 수 있어요.';
    return {...s,scene:this.presentation(),onboarding:this.data.mobileStory?.onboarding!=='done',rivals:this.rivalState(),rivalLocks:locks,rescue:rescue.snapshot(this)};
  }
}
module.exports={Adventure};
