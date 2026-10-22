'use strict';
(()=>{
  // Original image width, followed by the square face viewport's x/y/size.
  const faces=Object.fromEntries(['lorelei','bruno','agatha','lance','champion'].map(id=>[id,[64,16,0,32]]));
  document.addEventListener('panel-rendered',({detail:state})=>{
    const cards=document.querySelectorAll('#league-team .league-member');
    state.bosses.slice(8).forEach((boss,index)=>{
      const card=cards[index];if(!card||card.querySelector('.league-portrait'))return;
      card.append(ChallengeUI.trainerBody({id:boss.id,heading:[...card.childNodes],portrait:{name:boss.name,src:'assets/trainers/battle/'+boss.id+'.png',crop:faces[boss.id]},unknown:boss.revealed===false,league:true}));
    });
  });
})();
