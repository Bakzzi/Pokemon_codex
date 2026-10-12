// 힐러: 하양과 민트, 초록 하트의 생명 치유사. 간호 모자 → 흰 신발 → 민트 장갑 → 초록 십자 가운 → 연두 망토
// → 치유의 지팡이(초록 수정 하트) → 천사 날개 모자 → 하얀 금빛 가운 → 왕관·후광·생명의 하트 지팡이 → 무지개 후광
// 흰 모자·날개·가운·신발은 밝은 바탕(흰 앱 화면, 흰 말풍선)에 묻히지 않게 바깥으로 민트빛 회색 윤곽을 두른다
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  ORANGE,
  STEP,
  WHITE,
  bigClawd,
  flutter,
  glow,
  halo,
  handSwing,
  pointingArm,
  rect,
  rightArm,
  smallClawd,
  sparkle,
  swap,
} from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const SHADE = '#B8CEC5'
const LINE = '#9CC3B4'
const MINT = '#6EE7B7'
const MINT_DARK = '#10B981'
const MINT_LIGHT = '#D1FAE5'
const GREEN = '#16A34A'
const GREEN_LIGHT = '#4ADE80'
const LIME = '#A3E635'
const LIME_DARK = '#65A30D'
const LIME_LIGHT = '#D9F99D'
const TEAL = '#5EEAD4'
const TEAL_DARK = '#14B8A6'
const SHAFT = '#E7DCC6'
const SHAFT_DARK = '#B9A47E'
const HEART = '#22C55E'
const HEART_DARK = '#15803D'
const HEART_LIGHT = '#BBF7D0'

// 80부터 가운 깃·모자 띠·신발 줄이 금빛으로 바뀐다
const trim = (t: number) => (t >= 8 ? GOLD : MINT)
const capeColors = (t: number) => (t >= 8 ? [TEAL, TEAL_DARK, MINT_LIGHT] : [LIME, LIME_DARK, LIME_LIGHT])

// 흰 신발(20~): 민트 줄과 회색 밑창. 장갑(30~): 민트 고무장갑
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: WHITE, stripe: trim(t), sole: '#9CA3AF' } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: MINT, shine: WHITE } : undefined)

// 글자 그림으로 픽셀 찍기: 한 줄의 같은 글자는 한 칸짜리 막대로 합친다. '.'은 빈칸, flip은 좌우 뒤집기
const n = (v: number) => Math.round(v * 1000) / 1000
const pix = (x0: number, y0: number, s: number, rows: readonly string[], pal: Record<string, string>, flip = false) =>
  rows
    .map((row, j) => {
      let out = ''
      for (let i = 0; i < row.length; ) {
        let k = i
        while (k < row.length && row[k] === row[i]) k++
        const c = pal[row[i]!]
        if (c) out += rect(n(x0 + (flip ? row.length - k : i) * s), n(y0 + j * s), n((k - i) * s), n(s), c)
        i = k
      }
      return out
    })
    .join('')

// 테두리 있는 하트 (9 × 8칸). cx는 가운데, top은 윗변
const HEART_ROWS = ['.OOO.OOO.', 'OHHHOHHHO', 'OHLHHHHHO', 'OHHHHHHHO', '.OHHHHHO.', '..OHHHO..', '...OHO...', '....O....']
const heart = (cx: number, top: number, s: number, fill: string, edge: string, light: string) =>
  pix(cx - 4.5 * s, top, s, HEART_ROWS, { O: edge, H: fill, L: light })

// 천사 날개 (왼쪽 날개: 오른쪽 아래가 뿌리, 왼쪽 위가 끝). S는 아래쪽 깃털 끝의 그늘, 둘레에는 윤곽(pixEdge)을 두른다
const WING_SMALL = ['.WW.....', 'WWWWW...', 'SWWWWWW.', '.SWWWWWW', '..SSWWWW', '...S.SW.']
const WING_BIG = [
  '.WWW........',
  'WWWWWW......',
  'WWWWWWWWW...',
  'SWWWWWWWWWW.',
  '.SWWWWWWWWWW',
  '..SSWWWWWWWW',
  '...S.SSWWWWW',
  '....S..S.SWW',
]
const WING_PAL = { W: WHITE, S: SHADE }

// ── 윤곽 ─────────────────────────────────────────────────────────
// 흰 장비 둘레를 바깥으로 o만큼 부풀린 민트빛 회색 판. 장비보다 먼저(뒤에) 그리면 몸·옷·장비가 안쪽을 덮어 테두리만 남는다.
// 작은 그림은 0.25칸, 큰 그림은 3px

// 부풀린 사각형들 ([x, y, 폭, 높이] 목록)
const edge = (parts: readonly (readonly number[])[], o: number) =>
  parts.map(([x, y, w, h]) => rect(n(x! - o), n(y! - o), n(w! + 2 * o), n(h! + 2 * o), LINE)).join('')

// 글자 그림 윤곽: 줄마다 빈칸('.')으로 끊긴 덩어리를 한 막대로 부풀린다 (깃털 사이 좁은 틈은 윤곽으로 메워진다). flip은 pix와 같다
const pixEdge = (x0: number, y0: number, s: number, rows: readonly string[], o: number, flip = false) => {
  const parts: number[][] = []
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; ) {
      if (row[i] === '.') {
        i++
        continue
      }
      let k = i
      while (k < row.length && row[k] !== '.') k++
      parts.push([x0 + (flip ? row.length - k : i) * s, y0 + j * s, (k - i) * s, s])
      i = k
    }
  })
  return edge(parts, o)
}

// 간호 모자 모양: 둥근 윗단, 머리를 덮는 몸통, 넓은 챙 (작은 그림 칸 / 큰 그림 px)
const SMALL_CAP = [[12.8, 1, 4.4, 0.4], [12.4, 1.3, 5.2, 1.3], [11.6, 2.4, 6.8, 0.9]] as const
const BIG_CAP = [[346, 8, 48, 5], [342, 12, 56, 18], [334, 26, 72, 12]] as const

// ── 작은 그림 ─────────────────────────────────────────────────────

// 망토(50~): 연두 망토가 뒤로 부드럽게 휘날린다. 80부터 민트에 금빛 단
const smallCape = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = capeColors(t)
  return (
    rect(10, 3.8, 9.4, 6.2, c!) +
    rect(7.6, 4.2, 2.6, 5, c!, swap('height', 5, 4)) +
    rect(5.8, 4.8, 2, 3.4, c!, swap('height', 3.4, 2.4)) +
    rect(9.6, 4.2, 0.6, 4.6, l!, swap('height', 4.6, 3.6)) +
    rect(7.6, 4.2, 0.4, 3.6, d!, swap('height', 3.6, 2.6)) +
    (t >= 8 ? rect(10, 9.7, 9.4, 0.3, GOLD) : '')
  )
}

// 모자 윤곽 (등 뒤에 그려 몸과 모자가 안쪽을 덮는다. 망토보다 위)
const smallCapEdge = (t: number) => (t < 1 ? '' : edge(SMALL_CAP, 0.25))

// 흰 신발(20~) 윤곽: legs가 그리는 신발(1.8 × 0.9칸) 위·양옆 0.25칸 (아래는 회색 밑창이 테가 된다).
// 등 뒤에 그려 다리·신발이 안쪽을 덮는다. 달릴 때는 디딘 발(발끝 11)과 든 발(10)이 같은 박자로 바뀐다
const smallShoeEdge = (t: number, pose: Pose) => {
  if (!boot(t)) return ''
  const top = (bottom: number) => n(bottom - 0.9 - 0.25)
  return [11, 13, 16, 18]
    .map(x => {
      // smallClawd: 달릴 때 앞 장면은 11·16을 딛고, 뒤 장면은 13·18을 딛는다
      const [a, b] = pose !== 'run' ? [11, 11] : x === 11 || x === 16 ? [11, 10] : [10, 11]
      return rect(n(x - 0.65), top(a), 2.3, 1.15, LINE, a === b ? '' : swap('y', top(a), top(b)))
    })
    .join('')
}

// 가운(40~): 흰 가운에 민트 깃, 가슴의 초록 십자. 80부터 금빛 깃·단과 금테 십자.
// 가운 양옆과 단에는 0.25칸 윤곽 (단 윤곽은 다리 위로 지나간다)
const smallCoat = (t: number) => {
  if (t < 4) return ''
  const tr = trim(t)
  return (
    rect(10.35, 6.3, 9.3, 3.55, LINE) +
    rect(10.6, 6.3, 8.8, 3.3, WHITE) +
    rect(10.6, 6.3, 0.4, 3.3, SHADE) +
    rect(19, 6.3, 0.4, 3.3, SHADE) +
    rect(14.3, 6.3, 1.4, 0.6, ORANGE) +
    rect(12.6, 6.3, 1.7, 0.55, tr) +
    rect(15.7, 6.3, 1.7, 0.55, tr) +
    rect(10.6, 9.25, 8.8, 0.35, tr) +
    (t >= 8 ? rect(14.4, 6.85, 1.2, 2.3, GOLD) + rect(13.9, 7.35, 2.2, 1.2, GOLD) : '') +
    rect(14.6, 7, 0.8, 2, GREEN) +
    rect(14.1, 7.55, 1.8, 0.8, GREEN)
  )
}

// 머리: 간호 모자(10~) → 천사 날개(70~, 모자 양옆에서 파닥) → 금빛 띠(80~) → 왕관(90~)
// 날개 윤곽은 날개와 한 묶음으로 같이 파닥인다
const smallHead = (t: number) => {
  if (t < 1) return ''
  const rx = 30 - 9.3 - 8 * 0.33
  const wings =
    t >= 7
      ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>` +
        pixEdge(9.3, 0.7, 0.33, WING_SMALL, 0.25) +
        pixEdge(rx, 0.7, 0.33, WING_SMALL, 0.25, true) +
        pix(9.3, 0.7, 0.33, WING_SMALL, WING_PAL) +
        pix(rx, 0.7, 0.33, WING_SMALL, WING_PAL, true) +
        '</g>'
      : ''
  return (
    wings +
    SMALL_CAP.map(([x, y, w, h]) => rect(x, y, w, h, WHITE)).join('') +
    rect(11.6, 2.75, 6.8, 0.3, trim(t)) +
    rect(12.4, 1.3, 0.35, 1.1, SHADE) +
    rect(14.65, 1.15, 0.7, 1.45, GREEN) +
    rect(14.2, 1.55, 1.6, 0.65, GREEN) +
    (t >= 9
      ? rect(13, 0.35, 4, 0.7, GOLD) +
        rect(13, -0.25, 0.7, 0.7, GOLD) +
        rect(14.65, -0.55, 0.7, 1, GOLD) +
        rect(16.3, -0.25, 0.7, 0.7, GOLD) +
        rect(13, 0.85, 4, 0.2, GOLD_DARK)
      : '')
  )
}

// 치유의 지팡이(60~): 손 바로 위에 초록 수정 하트. 80부터 금빛 자루, 90부터 금테 하트가 숨 쉬듯 빛난다
const smallStaff = (t: number) => {
  if (t < 6) return ''
  const shaft = t >= 8 ? GOLD : SHAFT
  const shade = t >= 8 ? GOLD_DARK : SHAFT_DARK
  return (
    '<g>' +
    handSwing +
    rect(20.3, 5.4, 0.6, 4.4, shaft) +
    rect(20.7, 5.4, 0.2, 4.4, shade) +
    (t >= 9 ? `<g opacity="0.4">${glow()}${heart(20.6, 2.85, 0.44, GREEN_LIGHT, GREEN_LIGHT, GREEN_LIGHT)}</g>` : '') +
    heart(20.6, 3.3, 0.33, HEART, t >= 9 ? GOLD : HEART_DARK, HEART_LIGHT) +
    '</g>'
  )
}

// 레벨 90~: 머리 위 후광과 초록 십자 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.6, 3.2, 0.7, 0.4, t) +
      [[6.6, 1.2, '0s'], [22.8, 1.8, '0.8s']]
        .map(
          ([x, y, b]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect((x as number) - 0.2, (y as number) - 0.7, 0.4, 1.4, GREEN_LIGHT) +
            rect((x as number) - 0.7, (y as number) - 0.2, 1.4, 0.4, GREEN_LIGHT) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCape(t) + smallCapEdge(t) + smallShoeEdge(t, pose),
    boot: boot(t),
    body: smallCoat(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallStaff(t),
    over: smallGlory(t),
  })

// 손끝에서 초록 빛 구슬(60부터 하트)이 날아가 몬스터 앞에서 부드럽게 퍼진다. 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const core = t >= 9 ? GOLD_LIGHT : WHITE
  const ray = (dx: number, dy: number, w: number, h: number, c: string) => rect(dx - w / 2, dy - h / 2, w, h, c)
  const ball =
    t >= 6
      ? heart(0, -1.2, t >= 9 ? 0.32 : 0.28, GREEN_LIGHT, t >= 9 ? GOLD : GREEN, core)
      : ray(0, 0, 1.8, 1, GREEN_LIGHT) + ray(0, 0, 1, 1.8, GREEN_LIGHT) + ray(0, 0, 0.8, 0.8, core)
  const fly =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.46;0.59;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="16 7;16 7;25 7;25 7" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    // 뒤로 남는 반짝이 꼬리
    rect(-2.6, -0.2, 1, 0.4, MINT) +
    rect(-3.8, 0.4, 0.5, 0.5, MINT_DARK) +
    rect(-3.3, -1, 0.5, 0.5, t >= 9 ? GOLD : MINT_DARK) +
    `<g opacity="0.5">${ray(0, 0, 3, 1.8, MINT)}${ray(0, 0, 1.8, 3, MINT)}</g>` +
    ball +
    '</g>'
  // 몬스터 앞에서 둥글게 퍼지는 초록 빛(점 여덟 개의 고리)과 위로 떠오르는 십자
  const burst =
    '<g transform="translate(27 7)"><g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0.85;0;0" keyTimes="0;0.6;0.62;0.68;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="scale" values="0.5;0.5;1;1.35;1.35" keyTimes="0;0.6;0.64;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.55">${ray(0, 0, 4.4, 2.4, MINT)}${ray(0, 0, 2.4, 4.4, MINT)}</g>` +
    [[-2.6, 0], [2.6, 0], [0, -2.6], [0, 2.6]].map(([x, y]) => ray(x!, y!, 0.8, 0.8, GREEN_LIGHT)).join('') +
    [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].map(([x, y]) => ray(x!, y!, 0.6, 0.6, MINT_DARK)).join('') +
    ray(0, 0, 2.4, 0.9, GREEN_LIGHT) +
    ray(0, 0, 0.9, 2.4, GREEN_LIGHT) +
    ray(0, 0, 1, 1, core) +
    '</g></g>'
  const plus = (x: number, y: number, c: string) =>
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.63;0.76;0.86;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -2.4;0 -2.4" keyTimes="0;0.6;0.86;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(x - 0.2, y - 0.6, 0.4, 1.2, c) +
    rect(x - 0.6, y - 0.2, 1.2, 0.4, c) +
    '</g>'
  return fly + burst + plus(25.2, 4.6, GREEN) + plus(29.4, 5.4, t >= 9 ? GOLD : MINT_DARK)
}

// ── 큰 그림 ───────────────────────────────────────────────────────

const bigCape = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = capeColors(t)
  return (
    rect(316, 40, 108, 66, c!) +
    rect(424, 46, 16, 54, c!, flutter(54, 40)) +
    rect(440, 54, 10, 38, c!, flutter(38, 26)) +
    rect(424, 46, 4, 50, d!, flutter(50, 36)) +
    rect(316, 40, 6, 62, l!) +
    (t >= 8 ? rect(316, 102, 108, 4, GOLD) : '')
  )
}

// 모자 윤곽 (등 뒤에 그려 몸과 모자가 안쪽을 덮는다. 망토보다 위)
const bigCapEdge = (t: number) => (t < 1 ? '' : edge(BIG_CAP, 3))

// 흰 신발(20~) 윤곽: bigShoes의 신발(x-4 ~ x+14, y 102~116) 위·양옆 3px. 아래는 회색 밑창이 테가 된다.
// 등 뒤에 그려 다리·신발이 안쪽을 덮는다 (나란한 두 신발 사이 2px 틈은 윤곽으로 메워진다)
const bigShoeEdge = (t: number) => (boot(t) ? [330, 350, 380, 400].map(x => rect(x - 7, 99, 24, 17, LINE)).join('') : '')

// 가운: 양옆·단 3px 윤곽 (단 윤곽은 신발 위로 지나간다)
const bigCoat = (t: number) => {
  if (t < 4) return ''
  const tr = trim(t)
  return (
    rect(321, 72, 98, 33, LINE) +
    rect(324, 72, 92, 30, WHITE) +
    rect(324, 72, 5, 30, SHADE) +
    rect(411, 72, 5, 30, SHADE) +
    // 브이넥과 깃
    rect(362, 72, 16, 6, ORANGE) +
    rect(366, 78, 8, 3, ORANGE) +
    rect(340, 72, 22, 6, tr) +
    rect(378, 72, 22, 6, tr) +
    rect(352, 78, 10, 4, tr) +
    rect(378, 78, 10, 4, tr) +
    // 단추
    rect(368, 85, 4, 4, t >= 8 ? GOLD : MINT_DARK) +
    rect(368, 92, 4, 4, t >= 8 ? GOLD : MINT_DARK) +
    // 가슴의 초록 십자 (80부터 금테)
    (t >= 8 ? rect(339, 78, 14, 22, GOLD) + rect(335, 82, 22, 14, GOLD) : '') +
    rect(342, 80, 8, 18, GREEN) +
    rect(337, 85, 18, 8, GREEN) +
    // 오른쪽 주머니와 민트 펜
    rect(386, 86, 16, 11, SHADE) +
    rect(388, 86, 12, 9, WHITE) +
    rect(390, 81, 3, 7, MINT_DARK) +
    rect(324, 98, 92, 4, tr)
  )
}

const bigHead = (t: number) => {
  if (t < 1) return ''
  const rx = 740 - 296 - 48
  const wings =
    t >= 7
      ? '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="0.9s" repeatCount="indefinite"/>' +
        pixEdge(296, 2, 4, WING_BIG, 3) +
        pixEdge(rx, 2, 4, WING_BIG, 3, true) +
        pix(296, 2, 4, WING_BIG, WING_PAL) +
        pix(rx, 2, 4, WING_BIG, WING_PAL, true) +
        '</g>'
      : ''
  return (
    wings +
    // 간호 모자: 둥근 윗단, 챙, 민트 띠, 초록 십자
    BIG_CAP.map(([x, y, w, h]) => rect(x, y, w, h, WHITE)).join('') +
    rect(334, 30, 72, 4, trim(t)) +
    rect(342, 12, 5, 14, SHADE) +
    rect(334, 36, 72, 2, SHADE) +
    rect(366, 10, 8, 18, GREEN) +
    rect(361, 15, 18, 8, GREEN) +
    (t >= 9
      ? rect(350, 0, 40, 8, GOLD) +
        rect(350, -7, 8, 8, GOLD) +
        rect(366, -11, 8, 12, GOLD) +
        rect(382, -7, 8, 8, GOLD) +
        rect(350, 6, 40, 2, GOLD_DARK) +
        rect(353, 2, 4, 3, HEART) +
        rect(368, 1, 4, 4, HEART) +
        rect(383, 2, 4, 3, HEART)
      : '')
  )
}

// 오른팔과 지팡이: 끝·대기는 하트 지팡이를 높이 들고, 오류는 축 늘어뜨려 하트가 바닥에 끌린다
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return rightArm(variant, g)
  const shaft = t >= 8 ? GOLD : SHAFT
  const shade = t >= 8 ? GOLD_DARK : SHAFT_DARK
  const edge = t >= 9 ? GOLD : HEART_DARK
  if (variant === 'error') {
    return (
      rightArm(variant, g) +
      rect(417, 92, 6, 24, shaft) +
      rect(421, 92, 2, 24, shade) +
      heart(420, 112, 3, HEART, edge, HEART_LIGHT) +
      (g ? rect(411, 88, 18, 16, g.color) : '')
    )
  }
  const hand = g ? rect(409, 27, 24, 20, g.color) + (g.shine ? rect(412, 29, 7, 5, g.shine) : '') : ''
  return (
    rightArm(variant, g) +
    rect(418, 4, 6, 60, shaft) +
    rect(422, 4, 2, 60, shade) +
    (t >= 9 ? `<g opacity="0.4">${glow()}${heart(421, -24, 5.4, GREEN_LIGHT, GREEN_LIGHT, GREEN_LIGHT)}</g>` : '') +
    heart(421, -18, 4, HEART, edge, HEART_LIGHT) +
    (t >= 8 ? rect(413, 14, 16, 5, GOLD) : '') +
    hand
  )
}

// 가리키는 팔의 콕콕 찌르는 움직임 (pointingArm에서 그대로 꺼내 쓴다: 끝동이 장갑과 한 몸처럼 움직인다)
const POINT_MOTION = pointingArm().match(/<animateTransform[^>]*\/>/)?.[0] ?? ''

// 가리키는 장갑의 흰 소매 끝동: 손목 쪽(오른쪽)과 위아래에 3px 윤곽을 둘러 밝은 바탕에서도 보이게 한다.
// 손가락 주름 색은 crease로 넘긴다
const bigPointCuff = (t: number) =>
  glove(t) ? '<g>' + POINT_MOTION + rect(298, 55, 7, 32, LINE) + rect(298, 58, 4, 26, WHITE) + '</g>' : ''

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -22, 34, 7, 4, t) + sparkle(306, 30, 12, GREEN_LIGHT, '0.3s') + sparkle(450, 34, 12, GOLD, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCape(t) + bigCapEdge(t) + bigShoeEdge(t),
    boot: boot(t),
    body: bigCoat(t),
    head: bigHead(t),
    glove: glove(t),
    // 민트 고무장갑의 손가락 주름은 진한 민트
    crease: MINT_DARK,
    arm: bigArm(variant, t),
    over: bigPointCuff(t) + bigGlory(t),
  })

export const healer: Job = {
  key: 'healer',
  name: '힐러',
  icon: '💚',
  gear: [
    '',
    '간호 모자',
    '흰 신발',
    '민트 장갑',
    '초록 십자 가운',
    '연두 망토',
    '치유의 지팡이',
    '천사 날개 모자',
    '하얀 금빛 가운',
    '왕관·후광·생명의 하트 지팡이',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : 0),
  bigHeadroom: t => (t >= 9 ? 36 : t >= 6 ? 20 : 0),
}
