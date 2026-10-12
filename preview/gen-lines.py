# 계열 파일(hooks/jobs/<계열>.ts) 8개를 아래 표에서 만든다.  python3 preview/gen-lines.py
# 단계: (그림 키, 이름, 키(칸), 옵션). flip=True면 원본이 왼쪽을 봐서 뒤집는다, mouth=(x, y)는 기술이 나가는 자리의 비율
# 진화 구간(hooks/digi.ts stageOf): 유년기 Lv.1~9, 성장기 10~29, 성숙기 30~49, 완전체 50~79, 궁극체 80~ (t = 레벨 ÷ 10)
# 이름은 한국판 더빙(나무위키 디지몬 어드벤처 진화 트리) 기준
import json
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
 "greymon": "fx.fireball(from, t >= 4 ? 2 : 1.7)",
 "metalgreymon": "fx.missiles(from, 2) + (t >= 7 ? fx.tridentArm([from[0] + 1, from[1] + 2.5]) : '')",
 "wargreymon": "fx.gaiaForce(from)",
 "gabumon": "fx.blueFlame(from, t >= 2 ? 1.2 : 0.9)",
 "garurumon": "fx.blueFlame(from, t >= 4 ? 1.9 : 1.6)",
 "weregarurumon": "fx.strike('#93C5FD', '#E0F2FE', true) + (t >= 7 ? fx.impact('#E0F2FE', 30, 9.5, 1.4) : '')",
 "metalgarurumon": "fx.cocytus(from)",
 "piyomon": "fx.greenFlame(from, t >= 2 ? 1.1 : 0.9)",
 "birdramon": "fx.meteorWing(from, t >= 4 ? 4 : 3)",
 "garudamon": "fx.fireball(from, 2.2) + (t >= 7 ? fx.strike('#F26B21', '#FDE047', true) : '')",
 "hououmon": "fx.starlight(6)",
 "palmon": "fx.vine(from)",
 "togemon": "fx.needleSpray(from, t >= 4 ? 8 : 6)",
 "lilimon": "fx.flowerCannon(from)",
 "rosemon": "fx.whip(from, '#EC4899', '#FBCFE8')",
 "tentomon": "fx.sparks(from, t >= 2 ? 1 : 0.8)",
 "kabuterimon": "fx.orb(from, '#38BDF8', '#F0F9FF', t >= 4 ? 1.5 : 1.3)",
 "atlurkabuterimon": "fx.beam(from, '#38BDF8', '#F0F9FF', 1.4)",
 "heraklekabuterimon": "fx.beam(from, '#38BDF8', '#F0F9FF', 1.9) + (t >= 9 ? fx.lightning(fx.BODY_X, '#38BDF8', '#F0F9FF') : '')",
 "gomamon": "fx.marchingFishes(from, t >= 2 ? 5 : 3)",
 "ikkakumon": "fx.harpoon(from, t >= 4 ? 2 : 1)",
 "zudomon": "fx.strike('#CBD5E1', '#FFFFFF') + fx.lightning()",
 "vikemon": "fx.strike('#CBD5E1', '#FFFFFF') + fx.strike('#93C5FD', '#E0F2FE', true) + fx.impact('#E0F2FE', 30, 9.5, 1.6)",
 "patamon": "fx.airShot(from)",
 "angemon": "fx.beam(from, '#F59E0B', '#FDE68A', 1.1)",
 "holyangemon": "fx.pillar('#FDE68A', '#FFFFFF', 3) + (t >= 7 ? fx.strike('#FDE68A', '#FFFFFF') : '')",
 "seraphimon": "fx.sevenHeavens()",
 "plotmon": "fx.soundWave(from)",
 "tailmon": "fx.strike('#F9A8D4', '#FFFFFF', true)",
 "angewomon": "fx.holyArrow(from) + (t >= 7 ? fx.strike('#F9A8D4', '#FFFFFF') : '')",
 "ofanimon": "fx.javelin(from) + fx.pillar('#FDE68A', '#FFFFFF', 2.2)",
 "omegamon": "fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF')",
}
MELEE = ['tailmon', 'weregarurumon', 'zudomon', 'vikemon']
# 히든 진화(조그레스체): 용기·우정 시즌에서 각각 궁극체(Lv.80)가 된 적이 있으면, 어느 시즌이든 Lv.100에 오메가몬 (가루루 캐논 + 그레이 소드)
OMEGA = ('omegamon', '오메가몬', 14, {'flip': False, 'mouth': (0.3, 0.42)})

# (계열 키, 문장, 이모지, 단계 5개, 10레벨마다 얻는 것 11개)
#   얻는 것: 0 빈칸, 10 성장기 진화, 20 기술, 30 성숙기 진화, 40 기술, 50 완전체 초진화, 60 기술, 70 기술, 80 궁극체 궁극진화, 90 후광, 100 무지개 후광
LINES = [
 ('courage', '용기', '🔥',
  [('koromon','코로몬',5.5,{'flip':False,'mouth':(0.82,0.62)}),('agumon','아구몬',9.5,{'flip':False,'mouth':(0.9,0.36)}),('greymon','그레이몬',13,{'flip':False,'mouth':(0.93,0.3)}),('metalgreymon','메탈그레이몬',14,{'flip':False,'mouth':(0.62,0.55)}),('wargreymon','워그레이몬',13,{'flip':False,'mouth':(0.55,0.03)})],
  ['','아구몬으로 진화','꼬마 불꽃','그레이몬으로 진화','메가 파이어','메탈그레이몬으로 초진화','인공지능 미사일','왕발톱','워그레이몬으로 궁극진화','테라 광선·후광','무지개 후광']),
 ('friendship', '우정', '🐺',
  [('tsunomon','뿔몬',5.5,{'flip':False,'mouth':(0.88,0.6)}),('gabumon','파피몬',9.5,{'flip':False,'mouth':(0.9,0.33)}),('garurumon','가루몬',12,{'flip':False,'mouth':(0.95,0.58)}),('weregarurumon','워가루몬',13,{'flip':False,'mouth':(0.85,0.4)}),('metalgarurumon','메탈가루몬',14,{'flip':False,'mouth':(0.95,0.42)})],
  ['','파피몬으로 진화','파란 불꽃','가루몬으로 진화','푸른 화염포','워가루몬으로 초진화','초강력 손톱','늑대 발차기','메탈가루몬으로 궁극진화','썰렁포·후광','무지개 후광']),
 ('love', '사랑', '❤️',
  [('pyocomon','어니몬',5.5,{'flip':False,'mouth':(0.82,0.7)}),('piyomon','피요몬',9,{'flip':False,'mouth':(0.74,0.34)}),('birdramon','버드라몬',12,{'flip':False,'mouth':(0.9,0.28)}),('garudamon','가루다몬',14,{'flip':False,'mouth':(0.7,0.38)}),('hououmon','페닉스몬',13,{'flip':False,'mouth':(0.92,0.32)})],
  ['','피요몬으로 진화','빙빙 회오리','버드라몬으로 진화','메테오 윙','가루다몬으로 초진화','불새 출격','이글 클로','페닉스몬으로 궁극진화','스타라이트 익스플로전·후광','무지개 후광']),
 ('sincerity', '순수', '🌸',
  [('tanemon','시드몬',5.5,{'flip':True,'mouth':(0.82,0.66)}),('palmon','팔몬',9,{'flip':False,'mouth':(0.92,0.55)}),('togemon','니드몬',13,{'flip':False,'mouth':(0.85,0.5)}),('lilimon','릴리몬',12,{'flip':False,'mouth':(0.78,0.55)}),('rosemon','로제몬',13,{'flip':False,'mouth':(0.88,0.55)})],
  ['','팔몬으로 진화','독줄기 공격','니드몬으로 진화','니들 스프레이','릴리몬으로 초진화','플라워 캐논','릴리몬의 유혹','로제몬으로 궁극진화','포비든 템프테이션·후광','무지개 후광']),
 ('knowledge', '지식', '💡',
  [('mochimon','모티몬',4.5,{'flip':True,'mouth':(0.78,0.5)}),('tentomon','텐타몬',9,{'flip':False,'mouth':(0.88,0.36)}),('kabuterimon','캅테리몬',12.5,{'flip':False,'mouth':(0.72,0.45)}),('atlurkabuterimon','아트라캅테리몬',13.5,{'flip':False,'mouth':(0.8,0.12)}),('heraklekabuterimon','헤라클레스캅테리몬',14,{'flip':False,'mouth':(0.9,0.26)})],
  ['','텐타몬으로 진화','쁘띠 썬더','캅테리몬으로 진화','일렉트로 쇼커','아트라캅테리몬으로 초진화','혼 버스터','울트라 썬더','헤라클레스캅테리몬으로 궁극진화','메가 블래스터·후광','무지개 후광']),
 ('reliability', '성실', '🐾',
  [('pukamon','둥실몬',5.5,{'flip':True,'mouth':(0.88,0.5)}),('gomamon','쉬라몬',8.5,{'flip':False,'mouth':(0.85,0.4)}),('ikkakumon','원뿔몬',12.5,{'flip':False,'mouth':(0.56,0.08)}),('zudomon','쥬드몬',13.5,{'flip':False,'mouth':(0.85,0.4)}),('vikemon','바이킹몬',14,{'flip':False,'mouth':(0.85,0.4)})],
  ['','쉬라몬으로 진화','물고기 행진','원뿔몬으로 진화','뿔 날리기','쥬드몬으로 초진화','해머 스파크','발칸 해머','바이킹몬으로 궁극진화','아크틱 블리자드·후광','무지개 후광']),
 ('hope', '희망', '😇',
  [('tokomon','토코몬',5.5,{'flip':False,'mouth':(0.82,0.6)}),('patamon','파닥몬',8,{'flip':False,'mouth':(0.8,0.66)}),('angemon','엔젤몬',13.5,{'flip':False,'mouth':(0.82,0.5)}),('holyangemon','홀리엔젤몬',13.5,{'flip':False,'mouth':(0.9,0.4)}),('seraphimon','세라피몬',14,{'flip':False,'mouth':(0.9,0.4)})],
  ['','파닥몬으로 진화','공기팡','엔젤몬으로 진화','천사의 손','홀리엔젤몬으로 초진화','천국의 문','엑스칼리버','세라피몬으로 궁극진화','세븐 헤븐즈·후광','무지개 후광']),
 ('light', '빛', '✨',
  [('nyaromon','야옹몬',5.5,{'flip':True,'mouth':(0.85,0.5)}),('plotmon','플롯몬',8,{'flip':True,'mouth':(0.62,0.42)}),('tailmon','가트몬',9.5,{'flip':False,'mouth':(0.85,0.3)}),('angewomon','엔젤우몬',13.5,{'flip':False,'mouth':(0.86,0.45)}),('ofanimon','오파니몬',13.5,{'flip':True,'mouth':(0.96,0.4)})],
  ['','플롯몬으로 진화','퍼피 하울링','가트몬으로 진화','냥냥펀치','엔젤우몬으로 초진화','천국의 화살','천국의 미소','오파니몬으로 궁극진화','낙원의 창·후광','무지개 후광']),
]

def stage_row(C, k, kname, h, opt):
    parts = []
    if 'flip' in opt: parts.append(f'flip: {json.dumps(opt["flip"])}')
    if 'mouth' in opt: parts.append(f'mouth: [{opt["mouth"][0]}, {opt["mouth"][1]}]')
    if k in MELEE: parts.append('melee: true')
    if k in FX: parts.append(f'fx: (t, from) => {FX[k]}')
    return f"sprite('{kname}', {C}.{k}!, {h}, {{ {', '.join(parts)} }})"

for key, name, icon, stages, gear in LINES:
    C = key.upper()
    rows = [f"    {stage_row(C, *s)}," for s in stages]
    ok, oname, oh, oopt = OMEGA
    body = f"""// {name}의 문장: {' → '.join(s[1] for s in stages)}. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import {{ makeLine, sprite }} from '../digi.ts'
import * as fx from '../fx.ts'
import {{ {C} }} from '../img/{key}.ts'
import {{ OMEGA }} from '../img/omega.ts'

export const {key} = makeLine({{
  key: '{key}',
  name: '{name}',
  icon: '{icon}',
  gear: {json.dumps(gear, ensure_ascii=False)},
  stages: [
{chr(10).join(rows)}
  ],
  omega: {stage_row('OMEGA', ok, oname, oh, oopt)},
}})
"""
    open(f'hooks/jobs/{key}.ts', 'w', encoding='utf-8').write(body)
    print('wrote', key)
