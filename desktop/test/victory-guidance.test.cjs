'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{data}=require('../pokemon.cjs'),battle=require('../battle.cjs');
const J=require('../../shared/johto.cjs'),text=require('../../shared/johto-dialogue.cjs'),kanto=require('../../shared/trainer-dialogue.cjs');
const W=require('../../shared/johto-world.cjs');
const rivals=require('../../shared/rivals.cjs'),rescue=require('../../shared/rescue.cjs'),silph=require('../../shared/silph.cjs'),training=require('../training-device.cjs');
const consumers=[['PC',require('./helpers/story-fixture.cjs').PC],['Android',require('./helpers/story-fixture.cjs').Android]],now=Date.parse('2026-10-19T09:00:00Z');
function fixture(Type,regional=true){const g=new Type(new Game({},now).data,now,{random:()=>.73});g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;if(regional){g.data.champion=true;assert.ok(g.unlockJohto(now,[25]));}return g;}
function idle(g){g.data.animation=null;g.data.switchUntil=0;g.nextTick=now;}
function close(g){let limit=20;while(g.presentation()?.mode==='dialogue'&&limit--){const s=g.presentation();assert.ok(g.advanceScene(s.id+':'+s.index,now));}assert.ok(limit>0);}
function victory(g,id){const n=J.nodes.get(id),clear=id=>{for(const p of J.nodes.get(id)?.requires||[])clear(p);g.data.johto.cleared[id]=now;};for(const p of n.requires)clear(p);idle(g);g.startJohtoBattle(n,now);g.data.mobileStory.scene=null;const b=g.data.battle;b.foeIndex=n.team.length-1;const p=n.team.at(-1);b.foe=battle.combatant(p.id,p.level,p.moves);b.foe.hp=0;g.defeatOpponent(now);return b;}

test('every production trainer has individual post-victory guidance and text lookup cannot grant progress',()=>{
 const g=fixture(consumers[0][1]),before=structuredClone(g.data),scripts=[];
 for(const n of J.nodes.values())if(['gym','kanto-gym','trainer','league','rival'].includes(n.type)){
  const pages=text.victory(g,n);assert.ok(pages.length>=2,n.id);assert.ok(pages.every(p=>typeof p==='string'&&p.length>0&&p.length<130),n.id);assert.doesNotMatch(pages.join(' '),/믿음직한 모습|에게 승리했다!/);scripts.push(pages.join('\n'));
  assert.doesNotMatch(text.outcome(g,n),/의 일을 마쳤어요/);
 }
 assert.equal(new Set(scripts).size,scripts.length);assert.deepEqual(g.data,before);
 for(const n of [...data.bosses,...Object.values(training.battles).filter(n=>n.id!=='road-snorlax'),...rescue.encounters.filter(n=>!n.ghost),...silph.encounters]){assert.ok(kanto.hasVictory(n),n.id);assert.ok(kanto.victory(n).length>=2,n.id);}
 for(const n of rivals.encounters.filter(n=>n.stage>0)){assert.ok(n.win.length>=2,n.id);assert.ok(n.result,n.id);}
});

for(const [name,Type] of consumers){
 test(name+': victory instructions lead to real unlocked actions only after the closing dialogue',()=>{
  for(const [id,next,place]of [['j-sprout','j-falkner','비상'],['j-falkner','j-well-grunt','고동마을'],['j-bugsy','j-ilex','너도밤나무숲'],['j-whitney','j-sudowoodo','나무'],['j-chuck','j-medicine','약국'],['j-jasmine','j-red-gyarados','호수'],['j-pryce','j-radio-imposter','라디오타워'],['j-radio-final','j-ice-path','얼음샛길'],['j-k-sabrina','j-power-grunt','발전소'],['j-k-blue','j-red','은빛산']]){
   const g=fixture(Type),b=victory(g,id),xp=g.data.owned[g.data.activeId].xp;assert.match(g.presentation().pages.join(' '),new RegExp(place));assert.equal(J.done(g,id),false,id);assert.equal(g.data.owned[g.data.activeId].xp,xp);
   const saved=structuredClone(g.data);saved.mobileStory.scene.pages=['승리했다!','동료들의 믿음직한 모습이 눈에 들어온다.'];saved.mobileStory.scene.index=1;
   const loaded=new Type(saved,now+1);assert.doesNotMatch(loaded.presentation().pages.join(' '),/믿음직한 모습/);assert.match(loaded.presentation().pages.join(' '),new RegExp(place));assert.equal(loaded.data.owned[loaded.data.activeId].xp,xp);
   close(loaded);assert.ok(J.done(loaded,id),id);loaded.data.johtoWorld.location=W.locationFor(next);assert.ok(loaded.canChallenge(next),id+' -> '+next);assert.ok(loaded.data.owned[loaded.data.activeId].xp>xp);assert.notEqual(loaded.data.battle,b);
  }
 });
 test(name+': Clair sends the player to the Dragon Den; the badge and gift arrive when that event actually finishes',()=>{
  const g=fixture(Type);victory(g,'j-clair');assert.match(g.presentation().pages.join(' '),/용의 굴/);close(g);assert.ok(!J.snapshot(g).badges.includes('j-clair'));
  assert.match(g.data.animation.text,/용의 굴/);g.data.johtoWorld.location=W.locationFor('j-dragon-den');idle(g);assert.ok(g.challenge('j-dragon-den',now));assert.equal(Object.values(g.data.owned).filter(p=>p.id===147).length,0);close(g);
  assert.ok(J.snapshot(g).badges.includes('j-clair'));assert.equal(Object.values(g.data.owned).filter(p=>p.id===147).length,1);assert.match(g.data.animation.text,/챔피언로드/);g.data.johtoWorld.location=W.locationFor('j-victory-road');assert.ok(g.canChallenge('j-victory-road'));
 });
 test(name+': a Kanto win keeps its earned partner notice and the next destination, with no duplicate award on reload',()=>{
  let g=fixture(Type,false);for(const p of Object.values(g.data.mobileStory.rivals))p.state='won';idle(g);assert.ok(g.challenge(0,now));g.data.mobileStory.scene=null;
  const b=g.data.battle,boss=g.battleBoss(b);b.foeIndex=boss.team.length-1;b.foe=battle.combatant(boss.team.at(-1).id,12,[33]);b.foe.hp=0;g.defeatOpponent(now);assert.match(g.presentation().pages.join(' '),/블루시티/);
  g=new Type(structuredClone(g.data),now+1);close(g);assert.ok(g.data.badges.includes('brock'));assert.match(g.data.animation.text,/이상해씨.*동료/);assert.match(g.data.animation.text,/블루시티/);
  const count=Object.values(g.data.owned).filter(p=>p.id===1).length;g=new Type(structuredClone(g.data),now+2);assert.equal(Object.values(g.data.owned).filter(p=>p.id===1).length,count);
 });
}

test('repeated league or story encounters do not direct the player to events that are already finished',()=>{
 const g=fixture(consumers[0][1]);g.data.johto.champion=true;g.data.johto.cleared['j-ship']=now;
 assert.doesNotMatch(text.victory(g,J.nodes.get('j-league-lance')).join(' '),/승선|성도의 챔피언이야/);assert.match(text.outcome(g,J.nodes.get('j-league-lance')),/관동/);
 g.data.johto.cleared['j-k-blue']=now;assert.match(text.outcome(g,J.nodes.get('j-league-lance')),/은빛산/);g.data.johto.cleared['j-red']=now;assert.doesNotMatch(text.outcome(g,J.nodes.get('j-league-lance')),/승선|은빛산/);
 g.data.johto.cleared['j-generator-3']=now;assert.doesNotMatch(text.outcome(g,J.nodes.get('j-red-gyarados')),/가게|조사/);
 g.data.johto.cleared['j-k-brock']=now;assert.doesNotMatch(text.outcome(g,J.nodes.get('j-k-snorlax')),/웅에게/);
 assert.doesNotMatch(text.victory(g,J.nodes.get('j-league-karen')).join(' '),/목호|승선|은빛산/);
 for(const n of J.rivalNodes)assert.doesNotMatch(text.victory(g,n).join(' '),/포켓몬피리|학습장치|업그레이드|GS볼/);
});
