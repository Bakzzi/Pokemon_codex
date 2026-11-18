'use strict';
// Render original sprite-sheet frames. The downloaded sources stay unchanged.
globalThis.NpcPortraits=(()=>{
 const frames={
  bill:{file:'bill.png',frame:[0,0,64,64],background:[0,0]},
  'mr-fuji':{file:'mr-fuji.png',frame:[0,0,64,64],background:[0,0]},
  'j-elm':{file:'j-elm.png',frame:[0,0,80,80]},
  'fishing-guru':{file:'fishing-guru.png',frame:[0,0,80,80]},
  'gate-guard':{file:'gate-guard.png',frame:[0,0,80,80]},
  captain:{file:'captain.png',frame:[58,1,54,56],background:[60,1]},
  'officer-jenny':{file:'officer-jenny.gif',frame:[85,172,43,64],background:[0,0]},
  melanie:{file:'melanie.png',frame:[16,15,68,58],background:[1,1]}
 };
 const cache=new Map();
 const normalize=id=>String(id||'').replace(/^overworld:/,'').replace(/^.*\//,'').replace(/\.(png|gif)$/,'');
 function load(id){
  if(cache.has(id))return cache.get(id);
  const entry=frames[id],promise=new Promise((resolve,reject)=>{
   const sheet=new Image();sheet.onload=()=>{try{
    const [x,y,w,h]=entry.frame,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,x,y,w,h,0,0,w,h);
    const pixels=ctx.getImageData(0,0,w,h),rgba=pixels.data;
    if(entry.background){
     const sample=document.createElement('canvas');sample.width=sample.height=1;const s=sample.getContext('2d');s.drawImage(sheet,...entry.background,1,1,0,0,1,1);const bg=s.getImageData(0,0,1,1).data;
     // Flood only background connected to the frame border, preserving white
     // clothes and any identical palette colour enclosed by the sprite outline.
     const seen=new Uint8Array(w*h),queue=[];
     const add=(px,py)=>{const i=py*w+px,k=i*4;if(seen[i]||!rgba[k+3]||rgba[k]!==bg[0]||rgba[k+1]!==bg[1]||rgba[k+2]!==bg[2])return;seen[i]=1;queue.push(i);};
     for(let px=0;px<w;px++){add(px,0);add(px,h-1);}for(let py=0;py<h;py++){add(0,py);add(w-1,py);}
     for(let at=0;at<queue.length;at++){const i=queue[at],px=i%w,py=Math.floor(i/w);rgba[i*4+3]=0;if(px)add(px-1,py);if(px+1<w)add(px+1,py);if(py)add(px,py-1);if(py+1<h)add(px,py+1);}
    }
    let left=w,top=h,right=-1,bottom=-1;for(let py=0;py<h;py++)for(let px=0;px<w;px++)if(rgba[(py*w+px)*4+3]){left=Math.min(left,px);top=Math.min(top,py);right=Math.max(right,px);bottom=Math.max(bottom,py);}
    if(right<left)throw Error('Empty NPC frame: '+id);
    ctx.putImageData(pixels,0,0);const out=document.createElement('canvas');out.width=right-left+3;out.height=bottom-top+3;out.getContext('2d').drawImage(canvas,left,top,right-left+1,bottom-top+1,1,1,right-left+1,bottom-top+1);resolve(out.toDataURL());
   }catch(e){reject(e);}};sheet.onerror=()=>reject(Error('Missing NPC portrait: '+id));sheet.src='assets/trainers/npc/'+entry.file;
  });cache.set(id,promise);return promise;
 }
 function set(image,id,fallback){
  id=normalize(id);if(!frames[id]){delete image.dataset.npcPortrait;delete image.dataset.npcState;if(fallback&&image.getAttribute('src')!==fallback)image.src=fallback;return false;}
  if(image.dataset.npcPortrait===id&&(image.getAttribute('src')||image.dataset.npcState==='loading'))return true;
  image.dataset.npcPortrait=id;image.dataset.npcState='loading';image.removeAttribute('src');
  load(id).then(src=>{if(image.dataset.npcPortrait!==id)return;image.src=src;image.dataset.npcState='ready';}).catch(()=>{if(image.dataset.npcPortrait===id)image.dataset.npcState='error';});return true;
 }
 return {frames,has:id=>!!frames[normalize(id)],set,load};
})();
if(typeof module!=='undefined')module.exports=globalThis.NpcPortraits;
