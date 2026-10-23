'use strict';
// A deliberately prepared route fixture for isolated geometry/encounter tests.
// Real imports must not derive any of these wins from badges. Those are tested
// with raw saves in kanto-migration and kanto-journey.
const {Game}=require('../../game.cjs');
function existing(Type,now,options){
 const g=new Type(new Game({},now).data,now,options);
 if(g.data.kantoStory){
  const K=require('../../../shared/kanto-journey.cjs');
  for(const n of K.nodes.values())g.data.kantoStory.cleared[n.id]=now;
  for(const p of Object.values(g.data.mobileStory.rivals))Object.assign(p,{state:'won',wonAt:now,outcome:'win'});
  g.data.kantoStory.drinkAt=now;
  g.data.mobileStory.safari.completedAt=now;
 }
 return g;
}
module.exports={existing};
