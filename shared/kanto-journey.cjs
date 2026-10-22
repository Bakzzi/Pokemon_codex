'use strict';
// Yellow-inspired manual story branches. Only reached places expose these rows.
// Existing party/level data remains unchanged. New minor parties are from
// pret/pokeyellow/data/trainers/parties.asm (see kanto-story-sources.json).
const {species,learnedMoves}=require('../desktop/pokemon.cjs');
const order=[0,1,2,3,5,4,6,7];
const badges=['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
const cases=[],nodes=new Map();
function add(id,location,title,description,entries){
 const group={id,location,title,description,entries:[]};cases.push(group);
 for(const row of entries){const n={case:id,location,sprite:'scientist',type:'dialogue',...row};if(n.party)n.team=n.party.map(([id,level])=>({id,level,moves:learnedMoves(id,level).slice(-4)}));nodes.set(n.id,n);group.entries.push(n.id);}
}
add('forest-path','forest','상록숲을 지나서','숲길에서 만난 트레이너들이 승부를 걸어왔어요. 동료와 함께 회색시티로 향해요.',[
 {id:'k-forest-1',name:'곤충채집 소년',sprite:'bug-catcher',party:[[10,7],[10,7]],pages:['숲에서 찾은 포켓몬들이야! 네 동료도 보여 줘!'],result:'숲 안쪽에도 트레이너가 있어요. 길을 따라가 보세요.'},
 {id:'k-forest-2',name:'곤충채집 소년',sprite:'bug-catcher',party:[[11,6],[10,6],[11,6]],pages:['진화한 포켓몬의 힘을 보여 주겠어!'],result:'숲의 출구가 가까워졌어요.'},
 {id:'k-forest-3',name:'숲길의 트레이너',sprite:'bug-catcher',party:[[10,10]],pages:['회색시티로 가려면 나와도 한판 해야지!'],result:'상록숲을 통과했어요. 회색시티의 체육관을 찾아가 보세요.'}
]);
add('route3-path','route-3','달맞이산으로 가는 길','회색시티를 떠나 달맞이산으로 향해요. 길에서 만난 트레이너와 실력을 겨뤄 보세요.',[
 {id:'k-route3-1',name:'반바지 꼬마',sprite:'youngster',party:[[19,11],[23,11]],pages:['반바지는 편하고 좋아! 배틀도 해 보자!'],result:'달맞이산 쪽으로 조금 더 걸어가요.'},
 {id:'k-route3-2',name:'곤충채집 소년',sprite:'bug-catcher',party:[[10,11],[11,11]],pages:['동굴에 들어가기 전에 내 포켓몬도 봐!'],result:'달맞이산 입구에 도착했어요.'}
]);
add('moon-path','mt-moon','달맞이산의 화석','동굴 안에서 로켓단이 무언가를 찾고 있어요. 출구로 향하며 무슨 일인지 살펴보세요.',[
 {id:'k-moon-trainer',name:'등산가',sprite:'hiker',party:[[74,10],[74,10],[95,10]],pages:['달맞이산은 처음인가? 동굴에서도 방심하면 안 되지!'],result:'동굴 깊은 곳에서 소란이 들려요.'},
 {id:'k-moon-grunt',name:'로켓단 조무래기',sprite:'rocket-grunt',party:[[27,11],[19,11],[41,11]],pages:['희귀한 화석은 전부 로켓단 차지다! 비켜!'],result:'로켓단을 물리쳤어요. 화석 앞에 누군가 남아 있어요.'},
 {id:'k-moon-scientist',name:'화석을 지키는 연구원',sprite:'super-nerd',party:[[88,12],[100,12],[109,12]],pages:['이 화석들은 내가 먼저 발견했어! 승부로 정하자!'],result:'연구원이 화석 하나를 골라도 좋다고 해요.'},
 {id:'k-fossil-choice',name:'화석 고르기',type:'choice',pages:['둘 다 가져가면 안 되지. 하나는 네가, 하나는 내가 갖자.','어느 화석을 가져갈까? 선택하지 않은 화석은 연구원이 가져간다.'],result:'화석을 소중히 챙겼어요. 출구로 향해요.'},
 {id:'k-moon-duo',name:'로이·로사',sprite:'rocket-duo',party:[[23,14],[52,14],[109,14]],pages:['그 화석, 우리가 가져가겠어!','로켓단의 앞길을 막은 대가를 치르게 해 주지!'],result:'로이·로사를 물리쳤어요. 4번도로를 지나 블루시티로 향해요.'}
]);
add('melanie','cerulean','보살핌이 필요한 동료','멜라니가 포켓몬을 돌보고 있어요. 피카츄와 함께 인사해 보세요.',[
 {id:'k-bulbasaur',name:'멜라니와 이야기하기',gift:1,level:10,pages:['이 이상해씨를 돌보고 있었어. 믿을 만한 트레이너에게 맡기고 싶어.','피카츄가 널 참 좋아하는구나. 이 아이도 함께 데려가 줄래?'],result:'멜라니에게 이상해씨를 받았어요.'}
]);
add('nugget-bridge','route-24','금구슬다리의 승부','다리 위 트레이너 다섯 명이 승부를 기다리고 있어요. 한 명씩 이겨 길을 건너요.',[
 ...[[[10,14],[13,14]],[[16,14],[29,14]],[[19,14],[23,14],[41,14]],[[16,16],[29,16]],[[56,18]]].map((party,i)=>({id:'k-bridge-'+(i+1),name:'다리의 트레이너 '+(i+1),sprite:i%2?'lass':'youngster',party,pages:[(i+1)+'번째 상대는 나야! 여기까지 온 실력을 보여 줘!'],result:i===4?'다섯 명을 모두 이겼어요. 다리 끝의 남자가 손짓해요.':'다음 트레이너에게 다가가 보세요.'})),
 {id:'k-bridge-rocket',name:'다리 끝의 남자',sprite:'rocket-grunt',party:[[23,15],[41,15]],pages:['다섯 명을 전부 이기다니! 로켓단에 들어올 생각 없나?','거절한다고? 그렇다면 실력으로 이야기하자!'],result:'다리를 건넜어요. 25번도로 끝의 이수재를 만나 보세요.'},
 {id:'k-charmander',name:'트레이너와 이야기하기',sprite:'youngster',gift:4,level:10,pages:['내가 이 파이리를 제대로 돌보지 못했어.','이수재에게 가는 길도 잘 헤쳐 왔구나. 너라면 이 아이를 맡길 수 있겠어.'],result:'파이리가 동료가 됐어요.'}
]);
add('bill-visit','sea-cottage','이수재의 초대','25번도로 끝의 집에서 포켓몬 연구가 이수재를 만날 수 있어요.',[
 {id:'k-bill',name:'이수재와 이야기하기',pages:['나는 포켓몬을 연구하는 이수재야. 여기까지 와 줘서 고마워!','갈색시티 항구에 상트안느호가 와 있어. 이 승선권으로 배 안을 구경해 봐.'],item:'ss-ticket',result:'상트안느호 승선권을 받았어요. 블루시티를 거쳐 갈색시티로 향해요.'}
]);
add('robbed-house','cerulean','도둑맞은 집','집을 어지럽힌 로켓단이 뒤쪽 길로 달아났어요. 주민을 도와주세요.',[
 {id:'k-robber',name:'도망친 로켓단',sprite:'rocket-grunt',party:[[66,17],[96,17]],pages:['난 아무 짓도 안 했어!','끝까지 쫓아오겠다면 상대해 주지!'],result:'도망친 로켓단을 물리쳤어요. 5번도로와 지하통로를 지나 갈색시티로 향해요.'}
]);
add('anne-visit','ss-anne','상트안느호','승선권을 확인받고 배에 올랐어요. 선내 트레이너들과 인사하고 선장을 찾아가 보세요.',[
 {id:'k-anne-1',name:'갑판의 선원',sprite:'sailor',party:[[66,18],[90,18]],pages:['바다 사나이의 배틀을 보여 주지!'],result:'선실 쪽으로 더 들어가 보세요.'},
 {id:'k-anne-2',name:'선실의 신사',sprite:'gentleman',party:[[58,18],[58,18]],pages:['먼 길을 떠나는 데는 좋은 동료가 필요하지. 너희의 실력을 보겠네.'],result:'선장실로 향하는 계단을 찾았어요.'},
 {id:'k-captain',name:'선장 찾아가기',sprite:'sailor',pages:['으으, 멀미가 심하구나. 등을 좀 두드려 주겠니?','고맙다! 한결 나아졌어. 갈색체육관 앞길도 지나갈 수 있도록 선원에게 이야기해 두마.'],result:'선장을 도왔어요. 갈색체육관으로 가는 길이 열렸어요.'}
]);
add('vermilion-police','vermilion','경찰관의 부탁','경찰관이 새 보금자리를 찾는 포켓몬을 돌보고 있어요.',[
 {id:'k-squirtle',name:'경찰관과 이야기하기',gift:7,level:10,pages:['마티스를 이겼다며? 믿을 만한 트레이너구나.','이 꼬부기를 부탁해도 될까? 네 모험에 함께하면 좋겠어.'],result:'경찰관에게 꼬부기를 받았어요.'}
]);
add('route11-path','route-11','디그다의 굴로','도로의 트레이너들과 겨루며 디그다의 굴 입구를 찾아요.',[
 {id:'k-route11-1',name:'도로의 트레이너',sprite:'youngster',party:[[23,21]],pages:['갈색시티에서 왔어? 한판 해 보자!'],result:'동쪽 길을 더 살펴보세요.'},
 {id:'k-route11-2',name:'도로의 트레이너',sprite:'youngster',party:[[27,19],[41,19]],pages:['굴로 가기 전에 승부다!'],result:'디그다의 굴을 지나면 2번도로 동쪽으로 나갈 수 있어요.'}
]);
add('route2-aide','route-2','오박사의 조수','굴을 건너온 쪽에서 오박사의 조수가 도감 연구를 하고 있어요.',[
 {id:'k-aide',name:'조수와 이야기하기',pages:['오박사님의 조수야. 포획한 포켓몬을 도감에 기록하고 있니?','열 종류가 넘는구나! 돌산터널은 아주 어두워. 안전하게 통과할 수 있도록 길을 알려 줄게.'],result:'조수의 안내를 받았어요. 돌산터널을 통과할 수 있어요.'}
]);
add('route9-path','route-9','돌산터널로 가는 길','바위가 많은 길을 지나 보라타운으로 향해요.',[
 {id:'k-route9-1',name:'도로의 트레이너',sprite:'lass',party:[[43,18],[69,18],[43,18],[69,18]],pages:['터널로 가는 길이야? 그 전에 승부하자!'],result:'돌산터널 입구가 가까워졌어요.'},
 {id:'k-route9-2',name:'등산가',sprite:'hiker',party:[[74,21],[95,21]],pages:['동굴에 들어갈 준비가 됐는지 보겠어!'],result:'돌산터널 입구로 향해요.'}
]);
add('tunnel-path','rock-tunnel','어두운 돌산터널','조수가 알려 준 길을 따라 동굴 안의 트레이너들과 겨루며 출구를 찾아요.',[
 {id:'k-tunnel-1',name:'동굴의 트레이너',sprite:'super-nerd',party:[[104,23],[79,23]],pages:['어두운 곳에서도 포켓몬은 잘 싸운다고!'],result:'바람이 불어오는 쪽으로 더 가 보세요.'},
 {id:'k-tunnel-2',name:'등산가',sprite:'hiker',party:[[74,21],[75,21]],pages:['출구가 멀지 않았어. 마지막으로 한판 어때?'],result:'돌산터널을 빠져나왔어요. 보라타운으로 향해요.'}
]);
add('tower-rumor','tower','탑 안의 기척','탑 위쪽에서 알 수 없는 기척이 느껴져요.',[
 {id:'k-tower-visit',name:'탑 안을 살펴보기',pages:['계단 위에서 정체를 알 수 없는 유령이 길을 막았다.','지금은 다가갈 수 없다. 무지개시티에서 단서를 찾아보자.'],result:'유령의 정체를 확인할 방법을 찾아야겠어요.'}
]);
add('hideout-key','celadon','아지트의 승강기','지하 통로 끝에서 승강기를 움직일 열쇠를 찾았어요.',[
 {id:'k-lift-key',name:'남겨진 열쇠 확인하기',pages:['조무래기가 떠난 자리에서 작은 열쇠를 주웠다.','승강기 열쇠다. 아지트 안쪽으로 내려갈 수 있겠다.'],item:'lift-key',result:'승강기가 움직이기 시작했어요. 아지트 안쪽을 조사해 보세요.'}
]);
add('silph-key','saffron','닫힌 사무실','로켓단이 막고 있던 통로에서 카드키를 발견했어요.',[
 {id:'k-card-key',name:'카드키 확인하기',pages:['바닥에 떨어진 카드키를 주웠다.','잠긴 문에 대자 잠금이 풀렸다. 회사 안쪽으로 더 들어가 보자.'],item:'card-key',result:'닫힌 사무실의 문이 열렸어요.'}
]);
add('seafoam-crossing','seafoam','쌍둥이섬의 물길','동굴 안의 거센 물살 때문에 반대편으로 나가기 어려워요. 흐름이 잦아드는 길을 찾아보세요.',[
 {id:'k-seafoam-1',name:'동굴의 물길 살펴보기',pages:['바위 사이로 물이 갈라져 흐르고 있다.','동료와 함께 물살이 약한 쪽을 찾아 천천히 건너갔다.'],result:'동굴 안쪽으로 이동할 수 있어요.'},
 {id:'k-seafoam-2',name:'반대편 출구 찾기',pages:['멀리서 빛이 들어온다. 물살도 한결 잔잔해졌다.','바위 사이의 길을 따라 반대편 출구에 도착했다.'],result:'쌍둥이섬을 통과했어요. 20번수로를 지나 홍련섬으로 향해요.'}
]);
add('fossil-lab','cinnabar','홍련섬의 연구소','오래된 화석을 연구하는 곳이에요. 가지고 온 화석을 맡겨 보세요.',[
 {id:'k-fossil-restore',name:'화석 연구원과 이야기하기',pages:['달맞이산에서 가져온 화석이구나! 복원해 보겠네.','아주 오래전 살던 포켓몬이 다시 눈을 떴어. 소중히 돌봐 주게.'],result:'화석에서 깨어난 포켓몬이 동료가 됐어요.'}
]);
add('power-survey','power-plant','발길이 끊긴 발전소','버려진 시설에 전기 포켓몬들이 모여 있어요. 주변을 천천히 살펴보세요.',[
 {id:'k-power-survey',name:'발전소 둘러보기',pages:['멈춰 선 발전기 사이로 포켓몬들이 오가고 있다.','사람이 떠난 뒤 이곳은 전기 포켓몬들의 보금자리가 된 모양이다.'],result:'무인발전소를 둘러봤어요. 이곳에서 모험을 계속할 수 있어요.'}
]);
add('victory-path','victory-road','마지막 관문','리그로 향하는 트레이너들이 챔피언로드에서 마지막 실력을 겨뤄요.',[
 {id:'k-victory-1',name:'리그를 향하는 트레이너',sprite:'cooltrainer',party:[[5,40],[131,40],[108,40]],pages:['리그를 목표로 여기까지 왔어. 너도 그렇겠지?'],result:'챔피언로드 안쪽으로 향해요.'},
 {id:'k-victory-2',name:'출구의 트레이너',sprite:'cooltrainer',party:[[2,42],[8,42],[5,42],[6,42]],pages:['이 길의 끝은 석영고원이야. 서로 준비가 됐는지 확인하자!'],result:'챔피언로드를 통과했어요. 석영고원에서 리그에 도전해 보세요.'}
]);
function modern(g){return !!g.data.kantoStory&&!g.data.kantoStory.legacy;}
function done(g,id){return !!g.data.kantoStory?.cleared[id];}
const original=require('./kanto-trainers.json'),used=new Set(),sourceNodes=new Map();
function bind(n,t){used.add(t.id);sourceNodes.set(t.id,n);Object.assign(n,{name:t.name,sprite:t.sprite,team:t.team.map(p=>({...p,moves:learnedMoves(p.id,p.level).slice(-4)})),trainer:true,automatic:t.automatic,source:{map:t.map,event:t.event,class:t.class,partyIndex:t.partyIndex}});}
function populate(caseId,location,battleIds,filter=()=>true){
 const group=cases.find(c=>c.id===caseId),records=original.trainers.filter(t=>t.location===location&&filter(t)),battle=[];
 for(let i=0;i<records.length;i++){const t=records[i],id=battleIds[i]||t.id;let n=nodes.get(id);if(!n){n={id,case:caseId,location:group.location,type:'dialogue',pages:[t.name+'이 승부를 걸어왔다!'],result:group.title+'에서 승부를 마쳤어요.'};nodes.set(id,n);}bind(n,t);battle.push(id);}
 const other=group.entries.filter(id=>!battleIds.includes(id));group.entries=[...battle,...other];return battle;
}
populate('forest-path','forest',['k-forest-1','k-forest-2','k-forest-3']);
populate('route3-path','route-3',['k-route3-1','k-route3-2']);
// The scientist guards the choice, followed by the scripted Jessie/James battle.
const moon=cases.find(c=>c.id==='moon-path'),moonScientist=original.trainers.find(t=>t.location==='mt-moon'&&t.class==='SUPER_NERD'&&t.partyIndex===2);
bind(nodes.get('k-moon-scientist'),moonScientist);
const moonRows=populate('moon-path','mt-moon',['k-moon-trainer','k-moon-grunt'],t=>t!==moonScientist);
moon.entries=[...moonRows,'k-moon-scientist','k-fossil-choice','k-moon-duo'];
const bridgeOrder=['k-npc-route24-7','k-npc-route24-6','k-npc-route24-5','k-npc-route24-4','k-npc-route24-3','k-npc-route24-1'];
for(const [i,id]of bridgeOrder.entries())bind(nodes.get(i<5?'k-bridge-'+(i+1):'k-bridge-rocket'),original.trainers.find(t=>t.id===id));
populate('anne-visit','ss-anne',['k-anne-1','k-anne-2']);
populate('route11-path','route-11',['k-route11-1','k-route11-2']);
populate('route9-path','route-9',['k-route9-1','k-route9-2']);
populate('tunnel-path','rock-tunnel',['k-tunnel-1','k-tunnel-2']);
populate('victory-path','victory-road',['k-victory-1','k-victory-2']);
const aliases={hideout:original.trainers.find(t=>t.location==='hideout'&&t.map==='GameCorner'),silph:original.trainers.find(t=>t.location==='silph'&&t.map==='SilphCo8F'&&t.class==='ROCKET'),tower:original.trainers.find(t=>t.location==='tower')};
bind(nodes.get('k-robber'),original.trainers.find(t=>t.location==='cerulean'));
for(const t of Object.values(aliases))used.add(t.id);
const gymPlaces=['pewter','cerulean','vermilion','celadon','fuchsia','saffron','cinnabar','viridian'];
for(const location of Object.keys(original.counts)){
 const records=original.trainers.filter(t=>t.location===location&&!used.has(t.id));if(!records.length)continue;
 const place=location.startsWith('gym:')?gymPlaces[Number(location.slice(4))]:location==='hideout'?'celadon':location==='silph'?'saffron':location;
 const title=location.startsWith('gym:')?'체육관의 트레이너들':location==='hideout'?'아지트의 로켓단':location==='silph'?'점거된 회사의 트레이너들':location==='tower'?'탑의 트레이너들':location==='mansion'?'저택의 트레이너들':location==='saffron'?'격투도장의 트레이너들':place.replace('route-','')+'번도로의 트레이너들';
 const id='trainers-'+location.replace(':','-');add(id,place,title,'이곳에서 기다리는 트레이너들과 승부해요. 한 번 이긴 상대와는 다시 싸우지 않아요.',records.map(t=>({id:t.id,name:t.name,pages:[t.name+'이 승부를 걸어왔다!'],result:'승부를 마쳤어요. 모험길을 계속 살펴보세요.',trainer:true,originalLocation:location})));
 for(const t of records)bind(nodes.get(t.id),t);
}
// Gym visits use two ordinary opponents. Keep the complete source definitions
// available so an older save can finish a battle that is no longer offered.
for(let i=0;i<gymPlaces.length;i++){
 const group=cases.find(c=>c.id==='trainers-gym-'+i);
 group.entries=group.entries.slice(0,2);
 if(group.entries.length===1){
  const originalTrainer=nodes.get(group.entries[0]),id='k-gym-'+i+'-trainee';
  nodes.set(id,{...originalTrainer,id,source:undefined,adaptedFrom:originalTrainer.id,team:structuredClone(originalTrainer.team.slice(-1))});
  group.entries.push(id);
 }
 group.description='두 트레이너와 승부한 뒤 관장에게 도전해요. 한 번 이긴 상대와는 다시 싸우지 않아요.';
}
function trainersDone(g,caseId){const group=cases.find(c=>c.id===caseId);return !!group&&group.entries.filter(id=>nodes.get(id).trainer).every(id=>done(g,id));}
function originalDone(g,location){if(location.startsWith('gym:'))return trainersDone(g,'trainers-'+location.replace(':','-'));return original.trainers.filter(t=>t.location===location&&!Object.values(aliases).some(a=>a.id===t.id)).every(t=>done(g,sourceNodes.get(t.id)?.id));}
function fossilBlocked(g,id){const f=g.data.kantoStory?.fossil;return f===138?[140,141].includes(id):f===140?[138,139].includes(id):false;}
function prerequisite(g,n){
 const s=g.data.kantoStory,b=g.data.badges,has=id=>b.includes(id),win=id=>['won','completed'].includes(g.rivalProgress(id)?.state);
 const at=id=>!!g.data.kantoWorld?.visited[id];
 if(n.id==='k-bulbasaur')return has('misty')&&!g.data.starterGifts[1]&&Object.values(g.data.owned).some(p=>[25,26].includes(p.id)&&p.happiness>=147);
 if(n.id==='k-charmander')return done(g,'k-bill')&&!g.data.starterGifts[4];
 if(n.id==='k-squirtle')return has('surge')&&!g.data.starterGifts[7];
 if(n.id==='k-aide')return has('surge')&&at('diglett')&&g.kantoCaughtCount()>=10;
 if(n.id==='k-bill')return done(g,'k-bridge-rocket')&&originalDone(g,'route-25');
 if(n.id==='k-captain')return trainersDone(g,'anne-visit');
 if(n.id==='k-moon-scientist')return cases.find(c=>c.id==='moon-path').entries.filter(id=>id!=='k-moon-scientist'&&nodes.get(id).trainer).every(id=>done(g,id));
 if(n.id==='k-robber')return has('misty')&&done(g,'k-bill');
 if(n.id==='k-lift-key')return !!g.data.trainingDevice.gruntWonAt&&originalDone(g,'hideout');
 if(n.id==='k-card-key')return !!g.data.mobileStory.silph.wins[0]&&originalDone(g,'silph');
 if(n.id==='k-fossil-restore')return !!s.fossil;
 if(n.id==='k-tower-visit')return !g.data.mobileStory.scopeObtainedAt;
 if(n.case==='anne-visit'&&!done(g,'k-bill'))return false;
 if(n.case==='forest-path'&&!win('rival-brock'))return false;
 if(n.case==='nugget-bridge'&&!has('misty'))return false;
 if(n.case==='route3-path'&&!has('brock'))return false;
 if(n.case==='moon-path'&&!done(g,'k-route3-2'))return false;
 if(n.case==='route11-path'&&!has('surge'))return false;
 if(n.case==='route9-path'&&!has('surge'))return false;
 if(n.case==='tunnel-path'&&(!done(g,'k-aide')||!done(g,'k-route9-2')))return false;
 if(n.case==='seafoam-crossing'&&!g.data.mobileStory.safari.completedAt)return false;
 if(n.case==='victory-path'&&!win('rival-league'))return false;
 if(n.originalLocation==='hideout')return has('erika')&&!!g.data.trainingDevice.gruntWonAt;
 if(n.originalLocation==='silph')return !!s.drinkAt&&!!g.data.mobileStory.silph.wins[0];
 if(n.originalLocation==='tower')return !!g.data.mobileStory.rescue.wins[0];
 if(n.originalLocation==='mansion')return !!g.data.mobileStory.mansion.startedAt;
 if(n.originalLocation?.startsWith('gym:'))return !has(badges[Number(n.originalLocation.slice(4))])&&cases.find(c=>c.id===n.case).entries.includes(n.id);
 if(n.trainer&&!n.id.startsWith('k-bridge-'))return true;
 const list=cases.find(c=>c.id===n.case).entries,index=list.indexOf(n.id);
 return index===0||done(g,list[index-1]);
}
function ready(g,id){const n=nodes.get(id);return !!n&&!g.data.johtoUnlocked&&!done(g,id)&&g.data.kantoWorld?.location===n.location&&prerequisite(g,n)&&!g.presentation();}
function gate(g,id){
 if(!modern(g))return null;
 const b=g.data.badges,has=id=>b.includes(id),win=id=>['won','completed'].includes(g.rivalProgress(id)?.state),s=g.data.kantoStory;
 if(!s.mapAt&&!['pallet','route-1','viridian'].includes(id))return 'map';
 if(['forest','pewter'].includes(id)&&!win('rival-brock'))return 'early-rival';
 if(id==='pewter'&&!trainersDone(g,'forest-path'))return 'forest';
 if(id==='mt-moon'&&!trainersDone(g,'route3-path'))return 'route3';
 if(['route-4','cerulean','route-24','route-25','sea-cottage'].includes(id)&&!done(g,'k-moon-duo'))return 'moon';
 if(['route-5','route-6','vermilion','ss-anne'].includes(id)&&!done(g,'k-robber'))return 'robber';
 if(id==='ss-anne'&&!done(g,'k-bill'))return 'ticket';
 if(id==='diglett'&&!trainersDone(g,'route11-path'))return 'route11';
 if(id==='rock-tunnel'&&!done(g,'k-aide'))return 'aide';
 if(id==='rock-tunnel'&&!trainersDone(g,'route9-path'))return 'route9';
 if(['route-10','lavender','tower','route-8','route-7','celadon'].includes(id)&&!trainersDone(g,'tunnel-path'))return 'tunnel';
 if(id==='saffron'&&!s.drinkAt)return 'drink';
 if(id==='route-17'&&!s.roads?.['route-16'])return 'snorlax16';
 if(id==='route-13'&&!s.roads?.['route-12'])return 'snorlax12';
 if(['route-19','seafoam','route-20','cinnabar','mansion','route-21','power-plant'].includes(id)&&!g.data.mobileStory.safari.completedAt)return 'sea';
 if(['route-20'].includes(id)&&!done(g,'k-seafoam-2')&&!has('blaine'))return 'seafoam';
 if(['route-23','victory-road','indigo'].includes(id)&&!win('rival-league'))return 'late-rival';
 if(id==='indigo'&&!trainersDone(g,'victory-path'))return 'victory';
 return null;
}
const gateText={map:'오박사의 심부름을 마치고 타운맵을 받아요.', 'early-rival':'22번도로에서 기다리는 그린과 승부해 보세요.',forest:'상록숲의 트레이너들과 승부를 마쳐 주세요.',route3:'3번도로의 트레이너들과 승부를 마쳐 주세요.',moon:'달맞이산에서 출구로 가는 길을 찾아야 해요.',robber:'블루시티에서 달아난 로켓단을 쫓아가 보세요.',ticket:'승선권이 있어야 배에 오를 수 있어요.',route11:'11번도로에서 굴로 향하는 길을 찾아보세요.',aide:'돌산터널은 너무 어두워요. 2번도로 동쪽의 조수에게 길을 물어보세요.',route9:'9번도로의 트레이너들과 승부를 마쳐 주세요.',tunnel:'돌산터널 안에서 출구를 찾아야 해요.',drink:'경비원이 노랑시티로 들어가는 길을 지키고 있어요.',snorlax16:'커다란 포켓몬이 길을 막고 잠들어 있어요.',snorlax12:'커다란 포켓몬이 길을 막고 잠들어 있어요.',sea:'아직 바다를 안전하게 건너는 방법을 몰라요.',seafoam:'쌍둥이섬 안에서 반대편 출구를 찾아야 해요.','late-rival':'22번도로에서 그린이 기다리고 있어요.',victory:'챔피언로드의 마지막 관문을 넘어야 해요.'};
function snapshot(g){
 const s=g.data.kantoStory;if(!s)return null;
 return {mapObtained:!!s.mapAt,dexObtained:!!s.dexAt,guided:modern(g)&&!g.data.johtoUnlocked&&!s.mapAt,fossil:s.fossil,legacy:!!s.legacy,cases:s.legacy?[]:cases.filter(c=>c.location===g.data.kantoWorld?.location&&(c.id==='melanie'?g.data.badges.includes('misty'):c.id==='route2-aide'?!!g.data.kantoWorld.visited.diglett:c.entries.some(id=>done(g,id)||prerequisite(g,nodes.get(id))))).map(c=>({...c,entries:c.entries.map(id=>{const n=nodes.get(id),revealed=!!n.trainer||done(g,id)||prerequisite(g,n),known=g.challengeLevelsKnown(id,done(g,id));return {id,name:revealed?n.name:'???',sprite:n.sprite,revealed,team:revealed?n.team||[]:[],levelsKnown:known,done:done(g,id),ready:ready(g,id),automatic:!!n.automatic,type:n.type,reason:n.id==='k-bulbasaur'&&!prerequisite(g,n)?'피카츄와 조금 더 친해진 뒤 찾아와 주세요.':n.id==='k-aide'&&!prerequisite(g,n)?'10종 이상 포획하고 디그다의 굴을 건너와 주세요.':'앞선 일을 마치면 진행할 수 있어요.'};})}))};
}
module.exports={nodes,cases,order,badges,modern,done,ready,prerequisite,gate,gateText,snapshot,fossilBlocked,trainersDone,originalDone,original,aliases};
