'use strict';
// Shared challenge groups; each product keeps its own viewport layout.
(()=>{
  const $=id=>document.getElementById(id);
  function card(id,heading,contents){
    const details=document.createElement('details'),summary=document.createElement('summary');
    details.id=id;details.className='story-board challenge-card mobile-challenge-card';summary.append(heading);details.append(summary,...contents);return details;
  }
  const gyms=$('kanto-gyms');
  gyms.replaceChildren(card('gym-details',gyms.querySelector('.intro'),[gyms.querySelector('.badge-case'),$('gyms')]));
  const league=$('pokemon-league'),heading=league.querySelector('.league');
  league.replaceChildren(card('league-details',heading.firstElementChild,[$('league-start'),$('league-team'),$('league-progress'),$('johto-choice')]));
  const special=$('special-encounters');
  special.replaceChildren(card('special-details',$('special-encounters-title'),[$('special-encounters-note'),special.querySelector('table')]));
  for(const id of ['rocket-hideout','snorlax-road']){$(id).classList.add('challenge-card','mobile-challenge-card');$(id).hidden=true;}
  for(const details of document.querySelectorAll('.mobile-challenge-card'))details.open=false;
})();
