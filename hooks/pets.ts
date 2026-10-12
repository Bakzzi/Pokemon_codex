// 펫: 일을 마칠 때 1% 확률(한 달에 한 번)로 나오는 보물상자를 열면 넷 가운데 하나가 나와서,
// 그달 내내 Claude 뒤를 따라다닌다. 기능은 없는 치장 동료다.
// 그림은 4.4 × 3.6칸 상자 안에 0.2칸 점(쉬는 그림에서 1px)으로 찍는다. 발은 y = 3.6, 오른쪽을 본다.
// 쉬는 띠에서는 5배, 싸울 때는 4배, 큰 알림에서는 12배로 키워 쓴다.
import { GOLD, GOLD_DARK, GOLD_LIGHT, INK, WHITE, rect } from './pixel.ts'
import type { Pose } from './pixel.ts'

export type Pet = {
  key: string
  name: string
  icon: string
  // 조사: "고양이가", "드래곤이" 처럼 붙일 때
  josa: string
  small: (pose: Pose) => string
}

// ── 점 그림 ───────────────────────────────────────────────────────
// 한 점은 0.2칸. 상자는 22 × 18점이다.
const PX = 0.2
const at = (v: number) => Math.round(v * 100) / 100

// 점 자리(col, row)에 w × h점 사각형
const px = (col: number, row: number, w: number, h: number, fill: string, inner = '') =>
  rect(at(col * PX), at(row * PX), at(w * PX), at(h * PX), fill, inner)

// 글자 그림: 한 글자가 한 점. 팔레트에 없는 글자('.' 등)는 비우고, 한 줄에 이어진 같은 글자는 사각형 하나로 합친다.
// (col, row)는 그림 왼쪽 위가 놓일 점 자리
type Palette = Readonly<Record<string, string>>
const dots = (rows: readonly string[], pal: Palette, col = 0, row = 0) => {
  let out = ''
  rows.forEach((line, j) => {
    for (let i = 0; i < line.length; ) {
      const c = line[i]!
      let k = i + 1
      while (k < line.length && line[k] === c) k++
      const fill = pal[c]
      if (fill) out += px(col + i, row + j, k - i, 1, fill)
      i = k
    }
  })
  return out
}

// ── 움직임 ────────────────────────────────────────────────────────
// 싸울 때(run)는 Claude 걸음(0.36초)에 맞춰 빠르게, 쉴 때(stand)는 느긋하게
const beat = (pose: Pose) => (pose === 'run' ? '0.36s' : '1.4s')

// 뚝뚝 끊어지는 움직임 (점 그림이라 사이를 메우지 않는다). times를 주면 값마다 시작 시각(0~1)
const timed = (times?: string) => (times ? ` keyTimes="${times}"` : '')
const step = (attr: string, values: string, dur: string, times?: string) =>
  `<animate attributeName="${attr}" values="${values}"${timed(times)} dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`
const nudge = (values: string, dur: string, times?: string) =>
  `<animateTransform attributeName="transform" type="translate" values="${values}"${timed(times)} dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`

// 장면 넘기기: 여러 장면을 dur 동안 차례로 하나씩 보인다 (움직임이 없는 곳에서는 첫 장면만 보인다)
const flipbook = (dur: string, ...frames: string[]) =>
  frames
    .map((f, i) => `<g${i ? ' opacity="0"' : ''}>${step('opacity', frames.map((_, j) => (j === i ? 1 : 0)).join(';'), dur)}${f}</g>`)
    .join('')

// 가끔 바뀌는 모습: every를 n칸으로 나눠 마지막 한 칸에만 b, 나머지는 a를 보인다 (눈 깜빡임, 귀 쫑긋)
const nowAndThen = (every: string, n: number, a: string, b: string) => {
  const usual = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : 0))
  return (
    `<g>${step('opacity', usual.join(';'), every)}${a}</g>` +
    `<g opacity="0">${step('opacity', usual.map(v => 1 - v).join(';'), every)}${b}</g>`
  )
}

// 눈 둘: 2 × 2점 까만 눈의 왼쪽 위에 반짝임 한 점(눈동자가 오른쪽을 본다). every마다 한 번 꾹 감는다
const eyes = (cols: readonly number[], row: number, every: string) =>
  nowAndThen(
    every,
    12,
    cols.map(c => px(c, row, 2, 2, INK) + px(c, row, 1, 1, WHITE)).join(''),
    cols.map(c => px(c, row + 1, 2, 1, INK)).join(''),
  )

// 다리 하나: 몸 밑(row 15)부터 h점, 발끝 한 점은 양말 색
const paw = (col: number, h: number, fill: string, sock: string) => px(col, 15, 2, h - 1, fill) + px(col, 14 + h, 2, 1, sock)

// 네 발 짐승의 다리 넷: 가까운 뒷다리·먼 앞다리는 a점, 먼 뒷다리·가까운 앞다리는 b점 (대각선끼리 같이 딛는다)
// 가까운 다리는 털색에 양말을 신고, 먼 다리는 짙은 색
const legs4 = (a: number, b: number, near: string, sock: string, far: string) =>
  paw(3, a, near, sock) + paw(6, b, far, far) + paw(10, a, far, far) + paw(13, b, near, sock)
// 싸울 때는 다리를 번갈아 들며 종종걸음, 쉴 때는 네 발로 선다
const walk = (pose: Pose, near: string, sock: string, far: string) =>
  pose === 'run'
    ? flipbook(beat(pose), legs4(3, 2, near, sock, far), legs4(2, 3, near, sock, far))
    : legs4(3, 3, near, sock, far)

// 떠다니는 펫: dur 동안 0 → 1 → 2 → 1점 떴다 내려오고, 땅 그림자는 높이 뜰수록 작아진다
const LIFT = [0, 1, 2, 1]
const hover = (dur: string) => nudge(LIFT.map(l => `0 ${at(-l * PX)}`).join(';'), dur)
const shadow = (col: number, w: number, dur: string) => {
  const x = LIFT.map(l => at((col + l * 0.5) * PX)).join(';')
  const width = LIFT.map(l => at((w - l) * PX)).join(';')
  return `<g opacity="0.16">${px(col, 17, w, 1, INK, step('x', x, dur) + step('width', width, dur))}</g>`
}

// 떠오르며 사라지는 알갱이 하나 (불티·거품·잎·불꽃). 위로 rise점, dur마다 begin부터
const mote = (col: number, row: number, rise: number, color: string, dur: string, begin: string) =>
  `<g opacity="0"><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.5;1" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${at(-rise * PX)}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>` +
  px(col, row, 1, 1, color) +
  '</g>'

// ── 고양이: 은회색 고등어 무늬, 물음표처럼 세운 꼬리 ─────────────────────
const CAT: Palette = {
  g: '#A7AEBA', // 털
  s: '#6B7383', // 줄무늬
  d: '#848C9A', // 배 밑·먼 다리
  w: '#F8FAFC', // 주둥이·가슴·양말
  p: '#F5A3BF', // 귓속·코
  b: '#F7B9CB', // 볼
}
const CAT_BODY = [
  '...........g..........',
  '...........gg.........',
  '...........gpg....gpg.',
  '...........gggggggggg.',
  '...........gggsggsggg.',
  '...........gggggggggg.',
  '...........gggggggggg.',
  '...........gbggppggbg.',
  '....gsgsgsgggggwwgggg.',
  '...ggsgsgsgggggggggg..',
  '...gggggggggwwwg......',
  '...gggggggggwwwg......',
  '...ggggggggggggg......',
  '...ggggggggggggg......',
  '....ddddddddddd.......',
]
// 꼬리: 엉덩이에서 곧게 서고, 끝이 앞뒤로 살랑인다
const CAT_TAIL = ['.gg', '.ss', '.gg', '.ss', '.gg', '.ggg', '..gg']
const CAT_TIP_UP = ['..ss', '..gg', '.gg.']
const CAT_TIP_BACK = ['ss..', 'gg..', '.gg.']
// 오른쪽 귀 끝: 가끔 바깥으로 쫑긋 젖힌다
const CAT_EAR = ['.g', 'gg']
const CAT_EAR_TWITCH = ['..g', '.gg']

const cat: Pet = {
  key: 'cat',
  name: '고양이',
  icon: '🐱',
  josa: '가',
  small: pose =>
    '<g>' +
    walk(pose, CAT.g!, '#D6DBE3', CAT.d!) +
    // 몸은 걸음마다(쉴 때는 숨 쉴 때마다) 한 점 내려앉는다
    `<g>${nudge('0 0;0 0.2', beat(pose))}` +
    dots(CAT_TAIL, CAT, 0, 4) +
    flipbook(pose === 'run' ? beat(pose) : '2.8s', dots(CAT_TIP_UP, CAT, 0, 1), dots(CAT_TIP_BACK, CAT, 0, 1)) +
    dots(CAT_BODY, CAT) +
    nowAndThen('5.3s', 10, dots(CAT_EAR, CAT, 19, 0), dots(CAT_EAR_TWITCH, CAT, 19, 0)) +
    eyes([13, 17], 5, '3.7s') +
    '</g></g>',
}

// ── 강아지: 크림·황갈색 시바, 등에 말린 꼬리를 흔든다 ────────────────────
const DOG: Palette = {
  t: '#E3A867', // 털
  T: '#B87A3E', // 짙은 털 (등·먼 다리)
  c: '#FFF2DC', // 우라지로 (눈썹·볼·가슴·양말)
  n: INK, // 코
  m: '#F47C8A', // 혀
  r: '#E5484D', // 목줄
  y: GOLD, // 이름표
  k: '#D9AE78', // 크림 테두리
  C: '#F0D3A4', // 양말
}
const DOG_BODY = [
  '............t....t....',
  '...........tct..tct...',
  '...........tcttttctt..',
  '...........tttctttct..',
  '...........ttttttttt..',
  '...........ttttttttt..',
  '...........tccccccccn.',
  '...........tcccccccck.',
  '....TTTTTTTtccccccmk..',
  '...tttttttttcccckk....',
  '...ttttttttrrrrt......',
  '...ttttttttccyct......',
  '...ttttttttcccct......',
  '...tttttttttccct......',
  '....TTTTTTTTTTT.......',
]
// 등에 얹은 동그랗게 말린 꼬리 (안쪽이 크림색)
const DOG_TAIL = ['.ttt.', 'tcccT', 'tctcT', 'tcttT', '.TT..']

const dog: Pet = {
  key: 'dog',
  name: '강아지',
  icon: '🐶',
  josa: '가',
  small: pose => {
    // 꼬리는 쉴 때도 신나게 흔든다
    const wag = pose === 'run' ? '0.18s' : '0.5s'
    return (
      '<g>' +
      walk(pose, DOG.t!, DOG.C!, DOG.T!) +
      `<g>${nudge('0 0;0 0.2', beat(pose))}` +
      flipbook(wag, dots(DOG_TAIL, DOG, 2, 3), dots(DOG_TAIL, DOG, 1, 4)) +
      dots(DOG_BODY, DOG) +
      // 혀: 싸울 때는 헥헥 내밀었다 넣었다
      (pose === 'run' ? flipbook(beat(pose), px(18, 9, 1, 1, DOG.m!), '') : px(18, 9, 1, 1, DOG.m!)) +
      eyes([13, 17], 4, '4.3s') +
      '</g></g>'
    )
  },
}

// ── 아기 드래곤: 자수정 비늘, 작은 날개로 파닥이며 떠다닌다 ─────────────────
const DRAKE: Palette = {
  v: '#8B5CF6', // 비늘
  V: '#5B21B6', // 짙은 비늘·날개 뼈
  L: '#C4B5FD', // 비늘 윤기·등 가시
  b: '#FDE68A', // 배
  B: '#F2C25B', // 배 줄
  h: '#F6CF5E', // 뿔
  w: '#E9A8F5', // 날개 막
}
const DRAKE_BODY = [
  '..........h....h......',
  '..........hh...hh.....',
  '...........vvvvvv.....',
  '..........vLLvvvvv....',
  '..........vvvvvvvv....',
  '..........vvvvvvvvvV..',
  '..........vvvvvvvvvv..',
  '...........vvvvvVVV...',
  '.......vLvLvvvvvv.....',
  '.V....vvvvvvbbbbv.....',
  'VLV...vvvvvbbbbbvv....',
  '.Vv..vvvvvvBBBBBV.....',
  '..vvvvvvvvvbbbbbv.....',
  '...vvVVVVVVBBBVV......',
  '.......VV...VV........',
]
// 날개 세 모습: 위로 든 날개, 옆으로 편 날개, 아래로 내린 날개
const WING_UP = ['V.....', 'VV....', 'VwV...', 'VwwV..', 'VwwwV.', '.VwwwV', '..VVVV']
const WING_MID = ['VVVV....', 'VwwwVVV.', '.VwwwwwV', '..VVVVVV']
const WING_DOWN = ['.....VVV', '...VVwwV', '.VVwwwwV', 'VwwwwVV.', '.VVVV...']

const dragon: Pet = {
  key: 'dragon',
  name: '아기 드래곤',
  icon: '🐲',
  josa: '이',
  small: pose => {
    const run = pose === 'run'
    // 날개를 한 번 치는 동안 몸이 두 점 떴다 내려온다 (날개를 내릴 때 가장 높다)
    const flap = run ? '0.36s' : '0.9s'
    return (
      shadow(6, 9, flap) +
      `<g>${hover(flap)}` +
      flipbook(flap, dots(WING_UP, DRAKE, 3, 3), dots(WING_MID, DRAKE, 1, 7), dots(WING_DOWN, DRAKE, 1, 9), dots(WING_MID, DRAKE, 1, 7)) +
      dots(DRAKE_BODY, DRAKE, 0, 2) +
      eyes([12, 15], 6, '3.3s') +
      // 가끔 콧김처럼 작은 불꽃을 뿜는다 (싸울 때는 자주)
      '<g opacity="0">' +
      step('opacity', '0;1;0', run ? '1.8s' : '4.2s', '0;0.84;0.94') +
      px(20, 8, 1, 1, '#FB923C') +
      px(21, 7, 1, 2, '#FDE047') +
      '</g>' +
      '</g>'
    )
  },
}

// ── 엘리멘탈: 불 → 물 → 풀 → 번개로 모습과 색이 바뀌는 작은 정령 ─────────────
// 원소마다 겉(m)·속(l)·테두리(d) 세 가지 색, 머리 장식(두 장면을 번갈아 일렁인다), 떠오르는 알갱이 색(불티·거품·잎·불꽃)
type ElementForm = { pal: Palette; crown: readonly [readonly string[], readonly string[]]; mote: string }
const ELEMENTS: readonly ElementForm[] = [
  {
    pal: { m: '#FF7A2E', l: '#FFD58A', d: '#B83A10' },
    crown: [
      ['.......m....', '......mm..m.', '......mlm.mm', '.....mllmmlm'],
      ['......m.....', '......mm.m..', '.....mlm.mm.', '.....mllmmlm'],
    ],
    mote: '#FFB347',
  },
  {
    pal: { m: '#38B6F5', l: '#D9F4FF', d: '#14639E' },
    crown: [
      ['........d...', '.......dmd..', '......dmlmd.', '......dmlmd.'],
      ['............', '........d...', '.......dmd..', '......dmlmd.'],
    ],
    mote: '#8FDBFF',
  },
  {
    pal: { m: '#44CF72', l: '#DBFBE4', d: '#17763A' },
    crown: [
      ['....mmd.dmm.', '.....mmdmm..', '.......d....', '.......d....'],
      ['.....mmddmm.', '......mdm...', '.......d....', '.......d....'],
    ],
    mote: '#7BE39A',
  },
  {
    pal: { m: '#F8C824', l: '#FFF8CF', d: '#A26605' },
    crown: [
      ['.........dmm', '........dmm.', '.......dmmmm', '.........dm.'],
      ['.........dll', '........dll.', '.......dllll', '.........dl.'],
    ],
    mote: '#FFF06A',
  },
]
const SPIRIT_BODY = [
  '........ddddd.........',
  '......ddmmmmmdd.......',
  '.....dmmmmmmmmmd......',
  '....dmmmlllllmmmd.....',
  '....dmmlllllllmmd.....',
  '....dmmlllllllmmd.....',
  '....dmmmlllllmmmd.....',
  '.....dmmmmmmmmmd......',
  '......dmmmmmmmd.......',
  '....ddmmmmmdd.........',
  '..ddmmdddd............',
  '.dmd..................',
]

// 정령 한 모습: 머리 장식 → 몸 → 입, 양옆에 둥실 뜬 두 손, 떠오르는 알갱이 둘
const spirit = (e: ElementForm, sway: string) =>
  flipbook(sway, dots(e.crown[0], e.pal, 2, 2), dots(e.crown[1], e.pal, 2, 2)) +
  dots(SPIRIT_BODY, e.pal, 0, 5) +
  px(12, 12, 2, 1, e.pal.d!) +
  `<g>${nudge('0 0;0 0.2', sway)}${px(2, 11, 2, 2, e.pal.d!)}${px(17, 10, 2, 2, e.pal.d!)}</g>` +
  // 알갱이는 떠오른 몸(두 점)까지 더해도 상자 위로 나가지 않게 row 2까지만 오른다
  mote(4, 8, 6, e.mote, '1.6s', '0s') +
  mote(17, 7, 5, e.mote, '1.6s', '0.8s')

const elemental: Pet = {
  key: 'elemental',
  name: '엘리멘탈',
  icon: '🌀',
  josa: '이',
  small: pose => {
    const sway = pose === 'run' ? '0.36s' : '1.2s'
    return (
      shadow(5, 10, sway) +
      `<g>${hover(sway)}` +
      // 원소가 2초마다 바뀐다
      flipbook('8s', ...ELEMENTS.map(e => spirit(e, sway))) +
      eyes([10, 13], 9, '3.1s') +
      '</g>'
    )
  },
}

export const PETS: readonly Pet[] = [cat, dog, dragon, elemental]
export const petOf = (key: string | undefined): Pet | null => PETS.find(p => p.key === key) ?? null

// ── 보물상자 (22 × 18점, 바닥은 y = 3.6) ─────────────────────────────
const CHEST: Palette = {
  o: '#4A2810', // 테두리
  w: '#A8652F', // 나무
  d: '#7E4722', // 판자 틈
  l: '#C98547', // 뚜껑 윤기
  i: '#3A1E0B', // 뚜껑 안쪽
  g: GOLD,
  G: GOLD_DARK,
  y: GOLD_LIGHT,
  k: INK, // 열쇠 구멍
}
const LID = [
  '...oooooooooooooooo...',
  '..ollggllllllllggllo..',
  '.owwwggwwwwwwwwggwwwo.',
  '.owwwggwwwwwwwwggwwwo.',
  '.odddggddddddddggdddo.',
  '.oggggggggggggggggggo.',
]
const FRONT = [
  '.oGGGGGGGggggGGGGGGGo.',
  '.owwwggwwgyygwwggwwwo.',
  '.owwwggwwgkkgwwggwwwo.',
  '.odddggddgkkgddggdddo.',
  '.owwwggwwGggGwwggwwwo.',
  '.owwwggwwwwwwwwggwwwo.',
  '.odddggddddddddggdddo.',
  '.owwwggwwwwwwwwggwwwo.',
  '.oGGGGGGGGGGGGGGGGGGo.',
  '.oooooooooooooooooooo.',
]
// 뒤로 젖혀진 뚜껑(안쪽이 보인다)과 금화가 가득한 속
const OPEN_LID = [
  '..oooooooooooooooooo..',
  '..oiiGGiiiiiiiiGGiio..',
  '..oiiGGiiiiiiiiGGiio..',
  '..oiiGGiiiiiiiiGGiio..',
  '..oooooooooooooooooo..',
]
const HOARD = [
  '.oyyyygyyyyyyyyyyyyyo.',
  '.oygyyyyyygyyyyyyygyo.',
  '.ogggyggggggggygggggo.',
]

// 반짝이 (+ 모양, 3 × 3점, 가운데 (col, row)가 하얗다). values: 보이는 차례 (1이 보일 때)
const twinkle = (col: number, row: number, values: string, dur: string) =>
  `<g opacity="0">${step('opacity', values, dur)}` +
  px(col, row - 1, 1, 3, GOLD) +
  px(col - 1, row, 3, 1, GOLD) +
  px(col, row, 1, 1, WHITE) +
  '</g>'

// 닫힌 상자: 가만히 있다가 덜컹덜컹, 뚜껑이 들썩일 때 틈으로 금빛이 샌다
const RATTLE = '0;0.6;0.68;0.76;0.84'
const closedChest = () =>
  '<g>' +
  nudge('0 0;0.2 0;-0.2 0;0.2 0;0 0', '2.4s', RATTLE) +
  px(2, 7, 18, 1, GOLD_LIGHT) +
  dots(FRONT, CHEST, 0, 8) +
  `<g>${nudge('0 0;0 -0.2;0 0;0 -0.2;0 0', '2.4s', RATTLE)}${dots(LID, CHEST, 0, 2)}</g>` +
  '</g>'

export const chestClosed = () =>
  closedChest() + twinkle(1, 1, '0;1;0;0;0;0', '2.4s') + twinkle(20, 1, '0;0;0;1;0;0', '2.4s') + twinkle(20, 11, '0;0;0;0;0;1', '2.4s')

// 가운데 빛기둥: 상자 입구(row 5)에서 위로 솟는다. 가장자리는 금색, 가운데는 연한 금빛, 꼭대기는 가늘다.
// tops: 꼭대기 높이(점 자리)가 차례로 바뀌어 일렁인다
const pillar = (col: number, w: number, tops: readonly number[], dur: string) => {
  // cut: 꼭대기에서 몇 점 내려와 시작하는지
  const part = (c: number, cw: number, fill: string, cut: number) => {
    const y = tops.map(t => at((t + cut) * PX)).join(';')
    const height = tops.map(t => at((5 - t - cut) * PX)).join(';')
    return px(c, tops[0]! + cut, cw, 5 - tops[0]! - cut, fill, step('y', y, dur) + step('height', height, dur))
  }
  return part(col + 1, w - 2, GOLD, 0) + part(col, w, GOLD, 2) + part(col + 1, w - 2, GOLD_LIGHT, 2)
}
// 비스듬한 빛줄기 (2점 폭): 상자 입구에서 seg점 오를 때마다 한 칸씩 바깥(lean)으로 기울며 n토막. 안쪽 한 줄이 밝다
const slant = (col: number, lean: number, seg: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const c = col + lean * i
    const r = 5 - seg * (i + 1)
    return px(c, r, 2, seg, GOLD) + px(lean < 0 ? c + 1 : c, r, 1, seg, GOLD_LIGHT)
  }).join('')
const rays = () =>
  // 가운데 기둥과 바깥 줄기, 안쪽 줄기가 번갈아 밝아진다
  '<g>' +
  pillar(9, 4, [-23, -21, -22, -20], '1.2s') +
  slant(3, -1, 3, 3) +
  slant(17, 1, 3, 3) +
  '</g>' +
  `<g>${step('opacity', '1;1;0', '1.2s')}` +
  slant(6, -1, 5, 4) +
  slant(14, 1, 5, 4) +
  '</g>' +
  // 빛 속을 떠오르는 금가루 (밝은 바탕에서도 보이게 금색과 흰색을 섞는다)
  mote(10, 3, 18, WHITE, '1.8s', '0s') +
  mote(6, 2, 12, GOLD, '1.8s', '0.6s') +
  mote(15, 2, 12, GOLD, '1.8s', '1.2s') +
  mote(12, 1, 20, WHITE, '1.8s', '0.9s')

// 상자 뒤쪽(빛, 젖힌 뚜껑, 금화)과 앞쪽(앞판). 펫은 그 사이에서 튀어나온다
const openBack = () => rays() + dots(OPEN_LID, CHEST, 0, 0) + dots(HOARD, CHEST, 0, 5)
const openFront = () => dots(FRONT, CHEST, 0, 8)

// 열린 상자: 뚜껑이 뒤로 젖혀지고 안에서 빛이 솟는다
export const chestOpen = () => openBack() + openFront()

// 펫이 튀어나올 때 한 번 터지는 금빛 가루 (상자 입구에서 사방으로)
const BURST = [
  [-9, -6],
  [9, -6],
  [-8, -14],
  [8, -14],
  [-4, -20],
  [4, -20],
  [0, -12],
  [-6, -2],
  [6, -2],
]
const burst = () =>
  BURST.map(
    ([dx, dy], i) =>
      `<rect x="2.1" y="1.1" width="0.2" height="0.2" fill="${i % 2 ? GOLD : WHITE}" opacity="0">` +
      '<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.6;1" dur="0.8s" begin="0.45s" fill="freeze"/>' +
      `<animateTransform attributeName="transform" type="translate" values="0 0;${at(dx! * PX)} ${at(dy! * PX)}" keyTimes="0;1" dur="0.8s" begin="0.45s" fill="freeze" calcMode="spline" keySplines="0.1 0.8 0.3 1"/>` +
      '</rect>',
  ).join('')

// 한 번만: begin부터 opacity를 to로 바꿔 둔다
const turn = (to: number, begin: string) => `<animate attributeName="opacity" values="${to};${to}" dur="0.1s" begin="${begin}" fill="freeze"/>`

// 상자에서 펫이 톡 튀어나와 상자 위에 선다. intro면 닫힌 상자가 덜컹하다 뚜껑이 열리고, 작게 웅크린 펫이
// 쭉 늘어나며 튀어 올랐다 내려앉는다. 아니면 다 나온 모습. 펫 발밑(2.2, 3.6)을 중심으로 키우되
// 옆으로는 늘리지 않아 상자 밖에 나가지 않는다
const RISE = -1.8
export const chestReveal = (pet: Pet, intro: boolean) =>
  '<g>' +
  (intro
    ? '<animateTransform attributeName="transform" type="translate" values="0 0;0.2 0;-0.2 0;0.2 0;0 0" dur="0.35s" calcMode="discrete" fill="freeze"/>' +
      `<g>${turn(0, '0.35s')}${closedChest()}</g><g opacity="0">${turn(1, '0.35s')}${openBack()}</g>`
    : openBack()) +
  // intro에서는 뚜껑이 열린 뒤에야 보인다
  (intro ? `<g opacity="0">${turn(1, '0.35s')}` : '<g>') +
  `<g transform="translate(0 ${intro ? 0 : RISE})">` +
  (intro
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${RISE - 1};0 ${RISE}" keyTimes="0;0.55;1" dur="0.6s" begin="0.45s" fill="freeze" calcMode="spline" keySplines="0.2 0.7 0.4 1;0.5 0 0.5 1"/>`
    : '') +
  `<g transform="translate(2.2 3.6)"><g transform="scale(${intro ? 0.3 : 1})">` +
  (intro
    ? '<animateTransform attributeName="transform" type="scale" values="0.3 0.3;1 1.15;1 1" keyTimes="0;0.55;1" dur="0.6s" begin="0.45s" fill="freeze"/>'
    : '') +
  `<g transform="translate(-2.2 -3.6)">${pet.small('stand')}</g></g></g>` +
  '</g></g>' +
  (intro ? `<g opacity="0">${turn(1, '0.35s')}${openFront()}</g>` : openFront()) +
  (intro ? burst() : '') +
  '</g>'
