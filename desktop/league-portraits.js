'use strict';
(()=>{
  // Original image width, followed by the square face viewport's x/y/size.
  const faces={lorelei:[334,83,0,160],bruno:[382,3,0,158],agatha:[352,88,0,190],lance:[415,67,0,196],champion:[1680,688,61,722]};
  document.addEventListener('panel-rendered',({detail:state})=>{
    const cards=document.querySelectorAll('#league-team .league-member');
    state.bosses.slice(8).forEach((boss,index)=>{
      const card=cards[index];if(!card||card.querySelector('.league-portrait'))return;
      card.append(ChallengeUI.trainerBody({id:boss.id,heading:[...card.childNodes],portrait:{name:boss.name,src:'assets/trainers/portraits/'+boss.id+'.png',crop:faces[boss.id]},unknown:boss.revealed===false,league:true}));
    });
  });
})();
