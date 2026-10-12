// 모험가: 처음 만든 차림. 머리띠 → 운동화 → 권투 장갑 → 가죽 갑옷 → 붉은 망토 → 강철 검
// → 강철 투구 → 황금 갑옷·투구와 보라 망토 → 왕관·후광·빛나는 검 → 무지개 후광
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  bigClawd,
  flutter,
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

const BAND_RED = '#E5484D'
const CAPE_RED = '#C0392B'
const PURPLE = '#6B2FB3'
const SILVER = '#C0C7D0'
const SILVER_DARK = '#8E98A4'
const SILVER_LIGHT = '#E9EDF2'
const LEATHER = '#8B5A2B'
const LEATHER_DARK = '#5A3A1C'
const LEATHER_LIGHT = '#B07A45'
const BLADE = '#DDE3EA'
const BLADE_GLOW = '#9BE7FF'
const GEM_BLUE = '#3B82F6'
const GEM_GREEN = '#22C55E'

const capeColor = (t: number) => (t >= 8 ? PURPLE : CAPE_RED)
const armorColor = (t: number) => (t >= 8 ? GOLD : LEATHER)
const helmetColors = (t: number) => (t >= 8 ? [GOLD, GOLD_DARK, GOLD_LIGHT] : [SILVER, SILVER_DARK, SILVER_LIGHT])

// 운동화(20~): 큼직한 파란 운동화와 흰 줄무늬. 장갑(30~): 빨간 권투 장갑
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: '#2563EB', stripe: '#FFFFFF', sole: '#1F2937' } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: '#DC2626', shine: '#F87171' } : undefined)

// ── 작은 그림 ─────────────────────────────────────────────────────

// 망토(50~): 몸 뒤에서 뒤쪽으로 길게 펄럭인다
const smallCape = (t: number) =>
  t < 5
    ? ''
    : rect(10, 3.6, 10, 6.6, capeColor(t)) +
      rect(7.2, 4.2, 3, 5, capeColor(t), swap('height', 5, 3.8)) +
      rect(5.4, 4.8, 2, 3.4, capeColor(t), swap('height', 3.4, 2.2)) +
      (t >= 8 ? rect(10, 9.9, 10, 0.35, GOLD) : '')

// 갑옷(40~, 80부터 황금): 가슴판과 몸 밖으로 튀어나온 어깨 보호대
const smallArmor = (t: number) =>
  t < 4
    ? ''
    : rect(11, 6.5, 8, 2.5, armorColor(t)) +
      rect(11, 6.5, 8, 0.3, t >= 8 ? GOLD_LIGHT : LEATHER_LIGHT) +
      rect(11, 7.9, 8, 0.45, t >= 8 ? PURPLE : LEATHER_DARK) +
      rect(14.5, 7.75, 1, 0.75, GOLD) +
      rect(9.8, 4.9, 2.2, 1.4, armorColor(t)) +
      rect(18, 4.9, 2.2, 1.4, armorColor(t)) +
      rect(9.8, 4.9, 2.2, 0.3, t >= 8 ? GOLD_LIGHT : LEATHER_LIGHT) +
      rect(18, 4.9, 2.2, 0.3, t >= 8 ? GOLD_LIGHT : LEATHER_LIGHT) +
      (t >= 8 ? rect(12, 7, 0.6, 0.6, GEM_BLUE) + rect(17.4, 7, 0.6, 0.6, GEM_GREEN) : '')

// 머리: 머리띠(10~) → 투구(70~) → 황금 투구(80~) → 왕관(90~)
const smallHead = (t: number) => {
  if (t >= 7) {
    const [c, d, l] = helmetColors(t)
    return (
      rect(11, 2, 8, 1.6, c!) +
      rect(11.6, 1.4, 6.8, 0.7, c!) +
      rect(10.6, 3.2, 8.8, 0.6, d!) +
      rect(14.6, 1.4, 0.8, 2.2, l!) +
      (t >= 9
        ? rect(12.4, 0.6, 5.2, 0.9, GOLD) +
          rect(12.4, 0, 0.8, 0.7, GOLD) +
          rect(14.6, -0.4, 0.8, 1.1, GOLD) +
          rect(16.8, 0, 0.8, 0.7, GOLD) +
          rect(14.7, 0.75, 0.6, 0.5, BAND_RED)
        : '')
    )
  }
  if (t >= 1) {
    // 두꺼운 머리띠, 매듭, 뒤로 길게 휘날리는 끈
    return (
      rect(11, 3.1, 8, 1.1, BAND_RED) +
      rect(11, 3.1, 8, 0.25, '#F87171') +
      rect(10, 3, 1.2, 1.4, BAND_RED) +
      rect(7.2, 2.7, 2.9, 0.6, BAND_RED, swap('y', 2.7, 2.2)) +
      rect(6.6, 3.8, 3.5, 0.6, BAND_RED, swap('y', 3.8, 3.4))
    )
  }
  return ''
}

// 검(60~)은 오른손에 들고 팔과 같이 흔든다. 90부터 빛난다
const smallSword = (t: number) => {
  if (t < 6) return ''
  const blade = t >= 9 ? BLADE_GLOW : BLADE
  return (
    '<g>' +
    handSwing +
    (t >= 9 ? rect(20, 1.6, 1.3, 4.8, BLADE_GLOW, '<animate attributeName="opacity" values="0.15;0.55;0.15" dur="1.2s" repeatCount="indefinite"/>') : '') +
    rect(20.25, 2, 0.8, 4.2, blade) +
    rect(20.25, 2, 0.25, 4.2, '#FFFFFF') +
    rect(20.45, 1.5, 0.4, 0.5, blade) +
    // 강철 칼날은 밝은 배경에서도 보이게 그늘진 날을 세운다 (빛나는 전설의 검은 그대로)
    (t < 9 ? rect(20.85, 2, 0.25, 4.2, SILVER_DARK) + rect(20.7, 1.5, 0.2, 0.5, SILVER_DARK) : '') +
    rect(19.8, 6, 1.7, 0.4, t >= 8 ? GOLD : LEATHER_DARK) +
    '</g>'
  )
}

// 레벨 90~: 머리 위 후광과 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.5, 3.2, 0.7, 0.4, t) +
      [[7, 1, '0s'], [23, 2.5, '0.8s']]
        .map(
          ([x, y, b]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect((x as number) - 0.2, (y as number) - 0.7, 0.4, 1.4, GOLD) +
            rect((x as number) - 0.7, (y as number) - 0.2, 1.4, 0.4, GOLD) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCape(t),
    boot: boot(t),
    body: smallArmor(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallSword(t),
    over: smallGlory(t),
  })

// 칼날이 지나간 자리(몬스터 앞에 번쩍). 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const c = t >= 9 ? BLADE_GLOW : '#FFFFFF'
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.58;0.62;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    // 밝은 배경에서도 보이게 회색 그림자를 깔고 그 위에 밝은 칼자국
    [0, 1, 2, 3, 4].map(i => rect(20.85 + i * 0.6, 4.65 + i * 1.3, 0.7, 1.4, SILVER_DARK)).join('') +
    [0, 1, 2, 3, 4].map(i => rect(20.6 + i * 0.6, 4.4 + i * 1.3, 0.7, 1.4, c)).join('') +
    rect(20, 4, 0.6, 0.6, GOLD) +
    '</g>'
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────

const bigCape = (t: number) =>
  t < 5
    ? ''
    : rect(316, 40, 108, 70, capeColor(t)) +
      rect(426, 46, 16, 56, capeColor(t), flutter(56, 40)) +
      rect(442, 54, 10, 40, capeColor(t), flutter(40, 26)) +
      (t >= 8 ? rect(316, 106, 108, 5, GOLD) : '')

const bigArmor = (t: number) => {
  if (t < 4) return ''
  const trim = t >= 8 ? GOLD_LIGHT : LEATHER_LIGHT
  return (
    rect(330, 72, 80, 24, armorColor(t)) +
    rect(330, 72, 80, 3, trim) +
    rect(330, 85, 80, 5, t >= 8 ? PURPLE : LEATHER_DARK) +
    rect(363, 83, 14, 9, GOLD) +
    // 몸 밖으로 튀어나온 어깨 보호대
    rect(318, 52, 22, 16, armorColor(t)) +
    rect(318, 52, 22, 3, trim) +
    rect(400, 52, 22, 16, armorColor(t)) +
    rect(400, 52, 22, 3, trim) +
    (t >= 8 ? rect(344, 77, 7, 6, GEM_BLUE) + rect(389, 77, 7, 6, GEM_GREEN) : '')
  )
}

const bigHead = (t: number) => {
  if (t >= 7) {
    const [c, d, l] = helmetColors(t)
    return (
      rect(330, 22, 80, 16, c!) +
      rect(338, 16, 64, 7, c!) +
      rect(324, 34, 92, 6, d!) +
      rect(366, 14, 8, 24, l!) +
      (t >= 9
        ? rect(342, 6, 56, 9, GOLD) +
          rect(342, -2, 9, 9, GOLD) +
          rect(365, -8, 10, 15, GOLD) +
          rect(389, -2, 9, 9, GOLD) +
          rect(367, -2, 6, 6, BAND_RED) +
          rect(346, 8, 5, 4, GEM_BLUE) +
          rect(389, 8, 5, 4, GEM_GREEN)
        : '')
    )
  }
  if (t >= 1) {
    // 두꺼운 머리띠, 매듭, 뒤로 길게 휘날리는 끈
    return (
      rect(330, 34, 80, 11, BAND_RED) +
      rect(330, 34, 80, 3, '#F87171') +
      rect(318, 32, 14, 15, BAND_RED) +
      rect(290, 28, 30, 7, BAND_RED, '<animate attributeName="y" values="28;22;28" dur="0.9s" repeatCount="indefinite"/>') +
      rect(284, 40, 36, 7, BAND_RED, '<animate attributeName="y" values="40;35;40" dur="0.9s" repeatCount="indefinite"/>')
    )
  }
  return ''
}

// 오른팔과 검: 끝·대기는 검을 번쩍 들고, 오류는 축 늘어뜨린다 (손이 손잡이를 덮게 검을 먼저 그린다)
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return rightArm(variant, g)
  const blade = t >= 9 ? BLADE_GLOW : BLADE
  const guard = t >= 8 ? GOLD : LEATHER_DARK
  const shine = (x: number, y: number, w: number, h: number) =>
    t >= 9 ? rect(x, y, w, h, BLADE_GLOW, '<animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.2s" repeatCount="indefinite"/>') : ''
  // 강철 칼날의 그늘진 날 (밝은 배경에서도 보이게, 빛나는 전설의 검은 그대로)
  const edge = (x: number, y: number, h: number) => (t < 9 ? rect(x, y, 2, h, SILVER_DARK) : '')
  if (variant === 'error') {
    return (
      rightArm(variant, g) +
      shine(412, 98, 18, 40) +
      rect(408, 98, 26, 5, guard) +
      rect(418, 103, 6, 30, blade) +
      rect(419, 133, 4, 4, blade) +
      edge(422, 103, 30) +
      edge(421, 133, 4)
    )
  }
  const arm = rightArm(variant, g)
  // 팔 → 검 → 손 순서로 겹친다: rightArm은 팔과 손을 같이 그리므로 손 부분만 다시 덮는다
  const hand = g ? rect(409, 27, 24, 20, g.color) + (g.shine ? rect(412, 29, 7, 5, g.shine) : '') : rect(413, 32, 16, 12, '#D97757')
  return (
    arm +
    shine(412, -22, 18, 52) +
    rect(418, -14, 6, 41, blade) +
    rect(419, -19, 4, 5, blade) +
    edge(422, -14, 41) +
    edge(421, -19, 5) +
    rect(408, 27, 26, 5, guard) +
    hand
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -20, 34, 7, 4, t) + sparkle(312, 4, 12, GOLD, '0.3s') + sparkle(440, 0, 12, GOLD, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCape(t),
    boot: boot(t),
    body: bigArmor(t),
    head: bigHead(t),
    glove: glove(t),
    arm: bigArm(variant, t),
    over: bigGlory(t),
  })

export const adventurer: Job = {
  key: 'adventurer',
  name: '모험가',
  icon: '🗡️',
  gear: [
    '',
    '빨간 머리띠',
    '운동화',
    '권투 장갑',
    '가죽 갑옷',
    '붉은 망토',
    '강철 검',
    '강철 투구',
    '황금 갑옷·투구와 보라 망토',
    '왕관·후광·전설의 검',
    '무지개 후광',
  ],
  melee: true,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : 0),
  bigHeadroom: t => (t >= 9 ? 32 : t >= 6 ? 22 : 0),
}
