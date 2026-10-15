(function(){
  'use strict';
  const effects=typeof module==='object'&&module.exports?require('./move-effects.js'):globalThis.MoveEffects;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const pauses=Object.freeze({encounter:2200,switch:4600,faint:2300,result:2800,champion:4000});
  const switchTiming=Object.freeze({absorbAt:650,absorbEnd:1250,returnAt:1550,returnEnd:2150,sendAt:2500,openAt:3200,revealAt:3400,revealEnd:4050,duration:4600});
  function actionTiming(event){
    const announceMs=650,effectMs=event.moveId?effects.profileFor(event.moveId).duration:0;
    const impactAt=announceMs+Math.round(effectMs*.58),healthAt=impactAt+180,healthMs=750;
    const resultAt=Math.max(announceMs+effectMs,healthAt+healthMs);
    return {announceMs,effectMs,impactAt,healthAt,healthMs,resultAt,duration:resultAt+1350};
  }
  function duration(event){return event?.duration??(event?.kind==='attack'?actionTiming(event).duration:pauses[event?.kind]||2400);}
  function healthAt(event,side,now,after){
    const before=event?.[side+'Before'];if(!before)return after;
    const t=actionTiming(event),progress=clamp((now-event.at-t.healthAt)/t.healthMs);
    if(progress===1)return after;
    return {...after,maxHp:before.maxHp,hp:before.hp+(after.hp-before.hp)*progress,
      currentHp:Math.round(before.currentHp+(after.currentHp-before.currentHp)*progress),
      status:now<event.at+t.impactAt&&Object.hasOwn(before,'status')?before.status:after.status};
  }
  function damageReaction(event,side,now){
    const lost=(event[side+'Before']?.currentHp||0)-(event[side]?.currentHp??event[side+'Before']?.currentHp??0);
    const age=now-event.at-actionTiming(event).impactAt,t=clamp(age/700),active=lost>0&&age>=0&&age<700;
    return {active,x:active?6*Math.sin(t*Math.PI*8)*(1-t):0,opacity:active?.3+.7*Math.abs(Math.cos(t*Math.PI*3)):1};
  }
  function damageMessages(event){
    const seen=new Set();
    return (event.damageCauses||[]).filter(c=>{
      const key=c.side+':'+c.cause;
      if(!['hero','foe'].includes(c.side)||seen.has(key)||(event[c.side+'Before']?.currentHp||0)<=(event[c.side]?.currentHp??Infinity))return false;
      seen.add(key);return true;
    }).map(c=>({side:c.side,text:c.text||event[c.side].name+' · '+c.cause+' 피해!'}));
  }
  function switchFrame(event,now){
    const s=switchTiming,age=Math.max(0,now-event.at),incoming=age>=s.sendAt;
    let phase='recall-throw',x=0,y=0,angle=0,ballVisible=true,ballOpacity=1,scale=1,opacity=event.reason==='faint'?.45:1,heroY=event.reason==='faint'?18:0,glow=0;
    if(age<s.absorbAt){const t=clamp(age/s.absorbAt);x=-100*(1-t);y=20*(1-t)-24*Math.sin(Math.PI*t);angle=540*t;}
    else if(age<s.absorbEnd){phase='absorb';const t=clamp((age-s.absorbAt)/(s.absorbEnd-s.absorbAt));scale=1-t;opacity*=1-t;heroY=heroY*(1-t)-14*t;glow=Math.sin(Math.PI*t);}
    else{
      scale=0;opacity=0;phase='ball-hold';
      if(age>=s.returnAt&&age<s.returnEnd){phase='return-ball';const t=clamp((age-s.returnAt)/(s.returnEnd-s.returnAt));x=-100*t;y=20*t-20*Math.sin(Math.PI*t);angle=-540*t;}
      else if(age>=s.returnEnd&&age<s.sendAt){phase='pause';ballVisible=false;}
      else if(age>=s.sendAt&&age<s.openAt){phase='send-throw';const t=clamp((age-s.sendAt)/(s.openAt-s.sendAt));x=-100*(1-t);y=20*(1-t)-26*Math.sin(Math.PI*t);angle=540*t;}
      else if(age>=s.openAt&&age<s.revealAt){phase='open';glow=clamp((age-s.openAt)/(s.revealAt-s.openAt));}
      else if(age>=s.revealAt){
        const t=clamp((age-s.revealAt)/(s.revealEnd-s.revealAt));phase=t<1?'release':'settle';
        scale=.12+.88*(1-(1-t)**2);opacity=t;heroY=-14*(1-t);ballOpacity=1-clamp(t*3);ballVisible=t<.34;glow=1-t;
      }
    }
    return {age,phase,incoming,x,y,angle,ballVisible,ballOpacity,scale,opacity,heroY,glow,done:age>=s.duration};
  }
  const api={pauses,actionTiming,duration,healthAt,damageReaction,damageMessages,switchTiming,switchFrame};
  if(typeof module==='object'&&module.exports)module.exports=api;else globalThis.BattlePacing=api;
})();
