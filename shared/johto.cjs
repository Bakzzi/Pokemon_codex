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
const lab=group('j-lab','공박사의 소식','공박사가 새로운 동료를 맡아 줄 트레이너를 찾고 있어요.');
step(lab,'j-arrival','공박사의 연구소','dialogue',[],{sprite:'j-elm',pages:['성도에 온 걸 환영한다! 함께 온 동료들도 믿음직하구나.','이 지방에서도 포켓몬을 만나고, 체육관에 도전하며 너희만의 모험을 이어 가 보렴.'],after:'j-arrival'});
for(const id of [152,155,158])step(lab,'j-partner-'+id,species.get(id).name,'gift',['j-arrival'],{gift:id,level:5,starter:true,sprite:'pokemon:'+id,pages:['공박사가 맡아 돌보던 포켓몬이다. 함께 새로운 지방을 둘러보기로 했다.']});
const early=group('j-early','모다피탑의 수행','비상에게 도전하려면 모다피탑에서 장로의 인정을 받아야 해요. 두 수행자와 실력을 겨루며 탑을 올라가 보세요.',['j-partner']);
step(early,'j-sprout-sage-1','모다피탑의 수행자 1','trainer',['j-partner'],{team:team('Sage',3),sprite:'j-sage',intro:['우리는 포켓몬과 마음을 맞추기 위해 이 탑에서 수행하고 있지.','장로님을 만나기 전에 나와 실력을 겨뤄 보겠니?'],win:['좋은 호흡이구나. 더 위로 올라가 보렴.']});
step(early,'j-sprout-sage-2','모다피탑의 수행자 2','trainer',['j-sprout-sage-1'],{team:team('Sage',4),sprite:'j-sage',intro:['동료마다 서로 다른 힘이 있지.','그 힘을 어떻게 이끌어 내는지 보여 주겠니?'],win:['너와 동료의 마음이 잘 맞는구나. 장로님이 기다리고 계신다.']});
step(early,'j-sprout','모다피탑의 장로','trainer',['j-sprout-sage-2'],{team:team('Sage',9),sprite:'j-sage',intro:['탑의 기둥처럼 유연하면서도 흔들리지 않는 마음이 필요하지.','너와 동료가 얼마나 서로를 믿는지 보여 주겠니?']});
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
const extras=group('j-side','모험 중 전해진 소식','지금 찾아갈 수 있는 사람들과 장소의 소식이에요.',['j-arrival']);
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
function init(game,pending=game.data.pendingChallenge){
 game.data.johto ||= {revision:2,cleared:{},rivals:{},items:{},starterChoice:null,champion:false,leagueBest:0};
 const s=game.data.johto;s.cleared ||= {};s.rivals ||= {};s.items ||= {};
 if((s.revision||1)<2){
  // Older saves could already be at, queued for, or beyond the elder. Do not
  // insert new prerequisite battles behind their existing progress.
  const b=game.data.battle,q=pending,r=s.rivals['j-rival-0'];
  if(s.cleared['j-sprout']||s.cleared['j-falkner']||r?.state||[b?.johtoId,b?.bossIndex,q?.index].some(id=>['j-sprout','j-rival-0'].includes(id))){
   const at=s.cleared['j-sprout']||s.cleared['j-falkner']||r?.metAt||b?.startedAt||q?.queuedAt||1;
   for(const id of ['j-sprout-sage-1','j-sprout-sage-2'])s.cleared[id] ||= at;
  }
  s.revision=2;
 }
 return s;
}
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
const caseEndings={
 'j-lab':'공박사가 맡긴 동료와 새로운 모험을 시작했어요.',
 'j-early':'장로에게 동료와의 호흡을 인정받았어요. 비상이 체육관에서 기다리고 있어요.',
 'j-well':'로켓단을 물리쳐 야돈들이 무사히 돌아왔어요. 고동마을에도 평화가 찾아왔어요.',
 'j-tree':'길을 막고 있던 나무의 정체를 알아냈어요. 인주시티로 향하는 길이 열렸어요.',
 'j-burned-tower':'불탄탑에서 잠들어 있던 세 포켓몬이 깨어나 성도 곳곳으로 흩어졌어요.',
 'j-dance':'다섯 무희와 승부를 마쳤어요. 바다 건너로 모험을 이어 갈 준비가 됐어요.',
 'j-coast':'전룡이 기운을 되찾아 등대가 다시 바다를 밝혀요. 규리도 체육관으로 돌아갔어요.',
 'j-rage-lake':'이상한 전파를 멈추고 로켓단을 물리쳤어요. 호수와 황토마을이 평온을 되찾았어요.',
 'j-radio-tower':'로켓단을 물리치고 국장을 구했어요. 금빛시티에 평소의 방송이 돌아왔어요.',
 'j-side':'모험길에서 맺은 인연들이 소중한 추억으로 남았어요.',
 'j-bell-tower':'현자들의 시험을 통과했어요. 방울 소리가 탑 안쪽으로 이어져요.',
 'j-ship-route':'배에서 만난 아이를 할아버지에게 데려다주었어요. 아쿠아호가 갈색시티에 도착했어요.',
 'j-power-plant':'사라진 부품을 되찾아 발전소가 다시 움직여요. 관동의 방송도 정상으로 돌아왔어요.',
 'j-kanto-road':'잠든 포켓몬을 깨웠어요. 디그다의굴을 지나 모험을 이어 갈 수 있어요.',
};
const preparationNotes={
 'j-ilex':'너도밤나무숲에서 길을 잃은 파오리 때문에 금빛시티로 향하는 길을 찾지 못하고 있어요.',
 'j-ice-path':'검은먹시티로 가려면 얼어붙은 샛길을 통과해야 해요.',
 'j-dragon-den':'이향이 용의 굴에서 장로를 만나 보라고 해요. 인정을 받으면 뱃지를 받을 수 있어요.',
 'j-victory-road':'챔피언로드를 지나면 포켓몬 리그에 도착해요.',
};
function snapshot(game){
 const s=init(game),reveal=n=>!n.secret||done(game,n.id)||available(game,n)||game.data.battle?.johtoId===n.id;
 const row=n=>{
  const shown=reveal(n),ready=available(game,n),cleared=done(game,n.id);
  const button=cleared&&!n.repeatMissing&&!n.repeatEgg?'완료':n.type==='gift'?'함께하기':['egg','odd-egg'].includes(n.type)?game.data.egg?'돌보는 알이 있어요':'알 맡기기':n.type==='dialogue'?'살펴보기':'도전하기';
  const hint=ready?'':cleared?'완료했어요.':!n.requires.every(id=>done(game,id))?'앞선 모험을 마치면 도전할 수 있어요.':n.needsBeasts?'성도의 전설과 더 깊은 인연이 필요해요.':n.needsDex?'성도의 도감을 더 채워 보세요.':'다음 만남을 기다려 주세요.';
  return {id:n.id,name:shown?n.name:'???',title:shown?n.title:'???',type:n.type,location:n.location,badge:n.badge,sprite:shown?n.sprite:null,portrait:shown?n.portrait:null,revealed:shown,levelsKnown:game.challengeLevelsKnown(n.id,cleared),team:shown?n.team||[]:[],done:cleared,canChallenge:ready,button,hint};
 };
 const cards=groups.filter(g=>g.id!=='j-rocket-hq'&&g.requires.every(id=>done(game,id))).map(original=>{
  const g=original.id==='j-rage-lake'?{...original,steps:[...original.steps,...groups.find(g=>g.id==='j-rocket-hq').steps]}:original;
  const entries=g.steps.filter(id=>id!=='j-arrival').map(id=>nodes.get(id));
  const eligible=entries.filter(n=>done(game,n.id)||n.requires.every(r=>done(game,r))),next=eligible.find(n=>!done(game,n.id));
  const visible=g.id==='j-early'?entries:eligible.filter(n=>done(game,n.id)||(g.id==='j-lab'?available(game,n):g.id==='j-side'||n===next));
  const completed=g.id==='j-lab'?visible.length>0&&!visible.some(n=>available(game,n)):entries.every(n=>done(game,n.id));
  const expanded=g.id==='j-rage-lake'&&done(game,'j-red-gyarados');
  return {id:g.id,title:expanded?'분노의 호수와 황토마을':g.title,description:completed?caseEndings[g.id]:expanded?'호수에 흘러들던 이상한 전파가 황토마을의 수상한 가게로 이어져요. 전파의 근원을 찾아보세요.':g.description,done:completed,steps:visible.map(n=>row(n))};
 }).filter(g=>g.steps.length);
 const preparation=id=>{const n=nodes.get(id);return !done(game,id)&&n.requires.every(r=>done(game,r))?{...row(n),description:preparationNotes[id]}:null;};
 const gymRows=gyms.map(n=>{
  const r=row(n),gate=n.id==='j-whitney'?'j-ilex':n.id==='j-clair'?done(game,n.id)?'j-dragon-den':'j-ice-path':null;
  if(gate)r.preparation=preparation(gate);
  if(n.id==='j-falkner'&&!done(game,'j-sprout'))r.hint='모다피탑에서 장로의 인정을 받아 주세요.';
  return r;
 });
 const latest=[...rivalNodes].reverse().find(n=>s.rivals[n.id]?.state);
 const special=['j-rainbow','j-gs-ball','j-shrine','j-red'].map(id=>nodes.get(id)).filter(n=>n.requires.every(id=>done(game,id))||done(game,n.id)).filter(n=>!n.needsDex||available(game,n)||done(game,n.id)).map(row);
 const leagueIndex=game.data.battle?.johtoLeague?game.data.battle.foeStage:0;
 return {active:active(game),region:s.champion&&done(game,'j-ship')?'성도 · 관동 재방문':'성도 지방',badges:gyms.filter(n=>done(game,n.id)&&(n.id!=='j-clair'||done(game,'j-dragon-den'))).map(n=>n.id),kantoBadges:revisits.filter(n=>done(game,n.id)).map(n=>n.id),champion:s.champion,completed:done(game,'j-red'),gyms:gymRows,kantoGyms:done(game,'j-ship')?revisits.map(row):[],league:league.map((n,i)=>{const shown=i<4||s.champion||leagueIndex>=4;return {...row(n),revealed:shown,name:shown?n.name:'???',portrait:shown?n.portrait:null,sprite:shown?n.sprite:null,team:shown?n.team:[]};}),leagueReady:available(game,nodes.get('j-league')),leaguePreparation:preparation('j-victory-road'),leagueBest:s.leagueBest,cards,special,rival:latest?{...row(latest),name:'실버',team:rivalTeam(game,latest),state:s.rivals[latest.id].state,canChallenge:s.rivals[latest.id].state==='retry'}:null,nativeCaught:nativeDex(game)};
}
module.exports={nodes,groups,gyms,revisits,league,rivalNodes,starterFamilies,eventSpecies,specialIds,routeGates,noWild,team,active,init,done,available,battleBoss,rivalTeam,wildExclusions,bonuses,nativeDex,snapshot};
