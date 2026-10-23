'use strict';
globalThis.ChallengeUI=(()=>{
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function badgeImage(source,cls='',alt=''){
  const id=source.split('/').at(-1).replace(/\.png$/,''),image=el('img',cls+' badge-illustration');
  image.src='assets/badges/'+id+'.png';image.alt=alt;image.draggable=false;return image;
 }
 function section(id,heading,contents=[]){const d=el('details','story-board challenge-card mobile-challenge-card'),s=el('summary');d.id=id;s.append(...(Array.isArray(heading)?heading:[heading]));d.append(s,...contents);return d;}
 function eventStep({id,number,name,sprite,revealed=true,team,reward,action}){
  const row=el('article','rival-entry'),heading=el('div','rival-heading');row.dataset.storyStep=id;heading.append(el('h3','',(number?number+'. ':'')+name));
  if(sprite){const image=el('img',revealed?'':'unknown-rival');image.src=sprite.startsWith('pokemon:')?'assets/'+sprite.slice(8)+'.gif':sprite.startsWith('item:')?'assets/items/'+sprite.slice(5)+'.png':'assets/trainers/battle/'+sprite+'.png';image.alt=revealed?name:'아직 만나지 않은 상대';heading.append(image);}row.append(heading);if(team)row.append(team);
  if(reward){const items=el('div','story-step-reward');items.dataset.reward=reward.selected||'choice';items.append(el('p','muted',reward.label));for(const item of reward.items){const box=el('div'),image=el('img');image.src='assets/items/'+item.sprite+'.png';image.alt=item.name;box.append(image,el('span','',item.name));items.append(box);}row.append(items);}
  if(action){const button=el('button','',action.label);if(action.challenge)button.dataset.challenge=action.challenge;button.disabled=!!action.disabled;button.onclick=action.run;row.append(button);}return row;
 }
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
 return {section,eventStep,trainerBody,trainerCard,badgeSlots,badgeHolder,badgeImage};
})();
