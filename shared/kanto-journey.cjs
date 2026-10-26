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
add('fishing-guru','vermilion','갈색시티의 낚시꾼','물가에서 낚시꾼이 이야기를 나누고 있어요.',[
 {id:'k-fishing-rod',name:'낚시꾼과 이야기하기',sprite:'fisherman',item:'fishing-rod',pages:['너도 낚시에 관심이 있니? 이 낚싯대를 가져가렴.','이제 물가에서도 야생 포켓몬을 만날 수 있단다.'],result:'낚싯대를 받았어요. 물가에서 새로운 포켓몬을 만나 보세요.'}
]);
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
add('nugget-bridge','route-24','금구슬다리','다리 건너편에서 만난 사람들과 이야기를 나눠 보세요.',[
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
function done(g,id){
 const n=nodes.get(id),s=g.data.mobileStory;
 if(n?.offer==='Lapras')return !!s?.laprasResolved;
 if(n?.offer==='Device')return !!g.data.trainingDevice?.obtainedAt;
 if(n?.offer==='Mansion')return (s?.mansion?.read||0)>=n.page;
 return !!g.data.kantoStory?.cleared[id];
}
add('silph-employee','saffron','실프주식회사 직원','직원이 당신에게 이야기를 건네요.',[
 {id:'k-lapras-visit',name:'직원과 이야기하기',offer:'Lapras',result:'직원에게 맡은 동료와 함께 모험해요.'}
]);
add('route15-aide','route-15','오박사의 조수','조수가 도감 연구 이야기를 듣고 싶어 해요.',[
 {id:'k-device-visit',name:'조수와 이야기하기',offer:'Device',result:'조수에게 연구를 도운 답례를 받았어요.'}
]);
add('mansion-journal','mansion','저택의 연구일지','저택에서 발견한 기록을 읽어 보세요.',[1,2,3].map(page=>({id:'k-mansion-page-'+page,name:'연구일지 '+page+'장 읽기',sprite:'item:journal',offer:'Mansion',page,result:'저택에 남겨진 기록을 확인했어요.'})));
const original=require('./kanto-trainers.json'),used=new Set(),sourceNodes=new Map();
// Wild-map membership describes ordinary encounters, not permission to play
// a story incident. Rockets and the fossil guardian always require a click.
function bind(n,t){used.add(t.id);sourceNodes.set(t.id,n);Object.assign(n,{name:t.name,sprite:t.sprite,team:t.team.map(p=>({...p,moves:learnedMoves(p.id,p.level).slice(-4)})),trainer:true,automatic:!!t.automatic&&t.class!=='ROCKET'&&n.id!=='k-moon-scientist'&&!t.location.startsWith('gym:'),source:{map:t.map,event:t.event,x:t.x,y:t.y,class:t.class,partyIndex:t.partyIndex}});}
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
// Original map bindings may change an authored placeholder's trainer class.
// Keep story text attached to the actual Rocket opponents, not their old slot.
for(const id of moonRows){const n=nodes.get(id);if(n.source.class==='ROCKET'){n.pages=['이 동굴의 화석은 로켓단이 가져가겠다!'];n.result='화석을 노리던 로켓단 조무래기를 물리쳤어요.';}else{n.pages=[n.name+'이 승부를 걸어왔다!'];n.result='동굴 안쪽으로 향해요.';}}
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
  nodes.set(id,{...originalTrainer,id,source:undefined,adaptedFrom:originalTrainer.id,team:originalTrainer.team.slice(-1).map(p=>({...p,moves:[...p.moves]}))});
  group.entries.push(id);
 }
 group.description='두 트레이너와 승부한 뒤 관장에게 도전해요. 한 번 이긴 상대와는 다시 싸우지 않아요.';
}
function trainersDone(g,caseId){const group=cases.find(c=>c.id===caseId);return !!group&&group.entries.filter(id=>nodes.get(id).trainer).every(id=>done(g,id));}
function caseDone(g,caseId){const group=cases.find(c=>c.id===caseId);return !!group&&group.entries.every(id=>done(g,id));}
function originalDone(g,location){if(location.startsWith('gym:'))return trainersDone(g,'trainers-'+location.replace(':','-'));return original.trainers.filter(t=>t.location===location&&!Object.values(aliases).some(a=>a.id===t.id)).every(t=>done(g,sourceNodes.get(t.id)?.id));}
function fossilBlocked(g,id){const f=g.data.kantoStory?.fossil;return f===138?[140,141].includes(id):f===140?[138,139].includes(id):false;}
function trainerAccess(g,n){
 const p=n.source,surf=!!g.data.mobileStory?.safari?.completedAt;
 // Pinned Yellow object coordinates distinguish shore-only opponents and
 // the opposite sides of caves. Keep parties and one-time IDs unchanged.
 if(p?.map==='Route4')return surf;
 if(p?.map==='Route10')return p.y===44?surf:p.y<30||trainersDone(g,'tunnel-path');
 if(p?.map==='Route20')return surf&&(p.x>=58||done(g,'k-seafoam-2'));
 return true;
}
function gymEntry(g,index){
 const has=id=>g.data.badges.includes(id),previous=order.slice(0,order.indexOf(index));
 if(has(badges[index]))return {open:true,reason:''};
 if(index===7&&!previous.every(i=>has(badges[i])))return {open:false,reason:'상록체육관은 문이 닫혀 있어요. 관장은 자리를 비운 것 같아요.'};
 if(!previous.every(i=>has(badges[i])))return {open:false,reason:'앞선 체육관에서 실력을 증명한 뒤 찾아오세요.'};
 const blocked={0:!trainersDone(g,'forest-path'),1:!done(g,'k-moon-duo'),2:!done(g,'k-captain'),4:!Object.values(g.data.kantoStory?.roads||{}).some(Boolean),5:!g.data.mobileStory?.silph?.completedAt,6:!g.data.mobileStory?.mansion?.completedAt};
 const reasons={0:'상록숲의 트레이너들과 승부를 마쳐 주세요.',1:'달맞이산에서 출구로 가는 길을 찾아야 해요.',2:'나무가 체육관 입구를 막고 있어요. 상트안느호의 선장을 만나 보세요.',4:'연분홍시티로 향하는 길을 먼저 열어야 해요.',5:'로켓단 때문에 체육관에 들어갈 수 없어요. 실프주식회사를 살펴보세요.',6:'홍련체육관의 문이 잠겨 있어요. 저택에서 열쇠를 찾아보세요.'};
 return {open:!blocked[index],reason:blocked[index]?reasons[index]:''};
}
function prerequisite(g,n){
 const s=g.data.kantoStory,b=g.data.badges,has=id=>b.includes(id),win=id=>['won','completed'].includes(g.rivalProgress(id)?.state);
 const at=id=>!!g.data.kantoWorld?.visited[id];
 if(n.offer==='Lapras')return !g.data.mobileStory.laprasResolved&&g.rivalProgress('rival-silph')?.state==='won'&&!!g.data.mobileStory.silph.wins[0];
 if(n.offer==='Device')return !g.data.trainingDevice.obtainedAt&&g.deviceReady();
 if(n.offer==='Mansion'){const m=g.data.mobileStory.mansion;return !!m.startedAt&&!m.completedAt&&m.read===n.page-1&&m.wins>=n.page*2;}
 if(n.trainer&&!trainerAccess(g,n))return false;
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
 if(n.case==='nugget-bridge'&&!has('misty'))return false;
 if(n.case==='nugget-bridge'&&n.id!=='k-bridge-1'&&!win('rival-cerulean'))return false;
 if(n.case==='route3-path'&&!has('brock'))return false;
 if(n.case==='moon-path'&&!trainersDone(g,'route3-path'))return false;
 if(n.case==='route11-path'&&!has('surge'))return false;
 if(n.case==='route9-path'&&!has('surge'))return false;
 if(n.case==='tunnel-path'&&(!done(g,'k-aide')||!done(g,'k-route9-2')))return false;
 if(n.case==='seafoam-crossing'&&!g.data.mobileStory.safari.completedAt)return false;
 if(n.case==='victory-path'&&!win('rival-league'))return false;
 if(n.originalLocation==='hideout')return has('erika')&&!!g.data.trainingDevice.gruntWonAt;
 if(n.originalLocation==='silph')return !!s.drinkAt&&!!g.data.mobileStory.silph.wins[0];
 if(n.originalLocation==='tower')return !!g.data.mobileStory.rescue.wins[0];
 if(n.originalLocation==='mansion')return !!g.data.mobileStory.mansion.startedAt;
 if(n.originalLocation?.startsWith('gym:')){const i=Number(n.originalLocation.slice(4));return !has(badges[i])&&gymEntry(g,i).open&&cases.find(c=>c.id===n.case).entries.includes(n.id);}
 if(n.trainer&&!n.id.startsWith('k-bridge-'))return true;
 const list=cases.find(c=>c.id===n.case).entries,index=list.indexOf(n.id);
 return index===0||done(g,list[index-1]);
}
function ready(g,id){const n=nodes.get(id);return !!n&&!g.data.johtoUnlocked&&!done(g,id)&&g.data.kantoWorld?.location===n.location&&prerequisite(g,n)&&!g.presentation();}
function gate(g,id){
 if(!modern(g))return null;
 const b=g.data.badges,has=id=>b.includes(id),win=id=>['won','completed'].includes(g.rivalProgress(id)?.state),s=g.data.kantoStory;
 if(!s.mapAt&&!['pallet','route-1','viridian'].includes(id))return 'map';
 if(id==='pewter'&&!trainersDone(g,'forest-path'))return 'forest';
 if(id==='mt-moon'&&!trainersDone(g,'route3-path'))return 'route3';
 if(['route-4','cerulean','route-24','route-25','sea-cottage'].includes(id)&&!caseDone(g,'moon-path'))return 'moon';
 if(['route-5','route-6','vermilion','ss-anne'].includes(id)&&!done(g,'k-robber'))return 'robber';
 if(id==='ss-anne'&&!done(g,'k-bill'))return 'ticket';
 if(id==='diglett'&&!trainersDone(g,'route11-path'))return 'route11';
 if(id==='rock-tunnel'&&!done(g,'k-aide'))return 'aide';
 if(id==='rock-tunnel'&&!trainersDone(g,'route9-path'))return 'route9';
 if(['route-10','lavender','tower','route-8','route-7','celadon'].includes(id)&&!trainersDone(g,'tunnel-path'))return 'tunnel';
 if(id==='saffron'&&!s.drinkAt)return 'drink';
 if(id==='route-17'&&!s.roads?.['route-16'])return 'snorlax16';
 // Route 12's Snorlax blocks a crossing, not the whole of Route 13. The map
 // checks that edge so the player can approach from Fuchsia as well.
 if(['route-19','seafoam','route-20','cinnabar','mansion','route-21','power-plant'].includes(id)&&!g.data.mobileStory.safari.completedAt)return 'sea';
 if(id==='route-20'&&!done(g,'k-seafoam-2'))return 'seafoam';
 if(['route-23','victory-road','indigo'].includes(id)&&!win('rival-league'))return 'late-rival';
 if(id==='indigo'&&!trainersDone(g,'victory-path'))return 'victory';
 return null;
}
const gateText={map:'오박사의 심부름을 마치고 타운맵을 받아요.', forest:'상록숲의 트레이너들과 승부를 마쳐 주세요.',route3:'3번도로의 트레이너들과 승부를 마쳐 주세요.',moon:'달맞이산에서 출구로 가는 길을 찾아야 해요.',robber:'블루시티에서 달아난 로켓단을 쫓아가 보세요.',ticket:'승선권이 있어야 배에 오를 수 있어요.',route11:'11번도로에서 굴로 향하는 길을 찾아보세요.',aide:'돌산터널은 너무 어두워요. 2번도로 동쪽의 조수에게 길을 물어보세요.',route9:'9번도로의 트레이너들과 승부를 마쳐 주세요.',tunnel:'돌산터널 안에서 출구를 찾아야 해요.',drink:'경비원이 노랑시티로 들어가는 길을 지키고 있어요.',snorlax16:'커다란 포켓몬이 길을 막고 잠들어 있어요.',snorlax12:'커다란 포켓몬이 길을 막고 잠들어 있어요.',sea:'아직 바다를 안전하게 건너는 방법을 몰라요.',seafoam:'쌍둥이섬 안에서 반대편 출구를 찾아야 해요.','late-rival':'포켓몬리그로 가려면 먼저 22번도로를 지나야 해요.',victory:'챔피언로드의 마지막 관문을 넘어야 해요.'};
function moonDescription(g,defeated){
 const cleared=id=>id===defeated||done(g,id),rockets=moon.entries.filter(id=>nodes.get(id).source?.class==='ROCKET');
 if(moon.entries.every(cleared))return '화석을 노리던 로켓단을 모두 물리쳤어요. 4번도로를 지나 블루시티로 향해요.';
 if(cleared('k-fossil-choice'))return '화석을 챙겼어요. 출구 쪽에서 누군가 다가오는 소리가 들려요.';
 if(cleared('k-moon-scientist'))return '화석 앞을 지키던 연구원을 이겼어요. 함께 발견한 화석을 하나씩 나누기로 했어요.';
 if(rockets.every(cleared))return '화석을 노리던 로켓단 조무래기를 물리쳤어요. 동굴 깊은 곳에서 누군가 화석을 지키고 있어요.';
 if(rockets.some(cleared))return '화석을 노리던 로켓단과 맞붙었어요. 동굴 안쪽에도 로켓단이 남아 있어요.';
 return '달맞이산 깊은 곳에서 로켓단이 화석을 노리고 있어요. 동굴 안쪽에서 무슨 일이 벌어지는지 살펴보세요.';
}
function moonOutline(g,rows=[]){
 const s=g.data.kantoStory,readOnly=!!g.data.johtoUnlocked,rockets=moon.entries.filter(id=>nodes.get(id).source?.class==='ROCKET'),ids=[...rockets,'k-moon-scientist','k-fossil-choice','k-moon-duo'];
 const fossils={138:{name:'조개화석',sprite:'helix-fossil'},140:{name:'껍질화석',sprite:'dome-fossil'}},selected=fossils[s.fossil];
 const entries=ids.map((id,i)=>{
  const n=nodes.get(id),recorded=done(g,id),revealed=recorded||i<rockets.length||id==='k-moon-scientist'&&rockets.every(id=>done(g,id))||id==='k-fossil-choice'&&done(g,'k-moon-scientist')||id==='k-moon-duo'&&done(g,'k-fossil-choice');
  const name=i<rockets.length?'로켓단 조무래기 '+(i+1):id==='k-moon-scientist'?'화석을 지키는 연구원':id==='k-fossil-choice'?selected?selected.name+' 획득':'화석 한 개 선택':'로이·로사';
  const base=rows.find(r=>r.id===id)||{id,ready:false,automatic:false};
  return {...base,name:revealed?name:'???',sprite:id==='k-fossil-choice'?null:n.sprite,revealed,team:revealed&&n.team?n.team:[],done:recorded,readOnly,levelsKnown:g.challengeLevelsKnown(id,recorded),ready:!readOnly&&!!base.ready,reward:id==='k-fossil-choice'&&revealed?{selected:selected?String(s.fossil):null,label:selected?'받은 화석':'두 화석 중 한 개 선택',items:selected?[selected]:Object.values(fossils)}:null};
 });
 return {...moon,title:'달맞이산의 로켓단',ordered:true,completed:caseDone(g,'moon-path'),description:moonDescription(g),entries};
}
function snapshot(g){
 const s=g.data.kantoStory;if(!s)return null;
 const here=g.data.kantoWorld?.location,groups=[];
 for(const c of cases.filter(c=>c.location===here)){
  // Ambient opponents still exist in the encounter ledger and travel gates,
  // but are not errands for the player to select, before or after a victory.
  const visible=c.entries.filter(id=>!nodes.get(id).automatic);if(!visible.length)continue;
  if(c.id.startsWith('trainers-gym-')&&!gymEntry(g,Number(c.id.slice(13))).open)continue;
  if(!(c.id==='moon-path'||(c.id==='melanie'?g.data.badges.includes('misty'):c.id==='route2-aide'?!!g.data.kantoWorld.visited.diglett:visible.some(id=>done(g,id)||prerequisite(g,nodes.get(id))))))continue;
  const completed=visible.every(id=>done(g,id));
  const entries=visible.map(id=>{const n=nodes.get(id),allowed=prerequisite(g,n),revealed=!!n.trainer||done(g,id)||allowed,known=g.challengeLevelsKnown(id,done(g,id));return {id,name:revealed?n.name:'???',sprite:n.sprite,revealed,team:revealed?n.team||[]:[],levelsKnown:known,done:done(g,id),readOnly:!!g.data.johtoUnlocked,ready:ready(g,id),automatic:false,type:n.type,reason:c.id==='moon-path'&&!trainersDone(g,'route3-path')?gateText.route3:n.id==='k-bulbasaur'&&!allowed?'피카츄와 조금 더 친해진 뒤 찾아와 주세요.':n.id==='k-aide'&&!allowed?'10종 이상 포획하고 디그다의 굴을 건너와 주세요.':'앞선 일을 마치면 진행할 수 있어요.'};});
  if(c.id==='moon-path'){
   groups.push(moonOutline(g,entries));
  }else{const last=nodes.get(c.entries.at(-1));groups.push({...c,completed,description:c.id==='tower-rumor'?towerDescription(g):completed?(last.source?'이곳의 트레이너들과 승부를 모두 마쳤어요.':last.result):c.description,entries});}
 }
 const context=groups.find(c=>!c.id.startsWith('trainers-')&&c.id!=='moon-trainers');let placeSummary=context?.description||'';
 if(context?.id==='moon-path'){
  if(caseDone(g,'moon-path'))placeSummary='로켓단을 모두 물리쳤어요. 다음은 4번도로 너머 블루시티예요.';
  else placeSummary=moonDescription(g).split('. ')[0]+'.';
 }
 return {mapObtained:!!s.mapAt,dexObtained:!!s.dexAt,guided:modern(g)&&!g.data.johtoUnlocked&&!s.mapAt,fossil:s.fossil,legacy:!!s.legacy,placeSummary,cases:groups};
}
function towerDescription(g){
 const m=g.data.mobileStory;
 if(m.rescue.completedAt)return '어미 텅구리의 영혼이 안식을 찾고, 등나무노인도 무사히 돌아왔어요.';
 if(m.rescue.wins[1])return '어미 텅구리의 영혼이 안식을 찾았어요. 위층에 붙잡힌 사람을 구하러 가요.';
 if(m.scopeObtainedAt)return '실프스코프로 유령의 정체를 확인할 수 있어요. 탑 위층을 살펴보세요.';
 return done(g,'k-tower-visit')?'유령의 정체를 확인할 방법을 찾아야겠어요.':'탑 위쪽에서 알 수 없는 기척이 느껴져요.';
}
module.exports={gymEntry,nodes,cases,order,badges,modern,done,ready,prerequisite,gate,gateText,snapshot,moonDescription,fossilBlocked,trainerAccess,trainersDone,originalDone,original,aliases};
