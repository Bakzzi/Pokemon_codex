// 네크로맨서: 해골 머리장식 → 검은 장화 → 뼈 장갑 → 검은 룬 로브 → 찢어진 망토 → 해골 지팡이
// → 해골 후드 → 영혼불 로브 → 해골 왕관·초록 후광·영혼의 낫 → 무지개 후광
// 검정·뼈빛 옷에 독초록 영혼불. 해골 유령을 날려 보내고, 맞은 자리에서 초록 영혼이 터진다
import { ATK } from '../monsters.ts'
import { INK, bigClawd, flutter, glow, halo, handSwing, rect, rightArm, smallClawd, sparkle, swap } from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

// 로브는 어두운 바탕(#1E1E1E)에서도 몸통이 보이도록 한 톤 띄운 먹빛이고, 가장 어두운 색은 안쪽 주름에만 쓴다.
// 로브·소매·장화·망토의 바깥 가장자리에는 잿빛 테두리(EDGE)를 둘러 어두운 바탕에서 윤곽이 떨어져 보이게 한다
const ROBE = '#3A3346'
const ROBE_DARK = '#18151C'
const CLOAK = '#45404E'
const CLOAK_DARK = '#2A2630'
const EDGE = '#6A6379'
const BONE = '#EAE4D3'
const BONE_SHADE = '#BDB39C'
const BONE_DARK = '#7E7563'
const GREEN = '#4ADE80'
const GREEN_DARK = '#16A34A'
const GREEN_LIGHT = '#DCFCE7'
const SOUL = '#86EFAC'
const WOOD = '#4A3F35'
const WOOD_LIGHT = '#6B5D4F'
const BLADE = '#D6E9DC'
const STEEL = '#566B60'
const SMOKE = '#9CA3AF'

// 검은 장화(20~): 뼈빛 띠를 두른 검은 장화 (목에는 잿빛 테두리, smallBootRims·bigBootRims). 뼈 장갑(30~)
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: '#2B2733', stripe: BONE_SHADE, sole: '#0C0B0E' } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: BONE, shine: '#FFFFFF' } : undefined)

// 해골 하나 (왼쪽 위 x, y, 한 칸 u, 5 × 5칸). eye: 눈구멍 색 (초록이면 영혼불이 깃든 눈)
const skull = (x: number, y: number, u: number, eye = INK) =>
  rect(x + u, y, 3 * u, u, BONE) +
  rect(x, y + u, 5 * u, 3 * u, BONE) +
  rect(x + 4 * u, y + u, u, 3 * u, BONE_SHADE) +
  rect(x + u, y + 4 * u, 3 * u, u, BONE) +
  rect(x + u, y + 2 * u, u, u, eye) +
  rect(x + 3 * u, y + 2 * u, u, u, eye) +
  rect(x + 2.2 * u, y + 3.1 * u, 0.6 * u, 0.7 * u, BONE_DARK) +
  rect(x + 1.9 * u, y + 4.2 * u, 0.25 * u, 0.8 * u, BONE_DARK) +
  rect(x + 2.85 * u, y + 4.2 * u, 0.25 * u, 0.8 * u, BONE_DARK)

// 반복되는 깜빡임(불꽃 등). 쉬는 그림에서도 같은 빠르기로 일렁인다
const flick = (attr: string, values: string, dur: string, begin = '0s') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}" begin="${begin}" calcMode="discrete" repeatCount="indefinite"/>`
const pulse = (dur: string, begin: string) =>
  `<animate attributeName="opacity" values="0.35;1;0.35" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`

// 초록 영혼불 한 갈래 (왼쪽 x, 바닥 y, 폭 w, 두 높이 [a, b]를 오가며 일렁인다):
// 넓은 밑동 위로 가는 끝이 솟고, 속은 밝다
const flame = (x: number, bottom: number, w: number, [a, b]: readonly [number, number]) => {
  const part = (dx: number, pw: number, k: number, color: string) => {
    const [ha, hb] = [a * k, b * k]
    return rect(x + dx, bottom - ha, pw, ha, color, flick('height', `${ha};${hb}`, '0.5s') + flick('y', `${bottom - ha};${bottom - hb}`, '0.5s'))
  }
  return part(0, w, 0.45, GREEN) + part(w * 0.17, w * 0.66, 0.75, GREEN) + part(w * 0.33, w * 0.34, 1, GREEN) + part(w * 0.33, w * 0.34, 0.45, GREEN_LIGHT)
}

// 뼈 왕관의 가시: 가운데가 가장 높은 계단꼴 삼각형들 (가운데 x 목록, 밑 y, 폭, 높이)
const boneCrown = (xs: readonly number[], base: number, ws: readonly number[], hs: readonly number[]) =>
  xs
    .map((cx, i) => {
      const [w, h] = [ws[i]!, hs[i]!]
      return rect(cx - w / 2, base - h * 0.5, w, h * 0.5, BONE) + rect(cx - w / 4, base - h, w / 2, h * 0.5, BONE)
    })
    .join('')

// ── 작은 그림 ─────────────────────────────────────────────────────

// 찢어진 망토(50~): 어깨에서 뒤로 나부끼다 길이가 제각각인 넝마 자락으로 갈라진다 (사이로 바탕이 비친다)
// 80부터 자락 끝에 초록 영혼불이 붙는다
const CLOAK_STRIPS = [
  [9.1, 5, 1, 5, 4.4],
  [8, 5, 0.8, 3, 2.3],
  [6.9, 5, 0.85, 3.8, 2.9],
  [5.9, 5, 0.75, 2, 1.4],
  [5, 5, 0.65, 2.7, 1.9],
] as const
const smallCloak = (t: number) => {
  if (t < 5) return ''
  return (
    rect(10, 3.6, 10, 6.4, CLOAK) +
    rect(8, 3.8, 2.2, 1.4, CLOAK) +
    rect(6.4, 4.2, 1.8, 1.0, CLOAK, swap('y', 4.2, 4.4)) +
    rect(5, 4.6, 1.6, 0.6, CLOAK, swap('y', 4.6, 4.9)) +
    CLOAK_STRIPS.map(([x, y, w, a, b]) => rect(x, y, w, a, CLOAK, swap('height', a, b))).join('') +
    rect(8.6, 4.2, 0.5, 0.3, CLOAK_DARK) +
    rect(9.4, 7.2, 0.4, 0.6, CLOAK_DARK) +
    rect(5, 4.6, 1.6, 0.15, EDGE, swap('y', 4.6, 4.9)) +
    rect(6.4, 4.2, 1.8, 0.15, EDGE, swap('y', 4.2, 4.4)) +
    rect(8, 3.8, 2.2, 0.15, EDGE) +
    CLOAK_STRIPS.map(([x, y, w, a, b]) => rect(x, y + a - 0.3, w, 0.3, EDGE, swap('y', y + a - 0.3, y + b - 0.3))).join('') +
    (t >= 8
      ? CLOAK_STRIPS.map(([x, y, w, a, b]) => rect(x, y + a - 0.45, w, 0.45, GREEN, swap('y', y + a - 0.45, y + b - 0.45))).join('')
      : '')
  )
}

// 해골 머리장식(10~60): 검은 끈에 꽂은 작은 해골
const smallOrnament = (t: number) => (t < 1 || t >= 7 ? '' : rect(11, 2.85, 8, 0.4, ROBE_DARK) + skull(15.6, 0.8, 0.44))

// 해골 후드(70~): 정수리가 뾰족한 검은 두건에 이마를 덮는 해골 가면. 가면 눈구멍에 초록 불이 깜빡인다
// 90부터 뾰족한 뼈 왕관을 얹는다
const smallHood = (t: number) => {
  if (t < 7) return ''
  return (
    rect(10.5, 2.4, 1.2, 4, CLOAK) +
    rect(18.3, 2.4, 1.2, 4, CLOAK) +
    rect(11.3, 3.4, 0.4, 3, CLOAK_DARK) +
    rect(18.3, 3.4, 0.4, 3, CLOAK_DARK) +
    rect(10.7, 1.2, 8.6, 2.2, CLOAK) +
    rect(11.5, 0.5, 7, 0.8, CLOAK) +
    rect(13.2, -0.1, 3.6, 0.7, CLOAK) +
    rect(14.4, -0.6, 1.2, 0.6, CLOAK) +
    rect(14.4, -0.6, 1.2, 0.15, EDGE) +
    rect(13.2, -0.1, 1.2, 0.15, EDGE) +
    rect(15.6, -0.1, 1.2, 0.15, EDGE) +
    rect(11.5, 0.5, 1.7, 0.15, EDGE) +
    rect(16.8, 0.5, 1.7, 0.15, EDGE) +
    rect(10.7, 1.2, 0.8, 0.15, EDGE) +
    rect(18.5, 1.2, 0.8, 0.15, EDGE) +
    rect(10.5, 2.4, 0.15, 4, EDGE) +
    rect(19.35, 2.4, 0.15, 4, EDGE) +
    rect(12.4, 0.9, 5.2, 0.5, BONE) +
    rect(12, 1.3, 6, 1.9, BONE) +
    rect(17.5, 1.3, 0.5, 1.9, BONE_SHADE) +
    rect(12.8, 1.8, 1.2, 0.8, INK) +
    rect(16, 1.8, 1.2, 0.8, INK) +
    rect(13.1, 2, 0.6, 0.45, GREEN, pulse('1.6s', '0s')) +
    rect(16.3, 2, 0.6, 0.45, GREEN, pulse('1.6s', '0s')) +
    rect(14.75, 2.5, 0.5, 0.5, BONE_DARK) +
    rect(12.4, 3.1, 5.2, 0.5, BONE) +
    [13.1, 13.9, 14.7, 15.5, 16.3, 17.1].map(x => rect(x, 3.1, 0.15, 0.5, BONE_DARK)).join('') +
    (t >= 9
      ? boneCrown([12.3, 13.75, 15, 16.25, 17.7], 0.4, [0.8, 0.9, 1, 0.9, 0.8], [0.8, 1.2, 1.7, 1.2, 0.8]) +
        rect(11.8, 0.3, 6.4, 0.6, BONE) +
        rect(11.8, 0.75, 6.4, 0.15, BONE_SHADE) +
        rect(14.6, 0.35, 0.8, 0.45, GREEN) +
        rect(12.7, 0.45, 0.4, 0.3, GREEN_DARK) +
        rect(16.9, 0.45, 0.4, 0.3, GREEN_DARK)
      : '')
  )
}

// 검은 룬 로브(40~): 아랫단이 들쭉날쭉한 검은 옷에 뼈빛 깃과 해골 여밈. 초록 룬이 차례로 빛난다
// 영혼불 로브(80~): 룬이 밝아지고 아랫단을 초록 불꽃이 핥는다
const RUNES = [
  [12.1, 7.1],
  [17.4, 7.1],
  [13.3, 8.5],
  [16.3, 8.5],
] as const
// 아랫단 자락 (왼쪽 x 목록, 폭 0.8). 짝수 번째는 길고(밑 10) 홀수 번째는 짧다(밑 9.75). 자락 사이 틈의 밑은 9.5
const HEM_XS = [10.7, 12, 13.3, 14.6, 15.9, 17.2, 18.5] as const
const hemBottom = (i: number) => (i % 2 ? 9.75 : 10)
const smallRobe = (t: number) => {
  if (t < 4) return ''
  const rune = t >= 8 ? GREEN_LIGHT : GREEN
  const flames =
    t >= 8 ? [11, 12.75, 14.5, 16.25, 18].map((x, i) => flame(x, 9.7, 0.9, i % 2 ? [1.5, 1] : [1, 1.6])).join('') : ''
  return (
    rect(11, 6.4, 8, 2.6, ROBE) +
    rect(10.7, 9, 8.6, 0.5, ROBE) +
    HEM_XS.map((x, i) => rect(x, 9.5, 0.8, hemBottom(i) - 9.5, ROBE)).join('') +
    // 잿빛 테두리: 몸판 양옆 → 아랫단 양옆 → 들쭉날쭉한 자락 끝과 그 사이 틈
    rect(11, 6.7, 0.25, 2.3, EDGE) +
    rect(18.75, 6.7, 0.25, 2.3, EDGE) +
    rect(10.7, 9, 0.25, 1, EDGE) +
    rect(19.05, 9, 0.25, 1, EDGE) +
    HEM_XS.map((x, i) => rect(x, hemBottom(i) - 0.25, 0.8, 0.25, EDGE) + (i < 6 ? rect(x + 0.8, 9.25, 0.5, 0.25, EDGE) : '')).join('') +
    rect(11, 6.4, 8, 0.3, BONE) +
    rect(11, 7.85, 8, 0.3, ROBE_DARK) +
    RUNES.map(([x, y], i) => rect(x, y, 0.2, 0.8, rune, pulse('2s', `${i * 0.5}s`)) + rect(x, y + 0.3, 0.55, 0.2, rune, pulse('2s', `${i * 0.5}s`))).join('') +
    skull(14.45, 6.3, 0.22) +
    flames
  )
}

// 검은 장화(20~)의 목 테두리: 디딘 다리의 장화 윗면은 y 10.1, 든 다리는 9.1 (pixel.ts의 legs와 같은 박자로 바뀐다).
// 몸 위(body) 겹에서 로브보다 먼저 그려, 로브 자락 밑으로 나온 장화 목만 보인다
const smallBootRims = (t: number, pose: Pose) => {
  if (t < 2) return ''
  return [11, 13, 16, 18]
    .map(x => {
      if (pose !== 'run') return rect(x - 0.4, 10.1, 1.8, 0.25, EDGE)
      const [a, b] = x === 11 || x === 16 ? [10.1, 9.1] : [9.1, 10.1]
      return rect(x - 0.4, a, 1.8, 0.25, EDGE, swap('y', a, b))
    })
    .join('')
}

// 뼈 장갑(30~)의 손가락 마디 줄과 찢어진 검은 소매(40~): 팔과 같이 흔들린다
const smallSleeves = (t: number, pose: Pose) => {
  if (t < 3) return ''
  const [la, lb, ra, rb] = pose === 'run' ? [5.5, 6.5, 6.5, 5.5] : [6, 6, 6, 6]
  const knuckle = rect(8.7, la + 0.35, 1.5, 0.15, BONE_DARK, swap('y', la + 0.35, lb + 0.35)) + rect(19.8, ra + 0.35, 1.5, 0.15, BONE_DARK, swap('y', ra + 0.35, rb + 0.35))
  if (t < 4) return knuckle
  return (
    knuckle +
    rect(10.1, la - 0.2, 1.3, 1.3, ROBE, swap('y', la - 0.2, lb - 0.2)) +
    rect(10.1, la + 1.1, 0.5, 0.3, ROBE, swap('y', la + 1.1, lb + 1.1)) +
    rect(18.6, ra - 0.2, 1.3, 1.3, ROBE, swap('y', ra - 0.2, rb - 0.2)) +
    rect(19.4, ra + 1.1, 0.5, 0.3, ROBE, swap('y', ra + 1.1, rb + 1.1))
  )
}

// 영혼의 낫 날: 장대 끝에서 앞으로 뻗었다가 아래로 휘어 드는 초승달. 짙은 강철 날 둘레로 초록 빛무리가 맥동하고
// 안쪽 날끝이 초록으로 빛난다. 날 조각 [x, y, w, h]와 빛무리 두께 g
type Piece = readonly [number, number, number, number]
const SMALL_BLADE: readonly Piece[] = [
  [20.3, -1.7, 2.6, 0.7],
  [22.4, -1.35, 0.85, 0.7],
  [22.65, -0.75, 0.6, 1.2],
  [22.55, 0.4, 0.5, 0.6],
  [22.2, 0.85, 0.45, 0.45],
]
const SMALL_EDGE: readonly Piece[] = [
  [20.9, -1.08, 1.6, 0.25],
  [22.4, -0.8, 0.45, 0.3],
  [22.45, -0.55, 0.3, 1],
]
const scytheBlade = (blade: readonly Piece[], g: number, edge = SMALL_EDGE, hi = 0.18) =>
  blade.map(([x, y, w, h]) => rect(x - g, y - g, w + 2 * g, h + 2 * g, GREEN, glow('0.8s'))).join('') +
  blade.map(([x, y, w, h]) => rect(x, y, w, h, STEEL)).join('') +
  rect(blade[0]![0], blade[0]![1], blade[0]![2], hi, BLADE) +
  edge.map(([x, y, w, h]) => rect(x, y, w, h, GREEN, pulse('0.8s', '0s'))).join('')

// 해골 지팡이(60~) → 영혼의 낫(90~). 해골 눈에 초록 영혼불이 깃들고, 싸울 때는 쏘기 직전(공격 주기 0.36~0.46)에 확 타오른다
const smallStaff = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const run = pose === 'run'
  const g = glove(t)!
  const scythe = t >= 9
  const flare =
    run && t < 10
      ? '<g opacity="0">' +
        `<animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.36;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/>` +
        rect(19.1, -1.2, 3, 2.8, SOUL) +
        rect(19.7, -1.9, 1.8, 4.2, SOUL) +
        '</g>'
      : ''
  const head = scythe
    ? rect(20.35, -1.5, 0.5, 2, WOOD) + scytheBlade(SMALL_BLADE, 0.25) + skull(19.65, -0.5, 0.38, GREEN)
    : rect(19.1, -0.8, 3, 2, GREEN, glow('1.4s')) + rect(19.6, -1.4, 2, 3.2, GREEN, glow('1.4s')) + skull(19.5, -0.95, 0.44, GREEN)
  return (
    '<g>' +
    (run ? handSwing : '') +
    rect(20.35, 1.2, 0.5, 9.4, WOOD) +
    rect(20.35, 1.2, 0.15, 9.4, WOOD_LIGHT) +
    rect(20.2, 3.6, 0.8, 0.3, BONE_SHADE) +
    head +
    flare +
    // 지팡이를 쥔 뼈 손 (자루 위를 다시 덮는다)
    rect(19.8, run ? 6.2 : 5.7, 1.5, 1.6, g.color) +
    rect(19.8, run ? 6.85 : 6.35, 1.5, 0.15, BONE_DARK) +
    '</g>'
  )
}

// 뒤쪽에서 초록 영혼 한 줄기가 피어올라 사라진다
const wisp = (x: number, y: number, s: number, rise: number, begin: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0.9;0" dur="2s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-rise}" dur="2s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(x, y, s, s, SOUL) +
  rect(x + s * 0.25, y - s * 0.6, s * 0.5, s * 0.6, GREEN) +
  '</g>'

// 90~: 머리 위 초록 후광, 피어오르는 영혼, 초록 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.9, 2.8, 0.45, 0.3, t, GREEN) +
      wisp(6.4, 2.4, 0.7, 2.4, '0s') +
      wisp(8.2, 1.6, 0.6, 2, '1s') +
      sparkle(22.4, 2.8, 1.3, GREEN, '0.5s') +
      sparkle(5.8, 4.2, 1.1, SOUL, '1.3s')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCloak(t),
    boot: boot(t),
    body: smallBootRims(t, pose) + smallRobe(t),
    head: smallOrnament(t) + smallHood(t),
    glove: glove(t),
    hand: smallSleeves(t, pose) + smallStaff(t, pose),
    over: smallGlory(t),
  })

// 해골 유령: 손(지팡이가 생기면 해골 끝)에서 출렁이며 날아가 초록 꼬리를 끌고, 맞으면 초록 영혼이 고리로 터진다
const hit = (t: number) => {
  if (t >= 10) return ''
  const [sx, sy] = t >= 6 ? [16.2, 2.6] : [16.6, 8.4]
  const [ex, ey] = [26, 7.6]
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy)
  const [ux, uy] = [dx / len, dy / len]
  const p = (k: number, off: number) => `${(dx * k - uy * off).toFixed(2)} ${(dy * k + ux * off).toFixed(2)}`
  const tail = (
    [
      [1.3, 1.3, GREEN, 0.85],
      [2.2, 1, GREEN_DARK, 0.7],
      [3, 0.75, GREEN, 0.5],
      [3.7, 0.55, GREEN_DARK, 0.35],
    ] as const
  )
    .map(([k, s, c, o], i) => {
      const off = i % 2 ? -0.25 : 0.25
      const x = sx - ux * k - uy * off - s / 2
      const y = sy - uy * k + ux * off - s / 2
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${s}" height="${s}" fill="${c}" opacity="${o}">${flick('y', `${y.toFixed(2)};${(y - off * 0.8).toFixed(2)}`, '0.16s')}</rect>`
    })
    .join('')
  const u = 0.48
  const ghost =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.46;0.59;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${p(0.35, -0.7)};${p(0.7, 0.6)};${p(1, 0)};${p(1, 0)}" keyTimes="0;0.44;0.5;0.55;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    tail +
    // 유령 빛무리와 창백한 해골 얼굴
    rect(sx - 1.6, sy - 1.6, 3.2, 3.2, GREEN, '<animate attributeName="opacity" values="0.25;0.5;0.25" dur="0.3s" repeatCount="indefinite"/>') +
    rect(sx - 1.5 * u, sy - 2.5 * u, 3 * u, u, GREEN_LIGHT) +
    rect(sx - 2.5 * u, sy - 1.5 * u, 5 * u, 3 * u, GREEN_LIGHT) +
    rect(sx - 1.5 * u, sy + 1.5 * u, 3 * u, u, GREEN_LIGHT) +
    rect(sx - 1.5 * u, sy - 0.5 * u, u, u, GREEN_DARK) +
    rect(sx + 0.5 * u, sy - 0.5 * u, u, u, GREEN_DARK) +
    rect(sx - 0.3 * u, sy + 0.7 * u, 0.6 * u, 0.6 * u, GREEN_DARK) +
    '</g>'
  const c = (w: number, h: number, color: string) => rect(-w / 2, -h / 2, w, h, color)
  const burst =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.68;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="translate(${ex} ${ey})"><g>` +
    `<animateTransform attributeName="transform" type="scale" values="0.4;0.4;1.3;1.3" keyTimes="0;0.6;0.7;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(-2.2, -2.2, 4.4, 0.7, GREEN) +
    rect(-2.2, 1.5, 4.4, 0.7, GREEN) +
    rect(-2.2, -1.5, 0.7, 3, GREEN) +
    rect(1.5, -1.5, 0.7, 3, GREEN) +
    ([[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]] as const).map(([x, y]) => rect(x - 0.4, y - 0.4, 0.8, 0.8, SOUL)).join('') +
    c(1.8, 1.8, SOUL) +
    c(0.9, 0.9, '#FFFFFF') +
    '</g></g></g>'
  // 터진 자리에서 영혼 세 줄기가 흩어져 올라간다
  const souls = (
    [
      [-1.6, -2.6, 0],
      [0.2, -3.4, 0.25],
      [1.8, -2.4, 0.5],
    ] as const
  )
    .map(
      ([mx, my, d]) =>
        '<g opacity="0">' +
        `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.62;0.66;0.8;1" dur="${ATK}" repeatCount="indefinite"/>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${mx} ${my};${mx} ${my}" keyTimes="0;0.62;0.8;1" dur="${ATK}" repeatCount="indefinite"/>` +
        rect(ex - 0.35 + d, ey - 0.35, 0.7, 0.7, SOUL) +
        rect(ex - 0.15 + d, ey - 0.85, 0.3, 0.5, GREEN) +
        '</g>',
    )
    .join('')
  return ghost + burst + souls
}

// ── 큰 그림 ───────────────────────────────────────────────────────

const BIG_STRIPS = [
  [424, 44, 8, 60, 46],
  [432, 48, 8, 52, 36],
  [440, 54, 7, 40, 26],
  [447, 60, 6, 26, 16],
] as const
const bigCloak = (t: number) => {
  if (t < 5) return ''
  return (
    rect(316, 40, 108, 64, CLOAK) +
    [316, 328, 340, 352, 364, 376, 388, 400, 412].map((x, i) => rect(x, 104, 12, i % 2 ? 4 : 8, CLOAK)).join('') +
    BIG_STRIPS.map(([x, y, w, a, b]) => rect(x, y, w, a, CLOAK, flutter(a, b))).join('') +
    BIG_STRIPS.map(([x, y, w]) => rect(x, y, w, 3, EDGE)).join('') +
    rect(318, 60, 5, 6, CLOAK_DARK) +
    rect(320, 88, 4, 7, CLOAK_DARK) +
    (t >= 8
      ? BIG_STRIPS.map(
          ([x, y, w, a, b]) =>
            rect(x, y + a - 6, w, 6, GREEN, `<animate attributeName="y" values="${y + a - 6};${y + b - 6};${y + a - 6}" dur="0.8s" repeatCount="indefinite"/>`),
        ).join('') + [316, 340, 364, 388, 412].map(x => rect(x, 106, 12, 6, GREEN, flick('opacity', '1;0.5', '0.5s'))).join('')
      : '')
  )
}

const bigOrnament = (t: number) => (t < 1 || t >= 7 ? '' : rect(330, 33, 80, 5, ROBE_DARK) + skull(378, 6, 5.4))

const bigHood = (t: number) => {
  if (t < 7) return ''
  return (
    rect(322, 30, 14, 42, CLOAK) +
    rect(404, 30, 14, 42, CLOAK) +
    rect(332, 40, 4, 32, CLOAK_DARK) +
    rect(404, 40, 4, 32, CLOAK_DARK) +
    rect(326, 12, 88, 26, CLOAK) +
    rect(334, 4, 72, 9, CLOAK) +
    rect(352, -2, 36, 7, CLOAK) +
    rect(364, -8, 12, 7, CLOAK) +
    rect(364, -8, 12, 2, EDGE) +
    rect(352, -2, 12, 2, EDGE) +
    rect(376, -2, 12, 2, EDGE) +
    rect(334, 4, 18, 2, EDGE) +
    rect(388, 4, 18, 2, EDGE) +
    rect(326, 12, 8, 2, EDGE) +
    rect(406, 12, 8, 2, EDGE) +
    rect(322, 30, 2, 42, EDGE) +
    rect(416, 30, 2, 42, EDGE) +
    rect(344, 8, 52, 5, BONE) +
    rect(340, 12, 60, 20, BONE) +
    rect(395, 12, 5, 20, BONE_SHADE) +
    rect(348, 17, 13, 9, INK) +
    rect(379, 17, 13, 9, INK) +
    rect(351, 19, 7, 5, GREEN, pulse('1.6s', '0s')) +
    rect(382, 19, 7, 5, GREEN, pulse('1.6s', '0s')) +
    rect(366, 26, 8, 5, BONE_DARK) +
    rect(344, 31, 52, 7, BONE) +
    [351, 359, 367, 375, 383, 391].map(x => rect(x, 31, 2, 7, BONE_DARK)).join('') +
    (t >= 9
      ? boneCrown([344, 357, 370, 383, 396], 2, [10, 11, 12, 11, 10], [11, 16, 22, 16, 11]) +
        rect(338, 0, 64, 7, BONE) +
        rect(338, 5, 64, 2, BONE_SHADE) +
        rect(365, 1, 10, 5, GREEN) +
        rect(346, 2, 4, 3, GREEN_DARK) +
        rect(390, 2, 4, 3, GREEN_DARK)
      : '')
  )
}

const BIG_RUNES = [
  [341, 78],
  [395, 78],
  [350, 92],
  [386, 92],
] as const
const BIG_HEM_XS = [326, 338, 350, 362, 374, 386, 398, 406] as const

// 검은 장화의 목 테두리 (장화 윗면 y 102). 로브보다 먼저 그려 자락 밑으로 나온 곳만 보인다
const bigBootRims = (t: number) => (t < 2 ? '' : [330, 350, 380, 400].map(x => rect(x - 4, 102, 18, 3, EDGE)).join(''))

const bigRobe = (t: number) => {
  if (t < 4) return ''
  const rune = t >= 8 ? GREEN_LIGHT : GREEN
  const flames = t >= 8 ? [330, 348, 366, 384, 400].map((x, i) => flame(x, 104, 12, i % 2 ? [18, 11] : [11, 19])).join('') : ''
  const hem = (i: number) => (i % 2 ? 104 : 107) // 자락 끝 y: 짝수 번째는 길고 홀수 번째는 짧다
  return (
    rect(330, 72, 80, 24, ROBE) +
    rect(326, 96, 88, 6, ROBE) +
    BIG_HEM_XS.map((x, i) => rect(x, 101, 8, hem(i) - 101, ROBE)).join('') +
    // 잿빛 테두리 3px: 몸판 양옆 → 아랫단 양옆 → 들쭉날쭉한 자락 끝과 그 사이 틈(밑 102)
    rect(330, 76, 3, 20, EDGE) +
    rect(407, 76, 3, 20, EDGE) +
    rect(326, 96, 3, 11, EDGE) +
    rect(411, 96, 3, 8, EDGE) +
    BIG_HEM_XS.map((x, i) => rect(x, hem(i) - 3, 8, 3, EDGE)).join('') +
    [334, 346, 358, 370, 382, 394].map(x => rect(x, 99, 4, 3, EDGE)).join('') +
    rect(330, 72, 80, 4, BONE) +
    rect(330, 87, 80, 4, ROBE_DARK) +
    BIG_RUNES.map(([x, y], i) => rect(x, y, 3, 11, rune, pulse('2s', `${i * 0.5}s`)) + rect(x, y + 4, 7, 3, rune, pulse('2s', `${i * 0.5}s`))).join('') +
    skull(362, 74, 3.2) +
    flames
  )
}

// 가리키는 팔과 같은 박자로 콕콕 움직이는 움직임 (pixel.ts의 pointingArm과 같다)
const POKE =
  '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>'

// 가리키는 뼈 손의 잿빛 테두리: 하얀 말풍선·밝은 바탕에 묻히지 않게 장갑 뒤에 2px 더 크게 깐다.
// 오른팔(arm) 겹 맨 끝에 붙여 bigClawd가 그리는 가리키는 팔 바로 밑에 놓인다 (손가락 주름 색은 crease로 넘긴다)
const bigPointerRim = (t: number) =>
  t < 3 ? '' : '<g>' + POKE + rect(274, 54, 28, 34, BONE_DARK) + rect(262, 62, 20, 13, BONE_DARK) + rect(284, 51, 12, 12, BONE_DARK) + '</g>'

// 왼쪽(가리키는) 팔의 찢어진 소매
const bigLeftSleeve = (t: number) =>
  t < 4
    ? ''
    : '<g>' +
      POKE +
      rect(308, 62, 24, 18, ROBE) +
      rect(303, 63, 5, 6, ROBE) +
      rect(304, 73, 4, 6, ROBE) +
      // 소매 위아래 가장자리의 잿빛 테두리
      rect(308, 62, 24, 3, EDGE) +
      rect(308, 77, 24, 3, EDGE) +
      rect(304, 76, 4, 3, EDGE) +
      '</g>'

// 뼈 장갑을 낀 오른손: 잿빛 테두리 위에 뼈빛 손과 손가락 마디 두 줄 (든 손 / 늘어뜨린 손)
const knuckles = (x: number, y: number, w: number, gap: number) => rect(x, y, w, 2, BONE_DARK) + rect(x, y + gap, w, 2, BONE_DARK)
const boneHand = (variant: BigVariant) =>
  variant === 'error'
    ? rect(409, 86, 22, 20, BONE_DARK) + rect(411, 88, 18, 16, BONE) + knuckles(413, 93, 14, 5)
    : rect(407, 25, 28, 24, BONE_DARK) + rect(409, 27, 24, 20, BONE) + rect(412, 29, 7, 5, '#FFFFFF') + knuckles(411, 34, 20, 6)

const BIG_BLADE: readonly Piece[] = [
  [420, -36, 26, 8],
  [442, -31, 10, 8],
  [447, -25, 7, 12],
  [446, -13, 6, 7],
  [442, -7, 5, 5],
]
const BIG_EDGE: readonly Piece[] = [
  [426, -28, 16, 3],
  [441, -24, 6, 3],
  [444, -21, 3, 10],
]

// 오른팔과 지팡이(낫): 끝·대기는 번쩍 들고, 오류는 눈빛이 꺼진 해골 지팡이에 기대 선다
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  // 찢어진 소매: 바깥쪽 옆면과 너덜너덜한 소맷부리(그 사이 틈 포함)에 잿빛 테두리
  const sleeve =
    t < 4
      ? ''
      : variant === 'error'
        ? rect(406, 70, 22, 15, ROBE) +
          rect(406, 85, 6, 4, ROBE) +
          rect(418, 85, 6, 6, ROBE) +
          rect(410, 70, 18, 3, EDGE) +
          rect(425, 70, 3, 15, EDGE) +
          rect(406, 86, 6, 3, EDGE) +
          rect(412, 82, 6, 3, EDGE) +
          rect(418, 88, 6, 3, EDGE) +
          rect(424, 82, 4, 3, EDGE)
        : rect(406, 56, 24, 22, ROBE) +
          rect(406, 52, 6, 4, ROBE) +
          rect(416, 50, 6, 6, ROBE) +
          rect(424, 53, 6, 3, ROBE) +
          rect(427, 53, 3, 25, EDGE) +
          rect(410, 75, 20, 3, EDGE) +
          rect(406, 52, 6, 3, EDGE) +
          rect(412, 56, 4, 3, EDGE) +
          rect(416, 50, 6, 3, EDGE) +
          rect(422, 56, 2, 3, EDGE) +
          rect(424, 53, 6, 3, EDGE)
  const hand = g ? boneHand(variant) : ''
  if (t < 6) return rightArm(variant, g) + hand + sleeve
  const scythe = t >= 9
  if (variant === 'error') {
    const puff = (x: number, y: number, begin: string) =>
      `<rect x="${x}" y="${y}" width="6" height="6" fill="${SMOKE}" opacity="0">` +
      `<animate attributeName="opacity" values="0;0.7;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="0 0;-3 -14" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
      '</rect>'
    return (
      rect(418, 60, 6, 58, WOOD) +
      (scythe
        ? rect(424, 38, 20, 6, BONE_SHADE) + rect(440, 42, 6, 8, BONE_SHADE) + rect(443, 50, 4, 8, BONE_SHADE) + rect(426, 44, 14, 2, '#5F7F68')
        : '') +
      skull(409, 36, 5) +
      puff(414, 26, '0s') +
      puff(424, 24, '0.8s') +
      rightArm(variant, g) +
      hand +
      sleeve
    )
  }
  const top = scythe
    ? rect(418, -30, 6, 30, WOOD) + scytheBlade(BIG_BLADE, 3, BIG_EDGE, 2) + skull(408, -24, 5.2, GREEN)
    : rect(400, -30, 42, 18, GREEN, glow('1.4s')) + rect(410, -40, 22, 40, GREEN, glow('1.4s')) + skull(406, -36, 6, GREEN) + rect(414, -6, 14, 4, BONE_SHADE)
  return rect(418, -6, 6, 106, WOOD) + rect(418, -6, 2, 106, WOOD_LIGHT) + top + rightArm(variant, g) + hand + sleeve
}

const bigGlory = (t: number) =>
  t < 9
    ? ''
    : halo(370, -28, 28, 5, 3.5, t, GREEN) +
      wisp(292, 14, 10, 30, '0s') +
      wisp(310, 4, 8, 26, '1s') +
      sparkle(446, 4, 12, GREEN, '0.3s') +
      sparkle(322, -22, 10, SOUL, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCloak(t),
    boot: boot(t),
    body: bigBootRims(t) + bigRobe(t),
    head: bigOrnament(t) + bigHood(t),
    glove: glove(t),
    crease: BONE_DARK,
    arm: bigArm(variant, t) + bigPointerRim(t),
    over: bigLeftSleeve(t) + bigGlory(t),
  })

export const necromancer: Job = {
  key: 'necromancer',
  name: '네크로맨서',
  icon: '💀',
  gear: [
    '',
    '해골 머리장식',
    '검은 장화',
    '뼈 장갑',
    '검은 룬 로브',
    '찢어진 망토',
    '해골 지팡이',
    '해골 후드',
    '영혼불 로브',
    '해골 왕관·초록 후광·영혼의 낫',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 12 : t >= 6 ? 4 : 0),
  bigHeadroom: t => (t >= 6 ? 40 : 0),
}
