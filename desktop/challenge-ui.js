'use strict';
globalThis.ChallengeUI=(()=>{
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const badgeSheets=new Map(),kanto=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'],johto=['j-falkner','j-bugsy','j-whitney','j-morty','j-jasmine','j-chuck','j-pryce','j-clair'];
 function badgeImage(source,cls='',alt=''){
  const id=source.split('/').at(-1).replace(/\.png$/,''),j=johto.indexOf(id),index=j<0?kanto.indexOf(id):j,sheet=j<0?'kanto-pixel':'johto-pixel';
  const canvas=el('canvas',cls+' pixel-badge');canvas.width=16;canvas.height=16;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',alt);canvas.dataset.badgeSprite=id;
  if(index<0)return canvas;
  if(!badgeSheets.has(sheet))badgeSheets.set(sheet,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Badge sheet missing: '+sheet));image.src='assets/badges/'+sheet+'.png';}));
  badgeSheets.get(sheet).then(image=>{const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,1,1,0,0,1,1);const key=[...ctx.getImageData(0,0,1,1).data.slice(0,3)];ctx.clearRect(0,0,16,16);ctx.drawImage(image,j<0?index*16:0,j<0?0:index*16,16,16,0,0,16,16);const data=ctx.getImageData(0,0,16,16);for(let i=0;i<data.data.length;i+=4)if(key.every((v,k)=>data.data[i+k]===v))data.data[i+3]=0;ctx.putImageData(data,0,0);canvas.dataset.ready='true';}).catch(console.error);return canvas;
 }
 function section(id,heading,contents=[]){const d=el('details','story-board challenge-card mobile-challenge-card'),s=el('summary');d.id=id;s.append(...(Array.isArray(heading)?heading:[heading]));d.append(s,...contents);return d;}
 function trainerBody({id,heading,team,portrait,unknown=false,league=false}){
  const body=el('div','gym-body'),info=el('div','gym-info'),face=el('div','gym-portrait'+(league?' league-portrait':''));face.dataset.trainer=id;
  if(unknown||!portrait){face.classList.add('unknown');face.textContent='?';face.setAttribute('aria-label','아직 만나지 않은 상대');}
  else{const image=el('img','gym-trainer'),[width,x,y,size]=portrait.crop;image.src=portrait.src;image.alt=portrait.name+' · 도트';image.draggable=false;image.style.width=width/size*100+'%';image.style.left=-x/size*100+'%';image.style.top=-y/size*100+'%';face.append(image);}
  info.append(...(Array.isArray(heading)?heading:[heading]));if(team)info.append(team);body.append(info,face);return body;
 }
 function trainerCard({id,title,badge,team,portrait,unknown=false,done=false,league=false}){
  const card=el('article',league?'league-member':'gym'+(done?' done':'')),heading=league?el('h3','',title):el('div','gym-title');
  if(!league){heading.append(el('h3','',title));if(badge){const label=el('span','badge'),image=badgeImage(badge.src,'badge-image gym-badge',badge.name);label.append(image,document.createTextNode(badge.name));heading.append(label);}}
  card.append(trainerBody({id,heading,team,portrait,unknown,league}));return card;
 }
 function badgeSlots(rows,earned,previous,onPick){
  const fragment=document.createDocumentFragment();for(const row of rows){const done=earned.has(row.id),fresh=done&&previous&&!previous.has(row.id),slot=el('button','badge-slot'+(done?' earned':' empty')+(fresh?' just-earned':'')),recess=el('span','badge-recess');slot.dataset.badge=row.id;
   slot.setAttribute('aria-label',row.badge+' · '+row.name+' · '+(done?'획득 완료':'미획득'));slot.title=slot.getAttribute('aria-label');
   for(const cls of ['badge-edge','badge-shadow',...(done?['badge-art']:[])])recess.append(badgeImage(row.src,cls,row.badge));if(done)recess.append(el('i','badge-glint'));
   const label=el('span','badge-label');label.append(el('b','',row.badge),el('small','',done?'획득 완료':row.name+' · 미획득'));slot.append(recess,label);slot.onclick=()=>onPick(row);fragment.append(slot);
  }return fragment;
 }
 function badgeHolder({id,rows,earned,region,onPick}){
  const holder=document.querySelector('#world-badge-host .badge-case,#kanto-gyms .badge-case').cloneNode(true);for(const n of holder.querySelectorAll('[id]'))n.removeAttribute('id');holder.setAttribute('aria-label',region+' 뱃지 홀더');holder.querySelector('.case-heading b').textContent=region;
  const slots=holder.querySelector('.badge-slots');slots.id=id;slots.replaceChildren(badgeSlots(rows,new Set(earned),null,onPick));holder.querySelector('.case-bottom span').textContent=earned.length===8?'여덟 번의 도전, 여덟 개의 증표':earned.length+'개의 증표 · 다음 도전을 기다리는 자리';return holder;
 }
 return {section,trainerBody,trainerCard,badgeSlots,badgeHolder,badgeImage};
})();
