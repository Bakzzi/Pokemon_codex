'use strict';
// The UI renders saved pages; a click only requests advancement of that exact page.
globalThis.StoryPresentation={create({document:doc=document,advance}){
  const $=id=>doc.getElementById(id);let key='',timer=0,current=null;
  function render(state){
    current=state;const scene=state.scene,root=$('story-scene'),button=$('story-next');root.hidden=!scene;
    if(!scene){clearInterval(timer);timer=0;key='';return;}
    const page=scene.id+':'+(scene.index||0),sendout=scene.mode==='sendout';
    root.dataset.mode=scene.mode;root.dataset.kind=scene.kind;root.dataset.gift=String(scene.kind==='oak'&&scene.next==='rival'&&scene.index>=2);
    if(root.dataset.gift==='true')$('story-hero').src='assets/'+state.hero.id+'.gif';
    $('story-name').textContent=scene.name;
    $('story-portrait').src=scene.sprite.startsWith('pokemon:')?'assets/'+scene.sprite.slice(8)+'.gif':scene.sprite.startsWith('item:')?'assets/items/'+scene.sprite.slice(5)+'.png':'assets/trainers/battle/'+scene.sprite+'.png';
    root.dataset.revealed=String(scene.kind!=='ghost'||scene.index>0||scene.next==='win'||scene.next==='loss');$('story-portrait').alt=scene.name;
    button.disabled=sendout;$('story-hint').textContent=sendout?'':'눌러서 계속 ▼';
    if(!sendout)$('story-text').textContent=scene.pages[scene.index];
    button.onclick=()=>advance(page);if(key===page)return;key=page;clearInterval(timer);timer=0;
    if(sendout){
      $('story-hero').src='assets/'+state.hero.id+'.gif';$('story-foe').src='assets/'+state.foe.id+'.gif';
      const draw=()=>{if(current.scene?.id!==scene.id){clearInterval(timer);timer=0;return;}
        const elapsed=Math.max(0,Date.now()-scene.at);for(const animation of root.getAnimations({subtree:true}))animation.currentTime=elapsed;
        $('story-text').textContent=elapsed<1350?(scene.kind==='ghost-sendout'?'텅구리의 유령이 길을 막았다!':scene.name+'의 '+current.foe.name+'!'):current.hero.name+', 너로 정했다!';
      };draw();timer=setInterval(draw,120);
    }
  }
  return {render};
}};
