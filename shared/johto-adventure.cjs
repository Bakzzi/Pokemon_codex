'use strict';
const J=require('./johto.cjs'),{Game:Engine}=require('../desktop/game.cjs'),battle=require('../desktop/battle.cjs');
const {data,species,championBonus,wildDistribution,wildEligible,wildMinimum,wildLevelCap}=require('../desktop/pokemon.cjs');
const journal=require('../desktop/journal.cjs'),nursery=require('../desktop/daycare.cjs');
const consumables=require('../desktop/consumables.cjs');
const storyText=require('./johto-dialogue.cjs');
const oddEgg=[172,173,174,236,238,239,240];
const itemNames={'squirt-bottle':'꼬부기물뿌리개','secret-potion':'비전신약','clear-bell':'크리스탈방울','silver-wing':'은빛날개','rainbow-wing':'무지갯빛날개','ss-ticket':'승선티켓','machine-part':'기계부품','expansion-card':'라디오 확장카드','gs-ball':'GS볼','red-scale':'빨간비늘'};
function withJohto(Base){return class JohtoAdventure extends Base{
 constructor(saved={},now=Date.now(),options={}){
  super(saved,now,options);
  if(J.active(this)||saved.johto)J.init(this,saved.pendingChallenge);
  this.prepareJohtoJourney(now);
  this.awardCompletionItem(now);
  if(J.active(this)&&J.nodes.has(saved.pendingChallenge?.index)&&saved.pendingChallenge.index!=='j-arrival')this.data.pendingChallenge={...saved.pendingChallenge};
  const scene=this.presentation(),boss=this.data.battle?.johtoId&&this.battleBoss();
  if(boss&&scene?.next==='johto-win'){scene.pages=storyText.victory(this,boss);scene.index=Math.min(scene.index,scene.pages.length-1);}
 }
 prepareJohtoJourney(now){
  if(!J.active(this))return;
  const s=J.init(this);s.cleared['j-arrival'] ||= now;s.cleared['j-partner'] ||= now;
  if(this.presentation()?.next==='johto-reward:j-arrival')this.data.mobileStory.scene=null;
 }
 unlockJohto(now=Date.now(),ids){const ok=super.unlockJohto(now,ids);if(ok)this.prepareJohtoJourney(now);return ok;}
 battleBoss(b=this.data.battle){return J.battleBoss(this,b?.bossIndex)||super.battleBoss(b);}
 challengeName(id){return J.nodes.get(id)?.title||super.challengeName(id);}
 canChallenge(id){
  if(!J.nodes.has(id))return J.active(this)?false:super.canChallenge(id);
  return !this.presentation()&&J.available(this,J.nodes.get(id));
 }
 challenge(id,now=Date.now()){
  if(!J.nodes.has(id))return J.active(this)?false:super.challenge(id,now);
  if(!this.canChallenge(id)||this.data.battle&&(this.data.battle.kind==='trainer'||this.data.battle.storyId))return false;
  if(this.data.pendingChallenge)return this.data.pendingChallenge.index===id;
  if(this.data.battle||this.data.pendingBattle||now<this.data.switchUntil||now<this.nextTick){this.data.pendingChallenge={index:id,queuedAt:now};this.log(this.challengeName(id)+' 예약','challenge',null,now);return true;}
  return this.startChallenge(id,now);
 }
 startChallenge(id,now){
  if(!J.nodes.has(id))return super.startChallenge(id,now);
  if(!this.canChallenge(id)||this.data.battle||this.data.pendingBattle||now<this.data.switchUntil)return false;
  const s=J.init(this),gate=J.rivalNodes.find(n=>n.target===id&&!s.rivals[n.id]?.state);
  const n=gate||J.nodes.get(id);this.data.pendingChallenge=null;this.data.captureAnimation=null;this.data.manualSelection=false;
  if(n.starter){this.completeJohtoNode(n,now);this.animate('result',{text:species.get(n.gift).name+'가 동료가 됐어요.'},now);return true;}
  if(['dialogue','gift','egg','odd-egg'].includes(n.type)){
   for(const seen of n.encounterSeen||[])this.data.seen[seen] ||= now;
   this.dialogue('johto-event',n.title,n.sprite||'j-sage',storyText.eventPages(n)||['주변을 차분히 살펴보았다.'],'johto-reward:'+n.id,now);return true;
  }
  if(n.type==='league-start')return this.startJohtoBattle(J.league[0],now,{johtoLeague:true,foeStage:0});
  if(n.type==='rival'){s.rivals[n.id] ||= {};s.rivals[n.id].state='active';s.rivals[n.id].metAt ||= now;}
  return this.startJohtoBattle(n,now);
 }
 startJohtoBattle(n,now,extra={}){
  const party=Object.fromEntries(this.data.slots.filter(uid=>uid!==null&&!this.isBoarded(uid)).map(uid=>[uid,this.memberCombatant(this.data.owned[uid])]));
  const wild=n.type==='wild';this.data.battle={kind:wild?'wild':'trainer',bossIndex:n.id,storyId:n.id,johtoId:n.id,freeChallenge:true,foeIndex:0,party,turn:0,captureAttempts:0,startedAt:now,...extra};
  if(wild){
   if(n.shiny&&!Object.values(this.data.owned).some(p=>p.id===n.pokemon&&p.shiny))this.data.battle.allowDuplicateCapture=true;
   const b=this.data.battle;b.foe=battle.combatant(n.pokemon,n.level,null,{shiny:!!n.shiny});this.data.seen[n.pokemon] ||= now;
   this.animate('encounter',{id:n.pokemon,text:n.intro?.[0]||species.get(n.pokemon).name+' 등장!'},now);
   this.dialogue('johto-wild',n.title,n.sprite,n.intro||['포켓몬이 앞을 가로막았다!'],'johto-wild',now);
  }else this.nextTrainer(now);
  this.log(n.type==='rival'?'실버가 나타났다!':n.title+' 도전 시작','challenge',null,now);return true;
 }
 nextTrainer(now){
  const b=this.data.battle;if(!b?.johtoId)return super.nextTrainer(now);
  const boss=this.battleBoss(b);Engine.prototype.nextTrainer.call(this,now);
  if(b.foeIndex===0)this.dialogue('trainer',boss.name,boss.sprite,boss.intro||[boss.name+'에게 도전했다!','동료와 함께 쌓아 온 실력을 보여 주자.'],'sendout',now);
 }
 advanceScene(id,now=Date.now()){
  const scene=this.presentation();if(!scene?.next?.startsWith('johto-'))return super.advanceScene(id,now);
  if(scene.mode!=='dialogue'||id!==scene.id+':'+scene.index)return false;
  if(scene.index+1<scene.pages.length){scene.index++;return true;}
  this.data.mobileStory.scene=null;
  if(scene.next==='johto-wild'){this.data.animation=null;this.holdUntil(now+650);return true;}
  if(scene.next.startsWith('johto-reward:')){const n=J.nodes.get(scene.next.slice(13));if(!n)return false;this.completeJohtoNode(n,now);this.animate('result',{text:storyText.outcome(this,n)},now);return true;}
  if(scene.next==='johto-win')return this.finishJohtoWin(now);
  if(scene.next==='johto-loss')return this.finishJohtoLoss(now);
  return false;
 }
 completeJohtoNode(n,now){
  const s=J.init(this),first=!s.cleared[n.id];s.cleared[n.id] ||= now;
  if(n.starter){s.starterChoice ||= n.gift;s.cleared['j-partner'] ||= now;}
  if(n.gift&&first){const uid=this.addPokemon(n.gift,n.level||5,'gift',now);this.log(species.get(n.gift).name+' Lv.'+(n.level||5)+'가 동료가 됐다!','gift',n.gift,now);if(uid&&n.shiny)this.data.owned[uid].shiny=true;}
  if(['egg','odd-egg'].includes(n.type)&&!this.data.egg){
   const id=n.egg||oddEgg[Math.floor(this.random()*oddEgg.length)];this.data.egg={id,progress:0,required:species.get(id).hatchCycles*nursery.breedingBalance.tokensPerHatchCycle,parents:[],source:n.id,obtainedAt:now};
   this.log('새로운 알을 맡았다. 함께 모험하며 부화를 기다리자.','egg',null,now);
  }
  if(n.item&&first)this.receiveJohtoItem(n.item,now);
  if(n.id==='j-whitney'&&first)this.receiveJohtoItem('squirt-bottle',now);
  if(n.id==='j-red-gyarados'&&first)this.receiveJohtoItem('red-scale',now);
  if(n.id==='j-league-lance'){
   s.champion=true;s.leagueBest=5;if(first)this.receiveJohtoItem('ss-ticket',now);
  }
  if(first)for(const [id,count]of Object.entries(n.inventory||{})){this.data.inventory[id]=(this.data.inventory[id]||0)+count;this.log((data.items.find(x=>x.id===Number(id))?.name||'도구')+' 발견','item',null,now);}
  this.awardCompletionItem(now);
  if(first)this.log(n.title+'의 일을 마쳤다.','story',null,now);
 }
 awardCompletionItem(now){
  if(!J.active(this)||!J.done(this,'j-red')||!consumables.grantEvolutionItem(this.data,229))return false;
  this.log(data.items.find(item=>item.id===229).name+'를 받았다.','item',null,now);return true;
 }
 receiveJohtoItem(key,now){const s=J.init(this);if(s.items[key])return false;s.items[key]=now;this.log(itemNames[key]+'를 받았다.','item',null,now);return true;}
 defeatOpponent(now,captured=false){
  const b=this.data.battle;if(!b?.johtoId)return super.defeatOpponent(now,captured);
  const n=this.battleBoss(b);
  if(b.kind==='wild'){
   this.awardXp(b.foe,false,now);this.data.battles++;journal.increment(this.data,'wins');
   if(!captured)this.log(species.get(b.foe.id).name+'에게 승리했다!','win',b.foe.id,now);
   this.completeJohtoNode(n,now);const result=species.get(b.foe.id).name+(captured?'와 함께 모험하기로 했어요.':'를 진정시켰어요.');
   this.data.pendingBattle=null;this.restoreWild(now);this.animate('result',{text:result+' '+storyText.outcome(this,n)},now);return;
  }
  if(b.foeIndex<n.team.length-1){
   this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');b.foeIndex++;this.nextTrainer(now);return;
  }
  if(b.johtoResolution)return;
  b.johtoResolution='win';this.data.pendingBattle=null;
  this.dialogue('trainer',n.name,n.sprite,storyText.victory(this,n),'johto-win',now);
 }
 finishJohtoWin(now){
  const b=this.data.battle,n=b&&this.battleBoss(b);if(!b?.johtoId||b.johtoResolution!=='win')return false;
  this.awardXp(b.foe,true,now);this.data.battles++;journal.increment(this.data,'wins');this.log(n.name+'에게 승리했다!','win',null,now);delete b.johtoResolution;
  this.completeJohtoNode(n,now);
  if(n.type==='rival'){const p=J.init(this).rivals[n.id] ||= {};p.state='won';p.wonAt=now;}
  if(b.johtoLeague){
   this.data.johto.leagueBest=Math.max(this.data.johto.leagueBest,b.foeStage+1);
   if(b.foeStage<4){battle.prepareNextTrainer(this,b);const next=J.league[++b.foeStage];b.foeIndex=0;b.bossIndex=next.id;b.storyId=next.id;b.johtoId=next.id;this.nextTrainer(now);return true;}
  }
  this.data.pendingBattle=null;this.restoreWild(now);this.animate('result',{text:storyText.outcome(this,n)},now);return true;
 }
 endChallenge(won,now){
  const b=this.data.battle;if(!b?.johtoId)return super.endChallenge(won,now);
  if(won){this.data.pendingBattle=null;this.restoreWild(now);this.animate('result',{text:'도전을 마치고 모험으로 돌아왔어요.'},now);return;}
  if(b.johtoResolution==='loss')return;b.johtoResolution='loss';this.data.pendingBattle=null;
  const n=this.battleBoss(b);this.dialogue('trainer',n.name,n.sprite,n.loss||['동료들이 지쳐 더는 배틀을 이어갈 수 없었다.','잠시 쉬고 다시 도전하자.'],'johto-loss',now);
 }
 finishJohtoLoss(now){
  const b=this.data.battle,n=b&&this.battleBoss(b);if(!b?.johtoId||b.johtoResolution!=='loss')return false;
  if(n.type==='rival'){const p=J.init(this).rivals[n.id] ||= {};p.state=n.index===0?'completed':'retry';p.lostAt=now;}
  this.log(n.name+'에게 패배했다.','loss',null,now);this.data.pendingBattle=null;this.restoreWild(now);this.animate('result',{text:'동료들이 회복했어요. 준비가 되면 다시 도전하세요.'},now);return true;
 }
 abandon(now=Date.now()){
  if(!this.data.battle?.johtoId)return super.abandon(now);if(this.presentation())return false;
  this.endChallenge(false,now);return true;
 }
 offerLapras(now){return J.active(this)?false:super.offerLapras(now);}
 offerMansion(now){return J.active(this)?false:super.offerMansion(now);}
 offerDevice(now){return J.active(this)?false:super.offerDevice(now);}
 canReserveCapture(id){return J.active(this)?Engine.prototype.canReserveCapture.call(this,id):super.canReserveCapture(id);}
 captureRequested(id){return this.data.battle?.allowDuplicateCapture&&this.data.battle.foe?.id===id||super.captureRequested(id);}
 encounterBonus(){
  if(!J.active(this))return super.encounterBonus();if(!this.data.johto?.champion)return null;
  const selected=this.data.slots.map(uid=>this.data.owned[uid]).filter(Boolean),minimumLevel=selected.length?Math.min(...selected.map(p=>p.level)):0;
  return {...championBonus(minimumLevel),minimumLevel,selectedCount:selected.length,onlyUncaught:true};
 }
 wildLevelCap(){
  if(!J.active(this))return super.wildLevelCap();
  return wildLevelCap(J.gyms.filter(n=>J.done(this,n.id)&&(n.id!=='j-clair'||J.done(this,'j-dragon-den'))).length,!!this.data.johto?.champion);
 }
 wildOptions(){
  const previous=super.wildOptions();if(!J.active(this))return previous;
  J.init(this);
  // These species have ordinary Johto habitats even when their Kanto route
  // was Safari-only. Scyther must remain obtainable as Scizor's parent.
  const habitats=[113,115,123,127,128,131],regional=habitats.filter(id=>!J.done(this,id===123||id===127?'j-park':'j-morty'));
  return {...previous,champion:!!this.data.johto?.champion,minimumLevel:this.encounterBonus()?.minimumLevel||0,excluded:[...new Set([...(previous.excluded||[]).filter(id=>!habitats.includes(id)),...regional,...J.wildExclusions(this)])],additions:[...previous.additions,...J.bonuses(this)]};
 }
 snapshot(now=Date.now()){
  const s=super.snapshot(now),b=this.data.battle;if(!J.active(this))return s;
  return {...s,champion:!!this.data.johto?.champion,badges:J.gyms.filter(n=>J.done(this,n.id)&&(n.id!=='j-clair'||J.done(this,'j-dragon-den'))).map(n=>n.id),regionName:this.data.johto?.champion&&J.done(this,'j-ship')?'성도 · 관동 재방문':'성도 지방',...(b?.johtoId?{battle:{...s.battle,johtoId:b.johtoId,freeChallenge:true,boss:this.battleBoss(b).name,teamSize:b.kind==='wild'?1:this.battleBoss(b).team.length}}:{})};
 }
 panelState(now=Date.now()){
  const s=super.panelState(now);if(!J.active(this))return s;
  const options=this.wildOptions();
  const realChance=new Map(wildDistribution(2,this.data.owned[this.data.activeId].level,options).pokemon.map(p=>[p.id,p.chance]));
  const ref=id=>'No.'+id+' '+(this.data.seen[id]?species.get(id).name:'???');
  for(const p of s.collection){
   const original=p.acquisition,routes=original.routes.filter(r=>r.kind!=='wild'&&!(p.id<152&&J.routeGates.has(p.id)&&r.kind==='event')),wild=wildEligible(species.get(p.id),2,100)&&!J.noWild.has(p.id),gate=J.routeGates.get(p.id),open=!gate||J.done(this,gate);
   if(wild){
    const previous=original.routes.find(r=>r.kind==='wild'),current=realChance.get(p.id)||0;
    const hint=gate==='j-k-blue'?'성도와 관동의 체육관을 모두 통과하면 야생에서 만날 수 있어요.':gate==='j-ship'?'관동에 다시 도착한 뒤 야생에서 만날 수 있어요.':gate==='j-ice-path'?'얼음샛길에 도달한 뒤 야생에서 만날 수 있어요.':gate==='j-ruins'?'알프의유적을 조사한 뒤 야생에서 만날 수 있어요.':gate==='j-park'?'자연공원의 채집대회에 참가한 뒤 야생에서 만날 수 있어요.':J.specialIds.includes(p.id)?'성도의 전설과 관련된 이야기를 따라가 보세요.':'성도에서 모험을 더 진행하면 야생에서 만날 수 있어요.';
    routes.unshift({kind:'wild',chance:current,minimumLevel:wildMinimum(species.get(p.id)),text:open?(previous?.text||'현재 '+(current*100).toFixed(2)+'% 확률로 야생에서 출현.'):hint,...(J.specialIds.includes(p.id)&&open?{note:this.data.caught[p.id]?'포획을 마쳐 추가 출현 보너스가 종료됐어요.':'모험을 진행할수록 포획에 성공할 때까지 더 자주 만날 수 있어요.'}:{})});
   }
   const event=[...J.nodes.values()].some(n=>n.gift===p.id||n.egg===p.id||n.pokemon===p.id)||oddEgg.includes(p.id);
   if(event&&!routes.some(r=>r.kind==='event'))routes.push({kind:'event',text:'모험 중 특별한 만남으로 동료가 될 수 있어요.'});
   if(p.id>=152||J.routeGates.has(p.id)){const labels={wild:'야생',event:'이벤트',hatch:'부화',evolution:'진화',starter:'스타팅'};p.acquisition={...original,wildAllowed:wild,routes,summary:[...new Set(routes.map(r=>r.kind==='evolution'&&r.special?'특수진화':labels[r.kind]))].join(' · '),note:wild?'야생 확률은 플레이 중 야생 1회에 만날 확률이에요. 포획 성공률과는 달라요.':routes.every(r=>r.kind==='evolution')?'진화로만 얻을 수 있어요.':'일반 야생에서는 출현하지 않아요.'};}
   else if(event)p.acquisition={...original,routes};
  }
  const items=Object.keys(this.data.johto.items).map(key=>({id:'j-'+key,name:itemNames[key],count:1}));
  return {...s,challengeHistory:{1:{badges:[...this.data.badges],champion:this.data.champion,leagueBest:this.data.leagueBest,gymAccess:Array(8).fill(false)}},johto:J.snapshot(this),inventory:[...s.inventory,...items]};
 }
};}
module.exports={withJohto,itemNames,oddEgg};
