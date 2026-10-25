'use strict';
// Destinations explicitly introduced by confirmed story dialogue/results.
// A known errand is independent of arrival, passage and challenge availability.
// Read real completion records: neither badges nor visits invent event wins.
function kanto(game){
 const K=require('./kanto-journey.cjs'),out=new Set();
 if(!K.modern(game)||game.data.johtoUnlocked)return out;
 const d=game.data,s=d.kantoStory,m=d.mobileStory;
 const done=id=>K.done(game,id),badge=id=>d.badges.includes(id),visited=id=>!!d.kantoWorld?.visited[id];
 const won=id=>game.rivalProgress(id)?.state==='won';
 const add=(introduced,place,resolved)=>{if(introduced&&!resolved)out.add(place);};
 const group=id=>K.trainersDone(game,id);
 add(group('forest-path'),'pewter',badge('brock'));
 add(badge('brock')||group('route3-path'),'mt-moon',done('k-moon-duo'));
 add(badge('brock')||done('k-moon-duo'),'cerulean',badge('misty'));
 add(badge('misty'),'route-24',done('k-bridge-rocket'));
 add(won('rival-cerulean')||done('k-bridge-rocket'),'sea-cottage',done('k-bill'));
 add(done('k-bill'),'ss-anne',done('k-captain'));
 add(done('k-robber')||done('k-captain')||won('rival-surge'),'vermilion',badge('surge'));
 add(badge('surge')||group('route11-path'),'diglett',visited('diglett'));
 add(badge('surge')&&visited('diglett'),'route-2',done('k-aide'));
 add(done('k-aide')||group('route9-path'),'rock-tunnel',group('tunnel-path'));
 add(group('tunnel-path'),'lavender',done('k-tower-visit')||m.scopeObtainedAt||m.rescue.completedAt);
 add(done('k-tower-visit')||badge('erika'),'celadon',m.scopeObtainedAt);
 add(m.scopeObtainedAt||won('rival-middle'),'tower',m.rescue.completedAt);
 for(const road of ['route-12','route-16'])add(m.rescue.completedAt,road,s.roads[road]);
 add(s.drinkAt||won('rival-silph'),'saffron',m.silph.completedAt);
 add(m.silph.completedAt,'saffron',badge('sabrina'));
 add(badge('sabrina'),'fuchsia',badge('koga'));
 add(badge('koga'),'safari',m.safari.completedAt);
 add(m.safari.completedAt,'seafoam',done('k-seafoam-2'));
 add(done('k-seafoam-2')||m.mansion.completedAt,'cinnabar',badge('blaine'));
 add(badge('blaine'),'viridian',badge('giovanni'));
 add(badge('giovanni'),'route-22',won('rival-league'));
 add(won('rival-league')||group('victory-path'),'indigo',d.champion);
 return out;
}

// Source node -> errand node. Keep these beside the shared dialogue flow;
// locations come from the world definitions, never translated text matching.
const johtoLinks=[
 ['j-sprout-sage-1','j-sprout-sage-2'],['j-sprout-sage-2','j-sprout'],['j-sprout','j-falkner'],
 ['j-falkner','j-well-boss'],['j-well-grunt','j-well-boss'],['j-well-boss','j-bugsy'],
 ['j-bugsy','j-ilex'],['j-ilex','j-whitney'],['j-whitney','j-sudowoodo'],
 ['j-sudowoodo','j-burned'],['j-burned','j-morty'],['j-morty','j-kimono-4'],
 ...[0,1,2,3].map(i=>['j-kimono-'+i,'j-kimono-4']),['j-kimono-4','j-lighthouse'],
 ['j-lighthouse','j-chuck'],['j-chuck','j-medicine'],['j-medicine','j-amphy'],['j-amphy','j-jasmine'],
 ['j-jasmine','j-red-gyarados'],['j-red-gyarados','j-generator-3'],
 ['j-hq-grunt','j-generator-3'],['j-hq-executive','j-generator-3'],['j-hq-executivef','j-generator-3'],
 ['j-generator-1','j-generator-3'],['j-generator-2','j-generator-3'],['j-generator-3','j-pryce'],
 ['j-pryce','j-radio-final'],...['imposter','underground','executive','executivef'].map(id=>['j-radio-'+id,'j-radio-final']),
 ['j-radio-final','j-ice-path'],['j-ice-path','j-clair'],['j-clair','j-dragon-den'],
 ['j-dragon-den','j-victory-road'],['j-victory-road','j-league-lance'],['j-league-lance','j-ship'],
 ['j-ship','j-k-surge'],['j-k-surge','j-k-sabrina'],['j-k-sabrina','j-power-grunt'],
 ['j-power-grunt','j-power-return'],['j-power-return','j-k-misty'],['j-k-misty','j-k-erika'],
 ['j-k-erika','j-k-janine'],['j-k-janine','j-k-snorlax'],['j-k-snorlax','j-k-brock'],
 ['j-k-brock','j-k-blaine'],['j-k-blaine','j-k-blue'],['j-k-blue','j-red'],
 ['j-bell-sage-0','j-bell-sage-2'],['j-bell-sage-1','j-bell-sage-2'],['j-gs-ball','j-shrine']
];
function johto(game,locationFor){
 const J=require('./johto.cjs'),out=new Set();if(!J.active(game))return out;
 const add=(source,target)=>{if(source&&!J.done(game,target)){const place=locationFor(J.nodes.get(target)?.type==='league'?'j-league':target);if(place)out.add(place);}};
 for(const [source,target]of johtoLinks)add(J.done(game,source),target);
 for(const n of J.rivalNodes)add(game.data.johto.rivals[n.id]?.state==='won',n.target);
 return out;
}
module.exports={kanto,johto,johtoLinks};
