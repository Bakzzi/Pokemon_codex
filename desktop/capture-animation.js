(function(){
  'use strict';
  // Shared by the game clock and renderer, so a battle cannot interrupt a throw.
  function captureText(capture){
    const band=capture.band==='yellow'?'노란 체력':capture.band==='red'?'빨간 체력':null;
    return '몬스터볼을 던졌다!'+(band?` (${band} ${capture.bandAttempt}/${capture.bandLimit})`:'');
  }
  function captureTiming(capture){
    const shakes=capture.caught?3:Math.max(0,Math.min(3,Math.trunc(capture.shakes)||0));
    const throwMs=360,absorbMs=280,landMs=460,shakeAt=1500,shakeEvery=740,shakeMs=320;
    const resultAt=shakeAt+shakes*shakeEvery,messageAt=resultAt+(capture.caught?320:0);
    return {shakes,throwMs,absorbMs,landMs,shakeAt,shakeEvery,shakeMs,resultAt,messageAt,duration:resultAt+(capture.caught?3200:2400)};
  }
  function captureFrame(capture,now){
    const t=captureTiming(capture),age=Math.max(0,now-capture.at);
    const shake=age<t.shakeAt?0:Math.min(t.shakes,Math.floor((age-t.shakeAt)/t.shakeEvery)+1);
    const phase=age>=t.resultAt?(capture.caught?'caught':'escaped'):
      age>=t.shakeAt?'shake':age>=t.throwMs+t.absorbMs?'landing':age>=t.throwMs?'absorbing':'throwing';
    const text=age>=t.messageAt?(capture.caught?`${capture.name} 포획 성공!`:'아쉽다! 포켓몬이 빠져나왔다!'):
      age>=t.resultAt?'…!':shake?['하나…','둘…','셋…'][shake-1]:captureText(capture);
    return {...t,age,shake,phase,text,locked:age<t.duration};
  }
  const api={captureTiming,captureFrame,captureText};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else globalThis.CaptureAnimation=api;
})();
