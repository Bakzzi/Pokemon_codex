'use strict';
// A location visit reveals only its facility marker, never a story reward.
module.exports=function facilities(state,johto=false){
 const rows=johto?[
  ['johto-daycare','j-route34','키우미집','lucky-egg'],
  ['kanto-daycare','j-k-route-5','키우미집','lucky-egg']
 ]:[['kanto-daycare','route-5','키우미집','lucky-egg'],['kanto-safari','safari','사파리존','safari-ball']];
 return rows.filter(([,location])=>!!state.visited?.[location]).map(([id,location,name,icon])=>({id,location,name,icon:'assets/items/'+icon+'.png'}));
};
