'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PC=require('../adventure.cjs').Adventure,Android=require('../../mobile/adventure.cjs').Adventure,K=require('../../shared/kanto-journey.cjs'),W=require('../../shared/kanto-world.cjs'),Safari=require('../../shared/safari.cjs'),nursery=require('../daycare.cjs');
const {Game}=require('../game.cjs'),{finishJourney}=require('./helpers/travel-fixture.cjs');
const now=Date.parse('2026-10-22T09:00:00Z');
function settle(g){const t=Math.max(now,g.nextTick,g.data.switchUntil||0);g.data.switchUntil=0;g.nextTick=t;return t;}
function pages(g){for(let i=0;i<30&&g.presentation()?.mode==='dialogue';i++){const s=g.presentation();if(s.awaitChoice)break;assert.ok(g.advanceScene(s.id+':'+s.index,settle(g)));}if(g.presentation()?.mode==='trainer-intro')g.sceneTick(g.presentation().at+g.presentation().duration);if(g.presentation()?.mode==='sendout')g.sceneTick(g.presentation().at+3000);}
function win(g){for(let i=0;i<40&&g.data.battle?.kind==='trainer';i++){pages(g);const b=g.data.battle;b.foe.hp=0;g.defeatOpponent(settle(g));pages(g);}settle(g);}
function start(Type=PC){const g=new Type({},now,{random:()=>.7});pages(g);assert.equal(g.data.battle.storyId,'tutorial-green');win(g);pages(g);assert.equal(g.data.mobileStory.onboarding,'done');return g;}
function guide(g){for(let i=0;i<200&&!g.data.kantoStory.mapAt;i++){pages(g);if(g.data.kantoStory.mapAt)break;g.data.workTokens=250;g.tick(settle(g));}assert.ok(g.data.kantoStory.mapAt);assert.equal(g.data.kantoWorld.location,'pallet');}
function move(g,id){assert.ok(g.requestAction('travel',id,settle(g)),'select '+id);finishJourney(g,settle(g));assert.equal(g.data.kantoWorld.location,id,'arrive '+id);}
function clear(g,id){const before=Object.keys(g.data.kantoStory.cleared).length;if(K.nodes.get(id)?.automatic){g.data.workTokens=250;assert.ok(g.startAutomaticTrainer(id,settle(g)),'auto '+id);}else assert.ok(g.challenge(id,settle(g)),'challenge '+id);pages(g);if(g.data.battle?.kind==='trainer')win(g);if(g.presentation()?.awaitChoice)assert.ok(g.chooseFossil(138,settle(g)));assert.ok(Object.keys(g.data.kantoStory.cleared).length>before||g.rivalProgress('rival-surge')?.state==='won','complete '+id);}
function clearCase(g,id){const c=K.cases.find(c=>c.id===id);for(const id of c.entries)if(!K.done(g,id)&&K.prerequisite(g,K.nodes.get(id)))clear(g,id);}
function gym(g,index){clearCase(g,'trainers-gym-'+index);assert.ok(g.challenge(index,settle(g)),'gym '+index);win(g);assert.ok(g.data.badges.includes(K.badges[index]));}

test('all 224 original maps are inventoried, including zero-trainer maps, with pinned source hashes',()=>{
 const root=path.resolve(__dirname,'../..'),meta=require('../data/kanto-trainer-source/sources.json');assert.equal(Object.keys(K.original.maps).length,224);
 for(const [file,s]of Object.entries(meta.sources)){const b=fs.readFileSync(path.join(root,'desktop/data/kanto-trainer-source',file));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),s.sha256,file);}
 assert.equal(K.original.maps.SSAnne1FRooms.trainers,4);assert.equal(K.original.maps.SSAnne2FRooms.trainers,4);assert.equal(K.original.maps.SSAnneB1FRooms.trainers,6);assert.equal(K.original.maps.SSAnneBow.trainers,2);
 assert.equal(K.original.counts['ss-anne'],16);assert.equal(K.original.counts.forest,5);assert.equal(K.original.counts['route-3'],8);assert.equal(K.original.maps.Route1.trainers,0);assert.equal(K.original.maps.PowerPlant.trainers,0);
 assert.equal(K.original.trainers.length,313);assert.equal(new Set(K.original.trainers.map(t=>t.id)).size,313);
});
test('every original ordinary trainer is represented exactly once, including gym rooms and all building floors',()=>{
 const all=[...K.nodes.values()].filter(n=>n.source);for(const t of K.original.trainers){const rows=all.filter(n=>n.source.map===t.map&&n.source.event===t.event),alias=Object.values(K.aliases).some(a=>a.id===t.id);assert.equal(rows.length,alias?0:1,t.id);if(rows[0])assert.deepEqual(rows[0].team.map(({id,level})=>({id,level})),t.team);assert.ok(fs.existsSync(path.resolve(__dirname,'../assets/trainers/battle',t.sprite+'.png')),t.sprite);}
});
for(const Type of [PC,Android])test(Type.name+' original story aliases match their map parties and the company is visible before Koga',()=>{
 const g=start(Type);guide(g);g.data.badges=['brock','misty','surge','erika'];g.data.kantoStory.drinkAt=now;g.data.kantoWorld.location='saffron';
 const s=g.panelState(now);assert.ok(s.silph.visible&&s.silph.unlocked&&s.silph.steps[0].canChallenge&&s.silph.steps[0].revealed);assert.ok(!g.data.badges.includes('koga'));
 assert.deepEqual(s.silph.steps[0].team,K.aliases.silph.team);
 for(const [key,id]of [['hideout','rocket-grunt'],['silph','silph-grunt'],['tower','tower-grunt-1']])assert.deepEqual(g.battleBoss({kind:'trainer',storyId:id,bossIndex:id}).team.map(({id,level})=>({id,level})),K.aliases[key].team);
 g.data.mobileStory.silph.investigatedAt=now;assert.equal(g.panelState(now).silph.sprite,'assets/logos/team-rocket-pixel.svg');
});
test('automatic versus manual trainer encounters follow original wild tables, not a town merged encounter pool',()=>{
 assert.ok(K.original.trainers.filter(t=>t.location==='forest').every(t=>t.automatic));assert.ok(K.original.trainers.filter(t=>t.location==='ss-anne'||t.location.startsWith('gym:')||['silph','hideout','saffron'].includes(t.location)).every(t=>!t.automatic));
 for(const t of K.original.trainers)assert.equal(t.automatic,K.original.maps[t.map].wild,t.id);
});
for(const Type of [PC,Android])test(Type.name+' each Kanto gym offers exactly two one-time ordinary trainers before its unchanged leader',()=>{
 let g=start(Type);guide(g);g.rivalProgress('rival-brock').state='won';
 for(const c of K.cases.filter(c=>!c.id.startsWith('trainers-gym-')))for(const id of c.entries)g.data.kantoStory.cleared[id]=now;
 g.data.mobileStory.silph.completedAt=now;g.data.mobileStory.mansion.completedAt=now;g.data.kantoStory.roads['route-16']=now;
 for(const index of K.order){
  const group=K.cases.find(c=>c.id==='trainers-gym-'+index);g.data.kantoWorld.location=group.location;
  assert.equal(group.entries.length,2);const rows=g.panelState(now).kantoStory.cases.find(c=>c.id===group.id).entries;assert.equal(rows.length,2);assert.ok(rows.every(n=>n.ready&&!n.automatic&&!n.levelsKnown));
  assert.equal(g.canChallenge(index),false);const before=structuredClone(g.data.owned);assert.ok(g.challenge(rows[0].id,settle(g)));pages(g);g.endChallenge(false,settle(g));pages(g);assert.ok(!K.done(g,rows[0].id));assert.ok(g.canChallenge(rows[0].id));assert.deepEqual(g.data.owned,before);
  clear(g,rows[0].id);assert.ok(!g.canChallenge(index));g=new Type(structuredClone(g.data),settle(g));assert.ok(K.done(g,rows[0].id));assert.ok(!g.canChallenge(rows[0].id));
  const dialogue=require('../../shared/kanto-dialogue.cjs');assert.match(dialogue.result(g,K.nodes.get(rows[1].id)),/관장/);
  clear(g,rows[1].id);assert.ok(K.originalDone(g,'gym:'+index));assert.ok(g.canChallenge(index),'leader '+index);
  for(const n of K.nodes.values())if(n.originalLocation==='gym:'+index&&!group.entries.includes(n.id))assert.equal(g.canChallenge(n.id),false);
  assert.ok(g.challenge(index,settle(g)));win(g);assert.ok(g.data.badges.includes(K.badges[index]));assert.ok(group.entries.every(id=>!g.canChallenge(id)));assert.ok(!g.canChallenge(index));
 }
});
for(const Type of [PC,Android])test(Type.name+' reducing gym visits preserves old victory flags, badges and an omitted opponent already in battle',()=>{
 let g=start(Type);guide(g);g.data.kantoWorld.location='vermilion';const omitted=K.original.trainers.filter(t=>t.location==='gym:2')[2],node=K.nodes.get(omitted.id);
 g.data.battle={kind:'trainer',bossIndex:node.id,storyId:node.id,kantoNode:node.id,foeIndex:0,party:g.data.slots.filter(Boolean),turn:0,startedAt:now};g.nextTrainer(settle(g));pages(g);
 const battle=structuredClone(g.data.battle),owned=structuredClone(g.data.owned);g=new Type(structuredClone(g.data),settle(g));assert.deepEqual(g.data.battle,battle);assert.deepEqual(g.data.owned,owned);assert.deepEqual(g.battleBoss().team,node.team);win(g);assert.ok(K.done(g,node.id));assert.equal(g.canChallenge(node.id),false);
 g.data.badges=['brock','misty','surge'];g=new Type(structuredClone(g.data),settle(g));assert.ok(K.done(g,node.id));assert.equal(g.canChallenge(2),false);assert.ok(K.cases.find(c=>c.id==='trainers-gym-2').entries.every(id=>!g.canChallenge(id)));
});
for(const Type of [PC,Android])test(Type.name+' ordinary automatic trainers cost activity, never pause for taps and stay defeated after reload',()=>{
 let g=start(Type);guide(g);g.rivalProgress('rival-brock').state='won';move(g,'forest');g.data.workTokens=0;assert.equal(g.tick(settle(g)),false);g.data.workTokens=250;assert.ok(g.tick(settle(g)));const id=g.data.battle.kantoNode;assert.ok(g.data.battle.activityTrainer);assert.equal(g.data.workTokens,0);assert.equal(g.presentation().mode,'trainer-intro');assert.equal(g.presentation().sprite,K.nodes.get(id).sprite);pages(g);
 const turn=g.data.battle.turn;assert.equal(g.tick(settle(g)),false);assert.equal(g.data.battle.turn,turn);g.data.workTokens=250;assert.ok(g.tick(settle(g)));assert.equal(g.data.workTokens,0);win(g);assert.ok(K.done(g,id));assert.equal(g.presentation(),null);g=new Type(structuredClone(g.data),settle(g));g.data.workTokens=250;assert.ok(g.tick(settle(g)));assert.notEqual(g.data.battle.kantoNode,id);
 g.endChallenge(false,settle(g));assert.equal(g.presentation(),null);assert.equal(g.data.battle,null);
});
test('all trainer presentations reference pixel sources and every battle sprite has a sprite-sized canvas',()=>{
 const root=path.resolve(__dirname,'../..');for(const file of ['panels.js','johto-panel.js','league-portraits.js','story-presentation.js']){const text=fs.readFileSync(path.join(root,'desktop',file),'utf8');assert.ok(!text.includes('assets/trainers/portraits/'));assert.ok(text.includes('assets/trainers/battle/'));}
 for(const file of fs.readdirSync(path.join(root,'desktop/assets/trainers/battle')).filter(f=>f.endsWith('.png'))){const b=fs.readFileSync(path.join(root,'desktop/assets/trainers/battle',file));assert.ok(b.readUInt32BE(16)<=96&&b.readUInt32BE(20)<=128,file);}
});
for(const Type of [PC,Android])test(Type.name+' guides the parcel trip using paid actions, persists it, then enables manual map travel',()=>{
 let g=start(Type);assert.equal(g.data.kantoWorld.location,'pallet');assert.ok(!g.captureRequested(19));assert.equal(g.requestAction('travel','forest',settle(g)),false);
 assert.ok(g.tick(settle(g)));const startPoint={...W.position(g)};assert.equal(g.tick(settle(g)),false);assert.deepEqual(W.position(g),startPoint);
 g.data.workTokens=250;assert.ok(g.tick(settle(g)));assert.equal(g.data.workTokens,0);g=new Type(structuredClone(g.data),settle(g));assert.equal(g.data.kantoWorld.journey.mode,'guided');guide(g);
 assert.ok(g.data.kantoStory.parcelAt&&g.data.kantoStory.deliveredAt&&g.data.kantoStory.dexAt);assert.ok(g.captureRequested(19));assert.equal(g.panelState(settle(g)).kantoWorld.manualTravel,true);assert.equal(g.data.kantoStory.items.parcel,undefined);assert.equal(g.data.mapTravel?.bank||0,0);
 move(g,'route-22');assert.ok(g.canChallenge('rival-brock'));assert.ok(!g.canChallenge(0));g.challenge('rival-brock',settle(g));win(g);assert.ok(['won','completed'].includes(g.rivalProgress('rival-brock').state));
});
test('the complete early story uses original trainer counts, one-shot results, fossil selection, ticket and ship rival',()=>{
 const g=start();guide(g);move(g,'route-22');g.challenge('rival-brock',settle(g));win(g);move(g,'forest');clearCase(g,'forest-path');assert.equal(K.cases.find(c=>c.id==='forest-path').entries.length,5);
 for(const id of K.cases.find(c=>c.id==='forest-path').entries)assert.equal(g.challenge(id,settle(g)),false);
 move(g,'pewter');gym(g,0);assert.ok(!g.data.owned[1]);move(g,'route-3');clearCase(g,'route3-path');move(g,'mt-moon');clearCase(g,'moon-path');assert.equal(g.data.kantoStory.fossil,138);assert.ok(K.done(g,'k-moon-duo'));assert.equal(g.chooseFossil(140),false);
 move(g,'cerulean');gym(g,1);assert.ok(!g.data.owned[4]);move(g,'route-24');clearCase(g,'nugget-bridge');move(g,'route-25');clearCase(g,'trainers-route-25');move(g,'sea-cottage');clear(g,'k-bill');assert.equal(g.data.kantoStory.items['ss-ticket'],1);
 move(g,'route-24');clear(g,'k-charmander');assert.ok(g.data.starterGifts[4]);move(g,'cerulean');clear(g,'k-robber');move(g,'ss-anne');
 const ship=K.cases.find(c=>c.id==='anne-visit');assert.equal(ship.entries.filter(id=>K.nodes.get(id).trainer).length,16);
 for(const id of ship.entries.filter(id=>id!=='k-captain'))clear(g,id);
 assert.ok(g.challenge('k-captain',settle(g)));assert.equal(g.data.battle.storyId,'rival-surge');win(g);assert.ok(!K.done(g,'k-captain'));clear(g,'k-captain');assert.ok(K.done(g,'k-captain'));move(g,'vermilion');gym(g,2);clear(g,'k-squirtle');assert.ok(g.data.starterGifts[7]);
});
test('Flash substitute needs the aide, ten registrations and the cave visit, while all sea approaches require a real Safari completion',()=>{
 const g=start();guide(g);g.data.badges=['brock','misty','surge'];g.data.kantoWorld.location='route-2';g.data.kantoWorld.visited.diglett=now;
 for(const id of [16,19,21,23,27,35,37,39])g.data.caught[id]=now;assert.equal(g.kantoCaughtCount(),9);assert.ok(!g.canChallenge('k-aide'));g.data.caught[41]=now;assert.ok(g.canChallenge('k-aide'));clear(g,'k-aide');assert.ok(K.done(g,'k-aide'));
 g.data.badges.push('erika','sabrina','koga');for(const id of ['route-19','route-20','route-21','seafoam','cinnabar','mansion','power-plant'])assert.equal(W.unlocked(g,W.byId.get(id)),false,id);
 g.data.kantoWorld.location='safari';assert.ok(g.canChallenge('safari-start'));g.challenge('safari-start',settle(g));pages(g);assert.ok(g.data.mobileStory.safari.trip);g.returnSafari(settle(g));assert.ok(!g.data.mobileStory.safari.completedAt);
 g.challenge('safari-start',settle(g));pages(g);g.captureRequested=()=>false;assert.ok(g.walkingStep(Safari.DISTANCE,settle(g)));assert.ok(g.data.mobileStory.safari.completedAt);assert.equal(g.data.mobileStory.safari.last.caught.length,0);for(const id of ['route-19','route-21','seafoam','cinnabar','mansion','power-plant'])assert.ok(W.unlocked(g,W.byId.get(id)),id);assert.ok(g.canChallenge('safari-start'));
});
test('unselected fossil family is blocked from wilds, reservations and eggs, with one confirmation and a fresh choice next season',()=>{
 const g=start();guide(g);g.data.kantoStory.fossil=138;for(const id of [138,139,140,141])assert.ok(g.wildOptions().excluded.includes(id));assert.ok(!g.canReserveCapture(140));
 const uid=g.addPokemon(141,40,'old-save',now),ditto=g.addPokemon(132,20,'fixture',now);assert.equal(nursery.predict(g,[uid,ditto]).compatible,false);assert.ok(!g.canAcquireSpecies(140));
 g.data.kantoWorld.location='cinnabar';clear(g,'k-fossil-restore');assert.equal(Object.values(g.data.owned).filter(p=>p.id===138).length,1);assert.equal(g.challenge('k-fossil-restore',settle(g)),false);
 const caught=structuredClone(g.data.caught);g.resetSeason(Date.parse('2026-11-01T01:00:00+09:00'));assert.equal(g.data.kantoStory.fossil,null);assert.deepEqual(g.data.caught,caught);assert.equal(g.data.kantoWorld.location,'pallet');assert.equal(Object.keys(g.data.kantoStory.cleared).length,0);
});
test('upgrading a pre-journey saved game preserves its active battle, ownership and opened map without starting a new errand',()=>{
 const old=new Game({},now);old.data.badges=['brock','misty','surge','erika','koga','sabrina'];old.newWild(now);const before=structuredClone(old.data),g=new PC(before,now);assert.deepEqual(g.data.battle,before.battle);assert.deepEqual(g.data.owned,before.owned);assert.ok(g.data.kantoStory.legacy&&g.data.kantoStory.mapAt&&g.data.kantoStory.dexAt);assert.equal(g.presentation(),null);
});
for(const Type of [PC,Android])test(Type.name+' follows the middle and final story without a circular passage, duplicate trainer or early reward',()=>{
 const g=start(Type);guide(g);g.data.badges=['brock','misty','surge'];g.rivalProgress('rival-brock').state='won';g.rivalProgress('rival-surge').state='won';
 for(const c of K.cases.filter(c=>['forest','route-3','mt-moon','route-24','route-25','sea-cottage','ss-anne','cerulean'].includes(c.location)))for(const id of c.entries)g.data.kantoStory.cleared[id]=now;
 g.data.kantoStory.fossil=138;g.data.kantoStory.items[138]=1;for(const id of [16,19,21,23,27,35,37,39,41])g.data.caught[id]=now;
 g.data.kantoWorld.location='vermilion';g.data.kantoWorld.position={...W.snapshot(g).map.points.vermilion};
 move(g,'route-11');clearCase(g,'route11-path');move(g,'diglett');move(g,'route-2');clear(g,'k-aide');move(g,'route-9');clearCase(g,'route9-path');move(g,'rock-tunnel');clearCase(g,'tunnel-path');move(g,'tower');clear(g,'k-tower-visit');move(g,'celadon');gym(g,3);assert.ok(!g.data.trainingDevice.fluteObtainedAt);
 assert.ok(g.challenge('rocket-grunt',settle(g)));win(g);assert.equal(g.data.battle,null);assert.ok(!g.data.trainingDevice.duoWonAt);clearCase(g,'trainers-hideout');clear(g,'k-lift-key');for(const id of ['rocket-duo','rocket-giovanni']){assert.ok(g.challenge(id,settle(g)));win(g);}pages(g);assert.ok(g.data.mobileStory.scopeObtainedAt);assert.ok(!g.data.trainingDevice.fluteObtainedAt);
 move(g,'tower');assert.ok(g.challenge('tower-grunt-1',settle(g)));assert.equal(g.data.battle.storyId,'rival-middle');win(g);g.data.workTokens=250;assert.ok(g.startAutomaticTrainer('tower-grunt-1',settle(g)));win(g);clearCase(g,'trainers-tower');for(const id of ['tower-grunt-2','tower-grunt-3']){assert.ok(g.challenge(id,settle(g)));win(g);}pages(g);assert.ok(g.data.trainingDevice.fluteObtainedAt);
 assert.ok(g.requestAction('travel','saffron',settle(g)));finishJourney(g,settle(g));assert.equal(W.checkpoint(g).name,'노랑시티 경비원');assert.ok(!g.data.kantoStory.drinkAt);assert.ok(g.requestAction('world-pass','saffron',settle(g)));finishJourney(g,settle(g));assert.equal(g.data.kantoWorld.location,'saffron');assert.ok(g.data.kantoStory.drinkAt);
 assert.ok(g.challenge('silph-grunt',settle(g)));win(g);clearCase(g,'trainers-silph');clear(g,'k-card-key');assert.ok(g.challenge('silph-duo',settle(g)));assert.equal(g.data.battle.storyId,'rival-silph');win(g);assert.ok(g.challenge('silph-duo',settle(g)));win(g);assert.ok(g.challenge('silph-giovanni',settle(g)));win(g);assert.ok(g.offerLapras(settle(g)));pages(g);assert.ok(g.data.mobileStory.laprasResolved);gym(g,5);
 move(g,'route-16');assert.ok(g.challenge('road-snorlax',settle(g)));g.data.battle.foe.hp=0;g.defeatOpponent(settle(g));assert.ok(g.data.kantoStory.roads['route-16']);assert.ok(!g.data.kantoStory.roads['route-12']);move(g,'fuchsia');gym(g,4);move(g,'safari');g.challenge('safari-start',settle(g));pages(g);g.walkingStep(Safari.DISTANCE,settle(g));assert.ok(g.data.mobileStory.safari.completedAt);
 move(g,'seafoam');clearCase(g,'seafoam-crossing');move(g,'cinnabar');clear(g,'k-fossil-restore');move(g,'mansion');g.challenge('mansion-investigate',settle(g));pages(g);for(const id of K.cases.find(c=>c.id==='trainers-mansion').entries){clear(g,id);if(g.offerMansion(settle(g)))pages(g);}assert.ok(g.data.mobileStory.mansion.completedAt);move(g,'cinnabar');gym(g,6);move(g,'viridian');gym(g,7);
 move(g,'route-22');assert.ok(g.challenge('rival-league',settle(g)));win(g);assert.ok(g.requestAction('travel','victory-road',settle(g)));finishJourney(g,settle(g));assert.ok(W.checkpoint(g).canPass);g.requestAction('world-pass','victory-road',settle(g));finishJourney(g,settle(g));assert.equal(g.data.kantoWorld.location,'victory-road');clearCase(g,'victory-path');move(g,'indigo');assert.ok(g.challenge(8,settle(g)));win(g);assert.ok(g.data.champion);assert.equal(g.data.leagueBest,5);
});
