'use strict';
(()=>{
  itemSprites['silph-scope']='silph-scope';itemSprites['secret-key']='secret-key';
  function card(id,titleText,kind,anchor){
    const root=document.createElement('details'),summary=document.createElement('summary'),heading=document.createElement('div'),title=document.createElement('h2'),label=document.createElement('span'),note=document.createElement('p'),art=document.createElement('div'),body=document.createElement('div');
    root.id=id;root.hidden=true;root.className='story-board mobile-challenge-card exploration-card';
    heading.className='exploration-heading';title.textContent=titleText;label.className='exploration-label';heading.append(title,label);summary.append(heading,note);
    art.className='exploration-landscape '+kind;art.setAttribute('aria-hidden','true');for(let i=0;i<5;i++)art.append(document.createElement('i'));body.className='exploration-body';root.append(summary,art,body);document.getElementById(anchor).after(root);
    return {root,note,label,body};
  }
  const safari=card('safari-details','사파리존','safari-landscape','snorlax-road');
  const mansion=card('mansion-details','홍련섬의 폐저택','mansion-landscape','silph-details');
  const note=text=>{const p=document.createElement('p');p.className='muted';p.textContent=text;return p;};
  const button=(text,action,value)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>window.buddy.action(action,value);return b;};
  let safariKey='',mansionKey='';
  window.buddy.onState(s=>{
    const a=s.safari,m=s.mansion,busy=s.battle?.kind==='trainer'||!!s.scene,queued=s.pendingChallenge;
    safari.root.hidden=!a?.visible;mansion.root.hidden=!m?.visible;
    if(safari.root.hidden){safari.root.open=false;safari.body.replaceChildren();safariKey='';}
    else{
      const key=JSON.stringify([a,busy,queued]);if(key!==safariKey){safariKey=key;safari.body.replaceChildren();
        safari.label.textContent=a.active?'탐험 중':a.last?'귀환':'걸어서 탐험';
        safari.note.textContent=a.active?'걸음을 따라 사파리의 풀숲과 물가를 탐험하고 있어요.':a.last?'탐험에서 돌아왔어요. 어떤 만남이 있었는지 살펴보세요.':'걸어서 다녀오는 작은 포획 여행. 돌아와서 새 동료를 확인해 보세요.';
        if(a.active){
          const meter=document.createElement('progress');meter.max=1;meter.value=a.progress;meter.setAttribute('aria-label','사파리 탐험 진행');safari.body.append(meter,note('남은 거리 '+a.remaining.toLocaleString('ko-KR')+'걸음 · 몬스터볼 '+a.balls+'개'),note('앱을 켜면 동료와 모험을 이어가고, 꺼 둔 동안 걸으면 사파리에서 포획을 시도해요.'),button('탐험 마치고 돌아오기','safari-return'));
        }else{
          safari.body.append(note('몬스터볼 30개 · 1,500걸음 동안 탐험해요. 이미 데려온 포켓몬은 포획 예약이 있을 때만 다시 잡아요.'));
          const start=button(queued?.index==='safari-start'?'출발 예약됨':a.visited?'다시 탐험하기':'탐험 떠나기','challenge','safari-start');start.id='safari-start';start.disabled=!a.canStart||busy||!!queued;safari.body.append(start);
        }
        if(a.last){
          const result=document.createElement('section');result.className='expedition-result';const title=document.createElement('h3');title.textContent='지난 탐험';result.append(title,note(a.last.encounters+'번의 만남 · '+a.last.caught.length+'마리 포획'));
          if(a.last.caught.length){const list=document.createElement('div');list.className='expedition-catches';for(const p of a.last.caught){const mon=document.createElement('div'),sprite=document.createElement('img'),text=document.createElement('span');sprite.src='assets/'+p.id+'.gif';sprite.alt='';text.textContent=p.name+' · Lv.'+p.level;mon.append(sprite,text);list.append(mon);}result.append(list);}else result.append(note('이번에는 새 동료를 데려오지 못했어요. 다음 탐험을 기약해요.'));
          safari.body.append(result);
        }
      }
    }
    if(mansion.root.hidden){mansion.root.open=false;mansion.body.replaceChildren();mansionKey='';}
    else{
      const key=JSON.stringify([m,busy,queued]);if(key!==mansionKey){mansionKey=key;mansion.body.replaceChildren();mansion.note.textContent=m.description;mansion.label.textContent=m.completed?'조사 완료':m.started?'조사 중':'남겨진 흔적';
        if(m.entries.length){const records=document.createElement('div');records.className='mansion-records';for(const entry of m.entries){const page=document.createElement('article'),title=document.createElement('h3');title.textContent='연구일지 '+(entry.index+1);page.append(title,...entry.pages.map(note));records.append(page);}mansion.body.append(records);}
        const start=button(m.completed?'조사 완료':m.started?'단서를 찾는 중':queued?.index==='mansion-investigate'?'조사 예약됨':'저택 조사하기','challenge','mansion-investigate');start.id='mansion-start';start.disabled=!m.canStart||busy||!!queued;mansion.body.append(start);
      }
    }
  });
})();
