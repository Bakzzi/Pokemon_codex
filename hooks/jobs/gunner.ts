// 거너: 먼지바람 속의 총잡이. 붉은 반다나 → 전투화 → 전술 장갑 → 탄띠 조끼 → 긴 코트 → 리볼버
// → 카우보이 모자 → 황금 코트 → 왕관·후광·황금 쌍권총 → 무지개 후광
import { ATK } from '../monsters.ts'
import { GOLD, GOLD_DARK, GOLD_LIGHT, ORANGE, STEP, WHITE, bigClawd, flutter, glow, halo, handSwing, rect, rightArm, smallClawd, sparkle, swap } from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const COAT = '#3B4049'
const COAT_DARK = '#272B32'
const COAT_LIGHT = '#5D6571'
const COAT_GOLD = '#D9A53A'
const COAT_GOLD_DARK = '#A8771C'
const COAT_GOLD_LIGHT = '#F6D98A'
const KHAKI = '#C2B184'
const KHAKI_DARK = '#8E7F57'
const KHAKI_LIGHT = '#E0D3AA'
const CRIMSON = '#9B2335'
const CRIMSON_DARK = '#6E1726'
const BRASS = '#C8932C'
const BRASS_DARK = '#8A6116'
const BRASS_LIGHT = '#F1CE78'
const STRAP = '#5A3D24'
const BANDANA = '#CC2B36'
const BANDANA_DARK = '#8E1A24'
const BANDANA_LIGHT = '#EE6467'
const GUNMETAL = '#464D57'
const STEEL = '#A3ADB9'
const STEEL_LIGHT = '#DCE2E9'
const GRIP = '#7B4526'
const HAT = '#33373E'
const HAT_LIGHT = '#545A64'
const SMOKE = '#CBD5E1'
const TRACER = '#F59E2B'
const FLASH = '#FDBA4D'
const GEM_RED = '#E5484D'

const rich = (t: number) => t >= 8
const coat = (t: number) => (rich(t) ? [COAT_GOLD, COAT_GOLD_DARK, COAT_GOLD_LIGHT] : [COAT, COAT_DARK, COAT_LIGHT])

// 전투화(20~): 목 긴 짙은 회색 군화와 카키 끈. 목에는 밝은 회색 테두리(smallBootRims·bigBootRims)를 둘러
// 어두운 바탕(#1E1E1E)에서도 신발 모양이 떨어져 보인다. 장갑(30~): 손등에 카키 덧댐이 있는 총철색 전술 장갑
// (손가락 주름은 장갑보다 짙은 코트색)
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: COAT, stripe: KHAKI, sole: '#111216' } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: GUNMETAL, shine: KHAKI } : undefined)
const handColor = (t: number) => glove(t)?.color ?? ORANGE

// ── 작은 그림 ─────────────────────────────────────────────────────

// 오른손(앞)에 든 것: 달릴 때는 팔과 같이 흔들고(팔 y 6.5 기준), 쉴 때는 팔(y 6)에 맞춰 가만히 든다
const inRightHand = (pose: Pose, inner: string) =>
  pose === 'run' ? `<g>${handSwing}${inner}</g>` : `<g transform="translate(0 -0.5)">${inner}</g>`

// 왼손(뒤)도 같은 식으로: 달릴 때 왼팔은 y 5.5 → 6.5로 내려간다
const inLeftHand = (pose: Pose, inner: string) =>
  pose === 'run'
    ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 1" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>${inner}</g>`
    : `<g transform="translate(0 0.5)">${inner}</g>`

// 전투화(20~)의 목 테두리: 디딘 다리의 군화 윗면은 y 10.1, 든 다리는 9.1 (pixel.ts의 legs와 같은 박자로 바뀐다).
// 몸 위(body) 겹에서 조끼·코트 앞자락보다 먼저 그려, 그 밑으로 나온 군화 목만 보인다
const smallBootRims = (t: number, pose: Pose) => {
  if (t < 2) return ''
  return [11, 13, 16, 18]
    .map(x => {
      if (pose !== 'run') return rect(x - 0.4, 10.1, 1.8, 0.25, COAT_LIGHT)
      const [a, b] = x === 11 || x === 16 ? [10.1, 9.1] : [9.1, 10.1]
      return rect(x - 0.4, a, 1.8, 0.25, COAT_LIGHT, swap('y', a, b))
    })
    .join('')
}

// 코트 자락 한 장면: 몸 뒤로 퍼지는 자락과 맨 아래 줄의 짙은 밑단
// rows: [위 y, 높이, 왼쪽 끝 x] (오른쪽 끝은 몸 뒤 x 10.4)
const coatTail = (rows: [number, number, number][], c: string, hem: string) => {
  const [y, h, x] = rows[rows.length - 1]!
  return rows.map(([ry, rh, rx]) => rect(rx, ry, 10.4 - rx, rh, c)).join('') + rect(x, y + h - 0.3, 10.4 - x, 0.3, hem)
}

// 긴 코트(50~): 몸을 감싸고 무릎까지 내려오며, 달릴 때는 등 뒤로 자락이 날린다. 깃은 목 뒤로 세웠다
const smallCoat = (t: number, pose: Pose) => {
  if (t < 5) return ''
  const [c, d, l] = coat(t)
  const hem = rich(t) ? COAT_DARK : d!
  const flow = (rows: [number, number, number][]) => coatTail(rows, c!, hem)
  // 달릴 때: 바람에 뒤로 날린 자락 ↔ 조금 내려앉은 자락 (다리처럼 두 장면을 번갈아). 자락은 허리 높이에서 가장 넓게
  // 뒤로 뻗고 밑단은 위로 들려, 땅과 발 위로 틈이 보인다. 쉴 때: 살짝 퍼져 늘어진 자락
  const tails =
    pose === 'run'
      ? `<g>${swap('opacity', 1, 0)}` +
        flow([[5.6, 0.8, 8.4], [6.4, 0.8, 6.4], [7.2, 0.8, 5.6], [8.0, 0.8, 6.2], [8.8, 0.7, 7.6]]) +
        `</g><g opacity="0">${swap('opacity', 0, 1)}` +
        flow([[5.9, 0.8, 9.0], [6.7, 0.8, 7.0], [7.5, 0.8, 6.2], [8.3, 0.8, 6.8], [9.1, 0.5, 8.2]]) +
        '</g>'
      : flow([[5.6, 1.6, 9.6], [7.2, 1.6, 9.1], [8.8, 1.7, 8.5]])
  // 몸 뒤 코트의 밑단: 쉴 때는 무릎 아래(10.5)까지, 달릴 때는 바람에 들려 다리 위쪽(9.6)에 걸린다
  const bottom = pose === 'run' ? 9.6 : 10.5
  return (
    rect(10.2, 3.6, 9.4, bottom - 3.6, c!) +
    rect(10.2, bottom - 0.3, 9.4, 0.3, hem) +
    tails +
    // 목 뒤로 세운 깃 (바깥쪽 끝이 밝다)
    rect(9.9, 2.9, 1.4, 1.7, c!) +
    rect(9.9, 2.9, 0.35, 1.7, l!)
  )
}

// 열린 코트 앞자락(50~): 몸 양옆을 어깨부터 덮고, 가운데로 얼굴과 조끼가 보인다. 오른쪽은 젖힌 옷깃
const smallCoatFront = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = coat(t)
  return (
    rect(11, 3.6, 0.9, 5.6, c!) +
    rect(11.9, 5.2, 0.2, 4.0, d!) +
    rect(18.2, 3.6, 0.8, 5.6, c!) +
    rect(17.7, 3.6, 0.6, 1.3, c!) +
    rect(17.9, 4.9, 0.3, 4.3, d!) +
    rect(18.75, 3.6, 0.25, 5.6, l!)
  )
}

// 조끼(40~): 카키(80부터 진홍) 조끼, 가운데 여밈과 반다나 아래 주머니
const smallVest = (t: number) => {
  if (t < 4) return ''
  const [c, d, l] = rich(t) ? [CRIMSON, CRIMSON_DARK, '#C24A5A'] : [KHAKI, KHAKI_DARK, KHAKI_LIGHT]
  return (
    rect(11, 6.3, 8, 2.7, c) +
    rect(11, 6.3, 8, 0.3, l) +
    rect(16.5, 8.4, 1.3, 0.6, d) +
    rect(14.8, 6.7, 0.4, 2.3, d)
  )
}

// 붉은 반다나(10~): 눈 아래로 몸을 두른 목수건(조끼·탄띠 위에 맨다). 앞으로는 뾰족한 끝이 늘어지고,
// 뒤(왼쪽)에서 묶은 매듭의 짧은 두 끈이 바람에 펄럭인다. 80부터 금실 테두리
const smallBandana = (t: number) => {
  if (t < 1) return ''
  const edge = rich(t) ? GOLD : BANDANA_LIGHT
  return (
    rect(11, 7.6, 8, 0.8, BANDANA) +
    rect(11, 7.6, 8, 0.2, edge) +
    // 앞으로 늘어진 뾰족한 끝 (다리 사이로)
    rect(13.8, 8.4, 2.4, 0.4, BANDANA) +
    rect(14.3, 8.8, 1.4, 0.4, BANDANA) +
    rect(14.7, 9.2, 0.6, 0.35, BANDANA_DARK) +
    // 뒤 매듭과 펄럭이는 두 끈
    rect(10.2, 7.45, 1.0, 1.1, BANDANA_DARK) +
    rect(8.9, 7.55, 1.4, 0.5, BANDANA, swap('y', 7.55, 7.25)) +
    rect(9.2, 8.2, 1.1, 0.5, BANDANA, swap('y', 8.2, 8.45))
  )
}

// 탄띠(40~): 앞 어깨(오른쪽 위) → 뒤 허리(왼쪽 아래)로 코트 위에 비스듬히 걸치고, 칸마다 탄알 하나
const smallBandolier = (t: number) => {
  if (t < 4) return ''
  const bullet = rich(t) ? GOLD : BRASS
  return [0, 1, 2, 3, 4, 5, 6, 7]
    .map(i => {
      const x = 18 - i
      const y = 5.5 + i * 0.42
      return rect(x, y, 1, 0.75, STRAP) + rect(x + 0.3, y - 0.35, 0.4, 0.6, bullet) + rect(x + 0.3, y - 0.35, 0.4, 0.15, BRASS_LIGHT)
    })
    .join('')
}

// 머리: 카우보이 모자(70~, 가죽 띠에 탄알을 줄지어 꽂았다) → 모자를 두른 금관(90~)
const smallHead = (t: number) => {
  if (t >= 7) {
    const bullet = rich(t) ? GOLD : BRASS
    return (
      rect(9.2, 2.4, 11.6, 0.75, HAT) +
      rect(8.8, 1.8, 0.8, 0.9, HAT) +
      rect(20.4, 1.8, 0.8, 0.9, HAT) +
      rect(11.4, 0.4, 7.2, 2.1, HAT) +
      rect(11.8, -0.15, 2.8, 0.6, HAT) +
      rect(15.4, -0.15, 2.8, 0.6, HAT) +
      rect(9.2, 2.95, 11.6, 0.2, COAT_DARK) +
      // 꼭대기 두 봉우리·가운데 홈·말린 챙 윗면의 밝은 테두리 (어두운 바탕에서 모자 윤곽이 보이게)
      rect(11.8, -0.15, 2.8, 0.2, HAT_LIGHT) +
      rect(15.4, -0.15, 2.8, 0.2, HAT_LIGHT) +
      rect(11.4, 0.4, 0.4, 0.2, HAT_LIGHT) +
      rect(14.6, 0.4, 0.8, 0.2, HAT_LIGHT) +
      rect(18.2, 0.4, 0.4, 0.2, HAT_LIGHT) +
      rect(8.8, 1.8, 0.8, 0.2, HAT_LIGHT) +
      rect(20.4, 1.8, 0.8, 0.2, HAT_LIGHT) +
      rect(9.6, 2.4, 1.8, 0.2, HAT_LIGHT) +
      rect(18.6, 2.4, 1.8, 0.2, HAT_LIGHT) +
      // 모자 띠: 가죽 띠에 꽂은 탄알 일곱 개 (끝이 밝다)
      rect(11.4, 1.55, 7.2, 0.7, STRAP) +
      [0, 1, 2, 3, 4, 5, 6].map(i => rect(11.75 + i, 1.5, 0.45, 0.75, bullet) + rect(11.75 + i, 1.5, 0.45, 0.2, BRASS_LIGHT)).join('') +
      (t >= 9
        ? // 모자 둘레에 씌운 금관: 띠 위로 솟은 세 뾰족 끝과 붉은 보석
          rect(11.4, 1.5, 7.2, 0.25, GOLD_LIGHT) +
          rect(11.6, 0.6, 0.7, 1.0, GOLD) +
          rect(14.65, 0.2, 0.7, 1.4, GOLD) +
          rect(17.7, 0.6, 0.7, 1.0, GOLD) +
          rect(14.75, 0.45, 0.5, 0.5, GEM_RED)
        : '')
    )
  }
  return ''
}

// 리볼버 한 자루 (오른쪽을 겨눈다). 손잡이는 주먹 안, 실린더·총열이 주먹 위로. gold면 황금 총
const revolverRight = (x: number, y: number, fist: string, gold: boolean) => {
  const body = gold ? GOLD : GUNMETAL
  const barrel = gold ? GOLD_LIGHT : STEEL
  const shine = gold ? WHITE : STEEL_LIGHT
  return (
    rect(x - 0.1, y + 0.9, 0.85, 1.6, gold ? '#F4F1EA' : GRIP) +
    rect(x + 0.4, y, 1.7, 1.0, body) +
    rect(x + 0.75, y + 0.1, 1.0, 0.8, barrel) +
    rect(x + 1.05, y + 0.1, 0.2, 0.8, body) +
    rect(x + 2.1, y + 0.1, 1.4, 0.55, barrel) +
    rect(x + 2.1, y + 0.1, 1.4, 0.15, shine) +
    rect(x + 3.15, y - 0.12, 0.25, 0.25, body) +
    rect(x + 0.1, y - 0.25, 0.45, 0.4, body) +
    rect(x + 1.1, y + 1.0, 0.6, 0.25, body) +
    rect(x + 1.5, y + 1.0, 0.2, 0.55, body) +
    rect(x - 0.15, y + 0.85, 1.25, 1.0, fist)
  )
}

// 하늘을 겨눈 황금 리볼버 (뒷손의 둘째 총, 90~). (x, y)는 실린더 왼쪽 위
const revolverUp = (x: number, y: number, fist: string) =>
  rect(x + 0.1, y + 1.2, 0.85, 1.4, '#F4F1EA') +
  rect(x - 0.15, y - 0.6, 1.3, 1.8, GOLD) +
  rect(x + 0.1, y - 0.35, 0.8, 1.2, GOLD_LIGHT) +
  rect(x + 0.4, y - 0.35, 0.2, 1.2, GOLD_DARK) +
  rect(x + 0.2, y - 2.4, 0.6, 1.8, GOLD_LIGHT) +
  rect(x + 0.2, y - 2.4, 0.15, 1.8, WHITE) +
  rect(x + 0.35, y - 2.65, 0.3, 0.3, GOLD) +
  rect(x + 1.15, y + 0.75, 0.4, 0.4, GOLD_DARK) +
  rect(x - 0.45, y + 0.85, 0.35, 0.6, GOLD_DARK) +
  rect(x - 0.15, y + 1.2, 1.25, 1.0, fist)

// 빛나는 기운: 총 모양을 따라 은은하게 숨 쉰다
const aura = (parts: [number, number, number, number][]) =>
  `<g opacity="0.3">${glow()}` + parts.map(([x, y, w, h]) => rect(x, y, w, h, GOLD_LIGHT)).join('') + '</g>'

const smallGuns = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const fist = handColor(t)
  const gold = t >= 9
  return (
    inRightHand(pose, (gold ? aura([[20.1, 5.2, 3.4, 1.4], [19.8, 5.2, 2.6, 2.0]]) : '') + revolverRight(20.0, 5.75, fist, gold)) +
    (gold ? inLeftHand(pose, aura([[8.8, 1.5, 1.6, 4.0]]) + revolverUp(9.2, 4.3, fist)) : '')
  )
}

// 레벨 90~: 모자 위 후광과 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.3, 3.4, 0.6, 0.4, t) +
      [[6.2, 3.4, '0s'], [22.7, 2.6, '0.8s']]
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
    back: smallCoat(t, pose),
    boot: boot(t),
    body: smallBootRims(t, pose) + smallVest(t) + smallCoatFront(t) + smallBandolier(t) + smallBandana(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallGuns(t, pose),
    over: smallGlory(t),
  })

// 총구에서 불꽃이 번쩍(0.44)하고, 총알이 빛줄기처럼 날아가 0.6에 몬스터를 맞힌 뒤 불똥이 튄다.
// 리볼버(60~) 전에는 손끝에서 쏜다. 90부터 황금 쌍권총이라 총알이 두 발. 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const gold = t >= 9
  // 총구 위치(전투 좌표): 리볼버 끝, 그 전에는 손끝
  const [mx, my] = t >= 6 ? [18.5, 8.05] : [16.3, 8.95]
  const bulletColor = gold ? GOLD_LIGHT : BRASS_LIGHT
  const flash =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.44;0.5" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    rect(mx, my - 0.45, 1.3, 0.9, FLASH) +
    rect(mx + 1.2, my - 0.25, 0.8, 0.5, FLASH) +
    rect(mx + 0.4, my - 0.95, 0.5, 1.9, FLASH) +
    rect(mx + 0.1, my - 0.25, 1.0, 0.5, WHITE) +
    '</g>'
  // 연기 한 줌이 총구에서 피어오른다 (0.5 → 0.8)
  const smoke =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;0.8;0;0" keyTimes="0;0.5;0.54;0.8;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;-0.4 -1.6;-0.4 -1.6" keyTimes="0;0.5;0.8;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(mx + 0.2, my - 0.9, 0.7, 0.7, SMOKE) +
    rect(mx + 0.7, my - 1.5, 0.5, 0.5, SMOKE) +
    '</g>'
  // 빛줄기 총알 (0.47 → 0.6): 밝은 머리와 길게 끌리는 꼬리
  const bullet = (dy: number, delay: number) =>
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${0.47 + delay};0.6" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${25.4 - mx - 1.2} 0;${25.4 - mx - 1.2} 0" keyTimes="0;${0.47 + delay};0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    '<g opacity="0.5">' + rect(mx - 2.6, my + dy - 0.12, 2.4, 0.24, TRACER) + '</g>' +
    rect(mx - 0.8, my + dy - 0.2, 1.6, 0.4, TRACER) +
    rect(mx - 0.2, my + dy - 0.15, 1.0, 0.3, bulletColor) +
    rect(mx + 0.6, my + dy - 0.25, 0.7, 0.5, WHITE) +
    '</g>'
  // 맞은 자리의 불똥 (0.6 → 0.72)
  const spark =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(24.6, my - 0.4, 2.0, 0.8, '#FB923C') +
    rect(25.2, my - 1.1, 0.8, 2.2, '#FB923C') +
    rect(25.0, my - 0.2, 1.2, 0.4, WHITE) +
    rect(25.4, my - 0.6, 0.4, 1.2, WHITE) +
    rect(24.0, my - 1.4, 0.45, 0.45, bulletColor) +
    rect(27.0, my - 1.2, 0.45, 0.45, bulletColor) +
    rect(24.2, my + 1.1, 0.45, 0.45, bulletColor) +
    rect(26.9, my + 1.2, 0.45, 0.45, bulletColor) +
    (gold ? rect(25.4, my + 1.6, 0.6, 0.6, GOLD) + rect(26.3, my - 2.0, 0.5, 0.5, GOLD_LIGHT) : '') +
    '</g>'
  return flash + smoke + bullet(gold ? -0.35 : 0, 0) + (gold ? bullet(0.45, 0.03) : '') + spark
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 긴 코트: 몸 뒤로 넓게 두르고 무릎까지 내려오며, 오른쪽 자락이 펄럭인다
const bigCoat = (t: number) => {
  if (t < 5) return ''
  const [c, d] = coat(t)
  return (
    rect(318, 40, 104, 74, c!) +
    rect(422, 58, 16, 54, c!, flutter(54, 40)) +
    rect(438, 68, 10, 40, c!, flutter(40, 28)) +
    rect(318, 110, 104, 4, d!) +
    rect(318, 40, 6, 74, d!) +
    (rich(t) ? rect(318, 106, 104, 4, COAT_DARK) : '')
  )
}

// 전투화의 목 테두리 3px (군화 윗면 y 102). 조끼·깃보다 먼저 그려 그 밑으로 나온 곳만 보인다
const bigBootRims = (t: number) => (t < 2 ? '' : [330, 350, 380, 400].map(x => rect(x - 4, 102, 18, 3, COAT_LIGHT)).join(''))

// 조끼(카키, 80부터 진홍)와 반다나 아래 주머니
const bigVest = (t: number) => {
  if (t < 4) return ''
  const [c, d, l] = rich(t) ? [CRIMSON, CRIMSON_DARK, '#C24A5A'] : [KHAKI, KHAKI_DARK, KHAKI_LIGHT]
  return rect(330, 64, 80, 32, c) + rect(330, 64, 80, 3, l) + rect(384, 88, 14, 8, d) + rect(384, 88, 14, 2, l) + rect(368, 68, 4, 28, d)
}

// 붉은 반다나: 눈 아래로 몸을 두른 목수건과 흰 점무늬, 앞으로 늘어진 뾰족한 끝, 뒤(왼쪽) 매듭과 펄럭이는 두 끈.
// 80부터 금실 테두리
const bigBandana = (t: number) => {
  if (t < 1) return ''
  const edge = rich(t) ? GOLD : BANDANA_LIGHT
  const flap = (y: number, dy: number) => `<animate attributeName="y" values="${y};${y + dy};${y}" dur="0.8s" repeatCount="indefinite"/>`
  return (
    rect(330, 78, 80, 10, BANDANA) +
    rect(330, 78, 80, 2, edge) +
    rect(330, 86, 80, 2, BANDANA_DARK) +
    // 앞으로 늘어진 뾰족한 끝 (가운데 두 다리 사이로)
    rect(354, 88, 32, 4, BANDANA) +
    rect(358, 92, 24, 4, BANDANA) +
    rect(362, 96, 16, 4, BANDANA) +
    rect(366, 100, 8, 3, BANDANA) +
    rect(368, 103, 4, 2, BANDANA_DARK) +
    // 흰 점무늬
    [[336, 82], [350, 81], [392, 82], [404, 81], [368, 90]].map(([x, y]) => rect(x!, y!, 3, 3, '#FBE3DF')).join('') +
    // 뒤 매듭과 펄럭이는 두 끈 (가리키는 팔 아래로 틈을 두고)
    rect(300, 81, 24, 6, BANDANA, flap(81, -3)) +
    rect(304, 90, 20, 6, BANDANA_DARK, flap(90, 3)) +
    rect(320, 76, 14, 15, BANDANA) +
    rect(320, 87, 14, 4, BANDANA_DARK)
  )
}

// 앞 어깨에서 뒤 허리로 코트 위에 걸친 탄띠
const bigBandolier = (t: number) => {
  if (t < 4) return ''
  const bullet = rich(t) ? GOLD : BRASS
  return [0, 1, 2, 3, 4, 5, 6, 7]
    .map(i => {
      const x = 400 - i * 10
      const y = 64 + i * 3.4
      return rect(x, y, 10, 10, STRAP) + rect(x + 3, y + 1, 4, 8, bullet) + rect(x + 3, y + 1, 4, 2, BRASS_LIGHT)
    })
    .join('')
}

// 코트 깃: 목 양옆으로 세워 끝이 바깥으로 젖힌 깃과 몸 양옆으로 내려오는 앞자락
const bigLapels = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = coat(t)
  return (
    rect(320, 38, 12, 22, c!) +
    rect(314, 32, 10, 10, c!) +
    rect(314, 32, 10, 3, l!) +
    rect(408, 38, 12, 22, c!) +
    rect(416, 32, 10, 10, c!) +
    rect(416, 32, 10, 3, l!) +
    rect(330, 58, 10, 38, c!) +
    rect(400, 58, 10, 38, c!) +
    rect(338, 58, 2, 38, d!) +
    rect(400, 58, 2, 38, d!)
  )
}

const bigHead = (t: number) => {
  if (t >= 7) {
    const bullet = rich(t) ? GOLD : BRASS
    return (
      // 챙 넓은 카우보이 모자: 양끝이 위로 말린 챙, 가운데가 움푹한 꼭대기, 탄알을 줄지어 꽂은 가죽 띠
      rect(312, 26, 116, 10, HAT) +
      rect(304, 18, 10, 14, HAT) +
      rect(426, 18, 10, 14, HAT) +
      rect(336, 0, 68, 28, HAT) +
      rect(338, -6, 26, 7, HAT) +
      rect(376, -6, 26, 7, HAT) +
      rect(312, 33, 116, 3, COAT_DARK) +
      // 꼭대기 두 봉우리·가운데 홈·말린 챙 윗면의 밝은 테두리 2px (어두운 바탕에서 모자 윤곽이 보이게)
      rect(338, -6, 26, 2, HAT_LIGHT) +
      rect(376, -6, 26, 2, HAT_LIGHT) +
      rect(336, 0, 2, 2, HAT_LIGHT) +
      rect(364, 0, 12, 2, HAT_LIGHT) +
      rect(402, 0, 2, 2, HAT_LIGHT) +
      rect(304, 18, 10, 2, HAT_LIGHT) +
      rect(426, 18, 10, 2, HAT_LIGHT) +
      rect(314, 26, 22, 2, HAT_LIGHT) +
      rect(404, 26, 22, 2, HAT_LIGHT) +
      rect(336, 16, 68, 9, STRAP) +
      [0, 1, 2, 3, 4, 5, 6].map(i => rect(341 + i * 9, 15, 5, 11, bullet) + rect(341 + i * 9, 15, 5, 3, BRASS_LIGHT) + rect(341 + i * 9, 23, 5, 2, BRASS_DARK)).join('') +
      (t >= 9
        ? // 모자 둘레의 금관: 띠 위로 솟은 뾰족 끝과 보석
          rect(336, 14, 68, 3, GOLD_LIGHT) +
          rect(338, -2, 8, 16, GOLD) +
          rect(365, -10, 10, 24, GOLD) +
          rect(394, -2, 8, 16, GOLD) +
          rect(367, -6, 6, 6, GEM_RED) +
          rect(339, 0, 3, 6, GOLD_LIGHT)
        : '')
    )
  }
  return ''
}

// 큰 리볼버: 위를 겨눈다. (x, y)는 총 몸통(실린더)의 왼쪽 위, gold면 황금 총
const bigRevolverUp = (x: number, y: number, gold: boolean) => {
  const body = gold ? GOLD : GUNMETAL
  const barrel = gold ? GOLD_LIGHT : STEEL
  const shine = gold ? WHITE : STEEL_LIGHT
  return (
    rect(x + 3, y + 18, 12, 22, gold ? '#F4F1EA' : GRIP) +
    rect(x - 1, y - 2, 20, 22, body) +
    rect(x + 2, y + 1, 14, 15, barrel) +
    rect(x + 6, y + 1, 2, 15, body) +
    rect(x + 11, y + 1, 2, 15, body) +
    rect(x + 3, y - 26, 10, 24, barrel) +
    rect(x + 4, y - 26, 2, 24, shine) +
    rect(x + 11, y - 16, 2, 14, body) +
    rect(x + 6, y - 30, 4, 4, body) +
    rect(x + 19, y + 13, 6, 5, body) +
    rect(x - 7, y + 15, 6, 3, body) +
    rect(x - 7, y + 15, 3, 9, body)
  )
}

// 큰 리볼버: 아래로 늘어뜨린다 (오류)
const bigRevolverDown = (x: number, y: number, gold: boolean) => {
  const body = gold ? GOLD : GUNMETAL
  const barrel = gold ? GOLD_LIGHT : STEEL
  const shine = gold ? WHITE : STEEL_LIGHT
  return (
    rect(x, y, 16, 18, body) +
    rect(x + 3, y + 3, 10, 12, barrel) +
    rect(x + 6, y + 3, 2, 12, body) +
    rect(x + 4, y + 18, 8, 16, barrel) +
    rect(x + 5, y + 18, 2, 16, shine) +
    rect(x + 6, y + 34, 4, 3, body) +
    rect(x - 6, y - 2, 6, 3, body)
  )
}

// 오른팔과 리볼버: 끝·대기는 총을 하늘로 번쩍 들고, 오류는 축 늘어뜨린다 (손이 손잡이를 덮게 총을 먼저 그린다).
// 총을 쥔 장갑 주먹에는 총몸과 맞닿는 곳의 짙은 이음선과 손가락 주름 두 줄을 넣어, 같은 총철색 총몸과 섞이지 않게 한다
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return rightArm(variant, g)
  const gold = t >= 9
  if (variant === 'error') {
    return (
      rightArm(variant, g) +
      (gold ? aura([[408, 96, 24, 26], [412, 114, 16, 24]]) : '') +
      bigRevolverDown(412, 100, gold) +
      (g
        ? rect(411, 88, 18, 16, g.color) +
          (g.shine ? rect(413, 90, 5, 4, g.shine) : '') +
          rect(412, 102, 16, 2, COAT_DARK) +
          rect(419, 92, 9, 2, COAT_DARK) +
          rect(419, 96, 9, 2, COAT_DARK)
        : rect(415, 90, 12, 10, ORANGE))
    )
  }
  const hand = g
    ? rect(409, 27, 24, 20, g.color) +
      (g.shine ? rect(412, 31, 7, 5, g.shine) : '') +
      rect(412, 27, 20, 2, COAT_DARK) +
      rect(420, 36, 11, 2, COAT_DARK) +
      rect(420, 41, 11, 2, COAT_DARK)
    : rect(413, 32, 16, 12, ORANGE)
  return rightArm(variant, g) + (gold ? aura([[413, -24, 16, 38], [408, 4, 26, 30]]) : '') + bigRevolverUp(413, 10, gold) + hand
}

// 황금 쌍권총의 둘째 자루: 왼손이 말풍선을 가리키는 채로 총을 겨눈다 (pointingArm과 같은 움직임)
const bigSecondGun = (t: number) => {
  if (t < 9) return ''
  return (
    '<g>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>' +
    aura([[262, 50, 28, 15], [283, 43, 26, 23]]) +
    // 총열은 집게손가락 바로 위로 말풍선을 겨누고, 실린더·공이치기는 주먹 위에 얹힌다
    rect(266, 55, 22, 7, GOLD_LIGHT) +
    rect(266, 55, 22, 2, WHITE) +
    rect(272, 61, 14, 2, GOLD_DARK) +
    rect(263, 55, 3, 7, GOLD_DARK) +
    rect(267, 51, 4, 4, GOLD) +
    rect(286, 49, 18, 15, GOLD) +
    rect(289, 52, 12, 9, GOLD_LIGHT) +
    rect(293, 52, 2, 9, GOLD_DARK) +
    rect(302, 45, 6, 6, GOLD_DARK) +
    '</g>'
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -20, 34, 7, 4, t) + sparkle(300, 20, 12, GOLD, '0.3s') + sparkle(452, 76, 12, GOLD, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCoat(t),
    boot: boot(t),
    body: bigBootRims(t) + bigVest(t) + bigLapels(t) + bigBandolier(t) + bigBandana(t),
    head: bigHead(t),
    glove: glove(t),
    // 총철색 장갑의 손가락 주름은 붉은색 대신 장갑보다 짙은 코트색
    crease: COAT_DARK,
    arm: bigArm(variant, t),
    over: bigSecondGun(t) + bigGlory(t),
  })

export const gunner: Job = {
  key: 'gunner',
  name: '거너',
  icon: '🔫',
  gear: [
    '',
    '붉은 반다나',
    '전투화',
    '전술 장갑',
    '탄띠 조끼',
    '긴 코트',
    '리볼버',
    '카우보이 모자',
    '황금 코트',
    '왕관·후광·황금 쌍권총',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : 0),
  bigHeadroom: t => (t >= 9 ? 33 : t >= 6 ? 22 : 0),
}
