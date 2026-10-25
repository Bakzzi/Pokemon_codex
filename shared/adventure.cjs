'use strict';
// Saved story and encounter rules shared by the desktop and Android products.
const {Game:Engine}=require('../desktop/game.cjs');
const journal=require('../desktop/journal.cjs');
const training=require('../desktop/training-device.cjs');
const rescue=require('./rescue.cjs');
const silph=require('./silph.cjs');
const safari=require('./safari.cjs');
const mansion=require('./mansion.cjs');
const trainerDialogue=require('./trainer-dialogue.cjs');
const discovery=require('./challenge-discovery.cjs');
const world=require('./kanto-world.cjs');
const {species}=require('../desktop/pokemon.cjs');
const {encounters,byId:rivals,champion}=require('./rivals.cjs');
const rival=encounters[0];
const wildExclusions=[131,...safari.pool.map(([id])=>id)];
const oakIntro=[
  '반갑다! 나는 포켓몬을 연구하는 오박사란다. 작은 모험에 온 걸 환영한다!',
  '이 피카츄가 네 첫 동료란다. 함께 포켓몬을 만나고, 잡고, 키워 보렴.',
  '폰을 잠그면 20초마다 동료와 모험한단다. 걸음은 타운맵에서 이동할 때 사용하지. 도전 배틀은 직접 지켜볼 수 있어.',
  '도감에서 동료를 살펴보고, 타운맵에서 다음 모험을 찾아보렴. 물건은 가방에 있단다.'
];
const oakClose=['첫 배틀은 어땠니? 이기든 지든 동료와 함께 배우면 된단다. 피카츄는 회복해 두었단다.','이제 너희의 모험이 시작이다! 새로 만난 동료와 모험 기록도 가끔 살펴보렴.'];
function storyEncounter(id){return rescue.byId.get(id)||silph.byId.get(id);}
function portrait(boss){return boss.sprite||rivals.get(boss.id)?.sprite||storyEncounter(boss.id)?.sprite||(boss.id==='rocket-giovanni'?'giovanni':boss.id);}
class Adventure extends Engine{
  constructor(saved={},now=Date.now(),options={}){
    super(saved,now,options);
    // Later constructor layers must restore the new season, not the expired input.
    if(this.seasonResetOnLoad)saved=this.data;
    this.platform=options.platform||'mobile';
    if(!this.data.mobileStory){
      // Any pre-existing game is a migration, including one at the first level.
      const existing=Object.keys(saved).length>0;
      this.data.mobileStory={revision:1,onboarding:existing?'done':'oak',serial:0,giftReceived:existing};
      if(!existing)this.dialogue('oak','오박사','oak',this.platform==='desktop'?oakIntro.map((text,i)=>i===2?'AI 에이전트와 작업하는 동안 동료와 함께 모험한단다. 도전 배틀은 작업량과 관계없이 진행할 수 있어.':text):oakIntro,'rival',now);
    }
    rescue.init(this,now);silph.init(this,now);safari.init(this);mansion.init(this,now,saved.pendingChallenge);this.initRivals(now);
    discovery.restore(this,[...rescue.encounters,...silph.encounters].map(e=>({id:e.id,completed:!!this.data.mobileStory[silph.byId.has(e.id)?'silph':'rescue'].wins[e.stage],starts:[e.name+'에게 도전!']})),now);
    discovery.restore(this,encounters.map(e=>({id:e.id,completed:!!this.rivalProgress(e.id)?.metAt||['won','completed','retry'].includes(this.rivalProgress(e.id)?.state)})),now);
    const story=this.data.mobileStory;
    if(story.revision<2&&this.data.trainingDevice.rocketWonAt)story.scopeObtainedAt ||= this.data.trainingDevice.rocketWonAt;
    story.revision=2;
    // Never re-award a newly introduced gift to a save that passed that scene.
    if(story.laprasResolved===undefined)story.laprasResolved=false;
    if(story.scene?.next==='rescue-reward')story.scene.name='등나무노인';
    // An event gift cannot fulfill an old ordinary-wild capture reservation.
    delete this.data.captureReservations[131];
    const pending=saved.pendingChallenge;
    if((rivals.has(pending?.index)||storyEncounter(pending?.index)||['safari-start','mansion-investigate'].includes(pending?.index)||pending?.index===6)&&this.canChallenge(pending.index))this.data.pendingChallenge={...pending};
    const scene=story.scene,b=this.data.battle;
    world.init(this,now);
    if(this.platform==='mobile'&&scene?.kind==='oak'&&scene.pages)scene.pages=scene.pages.map(text=>['앱을 켜 두면 자동으로 모험한단다. 꺼 둔 동안에는 10걸음마다 모험이 이어지지.','폰을 잠그면 10초마다 모험한단다. 잠근 동안 10걸음을 걸으면 한 번 더 모험하지. 도전 배틀은 직접 지켜볼 수 있어.','10걸음마다 동료와 모험한단다. 폰을 잠그면 10초마다 한 번 더 모험하지. 앱을 켜고 걸어도 모험을 지켜볼 수 있어.','10걸음마다 동료와 모험한단다. 폰을 잠그면 20초마다 한 번 더 모험하지. 앱을 켜고 걸어도 모험을 지켜볼 수 있어.'].includes(text)?oakIntro[2]:text);
    if(this.platform==='mobile'&&scene?.kind==='safari'&&scene.pages)scene.pages=scene.pages.map(text=>text==='걸어서 탐험하고 돌아오면 어떤 동료를 만났는지 살펴보렴. 몬스터볼 30개로 1,500걸음 동안 다녀올 수 있어.'?'폰을 잠근 동안 탐험하고 돌아오면 어떤 동료를 만났는지 살펴보렴. 몬스터볼 30개로 다녀올 수 있어.':text);
    if(b?.kind==='trainer'&&scene?.mode==='dialogue'){
      const boss=this.battleBoss(b);
      if(!scene.automatic&&scene.next==='sendout'&&scene.pages?.[0]===boss.name+'의 도전!')scene.pages=trainerDialogue.intro(boss,this.data.champion);
      if(scene.next==='win'&&!boss.ghost&&trainerDialogue.hasVictory(boss)){scene.pages=trainerDialogue.victory(boss,this.data.champion,this);scene.index=Math.min(scene.index,scene.pages.length-1);}
      if(scene.next==='loss'&&scene.pages?.[0]==='동료들과 더 성장해서 다시 만나자!')scene.pages=trainerDialogue.defeat(boss);
    }
    if(scene?.next==='rival-win'&&rivals.has(b?.storyId)){scene.pages=rivals.get(b.storyId).win;scene.index=Math.min(scene.index,scene.pages.length-1);}
    if(scene?.next==='sendout'||scene?.mode==='sendout')this.prepareTrainerLead();
  }
  resetSeason(now){
    // The base constructor can roll the season before platform is initialized.
    const story=this.data.mobileStory,distance=this.data.mapTravel;
    super.resetSeason(now);
    if(distance){this.data.mapTravel=distance;require('./step-travel.cjs').bankRemainder(this);}
    if(story){this.data.mobileStory={revision:1,onboarding:'done',giftReceived:true,serial:story.serial||0,scene:null,rivals:null,rescue:null,silph:null,laprasResolved:false};rescue.init(this,now);silph.init(this,now);safari.init(this);mansion.init(this,now);this.initRivals(now);}
  }
  initRivals(now){
    const story=this.data.mobileStory;if(!story)return;
    {
      story.rivals ||= {};
      for(const e of encounters){
        if(story.rivals[e.id])continue;
        const progressed=e.stage===0&&(story.onboarding==='done'||story.onboarding==='closing');
        story.rivals[e.id]={state:progressed?'completed':'unseen',...(progressed?{migratedAt:now}:{})};
      }
    }
    const b=this.data.battle;
    if(rivals.has(b?.storyId)&&!b.rivalResolution)this.rivalProgress(b.storyId).state='active';
  }
  rivalProgress(id){return this.data.mobileStory?.rivals?.[id];}
  wildOptions(){return {...super.wildOptions(),excluded:wildExclusions,...(world.active(this)?{...world.options(this),location:world.current(this).id}:{})};}
  travelName(id){return world.byId.get(id)?.name;}
  travelStatus(id,point){return world.status(this,id,point);}
  travelTo(id,now,point){return world.travel(this,id,now,point);}
  passageStatus(id){return world.passageStatus(this,id);}
  passCheckpoint(id,now){return world.pass(this,id,now);}
  advanceTravel(now){return world.active(this)&&world.advance(this,now);}
  onWildEnd(b,now){if(world.active(this))world.encounterEnded(this,b);}
  recordTravelSteps(total){return require('./step-travel.cjs').observe(this,total);}
  recordTravelTime(now){return require('./step-travel.cjs').accrueTime(this,now);}
  requestAction(kind,value,now=Date.now()){
    if(kind==='travel-bank')return require('./step-travel.cjs').useBank(this);
    if(this.platform!=='mobile'||!['travel','world-pass'].includes(kind))return super.requestAction(kind,value,now);
    const steps=require('./step-travel.cjs'),before=steps.hasIntent(this),ok=super.requestAction(kind,value,now);
    if(ok)steps.beginIntent(this,before);return ok;
  }
  executeAction(a,now){const ok=super.executeAction(a,now);if(ok&&a.useBank&&this.platform==='mobile')require('./step-travel.cjs').useBank(this,true);return ok;}
  cancelAction(id,now=Date.now(),reason){const ok=super.cancelAction(id,now,reason);if(ok&&reason!=='새 선택으로 변경'&&this.platform==='mobile'&&!require('./step-travel.cjs').hasIntent(this))require('./step-travel.cjs').bankRemainder(this);return ok;}
  controlTick(now=Date.now()){return super.controlTick(now)||this.advanceTravel(now);}
  canReserveCapture(id){return id!==131&&super.canReserveCapture(id);}
  canReceiveFlute(){const r=this.data.mobileStory?.rescue;return !!(r?.completedAt&&r.wins.every(Boolean));}
  fluteRewardText(){return '등나무노인에게 포켓몬피리를 받았다!';}
  walkingStep(steps,now){return !this.presentation()&&safari.walk(this,steps,now);}
  activityStep(now){return this.platform==='mobile'&&this.walkingStep(10,now);}
  returnSafari(now=Date.now()){return safari.finish(this,now,true);}
  storySafe(now){return this.data.mobileStory?.onboarding==='done'&&!this.presentation()&&!this.seasonDue(now)&&!this.data.battle&&!this.data.pendingBattle&&!this.data.pendingChallenge&&now>=this.data.switchUntil&&now>=this.nextTick;}
  offerMansion(now){
    const m=this.data.mobileStory.mansion;if(!m.startedAt||m.completedAt||m.read>=3||m.wins<(m.read+1)*2||!this.storySafe(now))return false;
    this.dialogue('diary','낡은 연구일지','item:journal',mansion.entries[m.read],'mansion-read',now);return true;
  }
  offerLapras(now){
    const s=this.data.mobileStory;if(s.laprasResolved||this.rivalProgress('rival-silph')?.state!=='won'||!s.silph.wins[0]||!this.storySafe(now))return false;
    this.dialogue('employee','실프주식회사 직원','scientist',['로켓단을 막으러 와 줬구나. 이 라프라스를 네게 맡기고 싶어.','사람의 말을 잘 이해하는 다정한 포켓몬이야. 함께 데려가 주겠니?'],'lapras-gift',now);return true;
  }
  deviceReady(){return this.data.badges.includes('erika')&&this.kantoCaughtCount()>=50;}
  canReceiveTrainingDevice(){return this.acceptingDevice===true&&this.deviceReady();}
  trainingDeviceRewardText(){return '오박사의 조수에게 학습장치를 받았다!';}
  offerDevice(now){
    if(this.data.mobileStory?.onboarding!=='done'||this.seasonDue(now)||training.has(this)||!this.deviceReady()||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil||now<this.nextTick)return false;
    this.dialogue('aide','오박사의 조수','scientist',['오박사님께 네 모험 이야기를 들었어. 벌써 다양한 포켓몬을 기록했구나!','연구를 도와준 답례로 학습장치를 줄게. 동료를 키우는 데 도움이 될 거야.'],'device-reward',now);return true;
  }
  rivalGate(index){return encounters.find(e=>e.target!==null&&e.target===index);}
  rivalState(){
    return encounters.map(e=>{
      const p=this.rivalProgress(e.id)||{state:'unseen'},met=e.stage===0||p.state!=='unseen';
      return {id:e.id,stage:e.stage,state:p.state,met,levelsKnown:this.challengeLevelsKnown(e.id),sprite:met?e.sprite:null,name:met?'그린':'???',team:met?e.team:[],canRetry:e.stage>0&&this.canChallenge(e.id)};
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
    require('./adventure-records.cjs').remember(this,s,now);
    if(s.kind==='oak'&&s.next==='rival'&&s.index===1&&!story.giftReceived){
      story.giftReceived=true;this.log('피카츄가 첫 동료가 되었다!','gift',25,now);
    }
    if(s.index+1<s.pages.length){s.index++;return true;}
    story.scene=null;
    if(s.next==='rival'){this.startRival(now);return true;}
    if(s.next==='sendout'){
      this.prepareTrainerLead();
      story.scene={id:++story.serial,mode:'sendout',kind:s.kind==='ghost'?'ghost-sendout':'sendout',at:now,duration:2700,name:s.name,sprite:s.sprite};
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
      this.animate('result',{text:'포켓몬피리를 받았어요. 연분홍시티로 가는 길목의 잠만보를 깨워 보세요.'},now);return true;
    }
    if(s.next==='lapras-gift'){
      if(story.laprasResolved)return false;story.laprasResolved=true;
      const uid=this.addPokemon(131,15,'gift',now);story.laprasUid=uid;
      this.log('실프주식회사 직원에게 라프라스 Lv.15를 받았다!','gift',131,now);
      this.animate('result',{text:'라프라스 Lv.15가 동료가 됐다!'},now);return true;
    }
    if(s.next==='scope-reward'){
      if(!story.scopeObtainedAt){story.scopeObtainedAt=now;this.log('실프스코프를 발견했다!','item',null,now);}
      this.animate('result',{text:'실프스코프를 가방에 넣었어요. 무지개시티의 민화에게 향해 보세요.'},now);return true;
    }
    if(s.next==='safari-depart'){const ok=safari.start(this,now);this.holdUntil(now+800);return ok;}
    if(s.next==='mansion-begin'){story.mansion.startedAt=now;this.log('홍련섬의 폐저택 조사를 시작했다.','info',null,now);this.holdUntil(now+800);return true;}
    if(s.next==='mansion-read'){
      const m=story.mansion;if(!m.startedAt||m.read>=3||m.wins<(m.read+1)*2)return false;
      m.read++;this.log('저택의 연구일지 '+m.read+'장을 읽었다.','info',null,now);
      if(m.read===3){m.completedAt=now;m.keyObtainedAt=now;this.log('홍련체육관의 비밀열쇠를 발견했다!','item',null,now);this.animate('result',{text:'비밀열쇠로 홍련체육관의 문을 열었다!'},now);}else this.holdUntil(now+1000);return true;
    }
    if(s.next==='device-reward'){
      this.acceptingDevice=true;let received;
      try{received=training.claim(this,now,false);}finally{this.acceptingDevice=false;}
      if(received)this.animate('result',{text:'오박사의 조수에게 학습장치를 받았다!'},now);return received;
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
  battleBoss(b=this.data.battle){
    if(b?.storyId==='tower-grunt-2'&&!(b.mobileStoryRevision>=3))return rescue.legacySecond;
    if(!b?.mobileStoryRevision&&b?.storyId==='tower-grunt-3')return rescue.legacyThird;
    if(!b?.mobileStoryRevision&&b?.storyId==='rival-middle')return {...rivals.get('rival-silph'),id:'rival-middle'};
    if(!b?.storyId&&b?.bossIndex===12&&b.mobileLeagueRevision>=1)return champion;
    return rivals.get(b?.storyId)||storyEncounter(b?.storyId)||super.battleBoss(b);
  }
  challengeName(index){return index==='safari-start'?'사파리존 출발':index==='mansion-investigate'?'폐저택 조사':rivals.has(index)?'그린 재도전':storyEncounter(index)?.name||super.challengeName(index);}
  challenge(index,now=Date.now()){
    if(!rivals.has(index)&&!storyEncounter(index)&&!['safari-start','mansion-investigate'].includes(index))return super.challenge(index,now);
    if(!this.canChallenge(index)||this.data.battle&&(this.data.battle.kind==='trainer'||this.data.battle.storyId))return false;
    if(this.data.pendingChallenge)return this.data.pendingChallenge.index===index;
    if(this.data.battle||this.data.pendingBattle||now<this.data.switchUntil||now<this.nextTick){
      this.data.pendingChallenge={index,queuedAt:now};this.log(this.challengeName(index)+' 예약','challenge',null,now);return true;
    }
    return this.startChallenge(index,now);
  }
  startChallenge(index,now){
    if(['safari-start','mansion-investigate'].includes(index)){
      if(!this.canChallenge(index)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
      this.data.pendingChallenge=null;
      if(index==='safari-start'){
        if(this.data.mobileStory.safari.visitedAt){safari.start(this,now);this.animate('result',{text:'사파리존 탐험을 시작했어요.'},now);}
        else this.dialogue('safari','사파리 안내원','scientist',['사파리존에 어서 와! 여기서는 포켓몬과 싸우지 않고 조용히 다가가서 포획한단다.',this.platform==='desktop'?'작업하는 동안 탐험하고 돌아오면 어떤 동료를 만났는지 살펴보렴. 몬스터볼 30개로 다녀올 수 있어.':'폰을 잠근 동안 탐험하고 돌아오면 어떤 동료를 만났는지 살펴보렴. 몬스터볼 30개로 다녀올 수 있어.'],'safari-depart',now);
      }
      else this.dialogue('diary','홍련섬의 폐저택','item:journal',['불에 탄 저택 안에는 오래된 연구 흔적이 남아 있다. 잠긴 체육관과도 관계가 있을까?','동료와 모험을 이어가며 남은 기록을 조사해 보기로 했다.'],'mansion-begin',now);
      return true;
    }
    const gate=this.rivalGate(index),encounter=gate&&this.rivalProgress(gate.id)?.state==='unseen'?gate:rivals.get(index)||storyEncounter(index);
    if(!encounter){const ok=super.startChallenge(index,now);if(ok&&index===8)this.data.battle.mobileLeagueRevision=1;return ok;}
    if(!this.canChallenge(index)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
    const e=encounter;
    if(storyEncounter(e.id))this.data.mobileStory[silph.byId.has(e.id)?'silph':'rescue'].investigatedAt ||= now;
    this.data.pendingChallenge=null;this.data.captureAnimation=null;this.data.manualSelection=false;
    const party=Object.fromEntries(this.data.slots.filter(uid=>uid!==null&&!this.isBoarded(uid)).map(uid=>[uid,this.memberCombatant(this.data.owned[uid])]));
    this.data.battle={kind:'trainer',mobileStoryRevision:3,bossIndex:e.id,storyId:e.id,foeIndex:0,party,turn:0,startedAt:now};
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
    this.data.pendingChallenge=null;this.restoreWild(now);
    if(e.stage===0){this.data.mobileStory.onboarding='closing';this.dialogue('oak','오박사','oak',oakClose,'adventure',now);}
    else this.animate('result',{text:won?e.result:'동료들을 회복했어요. 타운맵에서 그린에게 다시 도전하세요.'},now);
  }
  abandon(now=Date.now()){
    if(rivals.has(this.data.battle?.storyId)){if(this.presentation())return false;this.resolveRival(false,now,true);return true;}
    return super.abandon(now);
  }
  nextTrainer(now){
    const b=this.data.battle,boss=this.battleBoss(b),first=b.foeIndex===0;
    super.nextTrainer(now);
    if(b.kind==='trainer'&&first){
      const pages=boss.intro||rivals.get(boss.id)?.intro||trainerDialogue.intro(boss,this.data.champion);
      this.dialogue(boss.ghost?'ghost':'trainer',boss.name,portrait(boss),pages,'sendout',now);
    }
  }
  defeatOpponent(now,captured=false){
    const b=this.data.battle;
    if(b?.kind==='trainer'&&b.foeIndex===this.battleBoss(b).team.length-1){
      const boss=this.battleBoss(b);
      this.data.pendingBattle=null;
      if(rivals.has(b.storyId))this.resolveRival(true,now);
      else this.dialogue(boss.ghost?'ghost':'trainer',boss.name,portrait(boss),boss.ghost?['텅구리의 유령은 잠시 이쪽을 바라보았다. 새끼를 향한 걱정이 조금씩 누그러지는 듯했다.','어미의 영혼이 안식을 찾고, 위층으로 향하는 길이 열렸다.']:trainerDialogue.victory(boss,this.data.champion,this),'win',now);
      return;
    }
    super.defeatOpponent(now,captured);
    if(b?.kind==='wild'&&!b.storyId&&this.data.mobileStory.mansion.startedAt&&!this.data.mobileStory.mansion.completedAt)this.data.mobileStory.mansion.wins++;
    if(b?.storyId==='road-snorlax'&&this.data.battle!==b)this.data.animation.text=(captured?'잠만보를 깨워 함께 모험하기로 했어요.':'잠만보를 물리쳐 길이 열렸어요.')+(this.data.badges.includes('koga')?'':' 독수에게 도전할 수 있어요.');
  }
  finishTrainerWin(now){
    const b=this.data.battle,e=storyEncounter(b?.storyId);
    if(!e){
      const boss=this.battleBoss(b),scope=boss?.id==='rocket-giovanni'&&!this.data.mobileStory.scopeObtainedAt,owned=new Set(Object.keys(this.data.owned));
      super.defeatOpponent(now);
      if(scope&&this.data.trainingDevice.rocketWonAt)this.dialogue('item','아지트의 남겨진 물건','item:silph-scope',['비주기가 떠난 자리에서 낯선 장치를 발견했다. “실프스코프”라고 적혀 있다.','눈에 보이지 않는 존재의 정체를 확인하는 장치인 모양이다. 가방에 넣어 두자.'],'scope-reward',now);
      if(!this.presentation()&&this.data.animation?.kind==='result'){
        const joined=Object.entries(this.data.owned).filter(([uid])=>!owned.has(uid)).map(([,p])=>species.get(p.id).name+'가 동료가 됐어요. ').join('');
        this.animate('result',{text:joined+trainerDialogue.result(boss,this)},now);
      }
      return;
    }
    const isSilph=silph.byId.has(e.id),r=this.data.mobileStory[isSilph?'silph':'rescue'];
    if(!r.wins[e.stage]){this.awardXp(b.foe,e.xpTrainer!==false,now);this.data.battles++;journal.increment(this.data,'wins');r.wins[e.stage]=now;this.log(e.ghost?'어미 텅구리의 영혼이 안식을 찾았다.':e.name+'에게 승리!','story',null,now);}
    this.data.pendingChallenge=null;this.restoreWild(now);
    if(isSilph){
      if(r.wins.every(Boolean))r.completedAt=now;
      this.animate('result',{text:trainerDialogue.result(e,this)},now);
    }else if(r.wins.every(Boolean)){
      r.rewardPending=true;this.dialogue('elder','등나무노인','mr-fuji',['어미 텅구리의 영혼도 이제 편히 쉴 수 있겠구나. 도와줘서 정말 고맙다.','이 피리를 받아 주렴. 포켓몬의 마음까지 닿는 소리가 난단다.'],'rescue-reward',now);
    }else this.animate('result',{text:trainerDialogue.result(e,this)},now);
  }
  endChallenge(won,now){
    const b=this.data.battle;
    if(rivals.has(b?.storyId)){this.resolveRival(false,now);return;}
    if(!won&&b?.kind==='trainer'){
      const boss=this.battleBoss(b);this.data.pendingBattle=null;
      this.dialogue(boss.ghost?'ghost':'trainer',boss.name,portrait(boss),boss.ghost?['차가운 기운에 더는 다가갈 수 없었다. 동료들을 회복하고 다시 돌아오자.']:trainerDialogue.defeat(boss),'loss',now);return;
    }
    super.endChallenge(won,now);
  }
  sceneTick(now){
    const s=this.presentation();
    if(s?.mode==='trainer-intro'&&s.automatic){
      if(now<s.at+s.duration)return false;
      const story=this.data.mobileStory;
      story.scene={id:++story.serial,mode:'sendout',kind:'sendout',automatic:true,at:now,duration:2700,name:s.name,sprite:s.sprite};
      this.data.animation=null;return true;
    }
    if(s?.mode!=='sendout'||now<s.at+s.duration)return false;
    this.data.mobileStory.scene=null;this.data.animation=null;
    this.holdUntil(now+650);return true;
  }
  snapshot(now=Date.now()){
    const s=super.snapshot(now);
    return {...s,...(this.data.mobileStory?.safari?{safari:safari.snapshot(this)}:{}),...(world.active(this)&&this.data.mobileStory?{location:{id:world.current(this).id,name:world.current(this).name}}:{})};
  }
  tick(now=Date.now()){
    if(this.presentation())return false;
    const b=this.data.battle;
    if(!this.seasonDue(now)&&this.advanceTravel(now))return true;
    // Exploring spends its own activity. Keep banked wild work and the paused
    // opponent intact; explicit challenges and the monthly rollover still run.
    if(this.data.mobileStory.safari.trip&&!this.data.pendingChallenge&&b?.kind!=='trainer'&&!b?.storyId&&!this.seasonDue(now))return this.controlTick(now);
    return this.offerLapras(now)||this.offerMansion(now)||this.offerDevice(now)||super.tick(now);
  }
  actionStatus(a,now=Date.now()){
    if(a.kind==='travel'){const status=this.travelStatus(a.location,a.position);if(status)return status;}
    if(a.kind==='select'&&a.uid===this.data.activeId)return super.actionStatus(a,now);
    if(this.presentation())return {state:'waiting',reason:'대화가 끝나면 실행해요.'};
    return super.actionStatus(a,now);
  }
  canChallenge(index){
    if(this.presentation())return false;
    if(index==='safari-start')return safari.unlocked(this)&&!this.data.mobileStory.safari.trip;
    if(index==='mansion-investigate')return mansion.ready(this);
    if(rivals.has(index))return rivals.get(index).stage>0&&this.rivalProgress(index)?.state==='retry';
    const gate=this.rivalGate(index);if(gate&&this.rivalProgress(gate.id)?.state==='retry')return false;
    if(rescue.byId.has(index))return rescue.ready(this,index);
    if(silph.byId.has(index))return silph.ready(this,index);
    if(index===5&&!this.data.mobileStory?.silph?.completedAt)return false;
    if(index===6&&!this.data.mobileStory?.mansion?.completedAt)return false;
    return super.canChallenge(index);
  }
  panelState(now=Date.now()){
    const s=super.panelState(now),locks={};for(const e of encounters)if(e.target!==null&&this.rivalProgress(e.id)?.state==='retry')locks[e.target]='그린에게 승리해야 도전할 수 있어요.';
    const d=this.data.trainingDevice,story=this.data.mobileStory;
    const discovery={rocket:this.data.badges.includes('surge')||!!(d.gruntWonAt||d.duoWonAt||d.rocketWonAt),road:this.data.badges.includes('erika')||!!(d.fluteObtainedAt||d.snorlaxWonAt||d.legacyRoadAccess)||this.data.battle?.storyId==='road-snorlax'};
    const hints={};if(!story.silph.completedAt&&this.data.badges.includes('koga'))hints[5]='실프주식회사 사건 해결 시 해금';if(!story.mansion.completedAt&&this.data.badges.includes('sabrina'))hints[6]='홍련체육관의 문이 잠겨 있어요.';
    if(s.bosses[12].revealed&&!(this.data.battle?.bossIndex>=8&&!this.data.battle.mobileLeagueRevision))s.bosses[12]={...s.bosses[12],team:champion.team};
    const items=[];if(story.scopeObtainedAt)items.push({id:'silph-scope',name:'실프스코프',count:1});if(story.mansion.keyObtainedAt)items.push({id:'secret-key',name:'비밀열쇠',count:1});
    for(const p of s.collection.filter(p=>wildExclusions.includes(p.id))){
      const routes=p.acquisition.routes.filter(r=>r.kind!=='wild'),event=p.id===131;
      const labels={starter:'스타팅',event:'이벤트',hatch:'부화',evolution:'진화'};
      const summary=[event?'이벤트':'사파리존',...routes.map(r=>r.kind==='evolution'&&r.special?'특수진화':labels[r.kind])];
      routes.unshift({kind:'event',text:event?'모험 중 특별한 만남으로 동료가 될 수 있어요.':'사파리존에서 만날 수 있어요.'});
      p.acquisition={...p.acquisition,wildAllowed:false,routes,summary:[...new Set(summary)].join(' · '),note:'일반 야생에서는 출현하지 않아요.'};
    }
    return {...s,kantoWorld:world.snapshot(this,now),adventureRecords:require('./adventure-records.cjs').list(this),dialogueMemories:this.data.dialogueMemories||[],inventory:[...s.inventory,...items],scene:this.presentation(),activityMode:this.platform==='desktop'?'tokens':'locked',onboarding:story?.onboarding!=='done',discovery,rivals:this.rivalState(),rivalLocks:locks,rescue:rescue.snapshot(this),silph:silph.snapshot(this),safari:{...safari.snapshot(this),canStart:this.canChallenge('safari-start')},mansion:{...mansion.snapshot(this),canStart:this.canChallenge('mansion-investigate')},mobileGymHints:hints};
  }
}
module.exports={Adventure:require('./johto-adventure.cjs').withJohto(require('./kanto-adventure.cjs').withKanto(Adventure))};
