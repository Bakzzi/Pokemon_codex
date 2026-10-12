// 사냥꾼: 숲을 누비는 순찰자. 깃털 모자 → 가죽 장화 → 활 팔찌 → 가죽 조끼와 화살통 → 초록 망토 → 장궁
// → 사냥꾼 후드 → 엘프 은빛 갑옷 → 잎새 관·후광·별빛 활 → 무지개 후광
import { ATK } from '../monsters.ts'
import { GOLD, GOLD_DARK, GOLD_LIGHT, ORANGE, STEP, WHITE, bigClawd, flutter, glow, halo, handSwing, rect, rightArm, smallClawd, sparkle, swap } from '../pixel.ts'
import type { BigVariant, Boot, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const GREEN = '#3F8A3A'
const GREEN_DARK = '#27612A'
const GREEN_LIGHT = '#74BE62'
const EMERALD = '#1F8A5B'
const EMERALD_DARK = '#13603F'
const TAN = '#C79A5B'
const TAN_DARK = '#8F6A38'
const TAN_LIGHT = '#E5C48C'
const LEATHER = '#6E4424'
const LEATHER_DARK = '#432814'
const WOOD = '#8C5A2B'
const WOOD_LIGHT = '#C08A52'
const BOWSTRING = '#F4EBDC'
const FEATHER = '#D9473F'
const FEATHER_LIGHT = '#F59A8A'
const STEEL = '#B9C2CC'
const ELF = '#CBDDD2'
const ELF_DARK = '#8FAE9C'
const ELF_LIGHT = '#F2FAF5'
const STAR = '#FFF7D1'
// 별빛 활의 시위: 밝은 배경에서도 보이게 별빛보다 한 톤 짙은 금빛
const STAR_STRING = '#E2CF9A'
const STAR_GLOW = '#A6F4C5'
const GEM_GREEN = '#22C55E'

const elf = (t: number) => t >= 8
const cloakColor = (t: number) => (elf(t) ? EMERALD : GREEN)
const cloakDark = (t: number) => (elf(t) ? EMERALD_DARK : GREEN_DARK)

// 가죽 장화(20~): 무릎 아래 갈색 장화와 밝은 접힌 단. 80부터 은빛 엘프 장화
const boot = (t: number): Boot | undefined =>
  t >= 8 ? { color: '#2E5E47', stripe: ELF_LIGHT, sole: '#1B3A2B' } : t >= 2 ? { color: LEATHER, stripe: TAN_LIGHT, sole: LEATHER_DARK } : undefined

// ── 작은 그림 ─────────────────────────────────────────────────────

// 오른손(앞)에 든 것: 달릴 때는 팔과 같이 흔들고(팔 y 6.5 기준), 쉴 때는 팔(y 6)에 맞춰 가만히 든다
const inRightHand = (pose: Pose, inner: string) =>
  pose === 'run' ? `<g>${handSwing}${inner}</g>` : `<g transform="translate(0 -0.5)">${inner}</g>`

// 왼손(뒤)도 같은 식으로: 달릴 때 왼팔은 y 5.5 → 6.5로 내려간다
const inLeftHand = (pose: Pose, inner: string) =>
  pose === 'run'
    ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 1" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>${inner}</g>`
    : `<g transform="translate(0 0.5)">${inner}</g>`

// 화살 한 대 (오른쪽을 겨눈다). x, y는 화살촉 끝, 길이 len
const arrowRight = (x: number, y: number, len: number, shaft: string, head: string, vane: string) =>
  rect(x - len, y - 0.17, len - 0.6, 0.34, shaft) +
  rect(x - 0.6, y - 0.36, 0.4, 0.72, head) +
  rect(x - 0.2, y - 0.17, 0.2, 0.34, head) +
  rect(x - len - 0.1, y - 0.6, 1.2, 0.42, vane) +
  rect(x - len - 0.1, y + 0.18, 1.2, 0.42, vane)

// 망토(50~): 어깨에서 뒤로 펄럭이고, 끝단은 나뭇잎처럼 들쭉날쭉. 80부터 에메랄드에 은빛 단
const smallCloak = (t: number) => {
  if (t < 5) return ''
  const c = cloakColor(t)
  const d = cloakDark(t)
  return (
    rect(10, 3.4, 10, 6.6, c) +
    rect(7.4, 3.9, 2.8, 5.5, c, swap('height', 5.5, 4.3)) +
    rect(7.8, 9.3, 0.8, 0.6, c, swap('y', 9.3, 8.1)) +
    rect(9.2, 9.3, 0.8, 0.6, c, swap('y', 9.3, 8.1)) +
    rect(5.6, 4.5, 2, 3.9, c, swap('height', 3.9, 2.7)) +
    rect(5.9, 8.3, 0.8, 0.5, c, swap('y', 8.3, 7.1)) +
    rect(10, 3.4, 0.5, 6.2, d) +
    (elf(t) ? rect(10, 9.7, 10, 0.3, ELF_LIGHT) : '')
  )
}

// 화살통(40~): 등에 비스듬히 메고, 위로 화살 깃이 삐죽 나온다. 80부터 은빛 테
const smallQuiver = (t: number) => {
  if (t < 4) return ''
  const rim = elf(t) ? ELF_LIGHT : LEATHER_DARK
  const band = elf(t) ? ELF : TAN
  const vane = t >= 9 ? STAR_GLOW : elf(t) ? GREEN_LIGHT : FEATHER
  // 화살 깃: 가운데 대가 보이는 세로 깃 (x는 대의 왼쪽, y는 깃 꼭대기)
  const fletch = (x: number, y: number, c: string) => rect(x - 0.3, y, 0.9, 1.1, c) + rect(x, y - 0.2, 0.3, 1.9, WOOD_LIGHT)
  return (
    fletch(7.7, -0.1, vane) +
    fletch(8.7, -0.5, t >= 9 ? WHITE : FEATHER_LIGHT) +
    fletch(9.7, -0.05, vane) +
    rect(7.3, 1.25, 2.3, 1.7, LEATHER) +
    rect(7.9, 2.8, 2.3, 1.7, LEATHER) +
    rect(8.5, 4.3, 2.3, 1.7, LEATHER) +
    rect(7.1, 0.95, 2.8, 0.5, rim) +
    rect(7.6, 2.25, 2.0, 0.35, band) +
    rect(8.5, 4.75, 1.8, 0.35, band)
  )
}

// 가죽 조끼(40~): 몸 아래쪽을 덮는 조끼, 비스듬한 화살통 끈, 허리띠. 80부터 은빛 엘프 갑옷과 잎 무늬
const smallVest = (t: number) => {
  if (t < 4) return ''
  const e = elf(t)
  const c = e ? ELF : TAN
  const top = e ? ELF_LIGHT : TAN_LIGHT
  const strap = e ? EMERALD : LEATHER_DARK
  return (
    rect(11, 6.3, 8, 2.7, c) +
    rect(11, 6.3, 8, 0.3, top) +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => rect(11 + i, 6.5 + i * 0.26, 1, 0.55, strap)).join('') +
    rect(11, 8.5, 8, 0.5, e ? EMERALD_DARK : LEATHER) +
    rect(14.6, 8.4, 0.8, 0.7, GOLD) +
    (e
      ? // 가슴의 잎 무늬와 은빛 테두리
        rect(16.6, 6.75, 0.7, 0.5, GREEN_LIGHT) + rect(17.2, 6.55, 0.5, 0.4, GREEN_LIGHT) + rect(12.2, 7.6, 0.7, 0.5, GREEN_LIGHT) + rect(11, 8.95, 8, 0.15, ELF_DARK)
      : '')
  )
}

// 머리: 깃털 모자(10~) → 사냥꾼 후드(70~, 80부터 은빛 테두리) → 잎새 관(90~). 붉은 깃털은 계속 꽂혀 있다
// 깃털: (x, y)는 띠에 꽂힌 밑동, 위·뒤로 비스듬히 솟는다
const smallFeather = (x: number, y: number) =>
  rect(x - 0.6, y - 0.8, 0.7, 0.9, FEATHER) +
  rect(x - 1.2, y - 1.6, 0.7, 0.9, FEATHER) +
  rect(x - 1.8, y - 2.4, 0.7, 0.9, FEATHER) +
  rect(x - 2.3, y - 3.0, 0.6, 0.7, FEATHER_LIGHT) +
  rect(x - 1.0, y - 1.6, 0.25, 0.9, FEATHER_LIGHT)

const smallHead = (t: number) => {
  if (t >= 7) {
    const c = cloakColor(t)
    const d = cloakDark(t)
    return (
      // 머리를 덮는 두건, 뒤로 길게 처진 뾰족한 끝, 얼굴 앞의 차양
      rect(10.6, 1.9, 8.6, 1.4, c) +
      rect(11.2, 1.2, 7.0, 0.8, c) +
      rect(12.4, 0.7, 4.4, 0.6, c) +
      rect(10.4, 2.6, 1.8, 3.4, c) +
      rect(9.5, 2.2, 1.2, 1.2, c) +
      rect(8.7, 3.0, 1.0, 1.1, c) +
      rect(8.2, 3.9, 0.8, 0.8, c) +
      rect(18.4, 2.6, 1.0, 1.4, c) +
      rect(12.2, 3.0, 6.2, 0.35, elf(t) ? ELF_LIGHT : d) +
      rect(12.0, 1.3, 3.0, 0.25, elf(t) ? ELF_LIGHT : GREEN_LIGHT) +
      rect(10.4, 5.6, 1.8, 0.4, d) +
      smallFeather(13.4, 1.3) +
      (t >= 9
        ? rect(12.6, 2.45, 5.6, 0.45, GOLD) +
          rect(13.0, 1.95, 0.5, 0.6, GOLD) +
          rect(15.0, 1.4, 0.8, 1.1, GOLD) +
          rect(17.2, 1.95, 0.5, 0.6, GOLD) +
          rect(15.15, 1.65, 0.5, 0.5, GEM_GREEN)
        : '')
    )
  }
  if (t >= 1) {
    // 앞은 낮고 뒤로 갈수록 솟아 뾰족하게 처지는 초록 모자, 띠에 꽂은 붉은 깃털
    return (
      rect(10.8, 2.3, 8.4, 1.0, GREEN) +
      rect(10.8, 3.0, 8.4, 0.3, GREEN_DARK) +
      rect(11.2, 1.6, 6.6, 0.8, GREEN) +
      rect(11.0, 0.9, 4.6, 0.8, GREEN) +
      rect(10.6, 0.3, 2.8, 0.7, GREEN) +
      rect(9.6, 0.4, 1.2, 0.6, GREEN) +
      rect(9.0, 0.8, 0.8, 0.6, GREEN) +
      rect(11.6, 1.0, 2.2, 0.25, GREEN_LIGHT) +
      smallFeather(16.4, 2.3)
    )
  }
  return ''
}

// 활 팔찌(30~): 두 팔뚝에 끈으로 묶은 가죽 토시. 80부터 은빛
const smallBracers = (t: number, pose: Pose) => {
  if (t < 3) return ''
  const c = elf(t) ? ELF : TAN
  const lace = elf(t) ? ELF_DARK : TAN_DARK
  return (
    inRightHand(pose, rect(19.3, 6.3, 1.2, 1.4, c) + rect(19.3, 6.85, 1.2, 0.3, lace)) +
    inLeftHand(pose, rect(9.6, 5.3, 1.2, 1.4, c) + rect(9.6, 5.85, 1.2, 0.3, lace))
  )
}

// 장궁(60~): 오른손에 세로로 쥔다. 활대 배는 앞쪽, 시위는 몸 쪽. 주먹이 줌통을 감싼다. 90부터 빛나는 별빛 활
const smallBow = (t: number) => {
  if (t < 6) return ''
  const star = t >= 9
  const wood = star ? STAR : WOOD
  const light = star ? GOLD_LIGHT : WOOD_LIGHT
  const grip = star ? GOLD : LEATHER_DARK
  const string = star ? STAR_STRING : BOWSTRING
  // 활대 마디 [x, y, 폭, 높이]: 위 활대 셋, 아래 활대 셋. 줌통에서 끝으로 갈수록 시위 쪽(왼쪽)으로 휜다
  const limbs: [number, number, number, number][] = [
    [21.0, 3.9, 0.6, 1.4],
    [20.6, 2.6, 0.6, 1.4],
    [20.2, 1.6, 0.6, 1.1],
    [21.0, 7.8, 0.6, 1.4],
    [20.6, 9.1, 0.6, 1.0],
    [20.2, 10.0, 0.6, 0.8],
  ]
  // 별빛 활대의 테두리: 별빛은 밝은 배경에 묻히므로, 빛과 상관없이 늘 보이는 짙은 금빛 줄을 바깥쪽(시위 반대쪽)에 긋고
  // 끝 쪽 변(위 활대는 윗변, 아래 활대는 아랫변)에서 다음 마디 밖으로 드러난 턱과 활 끝도 막는다
  const E = 0.25
  const edge = (i: number) => {
    const [x, y, w, h] = limbs[i]!
    // 턱은 다음 마디의 바깥 끝에서 시작하고, 활 끝 마디(i = 2, 5)는 변 전체를 막는다
    const from = i % 3 === 2 ? x : limbs[i + 1]![0] + limbs[i + 1]![2]
    return rect(x + w - E, y, E, h, GOLD_DARK) + rect(from, i < 3 ? y : y + h - E, x + w - from, E, GOLD_DARK)
  }
  return (
    // 별빛 활은 활대를 따라 은은한 빛이 감돈다
    (star ? `<g opacity="0.3">${glow()}` + limbs.map(([x, y, w, h]) => rect(x - 0.35, y - 0.3, w + 0.7, h + 0.6, STAR_GLOW)).join('') + rect(20.5, 4.9, 1.6, 3.3, STAR_GLOW) + '</g>' : '') +
    rect(20.15, 1.9, 0.25, 4.6, string) +
    rect(20.15, 7.5, 0.25, 3.1, string) +
    limbs.map(([x, y, w, h]) => rect(x, y, w, h, wood)).join('') +
    (star ? limbs.map((_, i) => edge(i)).join('') : '') +
    rect(21.0, 3.9, 0.2, 1.4, light) +
    rect(20.9, 5.2, 0.8, 2.7, grip) +
    rect(20.0, 1.4, 0.4, 0.4, star ? GOLD : light) +
    rect(20.0, 10.6, 0.4, 0.4, star ? GOLD : light) +
    rect(20.5, 6.5, 0.8, 1.0, ORANGE) +
    (star ? rect(20.25, 1.0, 0.25, 0.25, WHITE) : '')
  )
}

// 레벨 90~: 머리 위 후광과 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15.5, -1.2, 3.2, 0.7, 0.4, t) +
      // 망토 위의 반짝이는 별빛, 빈 배경 위의 것은 금빛 (밝은 배경에서도 보이게)
      [[6.4, 6, '0s', STAR], [22.7, 1.4, '0.8s', GOLD]]
        .map(
          ([x, y, b, c]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect((x as number) - 0.2, (y as number) - 0.7, 0.4, 1.4, c as string) +
            rect((x as number) - 0.7, (y as number) - 0.2, 1.4, 0.4, c as string) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCloak(t) + smallQuiver(t),
    boot: boot(t),
    body: smallVest(t),
    head: smallHead(t),
    hand: smallBracers(t, pose) + inRightHand(pose, smallBow(t)),
    over: smallGlory(t),
  })

// 화살 한 대가 활에서 몬스터까지 곧게 날아가 꽂히고, 맞은 자리에서 불꽃이 튄다. 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const star = t >= 9
  // 별빛 화살은 금빛 살대에 짙은 금 촉 (밝은 배경에서도 보이게), 둘레의 별빛 깃·자취는 그대로
  const shaft = star ? GOLD : WOOD_LIGHT
  const head = star ? GOLD_DARK : STEEL
  const vane = star ? STAR_GLOW : elf(t) ? GREEN_LIGHT : FEATHER
  const spark = star ? STAR_GLOW : GOLD
  return (
    // 날아가는 화살 (0.44 → 0.6)
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.44;0.6" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;8 0;8 0" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(13.2, 7.55, 1.6, 0.18, star ? STAR_GLOW : WHITE) +
    rect(12.6, 8.05, 1.2, 0.15, star ? STAR_GLOW : WHITE) +
    arrowRight(17.6, 7.85, 3.6, shaft, head, vane) +
    (star ? rect(14.2, 7.4, 3.6, 0.9, STAR_GLOW, glow('0.4s')) : '') +
    '</g>' +
    // 맞은 자리의 불꽃 (0.6 → 0.72)
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    // 금빛 십자 불꽃과 흰 심, 네 귀퉁이로 튀는 조각, 부러져 튀는 깃 한 조각
    rect(24.2, 7.5, 3, 0.7, spark) +
    rect(25.35, 6.35, 0.7, 3, spark) +
    rect(24.8, 7.65, 1.8, 0.4, WHITE) +
    rect(25.5, 6.95, 0.4, 1.8, WHITE) +
    rect(24.1, 6.3, 0.5, 0.5, spark) +
    rect(26.8, 6.3, 0.5, 0.5, spark) +
    rect(24.1, 8.9, 0.5, 0.5, spark) +
    rect(26.8, 8.9, 0.5, 0.5, spark) +
    rect(23.0, 6.9, 0.7, 0.45, vane) +
    (star ? rect(23.6, 5.6, 0.5, 0.5, STAR) + rect(27.6, 9.6, 0.5, 0.5, STAR) + rect(27.8, 6.0, 0.4, 0.4, GOLD) : '') +
    '</g>'
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 망토: 몸 뒤로 넓게 두르고 오른쪽 끝이 펄럭인다. 끝단은 나뭇잎처럼 들쭉날쭉
const bigCloak = (t: number) => {
  if (t < 5) return ''
  const c = cloakColor(t)
  return (
    rect(316, 40, 108, 66, c) +
    [318, 334, 350, 366, 382, 398, 414].map(x => rect(x, 106, 8, 6, c)).join('') +
    rect(424, 46, 16, 54, c, flutter(54, 38)) +
    rect(440, 54, 10, 38, c, flutter(38, 24)) +
    rect(316, 40, 6, 66, cloakDark(t)) +
    (elf(t) ? rect(316, 102, 108, 4, ELF_LIGHT) : '')
  )
}

// 화살통: 왼쪽 어깨 너머로 비스듬히 메고 깃이 머리 옆으로 삐죽 나온다. 80부터 은빛 테
const bigQuiver = (t: number) => {
  if (t < 4) return ''
  const rim = elf(t) ? ELF_LIGHT : LEATHER_DARK
  const band = elf(t) ? ELF : TAN
  const vane = t >= 9 ? STAR_GLOW : elf(t) ? GREEN_LIGHT : FEATHER
  // 화살 깃: 가운데 대가 지나가는 세로 깃 (x는 대의 왼쪽, y는 깃 꼭대기)
  const fletch = (x: number, y: number, c: string) => rect(x - 4, y, 11, 13, c) + rect(x, y - 3, 3, 24, WOOD_LIGHT)
  return (
    fletch(293, 17, vane) +
    fletch(304, 12, t >= 9 ? WHITE : FEATHER_LIGHT) +
    fletch(315, 18, vane) +
    rect(288, 34, 26, 16, LEATHER) +
    rect(296, 48, 26, 14, LEATHER) +
    rect(304, 60, 26, 12, LEATHER) +
    rect(285, 30, 32, 6, rim) +
    rect(290, 41, 22, 4, band) +
    rect(298, 54, 22, 4, band)
  )
}

const bigVest = (t: number) => {
  if (t < 4) return ''
  const e = elf(t)
  const c = e ? ELF : TAN
  const top = e ? ELF_LIGHT : TAN_LIGHT
  const strap = e ? EMERALD : LEATHER_DARK
  return (
    rect(330, 66, 80, 30, c) +
    rect(330, 66, 80, 3, top) +
    // 왼쪽 위에서 오른쪽 아래로 내려가는 화살통 끈
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => rect(330 + i * 10, 68 + i * 2.5, 10, 7, strap)).join('') +
    rect(330, 88, 80, 6, e ? EMERALD_DARK : LEATHER) +
    rect(364, 86, 12, 10, GOLD) +
    rect(367, 89, 6, 4, e ? EMERALD_DARK : LEATHER) +
    (e
      ? // 가슴의 잎 무늬와 은빛 테두리
        rect(388, 70, 8, 5, GREEN_LIGHT) + rect(395, 68, 5, 4, GREEN_LIGHT) + rect(340, 78, 8, 5, GREEN_LIGHT) + rect(347, 76, 5, 4, GREEN_LIGHT) + rect(330, 94, 80, 2, ELF_DARK)
      : '')
  )
}

const bigFeather = (x: number, y: number) =>
  rect(x, y + 20, 7, 12, FEATHER) +
  rect(x + 5, y + 10, 7, 12, FEATHER) +
  rect(x + 10, y, 7, 12, FEATHER) +
  rect(x + 15, y - 6, 5, 8, FEATHER_LIGHT) +
  rect(x + 2, y + 22, 2, 8, FEATHER_LIGHT)

const bigHead = (t: number) => {
  if (t >= 7) {
    const c = cloakColor(t)
    const d = cloakDark(t)
    return (
      rect(324, 20, 92, 18, c) +
      rect(334, 12, 72, 9, c) +
      rect(348, 6, 44, 7, c) +
      rect(314, 12, 14, 12, c) +
      rect(310, 20, 8, 8, c) +
      rect(324, 36, 18, 30, c) +
      rect(398, 36, 18, 30, c) +
      rect(340, 34, 60, 4, elf(t) ? ELF_LIGHT : d) +
      rect(324, 62, 18, 4, d) +
      rect(398, 62, 18, 4, d) +
      bigFeather(396, -2) +
      (t >= 9
        ? rect(342, 24, 56, 6, GOLD) +
          rect(344, 16, 6, 9, GOLD) +
          rect(364, 8, 12, 17, GOLD) +
          rect(390, 16, 6, 9, GOLD) +
          rect(366, 12, 8, 8, GEM_GREEN) +
          rect(352, 20, 4, 4, GOLD_LIGHT) +
          rect(384, 20, 4, 4, GOLD_LIGHT)
        : '')
    )
  }
  if (t >= 1) {
    // 위로 솟았다가 왼쪽으로 뾰족하게 처지는 초록 모자, 오른쪽 띠에 꽂은 붉은 깃털
    return (
      rect(324, 27, 92, 11, GREEN) +
      rect(324, 35, 92, 3, GREEN_DARK) +
      rect(334, 18, 72, 10, GREEN) +
      rect(336, 10, 54, 9, GREEN) +
      rect(334, 3, 30, 8, GREEN) +
      rect(318, 5, 18, 8, GREEN) +
      rect(311, 10, 9, 8, GREEN) +
      rect(342, 12, 26, 3, GREEN_LIGHT) +
      bigFeather(394, 2)
    )
  }
  return ''
}

// 활 팔찌: 든 팔·늘어뜨린 팔에 가죽 토시 (왼팔은 pointingArm과 같이 움직이도록 같은 움직임을 붙인다)
const bracerColors = (t: number) => (elf(t) ? [ELF, ELF_DARK] : [TAN, TAN_DARK])
const bigBracerLeft = (t: number) => {
  if (t < 3) return ''
  const [c, d] = bracerColors(t)
  return (
    '<g>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>' +
    rect(300, 63, 16, 16, c!) +
    rect(303, 66, 10, 2, d!) +
    rect(303, 70, 10, 2, d!) +
    rect(303, 74, 10, 2, d!) +
    '</g>'
  )
}
const bigBracerRight = (variant: BigVariant, t: number) => {
  if (t < 3) return ''
  const [c, d] = bracerColors(t)
  return variant === 'error'
    ? rect(414, 76, 12, 14, c!) + rect(416, 80, 8, 2, d!) + rect(416, 84, 8, 2, d!)
    : rect(414, 48, 14, 16, c!) + rect(417, 52, 8, 2, d!) + rect(417, 56, 8, 2, d!)
}

// 큰 장궁 한 자루: 줌통 (gx, gy)에서 위아래로 h씩 뻗고, 끝으로 갈수록 오른쪽으로 휜다(시위는 오른쪽)
const bigBow = (gx: number, gy: number, h: number, t: number) => {
  const star = t >= 9
  const wood = star ? STAR : WOOD
  const light = star ? GOLD_LIGHT : WOOD_LIGHT
  const grip = star ? GOLD : LEATHER_DARK
  const s = h / 58
  // 활대 마디: 줌통에서 dx만큼 오른쪽, 줌통으로부터 y0~y1 거리(위아래 대칭), 굵기 w
  const SEGS: [number, number, number, number][] = [
    [0, 12, 30, 9],
    [5, 30, 44, 8],
    [10, 44, 53, 7],
    [14, 53, 58, 6],
  ]
  const seg = ([dx, y0, y1, w]: [number, number, number, number], c: string, pad = 0) =>
    rect(gx + dx - pad, gy - y1 * s - pad, w + pad * 2, (y1 - y0) * s + pad * 2, c) +
    rect(gx + dx - pad, gy + y0 * s - pad, w + pad * 2, (y1 - y0) * s + pad * 2, c)
  // 별빛 활대의 테두리: 바깥쪽(시위 반대쪽, 왼쪽)에 짙은 금빛 줄을 긋고, 끝 쪽 변에서 다음 마디 밖으로 드러난 턱과
  // 활 끝도 막는다. 별빛은 밝은 배경에 묻히니 빛이 약해져도 활 모양이 늘 보이게
  const E = 3
  const edge = (i: number) => {
    const [dx, y0, y1, w] = SEGS[i]!
    // 턱 길이: 다음 마디의 바깥 끝까지. 활 끝 마디는 변 전체
    const ledge = (SEGS[i + 1]?.[0] ?? dx + w) - dx
    return (
      seg([dx, y0, y1, E], GOLD_DARK) +
      rect(gx + dx, gy - y1 * s, ledge, E, GOLD_DARK) +
      rect(gx + dx, gy + y1 * s - E, ledge, E, GOLD_DARK)
    )
  }
  const top = gy - h
  const bottom = gy + h
  return (
    // 별빛 활은 활대를 따라 은은한 빛이 감돈다
    (star ? `<g opacity="0.3">${glow()}` + SEGS.map(g => seg(g, STAR_GLOW, 4)).join('') + rect(gx - 5, gy - 16 * s, 20, 32 * s, STAR_GLOW) + '</g>' : '') +
    rect(gx + 16, top + 3, 2, h * 2 - 6, star ? STAR_STRING : BOWSTRING) +
    SEGS.map(g => seg(g, wood)).join('') +
    (star ? SEGS.map((_, i) => edge(i)).join('') : '') +
    rect(gx + (star ? E : 1), gy - 30 * s, 3, 18 * s, light) +
    rect(gx - 1, gy - 12 * s, 11, 24 * s, grip) +
    rect(gx + 14, top - 2, 5, 4, star ? GOLD : light) +
    rect(gx + 14, bottom - 2, 5, 4, star ? GOLD : light)
  )
}

// 오른팔과 장궁: 끝·대기는 활을 번쩍 들고, 오류는 축 늘어뜨린다
// 팔 → 팔찌 → 활 → 주먹 순서로 겹쳐, 주먹이 줌통을 감싸 쥔 것처럼 보이게 한다
const bigArm = (variant: BigVariant, t: number) => {
  if (variant === 'error') {
    return rightArm(variant) + bigBracerRight(variant, t) + (t >= 6 ? bigBow(418, 100, 34, t) + rect(413, 92, 14, 12, ORANGE) : '')
  }
  return rightArm(variant) + bigBracerRight(variant, t) + (t >= 6 ? bigBow(417, 38, 58, t) : '') + rect(413, 32, 16, 12, ORANGE)
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -22, 34, 7, 4, t) + sparkle(290, 30, 12, GOLD, '0.3s') + sparkle(452, 70, 12, GOLD, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCloak(t) + bigQuiver(t),
    boot: boot(t),
    body: bigVest(t),
    head: bigHead(t),
    arm: bigArm(variant, t),
    over: bigBracerLeft(t) + bigGlory(t),
  })

export const hunter: Job = {
  key: 'hunter',
  name: '사냥꾼',
  icon: '🏹',
  gear: [
    '',
    '깃털 모자',
    '가죽 장화',
    '활 팔찌',
    '가죽 조끼와 화살통',
    '초록 망토',
    '장궁',
    '사냥꾼 후드',
    '엘프 은빛 갑옷',
    '잎새 관·후광·별빛 활',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : 0),
  bigHeadroom: t => (t >= 9 ? 35 : t >= 6 ? 24 : t >= 1 ? 8 : 0),
}
