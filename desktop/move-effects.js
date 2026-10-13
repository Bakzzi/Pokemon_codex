/* Local, silent pixel effects. Dispatch by move ID, never by elemental type. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MoveEffects=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const profiles={};
  const palette={cream:['#fff6cf','#d0ad75'],fire:['#ffcd65','#f27645'],water:['#b4f1fa','#4daddf'],leaf:['#c3ec86','#66a954'],electric:['#fff2a0','#e2b44a'],ice:['#efffff','#8ad7e6'],poison:['#e2b2ed','#a168b4'],psychic:['#f9b4dd','#b980d3'],dark:['#b2a5d8','#665987'],metal:['#f0f3ea','#94aeb8'],earth:['#dfc598','#9d815c']};
  function group(family,ids,options={}){for(const id of ids){if(profiles[id])throw new Error('Duplicate move effect '+id);profiles[id]={id,family,color:'cream',duration:1080,motion:'cast',...options};}}
  function tune(ids,options){for(const id of ids)Object.assign(profiles[id],options);}
  group('ram',[29,33,34,36,37,38,66,68,69,70,99,117,130,143,165,168,175,179,185,200,216,218,228,233,249,251,263,265,276,279,282,283,302,310,332,340,343,344],{motion:'lunge'});
  group('punch',[1,3,4,5,7,8,9,146,183,223,252,264,292,309,325,327],{motion:'jab'});
  group('kick',[23,24,25,26,27,67,136,167,299],{motion:'jump'});
  group('slash',[2,10,15,154,163,206,210,232,238,280,306,337,348],{motion:'jab'});
  group('clamp',[11,12,128],{motion:'jab'});
  group('tail',[21,231,342],{motion:'spin'});
  group('horn',[30,31,32,64,65,224],{motion:'jab'});
  group('bite',[44,158,162,242,305],{motion:'jab'});
  group('whip',[22,338],{color:'leaf'});
  group('coil',[20,35,132],{motion:'jab'});
  group('thread',[81,169],{color:'metal'});
  group('needle',[40,41,42,131,333,331]);
  group('toss',[6,88,121,125,140,155,157,198,217,246,317,350],{color:'earth'});
  group('star',[129],{duration:1040});
  group('sound',[45,46,47,48,49,103,173,195,214,215,227,253,304,319,320,336]);
  group('wag',[39,321],{motion:'wag'});
  group('eyes',[43,137,170,184,193,199,212,316],{color:'psychic'});
  group('sand',[28,189,341],{color:'earth'});
  group('sludge',[51,124,188,190],{color:'poison'});
  group('embers',[52,261],{color:'fire'});
  group('flame',[53,82,225,257,315],{color:'fire'});
  group('fireblast',[126,221,284,307],{color:'fire',duration:1240});
  group('waterjet',[55,56,308,323],{color:'water'});
  group('wave',[57,127,330,346],{color:'water',duration:1180});
  group('beam',[58,60,62,63,76,177,324,353],{duration:1240});
  group('snow',[59,181,196,258,329],{color:'ice'});
  group('bubbles',[61,145,281,352],{color:'water'});
  group('drain',[71,72,138,141,202,220],{color:'leaf'});
  group('seed',[73,275],{color:'leaf'});
  group('leaves',[75,80,297,318,345],{color:'leaf'});
  group('powder',[77,78,79,147,178,230,312],{color:'leaf'});
  group('vortex',[83,239,250,328],{duration:1180});
  group('electric',[84,85,86,87,192,209,268,351],{color:'electric'});
  group('quake',[89,90,222],{color:'earth',duration:1180});
  group('burrow',[91,291],{color:'earth',motion:'jump'});
  group('poison',[92],{color:'poison'});
  group('mind',[93,94,95,109,149,248,295,326,354],{color:'psychic'});
  group('dash',[97,98,104,245],{motion:'dash',duration:860});
  group('vanish',[100,107,144,160,166,176,226,272,278,285,289,293],{color:'psychic',motion:'fade'});
  group('ghost',[101,171,174,180,194,262,288],{color:'dark'});
  group('copy',[102,118,119,133,134,244,267,271,274],{color:'psychic'});
  group('heal',[105,135,156,208,234,235,236,256,273,287,303],{color:'leaf'});
  group('armor',[106,110,111,151,159,334],{color:'metal',motion:'curl'});
  group('smoke',[54,108,114,123,139],{color:'poison'});
  group('shield',[112,113,115,182,197,203,219,243,277,335],{color:'psychic'});
  group('aura',[14,74,96,116,148,187,207,254,266,270,294,322,339,347,349],{color:'cream'});
  group('blast',[120,153],{color:'fire',duration:1240});
  group('lick',[122],{color:'psychic',motion:'jab'});
  group('heart',[142,186,204,213],{color:'psychic'});
  group('hop',[150],{motion:'hop',duration:900});
  group('hammer',[152],{color:'water',motion:'jab'});
  group('tri',[161]);
  group('doll',[164],{color:'leaf'});
  group('roll',[172,205,229,301],{motion:'roll'});
  group('spikes',[191],{color:'metal'});
  group('weather',[201,240,241,300],{duration:1180});
  group('orb',[237,247,255,290,296,311],{color:'psychic'});
  group('taunt',[50,259,260,269,286,313],{color:'psychic'});
  group('wind',[13,16,17,18,19,211,314],{color:'metal'});
  group('dance',[298],{motion:'wag',color:'psychic'});
  // Similar actions share drawing primitives, but their geometry, rhythm and pose are per move.
  tune([3,4,24,31,41,42,131,140,154,167,198,251,292,331,333,350],{repeat:true});
  tune([5,25,34,36,38,70,120,130,136,143,153,158,162,223,224,242,264,276],{heavy:true,duration:1200});
  tune([7,172,299,344],{color:'fire'});tune([8,62,301,333],{color:'ice'});
  tune([9,209,268,344],{color:'electric'});tune([40,51,77,92,139,305,342],{color:'poison'});
  tune([78],{color:'electric'});tune([79,147],{color:'psychic'});
  tune([22,75,76,80,178,302,331,338,345,348],{color:'leaf'});
  tune([58,59,181,196,329],{color:'ice'});tune([60,93,94,95,138,295,296,326,354],{color:'psychic'});
  tune([82,200,225,337],{color:'dark'});tune([101,168,171,174,180,185,194,212,228,242,247,262,282,288,310,325],{color:'dark'});
  tune([17,211,231,232,238,309,319,334],{color:'metal'});tune([6,121,129,140,217],{color:'cream'});
  tune([83],{color:'fire'});tune([239],{color:'metal'});tune([250,291,352],{color:'water'});tune([328],{color:'earth'});
  tune([47,195,320],{notes:true});tune([48,103,319],{sharp:true});
  tune([56,85,87,94,202,308,323,338,354],{heavy:true,duration:1200});
  tune([55],{width:3});tune([56],{width:8});tune([308],{width:11});tune([323],{width:6});
  tune([52],{count:4});tune([261],{count:3});tune([53],{width:7});tune([257,315],{width:14});
  tune([61],{count:9});tune([145],{count:5});tune([281],{count:1});
  tune([58],{width:4});tune([60],{width:3});tune([62],{width:5});tune([63],{width:10});tune([76],{width:8});
  for(const p of Object.values(profiles))Object.freeze(p);Object.freeze(profiles);
  const fallback=Object.freeze({id:0,family:'aura',color:'cream',duration:900,motion:'cast'});
  const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,t)=>a+(b-a)*t;
  const pulse=t=>Math.sin(Math.PI*clamp(t));
  function profileFor(id){return profiles[id]||fallback;}
  function frameFor(event,now=Date.now()){
    const p=profileFor(event.moveId),age=Math.max(0,now-event.at),u=clamp(age/p.duration),outcome=event.outcome||'success';
    const active=now>=event.at&&age<p.duration,charging=outcome==='charging';
    const hits=p.repeat?Math.max(1,Math.min(5,event.hitCount||1)):1;
    const impactAt=.58,attack=clamp((u-.18)/.40),impact=active&&!charging&&outcome==='success'&&event.damage>0&&u>=impactAt&&u<.88;
    const actor={x:0,y:0,scale:1,rotate:0,opacity:1},target={x:0,y:0,scale:1,rotate:0,opacity:1};
    if(active){
      const beat=pulse((u-.13)/.65),reach=pulse((u-.2)/.64);
      if(charging){actor.scale=1-.05*pulse(u);actor.y=-3*pulse(u);}
      else if(p.motion==='lunge'||p.motion==='jab'||p.motion==='jump'){
        actor.x=(p.motion==='lunge'?132:98)*reach;
        actor.y=-(p.motion==='jump'?31:p.id===34?23:5)*beat;
        actor.rotate=p.id===69?18*beat:0;
      }else if(p.motion==='dash'){actor.x=event.moveTarget==='self'?Math.sin(u*19)*14:145*reach;actor.opacity=.65+.35*(1-beat);}
      else if(p.motion==='roll'){actor.x=126*reach;actor.rotate=360*clamp((u-.15)/.7);actor.y=-5*beat;}
      else if(p.motion==='spin'){actor.rotate=25*Math.sin(u*Math.PI*2);actor.x=48*beat;}
      else if(p.motion==='wag'){actor.rotate=12*Math.sin(u*Math.PI*6);}
      else if(p.motion==='hop'){actor.y=-24*Math.abs(Math.sin(u*Math.PI*3));}
      else if(p.motion==='curl'){actor.scale=1-.22*beat;actor.y=10*beat;}
      else if(p.motion==='fade'){actor.opacity=1-.8*beat;actor.scale=p.id===107?1-.4*beat:1;}
      else actor.x=-3*pulse(u/.35);
      if(impact){const t=(u-impactAt)/.3;target.x=5*Math.sin(t*Math.PI*6);target.opacity=.65+.35*Math.abs(Math.cos(t*Math.PI*4));}
      if(outcome==='miss'&&u>.42&&u<.9){target.y=-9*pulse((u-.42)/.48);target.x=9*pulse((u-.42)/.48);}
    }
    const sign=event.actor==='foe'?-1:1;actor.x*=sign;actor.rotate*=sign;target.x*=sign;
    return {profile:p,age,u,active,charging,outcome,hits,impact,actor,target,phase:charging?'charging':u<.18?'prepare':u<.58?'release':u<.88?'resolve':'settle'};
  }
  function drawFrame(ctx,event,frame){
    ctx.clearRect(0,0,185,79);if(!frame.active)return;
    const p=frame.profile,id=p.id,u=frame.u,[light,dark]=palette[p.color]||palette.cream;
    const t=clamp((u-.18)/.40),fade=clamp((1-u)/.18),self=event.moveTarget==='self';
    const sx=42,sy=42,tx=self?sx:147,ty=42;
    const active=u>=.12&&u<.97,hit=u>.51&&frame.outcome==='success',alpha=Math.min(1,u/.13)*fade;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;
    if(event.actor==='foe'){ctx.translate(185,0);ctx.scale(-1,1);}
    const line=(points,color=light,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='miter';ctx.lineCap='square';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.stroke();};
    const poly=(points,color=light)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();};
    const dot=(x,y,r=2,color=light)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x-r),Math.round(y-r),r*2,r*2);};
    const ring=(x,y,r,color=light,width=1)=>{const points=Array.from({length:13},(_,i)=>[x+Math.cos(i*Math.PI/6)*r,y+Math.sin(i*Math.PI/6)*r]);line(points,color,width);};
    const star=(x,y,r=6,color=light)=>poly([[x,y-r],[x+2,y-2],[x+r,y],[x+2,y+2],[x,y+r],[x-2,y+2],[x-r,y],[x-2,y-2]],color);
    const leaf=(x,y,a=0,color=light)=>{ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(a);poly([[-6,0],[0,-3],[7,0],[0,3]],color);line([[-5,0],[4,0]],dark,1);ctx.restore();};
    const burst=(x,y,r=12,color=light)=>{for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,2);}};
    const sparks=(x,y,r=18,color=light,count=8)=>{for(let i=0;i<count;i++){const a=i*2.4+u*2;dot(x+Math.cos(a)*r*(.5+.5*u),y+Math.sin(a)*r*(.5+.5*u),i%3===0?2:1,color);}};
    const projectile=(i,count,arc=0)=>{const q=clamp(t*1.4-i*.11);return [mix(sx+12,tx,q),mix(sy,ty,q)-Math.sin(q*Math.PI)*arc+Math.sin(i*4)*(count>1?7:0),q];};
    const crystal=(x,y,r=7)=>{poly([[x,y-r],[x+r/2,y],[x,y+r],[x-r/2,y]],light);line([[x,y-r],[x,y+r]],dark,1);};
    const notes=(x,y)=>{line([[x,y],[x,y-8],[x+5,y-6]],light,2);dot(x-2,y+1,2);};
    const flame=(x,y,r=9)=>{poly([[x-r*.7,y+r/2],[x-r,y-r/3],[x-r/4,y-r/2],[x,y-r*1.5],[x+r/3,y-r/2],[x+r*.7,y-r],[x+r,y+r/3],[x+r/2,y+r]],dark);poly([[x-r/3,y+r/2],[x-r/3,y-r/4],[x,y-r*.65],[x+r/3,y+r/2]],light);};
    const heart=(x,y)=>poly([[x,y+5],[x-6,y-1],[x-6,y-4],[x-3,y-6],[x,y-3],[x+3,y-6],[x+6,y-4],[x+6,y-1]],light);
    const crack=(x,y)=>line([[x-20,y],[x-8,y-3],[x-3,y+3],[x+6,y-4],[x+20,y]],dark,2);
    if(!active){ctx.restore();return;}
    if(frame.charging){
      // Solar Beam/Fly/Dig have a preparation action with no hit or outgoing projectile.
      if(id===91||id===291){ring(sx,62,14,dark,2);for(let i=0;i<6;i++)dot(sx-13+i*5,60-Math.sin(i+u*8)*3,2,dark);}
      else if(id===19||id===340){for(let i=0;i<3;i++)line([[sx-10+i*10,55],[sx-10+i*10,35-15*u]],light,1);}
      else for(let i=0;i<9;i++){const a=i*2.4,r=26*(1-(u*1.5+i*.1)%1);star(sx+Math.cos(a)*r,sy+Math.sin(a)*r,2);}
      ring(sx,sy,9+3*pulse(u*2),dark,1);ctx.restore();return;
    }
    switch(p.family){
      case 'ram':
        if(u<.6)for(let i=0;i<3;i++)line([[sx-6+78*t,sy-9+i*9],[sx+10+78*t,sy-9+i*9]],dark,1);
        if(hit){burst(tx,ty,p.heavy?21:14);ring(tx,ty,5+12*clamp((u-.5)/.35),dark,1);}
        break;
      case 'punch':case 'kick':
        for(let i=0;i<frame.hits;i++){
          const q=clamp((u-.36-i*.06)/.3);if(!q||q>=1)continue;
          const x=tx-9+i%2*10,y=ty-5+(i%3)*5;
          if(p.family==='kick')poly([[x-8,y-12],[x-1,y-12],[x+2,y+1],[x+12,y+4],[x+12,y+9],[x-3,y+9],[x-6,y]],dark);
          else{poly([[x-9,y-4],[x-6,y-10],[x-1,y-9],[x+2,y-11],[x+6,y-8],[x+10,y-6],[x+10,y+4],[x+3,y+8],[x-7,y+5]],dark);line([[x-4,y-6],[x-4,y],[x+6,y]],light,2);}
          if(q>.4&&hit)burst(x,y,p.heavy?18:11,light);
        }
        break;
      case 'slash':{
        const count=id===238?2:id===15||id===206||id===348?1:3;
        for(let i=0;i<count;i++){const q=clamp((u-.30-i*.065)/.25);if(!q)continue;const x=tx-15+i*9,dir=id===238&&i===1?-1:1;line([[x-8*dir,ty-19],[x+18*q*dir,ty-19+37*q]],dark,4);line([[x-8*dir,ty-19],[x+18*q*dir,ty-19+37*q]],light,2);}
        break;}
      case 'bite':case 'clamp':{
        const gap=14*(1-pulse((u-.2)/.7));
        for(const sign of [-1,1]){poly([[tx-18,ty+sign*(7+gap)],[tx-14,ty+sign*(2+gap)],[tx-7,ty+sign*(7+gap)],[tx,ty+sign*(1+gap)],[tx+7,ty+sign*(7+gap)],[tx+14,ty+sign*(2+gap)],[tx+18,ty+sign*(10+gap)],[tx-18,ty+sign*(10+gap)]],light);}
        if(hit)star(tx,ty,id===242?12:7);break;}
      case 'horn':{
        const [x,y]=projectile(0,1);poly([[x-19,y-5],[x+11,y],[x-19,y+5]],dark);line([[x-16,y-2],[x+9,y]],light,2);if(hit)burst(tx,ty,12);break;}
      case 'tail':line([[sx+55*t,sy-4],[sx+75*t,sy+10],[sx+100*t,sy-6]],dark,7);line([[sx+55*t,sy-4],[sx+75*t,sy+10],[sx+100*t,sy-6]],light,3);break;
      case 'whip':{
        const end=mix(sx+8,tx,t);for(let j=0;j<(id===338?4:2);j++){const points=Array.from({length:20},(_,i)=>{const q=i/19;return [mix(sx+8,end,q),sy+Math.sin(q*Math.PI)*Math.sin(u*12+j*2)*(j%2?17:-17)];});line(points,dark,3);line(points,light,1);}if(hit)star(tx,ty,8);break;}
      case 'coil':case 'thread':
        if(p.family==='thread'&&u<.62)line([[sx,sy],[mix(sx,tx,t),sy+Math.sin(t*12)*4]],light,1);
        if(u>.35){for(let i=0;i<4;i++)ring(tx,ty,8+i*4,light,1);if(id===169)for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[tx,ty],[tx+Math.cos(a)*23,ty+Math.sin(a)*23]],light,1);}else for(let i=0;i<3;i++)line([[tx-19,ty-14+i*12],[tx+19,ty-9+i*12]],dark,2);}
        break;
      case 'needle':
        for(let i=0;i<(p.repeat?frame.hits:1);i++){const [x,y,q]=projectile(i,3);if(q>=1&&u>.83)continue;if(id===331)leaf(x,y,0);else if(id===333)crystal(x,y,6);else poly([[x-10,y-2],[x+7,y],[x-10,y+2]],light);}break;
      case 'toss':
        for(let i=0;i<(p.repeat?frame.hits:[157,317].includes(id)?4:1);i++){
          const [x,y]=projectile(i,3,24);ctx.save();ctx.translate(x,y);ctx.rotate(u*6+i);
          if([125,155,198].includes(id)){line([[-8,0],[8,0]],light,4);for(const a of [-8,8]){dot(a,-2,3);dot(a,2,3);}}
          else if(id===6){ring(0,0,5,'#edce69',2);line([[0,-3],[0,3]],'#fff2b2',1);}
          else if(id===121){ring(0,0,6,light,3);dot(1,1,2,dark);}
          else if(id===217){dot(0,0,7,'#c7dd9b');line([[-6,0],[6,0]],'#efb1ab',2);line([[0,-6],[0,6]],'#efb1ab',2);}
          else{poly([[-7,-3],[-3,-7],[5,-5],[8,3],[2,7],[-6,4]],dark);line([[-5,-3],[-2,-5],[4,-3]],light,2);}ctx.restore();
        }break;
      case 'star':for(let i=0;i<4;i++){const [x,y]=projectile(i,4,11);star(x,y,6);}break;
      case 'sound':
        for(let i=0;i<4;i++){const q=(u*1.25+i*.21)%1,x=mix(sx+12,self?sx+22:tx,q),r=4+q*(p.sharp?22:14);ctx.globalAlpha=alpha*(1-q*.6);if(p.notes)notes(x,sy+Math.sin(i*3+u*5)*12);else line([[x-r*.35,sy-r],[x+r*.2,sy-r*.6],[x+r*.45,sy],[x+r*.2,sy+r*.6],[x-r*.35,sy+r]],light,p.sharp?2:1);}
        if(id===215){ring(sx,sy,12+u*12,'#c3ec86',1);}break;
      case 'wag':for(let i=0;i<2;i++)line([[sx-18+i*36,sy-10],[sx-25+i*50,sy],[sx-18+i*36,sy+10]],light,2);break;
      case 'eyes':
        if([170,193,199,316].includes(id)){ring(tx,ty,14-4*t,light,1);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([[tx+Math.cos(a)*8,ty+Math.sin(a)*8],[tx+Math.cos(a)*18,ty+Math.sin(a)*18]],light,1);}}
        else{line([[sx-12,sy-7],[sx-3,sy-4],[sx+3,sy-4],[sx+12,sy-7]],dark,3);star(sx-7,sy-5,4);star(sx+7,sy-5,4);if(t>.25)line([[sx+12,sy-5],[mix(sx+12,tx,t),ty]],light,1);}
        break;
      case 'sand':case 'powder':
        for(let i=0;i<20;i++){const q=clamp(t*1.35-(i%5)*.08),x=mix(sx+10,tx+(i%5-2)*5,q),y=sy+(Math.sin(i*8)*20)*q-(p.family==='powder'?Math.sin(q*Math.PI)*16:0);dot(x,y,i%3?1:2,i%2?light:dark);}break;
      case 'sludge':case 'poison':
        for(let i=0;i<(id===188?1:4);i++){const [x,y]=projectile(i,4,12);dot(x,y,id===188?9:4,dark);dot(x-1,y-2,2,light);}
        if(hit)for(let i=0;i<8;i++)dot(tx+Math.sin(i*3)*17,ty+Math.cos(i*2)*12+(u-.6)*18,2,dark);break;
      case 'embers':
        for(let i=0;i<p.count;i++){const [x,y]=projectile(i,p.count,id===261?15:6);flame(x,y,id===261?5:6);}break;
      case 'flame':
        for(let i=0;i<12;i++){const q=i/11;if(q>t)continue;flame(mix(sx+12,tx,q),sy+Math.sin(i*2+u*20)*(p.width||7)*.35,3+q*(p.width||7));}break;
      case 'fireblast':
        if(id===126&&t>.35){const r=22*pulse((u-.2)/.8);line([[tx,ty-r],[tx-3,ty+2],[tx-r,ty+r],[tx-3,ty+2],[tx+r,ty+r]],dark,6);line([[tx-r,ty-r*.4],[tx+r,ty-r*.4]],dark,6);line([[tx,ty-r],[tx-3,ty+2],[tx-r,ty+r]],light,2);line([[tx-r,ty-r*.4],[tx+r,ty-r*.4]],light,2);}
        else for(let i=0;i<8;i++){const a=i*Math.PI/4;flame(tx+Math.cos(a)*19*t,ty+Math.sin(a)*16*t,9);}break;
      case 'waterjet':{
        const end=mix(sx+12,tx,t),w=(p.width||4)*(1+.12*Math.sin(u*35));
        line([[sx+12,sy],[end,ty]],dark,w+2);line([[sx+12,sy-1],[end,ty-1]],light,Math.max(1,w*.45));
        if(hit)for(let i=0;i<8;i++)line([[tx,ty],[tx+Math.cos(i*2)*20,ty+Math.sin(i*2)*20]],light,2);break;}
      case 'wave':{
        const x=mix(sx,tx,t);poly([[x-30,61],[x-25,45],[x-17,34],[x-8,32],[x,38],[x-9,42],[x+2,50],[x+10,61]],dark);line([[x-26,45],[x-17,34],[x-8,32],[x,38]],light,3);line([[x-30,60],[x+15,60]],light,2);break;}
      case 'beam':{
        const end=mix(sx+10,tx,t),w=(p.width||5)*pulse((u-.13)/.82);
        ring(sx+8,sy,5+3*pulse(u*3),light,2);line([[sx+10,sy],[end,ty]],dark,w+3);line([[sx+10,sy],[end,ty]],light,w);
        if(id===60||id===62||id===324)for(let i=0;i<5;i++)ring(mix(sx+10,end,i/4),sy,5, i%2?'#b4f1fa':'#f9b4dd',1);
        if(id===58&&hit)for(let i=0;i<5;i++)crystal(tx+Math.sin(i*3)*16,ty+Math.cos(i*3)*15,6);
        else if(hit)burst(tx,ty,id===63?24:14);break;}
      case 'snow':
        for(let i=0;i<16;i++){const q=(u*1.5+i*.13)%1,x=mix(sx,tx+20,q),y=19+(i*17)%42;star(x,y,id===329?5:3,light);}if(id===329&&hit)for(let i=0;i<4;i++)crystal(tx-12+i*8,ty+7,16);break;
      case 'bubbles':
        if(id===352){for(let i=0;i<3;i++)ring(mix(sx,tx,t),sy,7+i*5,light,1);}
        else for(let i=0;i<(p.count||6);i++){const [x,y]=projectile(i,p.count||6,10);ring(x,y,id===281?11:3+i%3,dark,1);dot(x-1,y-2,1,light);if(hit&&i%2)burst(tx+(i-2)*3,ty,4);}
        break;
      case 'drain':
        for(let i=0;i<8;i++){const q=clamp((u-.22)*1.7-i*.065);if(!q)continue;const x=mix(tx,sx,q),y=sy+Math.sin(q*Math.PI*2+i)*11;star(x,y,p.heavy?4:3);}
        if(hit)ring(sx,sy,13+6*pulse(u*2),light,1);break;
      case 'seed':
        if(id===73&&u<.6){const [x,y]=projectile(0,1,24);dot(x,y,3,dark);}
        else{for(let i=0;i<3;i++){const x=(id===275?sx:tx)-12+i*12;line([[x,61],[x,50]],dark,2);leaf(x-3,52,-.7);leaf(x+3,48,.7);}}break;
      case 'leaves':
        for(let i=0;i<6;i++){const [x,y]=projectile(i,6,10);leaf(x,y+Math.sin(i*3+u*7)*8,u*7+i,id===80?'#edb1cd':id===318?'#dee5e8':light);}break;
      case 'vortex':
        for(let i=0;i<5;i++){const y=ty-22+i*10,r=17-i*2,points=Array.from({length:15},(_,j)=>{const a=j/14*Math.PI*2+u*12;return [tx+Math.cos(a)*r,y+Math.sin(a)*3];});line(points,i%2?light:dark,2);}break;
      case 'electric':
        if(id===87){line([[tx-5,8],[tx+5,22],[tx-6,30],[tx+5,42],[tx-3,59]],dark,6);line([[tx-5,8],[tx+5,22],[tx-6,30],[tx+5,42],[tx-3,59]],light,2);}
        else if(id===192){const [x,y]=projectile(0,1);ring(x,y,12,light,3);sparks(x,y,16,light);}
        else if(id===86){for(let i=0;i<3;i++)ring(mix(sx,tx,clamp(t*1.3-i*.13)),sy,8+i*3,light,1);}
        else{const center=id===268?sx:tx;for(let j=0;j<(id===85?4:2);j++){const a=j*Math.PI/2+u*3;line(Array.from({length:7},(_,i)=>{const r=7+i*3;return [center+Math.cos(a+i%2*.25)*r,sy+Math.sin(a+i%2*.25)*r];}),j%2?dark:light,2);}if(id===84)line([[sx+12,sy],[sx+40,sy-5],[sx+56,sy+6],[mix(sx+56,tx,t),sy]],light,1);}
        break;
      case 'quake':
        for(let i=0;i<4;i++){const x=55+i*29;crack(x,61+Math.sin(u*22+i)*2);if(id===90)line([[x,58],[x+5,66]],dark,3);dot(x,59-Math.abs(Math.sin(u*15+i))*9,2,dark);}break;
      case 'burrow':ring(tx,61,17,dark,3);for(let i=0;i<8;i++)dot(tx+Math.sin(i*4)*22,60-Math.abs(Math.sin(u*9+i))*17,2,light);break;
      case 'mind':
        for(let i=0;i<3;i++){const q=(u+i*.22)%1;ring(id===95?mix(sx,tx,t):tx,ty,6+q*(p.heavy?24:17),i%2?dark:light,1);}
        if(id===109){const [x,y]=projectile(0,1,12);star(x,y,8);}
        if(id===248)star(tx,ty-14,10);break;
      case 'dash':for(let i=0;i<5;i++)line([[sx-14+i*8+68*t,sy-14+i*7],[sx+10+i*8+68*t,sy-14+i*7]],i%2?light:dark,1);if(!self&&hit)burst(tx,ty,14);break;
      case 'vanish':for(let i=0;i<5;i++)ring(sx,sy,4+i*5, i%2?light:dark,1);sparks(sx,sy,27);break;
      case 'ghost':
        for(let i=0;i<3;i++){const x=tx-16+i*16,y=ty+Math.sin(u*7+i)*10;poly([[x-6,y+7],[x-6,y-4],[x-2,y-8],[x+3,y-8],[x+7,y-3],[x+7,y+7],[x+3,y+3],[x,y+7],[x-3,y+3]],dark);dot(x-2,y-2,1,light);dot(x+3,y-2,1,light);}break;
      case 'copy':for(let i=0;i<3;i++){const q=(u+i/3)%1;star(mix(sx,tx,q),sy-17*Math.sin(q*Math.PI),4);ring(sx,sy,11+q*8,dark,1);}break;
      case 'heal':
        for(let i=0;i<5;i++){const x=sx-20+i*10,y=57-((u*35+i*9)%37);line([[x-3,y],[x+3,y]],light,2);line([[x,y-3],[x,y+3]],light,2);}
        if(id===156){line([[sx+12,sy-15],[sx+19,sy-15],[sx+12,sy-8],[sx+19,sy-8]],'#cdd7ec',1);}
        else if([234,235,236].includes(id)){ring(sx,18,7,id===236?'#ccd4fa':'#fff2a0',2);if(id!==236)burst(sx,18,12,'#fff2a0');}
        break;
      case 'armor':{
        const r=id===110||id===111?19:24;line([[sx-r,sy-12],[sx-12,sy-22],[sx+12,sy-22],[sx+r,sy-12],[sx+r,sy+13],[sx+12,sy+21],[sx-12,sy+21],[sx-r,sy+13],[sx-r,sy-12]],dark,2);star(sx-15+30*u,sy-17+34*u,6);break;}
      case 'smoke':
        for(let i=0;i<8;i++){const x=id===54||id===114?58+i*12:mix(sx,tx,t)+Math.sin(i*4)*14,y=sy+Math.cos(i*3)*14;ctx.globalAlpha=alpha*.5;dot(x,y,6+i%4,id===54?'#d9e8e6':dark);}break;
      case 'shield':{
        const x=self?sx:tx;poly([[x-19,sy-23],[x+19,sy-23],[x+19,sy+6],[x,sy+23],[x-19,sy+6]],dark);ctx.globalAlpha=alpha*.6;line([[x-16,sy-20],[x+16,sy-20],[x+16,sy+5],[x,sy+19],[x-16,sy+5],[x-16,sy-20]],light,2);line([[x-10,sy+8],[x+9,sy-12]],light,1);break;}
      case 'aura':
        for(let i=0;i<7;i++){const x=sx+Math.sin(i*4)*23,y=59-((u*45+i*10)%42);if(id===14){line([[x,y+8],[x,y-5]],light,2);line([[x-3,y+3],[x+3,y+3]],dark,2);}else star(x,y,3);}
        ring(sx,sy,20+3*pulse(u*2),dark,1);break;
      case 'blast':for(let i=0;i<8;i++){const a=i*Math.PI/4;flame(sx+Math.cos(a)*28*t,sy+Math.sin(a)*23*t,12);}ring(sx,sy,8+40*t,light,2);break;
      case 'lick':line([[sx+50*t,sy],[mix(sx+50,tx,t),sy+8]],dark,9);line([[sx+50*t,sy],[mix(sx+50,tx,t),sy+8]],light,5);break;
      case 'heart':for(let i=0;i<3;i++){const [x,y]=projectile(i,3,10);heart(x,y);}break;
      case 'hop':for(let i=0;i<3;i++)line([[sx-17+i*17,63],[sx-20+i*20,58]],light,1);break;
      case 'hammer':line([[tx-12,ty+12],[tx+8,ty-10]],dark,5);poly([[tx-4,ty-20],[tx+18,ty-20],[tx+22,ty-6],[tx,ty-2]],light);break;
      case 'tri':for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const [x,y]=projectile(0,1);ring(x+Math.cos(a)*12,y+Math.sin(a)*12,5,['#e6b763','#99d8f1','#f09a86'][i],2);}break;
      case 'doll':poly([[sx-13,60],[sx-14,43],[sx-9,39],[sx-11,31],[sx-2,37],[sx+7,33],[sx+13,43],[sx+11,60]],dark);dot(sx+6,43,1,light);ring(sx,48,20,light,1);break;
      case 'roll':{const x=mix(sx,tx,pulse((u-.2)/.64));ring(x,sy,19,light,2);for(let i=0;i<3;i++){const a=u*12+i*2;line([[x+Math.cos(a)*8,sy+Math.sin(a)*8],[x+Math.cos(a)*16,sy+Math.sin(a)*16]],dark,2);}break;}
      case 'spikes':for(let i=0;i<5;i++){const x=tx-23+i*11;poly([[x-4,63],[x,55],[x+4,63]],light);}break;
      case 'weather':
        if(id===241){ring(93,20,9,'#ffe5a1',2);burst(93,20,16,'#e9c67b');}
        else for(let i=0;i<20;i++){const x=37+(i*23)%126,y=20+(u*42+i*17)%43;if(id===240)line([[x+3,y-5],[x,y]],'#90cce6',1);else dot(x,y,1,'#cbb084');}break;
      case 'orb':{const [x,y]=projectile(0,1,7),r=id===247?11:8;ring(x,y,r,dark,4);dot(x,y,r-3,light);sparks(x,y,r+5,dark,5);break;}
      case 'taunt':line([[tx-8,ty-20],[tx-8,ty-11],[tx+1,ty-11]],light,2);line([[tx+9,ty-20],[tx+9,ty-11],[tx,ty-11]],light,2);if(id===313){for(let i=0;i<4;i++)dot(tx-9+i*6,ty+u*15,2,'#abdff0');}break;
      case 'wind':
        for(let i=0;i<5;i++){const x=mix(sx,tx,clamp(t*1.3-i*.08)),y=sy-17+i*8;line([[x-16,y],[x-5,y-3],[x+10,y]],i%2?dark:light,2);}break;
      case 'dance':for(let i=0;i<4;i++)notes(sx-24+i*16,sy-18+Math.sin(u*10+i)*8);break;
    }
    ctx.globalAlpha=alpha;
    // Only real damaging hits flash the defender; miss, immunity and protection stay distinct.
    if(frame.impact)star(tx,ty,5+3*pulse((u-.58)/.3),'#fff7df');
    if(frame.outcome==='miss'&&u>.57){line([[tx+15,ty-8],[tx+24,ty-14]],'#d3dec6',1);line([[tx+18,ty+1],[tx+28,ty-1]],'#d3dec6',1);}
    if(['immune','protected','failed'].includes(frame.outcome)&&u>.55){ring(tx,ty,19,'#b4c4bd',1);line([[tx-11,ty+12],[tx+11,ty-12]],'#b4c4bd',2);}
    ctx.restore();
  }
  return {profiles,profileFor,frameFor,drawFrame};
});
