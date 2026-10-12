// 메카닉 (로봇 탑승): 용접 고글 → 꼬마 보행 로봇(20부터 올라탄다!) → 작업 장갑 → 멜빵 작업복
// → 공구 배낭(로봇 등에 단 공구함과 안테나) → 로봇 팔 캐논 → 강화 메카 조종석(더 큰 몸통·굴뚝·긴 다리)
// → 황금 메카 외장 → 왕관·후광·거대 메카(빛나는 코어) → 무지개 후광. 로봇은 단계마다 같이 자란다
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  STEP,
  WHITE,
  bigClawd,
  glow,
  halo,
  rect as rawRect,
  rightArm,
  smallArm,
  smallClawd,
  sparkle,
} from '../pixel.ts'
import type { BigVariant, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

// 좌표를 더하고 빼며 생기는 소수 찌꺼기(0.30000000000000004 같은)를 덜어 낸다
const n = (v: number) => Math.round(v * 1000) / 1000
const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') => rawRect(n(x), n(y), n(w), n(h), fill, inner)

const STEEL = '#A7B1BC'
const STEEL_LIGHT = '#DCE2E8'
const STEEL_DARK = '#6C7785'
const IRON = '#39414C'
const HAZARD = '#F7B81B'
const DENIM = '#2E5C9A'
const DENIM_DARK = '#1E3F6E'
const DENIM_LIGHT = '#5A88C6'
const STRAP = '#4A3426'
const BRASS = '#C99A3A'
const BRASS_DARK = '#8C6A22'
const LENS = '#3CC6B4'
const TOOLBOX = '#D0402F'
const TOOLBOX_DARK = '#8E2A1F'
const RED = '#EF4444'
const GREEN = '#22C55E'
const SMOKE = '#B8BFC7'
const LAMP = '#FFF2A8'
const CORE = '#5EEAD4'
const CORE_LIGHT = '#E6FFFA'
const FIRE = '#FB923C'
const FIRE_DARK = '#EA580C'
const LASER = '#F43F5E'

// 메카 철판 [바탕, 밝은 면, 그늘]: 80부터 황금 도금
const plates = (t: number) => (t >= 8 ? [GOLD, GOLD_LIGHT, GOLD_DARK] : [STEEL, STEEL_LIGHT, STEEL_DARK])

// 작업 장갑(30~): 노란 가죽 장갑. 20부터는 로봇에 올라타 Claude의 다리가 안 보여 작업화가 없다
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: '#F2C230', shine: '#FFE9A0' } : undefined)

// 20부터 Claude가 로봇에 올라타 올라가는 높이 (작은 그림 칸). 70의 강화 조종석은 더 높고, 90의 거대 메카는 조금 더 높다
const rise = (t: number) => (t >= 9 ? 2.2 : t >= 7 ? 2 : t >= 2 ? 1.5 : 0)

// 노랑·검정 경고 줄무늬 띠: 바탕에 step 간격으로 다른 색 칸을 놓는다 (끝에서 잘린다)
const hazard = (x: number, y: number, w: number, h: number, step: number, base = HAZARD, mark = INK) =>
  rect(x, y, w, h, base) +
  Array.from({ length: Math.ceil(w / (step * 2)) }, (_, i) => x + step * (2 * i + 1))
    .filter(bx => bx < x + w)
    .map(bx => rect(bx, y, Math.min(step, x + w - bx), h, mark))
    .join('')

// 80부터 황금 메카라 노란 줄무늬 대신 검정 바탕에 밝은 금줄
const band = (t: number, x: number, y: number, w: number, h: number, step: number) =>
  t >= 8 ? hazard(x, y, w, h, step, INK, GOLD_LIGHT) : hazard(x, y, w, h, step)

// 배기구 연기: 뻐끔뻐끔 피어올라 흩어진다
const puff = (x: number, y: number, size: number, dx: number, dy: number, begin: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0.9;0" dur="1.2s" begin="${begin}" repeatCount="indefinite"/>` +
  `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy}" dur="1.2s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(x, y, size, size, SMOKE) +
  '</g>'

// 안테나·계기판 불빛 깜빡임
const beacon = (dur = '0.9s') => `<animate attributeName="opacity" values="1;0.25;1" dur="${dur}" repeatCount="indefinite"/>`

// ── 작은 그림 ─────────────────────────────────────────────────────
// 20부터는 Claude가 로봇에 올라타 rise만큼 올라간다. 로봇 몸통(받침·조종석)·배낭·캐논은 Claude와 같이 들썩이고,
// 로봇 다리는 Claude 묶음 밖(바깥 좌표)에 그려 땅을 딛고 번갈아 걷는다

// 머리: 이마에 올려 쓴 용접 고글(10~). 90부터 고글 위에 작은 왕관
const smallHead = (t: number) => {
  if (t < 1) return ''
  const lens = (x: number) =>
    rect(x + 0.2, 2.1, 1.8, 1.8, BRASS) + rect(x, 2.3, 2.2, 1.4, BRASS) + rect(x + 0.4, 2.5, 1.4, 1, LENS) + rect(x + 0.5, 2.55, 0.5, 0.35, WHITE)
  const crown =
    t >= 9
      ? rect(12.8, 1.4, 4.4, 0.8, GOLD) +
        rect(12.8, 1, 0.8, 0.5, GOLD) +
        rect(14.6, 0.8, 0.8, 0.7, GOLD) +
        rect(16.4, 1, 0.8, 0.5, GOLD) +
        rect(14.75, 1.55, 0.5, 0.45, RED)
      : ''
  return crown + rect(10.8, 3, 8.4, 0.6, STRAP) + rect(10.3, 2.9, 0.8, 0.8, STRAP) + lens(12.3) + lens(15.5) + rect(14.5, 2.7, 1, 0.4, BRASS_DARK)
}

// 멜빵 작업복(40~): 멜빵 두 줄, 가슴판, 금단추, 가슴 주머니
const smallOveralls = (t: number) =>
  t < 4
    ? ''
    : rect(12, 3, 0.7, 3.6, DENIM) +
      rect(17.3, 3, 0.7, 3.6, DENIM) +
      rect(12.4, 6.4, 5.2, 1.2, DENIM) +
      rect(11, 7.4, 8, 1.6, DENIM) +
      rect(11, 7.4, 8, 0.25, DENIM_LIGHT) +
      rect(12.05, 6.15, 0.6, 0.6, GOLD) +
      rect(17.35, 6.15, 0.6, 0.6, GOLD) +
      rect(14.1, 6.7, 1.8, 0.8, DENIM_DARK) +
      rect(14.1, 6.7, 1.8, 0.2, DENIM_LIGHT)

// 공구 배낭(50~): 로봇 등에 쇠 받침대로 단 빨간 공구함, 삐죽 나온 렌치, 깜빡이는 안테나
const smallPack = (t: number) =>
  t < 5
    ? ''
    : rect(9.5, 7.6, 0.6, 1.5, STEEL_DARK) +
      rect(9.5, 8.6, 1.6, 0.5, STEEL_DARK) +
      rect(9.6, 8.65, 0.35, 0.35, IRON) +
      rect(10, 0.9, 0.3, 3, STEEL_DARK) +
      rect(9.7, 0.3, 0.9, 0.9, RED, beacon()) +
      rect(8.6, 2.1, 0.35, 0.7, STEEL_DARK) +
      rect(9.2, 2.1, 0.35, 0.7, STEEL_DARK) +
      rect(8.6, 2.6, 0.95, 0.4, STEEL_DARK) +
      rect(8.9, 2.9, 0.4, 0.9, STEEL_DARK) +
      rect(8.2, 3.6, 3.4, 0.7, TOOLBOX_DARK) +
      rect(8.4, 4.2, 3, 3.6, TOOLBOX) +
      rect(8.4, 6.3, 3, 0.5, HAZARD) +
      rect(8.8, 4.7, 0.9, 0.6, STEEL_LIGHT)

// 메카 굴뚝(70~): 강화 조종석 뒤에 선 굴뚝에서 연기가 뻐끔
const smallExhaust = (t: number) =>
  t < 7
    ? ''
    : rect(8, 8.5, 2.4, 0.6, IRON) +
      rect(7.5, 6.9, 0.9, 2.2, STEEL_DARK) +
      rect(7.5, 6.9, 0.3, 2.2, IRON) +
      rect(7.3, 6.55, 1.3, 0.45, IRON) +
      puff(7.4, 5.7, 0.8, -1, -2.2, '0s') +
      puff(7.5, 5.9, 0.6, -0.4, -2.6, '0.6s')

// 꼬마 보행 로봇의 몸통(20~60): Claude가 걸터앉는 납작한 철판 받침, 경고 줄무늬, 앞쪽 전조등과 상태 불빛
const smallSeat = (t: number) => {
  if (t < 2 || t >= 7) return ''
  const [c, l, d] = plates(t)
  return (
    rect(10.6, 8.6, 8.8, 1.3, c!) +
    rect(10.6, 8.6, 0.4, 1.3, d!) +
    rect(10.3, 8.3, 9.4, 0.45, l!) +
    band(t, 11, 8.85, 8.4, 0.5, 0.6) +
    rect(11.2, 9.9, 7.6, 0.3, d!) +
    rect(16.9, 9.45, 0.45, 0.35, GREEN) +
    rect(17.6, 9.45, 0.45, 0.35, RED, beacon('0.7s')) +
    rect(19.2, 8.5, 0.4, 1.2, d!) +
    rect(19.5, 8.7, 0.5, 0.75, LAMP)
  )
}

// 강화 메카 조종석(70~): Claude 허리를 감싸는 둥근 철판 통, 경고 줄무늬, 계기판 불빛, 앞쪽 전조등.
// 90은 더 넓고 가운데 코어가 빛난다
const smallHull = (t: number) => {
  if (t < 7) return ''
  const [c, l, d] = plates(t)
  const giant = t >= 9
  const x0 = giant ? 9.8 : 10.3
  const w = giant ? 10.4 : 9.4
  return (
    rect(x0, 7.8, w, 2, c!) +
    rect(x0 + 0.5, 9.7, w - 1, 0.5, d!) +
    rect(x0, 7.8, 0.45, 2, d!) +
    rect(x0 - 0.3, 7.3, w + 0.6, 0.6, l!) +
    band(t, x0, 8.5, w, 0.6, 0.6) +
    rect(x0 + 0.8, 9.25, 0.35, 0.3, d!) +
    rect(x0 + w - 1.1, 9.25, 0.35, 0.3, d!) +
    rect(x0 + w - 2.4, 7.95, 0.45, 0.4, GREEN) +
    rect(x0 + w - 1.7, 7.95, 0.45, 0.4, RED, beacon('0.7s')) +
    rect(x0 + w - 0.1, 7.9, 0.6, 0.8, LAMP) +
    (giant
      ? // 가운데에서 숨 쉬는 코어
        rect(14, 7.9, 2, 1.7, IRON) +
        rect(14.3, 8.15, 1.4, 1.2, CORE) +
        rect(14.3, 8.15, 1.4, 1.2, CORE_LIGHT, glow('0.9s')) +
        rect(14.65, 8.45, 0.6, 0.55, WHITE)
      : '')
  )
}

// 로봇 다리(20~): 허벅지 → 무릎 관절 → 정강이 → 노란 발. 달릴 때 번갈아 발을 든다 (바깥 좌표).
// 꼬마 로봇은 짧고 가늘며, 70부터 조종석이 높아지는 만큼 길어지고 90은 더 굵다
const mechLegs = (t: number, pose: Pose) => {
  const [c, l, d] = plates(t)
  const top = 10.2 - rise(t)
  const w = t >= 9 ? 2.5 : t >= 7 ? 2.2 : 1.8
  const foot = t >= 8 ? GOLD_DARK : HAZARD
  const leg = (x: number) =>
    rect(x + 0.5, top - 1, w - 1, 1.4, IRON) +
    rect(x, top + 0.1, w, 1, c!) +
    rect(x, top + 0.1, 0.45, 1, l!) +
    rect(x + 0.3, top + 1.05, w - 0.6, 0.5, IRON) +
    rect(x + w / 2 - 0.2, top + 1.15, 0.4, 0.3, STEEL_LIGHT) +
    rect(x + 0.15, top + 1.5, w - 0.3, 10.7 - top - 1.5, d!) +
    rect(x - 0.4, 10.6, w + 1, 0.8, foot) +
    rect(x - 0.4, 11.15, w + 1, 0.25, IRON) +
    rect(x + w, 10.6, 0.6, 0.55, IRON)
  const [a, b] = t >= 9 ? [10.4, 17.1] : t >= 7 ? [10.9, 16.9] : [11.4, 16.8]
  if (pose === 'stand') return leg(a) + leg(b)
  const step = (p: string, q: string) =>
    `<animateTransform attributeName="transform" type="translate" values="${p};${q}" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`
  return `<g>${step('0 0', '0.3 -0.6')}${leg(a)}</g><g>${step('0.3 -0.6', '0 0')}${leg(b)}</g>`
}

// 로봇 팔 캐논(60~): 오른팔을 강철 팔과 대포로 바꾼다 (왼팔은 직접 그린다). 90부터 에너지 줄과 포구가 빛난다
const smallCannon = (t: number, pose: Pose) => {
  if (t < 6) return ''
  const [c, l, d] = plates(t)
  const legend = t >= 9
  const left = pose === 'run' ? smallArm(9, 5.5, 6.5, 9, glove(t)) : smallArm(9, 6, 6, 9, glove(t))
  return (
    left +
    '<g>' +
    `<animateTransform attributeName="transform" type="translate" values="0 0.3;0 -0.3" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>` +
    rect(18.6, 5, 1.5, 2, IRON) +
    rect(19.9, 5.4, 0.6, 1.2, d!) +
    rect(20.3, 4.4, 2.3, 2.6, c!) +
    rect(20.3, 4.4, 2.3, 0.45, l!) +
    rect(20.3, 6.6, 2.3, 0.4, d!) +
    rect(20.9, 4.4, 0.5, 2.6, legend ? CORE : t >= 8 ? INK : HAZARD) +
    rect(22.6, 4.9, 0.9, 1.6, IRON) +
    rect(23.1, 5.2, 0.4, 1, legend ? CORE_LIGHT : '#1F2329') +
    (legend
      ? // 빛나는 에너지 줄과 포구
        rect(20.9, 4.4, 0.5, 2.6, CORE_LIGHT, glow()) + rect(22.6, 4.6, 0.9, 2.2, CORE, glow())
      : '') +
    '</g>'
  )
}

// 레벨 90~: 머리 위 후광과 반짝이 (조종석 묶음 안이라 rise만큼 아래 좌표로 그린다)
const smallGlory = (t: number) =>
  t < 9
    ? ''
    : halo(15, n(-1.95 + rise(t)), 2.9, 0.35, 0.3, t) +
      [[6.4, 2.6, '0s'], [22.8, 3.2, '0.8s']]
        .map(
          ([x, y, b]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect((x as number) - 0.2, (y as number) - 0.7, 0.4, 1.4, GOLD) +
            rect((x as number) - 0.7, (y as number) - 0.2, 1.4, 0.4, GOLD) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) => {
  const figure = smallClawd(pose, {
    back: smallPack(t) + smallExhaust(t),
    body: smallOveralls(t) + smallSeat(t) + smallHull(t),
    head: smallHead(t),
    glove: glove(t),
    hand: smallCannon(t, pose),
    over: smallGlory(t),
    ...(t >= 2 ? { legsOverride: '' } : {}),
    ...(t >= 6 ? { hideArms: true } : {}),
  })
  return t < 2 ? figure : mechLegs(t, pose) + `<g transform="translate(0 ${-rise(t)})">${figure}</g>`
}

// ── 공격 ─────────────────────────────────────────────────────────
// 원거리: 0.44~0.6에 날아가 0.6에 몬스터를 맞히고, 0.6~0.72에 맞은 자리가 번쩍인다. 레벨 100은 효과가 없다

// from~to 동안만 보이는 묶음
const during = (from: number, to: number, inner: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${from};${to}" calcMode="discrete" dur="${ATK}" repeatCount="indefinite"/>` +
  inner +
  '</g>'

// 0.44에 (x0, y0)에서 떠나 0.6에 (x1, y1)에 닿는다. mid가 있으면 그 점을 거쳐 포물선처럼
const flight = (x0: number, y0: number, x1: number, y1: number, inner: string, mid?: [number, number]) =>
  during(
    0.44,
    0.6,
    '<g>' +
      `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};` +
      (mid ? `${mid[0]} ${mid[1]};` : '') +
      `${x1} ${y1};${x1} ${y1}" keyTimes="0;0.44;${mid ? '0.52;' : ''}0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
      inner +
      '</g>',
  )

// 맞은 자리의 번쩍임: 앞 절반은 큰 별, 뒤 절반은 사방으로 튀는 불티
const burst = (cx: number, cy: number, s: number, core: string, ray: string) =>
  during(
    0.6,
    0.66,
    rect(cx - s * 0.25, cy - s, s * 0.5, s * 2, ray) +
      rect(cx - s, cy - s * 0.25, s * 2, s * 0.5, ray) +
      rect(cx - s * 0.5, cy - s * 0.5, s, s, ray) +
      rect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, core) +
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => rect(cx + dx! * s * 0.75 - s * 0.17, cy + dy! * s * 0.75 - s * 0.17, s * 0.34, s * 0.34, ray)).join(''),
  ) +
  during(
    0.66,
    0.72,
    [[-1.35, 0], [1.35, 0], [0, -1.35], [0, 1.35], [-1, -1], [1, -1], [-1, 1], [1, 1]]
      .map(([dx, dy]) => rect(cx + dx! * s - s * 0.16, cy + dy! * s - s * 0.16, s * 0.32, s * 0.32, ray))
      .join('') + rect(cx - s * 0.2, cy - s * 0.2, s * 0.4, s * 0.4, core),
  )

// 빙글빙글 도는 렌치 (가운데가 원점)
const spinningWrench =
  '<g>' +
  `<animateTransform attributeName="transform" type="rotate" values="0;0;720;720" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
  rect(-1.1, -0.3, 2, 0.6, STEEL_DARK) +
  rect(-1.1, -0.3, 2, 0.2, STEEL_LIGHT) +
  rect(0.7, -0.85, 0.6, 1.7, STEEL_DARK) +
  rect(1.2, -0.85, 0.6, 0.55, STEEL_DARK) +
  rect(1.2, 0.3, 0.6, 0.55, STEEL_DARK) +
  rect(-1.7, -0.55, 0.75, 1.1, STEEL_DARK) +
  rect(-1.5, -0.15, 0.35, 0.3, STEEL_LIGHT) +
  '</g>'

const hit = (t: number) => {
  if (t >= 10) return ''
  // 전투 좌표 = 작은 그림 칸 - rise + (-5, 2)
  const r = rise(t)
  if (t < 6) {
    // 로봇 위에서 렌치를 던져 땡!
    return flight(16.4, n(7.6 - r), 25.6, 7.4, spinningWrench, [21, n(5.2 - r)]) + burst(26, 7.3, 1.5, WHITE, GOLD)
  }
  // 팔 캐논의 포구에서 쏜다
  const y = n(5.7 - r + 2)
  const muzzle = during(0.44, 0.5, rect(18.4, y - 0.8, 1, 1.6, GOLD_LIGHT) + rect(18.9, y - 0.35, 1, 0.7, WHITE))
  // 강화 조종석(70~)은 전조등에서도 레이저를 같이 쏜다
  const ly = n(8.3 - r + 2)
  const laser =
    t >= 7
      ? during(0.44, 0.48, rect(14.9, ly - 0.6, 1.2, 1.2, LAMP)) +
        flight(16.4, ly, 25, 8.6, rect(-3, -0.3, 1.2, 0.6, '#FDA4AF') + rect(-2, -0.5, 4, 1, LASER) + rect(-1.6, -0.2, 3.4, 0.4, WHITE))
      : ''
  if (t >= 9) {
    // 전설의 캐논: 꼬리를 끄는 커다란 플라스마 덩어리
    return (
      muzzle +
      laser +
      flight(19.6, y, 25.4, 7.4, rect(-2.6, -0.3, 1.6, 0.6, CORE) + rect(-1.2, -0.6, 1, 1.2, CORE) + rect(-0.5, -0.9, 1.8, 1.8, CORE) + rect(-0.2, -0.5, 1.1, 1, CORE_LIGHT)) +
      burst(26.4, 7.4, 1.9, CORE_LIGHT, CORE)
    )
  }
  // 포탄: 불꼬리를 단 둥근 탄
  return (
    muzzle +
    laser +
    flight(19.6, y, 25.4, 7.6, rect(-2, -0.25, 1.2, 0.5, GOLD_LIGHT) + rect(-0.9, -0.55, 1.6, 1.1, FIRE_DARK) + rect(-0.6, -0.75, 1.2, 1.5, FIRE) + rect(-0.3, -0.4, 0.5, 0.4, GOLD_LIGHT)) +
    burst(26.2, 7.6, 1.7, GOLD_LIGHT, FIRE)
  )
}

// ── 큰 그림 ───────────────────────────────────────────────────────
// 큰 그림은 왼팔이 말풍선을 가리켜야 해서 Claude를 올리지 않는다. 20부터 Claude 다리 대신 꼬마 로봇의
// 받침과 짧은 다리가 몸 아래를 받치고, 70부터는 강화 조종석이 몸 아래쪽을 감싸며 긴 다리가 땅(y 120)까지 내려간다

const bigHead = (t: number) => {
  if (t < 1) return ''
  const lens = (x: number) =>
    rect(x + 2, 20, 22, 22, BRASS) + rect(x, 22, 26, 18, BRASS) + rect(x + 5, 26, 16, 10, LENS) + rect(x + 7, 28, 5, 3, WHITE) + rect(x + 2, 40, 22, 2, BRASS_DARK)
  const crown =
    t >= 9
      ? rect(344, 8, 52, 12, GOLD) +
        rect(344, 0, 9, 9, GOLD) +
        rect(365, -6, 10, 15, GOLD) +
        rect(387, 0, 9, 9, GOLD) +
        rect(367, 0, 6, 6, RED) +
        rect(348, 11, 5, 5, CORE) +
        rect(387, 11, 5, 5, CORE)
      : ''
  return crown + rect(326, 34, 88, 8, STRAP) + rect(320, 32, 10, 12, STRAP) + lens(340) + lens(374) + rect(366, 29, 8, 5, BRASS_DARK)
}

const bigOveralls = (t: number) =>
  t < 4
    ? ''
    : rect(334, 36, 8, 40, DENIM) +
      rect(398, 36, 8, 40, DENIM) +
      rect(342, 70, 56, 12, DENIM) +
      rect(330, 80, 80, 16, DENIM) +
      rect(330, 80, 80, 3, DENIM_LIGHT) +
      rect(335, 70, 6, 6, GOLD) +
      rect(399, 70, 6, 6, GOLD) +
      rect(358, 76, 24, 12, DENIM_DARK) +
      rect(358, 76, 24, 3, DENIM_LIGHT)

// 공구 배낭: 큰 그림에서는 왼쪽 어깨 뒤로 보이고, 아래쪽은 로봇 받침 뒤에 물려 있다
const bigPack = (t: number) =>
  t < 5
    ? ''
    : rect(306, 12, 3, 30, STEEL_DARK) +
      rect(302, 6, 11, 10, RED, beacon()) +
      rect(316, 22, 4, 9, STEEL_DARK) +
      rect(325, 22, 4, 9, STEEL_DARK) +
      rect(316, 28, 13, 4, STEEL_DARK) +
      rect(320, 30, 5, 12, STEEL_DARK) +
      rect(300, 40, 38, 8, TOOLBOX_DARK) +
      rect(304, 46, 32, 46, TOOLBOX) +
      hazard(304, 80, 32, 6, 6) +
      rect(310, 52, 9, 7, STEEL_LIGHT)

// 로봇 다리 하나: 엉덩이 관절 → 허벅지(top부터 thigh만큼) → 무릎 관절 → 정강이 → 노란 발(y 112~120)
const bigLeg = (t: number, x: number, lw: number, top: number, thigh: number) => {
  const [c, l, d] = plates(t)
  const foot = t >= 8 ? GOLD_DARK : HAZARD
  const knee = top + thigh - 1
  return (
    rect(x + 5, top - 7, lw - 10, 10, IRON) +
    rect(x, top, lw, thigh, c!) +
    rect(x, top, 4, thigh, l!) +
    rect(x + 2, knee, lw - 4, 5, IRON) +
    rect(x + lw / 2 - 2, knee + 1, 4, 3, STEEL_LIGHT) +
    (knee + 5 < 113 ? rect(x + 3, knee + 5, lw - 6, 113 - knee - 5, d!) : '') +
    rect(x - 8, 112, lw + 16, 8, foot) +
    rect(x - 8, 117, lw + 16, 3, IRON) +
    rect(x - 8, 112, 7, 5, IRON)
  )
}

// 꼬마 보행 로봇(20~60): Claude 몸 아래를 받친 철판 받침(경고 줄무늬, 나사, 상태 불빛, 왼쪽 전조등)과
// 몸보다 살짝 넓게 벌린 짧은 다리
const bigWalker = (t: number) => {
  const [c, l, d] = plates(t)
  return (
    bigLeg(t, 330, 18, 101, 7) +
    bigLeg(t, 392, 18, 101, 7) +
    rect(320, 86, 100, 13, c!) +
    rect(320, 86, 5, 13, d!) +
    rect(316, 81, 108, 6, l!) +
    band(t, 320, 89, 100, 6, 6) +
    rect(331, 95, 4, 3, d!) +
    rect(405, 95, 4, 3, d!) +
    rect(386, 95, 6, 3, GREEN) +
    rect(395, 95, 6, 3, RED, beacon('0.7s')) +
    rect(326, 98, 88, 4, d!) +
    rect(308, 83, 9, 12, LAMP) +
    rect(310, 85, 3, 3, WHITE) +
    rect(314, 81, 5, 16, d!)
  )
}

// 로봇 몸통과 다리. 20~60은 꼬마 보행 로봇, 70부터 강화 조종석이 Claude 몸 아래쪽(볼터치까지)을 감싸므로
// 눈 다음 겹(head)에 그린다. 90은 더 넓고 다리가 굵으며 가운데 코어가 빛난다
const bigMech = (t: number) => {
  if (t < 2) return ''
  if (t < 7) return bigWalker(t)
  const [c, l, d] = plates(t)
  const giant = t >= 9
  const x0 = giant ? 314 : 320
  const w = giant ? 112 : 100
  const lw = giant ? 26 : 22
  return (
    bigLeg(t, giant ? 328 : 333, lw, 97, 9) +
    bigLeg(t, giant ? 386 : 385, lw, 97, 9) +
    rect(x0, 73, w, 20, c!) +
    rect(x0 + 6, 92, w - 12, 5, d!) +
    rect(x0, 73, 5, 20, d!) +
    rect(x0 - 4, 67, w + 8, 7, l!) +
    band(t, x0, 79, w, 7, 7) +
    rect(x0 + 9, 88, 4, 3, d!) +
    rect(x0 + w - 13, 88, 4, 3, d!) +
    rect(x0 + w - 30, 74, 6, 4, GREEN) +
    rect(x0 + w - 21, 74, 6, 4, RED, beacon('0.7s')) +
    rect(x0 - 8, 75, 8, 10, LAMP) +
    rect(x0 - 3, 73, 4, 14, d!) +
    (giant
      ? rect(356, 73, 28, 20, IRON) + rect(360, 76, 20, 14, CORE) + rect(360, 76, 20, 14, CORE_LIGHT, glow('0.9s')) + rect(366, 80, 8, 6, WHITE)
      : '')
  )
}

// 오른팔: 60부터 강철 팔과 대포. 어깨 관절 → 강철 팔 → 포신 덮개(경고 줄무늬, 상태 불빛) → 냉각 고리를 두른 포신
// → 양옆에 구멍 난 포구. 끝·대기는 하늘로 치켜들고, 오류는 축 늘어뜨린 채 연기가 난다.
// 90부터 냉각 고리가 빛나고 포구 위에 에너지 구슬이 맺힌다
const bigArm = (variant: BigVariant, t: number) => {
  if (t < 6) return rightArm(variant, glove(t))
  const [c, l, d] = plates(t)
  const legend = t >= 9
  const stripe = t >= 8 ? INK : HAZARD
  const ring = (y: number) => rect(409, y, 24, 4, legend ? CORE : IRON) + (legend ? rect(409, y, 24, 4, CORE_LIGHT, glow()) : '')
  const muzzle = (y: number) => rect(407, y, 28, 9, c!) + rect(407, y, 28, 2, l!) + rect(407, y + 4, 5, 3, INK) + rect(430, y + 4, 5, 3, INK)
  const housing = (y: number, light: string) =>
    rect(403, y, 36, 24, c!) + rect(403, y, 6, 24, l!) + rect(433, y, 6, 24, d!) + rect(403, y + 9, 36, 5, stripe) + rect(424, y + 17, 6, 4, light)
  if (variant === 'error') {
    return (
      rect(404, 68, 22, 16, IRON) +
      rect(411, 72, 8, 6, STEEL_LIGHT) +
      rect(412, 82, 14, 12, d!) +
      housing(92, RED) +
      rect(412, 116, 18, 14, d!) +
      ring(119) +
      muzzle(128) +
      puff(434, 100, 8, 8, -16, '0s') +
      puff(436, 102, 6, 12, -10, '0.6s')
    )
  }
  return (
    rect(404, 62, 22, 18, IRON) +
    rect(411, 68, 8, 6, STEEL_LIGHT) +
    rect(414, 46, 14, 18, d!) +
    rect(414, 46, 4, 18, c!) +
    housing(24, variant === 'done' ? GREEN : HAZARD) +
    rect(412, -2, 18, 27, d!) +
    rect(412, -2, 4, 27, c!) +
    ring(4) +
    ring(13) +
    muzzle(-10) +
    (legend
      ? rect(410, -26, 22, 18, CORE, glow()) + rect(414, -22, 14, 12, CORE) + rect(417, -20, 7, 6, CORE_LIGHT)
      : '')
  )
}

const bigGlory = (t: number) =>
  t < 9 ? '' : halo(370, -21, 34, 7, 4, t) + sparkle(296, 6, 12, GOLD, '0.3s') + sparkle(446, 64, 12, GOLD, '1.1s')

// 가리키는 장갑의 손가락 주름은 놋쇠 그늘색 (노란 작업 장갑에 어울리게)
const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigPack(t),
    body: bigOveralls(t),
    head: bigMech(t) + bigHead(t),
    glove: glove(t),
    crease: BRASS_DARK,
    arm: bigArm(variant, t),
    over: bigGlory(t),
    ...(t >= 2 ? { legsOverride: '' } : {}),
  })

export const mechanic: Job = {
  key: 'mechanic',
  name: '메카닉',
  icon: '🤖',
  gear: [
    '',
    '용접 고글',
    '꼬마 보행 로봇',
    '작업 장갑',
    '멜빵 작업복',
    '공구 배낭',
    '로봇 팔 캐논',
    '강화 메카 조종석',
    '황금 메카 외장',
    '왕관·후광·거대 메카',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  // 후광(90~)이 HP 이름표에 닿지 않을 만큼, 큰 그림은 치켜든 포구(60~)·후광(90~)이 통통 뛰어도 잘리지 않을 만큼
  smallHeadroom: t => (t >= 9 ? 6 : 0),
  bigHeadroom: t => (t >= 9 ? 36 : t >= 6 ? 18 : 0),
}
