'use strict';
(()=>{
  const details=document.createElement('details'),summary=document.createElement('summary'),title=document.createElement('h2'),description=document.createElement('p'),match=document.createElement('div'),head=document.createElement('div'),name=document.createElement('h3'),image=document.createElement('img'),lineup=document.createElement('div'),status=document.createElement('p'),button=document.createElement('button');
  details.id='rival-details';details.className='story-board mobile-challenge-card';
  title.textContent='라이벌 매치';description.textContent='모험 중 라이벌이 찾아와 승부를 걸어요. 패배하면 여기서 다시 도전할 수 있어요.';summary.append(title,description);
  match.className='rival-match';head.className='rival-heading';name.textContent='그린';image.alt='그린';head.append(name,image);status.className='muted';button.id='rival-retry';match.append(head,lineup,status,button);details.append(summary,match);document.getElementById('kanto-gyms').after(details);
  let currentId=null;button.onclick=()=>{if(currentId)window.buddy.action('challenge',currentId);};
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
    const rivals=(s.rivals||[]).filter(e=>e.stage>0),e=rivals.find(e=>e.state==='active')||rivals.find(e=>e.state==='retry');
    currentId=e?.id||null;head.hidden=!e;lineup.replaceChildren();
    if(e){image.src='assets/trainers/battle/'+e.sprite+'.png';if(e.met&&e.team?.length)lineup.append(trainerTeam(e));button.dataset.rivalChallenge=e.id;}
    else delete button.dataset.rivalChallenge;
    const queued=!!e&&s.pendingChallenge?.index===e.id,busy=s.battle?.kind==='trainer';
    status.textContent=queued?'현재 배틀이 끝나면 다시 승부해요.':e?.state==='active'?'라이벌과 승부하고 있어요.':e?'동료를 준비하고 다시 도전해 보세요.':'지금은 재도전할 라이벌이 없어요.';
    button.textContent=queued?'재도전 예약됨':e?.state==='active'?'배틀 중':'라이벌에게 재도전';
    button.disabled=!e?.canRetry||busy||!!s.pendingChallenge||!!s.scene;
  });
})();
