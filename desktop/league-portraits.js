'use strict';
(()=>{
  // Original image width, followed by the square face viewport's x/y/size.
  const faces={lorelei:[334,83,0,160],bruno:[382,3,0,158],agatha:[352,88,0,190],lance:[415,67,0,196],champion:[1680,688,61,722]};
  document.addEventListener('panel-rendered',({detail:state})=>{
    const cards=document.querySelectorAll('#league-team .league-member');
    state.bosses.slice(8).forEach((boss,index)=>{
      const card=cards[index];if(!card||card.querySelector('.league-portrait'))return;
      const body=document.createElement('div'),info=document.createElement('div'),face=document.createElement('div');
      body.className='gym-body';info.className='gym-info';face.className='gym-portrait league-portrait';face.dataset.trainer=boss.id;
      if(boss.revealed===false){face.classList.add('unknown');face.textContent='?';face.setAttribute('aria-label','아직 만나지 않은 상대');}
      else{
        const [width,x,y,size]=faces[boss.id],image=document.createElement('img');image.className='gym-trainer';image.src='assets/trainers/portraits/'+boss.id+'.png';image.alt=boss.name+' · 얼굴 초상화';image.draggable=false;
        image.style.width=width/size*100+'%';image.style.left=-x/size*100+'%';image.style.top=-y/size*100+'%';face.append(image);
      }
      info.append(...card.childNodes);body.append(info,face);card.append(body);
    });
  });
})();
