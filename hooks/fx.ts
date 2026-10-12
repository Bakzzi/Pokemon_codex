// 기술 효과 부품 (전투 좌표, 칸 단위). 상대는 x 22~41에 서 있고 가운데가 x ≈ 31.5, 땅은 y = 13.
// 공격 주기(ATK)의 0.44에 기술이 나가서 0.6에 닿고, 상대는 0.6~0.76에 맞는다 (monsters.ts).
// from: 기술이 나가는 자리(입·손). 각 계열 파일이 디지몬마다 골라 쓴다
import { ATK } from './monsters.ts'
import { WHITE, rect } from './pixel.ts'
import { dots, glowBox, gridWidth, impact, shot, slash, DOT } from './digi.ts'
import type { Palette } from './digi.ts'

export { impact, slash } from './digi.ts'

type At = readonly [number, number]
const at = (v: number) => Math.round(v * 100) / 100
const HIT_X = 25.7
const BODY_X = 29.5

// 주기 안의 구간에만 보이기 (a → b 사이)
const during = (a: number, b: number, inner: string, fade = false) =>
  '<g opacity="0">' +
  (fade
    ? `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${at(a + 0.02)};${at(b - 0.04)};${b};1" dur="${ATK}" repeatCount="indefinite"/>`
    : `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>`) +
  inner +
  '</g>'

// 기술이 나가는 순간 입가(손끝)의 번쩍임 (0.4 → 0.5)
export const muzzle = (color: string, light: string, [x, y]: At, size = 1) =>
  during(
    0.4,
    0.5,
    `<g transform="translate(${x} ${y}) scale(${size})">` +
      rect(-0.9, -0.3, 1.8, 0.6, color) +
      rect(-0.3, -0.9, 0.6, 1.8, color) +
      rect(-0.4, -0.15, 0.8, 0.3, light) +
      rect(-0.15, -0.4, 0.3, 0.8, light) +
      '</g>',
  )

// ── 날아가는 것 ────────────────────────────────────────────────────
const FIRE: Palette = { r: '#F26B21', y: '#FDE047', w: '#FFF7D6' }
const FIREBALL = ['....rrr.', '..rryyrr', 'rryywwyr', '..rryyrr', '....rrr.']
const BUBBLE = ['.pp.', 'pwpp', 'pppp', '.pp.']
const ICE_SHARD = ['..b..', '.bwb.', 'bwwwb', '.bwb.', '..b..']
const STAR = ['..y..', '.yyy.', 'yywyy', '.yyy.', '..y..']
const FISH = ['.bb..', 'bwbbb', '.bb..']
const NEEDLE = ['gggl']
const ARROW = ['.....w.', 'pwwwwww', '.....w.']
const HARPOON = ['......mm', 'mmmmmmmmw', '......mm']
const MISSILE = ['yMmmmmmr', 'yMmmmmmr']
const FLOWER = ['.pp.', 'pyyp', 'pyyp', '.pp.']
const WIND = ['.ww.', 'w..w', 'w..w', '.ww.']
const ROCK = ['.ss.', 'sSss', 'ssSs', '.ss.']

// 유년기의 거품 (아무 속성 없음)
export const bubble = (from: At) =>
  muzzle('#BAE6FD', WHITE, from, 0.7) + shot(BUBBLE, { p: '#BAE6FD', w: WHITE }, from[1], at(HIT_X - from[0]), '', 0.8, from[0]) + impact('#BAE6FD', HIT_X, 7.9, 0.7)

// 불덩이 (아구몬·그레이몬·피요몬). size로 크기
export const fireball = (from: At, size = 1) =>
  muzzle(FIRE.r!, FIRE.y!, from, size) +
  shot(FIREBALL, FIRE, from[1], at(HIT_X - from[0]), glowBox(8, 5, FIRE.r!), size, from[0]) +
  impact(FIRE.r!, HIT_X, 7.6, size)

// 큰 에너지구 (가이아 포스·일렉트로 쇼커·스타라이트): 머리 위로 던져 포물선으로 떨어진다
export const orb = (from: At, color: string, light: string, size = 1.6) => {
  const rows = ['..cccc..', '.cclllcc', 'ccllwllc', 'clwwwwlc', 'clwwwwlc', 'ccllwllc', '.cclllcc', '..cccc..']
  const pal: Palette = { c: color, l: light, w: WHITE }
  const h = rows.length * DOT
  const w = gridWidth(rows) * DOT
  const x0 = from[0]
  const y0 = from[1]
  const yTop = Math.max(-1.5, y0 - 5)
  return (
    muzzle(color, light, from, size) +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.36;0.36;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at((x0 + BODY_X) / 2)} ${yTop};${BODY_X} 8;${BODY_X} 8" keyTimes="0;0.36;0.49;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="scale(${size}) translate(${at(-w / 2)} ${at(-h / 2)})">${glowBox(8, 8, color)}${dots(rows, pal)}</g>` +
    '</g>' +
    impact(color, BODY_X, 8, size * 1.2) +
    impact(light, BODY_X - 2, 6, size * 0.6)
  )
}

// 빔 (블루 블래스터·폭스 파이어·호른 버스터·메가 블래스터·헤븐즈 너클): 입에서 상대까지 쭉 뻗는다. thick: 굵기(칸)
export const beam = (from: At, color: string, light: string, thick = 0.8) => {
  const [x0, y0] = from
  const len = at(BODY_X - x0)
  return (
    muzzle(color, light, from, thick) +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.44;0.64;0.64;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    // 길이가 자라며 닿는다
    `<rect x="0" y="${at(-thick / 2)}" width="${len}" height="${thick}" fill="${color}" opacity="0.85"><animate attributeName="width" values="0;${len};${len}" keyTimes="0;0.5;1" dur="${ATK}" begin="0s" repeatCount="indefinite" calcMode="discrete"/></rect>` +
    `<rect x="0" y="${at(-thick / 2)}" width="${len}" height="${thick}" fill="${color}" opacity="0.85"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<rect x="0" y="${at(-thick / 5)}" width="${len}" height="${at(thick / 2.5)}" fill="${light}"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    '</g></g>' +
    impact(color, BODY_X, y0, thick * 1.4) +
    impact(light, BODY_X - 1.5, y0 - 1.5, thick * 0.7)
  )
}

// 미사일 (기가 디스트로이어): 가슴 해치에서 둘이 위아래로 날아간다. 뒤에 연기
export const missiles = (from: At, n = 2) => {
  const pal: Palette = { m: '#B8C2CC', M: '#5F6B78', r: '#D7263D', y: '#FDE047' }
  let out = muzzle('#FDE047', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.6)
    out +=
      shot(MISSILE, pal, y, at(HIT_X + 1 - from[0]), '', 1.6, from[0]) +
      // 연기 꼬리
      '<g opacity="0">' +
      `<animate attributeName="opacity" values="0;0;0.6;0.6;0;0" keyTimes="0;0.46;0.46;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${from[0]} ${y};${from[0]} ${y};${at(HIT_X - 2)} ${y};${at(HIT_X - 2)} ${y}" keyTimes="0;0.46;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
      rect(-3.2, -0.3, 2.2, 0.6, '#CBD5E1') +
      rect(-4.4, -0.2, 1.2, 0.4, '#E2E8F0') +
      '</g>' +
      impact('#F26B21', at(HIT_X + 1), y, 1.2)
  }
  return out
}

// 하늘에서 떨어지는 것 (메테오 윙·스타라이트 익스플로전·세븐 헤븐즈·니들 스프레이): n개가 상대 위로 엇갈려 떨어진다
export const rain = (rows: readonly string[], pal: Palette, color: string, n = 3, scale = 1, spread = 7) => {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = at(24.5 + (spread * i) / Math.max(1, n - 1) + (i % 2) * 0.6)
    const s = at(0.44 + i * 0.03)
    const e = at(s + 0.14)
    const yEnd = at(10 - (i % 3) * 1.5)
    out +=
      '<g opacity="0">' +
      `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${s};${e};${e};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${x} -2;${x} -2;${at(x - 1.5)} ${yEnd};${at(x - 1.5)} ${yEnd}" keyTimes="0;${s};${e};1" dur="${ATK}" repeatCount="indefinite"/>` +
      `<g transform="scale(${scale}) translate(${at((-gridWidth(rows) * DOT) / 2)} ${at((-rows.length * DOT) / 2)})">${dots(rows, pal)}</g>` +
      '</g>' +
      '<g opacity="0">' +
      `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${e};${at(e + 0.02)};${at(e + 0.1)};1" dur="${ATK}" repeatCount="indefinite"/>` +
      `<g transform="translate(${at(x - 1.5)} ${yEnd}) scale(${scale * 0.8})">` +
      rect(-1.2, -0.3, 2.4, 0.6, color) +
      rect(-0.3, -1.2, 0.6, 2.4, color) +
      rect(-0.5, -0.15, 1, 0.3, WHITE) +
      '</g></g>'
  }
  return out
}
export const meteorWing = (from: At, n = 3) => muzzle(FIRE.r!, FIRE.y!, from, 1) + rain(FIREBALL, FIRE, FIRE.r!, n, 0.9)
export const starlight = (n = 5) => rain(STAR, { y: '#FDE047', w: WHITE }, '#FDE047', n, 1.1, 9)
export const sevenHeavens = () => rain(['.ww.', 'wyyw', 'wyyw', '.ww.'], { w: WHITE, y: '#FDE68A' }, '#FDE68A', 7, 1, 10)
export const needleSpray = (from: At) => muzzle('#86EFAC', WHITE, from, 0.8) + rain(NEEDLE, { g: '#16A34A', l: '#86EFAC' }, '#86EFAC', 6, 1, 8)
export const rockRain = (n = 4) => rain(ROCK, { s: '#9CA3AF', S: '#6B7280' }, '#9CA3AF', n, 1.1, 8)

// 빛기둥 (헤븐즈 게이트·에덴즈 재블린·해머 스파크·울트라 썬더): 상대 위에서 내려꽂힌다 (0.56 → 0.72)
export const pillar = (color: string, light: string, w = 2.4, x = BODY_X) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;0.95;0.95;0;0" keyTimes="0;0.56;0.58;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<rect x="${at(x - w / 2)}" y="-2" width="${w}" height="15" fill="${color}" opacity="0.8"><animate attributeName="height" values="0;0;15;15" keyTimes="0;0.56;0.6;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
  `<rect x="${at(x - w / 6)}" y="-2" width="${at(w / 3)}" height="15" fill="${light}"><animate attributeName="height" values="0;0;15;15" keyTimes="0;0.56;0.6;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
  '</g>' +
  impact(light, x, 11.5, 1.2)

// 번개 (프티 썬더·울트라 썬더): 지그재그가 하늘에서 상대에게
export const lightning = (x = BODY_X, color = '#FDE047', light = '#FFFBEB') => {
  const pts = [[0, -2], [-1.2, 2], [0.8, 4.5], [-0.8, 7.5], [0.6, 10], [0, 12]]
  const path = pts.map(([dx, dy], i) => `${i ? 'L' : 'M'}${at(x + dx!)} ${dy}`).join(' ')
  return (
    '<g opacity="0" shape-rendering="auto">' +
    `<animate attributeName="opacity" values="0;0;1;0.3;1;0;0" keyTimes="0;0.56;0.57;0.62;0.66;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<path d="${path}" stroke="${color}" stroke-width="1.1" fill="none" stroke-linejoin="round"/>` +
    `<path d="${path}" stroke="${light}" stroke-width="0.4" fill="none" stroke-linejoin="round"/>` +
    '</g>' +
    impact(color, x, 11, 1.1)
  )
}

// 채찍 (템프테이션): 손에서 상대까지 휘어 날아가 찰싹
export const whip = (from: At, color: string, light: string) => {
  const [x0, y0] = from
  const cx = at((x0 + BODY_X) / 2)
  const d = `M${x0} ${y0} Q${cx} ${at(y0 - 5)} ${BODY_X} 7.5`
  return (
    muzzle(color, light, from, 0.8) +
    '<g opacity="0" shape-rendering="auto">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.5;0.66;0.66;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<path d="${d}" stroke="${color}" stroke-width="0.7" fill="none" stroke-linecap="round" stroke-dasharray="40" stroke-dashoffset="40"><animate attributeName="stroke-dashoffset" values="40;40;0;0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></path>` +
    `<path d="${d}" stroke="${light}" stroke-width="0.25" fill="none" stroke-dasharray="40" stroke-dashoffset="40"><animate attributeName="stroke-dashoffset" values="40;40;0;0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></path>` +
    '</g>' +
    slash(light, BODY_X, 7.5)
  )
}

// 덩굴 (포이즌 아이비): 손에서 굵은 덩굴이 뻗어 상대를 친다
export const vine = (from: At, color = '#22C55E', light = '#86EFAC') => {
  const [x0, y0] = from
  const len = at(BODY_X - x0)
  return (
    muzzle(light, WHITE, from, 0.7) +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.46;0.46;0.66;0.66;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    `<rect x="0" y="-0.45" width="${len}" height="0.9" fill="${color}"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.46;0.56;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<rect x="0" y="-0.15" width="${len}" height="0.3" fill="${light}"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.46;0.56;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    // 덩굴 끝의 잎
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${len} 0;${len} 0" keyTimes="0;0.46;0.56;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(-0.4, -1.3, 1.2, 0.8, color) +
    rect(-0.4, 0.5, 1.2, 0.8, color) +
    '</g></g></g>' +
    slash(light, BODY_X, 7.5)
  )
}

// 음파 (퍼피 하울링·에어 슛): 입에서 둥근 파동 셋이 퍼져 간다
export const soundWave = (from: At, color = '#F9A8D4', light = WHITE) => {
  const [x0, y0] = from
  let out = muzzle(color, light, from, 0.8)
  for (let i = 0; i < 3; i++) {
    const s = at(0.44 + i * 0.04)
    const e = at(s + 0.16)
    out +=
      '<g opacity="0" shape-rendering="auto">' +
      `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${s};${e};${e};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at(BODY_X - 2)} ${y0};${at(BODY_X - 2)} ${y0}" keyTimes="0;${s};${e};1" dur="${ATK}" repeatCount="indefinite"/>` +
      `<path d="M0 -${1.2 + i * 0.5} Q${1.4 + i * 0.5} 0 0 ${1.2 + i * 0.5}" stroke="${color}" stroke-width="0.5" fill="none"/>` +
      '</g>'
  }
  return out + impact(color, BODY_X - 1.5, from[1], 0.9)
}

// 화살 (홀리 애로우)·작살 (하푼 발칸)·물고기 떼 (마칭 피시즈)·바람 고리 (에어 슛)·꽃 (플라워 캐논)
export const holyArrow = (from: At) =>
  muzzle('#F9A8D4', WHITE, from, 0.9) + shot(ARROW, { w: WHITE, p: '#F9A8D4' }, from[1], at(HIT_X + 1 - from[0]), glowBox(7, 3, '#F9A8D4'), 1.2, from[0]) + impact('#F9A8D4', HIT_X + 1, from[1], 1.3) + pillar('#FBCFE8', WHITE, 1.4, HIT_X + 1)
export const harpoon = (from: At, n = 1) => {
  let out = muzzle('#CBD5E1', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.5)
    out += shot(HARPOON, { m: '#CBD5E1', w: WHITE }, y, at(HIT_X + 1 - from[0]), '', 1.5, from[0]) + impact('#E2E8F0', HIT_X + 1, y, 1)
  }
  return out
}
export const marchingFishes = (from: At, n = 4) => {
  const pal: Palette = { b: '#38BDF8', w: WHITE }
  let out = ''
  for (let i = 0; i < n; i++) {
    const x0 = at(from[0] - i * 1.6)
    const y = at(11.6 - (i % 2) * 1.2)
    out += shot(FISH, pal, y, at(HIT_X + 1 - x0), '', 1.4, x0)
  }
  return out + impact('#38BDF8', HIT_X + 1, 10.5, 1.1) + impact('#BAE6FD', HIT_X + 2, 8.5, 0.8)
}
export const airShot = (from: At) =>
  muzzle('#BAE6FD', WHITE, from, 0.7) + shot(WIND, { w: '#E0F2FE' }, from[1], at(HIT_X - from[0]), '', 1.2, from[0]) + impact('#E0F2FE', HIT_X, from[1], 0.9)
export const flowerCannon = (from: At) =>
  muzzle('#F9A8D4', '#FDE047', from, 1) + shot(FLOWER, { p: '#F472B6', y: '#FDE047' }, from[1], at(HIT_X - from[0]), glowBox(4, 4, '#F9A8D4'), 1.6, from[0]) + impact('#F472B6', HIT_X, from[1], 1.5)
export const iceShards = (from: At, n = 3) => {
  const pal: Palette = { b: '#60A5FA', w: '#E0F2FE' }
  let out = muzzle('#60A5FA', '#E0F2FE', from, 1)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.4)
    out += shot(ICE_SHARD, pal, y, at(HIT_X - from[0]), glowBox(5, 5, '#93C5FD'), 1, from[0])
  }
  return out + impact('#60A5FA', HIT_X, from[1], 1.3)
}
// 얼음 브레스 (코큐토스): 빔 + 상대를 얼리는 결정
export const cocytus = (from: At) => beam(from, '#93C5FD', '#E0F2FE', 1.4) + rain(ICE_SHARD, { b: '#60A5FA', w: '#E0F2FE' }, '#93C5FD', 4, 0.9, 6)

// 근접 (카이저 네일·캣 펀치·엑스칼리버·해머): 베는 자국과 충격. claws가 true면 발톱 자국 셋
export const strike = (color: string, light: string, claws = false) =>
  claws
    ? slash(color, BODY_X - 1, 7) + slash(color, BODY_X + 0.5, 8) + slash(light, BODY_X - 0.2, 7.5)
    : slash(color, BODY_X - 0.5, 7.5) + impact(light, BODY_X - 1, 8.5, 0.9)

// 트라이던트 암: 집게가 케이블을 끌고 뻗어 상대를 문다
export const tridentArm = (from: At) => {
  const [x0, y0] = from
  const len = at(HIT_X - x0)
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.5;0.7;0.7;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    `<rect x="0" y="-0.25" width="${len}" height="0.5" fill="#5F6B78"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${len} 0;${len} 0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/>` +
    rect(-0.6, -0.6, 1.2, 1.2, '#9AA3AE') +
    rect(0.2, -1.4, 1.2, 0.6, '#F3EEE0') +
    rect(0.2, 0.8, 1.2, 0.6, '#F3EEE0') +
    rect(0.6, -0.3, 1.2, 0.6, '#F3EEE0') +
    '</g></g></g>' +
    impact('#F26B21', HIT_X + 1, y0, 1.1)
  )
}
