'use strict';
const K=require('./kanto-journey.cjs'),world=require('./kanto-world.cjs');
const {data,species,balance,wildLevelCap,learnedMoves}=require('../desktop/pokemon.cjs');
const training=require('../desktop/training-device.cjs'),journal=require('../desktop/journal.cjs');
const fossilIds=[138,139,140,141];
const itemNames={'parcel':'오박사의 물건','ss-ticket':'상트안느호 승선권','lift-key':'승강기 열쇠','card-key':'카드키',138:'조개화석',140:'껍질화석'};
itemNames['fishing-rod']='낚싯대';
function init(g,saved,now){
 if(saved.kantoStory?.revision>=1){g.data.kantoStory=JSON.parse(JSON.stringify(saved.kantoStory));require('./kanto-migration.cjs').restore(g,now);return;}
 const legacy=Object.keys(saved).length>0;
 g.data.kantoStory={revision:1,legacy,cleared:{},roads:{},items:{},fossil:null,startedAt:now,...(legacy?{mapAt:now,dexAt:now,parcelAt:now,deliveredAt:now}: {})};
 if(!legacy){g.data.kantoWorld={revision:1,location:'pallet',position:{...world.snapshot(g).map.points.pallet},visited:{pallet:now}};}
 require('./kanto-migration.cjs').restore(g,now);
}
function withKanto(Base){return class KantoAdventure extends Base{
 constructor(saved={},now=Date.now(),options={}){
  super(saved,now,options);init(this,saved,now);
  if(K.nodes.has(saved.pendingChallenge?.index)&&this.canChallenge(saved.pendingChallenge.index))this.data.pendingChallenge={...saved.pendingChallenge};
  const scene=this.presentation();if(K.modern(this)&&scene?.kind==='oak'&&scene.next==='rival')scene.pages[3]='먼저 피카츄와 인사해 보렴. 그린도 첫 동료로 이브이를 골랐단다.';
 }
 resetSeason(now){super.resetSeason(now);init(this,{},now);}
 awardStarterGift(badge,now){return K.modern(this)?false:super.awardStarterGift(badge,now);}
 canReceiveFlute(){return super.canReceiveFlute();}
 captureRequested(id){return (!K.modern(this)||this.data.kantoStory.dexAt)&&!K.fossilBlocked(this,id)&&super.captureRequested(id);}
 canReserveCapture(id){return !K.fossilBlocked(this,id)&&(!K.modern(this)||!fossilIds.includes(id))&&super.canReserveCapture(id);}
 canAcquireSpecies(id){return !K.fossilBlocked(this,id);}
 wildOptions(){const o=super.wildOptions();return K.modern(this)?{...o,excluded:[...new Set([...(o.excluded||[]),...fossilIds])]}:o;}
 wildLevelCap(){
  if(!K.modern(this)||this.data.johtoUnlocked)return super.wildLevelCap();
  const gyms=K.order.map(i=>data.bosses[i]),next=gyms.findIndex(b=>!this.data.badges.includes(b.id)),league=data.bosses.slice(8).map((_,i)=>this.battleBoss({kind:'trainer',bossIndex:8+i,mobileLeagueRevision:1}));
  // The reordered story uses each original opponent's own party and gap.
  if(next>=0){const i=K.order[next];return wildLevelCap(i,false,{gyms:data.bosses.slice(0,8),league});}
  return wildLevelCap(8,this.data.champion,{league});
 }
 rivalGate(index){
  if(!K.modern(this))return super.rivalGate(index);
  if(index==='k-bridge-1')return require('./rivals.cjs').byId.get('rival-cerulean');
  if(index==='k-captain')return require('./rivals.cjs').byId.get('rival-surge');
  if(index==='tower-grunt-1'||index==='silph-duo')return super.rivalGate(index);
  return null;
 }
 challengeName(id){return K.nodes.get(id)?.name||super.challengeName(id);}
 trainerRevealed(boss){return K.modern(this)&&boss?.id==='giovanni'&&K.gymEntry(this,7).open||super.trainerRevealed(boss);}
 canChallenge(id){
  if(!this.data.kantoStory)return super.canChallenge(id);
  if(K.nodes.has(id)){const progress=this.rivalProgress(this.rivalGate(id)?.id);return K.ready(this,id)&&(!K.nodes.get(id).automatic||!!this.autoStarting||progress?.state==='unseen')&&progress?.state!=='retry';}
  if(!K.modern(this))return super.canChallenge(id);
  if(this.presentation())return false;
  const b=this.data.badges,has=id=>b.includes(id),s=this.data.kantoStory,at=this.data.kantoWorld?.location;
  const rivals=require('./rivals.cjs').byId;
  if(rivals.has(id)){
   const place={'rival-brock':'route-22','rival-cerulean':'route-24','rival-surge':'ss-anne','rival-middle':'tower','rival-silph':'saffron','rival-league':'route-22'}[id];if(place&&at!==place)return false;
   if(super.canChallenge(id))return true;
   if(this.rivalProgress(id)?.state!=='unseen')return false;
   return id==='rival-brock'&&at==='route-22'&&!!s.mapAt||id==='rival-league'&&at==='route-22'&&b.length>=8;
  }
  if(id==='safari-start')return has('koga')&&at==='safari'&&super.canChallenge(id);
  if(id==='road-snorlax')return ['route-12','route-16'].includes(at)&&!!this.data.trainingDevice.fluteObtainedAt&&(!s.roads[at]||this.captureRequested(143));
  if(id==='rocket-grunt')return has('erika')&&at==='celadon'&&!this.data.trainingDevice.gruntWonAt;
  if(id==='rocket-duo')return has('erika')&&at==='celadon'&&K.done(this,'k-lift-key')&&!this.data.trainingDevice.duoWonAt;
  if(id==='rocket-giovanni')return has('erika')&&at==='celadon'&&!!this.data.trainingDevice.duoWonAt&&!this.data.trainingDevice.rocketWonAt;
  if(id==='silph-grunt')return at==='saffron'&&!!s.drinkAt&&!this.data.mobileStory.silph.wins[0];
  if(id==='silph-duo'&&!K.done(this,'k-card-key'))return false;
  if(id==='tower-grunt-2'&&!K.originalDone(this,'tower'))return false;
  if(id==='tower-grunt-1'&&['won','completed'].includes(this.rivalProgress('rival-middle')?.state)&&!this.autoStarting)return false;
  if(require('./silph.cjs').byId.has(id))return at==='saffron'&&!!s.drinkAt&&!this.data.mobileStory.silph.wins[require('./silph.cjs').byId.get(id).stage]&&!!this.data.mobileStory.silph.wins[require('./silph.cjs').byId.get(id).stage-1]&&!(this.rivalGate(id)&&this.rivalProgress(this.rivalGate(id).id)?.state==='retry');
  if(require('./rescue.cjs').byId.has(id)&&(!this.data.mobileStory.scopeObtainedAt||at!=='tower'))return false;
  if(Number.isInteger(id)&&id>=0&&id<8){
   return !has(data.bosses[id].id)&&K.gymEntry(this,id).open&&K.originalDone(this,'gym:'+id)&&at===({0:'pewter',1:'cerulean',2:'vermilion',3:'celadon',4:'fuchsia',5:'saffron',6:'cinnabar',7:'viridian'}[id]);
  }
  if(id===8&&(!K.trainersDone(this,'victory-path')||at!=='indigo'))return false;
  return super.canChallenge(id);
 }
 challenge(id,now=Date.now()){
  if(this.data.battle?.activityTrainer&&this.canChallenge(id)){
   if(this.data.pendingChallenge)return this.data.pendingChallenge.index===id;this.data.pendingChallenge={index:id,queuedAt:now};this.log(this.challengeName(id)+' 예약','challenge',null,now);return true;
  }
  if(!K.nodes.has(id))return super.challenge(id,now);
  if(!this.canChallenge(id)||this.data.battle&&(this.data.battle.kind==='trainer'||this.data.battle.storyId))return false;
  if(this.data.pendingChallenge)return this.data.pendingChallenge.index===id;
  if(this.data.battle||this.data.pendingBattle||now<this.nextTick||now<this.data.switchUntil){this.data.pendingChallenge={index:id,queuedAt:now};this.log(this.challengeName(id)+' 예약','challenge',null,now);return true;}
  return this.startChallenge(id,now);
 }
 startChallenge(id,now){
  const n=K.nodes.get(id);
  if(!n){const ok=super.startChallenge(id,now);if(ok&&K.modern(this)&&this.data.battle){if(this.data.battle.rocketChain)this.data.battle.rocketChain=false;if(id==='road-snorlax')this.data.battle.roadLocation=this.data.kantoWorld.location;}return ok;}
  if(!this.canChallenge(id)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
  const gate=this.rivalGate(id);
  if(gate&&this.rivalProgress(gate.id)?.state==='unseen')return super.startChallenge(id,now);
  this.data.pendingChallenge=null;
  if(n.team){
   const party=Object.fromEntries(this.data.slots.filter(uid=>uid!==null&&!this.isBoarded(uid)).map(uid=>[uid,this.memberCombatant(this.data.owned[uid])]));
   this.data.battle={kind:'trainer',bossIndex:id,storyId:id,kantoNode:id,foeIndex:0,party,turn:0,startedAt:now};this.nextTrainer(now);this.log(n.name+'에게 도전!','challenge',null,now);return true;
  }
  this.dialogue('kanto-event',n.name,n.sprite,n.pages,'kanto-complete:'+id,now);return true;
 }
 battleBoss(b=this.data.battle){const n=K.nodes.get(b?.kantoNode);if(n)return {...n,kind:'story',intro:n.pages};const saved=this.data.kantoStory?.importedBattle;if(saved&&saved.storyId===b?.storyId&&saved.startedAt===b?.startedAt)return super.battleBoss(b);const alias={'tower-grunt-1':'tower','silph-grunt':'silph'}[b?.storyId];if(K.modern(this)&&alias){const t=K.aliases[alias];return {...super.battleBoss(b),name:t.name,sprite:t.sprite,team:t.team.map(p=>({...p,moves:learnedMoves(p.id,p.level).slice(-4)})),...(alias==='tower'?{intro:['누군가에게 홀린 듯한 무당이 길을 막았다.','배틀로 정신을 차리게 해 주자.']}: {})};}return super.battleBoss(b);}
 nextTrainer(now){
  if(this.autoStarting)this.data.battle.activityTrainer=true;
  super.nextTrainer(now);
  const b=this.data.battle,s=this.presentation();
  if(b.activityTrainer&&b.foeIndex===0&&s){s.mode='trainer-intro';s.automatic=true;s.duration=1800;s.pages=[s.name+'의 도전!'];}
 }
 endChallenge(won,now){if(!this.data.battle?.activityTrainer)return super.endChallenge(won,now);const boss=this.battleBoss();if(this.presentation()?.automatic)this.data.mobileStory.scene=null;if(!won&&this.data.battle.movementTrainer){const trip=this.data.kantoWorld.journey;if(trip){trip.bankCells=0;trip.bankLeg=false;}}this.data.pendingBattle=null;this.log(won?'승부를 마치고 모험으로 돌아왔다.':boss.name+'와의 승부에서 패배했다. 동료들을 회복했다.',won?'info':'loss',null,now);this.restoreWild(now);this.animate('result',{text:won?'모험을 계속해요.':'동료들을 회복했어요. 준비해서 다시 승부해요.'},now);}
 finishTrainerWin(now){
  const b=this.data.battle,n=K.nodes.get(b?.kantoNode);
  if(K.modern(this)&&training.rocketOrder.includes(b?.storyId)){
   this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');training.win(this,b.storyId,now);const id=b.storyId;this.restoreWild(now);
   if(id==='rocket-giovanni'&&!this.data.mobileStory.scopeObtainedAt)this.dialogue('item','남겨진 장치','item:silph-scope',['비주기가 떠난 자리에서 실프스코프를 발견했다.','보이지 않는 존재의 정체를 확인하는 장치다. 가방에 넣어 두자.'],'scope-reward',now);
   else this.animate('result',{text:id==='rocket-grunt'?'아지트 안쪽으로 향하는 길이 열렸어요.':id==='rocket-duo'?'아지트의 지휘실로 향해 보세요.':'로켓단이 아지트에서 물러났어요.'},now);return true;
  }
  if(K.modern(this)&&b?.storyId==='tower-grunt-1'){
   this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');this.data.mobileStory.rescue.wins[0]=now;this.log('무당이 제정신으로 돌아왔다.','story',null,now);this.restoreWild(now);this.animate('result',{text:'탑 안쪽의 트레이너들도 살펴보세요.'},now);return true;
  }
  if(!n)return super.finishTrainerWin(now);
  this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');
  this.data.kantoStory.cleared[n.id]=now;this.log(n.name+'에게 승리!','story',null,now);
  if(n.location==='mansion'&&this.data.mobileStory.mansion.startedAt&&!this.data.mobileStory.mansion.completedAt)this.data.mobileStory.mansion.wins++;
  this.restoreWild(now);this.animate('result',{text:require('./kanto-dialogue.cjs').result(this,n)||n.result},now);return true;
 }
 defeatOpponent(now,captured=false){
  const b=this.data.battle;
  if(b?.activityTrainer&&b.foeIndex===this.battleBoss(b).team.length-1){this.data.pendingBattle=null;this.finishTrainerWin(now);return;}
  if(b?.kantoNode&&b.foeIndex===this.battleBoss(b).team.length-1){const n=K.nodes.get(b.kantoNode);this.data.pendingBattle=null;this.dialogue('trainer',n.name,n.sprite,require('./kanto-dialogue.cjs').victory(this,n)||['네가 이겼어!',n.result],'win',now);return;}
  const road=b?.storyId==='road-snorlax'&&(b.roadLocation||this.data.kantoWorld?.location);
  const mansionWins=this.data.mobileStory.mansion.wins;super.defeatOpponent(now,captured);
  if(K.modern(this)&&this.data.kantoWorld.location!=='mansion')this.data.mobileStory.mansion.wins=mansionWins;
  if(road&&K.modern(this)&&this.data.battle!==b){this.data.kantoStory.roads[road] ||= now;this.log(road.replace('route-','')+'번도로의 길이 열렸다.','story',143,now);}
 }
 completeKantoNode(id,now){
  const n=K.nodes.get(id),s=this.data.kantoStory;if(!n||K.done(this,id))return false;
  // Conditions are rechecked at the persisted confirmation boundary.
  if(!K.prerequisite(this,n))return false;
  if(id==='k-fossil-choice')return false;
  if(n.gift){if(this.data.starterGifts[n.gift])return false;this.addPokemon(n.gift,n.level,'gift',now);this.data.starterGifts[n.gift]=now;}
  if(id==='k-fossil-restore'){if(!s.fossil||K.fossilBlocked(this,s.fossil))return false;this.addPokemon(s.fossil,30,'fossil',now);delete s.items[s.fossil];}
  if(n.item)s.items[n.item]=1;
  s.cleared[id]=now;this.log(n.result,n.gift?'gift':n.item?'item':'story',n.gift||null,now);this.animate('result',{text:n.result},now);return true;
 }
 advanceScene(key,now=Date.now()){
  const scene=this.presentation();if(!scene||scene.mode!=='dialogue'||key!==scene.id+':'+scene.index)return super.advanceScene(key,now);
  if(scene.next?.startsWith('kanto-complete:')&&scene.index===scene.pages.length-1){
   const id=scene.next.slice(15);if(id==='k-fossil-choice'){scene.choices=[{value:138,label:'조개화석'},{value:140,label:'껍질화석'}];scene.awaitChoice=true;return true;}
   require('./adventure-records.cjs').remember(this,scene,now);this.data.mobileStory.scene=null;return this.completeKantoNode(id,now);
  }
  if(scene.next?.startsWith('kanto-guide:')&&scene.index===scene.pages.length-1){
   const event=scene.next.slice(12),s=this.data.kantoStory;require('./adventure-records.cjs').remember(this,scene,now);this.data.mobileStory.scene=null;
   this.data.kantoWorld.journey=null;this.data.kantoWorld.walk=null;
   if(event==='parcel'){s.parcelAt=now;s.items.parcel=1;this.log('오박사의 물건을 맡았다.','item',null,now);}
   if(event==='deliver'){s.deliveredAt=now;s.dexAt=now;delete s.items.parcel;this.log('오박사에게 물건을 전하고 도감과 몬스터볼을 받았다.','item',null,now);}
   if(event==='map'){s.mapAt=now;this.data.kantoWorld.journey=null;this.data.kantoWorld.walk=null;this.log('그린의 누나에게 타운맵을 받았다.','item',null,now);}
   this.animate('result',{text:event==='parcel'?'물건을 가지고 태초마을의 오박사에게 돌아가요.':event==='deliver'?'그린의 집에도 들러 보세요.':'타운맵에서 다음 목적지를 선택할 수 있어요.'},now);return true;
  }
  const ok=super.advanceScene(key,now);
  if(ok&&K.modern(this)&&scene.next==='scope-reward'&&!this.presentation()&&this.data.animation)this.data.animation.text='실프스코프로 보라타운 포켓몬타워의 유령을 확인해 보세요.';
  if(ok&&K.modern(this)&&!this.data.kantoStory.mapAt){const s=this.presentation();if(s?.kind==='oak'&&s.next==='adventure')s.pages=['첫 배틀은 잘 봤다. 피카츄는 회복해 두었단다.','상록시티 상점에 맡겨 둔 물건이 있어. 피카츄와 함께 다녀와 주겠니?'];}
  return ok;
 }
 chooseFossil(value,now=Date.now()){
  const scene=this.presentation(),s=this.data.kantoStory,id=Number(value);
  if(!scene?.awaitChoice||scene.next!=='kanto-complete:k-fossil-choice'||![138,140].includes(id)||s.fossil||!K.prerequisite(this,K.nodes.get('k-fossil-choice')))return false;
  s.fossil=id;s.items[id]=1;s.cleared['k-fossil-choice']=now;require('./adventure-records.cjs').remember(this,scene,now);this.data.mobileStory.scene=null;
  for(const p of fossilIds)if(K.fossilBlocked(this,p))delete this.data.captureReservations[p];
  this.log(itemNames[id]+'을 골랐다. 다른 화석은 연구원이 가져갔다.','item',null,now);this.animate('result',{text:itemNames[id]+'을 챙겼어요.'},now);return true;
 }
 requestAction(kind,value,now=Date.now()){return kind==='fossil-choice'?this.chooseFossil(value,now):super.requestAction(kind,value,now);}
 guideTick(now){
  const s=this.data.kantoStory;if(!K.modern(this)||this.data.johtoUnlocked||s.mapAt||this.data.mobileStory.onboarding!=='done'||this.presentation()||this.data.battle||this.data.suspendedWild||this.data.pendingBattle||this.data.pendingChallenge||this.data.pendingActions.length||this.seasonDue(now)||now<this.nextTick||now<this.data.switchUntil)return false;
  const here=world.current(this).id;
  if(here==='viridian'&&!s.parcelAt){this.dialogue('kanto-event','상록시티 상점 주인','gentleman',['태초마을의 오박사님을 아니? 부탁하신 물건이 막 도착했어.','박사님께 이 물건을 전해 주겠니?'],'kanto-guide:parcel',now);return true;}
  if(here==='pallet'&&s.parcelAt&&!s.deliveredAt){this.dialogue('oak','오박사','oak',['수고했다! 내가 부탁한 물건이구나.','이제 포켓몬 도감과 몬스터볼을 주마. 만난 포켓몬을 기록하고 새 동료를 데려와 보렴.'],'kanto-guide:deliver',now);return true;}
  if(here==='pallet'&&s.deliveredAt){this.dialogue('kanto-event','그린의 누나','lass',['그린은 벌써 떠났어. 너도 여행을 시작하는구나.','이 타운맵을 가져가. 가고 싶은 곳을 고르면 길을 찾아갈 수 있을 거야.'],'kanto-guide:map',now);return true;}
  const target=s.parcelAt?'pallet':'viridian',w=this.data.kantoWorld;
  if(!w.journey){this.guiding=true;try{world.travel(this,target,now);}finally{this.guiding=false;}return true;}
  if(w.journey.index>=w.journey.segments.length)return world.advance(this,now);
  if(this.data.workTokens<balance.tokensPerAction)return false;
  this.data.workTokens-=balance.tokensPerAction;w.guideCredit=(w.guideCredit||0)+1;return world.advance(this,now);
 }
 controlTick(now=Date.now()){return this.guideTick(now)||super.controlTick(now);}
 startAutomaticTrainer(id,now=Date.now()){
  const n=K.nodes.get(id),alias=id==='tower-grunt-1'&&['won','completed'].includes(this.rivalProgress('rival-middle')?.state);
  if(!K.modern(this)||this.data.johtoUnlocked||!n?.automatic&&!alias||this.data.workTokens<balance.tokensPerAction||this.presentation()||this.data.battle||this.data.pendingBattle||this.data.suspendedWild||this.data.pendingChallenge||this.data.pendingActions.length||this.seasonDue(now)||now<this.nextTick||now<this.data.switchUntil)return false;
  if(n&&this.rivalGate(id)&&!['won','completed'].includes(this.rivalProgress(this.rivalGate(id).id)?.state))return false;
  this.autoStarting=true;let ok;try{ok=this.startChallenge(id,now);}finally{this.autoStarting=false;}if(ok){this.data.workTokens-=balance.tokensPerAction;if(require('./step-travel.cjs').bankActive(this)&&this.data.battle)this.data.battle.movementTrainer=true;}return !!ok;
 }
 movementTrainerNode(){return K.modern(this)&&!this.data.johtoUnlocked?[...K.nodes.values()].find(n=>n.trainer&&n.automatic&&K.ready(this,n.id))?.id:null;}
 startMovementTrainer(now){const id=this.movementTrainerNode();if(!id||!require('./step-travel.cjs').bankActive(this))return false;this.data.workTokens=balance.tokensPerAction;try{return this.startAutomaticTrainer(id,now);}finally{this.data.workTokens=0;}}
 tick(now=Date.now()){
  if(this.guideTick(now))return true;
  // A guided cell spends an activity action, rather than starting wild combat.
  if(K.modern(this)&&!this.data.johtoUnlocked&&!this.data.kantoStory.mapAt&&this.data.mobileStory.onboarding==='done'&&!this.data.battle&&!this.data.pendingBattle)return false;
  if(!this.data.mobileStory.safari.trip){
   const n=[...K.nodes.values()].find(n=>n.automatic&&K.ready(this,n.id));
   if(n&&this.startAutomaticTrainer(n.id,now)||this.data.kantoWorld.location==='tower'&&this.startAutomaticTrainer('tower-grunt-1',now))return true;
  }
  return super.tick(now);
 }
 panelState(now=Date.now()){
  const s=super.panelState(now),k=K.snapshot(this);if(!k)return s;
  if(K.modern(this)){
   s.gymEntry=Array.from({length:8},(_,i)=>K.gymEntry(this,i));
   s.mobileGymHints={};
   if(!K.done(this,'k-captain'))s.mobileGymHints[2]='상트안느호에서 선장을 만나 보세요.';
   if(!this.data.mobileStory.silph.completedAt)s.mobileGymHints[5]='실프주식회사 사건 해결 시 해금';
   if(!this.data.badges.includes('sabrina'))s.mobileGymHints[4]='노랑체육관에서 실력을 증명한 뒤 찾아오세요.';
   if(!this.data.mobileStory.mansion.completedAt)s.mobileGymHints[6]='홍련체육관의 문이 잠겨 있어요.';
   s.discovery.rocket=this.data.badges.includes('erika');
   if(s.rescue?.steps[0])Object.assign(s.rescue.steps[0],{name:s.rescue.steps[0].revealed?K.aliases.tower.name:'???',sprite:K.aliases.tower.sprite,team:s.rescue.steps[0].revealed?K.aliases.tower.team:[]});
   for(const r of s.trainingDevice.steps)r.available=this.canChallenge(r.id);
   for(const p of s.collection.filter(p=>fossilIds.includes(p.id))){const blocked=K.fossilBlocked(this,p.id);p.acquisition={wildAllowed:false,routes:blocked?[]:[{kind:p.id===139||p.id===141?'evolution':'event',text:p.id===139?'No.138 암나이트 · Lv.40 레벨업 시 자동진화':p.id===141?'No.140 투구 · Lv.40 레벨업 시 자동진화':'모험 중 특별한 만남으로 동료가 될 수 있어요.'}],summary:blocked?'이번 모험에서 선택하지 않은 계열':p.id===139||p.id===141?'진화':'이벤트',note:blocked?'다음 시즌에 다른 화석을 선택할 수 있어요.':'일반 야생에서는 출현하지 않아요.'};}
  }
  s.inventory.push(...Object.entries(this.data.kantoStory.items).map(([id,count])=>({id:'kanto-'+id,name:itemNames[id]||id,count})));
  return {...s,kantoStory:k};
 }
 snapshot(now=Date.now()){return {...super.snapshot(now),kantoStory:K.snapshot(this)};}
 rivalState(){const rows=super.rivalState();if(!K.modern(this))return rows.filter(r=>r.id!=='rival-cerulean');for(const row of rows)if(row.canRetry&&!row.met){const e=require('./rivals.cjs').byId.get(row.id);Object.assign(row,{met:true,name:'그린',sprite:e.sprite,team:e.team});}return rows;}
 offerDevice(now){return (!K.modern(this)||this.data.johtoUnlocked||this.data.kantoWorld.location==='route-15')&&super.offerDevice(now);}
 offerLapras(now){return (!K.modern(this)||this.data.kantoWorld.location==='saffron')&&super.offerLapras(now);}
 offerMansion(now){return (!K.modern(this)||this.data.kantoWorld.location==='mansion')&&super.offerMansion(now);}
};}
module.exports={withKanto};
