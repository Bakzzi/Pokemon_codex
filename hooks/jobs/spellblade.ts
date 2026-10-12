// 마검사: 남색 경갑에 푸른 룬을 새기고, 번개가 튀는 마검을 든다. 룬 서클릿 → 은빛 장화 → 룬 장갑 → 룬 경갑
// → 푸른 반망토(한밤의 남색 천에 푸른 단) → 번개 마검 → 날개 투구 → 청은 룬갑(망토 단에 빛나는 룬) → 왕관·후광·뇌신검 → 무지개 후광
import { ATK } from '../monsters.ts'
import { GOLD, GOLD_DARK, GOLD_LIGHT, ORANGE, bigClawd, glow, halo, handSwing, rect, rightArm, smallClawd, swap } from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const NAVY = '#26357A'
const NAVY_DARK = '#172152'
const NAVY_LIGHT = '#4A60B8'
const CYAN = '#22D3EE'
const CYAN_LIGHT = '#A5F3FC'
const CYAN_DARK = '#0E7490'
const SPARK = '#ECFEFF'
const WHITE = '#FFFFFF'
const SILVER = '#C3CCD6'
const SILVER_DARK = '#8792A0'
const SILVER_LIGHT = '#EEF2F6'
const BLADE = '#D4F3FA'
const BLADE_EDGE = '#7FCFE3'
const MIDNIGHT = '#1A2257'
const MIDNIGHT_LIGHT = '#33408A'
const MIDNIGHT_DARK = '#10163D'
const HALO_CYAN = '#67E8F9'

// 80부터 청은 룬갑: 남색 판이 푸른 기가 도는 은빛으로 바뀐다 [판, 윗단, 그늘]
const armorColors = (t: number) => (t >= 8 ? ['#DCE7F2', '#F7FAFD', '#9AA8B8'] : [NAVY, NAVY_LIGHT, NAVY_DARK])
// 반망토(50~): 한밤의 남색 천에 푸른 단과 안감. 80부터 단이 더 밝게 빛나고 룬이 새겨진다 [천, 밝은 면, 주름, 단]
const capeColors = (t: number) => [MIDNIGHT, MIDNIGHT_LIGHT, MIDNIGHT_DARK, t >= 8 ? CYAN_LIGHT : CYAN]

// 꺾은선(x가 커지는 점들) 위의 y: 망토 윗선·아랫단을 칸마다 잴 때 쓴다 (양 끝 밖은 끝점 높이)
const lineY = (pts: readonly (readonly [number, number])[], x: number) => {
  const j = pts.findIndex(q => q[0] >= x)
  if (j <= 0) return pts[j < 0 ? pts.length - 1 : 0]![1]
  const [x0, y0] = pts[j - 1]!
  const [x1, y1] = pts[j]!
  return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
}

// 은빛 장화(20~): 은색 장화에 푸른 줄. 룬 장갑(30~): 남색 장갑에 푸른 룬 빛
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: '#CBD5E1', stripe: CYAN, sole: NAVY_DARK } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: NAVY, shine: CYAN } : undefined)

const r2 = (v: number) => Math.round(v * 100) / 100

// 칸 목록 [x, y, 폭, 높이]을 한 색으로 칠한다 (테두리용)
const rects = (list: readonly (readonly number[])[], fill: string) => list.map(([x, y, w, h]) => rect(x!, y!, w!, h!, fill)).join('')

// 번개 불꽃: 짧게 번쩍였다 사라진다. begin을 엇갈려 여기저기서 튀게 한다
const flicker = (dur: string, begin: string) =>
  `<animate attributeName="opacity" values="0;1;0;0;1;0;0;0" dur="${dur}" begin="${begin}" calcMode="discrete" repeatCount="indefinite"/>`
const flash = (dur: string, begin: string, inner: string) => `<g opacity="0">${flicker(dur, begin)}${inner}</g>`

// 점들을 이은 번개 줄기: s 크기 칸을 줄 따라 겹치게 찍는다 (계단처럼 꺾인 픽셀 선, 틈이 안 생기게 간격은 칸보다 조금 좁게)
type Pts = readonly (readonly [number, number])[]
const bolt = (pts: Pts, s: number, color: string) =>
  pts
    .slice(1)
    .map((q, i) => {
      const p = pts[i]!
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / (s * 0.85)))
      return Array.from({ length: n + 1 }, (_, k) =>
        rect(r2(p[0] + ((q[0] - p[0]) * k) / n - s / 2), r2(p[1] + ((q[1] - p[1]) * k) / n - s / 2), s, s, color),
      ).join('')
    })
    .join('')

// 십자 불꽃 (가운데 x, y, 크기)
const twinkle = (x: number, y: number, s: number, color: string) =>
  rect(r2(x - s * 0.15), r2(y - s / 2), r2(s * 0.3), s, color) + rect(r2(x - s / 2), r2(y - s * 0.15), s, r2(s * 0.3), color)

// ── 작은 그림 ─────────────────────────────────────────────────────

// 반망토(50~): 왼쪽 어깨에서 늘어져 등 뒤로 비스듬히 펄럭인다. 자락마다 윗면은 밝고 아랫단은 푸르다
const CAPE_FLAPS: readonly [number, number, number, number, number][] = [
  // x, y, 폭, 높이, 펄럭일 때 높이
  [8.7, 4.6, 1.5, 4.2, 3.6],
  [7.5, 5.3, 1.4, 3.3, 2.6],
  [6.5, 6.1, 1.2, 2.3, 1.6],
]
const smallCapeBack = (t: number) => {
  if (t < 5) return ''
  const [c, l, , trim] = capeColors(t)
  // 아랫단은 자락과 같이 오르내린다
  const hem = (x: number, y: number, w: number, h: number, h2: number) =>
    rect(x, r2(y + h - 0.4), w, 0.4, trim!, swap('y', r2(y + h - 0.4), r2(y + h2 - 0.4)))
  return (
    rect(10, 4, 1.6, 5, c!) +
    rect(10, 8.6, 1.6, 0.4, trim!) +
    CAPE_FLAPS.map(([x, y, w, h, h2]) => rect(x, y, w, h, c!, swap('height', h, h2)) + rect(x, y, w, 0.35, l!) + hem(x, y, w, h, h2)).join('') +
    // 80~: 자락마다 룬 점이 숨 쉬듯 빛난다
    (t >= 8
      ? `<g opacity="0.5">${glow('1.6s')}` +
        CAPE_FLAPS.map(([x, y, w]) => rect(r2(x + w / 2 - 0.2), r2(y + 0.8), 0.4, 0.4, SPARK)).join('') +
        '</g>'
      : '')
  )
}
// 어깨에 걸친 부분과 은 걸쇠, 가장자리의 푸른 안감
const smallMantle = (t: number) => {
  if (t < 5) return ''
  const [c, l, , trim] = capeColors(t)
  return (
    rect(10.1, 4.2, 2.2, 1.4, c!) +
    rect(10.1, 4.2, 2.2, 0.3, l!) +
    rect(10.1, 5.35, 2.2, 0.25, trim!) +
    rect(11.6, 4.55, 0.6, 0.6, SILVER) +
    rect(11.75, 4.7, 0.3, 0.3, CYAN)
  )
}

// 가슴의 룬: 가로지르는 두 줄과 가운데 번개 룬
const smallRunes = (c: string) =>
  rect(11.4, 7.3, 2.7, 0.25, c) +
  rect(15.9, 7.3, 2.7, 0.25, c) +
  rect(15.1, 6.7, 0.5, 0.6, c) +
  rect(14.75, 7.15, 0.5, 0.4, c) +
  rect(14.75, 7.4, 1.05, 0.35, c) +
  rect(14.75, 7.6, 0.5, 0.4, c) +
  rect(14.45, 7.95, 0.5, 0.5, c)

// 룬 경갑(40~, 80부터 청은): 가슴판·허리띠·작은 어깨받이, 룬은 숨 쉬듯 밝아진다
const smallArmor = (t: number) => {
  if (t < 4) return ''
  const [plate, edge, dark] = armorColors(t)
  return (
    rect(11, 6.3, 8, 2.7, plate!) +
    rect(11, 6.3, 8, 0.3, edge!) +
    smallRunes(t >= 8 ? '#0EA5C6' : CYAN) +
    `<g opacity="0.3">${glow('1.6s')}${smallRunes(SPARK)}</g>` +
    rect(11, 8.5, 8, 0.5, t >= 8 ? NAVY : dark!) +
    rect(14.6, 8.45, 0.8, 0.6, CYAN) +
    rect(10, 5, 2, 1.2, plate!) +
    rect(10, 5, 2, 0.3, edge!) +
    rect(18, 5, 2, 1.2, plate!) +
    rect(18, 5, 2, 0.3, edge!)
  )
}

// 이마의 룬 보석: 마름모 (서클릿과 투구가 같이 쓴다). 둘레가 숨 쉬듯 빛난다
const smallGem = (x: number, y: number) =>
  `<g opacity="0.3">${glow('1.6s')}${rect(x - 0.5, y + 0.3, 2, 0.8, CYAN)}${rect(x + 0.1, y - 0.5, 0.8, 2, CYAN)}</g>` +
  rect(x + 0.2, y - 0.2, 0.6, 0.3, CYAN) +
  rect(x, y + 0.1, 1, 1, CYAN) +
  rect(x + 0.2, y + 1.1, 0.6, 0.3, CYAN_DARK) +
  rect(x + 0.2, y + 0.3, 0.35, 0.35, SPARK)

// 투구 날개 (왼쪽): 깃털 셋이 위로 갈수록 길어진다. 오른쪽은 x를 15 기준으로 뒤집는다
const WING: readonly [number, number, number][] = [
  // x, y, 폭 (깃털 끝은 왼쪽)
  [9.0, 0.5, 2.0],
  [9.4, 1.4, 1.7],
  [9.9, 2.3, 1.2],
]
const smallWings = (t: number) =>
  [false, true]
    .map(flip => {
      const fx = (x: number, w: number) => (flip ? r2(30 - x - w) : x)
      const tip = t >= 8 ? CYAN_LIGHT : WHITE
      return (
        rect(fx(10.5, 0.7), 0.9, 0.7, 2.4, SILVER) +
        WING.map(
          ([x, y, w], i) =>
            rect(fx(x, w), y, w, 0.6, WHITE) +
            rect(fx(x, w), r2(y + 0.6), w, 0.25, SILVER) +
            // 80~: 맨 위 깃털에 은빛 윗선을 둘러 밝은 바탕에서도 날개 윤곽이 보이게 한다
            (i === 0 && t >= 8 ? rect(fx(x, w), y, w, 0.2, SILVER) : '') +
            rect(fx(x - 0.4, 0.5), r2(y + 0.15), 0.5, 0.45, tip),
        ).join('')
      )
    })
    .join('')

// 80~ 은빛 투구는 밝은 바탕에 묻히지 않게 둥근 윗면·계단진 어깨·양옆을 따라 짙은 은테(0.25칸)를 두른다
const SMALL_HELM_RIM: readonly (readonly number[])[] = [
  [11.6, 1.4, 6.8, 0.25], // 꼭대기
  [11.6, 1.4, 0.25, 0.85], // 윗단 왼쪽 (어깨까지 잇는다)
  [18.15, 1.4, 0.25, 0.85], // 윗단 오른쪽
  [11, 2, 0.6, 0.25], // 어깨 (왼쪽)
  [18.4, 2, 0.6, 0.25], // 어깨 (오른쪽)
  [11, 2, 0.25, 1.1], // 왼쪽 (챙까지)
  [18.75, 2, 0.25, 1.1], // 오른쪽
]

// 머리: 룬 서클릿(10~) → 날개 투구(70~, 80부터 짙은 은테를 두른 더 밝은 은빛) → 왕관(90~)
const smallHead = (t: number) => {
  if (t >= 7) {
    const [c, d] = t >= 8 ? [SILVER_LIGHT, SILVER] : [SILVER, SILVER_DARK]
    return (
      smallWings(t) +
      rect(11, 2, 8, 1.6, c!) +
      rect(11.6, 1.4, 6.8, 0.7, c!) +
      rect(10.6, 3.1, 8.8, 0.6, d!) +
      // 흰 빛: 70은 꼭대기에, 80부터는 은테 바로 안쪽에
      (t >= 8 ? rects(SMALL_HELM_RIM, SILVER_DARK) + rect(11.85, 1.65, 6.3, 0.25, WHITE) : rect(11.6, 1.4, 6.8, 0.25, WHITE)) +
      smallGem(14.5, 2) +
      (t >= 9
        ? rect(12.4, 0.5, 5.2, 0.9, GOLD) +
          rect(12.4, -0.1, 0.8, 0.7, GOLD) +
          rect(14.6, -0.5, 0.8, 1.1, GOLD) +
          rect(16.8, -0.1, 0.8, 0.7, GOLD) +
          rect(12.4, 1.1, 5.2, 0.3, GOLD_DARK) +
          rect(14.7, 0.65, 0.6, 0.5, CYAN)
        : '')
    )
  }
  if (t >= 1) {
    // 가는 은 고리와 이마 위로 솟은 룬 보석
    return rect(10.8, 2.95, 8.4, 0.6, SILVER) + rect(10.8, 2.95, 8.4, 0.25, SILVER_LIGHT) + smallGem(14.5, 2)
  }
  return ''
}

// 뇌신검의 칼날: 번개처럼 좌우로 꺾이며 올라간다 [아래 y, 위 y, x]
const SMALL_ZIG: readonly [number, number, number][] = [
  [6, 4.5, 20.25],
  [4.5, 3, 19.8],
  [3, 1.5, 20.25],
  [1.5, 0, 19.8],
]

// 번개 마검(60~): 칼날을 감싸는 푸른 빛과 튀는 불꽃. 90부터 번개 모양으로 꺾인 뇌신검
const smallSword = (t: number) => {
  if (t < 6) return ''
  if (t >= 9) {
    return (
      '<g>' +
      handSwing +
      `<g opacity="0.4">${glow('0.8s')}` +
      SMALL_ZIG.map(([b, top, x]) => rect(r2(x - 0.4), top, 1.9, b - top, CYAN)).join('') +
      rect(19.6, -1.1, 1.3, 1.2, CYAN) +
      '</g>' +
      SMALL_ZIG.map(([b, top, x]) => rect(x, top, 1.1, b - top, CYAN_LIGHT) + rect(r2(x + 0.35), top, 0.35, b - top, WHITE)).join('') +
      rect(19.95, -0.5, 0.8, 0.5, CYAN_LIGHT) +
      rect(20.15, -0.9, 0.4, 0.4, WHITE) +
      rect(20.45, 6.4, 0.4, 0.8, GOLD_DARK) +
      rect(19.3, 6, 2.6, 0.5, GOLD) +
      rect(20.35, 5.9, 0.6, 0.7, CYAN) +
      // 칼날을 타고 오르는 번개
      flash('0.6s', '0s', bolt([[19.2, 4.4], [18.8, 3.2], [19.3, 2.2], [18.9, 1]], 0.35, SPARK)) +
      flash('0.6s', '0.3s', bolt([[22, 3.8], [22.4, 2.6], [21.9, 1.6], [22.3, 0.2]], 0.35, SPARK)) +
      flash('0.9s', '0.15s', twinkle(18.9, -0.4, 0.9, CYAN_LIGHT)) +
      flash('0.9s', '0.5s', twinkle(22.6, 4.8, 0.9, CYAN_LIGHT)) +
      '</g>'
    )
  }
  const guard = t >= 8 ? SILVER_LIGHT : NAVY_LIGHT
  return (
    '<g>' +
    handSwing +
    `<g opacity="0.35">${glow('0.9s')}${rect(19.95, 1.0, 1.4, 5, CYAN)}${rect(20.25, 0.5, 0.8, 0.5, CYAN)}</g>` +
    rect(20.25, 1.4, 0.8, 4.7, BLADE) +
    rect(20.25, 1.4, 0.25, 4.7, WHITE) +
    rect(20.85, 1.4, 0.2, 4.7, BLADE_EDGE) +
    rect(20.55, 1.9, 0.25, 3.6, CYAN) +
    rect(20.45, 0.95, 0.4, 0.45, BLADE) +
    rect(20.45, 6.4, 0.4, 0.8, NAVY_DARK) +
    rect(19.7, 6, 1.9, 0.45, guard) +
    rect(20.4, 5.95, 0.5, 0.55, CYAN) +
    flash('0.7s', '0s', twinkle(19.4, 2.4, 0.8, CYAN_LIGHT)) +
    flash('0.7s', '0.25s', rect(21.5, 3.3, 0.35, 0.35, SPARK)) +
    flash('0.7s', '0.45s', twinkle(21.6, 1.2, 0.8, CYAN_LIGHT)) +
    '</g>'
  )
}

// 레벨 90~: 머리 위 푸른 후광과 여기저기 튀는 번개 불꽃
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.6, 3.2, 0.7, 0.4, t, HALO_CYAN) +
      flash('1.6s', '0s', bolt([[6.6, 0.4], [7.4, 1.2], [6.8, 1.8], [7.6, 2.6]], 0.35, CYAN_LIGHT)) +
      flash('1.6s', '0.8s', bolt([[22.6, 6.8], [23.2, 7.6], [22.6, 8.2], [23.2, 9]], 0.35, CYAN_LIGHT))

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCapeBack(t),
    boot: boot(t),
    body: smallArmor(t) + smallMantle(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallSword(t),
    over: smallGlory(t),
  })

// 푸른 번개가 지그재그로 몬스터 앞을 가른다. 번쩍인 뒤 한 번 더 깜빡이고, 불똥이 튄다.
// 마검(60~)을 든 뒤로 줄기가 굵어지고, 90부터는 가지를 치며 더 밝아진다
const ZIG: Pts = [
  [20.2, 3.8],
  [22.3, 5.3],
  [21.1, 6.5],
  [23.2, 8.1],
  [22.0, 8.9],
  [23.9, 10.5],
]
const ZIG_BRANCH: Pts = [
  [22.3, 5.3],
  [24.1, 4.6],
  [24.8, 5.6],
]
const hit = (t: number) => {
  if (t >= 10) return ''
  const big = t >= 9
  const [outer, main]: [number, number] = big ? [1.5, 0.8] : t >= 6 ? [1.2, 0.65] : [0.95, 0.5]
  const fly = (dx: number, dy: number, x: number, y: number) =>
    rect(
      x,
      y,
      0.45,
      0.45,
      SPARK,
      `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${dx} ${dy};${dx} ${dy}" keyTimes="0;0.6;0.74;1" dur="${ATK}" repeatCount="indefinite"/>`,
    )
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0.35;1;0;0" keyTimes="0;0.58;0.62;0.66;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.45">${bolt(ZIG, outer, CYAN)}${big ? bolt(ZIG_BRANCH, 1.1, CYAN) : ''}</g>` +
    bolt(ZIG, main, big ? CYAN_LIGHT : CYAN) +
    (big ? bolt(ZIG_BRANCH, 0.5, CYAN_LIGHT) : '') +
    bolt(ZIG, 0.3, WHITE) +
    fly(1.4, -1.6, 22.6, 6) +
    fly(1.8, 0.8, 22.6, 7) +
    (t >= 6 ? fly(-0.6, 1.8, 21.6, 7.4) + fly(0.8, -2.2, 21.4, 5) : '') +
    '</g>'
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 꺾은선을 따라 step 간격으로 찍은 점들 (룬 단의 새김 자리)
const along = (pts: Pts, step: number) => {
  const out: [number, number][] = []
  let d = step / 2
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    const len = Math.hypot(x1 - x0, y1 - y0)
    for (; d <= len; d += step) out.push([Math.round(x0 + ((x1 - x0) * d) / len), Math.round(y0 + ((y1 - y0) * d) / len)])
    d -= len
  }
  return out
}

// 80~ 룬 단: 망토 둘레를 따라 굵고 밝은 푸른 띠를 두르고, 띠에 룬 새김을 일정하게 판다. 새김은 숨 쉬듯 빛난다
const runeTrim = (pts: Pts, w: number) =>
  bolt(pts, w, CYAN_LIGHT) +
  along(pts, 7)
    .map(([x, y], i) => rect(x - 1, y - 1, 2, i % 2 ? 2 : 3, CYAN_DARK))
    .join('') +
  `<g opacity="0.5">${glow('1.6s')}` +
  along(pts, 14)
    .map(([x, y]) => rect(x - 1, y - 1, 2, 2, WHITE))
    .join('') +
  '</g>'

// 반망토 뒷자락: 등 뒤에서 오른쪽으로 짧게 뻗어 물결치듯 나부낀다. 윗선은 바깥으로 갈수록 처지고,
// 아랫단은 푸른 지그재그. 몸에서 먼 칸일수록 늦게, 크게 오르내려 물결이 바깥으로 흘러간다
const TAIL_TOP: Pts = [
  [406, 44],
  [452, 62],
]
const TAIL_HEM: Pts = [
  [406, 88],
  [414, 92],
  [422, 85],
  [430, 89],
  [438, 80],
  [446, 83],
  [452, 74],
]
const bigCapeBack = (t: number) => {
  if (t < 5) return ''
  const [c, l, , trim] = capeColors(t)
  return Array.from({ length: 12 }, (_, i) => {
    const x = 406 + i * 4
    const top = lineY(TAIL_TOP, x + 2)
    const hem = lineY(TAIL_HEM, x + 2)
    const wave = i < 2 ? '' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${r2(i * 0.5)};0 0" dur="0.8s" begin="-${r2(i * 0.07)}s" repeatCount="indefinite"/>`
    // 80~: 단이 굵고 밝아지고, 룬 새김과 숨 쉬듯 빛나는 점이 번갈아 박힌다
    const rune =
      t < 8 ? '' : i % 2 ? rect(x + 1, hem - 3, 2, 2, CYAN_DARK) : `<g opacity="0.5">${glow('1.6s')}${rect(x + 1, hem - 3, 2, 2, WHITE)}</g>`
    const tw = t >= 8 ? 5 : 3
    return `<g>${wave}` + rect(x, top, 4, hem - top, c!) + rect(x, top, 4, 3, l!) + rect(x, hem - tw, 4, tw, trim!) + rune + '</g>'
  }).join('')
}

// 왼쪽 어깨에 걸친 반망토 앞자락: 어깨의 은 걸쇠에서 바깥으로 비스듬히 흘러내려 아래로 갈수록 넓어진다.
// 안쪽 가장자리는 걸쇠에서 사선으로 내려오고 아랫단은 지그재그 (바깥쪽 자락이 가장 길다). 그 둘레를 푸른 단이 감싼다
// (가리키는 팔이 망토 위로 나온다)
const MANTLE_TOP: Pts = [
  [312, 62],
  [332, 42],
  [348, 42],
]
// 아랫단 + 안쪽 가장자리: 칸마다 천이 끝나는 높이 (x가 커지는 꺾은선)
const MANTLE_EDGE: Pts = [
  [312, 86],
  [317, 92],
  [323, 85],
  [329, 91],
  [334, 84],
  [338, 68],
  [342, 59],
  [347, 50],
]
const bigMantle = (t: number) => {
  if (t < 5) return ''
  const [c, l, d, trim] = capeColors(t)
  const cols = Array.from({ length: 18 }, (_, i) => 312 + i * 2)
  return (
    // 80~: 아랫단 밑으로 푸른 빛이 숨 쉬듯 번진다 (천 뒤에 깔아 바깥으로만 보인다)
    (t >= 8 ? `<g opacity="0.3">${glow('1.6s')}${bolt(MANTLE_EDGE.slice(0, 5), 9, CYAN)}</g>` : '') +
    cols
      .map(x => {
        const top = lineY(MANTLE_TOP, x + 1)
        return rect(x, top, 2, lineY(MANTLE_EDGE, x + 1) - top, c!) + rect(x, top, 2, 3, l!)
      })
      .join('') +
    // 걸쇠에서 바깥 아래로 흐르는 주름 (그늘 + 빛)
    bolt([[330, 50], [318, 84]], 2, d!) +
    bolt([[332, 50], [320, 84]], 2, l!) +
    bolt([[338, 54], [330, 84]], 2, d!) +
    // 둘레의 푸른 단 (80~: 굵고 밝은 룬 단)
    (t >= 8 ? runeTrim(MANTLE_EDGE, 5) : bolt(MANTLE_EDGE, 3, trim!)) +
    rect(337, 42, 8, 10, SILVER) +
    rect(335, 44, 12, 6, SILVER) +
    rect(337, 42, 8, 2, SILVER_LIGHT) +
    rect(339, 45, 4, 4, CYAN) +
    rect(339, 45, 2, 2, SPARK)
  )
}

// 가슴의 룬: 양옆으로 뻗은 줄과 가운데 큼직한 번개 룬
const bigRunes = (c: string) =>
  rect(334, 81, 26, 3, c) +
  rect(380, 81, 26, 3, c) +
  rect(334, 76, 3, 5, c) +
  rect(403, 84, 3, 5, c) +
  rect(372, 74, 6, 3, c) +
  rect(369, 77, 6, 3, c) +
  rect(366, 80, 12, 3, c) +
  rect(369, 83, 6, 3, c) +
  rect(366, 86, 6, 3, c)

const bigArmor = (t: number) => {
  if (t < 4) return ''
  const [plate, edge, dark] = armorColors(t)
  return (
    rect(330, 72, 80, 24, plate!) +
    rect(330, 72, 80, 3, edge!) +
    bigRunes(t >= 8 ? '#0EA5C6' : CYAN) +
    `<g opacity="0.3">${glow('1.6s')}${bigRunes(SPARK)}</g>` +
    rect(330, 90, 80, 6, t >= 8 ? NAVY : dark!) +
    rect(364, 89, 12, 8, CYAN) +
    rect(367, 91, 6, 4, SPARK) +
    // 어깨받이
    rect(320, 54, 20, 13, plate!) +
    rect(320, 54, 20, 3, edge!) +
    rect(320, 64, 20, 3, CYAN) +
    rect(400, 54, 20, 13, plate!) +
    rect(400, 54, 20, 3, edge!) +
    rect(400, 64, 20, 3, CYAN)
  )
}

// 이마의 룬 보석 (마름모)
const bigGem = (y: number) =>
  `<g opacity="0.3">${glow('1.6s')}` +
  rect(366, y - 6, 8, 24, CYAN) +
  rect(356, y + 5, 28, 8, CYAN) +
  '</g>' +
  rect(367, y, 6, 3, CYAN) +
  rect(364, y + 3, 12, 3, CYAN) +
  rect(361, y + 6, 18, 6, CYAN) +
  rect(364, y + 12, 12, 3, CYAN_DARK) +
  rect(367, y + 15, 6, 3, CYAN_DARK) +
  rect(364, y + 5, 5, 4, CYAN_LIGHT) +
  rect(365, y + 5, 2, 2, WHITE)

// 투구 날개 (왼쪽): 깃털 셋, 위 깃털이 가장 길다. 오른쪽은 x를 370 기준으로 뒤집는다
const BIG_WING: readonly [number, number, number][] = [
  // x, y, 폭 (깃털 끝은 왼쪽)
  [304, 6, 22],
  [308, 15, 20],
  [314, 24, 14],
]
const bigWings = (t: number) =>
  [false, true]
    .map(flip => {
      const fx = (x: number, w: number) => (flip ? 740 - x - w : x)
      const tip = t >= 8 ? CYAN_LIGHT : WHITE
      return (
        rect(fx(322, 10), 8, 10, 26, SILVER) +
        BIG_WING.map(
          ([x, y, w], i) =>
            rect(fx(x, w), y, w, 7, WHITE) +
            rect(fx(x, w), y + 7, w, 2, SILVER) +
            // 80~: 맨 위 깃털에 은빛 윗선
            (i === 0 && t >= 8 ? rect(fx(x, w), y, w, 2, SILVER) : '') +
            rect(fx(x - 4, 4), y + 2, 4, 5, tip) +
            rect(fx(x - 6, 2), y + 3, 2, 3, tip),
        ).join('')
      )
    })
    .join('')

// 80~ 은빛 투구의 짙은 은테(3px): 둥근 윗면·계단진 어깨·양옆 (작은 그림의 SMALL_HELM_RIM과 같은 자리)
const BIG_HELM_RIM: readonly (readonly number[])[] = [
  [338, 16, 64, 3], // 꼭대기
  [338, 16, 3, 9], // 윗단 왼쪽 (어깨까지 잇는다)
  [399, 16, 3, 9], // 윗단 오른쪽
  [330, 22, 8, 3], // 어깨 (왼쪽)
  [402, 22, 8, 3], // 어깨 (오른쪽)
  [330, 22, 3, 12], // 왼쪽 (챙까지)
  [407, 22, 3, 12], // 오른쪽
]

const bigHead = (t: number) => {
  if (t >= 7) {
    const [c, d] = t >= 8 ? [SILVER_LIGHT, SILVER] : [SILVER, SILVER_DARK]
    return (
      bigWings(t) +
      rect(330, 22, 80, 16, c!) +
      rect(338, 16, 64, 7, c!) +
      // 흰 빛: 70은 꼭대기에, 80부터는 은테 바로 안쪽에
      (t >= 8 ? rects(BIG_HELM_RIM, SILVER_DARK) + rect(341, 19, 58, 2, WHITE) : rect(338, 16, 64, 2, WHITE)) +
      rect(324, 34, 92, 6, d!) +
      bigGem(18) +
      (t >= 9
        ? rect(342, 4, 56, 10, GOLD) +
          rect(342, 12, 56, 3, GOLD_DARK) +
          rect(342, -4, 9, 9, GOLD) +
          rect(365, -10, 10, 15, GOLD) +
          rect(389, -4, 9, 9, GOLD) +
          rect(367, -4, 6, 6, CYAN) +
          rect(346, 6, 5, 4, CYAN) +
          rect(389, 6, 5, 4, CYAN) +
          rect(343, 4, 54, 2, GOLD_LIGHT)
        : '')
    )
  }
  if (t >= 1) {
    return rect(326, 33, 88, 7, SILVER) + rect(326, 33, 88, 2, SILVER_LIGHT) + rect(326, 38, 88, 2, SILVER_DARK) + bigGem(22)
  }
  return ''
}

// 왼손 장갑의 손목 룬 띠: 장갑 위에 덧대는 것이라 따로 그리고, 가리키는 팔(pointingArm)과 똑같이 콕콕 움직인다.
// 손가락 주름 색은 bigClawd의 crease로 남색을 준다
const POKE =
  '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>'
const bigGloveCuff = (t: number) => (t < 3 ? '' : `<g>${POKE}` + rect(296, 60, 6, 22, NAVY_LIGHT) + rect(298, 64, 2, 14, CYAN) + '</g>')

// 뇌신검의 칼날: 번개처럼 좌우로 꺾이며 올라간다 [아래 y, 위 y, x]
const BIG_ZIG: readonly [number, number, number][] = [
  [22, 12, 415],
  [12, 2, 411],
  [2, -8, 415],
  [-8, -18, 411],
]

// 오른팔과 마검: 끝·대기는 번쩍 들고, 오류는 축 늘어뜨린다 (손이 손잡이를 덮게 검을 먼저 그린다)
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return rightArm(variant, g)
  const arm = rightArm(variant, g)
  const guard = t >= 9 ? GOLD : t >= 8 ? SILVER_LIGHT : NAVY_LIGHT
  if (variant === 'error') {
    // 칼끝이 땅을 향하고 빛도 시들하다
    const w = t >= 9 ? 12 : 8
    return (
      arm +
      `<g opacity="0.2">${glow('1.6s')}${rect(417 - w / 2, 104, w + 6, 34, CYAN)}</g>` +
      rect(406, 100, 30, 5, guard) +
      rect(420 - w / 2, 105, w, 28, t >= 9 ? CYAN_LIGHT : BLADE) +
      rect(420 - w / 2, 105, 2, 28, WHITE) +
      rect(419, 108, 2, 22, CYAN) +
      rect(418, 133, 4, 4, t >= 9 ? CYAN_LIGHT : BLADE) +
      flash('1.4s', '0.3s', twinkle(432, 124, 7, CYAN_LIGHT))
    )
  }
  const hand = g ? rect(409, 27, 24, 20, g.color) + (g.shine ? rect(412, 29, 7, 5, g.shine) : '') : rect(413, 32, 16, 12, ORANGE)
  if (t >= 9) {
    // 뇌신검: 칼날이 번개처럼 꺾이고, 둘레에 번개가 휘감긴다
    return (
      arm +
      `<g opacity="0.3">${glow('0.8s')}` +
      BIG_ZIG.map(([b, top, x]) => rect(x - 6, top - 2, 28, b - top + 4, CYAN)).join('') +
      rect(409, -28, 18, 10, CYAN) +
      '</g>' +
      BIG_ZIG.map(([b, top, x]) => rect(x, top, 16, b - top, CYAN_LIGHT) + rect(x, top, 3, b - top, WHITE) + rect(x + 13, top, 3, b - top, CYAN)).join('') +
      BIG_ZIG.map(([b, top, x]) => rect(x + 6, top, 4, b - top, WHITE)).join('') +
      rect(413, -24, 12, 6, CYAN_LIGHT) +
      rect(416, -29, 6, 5, CYAN_LIGHT) +
      rect(418, -32, 2, 3, WHITE) +
      rect(402, 21, 38, 6, guard) +
      rect(402, 21, 38, 2, GOLD_LIGHT) +
      rect(416, 19, 10, 10, CYAN) +
      rect(418, 21, 4, 4, WHITE) +
      flash('0.6s', '0s', bolt([[402, 16], [396, 6], [402, -2], [395, -12], [401, -20]], 3, SPARK)) +
      flash('0.6s', '0.3s', bolt([[438, 12], [444, 2], [438, -8], [443, -18]], 3, SPARK)) +
      flash('0.9s', '0.2s', twinkle(396, -24, 10, CYAN_LIGHT)) +
      flash('0.9s', '0.6s', twinkle(442, -20, 10, CYAN_LIGHT)) +
      hand
    )
  }
  return (
    arm +
    `<g opacity="0.35">${glow('0.9s')}${rect(413, -16, 16, 40, CYAN)}${rect(415, -22, 12, 6, CYAN)}${rect(417, -26, 8, 4, CYAN)}</g>` +
    rect(417, -14, 8, 36, BLADE) +
    rect(418, -18, 6, 4, BLADE) +
    rect(419, -21, 4, 3, BLADE) +
    rect(417, -14, 2, 36, WHITE) +
    rect(423, -14, 2, 36, BLADE_EDGE) +
    rect(420, -10, 2, 30, CYAN) +
    rect(405, 22, 32, 5, guard) +
    rect(403, 20, 4, 9, guard) +
    rect(435, 20, 4, 9, guard) +
    rect(417, 20, 8, 9, CYAN) +
    rect(419, 22, 3, 3, WHITE) +
    flash('0.7s', '0s', bolt([[410, 12], [405, 4], [410, -4], [405, -12]], 3, SPARK)) +
    flash('0.7s', '0.35s', bolt([[432, 6], [437, -2], [432, -10]], 3, SPARK)) +
    flash('0.9s', '0.2s', twinkle(431, -20, 8, CYAN_LIGHT)) +
    flash('0.9s', '0.55s', twinkle(407, 14, 6, CYAN_LIGHT)) +
    hand
  )
}

const bigGlory = (t: number) =>
  t < 9
    ? ''
    : halo(370, -21, 34, 7, 4, t, HALO_CYAN) +
      flash('1.6s', '0.3s', bolt([[282, -8], [290, 0], [283, 6], [291, 14]], 3, CYAN_LIGHT)) +
      flash('1.6s', '1.1s', bolt([[448, 60], [454, 68], [447, 74], [454, 82]], 3, CYAN_LIGHT))

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCapeBack(t),
    boot: boot(t),
    body: bigArmor(t) + bigMantle(t),
    head: bigHead(t),
    glove: glove(t),
    crease: NAVY_DARK,
    arm: bigArm(variant, t),
    over: bigGloveCuff(t) + bigGlory(t),
  })

export const spellblade: Job = {
  key: 'spellblade',
  name: '마검사',
  icon: '⚡',
  gear: ['', '룬 서클릿', '은빛 장화', '룬 장갑', '룬 경갑', '푸른 반망토', '번개 마검', '날개 투구', '청은 룬갑', '왕관·후광·뇌신검', '무지개 후광'],
  melee: true,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : 0),
  bigHeadroom: t => (t >= 9 ? 40 : t >= 6 ? 32 : 0),
}
