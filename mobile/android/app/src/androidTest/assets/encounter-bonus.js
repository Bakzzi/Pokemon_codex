'use strict';
(()=>{
  try{
    const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);},now=Date.now();
    function fixture(missing,champion,level=100){
      const g=new MobileCore.Adventure({},now);g.data.champion=champion;g.data.caught={};
      for(let id=1;id<=151;id++)if(!missing.includes(id))g.data.caught[id]=now;
      const member=g.data.owned[g.data.activeId];member.level=level;member.xp=1000000;return g;
    }
    const chances=g=>new Map(g.panelState(now).collection.map(p=>[p.id,p.acquisition.routes.find(r=>r.kind==='wild')?.chance||0]));
    const missing=[19,147,144,146,151],before=chances(fixture(missing,false)),boost=chances(fixture(missing,true));
    check([...before].every(([id,p])=>missing.includes(id)||boost.get(id)<=p+1e-12),'registered species never gain the champion or party-level bonus');
    check(missing.every(id=>boost.get(id)>before.get(id)),'all missing rarity classes receive the bonus');
    check(boost.get(19)>boost.get(144)&&boost.get(147)>boost.get(144)&&boost.get(144)>boost.get(151),'missing ordinary and rare species remain more common than missing legends and myths');
    const complete=chances(fixture([],false)),boostedComplete=chances(fixture([],true));
    check([...complete].every(([id,p])=>Math.abs(p-boostedComplete.get(id))<1e-12),'a fully registered collection receives no generic encounter boost');
    const g=fixture([144,146,151],true),old=chances(g),ordinary=[...old].filter(([id,p])=>p>0&&id!==151&&![144,145,146,150].includes(id));
    const average=ordinary.reduce((n,[,p])=>n+p,0)/ordinary.length,common=old.get(19);
    check(old.get(144)>=average*.5&&old.get(144)<common,'missing legends stay comparable to registered ordinary species without becoming more common');
    g.data.caught[144]=now;const after=chances(g);
    check(after.get(144)<old.get(144),'first registration removes that species bonus immediately');
    globalThis.layoutResult={ok:true,checks};
  }catch(e){globalThis.layoutError=e.stack||String(e);}
})();
