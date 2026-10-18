(function(){
  'use strict';
  const capture=typeof module==='object'&&module.exports?require('./capture-animation.js'):CaptureAnimation;
  function eligible(s){return !!s.safari?.active&&!s.scene&&s.battle?.kind!=='trainer'&&!s.battle?.storyId;}
  function frame(event,now){
    if(!event)return {text:'풀숲을 살펴보는 중',phase:'exploring',ball:false,done:true};
    if(event.outcome==='observed')return {text:'풀숲에서 기척이 느껴져요.',phase:'rustle',ball:false,done:now-event.at>=2200};
    const caught=event.outcome==='caught',f=capture.captureFrame({at:event.at,caught,shakes:caught?3:event.sequence%4,name:event.name},now);
    const t=Math.min(1,f.age/f.throwMs),shakeAge=f.age-f.shakeAt-(f.shake-1)*f.shakeEvery;
    return {text:f.text,phase:f.phase,ball:true,done:!f.locked,
      x:f.age<f.throwMs?-172*(1-t):f.phase==='shake'&&shakeAge<f.shakeMs?3*Math.sin(shakeAge/f.shakeMs*Math.PI*2):0,
      y:f.age<f.throwMs?-42*Math.sin(Math.PI*t):0,
      angle:f.age<f.throwMs?540*t:f.phase==='shake'&&shakeAge<f.shakeMs?24*Math.sin(shakeAge/f.shakeMs*Math.PI*2):0,
      sparkle:caught&&f.age>=f.resultAt&&f.age<f.resultAt+900};
  }
  function create({document:doc=document,now=Date.now}){
    const $=id=>doc.getElementById(id);let previous=null,event=null,raf=0,lingering=false;
    function draw(){
      raf=0;const f=frame(event,now()),root=$('safari-scene');
      if(f.done&&event){event=null;if(lingering){hide();return;}}
      const view=event?f:frame(null,now());root.dataset.phase=view.phase;$('safari-text').textContent=view.text;
      const ball=$('safari-ball');ball.hidden=!view.ball;ball.style.transform=`translate(${view.x||0}px,${view.y||0}px) rotate(${view.angle||0}deg)`;
      ball.classList.toggle('caught',view.phase==='caught');$('safari-sparkle').hidden=!view.sparkle;
      if(event)raf=requestAnimationFrame(draw);
    }
    function hide(){if(raf)cancelAnimationFrame(raf);raf=0;event=null;lingering=false;$('safari-scene').hidden=true;doc.querySelector('.scene').classList.remove('safari-active');}
    function render(s){
      const a=s.safari,active=eligible(s),end=!a?.active&&!a?.last?.returned&&previous?.active&&a?.last?.id===previous.tripId;
      if(!active&&!end){if(lingering&&event&&a?.last?.tripId===event.tripId&&!s.scene&&s.battle?.kind!=='trainer'&&!s.battle?.storyId)return;previous=a;hide();return;}
      const visual=active?a:a.last;
      if(previous?.active&&previous.tripId===visual.tripId&&visual.encounterCount>previous.encounterCount){
        event={...visual.lastEncounter,tripId:visual.tripId,at:now()};
      }else if(!previous?.active||previous.tripId!==visual.tripId)event=null;
      lingering=end&&!!event;
      previous=a;
      if(end&&!lingering){hide();return;}
      $('safari-scene').hidden=false;doc.querySelector('.scene').classList.add('safari-active');
      $('safari-progress').style.width=(active?a.progress:1)*100+'%';
      $('safari-supplies').textContent='몬스터볼 '+(active?a.balls:a.last.balls)+'개';
      if(raf)cancelAnimationFrame(raf);draw();
    }
    return {render};
  }
  const api={eligible,frame,create};if(typeof module==='object'&&module.exports)module.exports=api;else globalThis.SafariPresentation=api;
})();
