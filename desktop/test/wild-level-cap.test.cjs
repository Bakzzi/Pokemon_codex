'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game.cjs'),{Adventure:PC}=require('../adventure.cjs'),{Adventure:Android}=require('../../mobile/adventure.cjs');
const {data,species,xpAt,wildMinimum,wildLevelCap,wildDistribution}=require('../pokemon.cjs'),J=require('../../shared/johto.cjs');
const now=Date.parse('2026-10-19T10:00:00Z'),caps=[15,20,25,30,35,40,50,60,60],badges=data.bosses.slice(0,8).map(b=>b.id);
function fixture(Type=Game,level=100){const g=new Type({},now,{random:()=>.73});if(g.data.mobileStory){g.data.mobileStory.onboarding='done';g.data.mobileStory.scene=null;}const p=g.data.owned[g.data.activeId];p.level=level;p.xp=xpAt(p.id,level);require('../move-access.cjs').update(p);return g;}
function johto(Type){const g=fixture(Type);g.data.champion=true;g.data.badges=[...badges];assert.ok(g.unlockJohto(now,[25]));const p=g.data.owned[g.data.activeId];p.level=100;p.xp=xpAt(p.id,100);return g;}

test('each badge unlocks its wild cap and championship caps encounters at 70 while ownership stays at 100',()=>{
 for(let count=0;count<=8;count++){assert.equal(wildLevelCap(count),caps[count]);const g=fixture();g.data.badges=badges.slice(0,count);assert.equal(g.wildOptions().maximumLevel,caps[count]);g.data.champion=true;assert.equal(g.wildOptions().maximumLevel,70);g.newWild(now);assert.equal(g.data.battle.foe.level,70);assert.equal(g.data.owned[g.data.activeId].level,100);}
 const g=fixture();g.data.badges=['brock','brock','not-a-badge'];assert.equal(g.wildLevelCap(),20);
});

test('PC and Android wild draws respect every cap, species floor and partner level without changing ownership',()=>{
 for(const Type of [PC,Android])for(let count=0;count<=8;count++)for(const level of [5,16,36,50,100]){
  const g=fixture(Type,level);g.data.badges=badges.slice(0,count);const owned=structuredClone(g.data.owned),options=g.wildOptions(),distribution=wildDistribution(1,level,options);
  assert.ok(distribution.pokemon.length);assert.ok(Math.abs(distribution.pokemon.reduce((sum,p)=>sum+p.chance,0)-1)<1e-10);
  assert.ok(distribution.pokemon.every(p=>wildMinimum(species.get(p.id))<=Math.min(level,caps[count])));
  for(let draw=0;draw<33;draw++){let index=0;const values=[(draw+.5)/33,((draw*7)%33+.5)/33,(draw%11+.5)/11];g.random=()=>values[index++]??.73;g.newWild(now);const foe=g.data.battle.foe;assert.ok(foe.level<=caps[count]);assert.ok(foe.level>=wildMinimum(species.get(foe.id)));assert.ok(foe.level<=level+5);}
  assert.deepEqual(g.data.owned,owned);
 }
});

test('evolution floors and legendary minima are filtered before species selection and additions',()=>{
 const g=fixture();g.data.badges=badges.slice(0,4);let d=wildDistribution(1,100,g.wildOptions());assert.ok(!d.pokemon.some(p=>p.id===18));
 g.data.badges.push(badges[4]);d=wildDistribution(1,100,g.wildOptions());assert.ok(d.pokemon.some(p=>p.id===18));
 for(const maximumLevel of [15,45,50]){const d=wildDistribution(1,100,{maximumLevel,additions:[{id:145,extra:.004}]});assert.equal(d.additions[0].eligible,maximumLevel>=50);assert.equal(d.pokemon.some(p=>p.id===145),maximumLevel>=50);}
});

test('the +/-5 roll still operates below the cap and clamps at it rather than lifting low-level partners',()=>{
 const g=fixture();for(const [level,count] of [[5,0],[14,0],[100,0],[100,1],[50,8]]){
  g.data.badges=badges.slice(0,count);g.data.owned[g.data.activeId].level=level;const seen=[];
  for(let offset=0;offset<=10;offset++){let i=0;const values=[.9,0,(offset+.5)/11];g.random=()=>values[i++]??.73;g.newWild(now);const foe=g.data.battle.foe;seen.push(foe.level);assert.equal(foe.level,Math.max(wildMinimum(species.get(foe.id)),Math.min(caps[count],level-5+offset)));}
  if(level===5)assert.equal(Math.max(...seen),10);if(level===100)assert.ok(seen.every(n=>n===caps[count]));if(level===50)assert.deepEqual(seen,Array.from({length:11},(_,i)=>45+i));
 }
});

test('Johto starts at 15 despite all Kanto badges and title; Clair needs the awarded badge',()=>{
 for(const Type of [PC,Android]){const g=johto(Type);assert.equal(g.wildLevelCap(),15);
  for(let count=0;count<=8;count++){for(const n of J.gyms.slice(0,count))g.data.johto.cleared[n.id]=now;if(count===8){assert.equal(g.wildLevelCap(),60);g.data.johto.cleared['j-dragon-den']=now;}assert.equal(g.wildLevelCap(),caps[count]);g.newWild(now);assert.ok(g.data.battle.foe.level<=caps[count]);}
  g.data.johto.champion=true;assert.equal(g.wildLevelCap(),70);g.newWild(now);assert.equal(g.data.battle.foe.level,70);assert.equal(g.data.owned[g.data.activeId].level,100);
 }
});

test('dex probabilities use the same capped pool and distinguish badge gating from partner level',()=>{
 for(const Type of [PC,Android]){const g=fixture(Type),entry=id=>g.panelState(now).collection.find(p=>p.id===id).acquisition.routes.find(r=>r.kind==='wild');
  assert.equal(entry(18).chance,0);assert.match(entry(18).text,/뱃지/);const actual=wildDistribution(1,100,g.wildOptions()).pokemon.find(p=>p.id===16);assert.equal(entry(16).chance,actual.chance);
  g.data.badges=badges.slice(0,5);assert.ok(entry(18).chance>0);g.data.owned[g.data.activeId].level=10;assert.equal(entry(18).chance,0);assert.match(entry(18).text,/Lv\.36/);
  const j=johto(Type);j.data.johto.cleared['j-burned']=now;assert.equal(j.panelState(now).collection.find(p=>p.id===243).acquisition.routes.find(r=>r.kind==='wild').chance,0);
 }
});

test('reload preserves existing high-level wilds, suspended wilds, partner XP, and applies caps to the next encounter',()=>{
 for(const Type of [PC,Android]){const g=fixture(Type);g.data.champion=true;g.newWild(now);g.data.battle.foe=require('../battle.cjs').combatant(g.data.battle.foe.id,100);g.data.suspendedWild=structuredClone(g.data.battle);g.data.champion=false;const before=structuredClone(g.data),loaded=new Type(g.data,now+1);
  assert.deepEqual(loaded.data.battle,before.battle);assert.deepEqual(loaded.data.suspendedWild,before.suspendedWild);assert.equal(loaded.data.owned[25].xp,before.owned[25].xp);assert.equal(loaded.data.owned[25].level,100);loaded.newWild(now+2);assert.equal(loaded.data.battle.foe.level,15);
 }
});

test('fixed challenge and story encounters retain authored levels independently of ordinary wild caps',()=>{
 for(const Type of [PC,Android]){const g=fixture(Type);g.data.mobileStory.rivals['rival-brock'].state='won';assert.ok(g.startChallenge(0,now));assert.equal(g.data.battle.foe.level,data.bosses[0].team[0].level);
  const j=johto(Type),node=J.nodes.get('j-red-gyarados');assert.equal(j.wildLevelCap(),15);assert.ok(j.startJohtoBattle(node,now));assert.equal(j.data.battle.foe.level,node.level);assert.equal(j.data.battle.foe.id,130);
 }
});

test('monthly reset restores the opening cap while retaining permanent dex registrations',()=>{
 for(const Type of [PC,Android]){const g=johto(Type);g.data.johto.champion=true;g.data.caught[144]=now;g.reserveCapture(144,1,now);const next=new Type(g.data,Date.parse('2026-11-01T00:00:00+09:00'));assert.equal(next.wildLevelCap(),15);assert.ok(next.data.caught[144]);assert.deepEqual(next.data.badges,[]);assert.equal(next.data.johtoUnlocked,false);assert.deepEqual(next.data.captureReservations,{});assert.ok(next.panelState(now).collection.length);}
});
