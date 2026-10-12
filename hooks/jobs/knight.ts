// 기사: 은빛 판금과 푸른 문장의 기사. 깃털 철모 → 철 장화 → 철 건틀릿 → 파란 문장 판금 흉갑 → 파란 망토
// → 기사검과 방패 → 바이저 투구 → 백금 판금과 금빛 망토 → 왕관 투구·후광·성검 → 무지개 후광
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

const STEEL = '#C9D2DC'
const STEEL_DARK = '#8D99A9'
const STEEL_SHADE = '#5F6B7B'
const STEEL_LIGHT = '#F1F5F9'
const PLAT = '#F4EEDF'
const PLAT_DARK = '#D2BC82'
const PLAT_SHADE = '#9A7A34'
const ROYAL = '#2F56C9'
const ROYAL_DARK = '#1D3A8F'
const ROYAL_LIGHT = '#7FA2F5'
const HOLY = '#FFF8D6'
const HOLY_GLOW = '#FFE27A'
const SKY = '#A5DBFF'
const RUBY = '#E5484D'

// 판금 색 (바탕, 그늘, 짙은 그늘, 빛). 80부터 백금
type Plate = { c: string; d: string; s: string; l: string }
const plate = (t: number): Plate =>
  t >= 8 ? { c: PLAT, d: PLAT_DARK, s: PLAT_SHADE, l: WHITE } : { c: STEEL, d: STEEL_DARK, s: STEEL_SHADE, l: STEEL_LIGHT }

// 칸 목록 [x, y, 폭, 높이]을 한 색으로 칠한다 (테두리용)
const rects = (list: number[][], fill: string) => list.map(([x, y, w, h]) => rect(x!, y!, w!, h!, fill)).join('')
// 망토 색 (바탕, 주름, 윗단). 80부터 금빛
const cape = (t: number) => (t >= 8 ? { c: GOLD, d: GOLD_DARK, l: GOLD_LIGHT } : { c: ROYAL, d: ROYAL_DARK, l: ROYAL_LIGHT })

// 철 장화(20~): 은빛 판금 장화. 철 건틀릿(30~): 은빛 장갑. 80부터 백금에 금줄
const boot = (t: number): Boot | undefined =>
  t >= 2 ? { color: plate(t).c, stripe: t >= 8 ? GOLD : plate(t).l, sole: plate(t).s } : undefined
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: plate(t).c, shine: plate(t).l } : undefined)
// 작은 그림의 장갑은 1.5칸뿐이라 테를 두를 자리가 없다: 백금(80~)은 그늘색 바탕에 백금 빛을 얹어 밝은 바탕에서도 보이게 한다
const smallGlove = (t: number): Glove | undefined => (t >= 8 ? { color: PLAT_DARK, shine: PLAT } : glove(t))

// ── 작은 그림 ─────────────────────────────────────────────────────

// 왼팔에 든 것(방패)이 왼팔과 같이 흔들리게 하는 움직임. 왼팔은 오른팔과 엇갈려 내려갔다 올라온다
const offSwing = `<animateTransform attributeName="transform" type="translate" values="0 0;0 1" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`

// 손에 든 것: 달릴 때는 팔과 같이 흔들고, 쉴 때는 가만히 든 손 높이에 맞춘다
const inHand = (pose: Pose, swing: string, stand: number, inner: string) =>
  pose === 'run' ? `<g>${swing}${inner}</g>` : `<g transform="translate(0 ${stand})">${inner}</g>`

// 망토(50~, 80부터 금빛): 어깨의 금 걸쇠에서 뒤로 길게 펄럭인다
const smallCape = (t: number) => {
  if (t < 5) return ''
  const k = cape(t)
  return (
    rect(10, 3.4, 10, 6.9, k.c) +
    rect(7.3, 3.9, 3, 5.8, k.c, swap('height', 5.8, 4.8)) +
    rect(5.5, 4.5, 2, 4, k.c, swap('height', 4, 2.8)) +
    rect(8.4, 4.4, 0.4, 4.6, k.d, swap('height', 4.6, 3.6)) +
    rect(7.3, 3.9, 3, 0.35, k.l) +
    rect(5.5, 4.5, 2, 0.3, k.l) +
    rect(9.7, 3.3, 1.4, 1, GOLD)
  )
}

// 흉갑(40~): 은빛 판금 위에 금 십자를 수놓은 파란 문장 천, 두 겹의 어깨 판금. 80부터 백금에 금테
// 백금은 밝은 바탕과 거의 같은 색이라, 80부터 어깨 판금 위·양옆에 짙은 금빛 테(0.25칸)를 둘러 모양을 잡는다
const smallPlate = (t: number) => {
  if (t < 4) return ''
  const p = plate(t)
  const pauldron = (x: number) =>
    t >= 8
      ? rect(x, 4.6, 2.8, 1.1, p.c) +
        rect(x + 0.25, 4.85, 2.3, 0.25, p.l) +
        rect(x + 0.2, 5.7, 2.4, 0.6, p.d) +
        rect(x, 5.5, 2.8, 0.2, GOLD) +
        rects([[x, 4.6, 2.8, 0.25], [x, 4.6, 0.25, 0.9], [x + 2.55, 4.6, 0.25, 0.9]], p.s)
      : rect(x, 4.6, 2.8, 1.1, p.c) + rect(x, 4.6, 2.8, 0.3, p.l) + rect(x + 0.2, 5.7, 2.4, 0.6, p.d)
  return (
    rect(11, 6.6, 8, 2.4, p.c) +
    rect(11, 6.6, 8, 0.3, p.l) +
    rect(11, 8.6, 8, 0.4, t >= 8 ? GOLD : p.s) +
    rect(13.3, 6.6, 3.4, 2.7, ROYAL) +
    rect(13.3, 6.6, 3.4, 0.3, ROYAL_LIGHT) +
    rect(14.75, 6.85, 0.5, 2.05, GOLD) +
    rect(14.1, 7.35, 1.8, 0.45, GOLD) +
    pauldron(9.5) +
    pauldron(17.7)
  )
}

// 깃털 장식: 투구 꼭대기의 금 꽂이에서 솟아 뒤로(왼쪽) 둥글게 넘어가 흘러내린다. 끝이 팔랑인다
// (dx, dy): 투구가 바뀔 때 꽂이 자리. 왕관(90~)은 가운데를 차지하므로 깃털이 왕관 뒤 왼쪽으로 비켜난다
const smallPlume = (dx: number, dy: number) =>
  rect(14 + dx, 0 + dy, 1.6, 1.3, ROYAL) +
  rect(12.2 + dx, -0.4 + dy, 2.5, 1, ROYAL) +
  rect(10.8 + dx, 0 + dy, 1.8, 1, ROYAL) +
  rect(9.8 + dx, 0.7 + dy, 1.4, 1.2, ROYAL_DARK, swap('y', 0.7 + dy, 1 + dy)) +
  rect(12.2 + dx, -0.4 + dy, 3.2, 0.3, ROYAL_LIGHT) +
  rect(10.8 + dx, 0 + dy, 1.6, 0.25, ROYAL_LIGHT) +
  rect(14.3 + dx, 1.1 + dy, 1.1, 0.45, GOLD)

// 머리: 깃털 철모(10~) → 바이저 투구(70~, 볼가리개가 얼굴 옆을 감싸고 바이저는 들어 올려 눈이 보인다)
// → 백금 투구에 금 바이저(80~) → 왕관 투구(90~)
const smallHead = (t: number) => {
  if (t < 1) return ''
  const p = plate(t)
  if (t < 7) {
    return (
      smallPlume(0, 0) +
      rect(11, 2, 8, 1.5, p.c) +
      rect(11.8, 1.4, 6.4, 0.7, p.c) +
      rect(12.4, 1.6, 1.8, 0.35, p.l) +
      rect(18, 2, 1, 1.3, p.d) +
      rect(10.6, 3.2, 8.8, 0.55, p.d)
    )
  }
  const visor = t >= 8 ? GOLD : p.d
  const slit = t >= 8 ? GOLD_DARK : p.s
  const plat = t >= 8
  return (
    (t >= 9 ? smallPlume(-1.8, 0.2) : smallPlume(0, -0.6)) +
    rect(12.2, 0.7, 5.6, 0.5, p.c) +
    rect(11.4, 1.1, 7.2, 0.6, p.c) +
    rect(10.8, 1.6, 8.4, 2, p.c) +
    rect(10.8, 3.4, 1.5, 2.7, p.c) +
    rect(17.7, 3.4, 1.5, 2.7, p.c) +
    rect(18.7, 1.6, 0.5, 4.5, p.d) +
    (plat
      ? // 백금 투구(80~)는 밝은 바탕에 묻히지 않게 둥근 윗면과 양옆을 따라 짙은 금빛 테(0.25칸)를 두르고, 빛은 그 안쪽에 둔다
        rects(
          [
            [12.2, 0.7, 5.6, 0.25], // 꼭대기
            [12.2, 0.7, 0.25, 0.65], // 꼭대기 왼쪽
            [17.55, 0.7, 0.25, 0.65], // 꼭대기 오른쪽
            [11.4, 1.1, 1.05, 0.25], // 둘째 단 위 (왼쪽)
            [17.55, 1.1, 1.05, 0.25], // 둘째 단 위 (오른쪽)
            [11.4, 1.1, 0.25, 0.75], // 둘째 단 왼쪽
            [18.35, 1.1, 0.25, 0.75], // 둘째 단 오른쪽
            [10.8, 1.6, 0.85, 0.25], // 셋째 단 위 (왼쪽)
            [18.35, 1.6, 0.85, 0.25], // 셋째 단 위 (오른쪽)
            [10.8, 1.6, 0.25, 4.2], // 왼쪽 (볼가리개 금테까지)
            [18.95, 1.6, 0.25, 4.2], // 오른쪽
          ],
          p.s,
        ) +
        rect(11.05, 1.85, 0.3, 3.9, p.l) +
        rect(12.45, 0.95, 1.6, 0.3, p.l)
      : rect(10.8, 1.8, 0.35, 4.1, p.l) + rect(12, 1.0, 1.8, 0.3, p.l)) +
    rect(11.9, 2.6, 6.2, 1, visor) +
    rect(14.4, 3.5, 1.2, 0.4, visor) +
    [12.5, 13.8, 15.1, 16.4].map(x => rect(x, 2.95, 0.8, 0.25, slit)).join('') +
    (t >= 8 ? rect(10.8, 5.8, 1.5, 0.3, GOLD) + rect(17.7, 5.8, 1.5, 0.3, GOLD) : '') +
    (t >= 9
      ? rect(11.8, 0.4, 6.4, 0.7, GOLD) +
        rect(11.8, -0.1, 0.8, 0.6, GOLD) +
        rect(14.6, -0.3, 0.8, 0.8, GOLD) +
        rect(17.4, -0.1, 0.8, 0.6, GOLD) +
        rect(11.8, 0.4, 6.4, 0.2, GOLD_LIGHT) +
        rect(14.7, 0.55, 0.6, 0.45, RUBY) +
        rect(12.7, 0.6, 0.5, 0.35, ROYAL_LIGHT) +
        rect(16.8, 0.6, 0.5, 0.35, ROYAL_LIGHT)
      : '')
  )
}

// 연 모양 방패(60~): 왼팔에 끼우고 팔과 같이 흔든다. 파란 바탕에 금 십자
const smallShield = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const p = plate(t)
  const rim = t >= 8 ? GOLD : p.c
  const s =
    rect(7.4, 4.4, 3.6, 3, rim) +
    rect(7.7, 7.4, 3, 0.8, rim) +
    rect(8.1, 8.2, 2.2, 0.7, rim) +
    rect(8.6, 8.9, 1.2, 0.6, rim) +
    rect(7.75, 4.75, 2.9, 2.65, ROYAL) +
    rect(8.05, 7.4, 2.3, 0.7, ROYAL) +
    rect(8.45, 8.1, 1.5, 0.7, ROYAL) +
    rect(8.9, 8.8, 0.6, 0.4, ROYAL) +
    rect(7.75, 4.75, 2.9, 0.3, ROYAL_LIGHT) +
    rect(7.4, 4.4, 3.6, 0.25, t >= 8 ? GOLD_LIGHT : p.l) +
    rect(9, 5, 0.45, 3.6, GOLD) +
    rect(8, 5.9, 2.45, 0.45, GOLD)
  return inHand(pose, offSwing, 0.5, s)
}

// 기사검(60~): 오른손에 곧게 세운 긴 검과 금 십자 날밑. 90부터 성검이 빛난다
// 성검의 흰 날은 밝은 바탕에 묻히므로 양쪽 날과 칼끝을 짙은 금빛으로 두른다
const smallSword = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const holy = t >= 9
  const blade = holy ? HOLY : STEEL_LIGHT
  const s =
    (holy ? rect(19.75, -0.5, 1.8, 6.6, HOLY_GLOW, glow()) : '') +
    rect(20.25, 0.6, 0.8, 5.3, blade) +
    (holy
      ? rect(20.25, 0.6, 0.2, 5.3, GOLD_DARK) +
        rect(20.85, 0.6, 0.2, 5.3, GOLD_DARK) +
        rect(20.45, 0.1, 0.4, 0.5, GOLD_DARK) +
        rect(20.55, 0.35, 0.2, 0.3, blade)
      : rect(20.25, 0.6, 0.25, 5.3, WHITE) + rect(20.6, 1.2, 0.2, 4.2, STEEL_DARK) + rect(20.45, 0.1, 0.4, 0.5, blade)) +
    rect(19.3, 5.8, 2.7, 0.45, GOLD) +
    rect(19.3, 5.5, 0.45, 0.75, GOLD) +
    rect(21.55, 5.5, 0.45, 0.75, GOLD) +
    rect(20.35, 7.8, 0.6, 0.5, GOLD)
  return inHand(pose, handSwing, -0.5, s)
}

// 레벨 90~: 머리 위 후광과 금빛·하늘빛 반짝이
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.6, 3.3, 0.6, 0.4, t) +
      ([[6.6, 1.4, GOLD, '0s'], [23, 3, SKY, '0.8s']] as const)
        .map(
          ([x, y, c, b]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect(x - 0.2, y - 0.7, 0.4, 1.4, c) +
            rect(x - 0.7, y - 0.2, 1.4, 0.4, c) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCape(t),
    boot: boot(t),
    body: smallPlate(t),
    head: smallHead(t),
    glove: smallGlove(t),
    hand: smallShield(t, pose) + smallSword(t, pose),
    over: smallGlory(t),
  })

// 몬스터 앞을 가르는 초승달 모양의 푸른 칼빛 (바깥 날은 흰빛). 90부터 성검의 금빛. 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const holy = t >= 9
  const band = holy ? '#FFD54A' : '#6CB8FF'
  const edge = holy ? WHITE : '#EAF6FF'
  // 위 끝에서 가운데로 갈수록 두꺼워졌다가 아래 끝으로 가늘어지는 초승달 (x, y, 폭, 높이)
  const arc = [
    [19.9, 3.1, 1.3, 0.6],
    [20.7, 3.5, 1.5, 0.8],
    [21.6, 4.1, 1.4, 1],
    [22.2, 4.9, 1.4, 1.4],
    [22.4, 6.1, 1.4, 1.8],
    [22.2, 7.6, 1.4, 1.4],
    [21.6, 8.8, 1.4, 1],
    [20.7, 9.6, 1.5, 0.8],
    [19.9, 10.2, 1.3, 0.6],
  ]
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.58;0.62;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="-0.6 -0.8;-0.6 -0.8;0 0;0.4 0.5;0.4 0.5" keyTimes="0;0.58;0.64;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    // 뒤따르는 옅은 잔상
    `<g opacity="0.35" transform="translate(-0.9 0)">${arc.map(([x, y, w, h]) => rect(x!, y!, w! * 0.7, h!, band)).join('')}</g>` +
    arc.map(([x, y, w, h]) => rect(x!, y!, w!, h!, band)).join('') +
    arc.map(([x, y, w, h]) => rect(x! + w! * 0.5, y! + 0.1, w! * 0.5, h! - 0.2, edge)).join('') +
    rect(19.5, 2.4, 0.4, 1.4, holy ? GOLD : WHITE) +
    rect(19, 2.9, 1.4, 0.4, holy ? GOLD : WHITE) +
    '</g>'
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 왼팔(말풍선을 가리키는 팔)과 같이 움직이는 것: pointingArm에서 그대로 꺼내 쓰는 콕콕 찌르기 (방패·손목 덮개·윤곽이 장갑과 한 몸처럼 움직인다)
const JAB = pointingArm().match(/<animateTransform[^>]*\/>/)?.[0] ?? ''

const bigCape = (t: number) => {
  if (t < 5) return ''
  const k = cape(t)
  return (
    rect(316, 40, 108, 72, k.c) +
    rect(316, 106, 108, 6, k.d) +
    rect(320, 34, 100, 6, k.d) +
    rect(424, 46, 16, 58, k.c, flutter(58, 42)) +
    rect(440, 54, 12, 42, k.c, flutter(42, 28)) +
    rect(424, 46, 16, 4, k.l) +
    rect(440, 54, 12, 4, k.l)
  )
}

// 어깨 판금은 80부터 위·양옆에 짙은 금빛 테(3px)를 둘러 밝은 바탕에서도 모양이 보이게 하고, 빛은 테 안쪽에 둔다
const bigPlate = (t: number) => {
  if (t < 4) return ''
  const p = plate(t)
  const pauldron = (x: number) =>
    rect(x, 48, 30, 12, p.c) +
    (t >= 8 ? rect(x + 3, 51, 24, 3, p.l) : rect(x, 48, 30, 3, p.l)) +
    rect(x + 2, 60, 26, 9, p.d) +
    rect(x + 2, 60, 26, 2, p.c) +
    (t >= 8
      ? rect(x, 57, 30, 3, GOLD) +
        rect(x + 2, 67, 26, 2, GOLD) +
        rects([[x, 48, 30, 3], [x, 48, 3, 9], [x + 27, 48, 3, 9], [x + 2, 60, 3, 7], [x + 25, 60, 3, 7]], p.s)
      : '')
  return (
    rect(330, 74, 80, 22, p.c) +
    rect(330, 74, 80, 3, p.l) +
    rect(330, 91, 80, 5, t >= 8 ? GOLD : p.s) +
    rect(354, 74, 32, 26, ROYAL) +
    rect(354, 74, 32, 3, ROYAL_LIGHT) +
    rect(354, 96, 32, 4, ROYAL_DARK) +
    rect(367, 78, 6, 17, GOLD) +
    rect(360, 82, 20, 5, GOLD) +
    pauldron(312) +
    pauldron(398)
  )
}

// 깃털 장식: 투구 꼭대기의 금 꽂이에서 솟아 뒤로(왼쪽) 둥글게 넘어가 흘러내린다. 끝은 천천히 나부낀다
// (dx, dy): 투구가 바뀔 때 꽂이 자리. 왕관(90~) 뒤에서는 왼쪽으로 비켜난다
const bigPlume = (dx: number, dy: number) => {
  const sway = (from: number, to: number) => `<animate attributeName="y" values="${from};${to};${from}" dur="0.9s" repeatCount="indefinite"/>`
  return (
    rect(358 + dx, -2 + dy, 18, 14, ROYAL) +
    rect(340 + dx, -8 + dy, 28, 12, ROYAL) +
    rect(326 + dx, -4 + dy, 18, 12, ROYAL) +
    rect(316 + dx, 4 + dy, 14, 14, ROYAL, sway(4 + dy, 1 + dy)) +
    rect(308 + dx, 14 + dy, 12, 10, ROYAL_DARK, sway(14 + dy, 9 + dy)) +
    rect(342 + dx, -8 + dy, 30, 4, ROYAL_LIGHT) +
    rect(326 + dx, -4 + dy, 14, 3, ROYAL_LIGHT) +
    rect(340 + dx, 2 + dy, 20, 2, ROYAL_DARK) +
    rect(363 + dx, 8 + dy, 12, 6, GOLD)
  )
}

const bigHead = (t: number) => {
  if (t < 1) return ''
  const p = plate(t)
  if (t < 7) {
    // 깃털 철모: 둥근 철모, 챙, 징
    return (
      bigPlume(0, 0) +
      rect(330, 20, 80, 16, p.c) +
      rect(338, 13, 64, 8, p.c) +
      rect(346, 16, 18, 4, p.l) +
      rect(400, 20, 10, 14, p.d) +
      rect(324, 34, 92, 6, p.d) +
      [338, 392].map(x => rect(x, 26, 4, 4, p.s)).join('')
    )
  }
  // 바이저 투구: 둥근 투구에 볼가리개가 얼굴 옆을 감싸고, 숨구멍 난 바이저는 이마 위로 들어 올렸다
  const visor = t >= 8 ? GOLD : p.d
  const slit = t >= 8 ? GOLD_DARK : p.s
  const plat = t >= 8
  return (
    (t >= 9 ? bigPlume(-16, 0) : bigPlume(0, -8)) +
    rect(344, 3, 52, 5, p.c) +
    rect(334, 7, 72, 8, p.c) +
    rect(326, 14, 88, 24, p.c) +
    rect(326, 36, 18, 30, p.c) +
    rect(396, 36, 18, 30, p.c) +
    rect(406, 14, 8, 52, p.d) +
    (plat
      ? // 백금 투구(80~): 둥근 윗면의 계단과 양옆을 따라 짙은 금빛 테(3px)를 두르고, 빛은 테 안쪽에 둔다
        rects(
          [
            [344, 3, 52, 3], // 꼭대기
            [344, 3, 3, 7], // 꼭대기 왼쪽
            [393, 3, 3, 7], // 꼭대기 오른쪽
            [334, 7, 13, 3], // 둘째 단 위 (왼쪽)
            [393, 7, 13, 3], // 둘째 단 위 (오른쪽)
            [334, 7, 3, 10], // 둘째 단 왼쪽
            [403, 7, 3, 10], // 둘째 단 오른쪽
            [326, 14, 11, 3], // 셋째 단 위 (왼쪽)
            [403, 14, 11, 3], // 셋째 단 위 (오른쪽)
            [326, 14, 3, 48], // 왼쪽 (볼가리개 금테까지)
            [411, 14, 3, 48], // 오른쪽
          ],
          p.s,
        ) +
        rect(329, 18, 4, 44, p.l) +
        rect(349, 6, 20, 4, p.l)
      : rect(326, 16, 4, 48, p.l) + rect(346, 6, 22, 4, p.l)) +
    rect(338, 26, 64, 12, visor) +
    rect(364, 38, 12, 5, visor) +
    [344, 358, 372, 386].map(x => rect(x, 30, 10, 3, slit)).join('') +
    rect(333, 54, 5, 5, p.s) +
    rect(402, 54, 5, 5, p.s) +
    (t >= 8 ? rect(326, 62, 18, 4, GOLD) + rect(396, 62, 18, 4, GOLD) : '') +
    (t >= 9
      ? rect(340, -4, 60, 10, GOLD) +
        rect(340, -10, 9, 7, GOLD) +
        rect(365, -13, 10, 10, GOLD) +
        rect(391, -10, 9, 7, GOLD) +
        rect(340, -4, 60, 3, GOLD_LIGHT) +
        rect(367, -2, 6, 6, RUBY) +
        rect(350, 0, 6, 5, ROYAL_LIGHT) +
        rect(384, 0, 6, 5, ROYAL_LIGHT)
      : '')
  )
}

// 연 모양 방패(60~): 가리키는 왼팔에 끼워 팔과 같이 움직인다 (팔이 방패 앞으로 지나간다)
const bigShield = (t: number) => {
  if (t < 6) return ''
  const p = plate(t)
  const rim = t >= 8 ? GOLD : p.c
  return (
    `<g>${JAB}` +
    rect(298, 46, 42, 34, rim) +
    rect(302, 80, 34, 10, rim) +
    rect(307, 90, 24, 8, rim) +
    rect(312, 98, 14, 7, rim) +
    rect(316, 105, 6, 5, rim) +
    rect(302, 50, 34, 30, ROYAL) +
    rect(306, 80, 26, 8, ROYAL) +
    rect(311, 88, 16, 8, ROYAL) +
    rect(316, 96, 6, 7, ROYAL) +
    rect(302, 50, 34, 4, ROYAL_LIGHT) +
    rect(298, 46, 42, 3, t >= 8 ? GOLD_LIGHT : p.l) +
    rect(316, 54, 6, 40, GOLD) +
    rect(305, 58, 28, 6, GOLD) +
    '</g>'
  )
}

// 오른팔과 기사검: 끝·대기는 검을 번쩍 들고, 오류는 칼끝을 아래로 늘어뜨린다. 방패는 왼쪽에
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return rightArm(variant, g)
  const holy = t >= 9
  const blade = holy ? HOLY : STEEL_LIGHT
  const fuller = holy ? HOLY_GLOW : STEEL_DARK
  const aura = (x: number, y: number, w: number, h: number) => (holy ? rect(x, y, w, h, HOLY_GLOW, glow()) : '')
  // 성검(90~)의 흰 날은 밝은 바탕에 묻히므로 양쪽 날을 짙은 금빛으로 두르고(흰 날빛 대신), 칼끝도 같은 테를 두른다
  // (y: 날 위, h: 날 길이, tipY·tipH: 칼끝 위와 길이, innerY: 칼끝 안쪽 흰 날이 시작하는 y — 뾰족한 쪽 2px는 테로 남긴다)
  const holyEdge = (y: number, h: number, tipY: number, tipH: number, innerY: number) =>
    rect(417, y, 2, h, GOLD_DARK) +
    rect(423, y, 2, h, GOLD_DARK) +
    rect(419, tipY, 4, tipH, GOLD_DARK) +
    rect(420, innerY, 2, tipH - 2, blade)
  // 백금 건틀릿(80~)은 검을 쥔 손에도 짙은 금빛 테(3px)를 두른다. 날밑이 닿는 쪽과 팔이 들어오는 곳은 비운다
  const fistRim = (list: number[][]) => (t >= 8 ? rects(list, PLAT_SHADE) : '')
  if (variant === 'error') {
    return (
      bigShield(t) +
      rightArm(variant, g) +
      fistRim([[411, 88, 3, 16], [426, 88, 3, 16], [411, 88, 5, 3], [424, 88, 5, 3]]) +
      aura(410, 100, 22, 46) +
      rect(401, 104, 40, 6, GOLD) +
      rect(401, 104, 6, 10, GOLD) +
      rect(435, 104, 6, 10, GOLD) +
      rect(417, 110, 8, 26, blade) +
      (holy ? '' : rect(423, 110, 2, 26, WHITE)) +
      rect(420, 112, 2, 20, fuller) +
      (holy ? holyEdge(110, 26, 136, 5, 136) : rect(419, 136, 4, 5, blade))
    )
  }
  // 팔 → 검 → 손 순서로 겹친다: rightArm은 팔과 손을 같이 그리므로 손 부분만 다시 덮는다
  const hand = g
    ? rect(409, 27, 24, 20, g.color) +
      (g.shine ? rect(412, 29, 7, 5, g.shine) : '') +
      fistRim([[409, 27, 3, 20], [430, 27, 3, 20], [409, 44, 24, 3]])
    : rect(413, 32, 16, 12, ORANGE)
  return (
    bigShield(t) +
    rightArm(variant, g) +
    aura(410, -34, 22, 62) +
    rect(417, -22, 8, 43, blade) +
    (holy ? '' : rect(417, -22, 2, 43, WHITE)) +
    rect(420, -16, 2, 34, fuller) +
    (holy ? holyEdge(-22, 43, -28, 6, -26) : rect(419, -28, 4, 6, blade)) +
    rect(401, 21, 40, 6, GOLD) +
    rect(401, 15, 6, 12, GOLD) +
    rect(435, 15, 6, 12, GOLD) +
    (holy ? rect(418, 22, 6, 4, RUBY) : '') +
    hand +
    rect(417, 47, 8, 7, GOLD)
  )
}

// 백금 건틀릿(80~)의 3px 윤곽: 흰 말풍선 꼬리·밝은 바탕에 묻히지 않게 장갑(손가락 x 262~282, 손바닥 276~300 × 56~86,
// 엄지 286~294 × 53~61)과 손목 덮개(298~307 × 61~81) 둘레에 짙은 금빛 테를 두른다. 손가락 끝은 그림 칸(x 262) 밖으로
// 나가지 않게 안쪽 3px를 덮고, 손목 덮개 오른쪽은 팔이 지나는 곳(y 66~76)을 비운다
const GAUNTLET_RIM = [
  [262, 61, 14, 3], // 손가락 위
  [262, 73, 14, 3], // 손가락 아래
  [262, 64, 3, 9], // 손가락 끝
  [273, 53, 3, 11], // 손바닥 왼쪽 (손가락 위)
  [273, 73, 3, 16], // 손바닥 왼쪽 (손가락 아래)
  [273, 53, 13, 3], // 손바닥 위 (엄지 왼쪽)
  [283, 50, 14, 3], // 엄지 위
  [283, 50, 3, 6], // 엄지 왼쪽
  [294, 50, 3, 6], // 엄지 오른쪽
  [294, 53, 9, 3], // 손바닥 위 (엄지 오른쪽)
  [300, 53, 3, 8], // 손바닥 오른쪽 (덮개 위)
  [300, 58, 10, 3], // 손목 덮개 위
  [307, 58, 3, 8], // 손목 덮개 오른쪽 (팔 위)
  [307, 76, 3, 8], // 손목 덮개 오른쪽 (팔 아래)
  [300, 81, 10, 3], // 손목 덮개 아래
  [300, 81, 3, 8], // 손바닥 오른쪽 (덮개 아래)
  [273, 86, 30, 3], // 손바닥 아래
]

// 건틀릿(30~)의 손목 덮개: 가리키는 손 위에 같은 움직임으로 덧그린다 (마디 주름 색은 crease로 넘긴다). 80부터 윤곽도 같이
const bigGauntlet = (t: number) => {
  if (t < 3) return ''
  const p = plate(t)
  return (
    `<g>${JAB}` +
    (t >= 8 ? rects(GAUNTLET_RIM, p.s) : '') +
    rect(298, 61, 9, 20, p.c) +
    rect(298, 61, 9, 3, p.l) +
    rect(298, 78, 9, 3, t >= 8 ? GOLD : p.s) +
    '</g>'
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -26, 36, 7, 4, t) + sparkle(288, 30, 12, GOLD, '0.3s') + sparkle(448, 4, 12, SKY, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCape(t),
    boot: boot(t),
    body: bigPlate(t),
    head: bigHead(t),
    glove: glove(t),
    // 건틀릿의 마디 주름은 판금 그늘색
    crease: plate(t).d,
    arm: bigArm(variant, t),
    over: bigGauntlet(t) + bigGlory(t),
  })

export const knight: Job = {
  key: 'knight',
  name: '기사',
  icon: '🛡️',
  gear: [
    '',
    '깃털 철모',
    '철 장화',
    '철 건틀릿',
    '파란 문장 판금 흉갑',
    '파란 망토',
    '기사검과 방패',
    '바이저 투구',
    '백금 판금과 금빛 망토',
    '왕관 투구·후광·성검',
    '무지개 후광',
  ],
  melee: true,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : t >= 7 ? 4 : 0),
  bigHeadroom: t => (t >= 9 ? 39 : t >= 6 ? 30 : t >= 1 ? 8 : 0),
}
