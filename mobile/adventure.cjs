'use strict';
// Android presentation belongs to the saved adventure, not to a renderer timer.
// The underlying battle engine and desktop product are unchanged.
const {Game:Engine}=require('../desktop/game.cjs');
const {learnedMoves}=require('../desktop/pokemon.cjs');
const journal=require('../desktop/journal.cjs');
const rival={id:'tutorial-green',name:'그린',team:[{id:133,level:5,moves:learnedMoves(133,5).slice(-4)}]};
const oakIntro=[
  '반갑다! 나는 포켓몬을 연구하는 오박사란다. 작은 모험에 온 걸 환영한다!',
  '이 피카츄가 네 첫 동료란다. 함께 포켓몬을 만나고, 잡고, 키워 보렴.',
  '앱을 켜 두면 자동으로 모험한단다. 꺼 둔 동안에는 10걸음마다 모험이 이어지지.',
  '포켓기어에서 동료를 살펴보고, 도전하기에서 실력을 시험해 보렴. 물건은 가방에 있단다.'
];
const oakClose=['첫 배틀은 어땠니? 이기든 지든 동료와 함께 배우면 된단다. 피카츄는 회복해 두었단다.','이제 너희의 모험이 시작이다! 새로 만난 동료와 모험 기록도 가끔 살펴보렴.'];
function portrait(boss){return boss.id==='tutorial-green'?'green':boss.id==='rocket-giovanni'?'giovanni':boss.id;}
class Adventure extends Engine{
  constructor(saved={},now=Date.now(),options={}){
    super(saved,now,options);
    if(!this.data.mobileStory){
      // Any pre-existing game is a migration, including one at the first level.
      const existing=Object.keys(saved).length>0;
      this.data.mobileStory={revision:1,onboarding:existing?'done':'oak',serial:0,giftReceived:existing};
      if(!existing)this.dialogue('oak','오박사','oak',oakIntro,'rival',now);
    }
  }
  resetSeason(now){
    const story=this.data.mobileStory;
    super.resetSeason(now);
    if(story)this.data.mobileStory={...story,onboarding:'done',scene:null};
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
      this.data.pendingBattle=null;this.data.battle=null;story.onboarding='closing';
      this.dialogue('oak','오박사','oak',oakClose,'adventure',now);return true;
    }
    if(s.next==='adventure'){
      story.onboarding='done';story.completedAt=now;
      this.data.animation=null;this.holdUntil(now+1000);return true;
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
    this.nextTrainer(now);
  }
  battleBoss(b=this.data.battle){return b?.storyId===rival.id?rival:super.battleBoss(b);}
  nextTrainer(now){
    const b=this.data.battle,boss=this.battleBoss(b),first=b.foeIndex===0;
    super.nextTrainer(now);
    if(b.kind==='trainer'&&first){
      const pages=boss.id===rival.id?['야! 나도 포켓몬을 받았다고!','내 이브이랑 네 피카츄, 누가 더 강한지 겨뤄 보자!']:[boss.name+'의 도전!','좋아, 포켓몬 배틀을 시작하자!'];
      this.dialogue('trainer',boss.name,portrait(boss),pages,'sendout',now);
    }
  }
  defeatOpponent(now,captured=false){
    const b=this.data.battle;
    if(b?.kind==='trainer'&&b.foeIndex===this.battleBoss(b).team.length-1){
      const boss=this.battleBoss(b);
      this.data.pendingBattle=null;
      if(b.storyId===rival.id){
        this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');
        this.log('그린과의 첫 배틀에서 승리했다!','win',null,now);
        this.dialogue('trainer','그린','green',['쳇! 이번에는 네가 이겼네. 다음에는 내가 이길 거야!'],'tutorial-end',now);
      }else this.dialogue('trainer',boss.name,portrait(boss),['멋진 배틀이었어! 내 패배를 인정할게.'],'win',now);
      return;
    }
    super.defeatOpponent(now,captured);
  }
  finishTrainerWin(now){super.defeatOpponent(now);}
  endChallenge(won,now){
    const b=this.data.battle;
    if(b?.storyId===rival.id){
      this.data.pendingBattle=null;
      this.log('그린과의 첫 배틀을 마쳤다.','loss',null,now);
      this.dialogue('trainer','그린','green',['하하! 내가 이겼지? 다음에 또 겨뤄 보자!'],'tutorial-end',now);return;
    }
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
  canChallenge(index){return !this.presentation()&&super.canChallenge(index);}
  panelState(now=Date.now()){return {...super.panelState(now),scene:this.presentation(),onboarding:this.data.mobileStory?.onboarding!=='done'};}
}
module.exports={Adventure};
