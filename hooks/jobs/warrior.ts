// 전사: 털가죽과 쇠, 붉은 전투 물감의 광전사. 뿔 머리띠·전투 물감 → 털 장화 → 가죽 손목 보호대 → 털 어깨 갑옷
// → 늑대 가죽 망토 → 양날 도끼 → 뿔 투구 → 붉은 강철 갑옷 → 왕관 뿔 투구·후광·불타는 도끼 → 무지개 후광
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_LIGHT,
  INK,
  ORANGE,
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

const FUR = '#6A4429'
const FUR_DARK = '#3D2615'
const FUR_LIGHT = '#CDA477'
const WOLF = '#9AA1AB'
const WOLF_DARK = '#656C77'
const WOLF_LIGHT = '#D3D8DE'
const IRON = '#7D838C'
const IRON_DARK = '#4C5058'
const IRON_LIGHT = '#C3C9D1'
const BLACK_STEEL = '#3F434B'
const BLACK_STEEL_LIGHT = '#7A808A'
const LEATHER = '#8E4A22'
const LEATHER_DARK = '#572A12'
const LEATHER_LIGHT = '#B8693A'
const HAFT = '#6A4220'
const HORN = '#F1E7CF'
const HORN_SHADE = '#CDBB94'
const HORN_TIP = '#8C7752'
const PAINT = '#C81E1E'
const CRIMSON = '#9E1D1D'
const CRIMSON_DARK = '#5E1010'
const CRIMSON_LIGHT = '#D9483B'
const BRONZE = '#C98A3A'
const BRONZE_LIGHT = '#F0C27A'
const HOT_BLADE = '#FF8A3D'
const FLAME = '#F97316'
const FLAME_HOT = '#FDE047'
const FLAME_RED = '#DC2626'

// 가죽 끈·띠 색 (바탕, 그늘, 빛, 징). 80부터 청동
const strap = (t: number) =>
  t >= 8
    ? { c: BRONZE, d: '#8A5A1E', l: BRONZE_LIGHT, stud: BRONZE_LIGHT }
    : { c: LEATHER, d: LEATHER_DARK, l: LEATHER_LIGHT, stud: IRON_LIGHT }
// 투구 쇠 색 (바탕, 그늘, 빛). 80부터 검게 벼린 강철
const helmMetal = (t: number) =>
  t >= 8 ? { c: BLACK_STEEL, d: '#26292E', l: BLACK_STEEL_LIGHT } : { c: IRON, d: IRON_DARK, l: IRON_LIGHT }

// 털 장화(20~): 털가죽에 밝은 털 줄. 손목 보호대(30~): 가죽에 쇠 징, 80부터 청동
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: FUR, stripe: FUR_LIGHT, sole: FUR_DARK } : undefined)
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: strap(t).c, shine: strap(t).stud } : undefined)

// 뿔 한 쌍: 왼쪽 뿔을 위(뿔끝)에서 아래(뿌리)로 줄줄이 [x0, x1, y, 높이]로 주면, 가운데 c를 축으로 뒤집어
// 오른쪽 뿔도 그린다. 맨 윗줄은 짙은 뿔끝, 나머지는 바깥쪽에 그늘
const hornPair = (rows: readonly (readonly number[])[], c: number, shade: number) =>
  [false, true]
    .map(mirror =>
      rows
        .map(([x0, x1, y, h], i) => {
          const [a, b] = mirror ? [2 * c - x1!, 2 * c - x0!] : [x0!, x1!]
          if (i === 0) return rect(a, y!, b - a, h!, HORN_TIP)
          return rect(a, y!, b - a, h!, HORN) + rect(mirror ? b - shade : a, y!, shade, h!, HORN_SHADE)
        })
        .join(''),
    )
    .join('')

// 불꽃 혀 하나: 높이가 너울거리며 아래 끝은 제자리에 붙어 있다
const tongue = (x: number, bottom: number, w: number, h: number, color: string, dur: string) =>
  rect(
    x,
    bottom - h,
    w,
    h,
    color,
    `<animate attributeName="height" values="${h};${h * 0.5};${h}" dur="${dur}" repeatCount="indefinite"/>` +
      `<animate attributeName="y" values="${bottom - h};${bottom - h * 0.5};${bottom - h}" dur="${dur}" repeatCount="indefinite"/>`,
  )

// 불길 한 줄기: 바깥은 빨강, 안은 주황, 가운데는 노란 심지 (cx: 가운데, w: 폭)
const lick = (cx: number, bottom: number, w: number, h: number, dur: string) =>
  tongue(cx - w / 2, bottom, w, h, FLAME_RED, dur) +
  tongue(cx - w * 0.33, bottom, w * 0.66, h * 0.72, FLAME, dur) +
  tongue(cx - w * 0.14, bottom, w * 0.28, h * 0.42, FLAME_HOT, dur)

// ── 작은 그림 ─────────────────────────────────────────────────────

// 손에 든 것: 달릴 때는 팔과 같이 흔들고, 쉴 때는 가만히 든 손 높이에 맞춘다
const inHand = (pose: Pose, inner: string) =>
  pose === 'run' ? `<g>${handSwing}${inner}</g>` : `<g transform="translate(0 -0.5)">${inner}</g>`

// 늑대 가죽 망토(50~): 회색 털가죽이 뒤로 펄럭이고, 왼쪽 어깨 뒤로 늑대 머리가 걸쳐 있다
const smallCape = (t: number) => {
  if (t < 5) return ''
  return (
    rect(10, 3.4, 10, 6.8, WOLF) +
    rect(7.3, 3.9, 3, 5.6, WOLF, swap('height', 5.6, 4.6)) +
    rect(5.5, 4.6, 2, 3.8, WOLF, swap('height', 3.8, 2.6)) +
    rect(7.3, 5.4, 3, 0.45, WOLF_DARK) +
    rect(5.5, 5.8, 2, 0.4, WOLF_DARK) +
    rect(10, 9.8, 10, 0.4, WOLF_LIGHT) +
    // 늑대 머리: 귀 둘, 주둥이는 뒤(왼쪽)를 본다
    rect(8.4, 2.5, 2.8, 1.8, WOLF) +
    rect(8.6, 1.9, 0.7, 0.7, WOLF_DARK) +
    rect(10.2, 1.9, 0.7, 0.7, WOLF_DARK) +
    rect(7.3, 3.2, 1.3, 0.9, WOLF) +
    rect(7.3, 3.8, 1.3, 0.3, WOLF_LIGHT) +
    rect(7.1, 3.2, 0.4, 0.4, INK) +
    rect(9, 2.9, 0.5, 0.3, INK)
  )
}

// 털 어깨 하나 (x: 왼쪽 끝): 삐죽삐죽한 털끝이 위아래로 튀어나오고 밝은 털결이 난다
const smallFur = (x: number) =>
  rect(x, 4.6, 2.8, 1.4, FUR) +
  rect(x + 0.1, 4.2, 0.7, 0.5, FUR) +
  rect(x + 1.05, 3.9, 0.8, 0.8, FUR) +
  rect(x + 2.05, 4.25, 0.65, 0.45, FUR) +
  rect(x + 0.1, 5.95, 0.7, 0.45, FUR_DARK) +
  rect(x + 1, 5.95, 0.8, 0.6, FUR_DARK) +
  rect(x + 2, 5.95, 0.7, 0.4, FUR_DARK) +
  rect(x + 0.1, 4.2, 0.7, 0.2, FUR_LIGHT) +
  rect(x + 1.05, 3.9, 0.8, 0.25, FUR_LIGHT) +
  rect(x + 2.05, 4.25, 0.65, 0.2, FUR_LIGHT) +
  rect(x + 0.3, 4.85, 1.1, 0.25, FUR_LIGHT) +
  rect(x + 1.7, 5.35, 0.8, 0.25, FUR_LIGHT)

// 몸: 전투 물감(10~, 눈 아래 붉은 줄) → 털 어깨 갑옷과 허리띠(40~) → 붉은 강철 가슴판·어깨판(80~)
const smallBody = (t: number) => {
  if (t < 1) return ''
  const paint =
    rect(12.6, 6.3, 1.8, 0.45, PAINT) + rect(15.6, 6.3, 1.8, 0.45, PAINT) + rect(12.9, 6.95, 1.2, 0.35, PAINT) + rect(15.9, 6.95, 1.2, 0.35, PAINT)
  if (t < 4) return paint
  const s = strap(t)
  const elite = t >= 8
  return (
    paint +
    (elite
      ? rect(11, 7.4, 8, 1.6, CRIMSON) +
        rect(11, 7.4, 8, 0.3, CRIMSON_LIGHT) +
        rect(14.6, 7.4, 0.8, 1.6, CRIMSON_DARK) +
        rect(11.5, 7.9, 0.4, 0.4, BRONZE) +
        rect(18.1, 7.9, 0.4, 0.4, BRONZE)
      : '') +
    rect(11, 8.45, 8, 0.6, s.d) +
    rect(14.3, 8.3, 1.4, 0.85, s.stud) +
    rect(14.65, 8.55, 0.7, 0.35, s.d) +
    smallFur(9.3) +
    smallFur(17.9) +
    // 80~: 털 어깨 위에 얹은 붉은 강철 판
    (elite
      ? [9.4, 18].map(x => rect(x, 5, 2.6, 0.85, CRIMSON) + rect(x, 5, 2.6, 0.25, BRONZE) + rect(x + 1.1, 5.35, 0.4, 0.35, BRONZE_LIGHT)).join('')
      : '')
  )
}

// 머리띠의 작은 뿔(10~)과 투구의 큰 뿔(70~): 굵은 뿌리에서 바깥으로 불룩하게 솟아 끝이 안쪽으로 휜다(수금 모양).
// 오른쪽 뿔은 도끼날(x 18.6~)에 닿지 않게 둔다
const SMALL_BAND_HORN = [
  [12.3, 12.6, 1, 0.4],
  [12, 12.7, 1.4, 0.4],
  [12, 13, 1.8, 0.4],
  [12.3, 13.5, 2.2, 0.7],
]
const SMALL_HELM_HORN = [
  [12.15, 12.55, -1.5, 0.45],
  [11.85, 12.65, -1.05, 0.45],
  [11.75, 12.75, -0.6, 0.45],
  [11.75, 12.95, -0.15, 0.45],
  [11.95, 13.35, 0.3, 0.45],
  [12.35, 13.85, 0.75, 0.55],
]

// 머리: 뿔 머리띠(10~) → 큰 뿔 투구(70~, 코가리개) → 검은 강철 투구(80~) → 금 왕관을 두른 뿔 투구(90~)
const smallHead = (t: number) => {
  if (t < 1) return ''
  if (t < 7) {
    const s = strap(t)
    return (
      hornPair(SMALL_BAND_HORN, 15, 0.25) +
      rect(11, 2.9, 8, 1, s.c) +
      rect(11, 2.9, 8, 0.25, s.l) +
      [12.2, 14.8, 17.4].map(x => rect(x, 3.25, 0.4, 0.4, s.stud)).join('') +
      rect(10.2, 2.9, 1, 1.2, s.c) +
      rect(9.2, 3.3, 1.2, 0.5, s.c, swap('y', 3.3, 3.6)) +
      rect(9.5, 3.9, 0.9, 0.5, s.c, swap('y', 3.9, 4.2))
    )
  }
  const m = helmMetal(t)
  return (
    rect(12.2, 1.1, 5.6, 0.6, m.c) +
    rect(11.2, 1.6, 7.6, 1.8, m.c) +
    rect(10.6, 3.1, 8.8, 0.65, t >= 8 ? BRONZE : m.d) +
    [11.4, 13, 16.6, 18.2].map(x => rect(x, 3.25, 0.35, 0.35, t >= 8 ? BRONZE_LIGHT : IRON_LIGHT)).join('') +
    rect(11.6, 1.8, 1.2, 0.3, m.l) +
    rect(18, 1.6, 0.8, 1.5, m.d) +
    rect(14.6, 3.6, 0.8, 1.5, t >= 8 ? BRONZE : m.d) +
    hornPair(SMALL_HELM_HORN, 15, 0.3) +
    (t >= 9
      ? rect(13.4, 0.5, 3.2, 0.75, GOLD) +
        rect(13.4, 0, 0.6, 0.6, GOLD) +
        rect(14.7, -0.3, 0.6, 0.9, GOLD) +
        rect(16, 0, 0.6, 0.6, GOLD) +
        rect(13.4, 0.5, 3.2, 0.2, GOLD_LIGHT) +
        rect(14.75, 0.65, 0.5, 0.4, FLAME_RED)
      : '')
  )
}

// 양날 도끼(60~): 오른손에 세워 든 긴 자루와 초승달 날 둘. 주먹이 자루를 감싸게 손을 다시 덮는다.
// 90부터 날이 벌겋게 달아오르고 불길이 너울거린다
const smallAxe = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const fire = t >= 9
  const g = glove(t)!
  const blade = fire ? HOT_BLADE : IRON
  const edge = fire ? FLAME_HOT : IRON_LIGHT
  const s =
    rect(20.3, -1, 0.6, 9.3, HAFT) +
    rect(20.3, 3.6, 0.6, 0.35, LEATHER_DARK) +
    rect(20.3, 4.3, 0.6, 0.35, LEATHER_DARK) +
    rect(20.35, -1.5, 0.5, 0.6, t >= 8 ? BRONZE_LIGHT : IRON_LIGHT) +
    // 왼쪽 날 (자루 쪽은 좁고 바깥은 넓은 초승달)
    rect(19.4, 0.25, 1, 1.7, blade) +
    rect(18.75, -0.3, 0.8, 2.8, blade) +
    rect(18.6, -0.2, 0.3, 2.6, edge) +
    // 오른쪽 날
    rect(20.8, 0.25, 1, 1.7, blade) +
    rect(21.65, -0.3, 0.8, 2.8, blade) +
    rect(22.3, -0.2, 0.3, 2.6, edge) +
    rect(20.1, 0, 1, 2.2, t >= 8 ? BRONZE : IRON_DARK) +
    (fire
      ? lick(19, -0.3, 0.8, 1.15, '0.5s') + lick(19.9, 0.25, 0.6, 0.9, '0.37s') + lick(21.3, 0.25, 0.6, 0.9, '0.43s') + lick(22.2, -0.3, 0.8, 1.15, '0.31s')
      : '') +
    // 자루를 쥔 주먹
    rect(19.8, 6.2, 1.5, 1.6, g.color) +
    (g.shine ? rect(20, 6.35, 0.5, 0.4, g.shine) : '')
  return inHand(pose, s)
}

// 레벨 90~: 두 뿔 사이에 뜬 후광과 불티
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.6, 2.3, 0.55, 0.4, t) +
      ([[6.6, 1.2, GOLD, '0s'], [6.4, 9.6, FLAME, '0.8s']] as const)
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
    body: smallBody(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallAxe(t, pose),
    over: smallGlory(t),
  })

// 도끼를 머리 위에서 내리찍은 자리: 두툼한 반달 모양의 불길 자국(기사의 가는 칼빛보다 두 배 굵다)이 땅에 꽂혀
// 불꽃이 터지고, 불티가 튀고 먼지가 인다. 90부터 불길이 더 뜨겁다
const hit = (t: number) => {
  if (t >= 10) return ''
  const fire = t >= 9
  const outer = fire ? FLAME_RED : '#B91C1C'
  const core = fire ? '#FFFBEB' : FLAME_HOT
  // 반달의 줄들 (y, 왼쪽 x, 오른쪽 x): 위아래 끝은 가늘고 가운데는 세 칸 가까이 두껍다
  const rows = [
    [2, 19.4, 21.2],
    [2.8, 20.4, 22.8],
    [3.6, 21.4, 24],
    [4.4, 22, 24.8],
    [5.2, 22.4, 25.3],
    [6, 22.6, 25.6],
    [6.8, 22.7, 25.7],
    [7.6, 22.6, 25.6],
    [8.4, 22.4, 25.3],
    [9.2, 22, 24.8],
    [10, 21.4, 24],
    [10.8, 20.6, 22.8],
    [11.6, 19.6, 21.4],
  ]
  // 앞날(오른쪽)으로 갈수록 뜨겁다: from~to는 줄 폭에서 차지하는 비율
  const band = (from: number, to: number, color: string) =>
    rows.map(([y, a, b]) => rect(a! + (b! - a!) * from, y!, (b! - a!) * (to - from), 0.8, color)).join('')
  // 땅에 꽂힌 자리에서 터지는 불꽃
  const burst =
    rect(22.2, 12.1, 4.2, 0.9, outer) +
    rect(22.8, 11.3, 0.6, 1.2, FLAME) +
    rect(25.2, 11.5, 0.6, 1, FLAME) +
    rect(24, 10.9, 0.6, 1.4, core) +
    rect(22.9, 12.3, 3.2, 0.5, core)
  // 불티 (튀어 나가는 방향 dx, dy)
  const sparks = [
    [24.6, 4.4, 1.6, -1.4],
    [25, 7.6, 1.8, -0.4],
    [25.4, 11.2, 1.4, -1.4],
    [21.6, 11.4, -1.4, -1.2],
  ]
    .map(
      ([x, y, dx, dy]) =>
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${dx} ${dy};${dx} ${dy}" keyTimes="0;0.6;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
        rect(x!, y!, 0.6, 0.6, FLAME_HOT) +
        '</g>',
    )
    .join('')
  const dust = (x: number, dx: number) =>
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${dx} 0;${dx} 0" keyTimes="0;0.6;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(x, 12, 1.4, 1, '#C8B59A') +
    rect(x + (dx < 0 ? -0.6 : 1.2), 12.5, 0.8, 0.5, '#C8B59A') +
    '</g>'
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.58;0.62;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 -1.2;0 -1.2;0 0;0 0.4;0 0.4" keyTimes="0;0.58;0.63;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    band(0, 1, outer) +
    band(0.3, 0.92, FLAME) +
    band(0.6, 0.86, core) +
    '</g>' +
    burst +
    sparks +
    dust(21, -0.8) +
    dust(25.2, 0.8) +
    '</g>'
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 왼팔(말풍선을 가리키는 팔)과 같이 움직이는 것: pointingArm과 같은 콕콕 찌르기
const JAB =
  '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>'

// 늑대 가죽 망토: 회색 털가죽, 너덜너덜한 아랫단, 왼쪽 어깨 뒤로 걸친 늑대 머리
const bigCape = (t: number) => {
  if (t < 5) return ''
  return (
    rect(314, 40, 112, 68, WOLF) +
    [318, 340, 362, 384, 406].map((x, i) => rect(x, 108, 12, i % 2 === 0 ? 7 : 4, WOLF)).join('') +
    rect(314, 100, 112, 4, WOLF_DARK) +
    rect(426, 44, 16, 58, WOLF, flutter(58, 42)) +
    rect(442, 52, 10, 40, WOLF, flutter(40, 26)) +
    rect(426, 44, 16, 4, WOLF_LIGHT) +
    rect(442, 52, 10, 4, WOLF_LIGHT) +
    // 늑대 머리
    rect(304, 24, 32, 22, WOLF) +
    rect(308, 16, 8, 10, WOLF_DARK) +
    rect(322, 16, 8, 10, WOLF_DARK) +
    rect(290, 32, 16, 12, WOLF) +
    rect(290, 40, 16, 4, WOLF_LIGHT) +
    rect(288, 32, 5, 5, INK) +
    rect(310, 31, 7, 3, INK) +
    rect(304, 42, 32, 4, WOLF_LIGHT)
  )
}

// 털 어깨 하나 (x: 왼쪽 끝, 폭 28)
const bigFur = (x: number) =>
  rect(x, 54, 28, 14, FUR) +
  rect(x + 2, 49, 7, 6, FUR) +
  rect(x + 11, 46, 7, 9, FUR) +
  rect(x + 20, 50, 6, 5, FUR) +
  rect(x + 1, 68, 6, 4, FUR_DARK) +
  rect(x + 10, 68, 7, 6, FUR_DARK) +
  rect(x + 20, 68, 6, 4, FUR_DARK) +
  rect(x, 64, 28, 4, FUR_DARK) +
  rect(x + 2, 49, 7, 2, FUR_LIGHT) +
  rect(x + 11, 46, 7, 3, FUR_LIGHT) +
  rect(x + 20, 50, 6, 2, FUR_LIGHT) +
  rect(x + 3, 57, 10, 3, FUR_LIGHT) +
  rect(x + 16, 60, 8, 2, FUR_LIGHT)

// 몸: 전투 물감(10~) → 털 장화의 털 덧단(20~) → 털 어깨 갑옷·허리띠(40~) → 붉은 강철 가슴판·어깨판(80~)
const bigBody = (t: number) => {
  if (t < 1) return ''
  const paint = [346, 376].map(x => rect(x + 2, 67, 14, 5, PAINT) + rect(x + 5, 74, 8, 4, PAINT)).join('')
  const cuffs =
    t >= 2
      ? [330, 350, 380, 400].map(x => rect(x - 5, 97, 20, 5, FUR_LIGHT) + rect(x - 3, 94, 5, 4, FUR_LIGHT) + rect(x + 6, 94, 5, 4, FUR_LIGHT)).join('')
      : ''
  if (t < 4) return paint + cuffs
  const s = strap(t)
  const elite = t >= 8
  return (
    paint +
    cuffs +
    (elite
      ? rect(330, 80, 80, 16, CRIMSON) +
        rect(330, 80, 80, 3, CRIMSON_LIGHT) +
        rect(366, 80, 8, 16, CRIMSON_DARK) +
        [338, 396].map(x => rect(x, 85, 6, 6, BRONZE)).join('')
      : '') +
    rect(330, 88, 80, 7, s.d) +
    rect(362, 85, 16, 12, s.stud) +
    rect(366, 89, 8, 4, s.d) +
    bigFur(312) +
    bigFur(400) +
    (elite
      ? [313, 401].map(x => rect(x, 56, 26, 9, CRIMSON) + rect(x, 56, 26, 3, BRONZE) + rect(x + 10, 59, 6, 4, BRONZE_LIGHT)).join('')
      : '')
  )
}

// 큰 그림의 뿔 (작은 그림과 같은 수금 모양). 오른쪽 뿔은 도끼날(x 405~)에 닿지 않게 둔다
const BIG_BAND_HORN = [
  [347, 351, 6, 5],
  [345, 352, 11, 5],
  [345, 354, 16, 5],
  [347, 357, 21, 5],
  [350, 361, 26, 5],
]
const BIG_HELM_HORN = [
  [343, 348, -20, 6],
  [340, 349, -14, 6],
  [339, 350, -8, 6],
  [339, 352, -2, 6],
  [341, 356, 4, 6],
  [345, 361, 10, 6],
]

const bigHead = (t: number) => {
  if (t < 1) return ''
  if (t < 7) {
    // 뿔 머리띠: 가죽 띠에 쇠 징, 작은 뿔 둘, 뒤로 늘어진 끈
    const s = strap(t)
    return (
      hornPair(BIG_BAND_HORN, 370, 3) +
      rect(330, 30, 80, 11, s.c) +
      rect(330, 30, 80, 3, s.l) +
      [340, 368, 396].map(x => rect(x, 34, 5, 5, s.stud)).join('') +
      rect(318, 29, 14, 14, s.c) +
      rect(300, 33, 20, 6, s.c, '<animate attributeName="y" values="33;28;33" dur="0.9s" repeatCount="indefinite"/>') +
      rect(304, 42, 16, 6, s.c, '<animate attributeName="y" values="42;38;42" dur="0.9s" repeatCount="indefinite"/>')
    )
  }
  // 큰 뿔 투구: 둥근 쇠 투구, 징 박힌 테, 눈 사이로 내려온 코가리개, 위로 솟은 큰 뿔
  const m = helmMetal(t)
  return (
    rect(344, 8, 52, 6, m.c) +
    rect(334, 12, 72, 8, m.c) +
    rect(330, 19, 80, 17, m.c) +
    rect(324, 33, 92, 9, t >= 8 ? BRONZE : m.d) +
    [330, 350, 386, 406].map(x => rect(x, 36, 5, 4, t >= 8 ? BRONZE_LIGHT : IRON_LIGHT)).join('') +
    rect(336, 20, 14, 4, m.l) +
    rect(400, 19, 10, 14, m.d) +
    rect(366, 42, 8, 15, t >= 8 ? BRONZE : m.d) +
    hornPair(BIG_HELM_HORN, 370, 4) +
    (t >= 9
      ? rect(358, 2, 24, 9, GOLD) +
        rect(358, -5, 6, 8, GOLD) +
        rect(367, -9, 6, 12, GOLD) +
        rect(376, -5, 6, 8, GOLD) +
        rect(358, 2, 24, 3, GOLD_LIGHT) +
        rect(367, 5, 6, 5, FLAME_RED)
      : '')
  )
}

// 손목 보호대(30~): 가리키는 왼팔 위에 같은 움직임으로 덧그린다 (손은 맨손 그대로)
const bigBracerLeft = (t: number) => {
  if (t < 3) return ''
  const s = strap(t)
  return (
    `<g>${JAB}` +
    rect(300, 62, 18, 18, s.c) +
    rect(300, 62, 18, 3, s.l) +
    rect(303, 68, 12, 2, s.d) +
    rect(303, 73, 12, 2, s.d) +
    rect(307, 64, 4, 4, s.stud) +
    '</g>'
  )
}

// 오른팔: 손목 보호대(30~)와 양날 도끼(60~). 끝·대기는 도끼를 번쩍 치켜들고, 오류는 도끼가 발치에 처진다
const bigArm = (variant: BigVariant, t: number) => {
  const s = strap(t)
  const bracer =
    t < 3
      ? ''
      : variant === 'error'
        ? rect(413, 78, 14, 12, s.c) + rect(413, 78, 14, 3, s.l) + rect(415, 84, 10, 2, s.d)
        : rect(413, 50, 16, 14, s.c) + rect(413, 50, 16, 3, s.l) + rect(415, 57, 12, 2, s.d) + rect(419, 52, 4, 4, s.stud)
  if (t < 6) return rightArm(variant) + bracer
  const fire = t >= 9
  const blade = fire ? HOT_BLADE : IRON
  const edge = fire ? FLAME_HOT : IRON_LIGHT
  const eye = t >= 8 ? BRONZE : IRON_DARK
  // 자루 가운데 x. 주먹의 오른쪽에 쥐어 도끼날이 오른쪽 뿔에 닿지 않게 한다
  const hx = 430
  // 도끼 머리: (hx, cy)를 가운데로 위아래로 선 초승달 날 둘 (자루 쪽은 좁고 바깥은 넓다)
  const head = (cy: number) =>
    rect(hx - 15, cy - 9, 13, 18, blade) +
    rect(hx - 23, cy - 18, 11, 36, blade) +
    rect(hx - 25, cy - 16, 4, 32, edge) +
    rect(hx + 2, cy - 9, 13, 18, blade) +
    rect(hx + 12, cy - 18, 11, 36, blade) +
    rect(hx + 21, cy - 16, 4, 32, edge) +
    rect(hx - 6, cy - 12, 12, 24, eye) +
    rect(hx - 20, cy - 14, 6, 3, fire ? FLAME_HOT : IRON_LIGHT) +
    rect(hx + 14, cy - 14, 6, 3, fire ? FLAME_HOT : IRON_LIGHT)
  // 불길: 바깥 날 위로 크게, 안쪽 날 위로 작게
  const flames = (cy: number) =>
    fire
      ? lick(hx - 18, cy - 18, 10, 11, '0.5s') +
        lick(hx - 8, cy - 9, 7, 7, '0.37s') +
        lick(hx + 8, cy - 9, 7, 7, '0.43s') +
        lick(hx + 18, cy - 18, 10, 11, '0.31s')
      : ''
  if (variant === 'error') {
    // 축 처진 팔 끝의 주먹에 자루가 매달리고, 무거운 도끼 머리는 오른발 옆까지 처진다
    return rightArm(variant) + bracer + rect(hx - 3, 96, 6, 24, HAFT) + head(128) + flames(128) + rect(413, 88, 20, 12, ORANGE)
  }
  // 팔 → 도끼 → 주먹 순서로 겹친다
  return (
    rightArm(variant) +
    bracer +
    rect(hx - 3, -26, 6, 86, HAFT) +
    rect(hx - 3, 48, 6, 3, LEATHER_DARK) +
    rect(hx - 3, 54, 6, 3, LEATHER_DARK) +
    rect(hx - 2, -32, 4, 7, t >= 8 ? BRONZE_LIGHT : IRON_LIGHT) +
    head(-10) +
    flames(-10) +
    rect(413, 32, 22, 12, ORANGE)
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -24, 20, 5, 4, t) + sparkle(296, 6, 12, GOLD, '0.3s') + sparkle(300, 100, 10, FLAME, '1.1s')

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCape(t),
    boot: boot(t),
    body: bigBody(t),
    head: bigHead(t),
    arm: bigArm(variant, t),
    over: bigBracerLeft(t) + bigGlory(t),
  })

export const warrior: Job = {
  key: 'warrior',
  name: '전사',
  icon: '🪓',
  gear: [
    '',
    '뿔 머리띠·전투 물감',
    '털 장화',
    '가죽 손목 보호대',
    '털 어깨 갑옷',
    '늑대 가죽 망토',
    '양날 도끼',
    '뿔 투구',
    '붉은 강철 갑옷',
    '왕관 뿔 투구·후광·불타는 도끼',
    '무지개 후광',
  ],
  melee: true,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : t >= 6 ? 6 : 0),
  bigHeadroom: t => (t >= 9 ? 40 : t >= 6 ? 34 : 0),
}
