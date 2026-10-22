'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../game-v2.cjs'),{species,xpAt}=require('../pokemon.cjs');
const {load}=require('../../reference/pokeapi/firered-experience.cjs');
const now=Date.parse('2026-10-22T03:00:00Z');
function fixture(Type=Game,level=5){
  const g=new Type(new Game({},now).data,now),p=g.data.owned[25];
  p.level=level;p.xp=xpAt(25,level);require('../move-access.cjs').update(p);g.data.caught={};return g;
}
test('all 251 species use verified FRLG experience yields and original growth groups',()=>{
  const {facts}=load();assert.equal(species.size,251);
  for(const p of species.values())assert.deepEqual({baseExperience:p.baseExperience,growth:p.growth},facts.get(p.identifier.toUpperCase().replaceAll('-','_')),p.identifier);
  for(const [id,yieldValue] of [[16,55],[19,57],[122,136],[113,255],[150,220]])assert.equal(species.get(id).baseExperience,yieldValue);
});
test('a lower-level opponent yields less XP, independent of the recipient level',()=>{
  for(const ownLevel of [5,20,50,99]){
    const g=fixture(Game,ownLevel),before=g.data.owned[25].xp;
    assert.equal(g.awardXp({id:16,level:5},false,now),39);
    assert.equal(g.awardXp({id:16,level:10},false,now),78);
    assert.equal(g.data.owned[25].xp-before,117);
  }
});
test('the original growth curve makes the same low-level victory fill less of later levels',()=>{
  const early=xpAt(25,6)-xpAt(25,5),later=xpAt(25,51)-xpAt(25,50);
  assert.equal(early,91);assert.equal(later,7651);assert.ok(39/later<39/early);
});
test('trainer XP uses original integer rounding before the existing collection bonus',()=>{
  const g=fixture();assert.equal(g.awardXp({id:16,level:2},true,now),22);
  for(let id=1;id<=50;id++)g.data.caught[id]=now;
  assert.equal(g.awardXp({id:16,level:2},true,now+1),33);
});
test('PC and Android consume the same classic awards without rewriting saved XP',()=>{
  const types=[require('../adventure.cjs').Adventure,require('../../mobile/adventure.cjs').Adventure];
  for(const Type of types){
    let g=fixture(Type,20);g.data.owned[25].xp+=300;const before=structuredClone(g.data.owned);
    g=new Type(g.data,now+1);assert.deepEqual(g.data.owned,before);
    assert.equal(g.awardXp({id:122,level:7},false,now+2),136);
    assert.equal(g.data.owned[25].xp-before[25].xp,136);
    const saved=structuredClone(g.data);g=new Type(saved,now+3);
    assert.deepEqual(g.data.owned,saved.owned);assert.equal(g.data.adventure.totals.xp,136);
  }
});
