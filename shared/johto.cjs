'use strict';
const {data,species}=require('../desktop/pokemon.cjs');
const parties=require('../desktop/data/johto-data.json').parties;
const team=(group,n=1)=>JSON.parse(JSON.stringify(parties[group][n-1].team));
const nodes=new Map(),groups=[];
function add(id,title,type,requires=[],options={}){const n={id,title,name:title,type,requires,...options};nodes.set(id,n);return n;}
function group(id,title,description,requires=[]){const g={id,title,description,requires,steps:[]};groups.push(g);return g;}
function step(g,id,title,type,requires=[],options={}){const n=add(id,title,type,requires,{group:g.id,...options});g.steps.push(id);return n;}
const gyms=[
 ['falkner','비상','도라지시티','윙배지','Falkner','j-sprout'],['bugsy','호일','고동마을','인섹트배지','Bugsy','j-well-boss'],['whitney','꼭두','금빛시티','레귤러배지','Whitney','j-ilex'],['morty','유빈','인주시티','팬텀배지','Morty','j-burned'],
 ['chuck','사도','진청시티','쇼크배지','Chuck','j-lighthouse'],['jasmine','규리','담청시티','스틸배지','Jasmine','j-amphy'],['pryce','류옹','황토마을','아이스배지','Pryce','j-generator-3'],['clair','이향','검은먹시티','라이징배지','Clair','j-ice-path']
].map(([key,name,location,badge,source,gate],i)=>add('j-'+key,name,'gym',[gate,...(i?['j-'+['falkner','bugsy','whitney','morty','chuck','jasmine','pryce'][i-1]]:[])],{location,badge,team:team(source),sprite:'j-'+key,portrait:'j-'+key,index:i}));
// The postgame route is linear here; the original permits more freedom.
const revisits=[['surge','마티스','갈색시티','오렌지배지','LtSurge','j-ship'],['sabrina','초련','노랑시티','골드배지','Sabrina','j-k-surge'],['misty','이슬','블루시티','블루배지','Misty','j-power-return'],['erika','민화','무지개시티','무지개배지','Erika','j-k-misty'],['janine','도희','연분홍시티','핑크배지','Janine','j-k-erika'],['brock','웅','회색시티','회색배지','Brock','j-k-snorlax'],['blaine','강연','쌍둥이섬','진홍색배지','Blaine','j-k-brock'],['blue','그린','상록시티','그린배지','Blue','j-k-blaine']].map(([key,name,location,badge,source,gate],i)=>add('j-k-'+key,name,'kanto-gym',[gate,...(i===5?['j-k-janine']:[])],{location,badge,team:team(source),sprite:'j-'+key,portrait:['janine','blue'].includes(key)?'j-'+key:key,index:i,secret:key==='blue'}));
const league=[['will','일목','Will'],['koga','독수','Koga'],['bruno','시바','Bruno'],['karen','카렌','Karen'],['lance','목호','Champion']].map(([key,name,source],i)=>add('j-league-'+key,name,'league',[],{team:team(source),sprite:'j-'+key,portrait:'j-'+key,index:i,secret:i===4}));
add('j-league','성도 포켓몬 리그','league-start',['j-dragon-den','j-victory-road'],{sprite:'j-will'});
const lab=group('j-lab','연두마을의 연구소','새로운 지방의 포켓몬을 연구하는 공박사를 만나 보세요.');
step(lab,'j-arrival','공박사의 연구소','dialogue',[],{sprite:'j-elm',pages:['성도에 온 걸 환영한다! 함께 온 동료들도 믿음직하구나.','이 지방에서도 포켓몬을 만나고, 체육관에 도전하며 너희만의 모험을 이어 가 보렴.'],after:'j-arrival'});
for(const id of [152,155,158])step(lab,'j-partner-'+id,species.get(id).name,'gift',['j-arrival'],{gift:id,level:5,starter:true,sprite:'pokemon:'+id,pages:['공박사가 맡아 돌보던 포켓몬이다. 함께 새로운 지방을 둘러보기로 했다.']});
const early=group('j-early','도라지시티로 가는 길','모다피탑의 장로가 동료와 호흡을 맞춰 보자고 해요.',['j-partner']);
step(early,'j-sprout','모다피탑의 장로','trainer',['j-partner'],{team:team('Sage',9),sprite:'j-sage',intro:['탑의 기둥처럼 유연하면서도 흔들리지 않는 마음이 필요하지.','너와 동료가 얼마나 서로를 믿는지 보여 주겠니?']});
const well=group('j-well','고동마을의 야돈우물','마을에서 야돈이 사라졌어요. 우물 안에서 수상한 사람들이 목격됐대요.',['j-falkner']);
step(well,'j-well-grunt','로켓단 조무래기','trainer',['j-falkner'],{team:team('GruntM',1),sprite:'j-grunt'});
step(well,'j-well-boss','로켓단 간부','trainer',['j-well-grunt'],{team:team('GruntM',4),sprite:'j-executive',rewardText:'야돈들이 무사히 마을로 돌아갔어요. 고동체육관에도 도전할 수 있어요.'});
add('j-ilex','너도밤나무숲','dialogue',['j-bugsy'],{sprite:'pokemon:83',pages:['숲에서 길을 잃은 파오리를 주인에게 데려다주었다.','울창한 나무 사이로 금빛시티에 가는 길을 찾았다.']});
const tree=group('j-tree','움직이는 나무','길 한가운데 나무 같은 무언가가 서 있어요. 자세히 보니 조금씩 움직이는 것 같아요.',['j-whitney']);
step(tree,'j-sudowoodo','길을 막은 나무','wild',['j-whitney'],{pokemon:185,level:20,sprite:'pokemon:185',repeatMissing:true,item:'squirt-bottle',intro:['물을 뿌리자 나무처럼 보이던 포켓몬이 펄쩍 뛰어올랐다!']});
const burned=group('j-burned-tower','불탄탑','오래전에 불탔다고 하는 탑이에요. 아래층에서 무언가 움직이는 소리가 들려요.',['j-sudowoodo']);
step(burned,'j-burned','불탄탑 조사','dialogue',['j-sudowoodo'],{sprite:'j-eusine',pages:['무너진 바닥 아래에서 세 포켓몬이 눈을 떴다.','서로 다른 방향으로 뛰쳐나간 발자국이 성도 곳곳으로 이어졌다.'],encounterSeen:[243,244,245]});
const dance=group('j-dance','인주시티 무용장','다섯 무희가 각자의 동료와 배틀을 기다리고 있어요.',['j-morty']);
for(let i=0;i<5;i++)step(dance,'j-kimono-'+i,['불꽃','에스퍼','악','물','전기'][i]+'의 무희','trainer',[i?'j-kimono-'+(i-1):'j-morty'],{team:team('KimonoGirl',i+2),sprite:'j-kimono'});
const light=group('j-coast','바다 건너 전해 줄 마음','담청시티 등대의 빛이 약해졌어요. 규리가 아픈 포켓몬 곁을 지키고 있어요.',['j-kimono-4']);
step(light,'j-lighthouse','등대의 부탁','dialogue',['j-kimono-4'],{sprite:'j-jasmine',pages:['등대를 밝히던 전룡의 기운이 없어 보인다.','규리가 진청시티의 약국에서 약을 구해 달라고 부탁했다.'],encounterSeen:[181]});
step(light,'j-medicine','진청시티의 약국','dialogue',['j-chuck'],{sprite:'j-scientist',pages:['약사에게 등대의 포켓몬에 대해 설명했다.','비전신약을 받아 소중히 가방에 넣었다.'],item:'secret-potion'});
step(light,'j-amphy','등대에 약 전하기','dialogue',['j-medicine'],{sprite:'pokemon:181',pages:['약을 먹은 전룡이 힘차게 울었다. 등대의 빛이 다시 바다를 비춘다.','규리도 안심한 표정으로 체육관에 돌아갔다.']});
const rage=group('j-rage-lake','분노의 호수','호수의 포켓몬들이 사나워졌어요. 물결 사이로 붉은 그림자가 보여요.',['j-jasmine']);
step(rage,'j-red-gyarados','호수의 붉은 그림자','wild',['j-jasmine'],{pokemon:130,level:30,shiny:true,sprite:'pokemon:130',repeatMissing:true,intro:['호수 한가운데에서 붉은 갸라도스가 솟아올랐다!']});
const hq=group('j-rocket-hq','황토마을의 수상한 가게','호수에서 들리던 이상한 전파가 마을의 작은 가게로 이어져요.',['j-red-gyarados']);
step(hq,'j-hq-grunt','로켓단 조무래기','trainer',['j-red-gyarados'],{team:team('GruntM',10),sprite:'j-grunt'});
step(hq,'j-hq-executive','로켓단 간부','trainer',['j-hq-grunt'],{team:team('ExecutiveM',4),sprite:'j-executive'});
step(hq,'j-hq-executivef','로켓단 간부','trainer',['j-hq-executive'],{team:team('ExecutiveF',2),sprite:'j-executivef'});
for(let i=1;i<=3;i++)step(hq,'j-generator-'+i,'전파 발생 장치 '+i,'wild',[i===1?'j-hq-executivef':'j-generator-'+(i-1)],{pokemon:101,level:23,sprite:'pokemon:101',intro:['장치에 연결된 붐볼을 진정시키면 전파를 멈출 수 있을 것 같다.']});
const radio=group('j-radio-tower','금빛시티 라디오타워','평소와 다른 방송이 흘러나와요. 금빛시티 사람들이 걱정하고 있어요.',['j-pryce']);
step(radio,'j-radio-imposter','라디오타워의 국장','trainer',['j-pryce'],{team:team('ExecutiveM',3),sprite:'j-executive',intro:['그 국장이 수상한 미소를 지었다.','국장으로 변장한 로켓단이었다!']});
step(radio,'j-radio-underground','지하창고 조사','trainer',['j-radio-imposter'],{team:team('GruntM',20),sprite:'j-grunt'});
step(radio,'j-radio-executive','로켓단 간부','trainer',['j-radio-underground'],{team:team('ExecutiveM',2),sprite:'j-executive'});
step(radio,'j-radio-executivef','로켓단 간부','trainer',['j-radio-executive'],{team:team('ExecutiveF',1),sprite:'j-executivef'});
step(radio,'j-radio-final','로켓단 간부','trainer',['j-radio-executivef'],{team:team('ExecutiveM',1),sprite:'j-executive',item:'clear-bell',rewardText:'라디오타워에 평소의 방송이 돌아왔어요. 국장이 감사의 인사를 전했어요.'});
add('j-ice-path','얼음샛길','dialogue',['j-radio-final'],{sprite:'pokemon:220',pages:['얼어붙은 바위 사이에서 길을 찾아 앞으로 나아갔다.','멀리 검은먹시티의 불빛이 보이기 시작했다.']});
add('j-dragon-den','용의 굴','dialogue',['j-clair'],{sprite:'j-sage',pages:['용의 굴 장로가 동료와 함께했던 모험에 대해 물었다.','포켓몬은 함께 걷는 친구라고 대답했다. 장로가 조용히 미소 지었다.'],gift:147,level:15});
add('j-victory-road','챔피언로드','dialogue',['j-dragon-den'],{sprite:'j-silver',pages:['긴 동굴을 지나 리그로 향하는 출구에 도착했다.','너와 동료들이 걸어온 길을 돌아보며 마지막 준비를 마쳤다.']});
const extras=group('j-side','성도의 작은 만남','도시와 길목에서 전해 오는 이야기를 살펴보세요.',['j-arrival']);
step(extras,'j-togepi','공박사의 조수','egg',['j-falkner'],{egg:175,sprite:'j-scientist',pages:['공박사가 맡긴 알이야. 네가 동료들과 함께 돌봐 주겠니?']});
step(extras,'j-odd-egg','34번도로의 키우미집','odd-egg',['j-ilex'],{repeatEgg:true,sprite:'j-sage',pages:['키우미집에서 신기한 알을 맡아 달라는 연락이 왔다.','어떤 포켓몬이 나올지는 부화할 때까지 알 수 없다.']});
step(extras,'j-ruins','알프의유적','dialogue',['j-falkner'],{sprite:'j-scientist',pages:['흩어진 석판을 맞추자 벽화가 모습을 드러냈다.','유적 안에서 낯선 문자처럼 생긴 포켓몬의 기척이 느껴진다.']});
step(extras,'j-eusine','진청시티의 수호','trainer',['j-chuck'],{team:team('Mysticalman'),sprite:'j-eusine',intro:['불탄탑에서 만났던 수호가 네게 다가왔다.','그 포켓몬을 쫓는 마음만큼은 누구에게도 지지 않아. 네 실력도 보여 줘!']});
step(extras,'j-shuckle','진청시티의 부탁','gift',['j-chuck'],{gift:213,level:15,sprite:'pokemon:213',pages:['마을의 트레이너가 단단지를 안전하게 맡아 달라고 부탁했다.']});
step(extras,'j-kiyo','절구산의 태권왕','trainer',['j-jasmine'],{team:team('Blackbelt',6),sprite:'j-blackbelt',gift:236,level:10,rewardText:'태권왕이 함께 수련하던 동료를 맡겼어요.'});
step(extras,'j-bill','금빛시티의 이수재','gift',['j-morty'],{gift:133,level:20,sprite:'j-scientist',pages:['인주시티에서 만났던 이수재가 금빛시티의 집으로 돌아왔다.','연구를 도와준 답례로 이브이를 맡아 주면 좋겠다고 한다.']});
step(extras,'j-park','자연공원 곤충채집대회','dialogue',['j-whitney'],{sprite:'j-sage',pages:['공원의 풀숲을 차분히 살펴보며 채집대회에 참가했다.','동료들을 배려한 모습이 좋은 평가를 받았다. 참가 기념으로 태양의돌을 받았다.'],inventory:{80:1}});
const bell=group('j-bell-tower','방울탑의 시험','오래된 방울 소리에 탑의 문을 지키던 현자들이 반응해요.',['j-radio-final','j-eusine']);
for(let i=0;i<3;i++)step(bell,'j-bell-sage-'+i,'방울탑의 현자','trainer',[i?'j-bell-sage-'+(i-1):'j-radio-final',...(i?[]:['j-eusine'])],{team:team('Sage',i+10),sprite:'j-sage'});
add('j-rainbow','방울탑의 오래된 전설','dialogue',['j-league-lance'],{sprite:'j-sage',needsBeasts:true,pages:['세 포켓몬과 마음을 나눈 너를 현자가 탑 안으로 안내했다.','무지갯빛 날개가 조용히 빛났다. 더 높은 곳으로 이어지는 길이 열렸다.'],item:'rainbow-wing'});
const ship=group('j-ship-route','고속선 아쿠아호','관동행 고속선의 승선 안내가 도착했어요.',['j-league-lance']);
step(ship,'j-ship','아쿠아호의 작은 소동','trainer',['j-league-lance'],{team:team('Sailor',1),sprite:'j-sailor',intro:['배 안에서 길을 잃은 아이를 할아버지에게 데려다주었다.','선원이 갈색시티에 닿기 전 가벼운 배틀을 권했다.'],rewardText:'고속선이 갈색시티에 도착했어요. 다시 만날 관장들이 기다리고 있어요.'});
const power=group('j-power-plant','관동의 멈춘 발전소','관동의 발전소가 멈춰 라디오 방송에도 문제가 생겼어요.',['j-k-sabrina']);
step(power,'j-power-grunt','수상한 로켓단 조무래기','trainer',['j-k-sabrina'],{team:team('GruntM',31),sprite:'j-grunt'});
step(power,'j-power-return','사라진 부품 찾기','dialogue',['j-power-grunt'],{sprite:'j-scientist',pages:['조무래기가 숨겨 둔 기계부품을 찾아 발전소에 돌려주었다.','발전소가 다시 움직인다. 보라타운 라디오타워에서도 방송이 정상으로 돌아왔다는 소식이 왔다.'],item:'expansion-card'});
const road=group('j-kanto-road','디그다의굴 앞의 잠만보','커다란 포켓몬이 굴 입구를 막고 잠들어 있어요. 라디오에서 들리는 곡에 귀가 꿈틀거려요.',['j-k-janine','j-power-return']);
step(road,'j-k-snorlax','잠든 포켓몬 깨우기','wild',['j-k-janine','j-power-return'],{pokemon:143,level:50,sprite:'pokemon:143',repeatMissing:true,intro:['라디오의 피리 소리에 잠만보가 천천히 눈을 떴다!']});
step(extras,'j-silver-wing','회색시티의 노인','dialogue',['j-k-brock'],{sprite:'j-sage',pages:['회색시티의 노인이 젊은 시절 바다에서 보았던 포켓몬의 이야기를 들려주었다.','노인이 간직해 온 은빛 날개를 네게 건넸다.'],item:'silver-wing'});
add('j-red','은빛산의 정상','trainer',revisits.map(n=>n.id),{name:'레드',team:team('Red'),sprite:'j-red',portrait:'j-red',secret:true,intro:['산 정상에 한 트레이너가 서 있었다.','…… …… ……!'],win:['…… …… ……!'],rewardText:'은빛산의 정상에서 잊지 못할 배틀을 마쳤어요.'});
add('j-gs-ball','금빛시티의 뜻밖의 연락','dialogue',['j-red'],{needsDex:true,sprite:'j-scientist',pages:['성도의 포켓몬을 깊이 알아 온 너에게 맡기고 싶은 물건이 있다는 연락을 받았다.','신비한 GS볼을 받았다. 너도밤나무숲의 사당이 문득 떠오른다.'],item:'gs-ball'});
add('j-shrine','너도밤나무숲의 사당','dialogue',['j-gs-ball'],{sprite:'item:j-gs-ball',pages:['사당 앞에 서자 GS볼에서 따뜻한 빛이 흘러나왔다.','바람이 불지 않는데 나뭇잎이 흔들린다. 숲에서 새로운 만남이 기다리는 것 같다.']});
const rivalGates=[['j-sprout','Rival1',1],['j-ilex','Rival1',4],['j-burned','Rival1',7],['j-radio-underground','Rival1',10],['j-victory-road','Rival1',13],['j-k-brock','Rival2',1]];
const rivalNodes=rivalGates.map(([target,source,offset],i)=>add('j-rival-'+i,'실버','rival',[],{target,source,offset,index:i,sprite:i===5?'j-silver-late':'j-silver',intro:i===0?['낯선 소년이 네 앞을 가로막았다.','네 포켓몬이 얼마나 강한지 확인해 보겠어!']:['실버가 다시 네 앞에 나타났다.','지난번과 같을 거라고 생각하지 마. 시작하자!'],win:i>=4?['…… 나한테 부족했던 게 뭔지, 조금은 알 것 같아.']:['흥. 다음에는 지지 않겠어.'],loss:['아직 끝난 게 아니야. 다시 덤빌 거면 제대로 준비해.']}));
const eventSpecies=new Set([152,153,154,155,156,157,158,159,160,172,173,174,175,176,185,236,238,239,240,243,244,245,249,250,251]);
const specialIds=[243,244,245,249,250,251],starterFamilies=new Set([152,153,154,155,156,157,158,159,160]);
const routeGates=new Map();
function routes(ids,gate){for(const id of ids)routeGates.set(id,gate);}
routes([123,127],'j-park');routes([113,115,128,131],'j-morty');
routes([179,180,181,183,184,187,188,189,194,195],'j-falkner');routes([190,193,191,192,204,205,209,210,214],'j-ilex');routes([177,178,201,235],'j-ruins');routes([170,171,202,203,211,213,216,217,222,226,231,232,234,241],'j-morty');routes([223,224],'j-pryce');routes([215,220,221,225],'j-ice-path');routes([227],'j-clair');routes([198,218,219,228,229],'j-ship');routes([200,246,247,248],'j-k-blue');routes([243,244],'j-burned');routes([245],'j-bell-sage-2');routes([249],'j-silver-wing');routes([250],'j-rainbow');routes([251],'j-shrine');
const noWild=new Set([...starterFamilies,172,173,174,175,176,185,236,238,239,240]);
function active(game){return !!game.data.johtoUnlocked;}
function init(game){game.data.johto ||= {revision:1,cleared:{},rivals:{},items:{},starterChoice:null,champion:false,leagueBest:0};const s=game.data.johto;s.cleared ||= {};s.rivals ||= {};s.items ||= {};return s;}
function done(game,id){return !!game.data.johto?.cleared[id];}
function nativeDex(game){return data.pokemon.filter(p=>p.generation===2&&!!game.data.caught[p.id]).length;}
function available(game,n){
 if(!active(game)||!n||!n.requires.every(id=>done(game,id)))return false;
 if(n.type==='league')return false; // The five stages are entered through the league only.
 if(n.type==='rival')return game.data.johto.rivals[n.id]?.state==='retry';
 if(n.needsBeasts&&![243,244,245].every(id=>game.data.caught[id]))return false;
 if(n.needsDex&&data.pokemon.some(p=>p.generation===2&&p.id!==251&&!game.data.caught[p.id]))return false;
 if(n.starter){const count=Object.keys(game.data.johto.cleared).filter(id=>id.startsWith('j-partner-')).length,allowed=done(game,'j-jasmine')?3:done(game,'j-bugsy')?2:1;if(count>=allowed)return false;}
 if(done(game,n.id))return !!(n.repeatMissing&&(n.shiny?!Object.values(game.data.owned).some(p=>p.id===n.pokemon&&p.shiny):game.captureRequested(n.pokemon))||n.repeatEgg&&!game.data.egg);
 if(['egg','odd-egg'].includes(n.type)&&game.data.egg)return false;
 const gate=rivalNodes.find(r=>r.target===n.id);return !gate||game.data.johto.rivals[gate.id]?.state!=='retry';
}
function rivalTeam(game,n){const first=game.data.johto?.starterChoice||152,variant=first===152?1:first===155?2:0;return team(n.source,n.offset+variant);}
function battleBoss(game,id){const n=nodes.get(id);return n?.type==='rival'?{...n,team:rivalTeam(game,n)}:n;}
function wildExclusions(game){const excluded=new Set(noWild);for(const [id,gate]of routeGates)if(!done(game,gate))excluded.add(id);return [...excluded];}
function bonuses(game){
 const s=game.data.johto,ordinary=data.pokemon.filter(p=>p.generation===2&&!specialIds.includes(p.id)).every(p=>game.data.caught[p.id]);
 return specialIds.filter(id=>done(game,routeGates.get(id))&&!game.data.caught[id]).map(id=>({id,extra:id===251?.01:.001+(s.champion?.003:0)+(done(game,'j-red')?.0015:0)+(ordinary?.002:0)}));
}
function snapshot(game){
 const s=init(game),reveal=n=>!n.secret||done(game,n.id)||available(game,n)||game.data.battle?.johtoId===n.id;
 const row=n=>{
  const shown=reveal(n),ready=available(game,n),cleared=done(game,n.id);
  const button=cleared&&!n.repeatMissing&&!n.repeatEgg?'완료':n.type==='gift'?'함께하기':['egg','odd-egg'].includes(n.type)?game.data.egg?'돌보는 알이 있어요':'알 맡기기':n.type==='dialogue'?'살펴보기':'도전하기';
  const hint=ready?'':cleared?'완료했어요.':!n.requires.every(id=>done(game,id))?'앞선 모험을 마치면 도전할 수 있어요.':n.needsBeasts?'성도의 전설과 더 깊은 인연이 필요해요.':n.needsDex?'성도의 도감을 더 채워 보세요.':'다음 만남을 기다려 주세요.';
  return {id:n.id,name:shown?n.name:'???',title:shown?n.title:'???',type:n.type,location:n.location,badge:n.badge,sprite:shown?n.sprite:null,portrait:shown?n.portrait:null,revealed:shown,team:shown?n.team||[]:[],done:cleared,canChallenge:ready,button,hint};
 };
 const cards=groups.filter(g=>g.requires.every(id=>done(game,id))).map(g=>{
  const eligible=g.steps.map(id=>nodes.get(id)).filter(n=>n.requires.every(r=>done(game,r))||done(game,n.id)),next=eligible.find(n=>!done(game,n.id));
  const completed=g.steps.every(id=>done(game,id));return {id:g.id,title:g.title,description:completed?'이곳의 일을 무사히 마쳤어요. 함께했던 모험은 기록에 남아 있어요.':g.description,done:completed,steps:g.steps.map((id,i)=>{const n=nodes.get(id),shown=done(game,id)||n===next||n.starter&&done(game,'j-arrival');return {...row(n),name:shown?n.name:'???',title:shown?n.title:'???',revealed:shown,team:shown?n.team||[]:[],sprite:n.sprite,canChallenge:shown&&available(game,n)};})};
 });
 const latest=[...rivalNodes].reverse().find(n=>s.rivals[n.id]?.state);
 const special=[nodes.get('j-ilex'),nodes.get('j-ice-path'),nodes.get('j-dragon-den'),nodes.get('j-victory-road'),nodes.get('j-rainbow'),nodes.get('j-gs-ball'),nodes.get('j-shrine'),nodes.get('j-red')].filter(n=>n.requires.every(id=>done(game,id))||done(game,n.id)).filter(n=>!n.needsDex||available(game,n)||done(game,n.id)).map(row);
 const leagueIndex=game.data.battle?.johtoLeague?game.data.battle.foeStage:0;
 return {active:active(game),region:s.champion&&done(game,'j-ship')?'성도 · 관동 재방문':'성도 지방',badges:gyms.filter(n=>done(game,n.id)&&(n.id!=='j-clair'||done(game,'j-dragon-den'))).map(n=>n.id),kantoBadges:revisits.filter(n=>done(game,n.id)).map(n=>n.id),champion:s.champion,completed:done(game,'j-red'),gyms:gyms.map(row),kantoGyms:done(game,'j-ship')?revisits.map(row):[],league:league.map((n,i)=>{const shown=i<4||s.champion||leagueIndex>=4;return {...row(n),revealed:shown,name:shown?n.name:'???',portrait:shown?n.portrait:null,sprite:shown?n.sprite:null,team:shown?n.team:[]};}),leagueReady:available(game,nodes.get('j-league')),leagueBest:s.leagueBest,cards,special,rival:latest?{...row(latest),name:'실버',team:rivalTeam(game,latest),state:s.rivals[latest.id].state,canChallenge:s.rivals[latest.id].state==='retry'}:null,nativeCaught:nativeDex(game)};
}
module.exports={nodes,groups,gyms,revisits,league,rivalNodes,starterFamilies,eventSpecies,specialIds,routeGates,noWild,team,active,init,done,available,battleBoss,rivalTeam,wildExclusions,bonuses,nativeDex,snapshot};
