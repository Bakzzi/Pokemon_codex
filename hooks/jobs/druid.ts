// 드루이드: 잎과 나무껍질, 이끼와 분홍 꽃, 사슴뿔. 잎사귀 화관 → 덩굴 신발 → 나무껍질 손목대 → 잎사귀 로브
// → 이끼 망토 → 꽃 핀 나무 지팡이 → 사슴뿔 관 → 꽃 피는 생명의 로브 → 세계수 왕관·초록 후광·생명의 지팡이 → 무지개 후광
import { ATK } from '../monsters.ts'
import { GOLD, GOLD_DARK, GOLD_LIGHT, ORANGE, bigClawd, flutter, glow, halo, handSwing, rect, rightArm, smallClawd, swap } from '../pixel.ts'
import type { BigVariant, Boot, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const LEAF = '#4CA34A'
const LEAF_DARK = '#2E7A3C'
const LEAF_LIGHT = '#8FD86E'
const BLOOM = '#5FC75A'
const BLOOM_DARK = '#2F9446'
const BLOOM_LIGHT = '#B9F29A'
const MOSS = '#5F7D2C'
const MOSS_DARK = '#3F5A1C'
const MOSS_LIGHT = '#9BBE4B'
const BARK = '#7A5232'
const BARK_DARK = '#4F3420'
const BARK_LIGHT = '#A67C50'
const PINK = '#F472B6'
const PINK_LIGHT = '#FBCFE8'
const POLLEN = '#FDE047'
const PETAL_WHITE = '#FFF5FA'
const ANTLER = '#E6D3AA'
const ANTLER_DARK = '#B59A6B'
const LIFE = '#86EFAC'
const LIFE_LIGHT = '#DCFCE7'
const LIFE_DEEP = '#22C55E'

const r2 = (v: number) => Math.round(v * 100) / 100

// 80부터 꽃 피는 생명의 로브: 더 밝은 초록에 꽃이 피고 금빛 덩굴 띠 [천, 그늘, 밝은 면]
const robeColors = (t: number) => (t >= 8 ? [BLOOM, BLOOM_DARK, BLOOM_LIGHT] : [LEAF, LEAF_DARK, LEAF_LIGHT])

// 덩굴 신발(20~): 초록 덩굴 신에 연둣빛 줄, 나무 밑창
const boot = (t: number): Boot | undefined => (t >= 2 ? { color: '#3F7D32', stripe: LEAF_LIGHT, sole: BARK_DARK } : undefined)

// 꽃 한 송이: 가운데 (x, y), 꽃잎 폭 s
const flower = (x: number, y: number, s: number, petal: string, center = POLLEN) =>
  rect(r2(x - s / 2), r2(y - s / 4), s, r2(s / 2), petal) +
  rect(r2(x - s / 4), r2(y - s / 2), r2(s / 2), s, petal) +
  rect(r2(x - s / 6), r2(y - s / 6), r2(s / 3), r2(s / 3), center)

// ── 작은 그림 ─────────────────────────────────────────────────────

// 잎사귀 화관(10~): 머리를 두른 덩굴에 잎이 번갈아 돋고 분홍 꽃 한 송이. 80부터 흰 꽃도 핀다
const WREATH: readonly [number, number][] = [
  [10.3, 2.85],
  [11.6, 2.45],
  [12.9, 2.8],
  [14.2, 2.4],
  [15.5, 2.8],
  [16.8, 2.45],
  [18.1, 2.85],
]
const smallWreath = (t: number) =>
  rect(10.6, 3, 8.8, 0.5, LEAF_DARK) +
  WREATH.map(([x, y], i) => rect(x, y, 1.1, 0.7, i % 2 ? LEAF : LEAF_LIGHT) + rect(r2(x + 0.2), y, 0.45, 0.3, i % 2 ? LEAF_LIGHT : '#C5F0A8')).join('') +
  flower(12.4, 2.6, 1.1, PINK) +
  (t >= 8 ? flower(17.6, 2.65, 0.9, PETAL_WHITE) : '')

// 사슴뿔(70~): 굵은 줄기에서 바깥으로 가지 하나, 끝은 두 갈래. 왼쪽만 적고 오른쪽은 15 기준으로 뒤집는다
const ANTLER_L: readonly [number, number, number, number][] = [
  [12.1, 1.6, 0.55, 1.3],
  [11.7, 0.4, 0.55, 1.3],
  [11.3, -0.8, 0.55, 1.3],
  [11.35, -1.4, 0.45, 0.7],
  [10.6, 0.95, 1.2, 0.45],
  [10.25, 0.1, 0.45, 1.3],
  [11.85, -0.75, 0.45, 0.8],
]
const smallAntlers = () =>
  [false, true]
    .map(flip =>
      ANTLER_L.map(([x, y, w, h]) => rect(flip ? r2(30 - x - w) : x, y, w, h, ANTLER)).join('') +
      rect(flip ? 17.35 : 12.1, 1.6, 0.25, 1.3, ANTLER_DARK) +
      rect(flip ? 17.75 : 11.7, 0.4, 0.25, 1.3, ANTLER_DARK),
    )
    .join('')

// 세계수 왕관(90~): 화관 위 금빛 띠와 이마 위의 작은 세계수. 잎 덩어리가 숨 쉬듯 밝아진다
const smallCanopy = (c: string) => rect(13.8, 0, 2.4, 1.1, c) + rect(14.2, -0.45, 1.6, 0.5, c)
const smallWorldCrown = () =>
  rect(11.4, 2.25, 7.2, 0.5, GOLD) +
  rect(11.4, 2.25, 7.2, 0.2, GOLD_LIGHT) +
  rect(12.6, 1.8, 0.5, 0.5, GOLD) +
  rect(16.9, 1.8, 0.5, 0.5, GOLD) +
  rect(14.7, 1, 0.6, 1.3, GOLD_DARK) +
  smallCanopy(LIFE_DEEP) +
  `<g opacity="0.3">${glow('1.6s')}${smallCanopy(LIFE_LIGHT)}</g>` +
  rect(14.2, -0.25, 0.9, 0.45, LIFE) +
  rect(14, 0.6, 0.35, 0.35, GOLD) +
  rect(15.6, 0.3, 0.35, 0.35, GOLD)

const smallHead = (t: number) =>
  t < 1 ? '' : (t >= 7 ? smallAntlers() : '') + smallWreath(t) + (t >= 9 ? smallWorldCrown() : '')

// 나무껍질 손목대(30~): 두 팔 가운데에 이끼 낀 나무껍질 띠. 팔과 같이 흔든다
const smallBracers = (t: number, pose: Pose) => {
  if (t < 3) return ''
  const run = pose === 'run'
  const one = (x: number, a: number, b: number) => {
    const mv = (dy: number) => (run ? swap('y', r2(a - 0.25 + dy), r2(b - 0.25 + dy)) : '')
    return (
      rect(x, r2(a - 0.25), 1, 1.5, BARK, mv(0)) +
      rect(x, r2(a - 0.25), 1, 0.35, MOSS_LIGHT, mv(0)) +
      rect(r2(x + 0.4), r2(a + 0.3), 0.25, 0.8, BARK_DARK, mv(0.55))
    )
  }
  return run ? one(9.4, 5.5, 6.5) + one(19.3, 6.5, 5.5) : one(9.4, 6, 6) + one(19.3, 6, 6)
}

// 잎사귀 로브(40~): 몸 아래쪽을 덮고 아랫단이 잎 끝처럼 뾰족하다. 어깨에 큰 잎, 덩굴 허리끈
const smallRobe = (t: number) => {
  if (t < 4) return ''
  const [c, d, l] = robeColors(t)
  return (
    rect(10.8, 6.2, 8.4, 3.1, c!) +
    rect(10.8, 6.2, 8.4, 0.3, l!) +
    [11.0, 12.7, 14.4, 16.1, 17.8].map(x => rect(x, 9.3, 1.2, 0.35, c!) + rect(r2(x + 0.35), 9.65, 0.5, 0.3, c!)).join('') +
    [
      [11.6, 7],
      [17.2, 7],
      [12.6, 8.6],
      [16.2, 8.6],
    ]
      .map(([x, y]) => rect(x!, y!, 0.8, 0.35, d!) + rect(r2(x! + 0.25), r2(y! - 0.25), 0.3, 0.25, d!))
      .join('') +
    rect(10.8, 7.85, 8.4, 0.35, t >= 8 ? GOLD : BARK) +
    rect(14.55, 7.75, 0.9, 0.55, t >= 8 ? GOLD_LIGHT : BARK_LIGHT) +
    // 어깨의 큰 잎 (바깥으로 뾰족)
    rect(9.9, 5, 1.6, 0.8, c!) +
    rect(9.4, 5.25, 0.6, 0.45, c!) +
    rect(10.2, 5, 0.9, 0.3, l!) +
    rect(18.5, 5, 1.6, 0.8, c!) +
    rect(20, 5.25, 0.6, 0.45, c!) +
    rect(18.9, 5, 0.9, 0.3, l!) +
    (t >= 8 ? flower(12.3, 6.9, 0.9, PINK) + flower(17.6, 8.6, 0.9, PINK) + flower(15.6, 6.95, 0.8, PETAL_WHITE) + flower(11.5, 8.7, 0.8, PETAL_WHITE) : '')
  )
}

// 이끼 망토(50~): 등 뒤로 늘어진 이끼 덩어리. 얼룩이 지고 끝단이 들쭉날쭉, 80부터 꽃이 핀다
const smallCloak = (t: number) =>
  t < 5
    ? ''
    : rect(10, 3.6, 10, 6.4, MOSS) +
      rect(7.4, 4, 2.8, 5.2, MOSS, swap('height', 5.2, 4.2)) +
      rect(5.6, 4.7, 2, 3.6, MOSS, swap('height', 3.6, 2.6)) +
      rect(7.7, 9.2, 0.6, 0.4, MOSS, swap('y', 9.2, 8.2)) +
      rect(9.1, 9.2, 0.5, 0.3, MOSS_DARK, swap('y', 9.2, 8.2)) +
      rect(5.9, 8.3, 0.5, 0.4, MOSS, swap('y', 8.3, 7.3)) +
      rect(10, 3.6, 1, 0.4, MOSS_LIGHT) +
      rect(8, 4.5, 0.6, 0.5, MOSS_LIGHT) +
      rect(6.2, 5.3, 0.5, 0.5, MOSS_LIGHT) +
      rect(8.9, 6.6, 0.5, 0.5, MOSS_DARK) +
      rect(7.6, 7.4, 0.5, 0.4, MOSS_DARK) +
      (t >= 8 ? flower(8.6, 5.6, 0.9, PINK) + flower(6.6, 6.6, 0.7, PINK_LIGHT) : '')

// 꽃 핀 나무 지팡이(60~): 오른손에 쥔 긴 지팡이, 꼭대기는 굽은 옹이에 분홍 꽃과 잎.
// 90부터 생명의 지팡이: 가지가 감싼 초록 구슬이 빛난다. 달릴 때만 팔과 같이 흔든다 (쉴 때는 짚고 선다)
const smallStaff = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const run = pose === 'run'
  const head =
    t >= 9
      ? `<g opacity="0.3">${glow('1.2s')}${rect(19.4, -1.1, 2.8, 1.2, LIFE)}${rect(20.2, -2, 1.2, 3, LIFE)}</g>` +
        rect(19.7, -0.6, 0.45, 1.6, BARK) +
        rect(21.45, -0.6, 0.45, 1.6, BARK) +
        rect(19.9, 0.6, 1.8, 0.5, BARK) +
        rect(20.35, -1.45, 0.9, 1.8, LIFE_DEEP) +
        rect(20.15, -1.25, 1.3, 1.4, LIFE_DEEP) +
        rect(20.35, -1.25, 0.9, 1.4, LIFE) +
        `<g opacity="0.3">${glow('1.2s')}${rect(20.35, -1.25, 0.9, 1.4, LIFE_LIGHT)}</g>` +
        rect(20.45, -1.1, 0.35, 0.35, '#FFFFFF') +
        flower(19.6, -1.3, 0.8, PINK) +
        flower(22.0, -0.4, 0.8, PINK)
      : rect(20.1, 0.1, 1.3, 0.8, BARK) +
        rect(21.2, 0.45, 0.55, 0.9, BARK) +
        rect(20.1, 0.1, 1.3, 0.25, BARK_LIGHT) +
        rect(19.3, 0.75, 0.9, 0.45, LEAF) +
        rect(21.7, 1.2, 0.8, 0.45, LEAF_LIGHT) +
        flower(20.4, -0.25, 1.1, PINK) +
        (t >= 8 ? flower(21.7, -0.1, 0.8, PETAL_WHITE) : '')
  return (
    '<g>' +
    (run ? handSwing : '') +
    rect(20.45, 0.8, 0.6, 9.6, BARK) +
    rect(20.45, 0.8, 0.2, 9.6, BARK_LIGHT) +
    rect(21.05, 3.2, 0.4, 0.3, BARK) +
    rect(21.3, 2.8, 0.6, 0.4, LEAF) +
    head +
    // 지팡이를 쥔 주먹
    rect(20.2, run ? 6.45 : 5.95, 1, 1.05, ORANGE) +
    '</g>'
  )
}

// 레벨 90~: 머리 위 초록 후광, 반짝이는 꽃가루와 흩날리는 꽃잎 (큰 그림도 같이 쓴다)
// 꽃잎은 2.4초 동안 (dx, dy)만큼 비스듬히 떨어지며 나타났다 사라진다 (사라진 뒤 제자리로 돌아가 이음매가 안 보인다)
const petal = (x: number, y: number, s: number, dx: number, dy: number, begin: string, color: string) =>
  `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.4s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy}" dur="2.4s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(x, y, s, r2(s * 0.7), color) +
  '</g>'
const pollen = (x: number, y: number, s: number, begin: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(r2(x - s * 0.15), r2(y - s / 2), r2(s * 0.3), s, POLLEN) +
  rect(r2(x - s / 2), r2(y - s * 0.15), s, r2(s * 0.3), POLLEN) +
  '</g>'
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, -1.8, 2.6, 0.55, 0.4, t, LIFE) +
      pollen(7, 1.2, 1.2, '0s') +
      pollen(22.8, 3.5, 1.2, '0.8s') +
      petal(6.4, 3, 0.5, -0.6, 2.4, '0s', PINK) +
      petal(22.6, 0.6, 0.5, -0.8, 2.6, '1.2s', PINK_LIGHT)

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallCloak(t),
    boot: boot(t),
    body: smallRobe(t),
    head: smallHead(t),
    hand: smallBracers(t, pose) + smallStaff(t, pose),
    over: smallGlory(t),
  })

// 잎 뭉치를 날린다: 두 장면을 번갈아 그려 빙글빙글 돌고, 몬스터에 닿으면 잎이 사방으로 터진다
const hit = (t: number) => {
  if (t >= 10) return ''
  const s = t >= 9 ? 1.6 : 1.3
  const z = (v: number) => r2(v * s)
  // 잎 넷이 + 모양 / × 모양
  const leafA =
    rect(z(-0.3), z(-1.3), z(0.6), z(1), LEAF_LIGHT) +
    rect(z(0.3), z(-0.3), z(1), z(0.6), LEAF) +
    rect(z(-0.3), z(0.3), z(0.6), z(1), LEAF_LIGHT) +
    rect(z(-1.3), z(-0.3), z(1), z(0.6), LEAF)
  const leafB =
    rect(z(0.2), z(-0.8), z(0.5), z(0.5), LEAF) +
    rect(z(0.6), z(-1.2), z(0.5), z(0.5), LEAF) +
    rect(z(0.3), z(0.3), z(0.5), z(0.5), LEAF_LIGHT) +
    rect(z(0.7), z(0.7), z(0.5), z(0.5), LEAF_LIGHT) +
    rect(z(-0.7), z(0.3), z(0.5), z(0.5), LEAF) +
    rect(z(-1.1), z(0.7), z(0.5), z(0.5), LEAF) +
    rect(z(-0.8), z(-0.8), z(0.5), z(0.5), LEAF_LIGHT) +
    rect(z(-1.2), z(-1.2), z(0.5), z(0.5), LEAF_LIGHT)
  const spin = (a: string, b: string) =>
    `<g><animate attributeName="opacity" values="1;0" dur="0.16s" calcMode="discrete" repeatCount="indefinite"/>${a}</g>` +
    `<g opacity="0"><animate attributeName="opacity" values="0;1" dur="0.16s" calcMode="discrete" repeatCount="indefinite"/>${b}</g>`
  const thorn = rect(z(-0.3), z(-0.3), z(0.6), z(0.6), BARK) + rect(z(-0.1), z(-0.1), z(0.2), z(0.2), BARK_LIGHT)
  const shot =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.44;0.6" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="16 7;16 7;25 7;25 7" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.45">${rect(-3.6, -0.15, 2.2, 0.3, LEAF_LIGHT)}${rect(-4.4, 0.45, 1.6, 0.25, LEAF_LIGHT)}</g>` +
    `<g opacity="0.7">${rect(-2.6, 0.3, 0.7, 0.45, LEAF_LIGHT)}${rect(-3.5, -0.7, 0.6, 0.4, LEAF)}${t >= 9 ? rect(-4.3, 0.2, 0.5, 0.35, PINK) : ''}</g>` +
    (t >= 9 ? `<g opacity="0.3">${glow('0.3s')}${rect(-2.2, -1, 4.4, 2, LIFE)}${rect(-1, -2.2, 2, 4.4, LIFE)}</g>` : '') +
    spin(leafA, leafB) +
    thorn +
    '</g>'
  const scatter = (dx: number, dy: number, w: number, h: number, color: string) =>
    rect(
      r2(27 - w / 2),
      r2(7 - h / 2),
      w,
      h,
      color,
      `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${dx} ${dy};${dx} ${dy}" keyTimes="0;0.6;0.72;1" dur="${ATK}" repeatCount="indefinite"/>`,
    )
  const burst =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.66;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.5">${rect(25.4, 5.4, 3.2, 3.2, LIFE)}</g>` +
    rect(26.3, 5, 1.4, 4, LIFE_LIGHT) +
    rect(25, 6.3, 4, 1.4, LIFE_LIGHT) +
    rect(26.6, 6.6, 0.8, 0.8, '#FFFFFF') +
    scatter(-2.6, -2.2, 1, 0.6, LEAF_LIGHT) +
    scatter(2.4, -2.6, 1, 0.6, LEAF) +
    scatter(3.4, 0.4, 1, 0.6, LEAF_LIGHT) +
    scatter(-3, 1.4, 1, 0.6, LEAF) +
    scatter(0.6, 3, 0.7, 0.7, LEAF_LIGHT) +
    scatter(0.2, -3.2, 0.7, 0.7, LEAF) +
    scatter(-1.2, 2.8, 0.6, 0.4, BARK) +
    scatter(2.6, 2, 0.6, 0.4, BARK) +
    (t >= 9 ? scatter(-1.6, -3.4, 0.7, 0.5, PINK) + scatter(3.6, -1.4, 0.7, 0.5, PINK) + scatter(1.8, 2.8, 0.7, 0.5, PINK_LIGHT) + scatter(-3.4, -0.4, 0.7, 0.5, PINK_LIGHT) : '') +
    '</g>'
  return shot + burst
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 큰 잎 하나: 둥근 잎에 밝은 면
const bigLeaf = (x: number, y: number, c: string, l: string) => rect(x, y + 2, 12, 6, c) + rect(x + 2, y, 8, 10, c) + rect(x + 2, y + 2, 4, 3, l)

const BIG_WREATH: readonly [number, number][] = [
  [320, 30],
  [332, 25],
  [344, 29],
  [356, 24],
  [372, 29],
  [384, 24],
  [396, 29],
  [408, 30],
]
const bigWreath = (t: number) =>
  rect(324, 34, 92, 6, LEAF_DARK) +
  BIG_WREATH.map(([x, y], i) => bigLeaf(x, y, i % 2 ? LEAF : '#6BBF55', i % 2 ? LEAF_LIGHT : '#B4E896')).join('') +
  flower(350, 28, 16, PINK) +
  (t >= 8 ? flower(392, 29, 13, PETAL_WHITE) : '')

// 사슴뿔 (왼쪽): 바깥으로 휘며 올라가는 줄기, 안쪽 가지 하나, 바깥 짧은 가지 하나.
// 오른쪽은 x를 370 기준으로 뒤집는다. [x, y, 폭, 높이, 오른쪽에 그늘]
const BIG_ANTLER: readonly [number, number, number, number, boolean][] = [
  [340, 26, 6, 10, true],
  [335, 18, 7, 9, true],
  [330, 10, 7, 9, true],
  [326, 0, 6, 11, true],
  [327, -6, 4, 6, false],
  [339, 2, 5, 17, true],
  [340, -2, 3, 4, false],
  [320, 2, 7, 4, false],
  [319, -3, 3, 6, false],
]
const bigAntlers = () =>
  [false, true]
    .map(flip =>
      BIG_ANTLER.map(([x, y, w, h, shade]) => {
        const fx = flip ? 740 - x - w : x
        return rect(fx, y, w, h, ANTLER) + (shade ? rect(fx + w - 2, y, 2, h, ANTLER_DARK) : '')
      }).join(''),
    )
    .join('')

// 세계수 왕관: 금빛 띠 위로 금빛 줄기와 둥근 잎 덩어리. 잎 덩어리가 숨 쉬듯 밝아진다
const bigCanopy = (c: string) => rect(352, -2, 36, 10, c) + rect(356, -6, 28, 4, c) + rect(362, -9, 16, 3, c)
const bigWorldCrown = () =>
  rect(334, 24, 72, 7, GOLD) +
  rect(334, 24, 72, 2, GOLD_LIGHT) +
  [338, 352, 382, 396].map(x => rect(x, 17, 6, 7, GOLD)).join('') +
  rect(366, 6, 8, 18, GOLD_DARK) +
  rect(359, 8, 7, 3, GOLD_DARK) +
  rect(374, 6, 7, 3, GOLD_DARK) +
  bigCanopy(LIFE_DEEP) +
  `<g opacity="0.3">${glow('1.6s')}${bigCanopy(LIFE_LIGHT)}</g>` +
  rect(360, -6, 14, 5, LIFE) +
  rect(355, -1, 8, 4, LIFE) +
  rect(358, 3, 4, 4, GOLD) +
  rect(380, -4, 4, 4, GOLD) +
  rect(371, 1, 4, 4, GOLD)

const bigHead = (t: number) =>
  t < 1 ? '' : (t >= 7 ? bigAntlers() : '') + bigWreath(t) + (t >= 9 ? bigWorldCrown() : '')

const bigRobe = (t: number) => {
  if (t < 4) return ''
  const [c, d, l] = robeColors(t)
  return (
    rect(326, 70, 88, 28, c!) +
    rect(326, 70, 88, 3, l!) +
    [328, 344, 360, 376, 392, 404].map(x => rect(x, 98, 10, 3, c!) + rect(x + 3, 101, 4, 3, c!)).join('') +
    [
      [336, 77],
      [394, 77],
      [346, 91],
      [384, 91],
    ]
      .map(([x, y]) => rect(x!, y!, 10, 4, d!) + rect(x! + 3, y! - 3, 4, 3, d!))
      .join('') +
    rect(326, 84, 88, 4, t >= 8 ? GOLD : BARK) +
    rect(364, 82, 12, 8, t >= 8 ? GOLD_LIGHT : BARK_LIGHT) +
    rect(368, 84, 4, 4, t >= 8 ? GOLD_DARK : BARK_DARK) +
    // 어깨의 큰 잎
    rect(312, 54, 24, 10, c!) +
    rect(306, 57, 8, 5, c!) +
    rect(316, 55, 12, 3, l!) +
    rect(310, 59, 22, 2, d!) +
    rect(404, 54, 24, 10, c!) +
    rect(426, 57, 8, 5, c!) +
    rect(412, 55, 12, 3, l!) +
    rect(408, 59, 22, 2, d!) +
    (t >= 8
      ? flower(340, 79, 12, PINK) + flower(400, 92, 12, PINK) + flower(384, 76, 10, PETAL_WHITE) + flower(352, 93, 10, PETAL_WHITE) + flower(420, 56, 9, PINK)
      : '')
  )
}

const bigCloak = (t: number) =>
  t < 5
    ? ''
    : rect(316, 40, 108, 66, MOSS) +
      rect(424, 46, 16, 52, MOSS, flutter(52, 38)) +
      rect(440, 54, 10, 36, MOSS, flutter(36, 24)) +
      [318, 338, 358, 378, 398, 414].map((x, i) => rect(x, 106, 8, i % 2 ? 6 : 4, MOSS)).join('') +
      rect(318, 42, 8, 6, MOSS_LIGHT) +
      rect(426, 52, 6, 5, MOSS_LIGHT) +
      rect(432, 72, 5, 5, MOSS_DARK) +
      rect(442, 60, 5, 4, MOSS_LIGHT) +
      rect(318, 94, 6, 5, MOSS_DARK) +
      rect(412, 100, 6, 4, MOSS_LIGHT) +
      (t >= 8 ? flower(432, 62, 11, PINK) + flower(320, 100, 10, PINK_LIGHT) : '')

// 나무껍질 손목대: 이끼 낀 윗단과 껍질 결
const bigBracer = (x: number, y: number, w: number, h: number) =>
  rect(x, y, w, h, BARK) + rect(x, y, w, 4, MOSS_LIGHT) + rect(x + 4, y + 6, 2, h - 8, BARK_DARK) + rect(x + w - 5, y + 5, 2, h - 9, BARK_DARK)
// 왼팔(가리키는 팔)의 손목대는 가리키는 팔과 똑같이 움직인다
const POKE =
  '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>'
const bigLeftBracer = (t: number) => (t < 3 ? '' : `<g>${POKE}${bigBracer(300, 62, 16, 18)}</g>`)

// 지팡이 머리: 60~ 굽은 옹이에 꽃과 잎, 90~ 가지가 감싼 생명의 구슬 (cx: 지팡이 가운데, y: 꼭대기)
const bigStaffHead = (t: number, cx: number, y: number) =>
  t >= 9
    ? `<g opacity="0.3">${glow('1.2s')}${rect(cx - 18, y + 2, 36, 16, LIFE)}${rect(cx - 9, y - 7, 18, 34, LIFE)}</g>` +
      rect(cx - 14, y + 4, 5, 18, BARK) +
      rect(cx + 9, y + 4, 5, 18, BARK) +
      rect(cx - 12, y + 20, 24, 6, BARK) +
      rect(cx - 6, y, 12, 20, LIFE_DEEP) +
      rect(cx - 9, y + 3, 18, 14, LIFE_DEEP) +
      rect(cx - 6, y + 3, 12, 14, LIFE) +
      `<g opacity="0.3">${glow('1.2s')}${rect(cx - 6, y + 3, 12, 14, LIFE_LIGHT)}</g>` +
      rect(cx - 4, y + 4, 4, 4, '#FFFFFF') +
      flower(cx - 14, y + 2, 12, PINK) +
      flower(cx + 15, y + 8, 11, PINK) +
      flower(cx + 2, y - 4, 9, PETAL_WHITE) +
      bigLeaf(cx + 6, y + 22, LEAF, LEAF_LIGHT)
    : rect(cx - 8, y + 6, 16, 8, BARK) +
      rect(cx + 4, y + 10, 6, 12, BARK) +
      rect(cx - 8, y + 6, 16, 2, BARK_LIGHT) +
      rect(cx - 14, y + 12, 8, 5, BARK_DARK) +
      bigLeaf(cx + 7, y + 16, LEAF, LEAF_LIGHT) +
      bigLeaf(cx - 22, y + 12, LEAF, LEAF_LIGHT) +
      flower(cx - 4, y + 2, 14, PINK) +
      flower(cx + 11, y + 4, 10, PINK_LIGHT) +
      (t >= 8 ? flower(cx - 14, y + 6, 9, PETAL_WHITE) : '')

// 오른팔과 지팡이: 끝·대기는 지팡이를 높이 들고, 오류는 축 늘어진 손 뒤로 지팡이가 기운다
// (지팡이를 먼저 그려 손이 지팡이를 쥔 것처럼 덮게 한다)
const bigArm = (variant: BigVariant, t: number) => {
  const shaft = (x: number, top: number, bottom: number) =>
    rect(x, top, 7, bottom - top, BARK) + rect(x, top, 2, bottom - top, BARK_LIGHT) + rect(x + 5, top, 2, bottom - top, BARK_DARK)
  if (variant === 'error') {
    return (
      (t >= 6 ? shaft(420, 58, 136) + rect(427, 104, 4, 3, BARK) + bigLeaf(429, 98, LEAF, LEAF_LIGHT) + bigStaffHead(t, 423, 40) : '') +
      rightArm(variant) +
      (t >= 3 ? bigBracer(413, 76, 14, 14) : '')
    )
  }
  return (
    (t >= 6 ? shaft(419, -2, 104) + rect(426, 70, 4, 3, BARK) + bigLeaf(429, 64, LEAF, LEAF_LIGHT) + bigStaffHead(t, 422, -20) : '') +
    rightArm(variant) +
    (t >= 3 ? bigBracer(414, 48, 14, 14) : '')
  )
}

const bigGlory = (t: number) =>
  t < 9
    ? ''
    : halo(370, -23, 30, 5, 4, t, LIFE) +
      pollen(298, 5, 14, '0.3s') +
      pollen(450, 63, 14, '1.1s') +
      petal(300, 20, 6, -8, 26, '0s', PINK) +
      petal(446, 14, 6, -10, 28, '1.2s', PINK_LIGHT)

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigCloak(t),
    boot: boot(t),
    body: bigRobe(t),
    head: bigHead(t),
    arm: bigArm(variant, t),
    over: bigLeftBracer(t) + bigGlory(t),
  })

export const druid: Job = {
  key: 'druid',
  name: '드루이드',
  icon: '🌿',
  gear: [
    '',
    '잎사귀 화관',
    '덩굴 신발',
    '나무껍질 손목대',
    '잎사귀 로브',
    '이끼 망토',
    '꽃 핀 나무 지팡이',
    '사슴뿔 관',
    '꽃 피는 생명의 로브',
    '세계수 왕관·초록 후광·생명의 지팡이',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : t >= 6 ? 4 : 0),
  bigHeadroom: t => (t >= 9 ? 40 : t >= 6 ? 32 : 0),
}
