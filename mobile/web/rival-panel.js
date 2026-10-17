'use strict';
(()=>{
  const details=document.createElement('details'),summary=document.createElement('summary'),title=document.createElement('h2'),list=document.createElement('div');
  details.id='rival-details';details.className='story-board mobile-challenge-card';
  title.textContent='라이벌';summary.append(title);details.append(summary,list);document.getElementById('kanto-gyms').after(details);
  let signature='';
  window.buddy.onState(s=>{
    // This listener follows the standard panel renderer, so locks are reapplied
    // even when its gym/league nodes were recreated for a different state.
    const league=document.getElementById('league-start');
    if(league.dataset.rivalLock&&!s.rivalLocks?.[8]){
      league.disabled=s.badges.length<8||s.battle?.kind==='trainer'||!!s.pendingChallenge;
      league.textContent=s.pendingChallenge?.index===8?'리그 도전 예약됨':s.champion?'리그 재도전':'리그 도전';delete league.dataset.rivalLock;
    }
    for(const [index,text] of Object.entries(s.rivalLocks||{})){
      const button=Number(index)===8?document.getElementById('league-start'):document.querySelector('[data-challenge="'+index+'"]');
      if(button){button.disabled=true;button.textContent=text;button.dataset.rivalLock=index;}
    }
    const key=JSON.stringify([s.rivals,s.battle?.kind,s.pendingChallenge,s.scene?.id]);if(signature===key)return;signature=key;
    list.replaceChildren();
    for(const e of s.rivals||[]){
      const row=document.createElement('article');row.className='rival-entry';row.dataset.rival=e.id;
      const head=document.createElement('div');head.className='rival-heading';
      const image=document.createElement('img');image.src='assets/trainers/battle/'+(e.sprite||'green')+'.png';image.alt=e.met?'그린':'아직 만나지 않은 라이벌';image.className=e.met?'':'unknown-rival';
      const name=document.createElement('h3');name.textContent=(e.stage+1)+'. '+(e.met?'그린과의 승부':e.name);head.append(name,image);row.append(head);
      if(e.met&&e.team?.length)row.append(trainerTeam(e));
      const button=document.createElement('button');button.dataset.rivalChallenge=e.id;
      const queued=s.pendingChallenge?.index===e.id,busy=s.battle?.kind==='trainer';
      button.textContent=queued?'재도전 예약됨':e.state==='active'?'배틀 중':e.state==='won'?'승리 완료':e.state==='completed'?'진행 완료':e.state==='retry'?'그린에게 재도전':'아직 만날 수 없어요';
      button.disabled=!e.canRetry||busy||!!s.pendingChallenge||!!s.scene;
      button.onclick=()=>window.buddy.action('challenge',e.id);row.append(button);list.append(row);
    }
  });
})();
