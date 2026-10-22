'use strict';
(()=>{
  const details=document.createElement('details'),summary=document.createElement('summary'),title=document.createElement('h2'),description=document.createElement('p'),match=document.createElement('div'),head=document.createElement('div'),name=document.createElement('h3'),image=document.createElement('img'),lineup=document.createElement('div'),status=document.createElement('p'),button=document.createElement('button');
  details.id='rival-details';details.className='story-board challenge-card mobile-challenge-card';
  title.textContent='라이벌 매치';description.textContent='어릴 때부터 함께 자란 친구이자 라이벌, 그린. 모험길에서 다시 만나 서로 얼마나 강해졌는지 겨뤄요.';summary.append(title,description);
  match.className='rival-match';head.className='rival-heading';name.textContent='그린';image.alt='그린';head.append(name,image);status.className='muted';button.id='rival-retry';match.append(head,lineup,status,button);details.append(summary,match);document.getElementById('kanto-gyms').after(details);
  let currentId=null;button.onclick=()=>{if(currentId)window.buddy.action('challenge',currentId);};
  let signature='';
  document.addEventListener('panel-rendered',({detail:s})=>{
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
    const rivals=(s.rivals||[]).filter(e=>e.stage>0),e=rivals.find(e=>e.state==='active')||rivals.find(e=>e.state==='retry')||rivals.find(e=>e.canRetry);
    currentId=e?.id||null;image.src='assets/trainers/battle/'+(e?.sprite||'green')+'.png';lineup.replaceChildren();
    if(e){if(e.met&&e.team?.length)lineup.append(trainerTeam(e));button.dataset.rivalChallenge=e.id;}
    else delete button.dataset.rivalChallenge;
    const queued=!!e&&s.pendingChallenge?.index===e.id,busy=s.battle?.kind==='trainer';
    status.textContent=queued?'진행 중인 동작이 끝나면 그린과 다시 승부해요.':e?.state==='active'?'그린과 승부하고 있어요.':e?.state==='unseen'?'그린이 길목에서 기다리고 있어요.':e?'동료를 준비하고 그린에게 다시 도전해 보세요.':'그린과 다시 만날 날을 기다리고 있어요.';
    button.textContent=queued?'재도전 예약됨':e?.state==='active'?'배틀 중':e?.state==='unseen'?'그린과 승부하기':'그린에게 재도전';
    button.disabled=!e?.canRetry||busy||!!s.pendingChallenge||!!s.scene;
  });
})();
