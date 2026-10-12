// 띠에 그리는 그림의 틀: 상대와 싸우는 작은 디지몬, 쉬는 동안 서 있는 디지몬,
// 일이 끝나면 확 커지며 말풍선을 띄우는 큰 디지몬, 쉬는 동안의 HP·경험치 막대.
// 디지몬 그림은 이달의 계열(jobs/*.ts)이 그린다.
// 데스크톱 앱이 Svg를 샌드박스 프레임(isInteractive)에 그릴 때 SMIL 애니메이션이 돌아간다
// 캐릭터 머리 위에는 5시간·주간 한도의 남은 비율을 HP 이름표로 띄운다

import type { Hp } from '../types'
import type { Job } from './jobs/types.ts'
import { ATK, heroHurt, monster } from './monsters.ts'
import { FONT, GOLD, INK, WHITE, esc, rect } from './pixel.ts'
import type { BigVariant } from './pixel.ts'

export type { BigVariant } from './pixel.ts'

const ORANGE = '#D97757'
const SUB = '#7A5244'
const GREEN = '#22A06B'
const AMBER = '#E8A317'
const RED = '#E5484D'
const PLATE_TEXT = '#F5E9E2'
const BAR_EMPTY = '#4A3B36'

// ── HP ────────────────────────────────────────────────────────────
// 남은 비율이 50% 넘으면 초록, 25% 넘으면 노랑, 그 아래는 빨강. 10% 이하면 깜빡인다

export const hpColor = (v: number) => (v > 50 ? '#3DD68C' : v > 25 ? '#F5C542' : '#F0524F')
const hpShine = (v: number) => (v > 50 ? '#9AF2C5' : v > 25 ? '#FBE3A0' : '#F8A3A1')

type PlateSize = { x: number; w: number; row: number; bar: number; font: number; label: number }
const SMALL_PLATE: PlateSize = { x: 2, w: 92, row: 10, bar: 5, font: 9, label: 28 }
const LARGE_PLATE: PlateSize = { x: 296, w: 148, row: 14, bar: 8, font: 12, label: 38 }

const hpRows = (hp: Hp) =>
  ([['5시간', hp.five], ['주간', hp.week]] as const).filter((r): r is readonly [string, number] => r[1] !== null)

// 이름표 높이 (보여 줄 한도가 없으면 0)
const plateHeight = (hp: Hp, s: PlateSize) => {
  const n = hpRows(hp).length
  return n === 0 ? 0 : n * s.row + 4
}

// 머리 위 HP 이름표: 줄마다 라벨과 막대
const hpPlate = (hp: Hp, s: PlateSize) => {
  const rows = hpRows(hp)
  if (rows.length === 0) return ''
  const barX = s.x + 4 + s.label
  const barW = s.w - 8 - s.label
  return (
    `<rect x="${s.x}" y="0" width="${s.w}" height="${plateHeight(hp, s)}" rx="3" fill="${INK}" fill-opacity="0.88"/>` +
    rows
      .map(([label, v], i) => {
        const top = 2 + i * s.row
        const barY = top + (s.row - s.bar) / 2
        const fillW = Math.round((barW * v) / 100)
        const blink = v <= 10 ? '<animate attributeName="opacity" values="1;0.35;1" dur="0.8s" repeatCount="indefinite"/>' : ''
        return (
          `<text x="${s.x + 4}" y="${top + s.row / 2}" dominant-baseline="central" font-family="${FONT}" font-size="${s.font}" font-weight="700" fill="${PLATE_TEXT}">${label}</text>` +
          rect(barX, barY, barW, s.bar, BAR_EMPTY) +
          (fillW > 0 ? rect(barX, barY, fillW, s.bar, hpColor(v), blink) + rect(barX, barY, fillW, 1, hpShine(v)) : '')
        )
      })
      .join('')
  )
}

// 쉬는 동안 입력창 위에 까는 가로 HP 막대 하나 (600 × 8px)
export const hpBarSvg = (v: number) => {
  const w = Math.round((Math.max(0, Math.min(100, v)) / 100) * 600)
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="8" viewBox="0 0 600 8">' +
    '<rect x="0" y="0" width="600" height="8" rx="4" fill="#E6DDD8"/>' +
    (w > 0 ? `<rect x="0" y="0" width="${w}" height="8" rx="4" fill="${hpColor(v)}"/>` : '') +
    '</svg>'
  )
}

// 쉬는 동안 HP 막대 아래에 까는 경험치 막대 (보라, 레벨 90부터 금빛)
export const xpBarSvg = (fraction: number, level: number) => {
  const w = Math.round(Math.max(0, Math.min(1, fraction)) * 600)
  const color = level >= 90 ? GOLD : '#A78BFA'
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="8" viewBox="0 0 600 8">' +
    '<rect x="0" y="0" width="600" height="8" rx="4" fill="#E6DDD8"/>' +
    (w > 0 ? `<rect x="0" y="0" width="${w}" height="8" rx="4" fill="${color}"/>` : '') +
    '</svg>'
  )
}

// ── 쉬는 동안: 지금 진화 단계로 서 있는 디지몬 ─────────────────────────
// 96 × 84px (띠 높이 86px 안), 5px 칸. 레벨은 옆 글자 줄에 있으니 배지 없이 디지몬만 크게.
// 발 위치는 단계와 상관없이 같게 둔다
export const idleSvg = (t: number, job: Job) => {
  const width = 96
  const height = 84
  return {
    width,
    height,
    source:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
      '<g transform="translate(-24.5 16) scale(5)">' +
      '<ellipse cx="15" cy="11.2" rx="5" ry="0.7" fill="#000000" fill-opacity="0.12" shape-rendering="auto"/>' +
      job.small(t, 'stand') +
      '</g></svg>',
  }
}

// ── 작은 그림: 상대와 싸우는 디지몬 ─────────────────────────────────
// 4px 칸 단위, 44 × 15칸(176 × 60px). 내 디지몬은 왼쪽, 상대는 오른쪽(x 22~41). 땅은 y = 13

// 근접 기술은 공격 주기마다 상대에게 돌진했다 돌아오고, 원거리 기술은 제자리에서 살짝 반동한다
const approach = (t: number, job: Job) =>
  (typeof job.melee === 'function' ? job.melee(t) : job.melee)
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;3.5 0;3.5 0;0 0;0 0" keyTimes="0;0.5;0.6;0.7;0.85;1" dur="${ATK}" repeatCount="indefinite"/>`
      : `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;-0.6 0;0 0;0 0" keyTimes="0;0.44;0.48;0.56;1" dur="${ATK}" repeatCount="indefinite"/>`

const ground = rect(0, 13, 44, 0.5, '#9CA3AF') + [3, 11, 19, 27, 36].map(x => rect(x, 12.4, 0.4, 0.6, '#86A36B')).join('')

// 레벨 배지 (금색 판에 "Lv.37")
const levelBadge = (level: number, x: number, w: number, h: number, font: number) =>
  `<rect x="${x}" y="1" width="${w}" height="${h}" rx="4" fill="${GOLD}" stroke="${INK}" stroke-width="1.5"/>` +
  `<text x="${x + w / 2}" y="${1 + h / 2}" dominant-baseline="central" text-anchor="middle" font-family="${FONT}" font-size="${font}" font-weight="800" fill="${INK}">Lv.${level}</text>`

// hp: 머리 위 HP 이름표(한도), t: 장비 단계, level: 레벨, foe: 상대에게 남은 체력(0~1), job: 이달의 계열,
// damage: 상대 머리 위에 뜨는 데미지 = 이번 응답에서 쓴 점수(register.tsx의 HP 점수). null이면 띄우지 않는다
export const runSvg = (hp: Hp, t: number, level: number, foe: number, job: Job, damage: number | null) => {
  const plate = plateHeight(hp, SMALL_PLATE)
  const top = Math.max(plate, 22) + 2
  const shift = top + job.smallHeadroom(t)
  const height = 60 + shift
  return {
    height,
    width: 176,
    source:
      `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="${height}" viewBox="0 0 176 ${height}" shape-rendering="crispEdges">` +
      hpPlate(hp, SMALL_PLATE) +
      levelBadge(level, 120, 52, 20, 12) +
      `<g transform="translate(0 ${shift}) scale(4)">` +
      ground +
      monster(t, foe, damage) +
      `<g>${approach(t, job)}<g transform="translate(-5 2)">${job.small(t, 'run')}</g></g>` +
      job.hit(t) +
      '</g></svg>',
  }
}

// ── 큰 그림: 확 커지면서 말풍선을 띄우는 디지몬 ──────────────
// 460 × 160px (+ 머리 위 HP 이름표). done은 축하, waiting은 느낌표, error는 어질어질

const ACCENT: Record<BigVariant, string> = { done: GREEN, waiting: AMBER, error: RED }

const plus = (x: number, y: number, color: string, begin: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(x - 1.5, y - 6, 3, 12, color) +
  rect(x - 6, y - 1.5, 12, 3, color) +
  '</g>'

const badge = (variant: BigVariant) => {
  const icon =
    variant === 'done'
      ? `<path d="M23 22 l5 5 l9 -10" stroke="${WHITE}" stroke-width="4" fill="none" stroke-linecap="square"/>`
      : variant === 'waiting'
        ? rect(28.5, 13, 4, 10, WHITE) + rect(28.5, 26, 4, 4, WHITE)
        : `<path d="M25 16 l11 11 M36 16 l-11 11" stroke="${WHITE}" stroke-width="4" fill="none"/>`
  return `<circle cx="30.5" cy="21.5" r="14" fill="${ACCENT[variant]}" stroke="${INK}" stroke-width="3"/>` + icon
}

const bubble = (variant: BigVariant, line1: string, line2: string, intro: boolean) =>
  // 말풍선은 꼬리 끝(262, 68)을 중심으로 튀어나온다 (intro가 아니면 처음부터 다 나온 모습)
  `<g transform="translate(262 68)"><g transform="scale(${intro ? 0 : 1})">` +
  (intro
    ? '<animateTransform attributeName="transform" type="scale" values="0;1.1;1" keyTimes="0;0.65;1" dur="0.45s" begin="0.35s" fill="freeze"/>'
    : '') +
  '<g transform="translate(-262 -68)">' +
  `<path d="M30 18 H218 Q240 18 240 40 V54 L262 68 L240 78 Q240 100 218 100 H30 Q8 100 8 78 V40 Q8 18 30 18 Z" fill="${WHITE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
  badge(variant) +
  `<text x="128" y="58" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="800" fill="${INK}">${esc(line1)}</text>` +
  `<text x="128" y="85" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="600" fill="${SUB}">${esc(line2)}</text>` +
  '</g></g></g>'

// 기다릴 때는 머리 오른쪽 위에서 느낌표가 깜빡인다
const exclaim =
  '<g>' +
  '<animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite"/>' +
  rect(442, 2, 8, 20, AMBER) +
  rect(442, 25, 8, 7, AMBER) +
  '</g>'

// 오류일 때는 머리 위로 별이 빙글빙글 돈다
const dizzy =
  '<g>' +
  '<animateTransform attributeName="transform" type="rotate" values="0 370 22;360 370 22" dur="2s" repeatCount="indefinite"/>' +
  [[-22, 0], [11, -10], [11, 10]]
    .map(([dx, dy]) => rect(370 + dx! - 1.5, 22 + dy! - 5, 3, 10, AMBER) + rect(370 + dx! - 5, 22 + dy! - 1.5, 10, 3, AMBER))
    .join('') +
  '</g>'

// 끝났을 때 한 번 터지는 색종이
const CONFETTI_COLORS = [ORANGE, GREEN, AMBER, '#60A5FA', '#A78BFA', RED]
const confetti = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2
  const radius = 80 + (i % 3) * 18
  const dx = Math.round(Math.cos(angle) * radius)
  const dy = Math.round(Math.sin(angle) * radius * 0.6 + 24)
  const [w, h] = i % 2 === 0 ? [7, 7] : [4, 10]
  return (
    `<rect x="367" y="58" width="${w}" height="${h}" fill="${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}" opacity="0">` +
    '<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="1.1s" begin="0.25s" fill="freeze"/>' +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy}" keyTimes="0;1" dur="1.1s" begin="0.25s" fill="freeze" calcMode="spline" keySplines="0.1 0.8 0.3 1"/>` +
    '</rect>'
  )
}).join('')

const motion = (variant: BigVariant) =>
  variant === 'error'
    ? // 오류: 상대의 기술에 맞는 순간(반격 박자) 흔들리고 깜빡인다
      heroHurt().replace('-1 0;0.6 0', '-10 0;6 0')
    : // 끝/대기: 제자리에서 통통 뛴다
      '<animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" keyTimes="0;0.4;1" dur="0.9s" begin="0.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.3 0 0.5 1;0.5 0 0.7 1"/>'

// intro가 true면 확 커지는 등장 동작(커지기, 말풍선·이름표 튀어나오기, 색종이)을 한 번 재생한다.
// false면 다 나온 모습에서 통통 뛰기·콕콕 찌르기만 반복한다. 앱이 스크롤 등으로 그림을 다시 만들어도
// 등장 동작이 되풀이되지 않게, 등장이 끝난 뒤에는 false로 그린다.
// t: 장비 단계 (0~11). 머리가 위로 넘치는 만큼(job.bigHeadroom) 위에 자리를 더 둔다.
// foe: 오류 알림에서 오른쪽에 서서 기술로 내 디지몬을 치는 상대 (monsters.ts foeBig에 heroDx를 넘겨 그린다). 있으면 120px 넓어진다
export const bigSvg = (variant: BigVariant, line1: string, line2: string, hp: Hp, intro: boolean, t: number, job: Job, foe?: (heroDx: number) => string) => {
  const plate = plateHeight(hp, LARGE_PLATE)
  // 이름표가 없을 때도 통통 뛰기(8px)와 어지러운 별이 위로 잘리지 않게 자리를 둔다
  const shift = (plate ? plate + 2 : 8) + job.bigHeadroom(t)
  const height = 160 + shift
  const width = 460 + (foe ? 120 : 0)
  const mid = plate / 2
  return {
    height,
    width,
    source:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
      // HP 이름표는 디지몬이 커진 뒤에 톡 튀어나온다
      (plate
        ? `<g transform="translate(370 ${mid})"><g transform="scale(${intro ? 0 : 1})">` +
          (intro
            ? '<animateTransform attributeName="transform" type="scale" values="0;1.12;1" keyTimes="0;0.6;1" dur="0.35s" begin="0.55s" fill="freeze"/>'
            : '') +
          `<g transform="translate(-370 -${mid})">${hpPlate(hp, LARGE_PLATE)}</g></g></g>`
        : '') +
      `<g transform="translate(0 ${shift})">` +
      bubble(variant, line1, line2, intro) +
      // 디지몬은 발밑(370, 118)을 중심으로 작게 시작해 확 커진다
      '<g transform="translate(370 118)"><g>' +
      (intro
        ? '<animateTransform attributeName="transform" type="scale" values="0.2;1.18;0.94;1" keyTimes="0;0.5;0.78;1" dur="0.7s" fill="freeze"/>'
        : '') +
      '<g transform="translate(-370 -118)">' +
      `<ellipse cx="370" cy="120" rx="54" ry="5" fill="${INK}" opacity="0.15"/>` +
      `<g>${motion(variant)}${job.big(variant, t)}</g>` +
      '</g></g></g>' +
      (variant === 'done' ? (intro ? confetti : '') + plus(300, 26, AMBER, '0.9s') + plus(444, 44, AMBER, '1.5s') + plus(440, 108, AMBER, '2.1s') : '') +
      (variant === 'waiting' ? exclaim : '') +
      (variant === 'error' ? dizzy : '') +
      // 상대가 오른쪽에 서서 기술로 내 디지몬을 친다 (근접이면 달려든다)
      (foe ? `<g transform="translate(${width - 60} 0)">${foe(370 - (width - 60))}</g>` : '') +
      '</g></svg>',
  }
}
