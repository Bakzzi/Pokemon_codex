'use strict';
globalThis.FriendshipUI={
 create(target,{describe,status}={}){
  let member=null,enabled=false,until=0,timer=0;
  const heart=document.createElement('span');heart.className='friendship-heart';heart.setAttribute('aria-hidden','true');target.append(heart);
  target.classList.add('friendship-touch');if(target.tagName!=='BUTTON'){target.setAttribute('role','button');target.tabIndex=0;}
  function clear(){clearTimeout(timer);timer=0;until=0;target.classList.remove('friendship-reacting');delete target.dataset.reaction;if(status)status.textContent='';}
  function play(){
   if(!enabled||!member?.friendship||Date.now()<until)return;
   const f=member.friendship;until=Date.now()+1800;target.dataset.reaction=f.reaction;target.classList.add('friendship-reacting');
   const text=member.name+' · '+f.text;
   if(status)status.textContent=text;if(describe)describe(text,until,member.uid);
   timer=setTimeout(clear,1800);
  }
  target.onclick=play;
  if(target.tagName!=='BUTTON')target.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}};
  return {clear,render(p,allowed=true){
   if(member?.uid!==p?.uid||!allowed)clear();member=p;enabled=!!allowed&&!!p?.friendship;
   target.setAttribute('aria-disabled',String(!enabled));target.setAttribute('aria-label',p?.name+' 살펴보기');
   target.title=enabled?p.name+' · '+p.friendship.label+' · 눌러서 살펴보기':'';
  }};
 }
};
