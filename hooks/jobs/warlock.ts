// 흑마법사: 보라 후드 → 검은 장화 → 보라 장갑 → 어둠의 로브 → 검보라 망토 → 보랏빛 수정 지팡이
// → 뾰족 마법사 모자 → 별무늬 로브와 별빛 망토 → 황금 왕관·보라 후광·어둠의 오브 → 무지개 후광
// 보라·검정 옷에 자홍빛 마법. 손(지팡이가 생기면 수정 끝)에서 그림자 화살을 쏘고, 맞은 자리에서 자홍빛이 터진다
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  bigClawd,
  flutter,
  glow,
  halo,
  handSwing,
  rect,
  rightArm,
  smallClawd,
  sparkle,
  swap,
} from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const HOOD = '#6D28D9'
const HOOD_DARK = '#4C1D95'
const HOOD_LIGHT = '#8B5CF6'
const GLOVE = '#A855F7'
const GLOVE_LIGHT = '#E9D5FF'
const ROBE = '#3A1F5C'
const ROBE_DARK = '#25133D'
const CAPE = '#4B2380'
const CAPE_DARK = '#2F1554'
const HAT_LIGHT = '#6A35A8'
const MAGENTA = '#D946EF'
const MAGENTA_DARK = '#A21CAF'
const MAGENTA_LIGHT = '#F5B8FF'
// 80~ 밤하늘 쪽빛: 마검사의 남색(파랑 쪽)과 겹치지 않게 보라 쪽으로 기운 남보라
const NAVY = '#2B2378'
const NAVY_DARK = '#1C1652'
const NAVY_LIGHT = '#4A3FA0'
const CRYSTAL = '#C084FC'
const CRYSTAL_DARK = '#9333EA'
const CRYSTAL_LIGHT = '#F3E8FF'
const DIM = '#5E4A78'
const DIM_LIGHT = '#8E7AA8'
const STAFF_WOOD = '#3A2650'
const STAFF_SHINE = '#5A4272'
const ORB = '#2A0E45'
const SMOKE = '#9CA3AF'

// 80부터 옷 전체가 금빛 별이 박힌 남보라로 바뀐다 (단은 자홍 → 금)
const elite = (t: number) => t >= 8
const robeColor = (t: number) => (elite(t) ? NAVY : ROBE)
const robeDark = (t: number) => (elite(t) ? NAVY_DARK : ROBE_DARK)
const trimColor = (t: number) => (elite(t) ? GOLD : MAGENTA)
const capeColor = (t: number) => (elite(t) ? NAVY : CAPE)
const hoodColors = (t: number) => (elite(t) ? [NAVY, NAVY_DARK, NAVY_LIGHT] : [HOOD, HOOD_DARK, HOOD_LIGHT])
const hatColors = (t: number) => (elite(t) ? [NAVY, NAVY_DARK, NAVY_LIGHT] : [CAPE, CAPE_DARK, HAT_LIGHT])

// 검은 장화(20~): 자홍 띠를 두른 검보라 장화. 보라 장갑(30~)
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: '#24132F', stripe: MAGENTA, sole: '#0E0716' } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: GLOVE, shine: GLOVE_LIGHT } : undefined)

// 별무늬: 작은 금빛 점. 하나 걸러 하나씩 반짝인다
const stars = (pts: readonly (readonly [number, number])[], size: number) =>
  pts
    .map(([x, y], i) =>
      rect(x, y, size, size, GOLD_LIGHT, i % 2 === 0 ? `<animate attributeName="opacity" values="1;0.25;1" dur="1.6s" begin="${(i * 0.4).toFixed(1)}s" repeatCount="indefinite"/>` : ''),
    )
    .join('')

// ── 작은 그림 ─────────────────────────────────────────────────────

// 망토(50~): 몸 뒤에서 뒤쪽으로 펄럭이고, 어깨 위로 끝이 바깥으로 젖혀진 높은 깃이 선다 (안감은 자홍)
const smallCape = (t: number) => {
  if (t < 5) return ''
  const c = capeColor(t)
  // 모자(70~)를 쓰면 깃은 챙 아래까지만
  const top = t >= 7 ? 3 : 2.3
  return (
    rect(9.7, top, 1.3, 6 - top, c) +
    rect(19, top, 1.3, 6 - top, c) +
    (t < 7 ? rect(9.2, 1.9, 1.2, 0.6, c) + rect(19.6, 1.9, 1.2, 0.6, c) : '') +
    rect(10.5, top + 0.3, 0.4, 5.7 - top, MAGENTA_DARK) +
    rect(19.1, top + 0.3, 0.4, 5.7 - top, MAGENTA_DARK) +
    rect(10, 3.6, 10, 6.6, c) +
    rect(7.2, 4.1, 3, 5.2, c, swap('height', 5.2, 4)) +
    rect(7.2, 8.9, 3, 0.4, MAGENTA_DARK, swap('y', 8.9, 7.7)) +
    rect(5.4, 4.7, 2, 3.4, c, swap('height', 3.4, 2.3)) +
    rect(5.4, 7.7, 2, 0.4, MAGENTA_DARK, swap('y', 7.7, 6.6)) +
    (elite(t) ? rect(10, 9.9, 10, 0.35, GOLD) + stars([[8.2, 5.2], [6.2, 5.6], [9.2, 6.9], [7.8, 6.4]], 0.35) : '')
  )
}

// 후드(10~): 머리를 덮고 얼굴 양옆으로 늘어지며, 뾰족한 꼬리가 뒤로 처져 달랑거린다
// 모자(70~)를 쓰면 정수리는 모자에 가리고 양옆 자락만 남는다
const smallHood = (t: number) => {
  if (t < 1) return ''
  const [c, d, l] = hoodColors(t)
  const sides =
    rect(10.5, 2.6, 1.1, 3.8, c!) + rect(11.2, 3.4, 0.4, 3, d!) + rect(18.4, 2.6, 1.1, 3.8, c!) + rect(18.4, 3.4, 0.4, 3, d!)
  if (t >= 7) return sides
  return (
    rect(9.8, 1.7, 1.6, 1.1, c!) +
    rect(9, 2.2, 1.1, 0.9, c!, swap('y', 2.2, 2.4)) +
    rect(8.3, 2.8, 0.9, 0.6, c!, swap('y', 2.8, 3.2)) +
    sides +
    rect(10.8, 2, 8.4, 1.5, c!) +
    rect(11.6, 1.5, 6.8, 0.6, c!) +
    rect(12.2, 1.7, 3.4, 0.3, l!) +
    rect(11.6, 3.4, 6.8, 0.35, d!)
  )
}

// 뾰족 마법사 모자(70~): 넓은 챙, 뒤로 꺾인 끝, 자홍 띠와 금 버클. 80부터 별무늬
// 90부터 띠 위에 자홍 보석을 박은 금 왕관을 두르고, 꺾인 끝에 금방울이 달린다
const smallHat = (t: number) => {
  if (t < 7) return ''
  const [c, d, l] = hatColors(t)
  return (
    rect(9.6, 2.5, 10.8, 0.7, c!) +
    rect(10.4, 3.1, 9.2, 0.25, d!) +
    rect(11.4, 1.5, 7.2, 1.1, c!) +
    rect(12.2, 0.5, 5.6, 1.1, c!) +
    rect(13, -0.4, 4, 1, c!) +
    rect(13.6, -1, 2.6, 0.7, c!) +
    rect(11.8, -1.3, 2.4, 0.7, c!) +
    rect(10.8, -0.9, 1.3, 0.7, c!) +
    rect(10.4, -0.3, 0.8, 0.6, t >= 9 ? GOLD : c!) +
    rect(16.8, 0.5, 0.4, 1.1, l!) +
    rect(16.2, -0.4, 0.4, 0.9, l!) +
    rect(11.4, 1.7, 7.2, 0.5, MAGENTA) +
    rect(14.6, 1.55, 0.8, 0.8, GOLD) +
    (elite(t) ? stars([[13.2, 0.8], [15.6, -0.1], [12.4, -1.1], [16.4, 1.0]], 0.3) : '') +
    (t >= 9
      ? rect(11.2, 1.5, 7.6, 0.9, GOLD) +
        rect(11.2, 2.2, 7.6, 0.2, GOLD_DARK) +
        rect(11.4, 0.9, 0.7, 0.7, GOLD) +
        rect(14.65, 0.5, 0.7, 1.1, GOLD) +
        rect(17.9, 0.9, 0.7, 0.7, GOLD) +
        rect(14.7, 1.7, 0.6, 0.5, MAGENTA) +
        rect(12.6, 1.8, 0.4, 0.4, MAGENTA_LIGHT) +
        rect(17, 1.8, 0.4, 0.4, MAGENTA_LIGHT)
      : '')
  )
}

// 어둠의 로브(40~): 몸통과 다리 윗부분을 덮는 긴 옷. 발은 보인다
const smallRobe = (t: number) => {
  if (t < 4) return ''
  const c = robeColor(t)
  const trim = trimColor(t)
  return (
    rect(11, 6.4, 8, 2.6, c) +
    rect(10.7, 9, 8.6, 0.7, c) +
    rect(10.7, 9.45, 8.6, 0.25, trim) +
    rect(11, 6.4, 8, 0.3, trim) +
    rect(14.75, 6.4, 0.5, 3.3, trim) +
    rect(11, 7.7, 8, 0.4, robeDark(t)) +
    rect(14.55, 7.6, 0.9, 0.6, elite(t) ? MAGENTA : GOLD) +
    (elite(t) ? stars([[12.2, 7.1], [17.4, 7.1], [12.8, 8.6], [16.8, 8.7]], 0.35) : '')
  )
}

// 넓은 소매: 장갑과 몸 사이의 팔을 덮고 팔과 같이 흔들린다
const smallSleeves = (t: number, pose: Pose) => {
  if (t < 4) return ''
  const c = robeColor(t)
  const trim = trimColor(t)
  const [la, lb, ra, rb] = pose === 'run' ? [5.5, 6.5, 6.5, 5.5] : [6, 6, 6, 6]
  return (
    rect(10.1, la - 0.2, 1.3, 1.4, c, swap('y', la - 0.2, lb - 0.2)) +
    rect(10.1, la - 0.2, 0.3, 1.4, trim, swap('y', la - 0.2, lb - 0.2)) +
    rect(18.6, ra - 0.2, 1.3, 1.4, c, swap('y', ra - 0.2, rb - 0.2)) +
    rect(19.6, ra - 0.2, 0.3, 1.4, trim, swap('y', ra - 0.2, rb - 0.2))
  )
}

// 마름모꼴 수정 (가운데 x, 위 y, 칸 크기 u): 왼쪽 면은 밝고 오른쪽 면은 어둡다
const crystal = (cx: number, y: number, u: number, gem: string, light: string, dark: string) =>
  rect(cx - u, y, 2 * u, u, gem) +
  rect(cx - 2 * u, y + u, 4 * u, u, gem) +
  rect(cx - 3 * u, y + 2 * u, 6 * u, 4 * u, gem) +
  rect(cx - 2 * u, y + 6 * u, 4 * u, u, gem) +
  rect(cx - u, y + 7 * u, 2 * u, u, gem) +
  rect(cx - 2 * u, y + 2 * u, u, 3 * u, light) +
  rect(cx - u, y + u, u, u, light) +
  rect(cx + u, y + 3 * u, u, 3 * u, dark)

// 수정 지팡이(60~): 금 발톱이 수정을 움켜쥔 지팡이. 수정이 숨 쉬듯 빛나고, 싸울 때는 마법을 쏘기 직전
// (공격 주기 0.36~0.46)에 확 밝아진다. 90부터 전설의 자홍 수정이 더 빨리 맥동한다
const smallStaff = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const run = pose === 'run'
  const g = glove(t)!
  const legend = t >= 9
  const gem = legend ? MAGENTA : CRYSTAL
  const flare =
    run && t < 10
      ? '<g opacity="0">' +
        `<animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.36;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/>` +
        rect(19.1, -1.4, 3, 2.6, MAGENTA_LIGHT) +
        rect(19.7, -2.1, 1.8, 4, MAGENTA_LIGHT) +
        '</g>'
      : ''
  return (
    '<g>' +
    (run ? handSwing : '') +
    rect(20.35, 1.6, 0.5, 9, STAFF_WOOD) +
    rect(20.35, 1.6, 0.15, 9, STAFF_SHINE) +
    // 은은한 빛무리 (두 겹이 겹친 가운데가 더 밝다)
    rect(19.3, -1.2, 2.6, 2.2, gem, glow(legend ? '0.8s' : '1.4s')) +
    rect(19.9, -1.9, 1.4, 3.6, gem, glow(legend ? '0.8s' : '1.4s')) +
    crystal(20.6, -1.5, 0.3, gem, CRYSTAL_LIGHT, legend ? MAGENTA_DARK : CRYSTAL_DARK) +
    rect(19.65, 0.1, 0.35, 1.4, GOLD_DARK) +
    rect(21.2, 0.1, 0.35, 1.4, GOLD_DARK) +
    rect(19.9, 1.3, 1.4, 0.4, GOLD) +
    flare +
    // 지팡이를 쥔 손 (자루 위를 다시 덮는다)
    rect(19.8, run ? 6.2 : 5.7, 1.5, 1.6, g.color) +
    rect(20, run ? 6.35 : 5.85, 0.5, 0.4, g.shine!) +
    '</g>'
  )
}

// 어둠의 오브: 둥실 떠서 자홍빛 점 하나가 둘레를 돈다
const orb = (cx: number, cy: number, r: number, bob: number) =>
  '<g>' +
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-bob};0 0" dur="1.6s" repeatCount="indefinite"/>` +
  rect(cx - r * 1.6, cy - r * 0.9, r * 3.2, r * 1.8, HOOD_LIGHT, glow('1.6s')) +
  rect(cx - r * 0.9, cy - r * 1.6, r * 1.8, r * 3.2, HOOD_LIGHT, glow('1.6s')) +
  rect(cx - r * 0.6, cy - r, r * 1.2, r * 2, ORB) +
  rect(cx - r, cy - r * 0.6, r * 2, r * 1.2, ORB) +
  rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6, ORB) +
  rect(cx - r * 0.55, cy - r * 0.6, r * 0.45, r * 0.45, MAGENTA_LIGHT) +
  rect(cx + r * 0.1, cy + r * 0.15, r * 0.35, r * 0.35, MAGENTA) +
  '<g>' +
  `<animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};360 ${cx} ${cy}" dur="2.4s" repeatCount="indefinite"/>` +
  rect(cx + r * 1.25, cy - r * 0.2, r * 0.4, r * 0.4, MAGENTA) +
  '</g>' +
  '</g>'

// 90~: 머리 위 보라 후광, 뒤쪽에 떠 있는 어둠의 오브, 자홍·금 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15.2, -1.9, 2.8, 0.45, 0.3, t, HOOD_LIGHT) +
      orb(7.2, 1.4, 0.9, 0.5) +
      sparkle(22.6, 2.4, 1.4, MAGENTA, '0.4s') +
      sparkle(5.8, 4.4, 1.2, GOLD, '1.2s')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCape(t),
    boot: boot(t),
    body: smallRobe(t),
    head: smallHood(t) + smallHat(t),
    glove: glove(t),
    hand: smallSleeves(t, pose) + smallStaff(t, pose),
    over: smallGlory(t),
  })

// 그림자 화살: 손(지팡이가 생기면 수정 끝)에서 몬스터로 날아가며 보라 연기 꼬리를 끌고,
// 맞으면 자홍빛이 십자로 터진다. 90부터 화살 속이 하얗게 빛난다
const hit = (t: number) => {
  if (t >= 10) return ''
  const [sx, sy] = t >= 6 ? [16, 2.4] : [16.6, 8.4]
  const [ex, ey] = [26, 7.6]
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy)
  const [ux, uy] = [dx / len, dy / len]
  const core = t >= 9 ? '#FFFFFF' : MAGENTA_LIGHT
  // 꼬리: 화살 뒤로 이어지며 갈수록 작고 옅다. 위아래로 살짝 엇갈려 연기처럼 일렁인다
  const trail = (
    [
      [1.1, 0.15, 1.3, HOOD, 0.95],
      [2, -0.2, 1.05, HOOD_DARK, 0.8],
      [2.8, 0.2, 0.85, HOOD, 0.6],
      [3.5, -0.15, 0.65, HOOD_DARK, 0.45],
      [4.1, 0.1, 0.5, HOOD, 0.3],
    ] as const
  )
    .map(([k, off, s, c, o]) => {
      const x = sx - ux * k - uy * off - s / 2
      const y = sy - uy * k + ux * off - s / 2
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${s}" height="${s}" fill="${c}" opacity="${o}"/>`
    })
    .join('')
  const bolt =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.46;0.59;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${dx.toFixed(2)} ${dy.toFixed(2)};${dx.toFixed(2)} ${dy.toFixed(2)}" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    '<g><animate attributeName="opacity" values="1;0.6;1" dur="0.2s" repeatCount="indefinite"/>' +
    trail +
    '</g>' +
    rect(sx - 1.1, sy - 1.1, 2.2, 2.2, HOOD_DARK) +
    rect(sx - 1.4, sy - 0.6, 2.8, 1.2, HOOD_DARK) +
    rect(sx - 0.8, sy - 0.8, 1.6, 1.6, MAGENTA) +
    rect(sx - 0.4, sy - 0.4, 0.8, 0.8, core) +
    '</g>'
  const c = (w: number, h: number, color: string) => rect(-w / 2, -h / 2, w, h, color)
  const burst =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.68;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="translate(${ex} ${ey})"><g>` +
    `<animateTransform attributeName="transform" type="scale" values="0.5;0.5;1.25;1.25" keyTimes="0;0.6;0.7;1" dur="${ATK}" repeatCount="indefinite"/>` +
    c(3.4, 2, HOOD_DARK) +
    c(2, 3.4, HOOD_DARK) +
    c(1, 5.4, MAGENTA) +
    c(5.4, 1, MAGENTA) +
    ([[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as const).map(([x, y]) => rect(x - 0.45, y - 0.45, 0.9, 0.9, HOOD_LIGHT)).join('') +
    c(2, 2, MAGENTA) +
    c(1.1, 1.1, core) +
    '</g></g></g>'
  return bolt + burst
}

// ── 큰 그림 ───────────────────────────────────────────────────────

const bigCape = (t: number) => {
  if (t < 5) return ''
  const c = capeColor(t)
  // 모자(70~)를 쓰면 깃은 챙 아래까지만
  const top = t >= 7 ? 34 : 26
  return (
    rect(312, top, 16, 64 - top, c) +
    rect(412, top, 16, 64 - top, c) +
    (t < 7 ? rect(304, 20, 14, 8, c) + rect(422, 20, 14, 8, c) : '') +
    rect(322, top + 4, 6, 60 - top, MAGENTA_DARK) +
    rect(412, top + 4, 6, 60 - top, MAGENTA_DARK) +
    rect(316, 40, 108, 70, c) +
    rect(426, 46, 16, 56, c, flutter(56, 40)) +
    rect(442, 54, 10, 40, c, flutter(40, 26)) +
    rect(316, 106, 108, 4, elite(t) ? GOLD : MAGENTA_DARK) +
    (elite(t) ? stars([[432, 60], [446, 70], [430, 84], [318, 50]], 4) : '')
  )
}

const bigHood = (t: number) => {
  if (t < 1) return ''
  const [c, d, l] = hoodColors(t)
  const sides = rect(325, 32, 12, 38, c!) + rect(333, 40, 4, 30, d!) + rect(403, 32, 12, 38, c!) + rect(403, 40, 4, 30, d!)
  if (t >= 7) return sides
  return (
    rect(314, 20, 22, 11, c!) +
    rect(302, 27, 16, 9, c!, '<animate attributeName="y" values="27;30;27" dur="0.9s" repeatCount="indefinite"/>') +
    rect(294, 34, 10, 7, c!, '<animate attributeName="y" values="34;39;34" dur="0.9s" repeatCount="indefinite"/>') +
    sides +
    rect(328, 24, 84, 16, c!) +
    rect(336, 17, 68, 8, c!) +
    rect(344, 20, 30, 3, l!) +
    rect(336, 40, 68, 4, d!)
  )
}

const bigHat = (t: number) => {
  if (t < 7) return ''
  const [c, d, l] = hatColors(t)
  return (
    rect(308, 28, 124, 9, c!) +
    rect(318, 35, 104, 3, d!) +
    rect(334, 12, 72, 17, c!) +
    rect(342, 0, 56, 13, c!) +
    rect(350, -9, 40, 10, c!) +
    rect(356, -14, 28, 6, c!) +
    rect(338, -18, 26, 7, c!) +
    rect(326, -14, 16, 7, c!) +
    rect(318, -8, 10, 7, c!) +
    rect(314, -2, 8, 7, t >= 9 ? GOLD : c!) +
    rect(398, 12, 6, 16, l!) +
    rect(390, 0, 6, 12, l!) +
    rect(334, 17, 72, 7, MAGENTA) +
    rect(362, 15, 16, 11, GOLD) +
    rect(366, 18, 8, 5, c!) +
    (elite(t) ? stars([[346, 4], [374, -6], [384, 8], [352, -4], [330, -12]], 4) : '') +
    (t >= 9
      ? rect(332, 14, 76, 11, GOLD) +
        rect(332, 23, 76, 2, GOLD_DARK) +
        rect(334, 6, 8, 8, GOLD) +
        rect(350, 9, 6, 5, GOLD) +
        rect(365, 2, 10, 12, GOLD) +
        rect(384, 9, 6, 5, GOLD) +
        rect(398, 6, 8, 8, GOLD) +
        rect(366, 16, 8, 6, MAGENTA) +
        rect(344, 17, 5, 4, MAGENTA_LIGHT) +
        rect(391, 17, 5, 4, MAGENTA_LIGHT) +
        rect(316, 1, 3, 3, GOLD_LIGHT)
      : '')
  )
}

const bigRobe = (t: number) => {
  if (t < 4) return ''
  const c = robeColor(t)
  const trim = trimColor(t)
  return (
    rect(330, 72, 80, 24, c) +
    rect(326, 96, 88, 8, c) +
    rect(326, 101, 88, 3, trim) +
    rect(330, 72, 80, 3, trim) +
    rect(367, 72, 6, 32, trim) +
    rect(330, 84, 80, 5, robeDark(t)) +
    rect(362, 82, 16, 9, elite(t) ? MAGENTA : GOLD) +
    (elite(t) ? stars([[342, 78], [396, 78], [348, 92], [390, 93]], 4) : '')
  )
}

// 왼쪽(가리키는) 팔의 넓은 소매: 가리키는 팔과 같은 박자로 콕콕 움직인다
const bigLeftSleeve = (t: number) =>
  t < 4
    ? ''
    : '<g>' +
      '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>' +
      rect(306, 62, 26, 18, robeColor(t)) +
      rect(306, 62, 3, 18, trimColor(t)) +
      '</g>'

// 오른팔과 지팡이: 끝·대기는 지팡이를 번쩍 들고, 오류는 빛이 꺼져 금 간 수정을 단 지팡이에 기대 선다
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  const sleeve =
    t < 4
      ? ''
      : variant === 'error'
        ? rect(406, 70, 22, 16, robeColor(t)) + rect(406, 83, 22, 3, trimColor(t))
        : rect(406, 56, 24, 22, robeColor(t)) + rect(406, 56, 24, 3, trimColor(t))
  if (t < 6) return rightArm(variant, g) + sleeve
  const legend = t >= 9
  const gem = legend ? MAGENTA : CRYSTAL
  if (variant === 'error') {
    const puff = (x: number, y: number, begin: string) =>
      `<rect x="${x}" y="${y}" width="6" height="6" fill="${SMOKE}" opacity="0">` +
      `<animate attributeName="opacity" values="0;0.7;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="0 0;4 -14" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
      '</rect>'
    return (
      rect(418, 66, 6, 52, STAFF_WOOD) +
      crystal(421, 34, 4, DIM, DIM_LIGHT, '#3E2F52') +
      rect(420, 42, 2, 6, '#1B1028') +
      rect(422, 48, 2, 6, '#1B1028') +
      rect(410, 56, 5, 10, GOLD_DARK) +
      rect(427, 56, 5, 10, GOLD_DARK) +
      rect(412, 64, 18, 4, GOLD_DARK) +
      puff(418, 26, '0s') +
      puff(424, 24, '0.8s') +
      rightArm(variant, g) +
      sleeve
    )
  }
  const hand = rect(409, 27, 24, 20, g!.color) + rect(412, 29, 7, 5, g!.shine!)
  return (
    rect(418, 0, 6, 100, STAFF_WOOD) +
    rect(418, 0, 2, 100, STAFF_SHINE) +
    rect(405, -28, 32, 22, gem, glow(legend ? '0.8s' : '1.4s')) +
    rect(413, -36, 16, 38, gem, glow(legend ? '0.8s' : '1.4s')) +
    crystal(421, -32, 4, gem, CRYSTAL_LIGHT, legend ? MAGENTA_DARK : CRYSTAL_DARK) +
    rect(409, -14, 5, 14, GOLD_DARK) +
    rect(428, -14, 5, 14, GOLD_DARK) +
    rect(409, -18, 3, 4, GOLD) +
    rect(430, -18, 3, 4, GOLD) +
    rect(412, -2, 18, 6, GOLD) +
    rightArm(variant, g) +
    sleeve +
    hand
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(366, -26, 28, 5, 3.5, t, HOOD_LIGHT) + orb(292, 10, 11, 6) + sparkle(448, -6, 12, MAGENTA, '0.3s') + sparkle(318, -26, 10, GOLD, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCape(t),
    boot: boot(t),
    body: bigRobe(t),
    head: bigHood(t) + bigHat(t),
    glove: glove(t),
    // 보라 장갑의 손가락 주름은 짙은 보라
    crease: HOOD_DARK,
    arm: bigArm(variant, t),
    over: bigLeftSleeve(t) + bigGlory(t),
  })

export const warlock: Job = {
  key: 'warlock',
  name: '흑마법사',
  icon: '🔮',
  gear: [
    '',
    '보라 후드',
    '검은 장화',
    '보라 장갑',
    '어둠의 로브',
    '검보라 망토',
    '보랏빛 수정 지팡이',
    '뾰족 마법사 모자',
    '별무늬 로브와 별빛 망토',
    '황금 왕관·보라 후광·어둠의 오브',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 12 : t >= 6 ? 4 : 0),
  bigHeadroom: t => (t >= 6 ? 40 : 0),
}
