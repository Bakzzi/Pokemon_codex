# 계열 파일(hooks/jobs/<계열>.ts) 8개를 아래 표에서 만든다.  python3 preview/gen-lines.py
# 단계: (그림 키, 이름, 키(칸), 옵션). 옵션 attack=True면 게임의 공격 장면을 쓴다 (고유 기술과 어울릴 때만),
# flipAttack=False면 공격 그림을 뒤집지 않는다, mouth=(x, y)는 기술이 나가는 자리의 비율
import json
BABY = {'mouth': (0.85, 0.5)}
# 디지몬마다 고유 기술 효과 (hooks/fx.ts 부품을 조합한 TS 식). t: 장비 단계, from: 입(기술 자리)
FX = {
 "koromon": "fx.bubble(from)",
 "tsunomon": "fx.bubble(from)",
 "pyocomon": "fx.bubble(from)",
 "tanemon": "fx.bubble(from)",
 "mochimon": "fx.bubble(from)",
 "pukamon": "fx.bubble(from)",
 "tokomon": "fx.bubble(from)",
 "nyaromon": "fx.bubble(from)",
 "agumon": "fx.fireball(from, t >= 2 ? 1.3 : 0.9)",
 "greymon": "fx.fireball(from, 1.8)",
 "metalgreymon": "fx.missiles(from, 2) + (t >= 8 ? fx.tridentArm([from[0] + 1, from[1] + 2.5]) : '')",
 "wargreymon": "fx.orb(from, '#F26B21', '#FDE047', 1.9)",
 "gabumon": "fx.beam(from, '#60A5FA', '#E0F2FE', t >= 2 ? 0.9 : 0.6)",
 "garurumon": "fx.beam(from, '#3B82F6', '#BFDBFE', 1.2)",
 "weregarurumon": "fx.strike('#93C5FD', '#E0F2FE', true) + (t >= 8 ? fx.impact('#E0F2FE', 30, 9.5, 1.4) : '')",
 "metalgarurumon": "fx.cocytus(from)",
 "piyomon": "fx.fireball(from, t >= 2 ? 1 : 0.8)",
 "birdramon": "fx.meteorWing(from, t >= 5 ? 4 : 3)",
 "garudamon": "fx.beam(from, '#F26B21', '#FDE047', 1.7) + (t >= 8 ? fx.strike('#F26B21', '#FDE047', true) : '')",
 "hououmon": "fx.starlight(6)",
 "palmon": "fx.vine(from)",
 "togemon": "fx.strike('#F26B21', '#FFF7D6') + (t >= 5 ? fx.needleSpray(from) : '')",
 "lilimon": "fx.flowerCannon(from)",
 "rosemon": "fx.whip(from, '#EC4899', '#FBCFE8')",
 "tentomon": "fx.beam(from, '#FDE047', '#FFFBEB', t >= 2 ? 0.7 : 0.5)",
 "kabuterimon": "fx.orb(from, '#FDE047', '#FFFBEB', 1.3)",
 "atlurkabuterimon": "fx.beam(from, '#FDE047', '#FFFBEB', 1.4)",
 "heraklekabuterimon": "fx.beam(from, '#FDE047', '#FFFBEB', 1.9) + (t >= 8 ? fx.lightning() : '')",
 "gomamon": "fx.marchingFishes(from, t >= 2 ? 5 : 3)",
 "ikkakumon": "fx.harpoon(from, t >= 5 ? 2 : 1)",
 "zudomon": "fx.strike('#CBD5E1', '#FFFFFF') + fx.lightning()",
 "plesiomon": "fx.beam(from, '#38BDF8', '#E0F2FE', 1.6)",
 "patamon": "fx.airShot(from)",
 "angemon": "fx.beam(from, '#FDE68A', '#FFFFFF', 1.1)",
 "holyangemon": "fx.pillar('#FDE68A', '#FFFFFF', 3) + (t >= 8 ? fx.strike('#FDE68A', '#FFFFFF') : '')",
 "seraphimon": "fx.sevenHeavens()",
 "plotmon": "fx.soundWave(from)",
 "tailmon": "fx.strike('#F9A8D4', '#FFFFFF', true)",
 "angewomon": "fx.holyArrow(from) + (t >= 8 ? fx.strike('#F9A8D4', '#FFFFFF') : '')",
 "ofanimon": "fx.beam(from, '#FDE68A', '#FFFFFF', 1.2) + fx.pillar('#FDE68A', '#FFFFFF', 2.2)"
}
MELEE = ['tailmon', 'togemon', 'weregarurumon', 'zudomon']
LINES = [
 ('courage','용기','🔥','fire',False,
  [('koromon','코로몬',5.5,BABY),('agumon','아구몬',9.5,{}),('greymon','그레이몬',13,{}),('metalgreymon','메탈그레이몬',14,{'flip':False,'mouth':(0.72,0.5)}),('wargreymon','워그레이몬',13,{'flip':False,'mouth':(0.9,0.45)})],
  ['','아구몬으로 진화','페퍼 브레스','용기의 문장','그레이몬으로 진화','메가 플레임','메탈그레이몬으로 초진화','기가 디스트로이어','트라이던트 암','워그레이몬으로 궁극진화','가이아 포스·무지개 후광']),
 ('friendship','우정','🐺','ice',False,
  [('tsunomon','츠노몬',5.5,BABY),('gabumon','가브몬',9.5,{}),('garurumon','가루몬',12,{'attack':True}),('weregarurumon','워가루몬',13,{'attack':True}),('metalgarurumon','메탈가루몬',14,{})],
  ['','가브몬으로 진화','블루 블래스터','우정의 문장','가루몬으로 진화','폭스 파이어','워가루몬으로 초진화','카이저 네일','가루루 킥','메탈가루몬으로 궁극진화','코큐토스 브레스·무지개 후광']),
 ('love','사랑','❤️','fire',False,
  [('pyocomon','뿌카몬',5.5,BABY),('piyomon','피요몬',9,{}),('birdramon','버드라몬',12,{'attack':True}),('garudamon','가루다몬',14,{}),('hououmon','피닉스몬',13,{'attack':True})],
  ['','피요몬으로 진화','매지컬 파이어','사랑의 문장','버드라몬으로 진화','메테오 윙','가루다몬으로 초진화','섀도 윙','이글 클로','피닉스몬으로 궁극진화','스타라이트 익스플로전·무지개 후광']),
 ('sincerity','순수','🌸','leaf',True,
  [('tanemon','타네몬',5.5,BABY),('palmon','팔몬',9,{'attack':True}),('togemon','니드몬',13,{}),('lilimon','릴리몬',12,{}),('rosemon','로제몬',13,{'flip':False,'attack':True,'flipAttack':True})],
  ['','팔몬으로 진화','포이즌 아이비','순수의 문장','니드몬으로 진화','니들 스프레이','릴리몬으로 초진화','플라워 캐논','템프테이션','로제몬으로 궁극진화','포비든 템프테이션·무지개 후광']),
 ('knowledge','지식','💡','thunder',False,
  [('mochimon','모티몬',4.5,BABY),('tentomon','텐타몬',9,{}),('kabuterimon','캅테리몬',12.5,{}),('atlurkabuterimon','메가캅테리몬',13.5,{}),('heraklekabuterimon','헤라클레스캅테리몬',14,{})],
  ['','텐타몬으로 진화','프티 썬더','지식의 문장','캅테리몬으로 진화','일렉트로 쇼커','메가캅테리몬으로 초진화','호른 버스터','울트라 썬더','헤라클레스캅테리몬으로 궁극진화','메가 블래스터·무지개 후광']),
 ('reliability','성실','🐾','water',True,
  [('pukamon','푸카몬',5.5,BABY),('gomamon','파피몬',8.5,{'attack':True,'flipAttack':False}),('ikkakumon','이크몬',12.5,{}),('zudomon','쥬드몬',13.5,{'attack':True}),('plesiomon','플레시오몬',13.5,{'attack':True})],
  ['','파피몬으로 진화','마칭 피시즈','성실의 문장','이크몬으로 진화','하푼 발칸','쥬드몬으로 초진화','해머 스파크','발칸 해머','플레시오몬으로 궁극진화','소로 블루·무지개 후광']),
 ('hope','희망','😇','holy',False,
  [('tokomon','토코몬',5.5,BABY),('patamon','파닥몬',8,{}),('angemon','엔젤몬',13.5,{'flip':False,'attack':True,'mouth':(0.9,0.4)}),('holyangemon','홀리엔젤몬',13.5,{'attack':True,'mouth':(0.9,0.4)}),('seraphimon','세라피몬',14,{'mouth':(0.9,0.4)})],
  ['','파닥몬으로 진화','에어 슛','희망의 문장','엔젤몬으로 진화','헤븐즈 너클','홀리엔젤몬으로 초진화','헤븐즈 게이트','엑스칼리버','세라피몬으로 궁극진화','세븐 헤븐즈·무지개 후광']),
 ('light','빛','✨','light',False,
  [('nyaromon','뉴몬',5.5,{'flip':False,'mouth':(0.85,0.5)}),('plotmon','플롯몬',8,{}),('tailmon','가트몬',9.5,{'attack':True,'flipAttack':False}),('angewomon','엔젤우몬',13.5,{'attack':True,'flipAttack':False,'mouth':(0.9,0.3)}),('ofanimon','오파니몬',13.5,{'attack':True,'mouth':(0.9,0.3)})],
  ['','플롯몬으로 진화','퍼피 하울링','빛의 문장','가트몬으로 진화','캣 펀치','엔젤우몬으로 초진화','홀리 애로우','헤븐즈 참','오파니몬으로 궁극진화','에덴즈 재블린·무지개 후광']),
]
for key, name, icon, el, melee, stages, gear in LINES:
    C = key.upper()
    rows = []
    for k, kname, h, opt in stages:
        parts = []
        if opt.get('attack'): parts.append(f'attack: {C}.{k}_attack')
        if 'flipAttack' in opt: parts.append(f'flipAttack: {json.dumps(opt["flipAttack"])}')
        if 'flip' in opt: parts.append(f'flip: {json.dumps(opt["flip"])}')
        if 'mouth' in opt: parts.append(f'mouth: [{opt["mouth"][0]}, {opt["mouth"][1]}]')
        if k in MELEE: parts.append('melee: true')
        if k in FX: parts.append(f'fx: (t, from) => {FX[k]}')
        extra = ', { ' + ', '.join(parts) + ' }' if parts else ''
        rows.append(f"  sprite('{kname}', {C}.{k}!, {h}{extra}),")
    body = f"""// {name}의 문장: {' → '.join(s[1] for s in stages)}
// 그림은 hooks/img/{key}.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import {{ elementHit, makeLine, sprite }} from '../digi.ts'
import * as fx from '../fx.ts'
import {{ {C} }} from '../img/{key}.ts'
import {{ CRESTS }} from '../img/crests.ts'

export const {key} = makeLine({{
  key: '{key}',
  name: '{name}',
  icon: '{icon}',
  gear: {json.dumps(gear, ensure_ascii=False)},
  melee: false,
  stages: [
{chr(10).join(rows)}
  ],
  crest: {{ image: CRESTS.{key}! }},
  hit: (_t, stage, from) => elementHit('{el}', stage, false, from),
}})
"""
    open(f'hooks/jobs/{key}.ts', 'w', encoding='utf-8').write(body)
    print('wrote', key)
