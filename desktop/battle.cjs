'use strict';
// Pinned simulator: @pkmn/sim 0.10.11, Gen III rules, entirely offline.
const {Battle,Dex}=require('@pkmn/sim');
const ai=require('./battle-ai.cjs');
const {data,species,moves,statsAt,learnedMoves}=require('./pokemon.cjs');
const dex=Dex.forGen(3);
const simMoves=new Map(data.moves.map(m=>[m.id,dex.moves.get(m.identifier)]));
const abilities=new Map(data.abilities.map(a=>[a.id,a]));
const abilityIds=new Map(data.abilities.map(a=>[a.identifier.replaceAll('-',''),a.id]));
const statKeys={1:'hp',2:'atk',3:'def',4:'spa',5:'spd',6:'spe',7:'accuracy',8:'evasion'};
const statusCodes={sleep:'slp',freeze:'frz',paralysis:'par',burn:'brn',poison:'psn',toxic:'tox'};
const statusNames=Object.fromEntries(Object.entries(statusCodes).map(([k,v])=>[v,k]));
const cache=new WeakMap();
const planningErrors=new WeakSet();
const clone=v=>JSON.parse(JSON.stringify(v));
function abilityFor(id,slot=0){const list=species.get(id).abilities;return list[slot%list.length]||list[0];}
function combatant(id,level,known,options={}){
  const stats=statsAt(id,level),list=[...new Set(known?.length?known:learnedMoves(id,level))];
  return {id,level,stats,maxHp:stats[1],hp:stats[1],moves:list,pp:Object.fromEntries(list.map(id=>[id,simMoves.get(id)?.pp||moves.get(id)?.pp||10])),status:null,statusTurns:0,stages:{},ability:options.ability||abilityFor(id,options.abilitySlot),gender:options.gender||'male',happiness:options.happiness??70};
}
function setFor(mon,name){
  return {name,species:species.get(mon.id).identifier,level:mon.level,ability:abilities.get(mon.ability||abilityFor(mon.id)).identifier,
    gender:mon.gender==='female'?'F':['genderless','none'].includes(mon.gender)?'N':'M',nature:'Serious',happiness:mon.happiness??70,
    moves:mon.moves.map(id=>simMoves.get(id)?.id).filter(Boolean),ivs:{hp:15,atk:15,def:15,spa:15,spd:15,spe:15},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}};
}
function readMon(mon){
  return {id:mon.baseSpecies.num,level:mon.level,hp:mon.fainted?0:mon.hp,maxHp:mon.maxhp,stats:{1:mon.maxhp,...Object.fromEntries(Object.entries(statKeys).filter(([n])=>n>1&&n<7).map(([n,k])=>[n,mon.storedStats[k]]))},
    moves:mon.moveSlots.map(s=>dex.moves.get(s.id).num),pp:Object.fromEntries(mon.moveSlots.map(s=>[dex.moves.get(s.id).num,s.pp])),
    status:statusNames[mon.status]||null,statusTurns:mon.statusState.time||0,stages:Object.fromEntries(Object.entries(statKeys).filter(([n])=>n>1).map(([n,k])=>[n,mon.boosts[k]||0])),
    ability:abilityIds.get(mon.baseAbility),gender:mon.gender==='F'?'female':mon.gender==='M'?'male':'none',happiness:mon.happiness};
}
function restoreMon(mon,saved){
  if(!saved)return;
  mon.hp=Math.max(0,Math.min(mon.maxhp,saved.hp/ saved.maxHp*mon.maxhp));
  for(const s of mon.moveSlots){const id=dex.moves.get(s.id).num;s.maxpp=dex.moves.get(s.id).pp;s.pp=Math.min(s.maxpp,saved.pp[id]??s.maxpp);}
  if(saved.status){mon.status=statusCodes[saved.status]||'';mon.statusState=mon.battle.initEffectState({id:mon.status,target:mon,time:saved.statusTurns||2});}
  for(const [n,k] of Object.entries(statKeys))if(n>1&&saved.stages[n]!==undefined)mon.boosts[k]=saved.stages[n];
  if(!mon.hp){mon.fainted=true;mon.side.pokemonLeft--;}
}
// Yield after one move or switch. Native queue order, residuals and requests remain intact.
function pump(){
  if(this.requestState)this.requestState='';
  if(!this.midTurn){this.queue.insertChoice({choice:'beforeTurn'});this.queue.addChoice({choice:'residual'});this.midTurn=true;}
  let acted=false;
  while(this.queue.list.length){
    const action=this.queue.peek(),visible=['move','switch','instaswitch'].includes(action.choice);
    if(acted&&visible)return;
    this.queue.shift();this.runAction(action);if(visible)acted=true;
    if(this.requestState||this.ended)return;
  }
  this.endTurn();this.midTurn=false;this.queue.clear();
}
function attach(b,sim){
  Object.defineProperty(sim,'turnLoop',{value:pump,configurable:true});
  cache.set(b,sim);return sim;
}
function engine(game,b){
  let sim=cache.get(b);
  const boss=b.storyId||(b.kind==='trainer'?b.bossIndex:null);
  if(sim&&b.simBoss===boss)return sim;
  if(b.sim&&b.simBoss===boss)return attach(b,Battle.fromJSON(b.sim));
  const active=game.data.activeId,keys=Object.keys(b.party).map(Number).sort((a,c)=>Number(c===active)-Number(a===active));
  const bossData=b.kind==='trainer'?game.battleBoss(b):null;
  const foes=bossData?bossData.team.map((p,i)=>({p,i})).slice(b.foeIndex):[{p:b.foe,i:0}];
  sim=new Battle({formatid:'gen3customgame',seed:Array.from({length:4},()=>Math.floor(game.random()*65536)),p1:{name:'동료',team:keys.map(uid=>setFor(b.party[uid],'u'+uid))},
    p2:{name:b.kind==='wild'?'야생':bossData.name,team:foes.map(({p,i})=>setFor(i===(b.foeIndex||0)?b.foe:combatant(p.id,p.level,p.moves),'f'+i))}});
  // Use ordinary PP (no PP Ups), neutral nature, IV15 / EV0, as in previous saves.
  for(const side of sim.sides)for(const mon of side.pokemon)for(const s of mon.moveSlots){s.pp=s.maxpp=dex.moves.get(s.id).pp;}
  for(const mon of sim.p1.pokemon)restoreMon(mon,b.party[Number(mon.name.slice(1))]);
  restoreMon(sim.p2.active[0],b.foe);
  sim.makeRequest('move');sim.log=[];sim.sentLogPos=0;sim.inputLog=[];
  b.simBoss=boss;return attach(b,sim);
}
function persist(b,sim){
  // Protocol is rendered into our bounded Korean journal; don't grow the save indefinitely.
  sim.log=sim.log.slice(-40);sim.sentLogPos=sim.log.length;sim.inputLog=[];b.sim=sim.toJSON();
}
function refreshOwned(game,sim){
  for(const mon of sim.p1.pokemon){
    const p=game.data.owned[Number(mon.name.slice(1))];if(!p)continue;
    mon.happiness=p.happiness;
    if(mon.level!==p.level){const old=mon.maxhp,alive=mon.hp>0&&!mon.fainted;mon.level=mon.set.level=p.level;mon.setSpecies(mon.baseSpecies);mon.baseMaxhp=mon.maxhp=statsAt(p.id,p.level)[1];mon.hp=alive?Math.min(mon.maxhp,mon.hp+mon.maxhp-old):0;}
    for(const id of p.moves){const m=simMoves.get(id);if(!m||mon.baseMoveSlots.some(s=>s.id===m.id))continue;
      const slot={move:m.name,id:m.id,pp:m.pp,maxpp:m.pp,target:m.target,disabled:false,disabledSource:'',used:false};
      mon.baseMoveSlots.push(slot);if(mon.moveSlots!==mon.baseMoveSlots&&!mon.transformed)mon.moveSlots.push({...slot});mon.set.moves.push(m.id);
    }
  }
}
function scoreMove(sim,actor,target,move){
  const copy=ai.model(sim.toJSON()),a=copy.sides[actor.side.n].pokemon.find(p=>p.name===actor.name),b=copy.sides[target.side.n].pokemon.find(p=>p.name===target.name);
  return ai.rankMove(copy,a,b,copy.dex.moves.get(move.id));
}
// Deterministic party preview, using the same Gen III types/category/stats as combat.
// This estimates a matchup; it never advances the native battle or consumes its RNG.
function previewDamage(actor,target,move){
  if(move.category==='Status'||(move.id==='dreameater'&&target.status!=='sleep')||(['snore','sleeptalk'].includes(move.id)&&actor.status!=='sleep'))return 0;
  const typing=mon=>dex.species.get(species.get(mon.id).identifier).types;
  const ability=mon=>abilities.get(mon.ability||abilityFor(mon.id))?.identifier.replaceAll('-','');
  const defending=ability(target),attacking=ability(actor),types=typing(target);
  const effectiveness=2**dex.getEffectiveness(move.type,types);
  if(!dex.getImmunity(move.type,types)||(move.type==='Ground'&&defending==='levitate')||(move.type==='Water'&&defending==='waterabsorb')||(move.type==='Electric'&&defending==='voltabsorb')||(move.type==='Fire'&&defending==='flashfire')||(move.flags.sound&&defending==='soundproof')||(defending==='wonderguard'&&effectiveness<=1&&move.id!=='struggle'))return 0;
  const accuracy=move.accuracy===true?1:(move.accuracy||100)/100;
  if(move.ohko)return actor.level>=target.level?target.hp*.3:0;
  if(move.damage)return Math.min(target.hp,move.damage==='level'?actor.level:typeof move.damage==='number'?move.damage:0)*accuracy;
  const physical=move.category==='Physical',stage=(mon,key)=>{const n=mon.stages?.[key]||0;return n>=0?(2+n)/2:2/(2-n);};
  let attack=actor.stats[physical?2:4]*stage(actor,physical?2:4),defense=target.stats[physical?3:5]*stage(target,physical?3:5);
  if(physical&&['hugepower','purepower'].includes(attacking))attack*=2;
  if(physical&&attacking==='hustle')attack*=1.5;
  if(physical&&actor.status){if(attacking==='guts')attack*=1.5;else if(actor.status==='burn')attack*=.5;}
  if(physical&&defending==='intimidate')attack*=2/3;
  let power=move.basePower||50;
  if(move.id==='return')power=Math.max(1,Math.floor((actor.happiness??70)*.4));
  if(move.id==='frustration')power=Math.max(1,Math.floor((255-(actor.happiness??70))*.4));
  if(move.id==='eruption'||move.id==='waterspout')power=Math.max(1,150*actor.hp/actor.maxHp);
  let damage=((2*actor.level/5+2)*power*attack/Math.max(1,defense)/50+2)*effectiveness*accuracy*.925;
  if(typing(actor).includes(move.type))damage*=1.5;
  if(defending==='thickfat'&&['Fire','Ice'].includes(move.type))damage*=.5;
  if(actor.hp<=actor.maxHp/3&&({overgrow:'Grass',blaze:'Fire',torrent:'Water',swarm:'Bug'})[attacking]===move.type)damage*=1.5;
  if(move.multihit)damage*=Array.isArray(move.multihit)?3:move.multihit;
  if(move.flags.charge||move.selfSwitch||move.id==='hyperbeam')damage*=.5;
  if(move.selfdestruct)damage*=.15;
  if(physical&&attacking==='hustle')damage*=.8;
  return damage;
}
function matchupScore(hero,foe){
  const best=(actor,target)=>{
    const usable=actor.moves.filter(id=>(actor.pp[id]??0)>0).map(id=>simMoves.get(id)).filter(Boolean);
    const damage=Math.max(0,...(usable.length?usable:[dex.moves.get('struggle')]).map(move=>previewDamage(actor,target,move)));
    return damage*((actor.status==='sleep'||actor.status==='freeze') ? .5 : actor.status==='paralysis' ? .75 : 1);
  };
  const offense=best(hero,foe)/Math.max(1,foe.hp),threat=best(foe,hero)/Math.max(1,hero.hp);
  if(!offense)return (hero.hp/hero.maxHp)*.01;
  const speed=mon=>{const n=mon.stages?.[6]||0;return mon.stats[6]*(mon.status==='paralysis'?.25:1)*(n>=0?(2+n)/2:2/(2-n));};
  const kill=Math.ceil(1/offense),survive=Math.ceil(1/Math.max(.001,threat));
  const wins=kill<survive||(kill===survive&&speed(hero)>=speed(foe));
  // Winning quickly beats indefinite tanking; survival breaks equal kill races.
  return (wins?100:10)+30/Math.max(1,kill)+10*Math.max(-1,Math.min(1,(survive-kill)/Math.max(1,survive,kill)))+(hero.hp/hero.maxHp)*.01;
}
function bestPartner(game,b){
  let next=null,score=-Infinity;
  for(const uid of game.availablePartners()){
    const value=matchupScore(b.party[uid],b.foe);
    if(value>score+1e-9||(Math.abs(value-score)<=1e-9&&uid===game.data.activeId)){next=uid;score=value;}
  }
  return next;
}
function choose(sim,side,preferred,allowSwitch,eligible){
  const mon=side.active[0];
  if(side.activeRequest?.forceSwitch){
    const living=side.pokemon.filter(p=>!p.isActive&&p.hp>0&&!p.fainted&&(!eligible||eligible.includes(p.name)));
    const pick=living.find(p=>p.name==='u'+preferred)||(side.n===1?living[0]:living.sort((a,b)=>matchupScore(readMon(b),readMon(side.foe.active[0]))-matchupScore(readMon(a),readMon(side.foe.active[0])))[0]);
    return pick?'switch '+(side.pokemon.indexOf(pick)+1):'pass';
  }
  if(side.activeRequest?.wait)return null;
  if(preferred&&mon.name!=='u'+preferred){const pick=side.pokemon.find(p=>p.name==='u'+preferred&&p.hp>0&&!p.fainted);if(pick&&!mon.trapped)return 'switch '+(side.pokemon.indexOf(pick)+1);}
  try{return ai.plan(sim,side.n,{allowSwitch,eligible}).action;}
  catch(error){
    // Prediction is optional. An AI error must not escape into the application
    // timer and stop saving/reading Codex activity. Native default is legal.
    if(!planningErrors.has(sim)){planningErrors.add(sim);console.error('Battle forecast failed; using the simulator legal default.',error);}
    return 'default';
  }
}
const names={slp:'잠듦',frz:'얼음',par:'마비',brn:'화상',psn:'독',tox:'맹독',confusion:'혼란',recoil:'반동',trapped:'교체 불가',partiallytrapped:'조이기',leechseed:'씨뿌리기',substitute:'대타출동',reflect:'리플렉터',lightscreen:'빛의장막',protect:'방어',mustrecharge:'반동',sunnyday:'쾌청',raindance:'비',sandstorm:'모래바람',hail:'싸라기눈',atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드',accuracy:'명중률',evasion:'회피율'};
const effectId=value=>value.replace(/^(move|ability):\s*/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function particle(word,closed,open){const last=word.at(-1)||'',code=last.charCodeAt(0);return word+((code>=0xac00&&code<=0xd7a3?(code-0xac00)%28!==0:/[013678]/.test(last))?closed:open);}
function effectName(value=''){
  const id=effectId(value);
  const a=abilityIds.get(id);if(a)return abilities.get(a).name;
  const m=dex.moves.get(id);return moves.get(m.num)?.name||names[id]||'';
}
function protocolLines(lines){
  // Showdown emits a private and public HP line for the same event. Use one view.
  const result=[];
  for(let i=0;i<lines.length;i++){
    if(lines[i].startsWith('|split|')){if(lines[i+1])result.push(lines[i+1]);i+=2;}
    else result.push(lines[i]);
  }
  return result;
}
function damageCause(line,who){
  const parts=line.split('|'),raw=parts.find(p=>p.startsWith('[from] '))?.slice(7);if(!raw)return null;
  const id=effectId(raw),cause=id==='confusion'?'혼란 자해':effectName(raw)||'지속 효과',name=who(parts[2]),subject=particle(name,'은','는');
  const text=id==='confusion'?subject+' 혼란에 빠져 자신을 공격했다!':id==='recoil'?subject+' 반동으로 피해를 입었다!':subject+' '+cause+' 때문에 피해를 입었다!';
  return {side:parts[2].startsWith('p2')?'foe':'hero',cause,text};
}
function protocol(sim,lines){
  lines=protocolLines(lines);
  const who=ref=>{const name=(ref||'').split(': ')[1],mon=sim.sides.flatMap(s=>s.pokemon).find(p=>p.name===name);return (mon&&species.get(mon.baseSpecies.num)?.name)||(ref?.startsWith('p2')?'상대 포켓몬':'우리 포켓몬');};
  const output=[],seen=new Set();let used=null;
  for(const line of lines){
    if(seen.has(line))continue;seen.add(line);const parts=line.split('|'),[,kind,a,b,c]=parts,name=who(a),subject=particle(name,'은','는'),effect=effectName(b||''),id=effectId(b||'');let text='';
    if(kind==='move'){used={name,move:effect};text=name+'의 '+(effect||'기술')+'!';}
    if(kind==='-supereffective')text=name+'에게 효과가 굉장했다!';
    if(kind==='-resisted')text=name+'에게 효과가 별로인 듯하다.';
    if(kind==='-immune')text=name+'에게는 효과가 없었다!';
    if(kind==='-crit')text=name+'의 급소에 맞았다!';
    if(kind==='-miss')text=name+'의 공격은 빗나갔다!';
    if(kind==='-status')text=subject+' '+({slp:'잠들었다!',frz:'얼어붙었다!',par:'마비되었다!',brn:'화상을 입었다!',psn:'독에 걸렸다!',tox:'맹독에 걸렸다!'}[b]||'상태이상에 걸렸다!');
    if(kind==='-curestatus')text=subject+' '+({slp:'잠에서 깨어났다!',frz:'얼어붙은 상태에서 풀려났다!',par:'마비에서 풀려났다!',brn:'화상에서 회복되었다!',psn:'독에서 회복되었다!',tox:'맹독에서 회복되었다!'}[b]||'상태이상에서 회복되었다!');
    if(kind==='-boost'||kind==='-unboost')text=name+'의 '+particle(effect||'능력','이','가')+' '+c+'단계 '+(kind==='-boost'?'올랐다!':'떨어졌다!');
    if(kind==='-ability'&&effect)text=name+'의 특성 '+particle(effect,'이','가')+' 발동했다!';
    if(['-activate','-start','-end','-singleturn','-singlemove'].includes(kind)){
      const ending=kind==='-end',perish=id.match(/^perish([0-3])$/),stockpile=id.match(/^stockpile([1-3])$/);
      if(perish){if(!parts.includes('[silent]'))text=perish[1]==='0'?name+'의 멸망의노래 카운트가 0이 되었다!':name+'의 멸망의노래 카운트: '+perish[1];}
      else if(stockpile)text=subject+' '+stockpile[1]+'번 비축했다!';
      else if(id==='confusion')text=ending?name+'의 혼란이 풀렸다!':kind==='-start'?subject+' 혼란에 빠졌다!':lines.some(l=>l.startsWith('|-damage|'+a+'|')&&l.includes('[from] confusion'))?'':subject+' 혼란스러워하고 있다!';
      else if(id==='typechange'){const types=(c||'').split('/').map(t=>data.types.find(x=>x.identifier===t.toLowerCase())?.name).filter(Boolean);if(types.length)text=name+'의 타입이 '+types.join('/')+' 타입으로 바뀌었다!';}
      else if(id==='trapped')text=subject+' 도망치거나 교체할 수 없다!';
      else if(id==='protect'||id==='detect')text=subject+' 공격을 막았다!';
      else if(id==='substitute')text=ending?name+'의 대타가 사라졌다!':subject+' 대타를 내보냈다!';
      else if(effect)text=ending?name+'에게 걸린 '+effect+' 효과가 풀렸다!':name+'에게 '+effect+' 효과가 적용되었다!';
    }
    if((kind==='-sidestart'||kind==='-sideend')&&effect)text=(a?.startsWith('p1')?'우리 편':'상대 편')+'의 '+particle(effect,'이','가')+(kind==='-sideend'?' 사라졌다!':' 펼쳐졌다!');
    if(['-fieldstart','-fieldend','-fieldactivate'].includes(kind)){const field=effectName(a||'');if(field)text=field+(kind==='-fieldend'?' 효과가 사라졌다!':kind==='-fieldactivate'?' 효과가 전장에 울려 퍼졌다!':' 효과가 전장을 감쌌다!');}
    if(kind==='-weather')text=a==='none'?'날씨가 원래대로 돌아왔다.':({sunnyday:'햇살이 강하게 내리쬐고 있다!',raindance:'비가 내리고 있다!',sandstorm:'모래바람이 불고 있다!',hail:'싸라기눈이 내리고 있다!'}[a]||'');
    if(kind==='-prepare')text=subject+' '+particle(effect||'공격','을','를')+' 준비하고 있다!';
    if(kind==='-mustrecharge')text=subject+' 공격의 반동으로 쉬어야 한다!';
    if(kind==='cant')text=subject+' '+({slp:'잠들어 있다!',frz:'얼어붙어서 움직일 수 없다!',par:'마비되어 움직일 수 없다!',flinch:'풀이 죽어서 움직일 수 없다!',recharge:'공격의 반동으로 쉬고 있다!',truant:'게으름을 피우고 있다!',attract:'헤롱헤롱해서 움직일 수 없다!',nopp:'기술의 PP가 부족하다!',taunt:'도발 때문에 이 기술을 쓸 수 없다!',disable:'사슬묶기 때문에 이 기술을 쓸 수 없다!',focuspunch:'집중력이 흐트러져 힘껏펀치를 쓰지 못했다!'}[id]||'이번에는 움직일 수 없다!');
    if(kind==='-fail')text=used?used.name+'의 '+particle(used.move||'기술','은','는')+' 효과를 내지 못했다!':subject+' 행동에 실패했다!';
    if(kind==='-notarget')text='하지만 공격할 대상이 없었다!';
    if(kind==='-nothing')text='하지만 아무 일도 일어나지 않았다!';
    if(kind==='-heal')text=name+'의 체력이 회복되었다!';
    if(kind==='-hitcount'&&/^\d+$/.test(b))text=name+'에게 '+b+'번 명중했다!';
    if(kind==='-transform')text=subject+' '+who(b)+'의 모습으로 변신했다!';
    if(kind==='faint')text=particle(name,'이','가')+' 기절했다!';
    if(kind==='-damage')text=damageCause(line,who)?.text||'';
    if(parts.includes('[silent]')&&!/^perish[0-3]$/.test(id))text='';
    const via=line.match(/\[from\] ability: ([^|]+)/)?.[1],ability=via&&effectName(via);if(ability&&text)text+=' (특성 '+ability+')';
    if(text&&!output.includes(text))output.push(text);
  }
  return output;
}
function sync(game,b,sim){
  for(const mon of sim.p1.pokemon)b.party[Number(mon.name.slice(1))]=readMon(mon);
  const current=sim.p1.active[0];if(current.hp>0&&!current.fainted){game.data.activeId=Number(current.name.slice(1));if(b.pendingSwitch===game.data.activeId)delete b.pendingSwitch;}
  const foe=sim.p2.active[0];b.foe=readMon(foe);
  b.field={weather:sim.field.weather,turn:sim.turn};
}
function movePresentation(lines){
  // Called moves (Metronome, Sleep Talk, Mirror Move) show the move actually executed.
  const line=lines.findLast(l=>l.startsWith('|move|'));
  if(!line){
    const stopped=lines.find(l=>/^\|(cant|-mustrecharge)\|p[12]/.test(l))||lines.find(l=>l.startsWith('|-damage|')&&l.includes('[from] confusion'));
    return stopped?{actor:stopped.split('|')[2].startsWith('p2')?'foe':'hero',moveTarget:'self'}:{};
  }
  const parts=line.split('|'),m=dex.moves.get(parts[3]),actor=parts[2].startsWith('p2')?'foe':'hero';
  const actionLines=lines.slice(lines.lastIndexOf(line));
  const charging=actionLines.some(l=>l.startsWith('|-prepare|'));
  const outcome=charging?'charging':actionLines.some(l=>l.startsWith('|-miss|'))||line.includes('[miss]')?'miss':
    actionLines.some(l=>l.startsWith('|-activate|')&&/move: (Protect|Detect)/.test(l))?'protected':
    actionLines.some(l=>l.startsWith('|-immune|'))?'immune':actionLines.some(l=>l.startsWith('|-fail|'))?'failed':'success';
  const hit=actionLines.find(l=>l.startsWith('|-hitcount|'));
  const moveTarget=['all','allAdjacent','foeSide'].includes(m.target)?'field':parts[4]===parts[2]||['self','allySide','allies'].includes(m.target)?'self':'opponent';
  return {actor,move:m.num,moveTarget,outcome,hitCount:hit?Number(hit.split('|')[3])||1:1};
}
function step(game,b){
  const sim=engine(game,b);refreshOwned(game,sim);const start=sim.log.length,heroBefore=sim.p1.active[0].name,foeBefore=sim.p2.active[0].hp,heroHpBefore=sim.p1.active[0].hp;
  if(sim.ended){sync(game,b,sim);return {lines:[],ended:true};}
  for(let acknowledgements=0;acknowledgements<3;acknowledgements++){
    if(b.pendingSwitch&&!sim.requestState){
      const old=sim.p1.active[0],next=sim.p1.pokemon.find(p=>p.name==='u'+b.pendingSwitch);
      if(next&&next!==old&&next.hp&&!next.fainted&&!old.trapped){
        const queued=sim.queue.willSwitch(old);
        if(!queued||queued.target!==next){sim.queue.cancelAction(old);sim.queue.insertChoice({choice:old.hp?'switch':'instaswitch',pokemon:old,target:next});}
      }
    }
    const offset=sim.log.length;
    if(sim.requestState){
      const eligible=game.availablePartners().map(uid=>'u'+uid);
      const choices=sim.sides.map(s=>choose(sim,s,s.n===0?b.pendingSwitch:null,s.n===0&&b.kind==='trainer'&&!b.manualMatchup&&!b.pendingSwitch&&sim.turn-(b.aiLastSwitch??-10)>=3,s.n===0?eligible:null));
      for(let i=0;i<choices.length;i++)if(choices[i]&&!sim.sides[i].choose(choices[i]))sim.sides[i].autoChoose();
      sim.commitChoices();
    }else sim.turnLoop();
    // nextTrainer already presented this opponent's arrival. Its native switch
    // acknowledgement must finish before exposing the selected ally's state.
    const update=sim.log.slice(offset),foeArrival=update.some(l=>l.startsWith('|switch|p2'));
    if(!b.pendingSwitch||sim.ended||sim.p1.active[0].name==='u'+b.pendingSwitch||!foeArrival||update.some(l=>l.startsWith('|move|')||l.startsWith('|cant|')))break;
  }
  const lines=protocolLines(sim.log.slice(start)),presentation=movePresentation(lines),actor=presentation.actor||'hero',changed=heroBefore!==sim.p1.active[0].name;
  if(changed)b.aiLastSwitch=sim.turn;
  const messages=protocol(sim,lines);sync(game,b,sim);persist(b,sim);
  const causeName=ref=>{const mon=sim.sides.flatMap(s=>s.pokemon).find(p=>p.name===ref.split(': ')[1]);return species.get(mon?.baseSpecies.num)?.name||'포켓몬';};
  const damageCauses=[...new Map(lines.filter(line=>line.startsWith('|-damage|')).map(line=>damageCause(line,causeName)).filter(Boolean).map(c=>[c.side+':'+c.cause,c])).values()];
  return {...presentation,actor,id:actor==='hero'?b.party[game.data.activeId].id:b.foe.id,damage:Math.max(0,actor==='hero'?foeBefore-sim.p2.active[0].hp:heroHpBefore-sim.p1.active[0].hp),damageCauses,lines:messages,switched:changed,ended:sim.ended};
}
function canSwitch(game,b,uid){
  const sim=cache.get(b)||(b.sim?engine(game,b):null);
  if(!sim)return true;
  if(sim.ended)return false;
  const target=sim.p1.pokemon.find(p=>p.name==='u'+uid);if(target&&(!target.hp||target.fainted))return false;
  const current=sim.p1.active[0];return !current.hp||!current.trapped;
}
function invalidate(b){if(!b)return;cache.delete(b);delete b.sim;delete b.simBoss;}
function catchValue(catchRate,hp,maxHp,status){
  const bonus=['sleep','freeze'].includes(status)?2.5:['poison','toxic','burn','paralysis'].includes(status)?1.5:1;
  return Math.max(0,(3*maxHp-2*hp)*catchRate/(3*maxHp)*bonus);
}
function tryCatch(rate,hp,maxHp,status,random=Math.random){
  const a=catchValue(rate,hp,maxHp,status);if(a>=255)return {caught:true,shakes:3,a};
  const threshold=Math.round(65535*Math.pow(a/255,.25));let checks=0;
  while(checks<4&&Math.floor(random()*65536)<threshold)checks++;
  return {caught:checks===4,shakes:Math.min(checks,3),a};
}
module.exports={protocol,protocolLines,bestPartner,matchupScore,combatant,abilityFor,step,canSwitch,invalidate,catchValue,tryCatch,engine,readMon,scoreMove,movePresentation,dex};
