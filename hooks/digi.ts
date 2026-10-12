// 디지몬 계열이 같이 쓰는 그림 틀: 점 그림(글자 격자) → SVG, 진화 단계, 눈 표정, 걷기, 깜빡임, 공격 효과.
// 각 계열 파일(jobs/*.ts)은 진화 단계 5개(유년기·성장기·성숙기·완전체·궁극체)의 점 그림을 적고 makeLine으로 Job을 만든다.
//
// 점 하나는 0.5칸이다 (전투 그림 2px, 쉬는 그림 2.5px, 큰 알림 5px). 그림은 오른쪽(몬스터 쪽)을 본다.
// 격자는 발바닥이 y = 11칸(Claude의 발 위치)에 닿고 x ≈ 14.5칸을 중심으로 놓인다.
// 작은 그림 칸: x 5~23.5, y -3~11.5 → 격자는 최대 36점 너비, 28점 높이.
import { ATK } from './monsters.ts'
import { BLUSH, GOLD, INK, STAND_STEP, STEP, WHITE, halo, rect, sparkle } from './pixel.ts'
import type { BigVariant, Pose } from './pixel.ts'
import type { Job } from './jobs/types.ts'

export const DOT = 0.5
const at = (v: number) => Math.round(v * 100) / 100

export type Palette = Readonly<Record<string, string>>

// 점 자리(col, row)에 w × h점 사각형 (격자 좌표)
export const px = (col: number, row: number, w: number, h: number, fill: string, inner = '') =>
  rect(at(col * DOT), at(row * DOT), at(w * DOT), at(h * DOT), fill, inner)

// 글자 그림: 한 글자가 한 점. 팔레트에 없는 글자('.' 등)는 비우고, 한 줄에 이어진 같은 글자는 사각형 하나로 합친다
export const dots = (rows: readonly string[], pal: Palette, col = 0, row = 0) => {
  let out = ''
  rows.forEach((line, j) => {
    for (let i = 0; i < line.length; ) {
      const c = line[i]!
      let k = i + 1
      while (k < line.length && line[k] === c) k++
      const fill = pal[c]
      if (fill) out += px(col + i, row + j, k - i, 1, fill)
      i = k
    }
  })
  return out
}

export const gridWidth = (rows: readonly string[]) => Math.max(...rows.map(r => r.length))

// ── 진화 단계 ─────────────────────────────────────────────────────
// 장비 단계 t(레벨 ÷ 10) → 진화 단계: 0 유년기(1~9), 1 성장기(10~39), 2 성숙기(40~59), 3 완전체(60~89), 4 궁극체(90~)
export const stageOf = (t: number) => (t >= 9 ? 4 : t >= 6 ? 3 : t >= 4 ? 2 : t >= 1 ? 1 : 0)

// 눈: 격자의 눈 자리들(왼쪽 위 점), 크기, 눈을 감을 때 덮는 살색
export type Eyes = { at: readonly (readonly [number, number])[]; w: number; h: number; lid: string }

export type Stage = {
  name: string
  pal: Palette
  // 서 있는 모습. 맨 아랫줄이 발바닥
  rows: readonly string[]
  eyes: Eyes
  // 땅에서 띄울 점 수 (날아다니는 디지몬). 그림자는 그대로 땅에 둔다
  hover?: number
  // 격자 위에 덧그리는 움직이는 부분 (꼬리·날개·불씨). 격자 좌표의 px/dots로 그린다
  extra?: (pose: Pose) => string
}

// ── 움직임 ────────────────────────────────────────────────────────
const step = (attr: string, values: string, dur: string) =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`

// 장면 넘기기: 여러 장면을 dur 동안 차례로 하나씩 보인다
export const flipbook = (dur: string, ...frames: string[]) =>
  frames
    .map((f, i) => `<g${i ? ' opacity="0"' : ''}>${step('opacity', frames.map((_, j) => (j === i ? 1 : 0)).join(';'), dur)}${f}</g>`)
    .join('')

// 가끔 바뀌는 모습: every를 n칸으로 나눠 마지막 한 칸에만 b, 나머지는 a를 보인다
export const nowAndThen = (every: string, n: number, a: string, b: string) => {
  const usual = Array.from({ length: n }, (_, i) => (i < n - 1 ? 1 : 0))
  return `<g>${step('opacity', usual.join(';'), every)}${a}</g>` + `<g opacity="0">${step('opacity', usual.map(v => 1 - v).join(';'), every)}${b}</g>`
}

// 걸을 때 한쪽 발을 든 장면: 맨 아랫줄의 왼쪽 반 또는 오른쪽 반을 지운다
const liftFeet = (rows: readonly string[], side: 'left' | 'right') => {
  const last = rows[rows.length - 1]!
  const mid = Math.ceil(last.length / 2)
  const lifted = side === 'left' ? '.'.repeat(mid) + last.slice(mid) : last.slice(0, mid) + '.'.repeat(last.length - mid)
  return [...rows.slice(0, -1), lifted]
}

// 눈 깜빡임: 3.2초마다 한 번, 눈 위를 살색으로 덮고 아랫줄만 까맣게 남긴다
const blink = (e: Eyes) =>
  `<g opacity="0">${step('opacity', '0;0;0;0;0;0;0;0;0;1', '3.2s')}` +
  e.at.map(([c, r]) => px(c, r, e.w, e.h - 1, e.lid) + px(c, r + e.h - 1, e.w, 1, INK)).join('') +
  '</g>'

// 큰 알림의 표정: 끝은 웃는 눈과 볼터치, 대기는 동그랗게 뜬 눈, 오류는 X 눈
const face = (e: Eyes, variant: BigVariant) =>
  e.at
    .map(([c, r]) => {
      const cover = px(c, r, e.w, e.h, e.lid)
      if (variant === 'done') {
        return cover + px(c, r, e.w, 1, INK) + px(c - 1, r + 1, 1, 1, INK) + px(c + e.w, r + 1, 1, 1, INK) + px(c - 1, r + e.h, e.w + 2, 1, BLUSH)
      }
      if (variant === 'waiting') return cover + px(c - 0.5, r - 0.5, e.w + 1, e.h + 1, INK) + px(c - 0.5, r - 0.5, 1, 1, WHITE)
      const n = Math.max(3, e.w)
      const x0 = c + (e.w - n) / 2
      const y0 = r + (e.h - n) / 2
      let out = cover
      for (let i = 0; i < n; i++) out += px(x0 + i, y0 + i, 1, 1, INK) + px(x0 + n - 1 - i, y0 + i, 1, 1, INK)
      return out
    })
    .join('')

// ── 디지몬 한 마리 ───────────────────────────────────────────────
// 격자를 발이 y = 11칸, 가운데가 x = 14.5칸에 오게 놓는다. 전투(run)는 발을 번갈아 들며 뛰고, 쉴 때는 숨 쉰다
const origin = (s: Stage) => {
  const w = gridWidth(s.rows)
  const h = s.rows.length
  return { x: at(14.5 - (w * DOT) / 2), y: at(11 - h * DOT - (s.hover ?? 0) * DOT), w, h }
}

export const figure = (s: Stage, pose: Pose, variant?: BigVariant) => {
  const run = pose === 'run'
  const o = origin(s)
  const body = run
    ? flipbook(STEP, dots(liftFeet(s.rows, 'left'), s.pal), dots(liftFeet(s.rows, 'right'), s.pal))
    : dots(s.rows, s.pal)
  const bob = run
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.5" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`
    : `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3" dur="${STAND_STEP}" calcMode="discrete" repeatCount="indefinite"/>`
  const hoverAnim = s.hover
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -${DOT};0 0" dur="1.6s" repeatCount="indefinite"/>`
    : ''
  return (
    `<g transform="translate(${o.x} ${o.y})">` +
    `<g>${bob}${hoverAnim}` +
    body +
    (s.extra ? s.extra(pose) : '') +
    (variant ? face(s.eyes, variant) : blink(s.eyes)) +
    '</g></g>'
  )
}

// 격자 꼭대기의 y(칸). 머리 위 자리(headroom) 계산용
const top = (s: Stage) => origin(s).y

// ── 문장(紋章) ────────────────────────────────────────────────────
// 레벨 30부터 머리 왼쪽 위에 이달의 문장이 떠서 숨 쉬듯 빛난다
export const crestMark = (rows: readonly string[], pal: Palette, s: Stage) => {
  const o = origin(s)
  const w = gridWidth(rows)
  // 전투 그림은 x = 5칸 왼쪽이 잘리므로 그 안쪽에 둔다 (덩치 큰 디지몬은 머리 왼쪽 위에 겹친다)
  return (
    `<g transform="translate(${at(Math.max(5.2, o.x - w * DOT - 0.5))} ${at(o.y + 0.5)})">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.4;0 0" dur="2s" repeatCount="indefinite" additive="sum"/>` +
    '<g><animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>' +
    dots(rows, pal) +
    '</g></g>'
  )
}

// 레벨 90~: 머리 위 후광과 반짝이. 100은 무지개
const glory = (s: Stage, t: number, big: boolean) => {
  if (t < 9) return ''
  const o = origin(s)
  const cx = 14.5
  const cy = o.y - 1.2
  return big
    ? halo(cx, cy, (o.w * DOT) / 2.6, 0.7, 0.4, t) + sparkle(o.x - 1.5, o.y + 1, 1.2, GOLD, '0.3s') + sparkle(o.x + o.w * DOT + 1.5, o.y + 0.5, 1.2, GOLD, '1.1s')
    : halo(cx, cy, (o.w * DOT) / 2.6, 0.7, 0.4, t) + sparkle(o.x - 1, o.y + 1, 1.2, GOLD, '0.3s') + sparkle(o.x + o.w * DOT + 1, o.y, 1.2, GOLD, '1.1s')
}

// ── 공격 효과 (전투 좌표, 칸 단위) ─────────────────────────────────
// 몬스터는 x 24~38에 서 있고, 공격 주기(ATK)의 0.6~0.76에 맞는다

// 날아가는 것: 디지몬 앞(x ≈ 17, y)에서 출발해 0.44 → 0.6 사이에 dist칸 날아간다. 격자 그림은 가운데가 (0, 0)이 되게 놓는다
export const shot = (rows: readonly string[], pal: Palette, y: number, dist = 9, glow = '') => {
  const w = gridWidth(rows)
  const h = rows.length
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.44;0.6" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="17 ${y};17 ${y};${17 + dist} ${y};${17 + dist} ${y}" keyTimes="0;0.44;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="translate(${at((-w * DOT) / 2)} ${at((-h * DOT) / 2)})">${glow}${dots(rows, pal)}</g>` +
    '</g>'
  )
}

// 맞은 자리의 불꽃 (0.6 → 0.72): 십자 불꽃과 흰 심, 네 귀퉁이로 튀는 조각
export const impact = (color: string, cx = 25.7, cy = 7.9, size = 1) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${cx} ${cy}) scale(${size})">` +
  rect(-1.5, -0.35, 3, 0.7, color) +
  rect(-0.35, -1.5, 0.7, 3, color) +
  rect(-0.9, -0.2, 1.8, 0.4, WHITE) +
  rect(-0.2, -0.9, 0.4, 1.8, WHITE) +
  rect(-1.6, -1.6, 0.5, 0.5, color) +
  rect(1.1, -1.6, 0.5, 0.5, color) +
  rect(-1.6, 1.1, 0.5, 0.5, color) +
  rect(1.1, 1.1, 0.5, 0.5, color) +
  '</g></g>'

// 근접 공격의 베는 자국 (0.6 → 0.72): 몬스터 위에 비스듬한 빛줄기 둘
export const slash = (color: string, cx = 26, cy = 7.5) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${cx} ${cy})">` +
  [0, 1, 2, 3, 4, 5].map(i => rect(-1.5 + i * 0.6, 1.5 - i * 0.6, 0.7, 0.7, color)).join('') +
  [0, 1, 2, 3].map(i => rect(-0.3 + i * 0.6, 2.4 - i * 0.6, 0.5, 0.5, WHITE)).join('') +
  '</g></g>'

// 불꽃·빛 같은 둘레 번짐 (shot의 glow 자리에 넣는다)
export const glowBox = (w: number, h: number, color: string) =>
  `<rect x="${at(-DOT)}" y="${at(-DOT)}" width="${at((w + 2) * DOT)}" height="${at((h + 2) * DOT)}" fill="${color}" opacity="0.35"><animate attributeName="opacity" values="0.15;0.5;0.15" dur="0.4s" repeatCount="indefinite"/></rect>`

// ── 계열 하나를 Job으로 ─────────────────────────────────────────────
export type Line = {
  key: string
  // 문장 이름("용기")과 이모지
  name: string
  icon: string
  gear: readonly string[]
  melee: boolean
  // 유년기 → 성장기 → 성숙기 → 완전체 → 궁극체
  stages: readonly [Stage, Stage, Stage, Stage, Stage]
  // 문장 마크 (5 × 5점쯤)
  crest: { rows: readonly string[]; pal: Palette }
  // 공격 효과 (전투 좌표). 단계 t마다 다르게 그릴 수 있다
  hit: (t: number, stage: number) => string
}

// 머리 위로 올라가는 만큼 위에 더 둘 자리(px). 전투 그림은 y = -2칸 위부터, 큰 그림은 (6 + 10y)px 위부터 잘린다
const smallHeadroom = (s: Stage, t: number) => Math.max(0, Math.ceil((-2 - top(s) + (t >= 9 ? 2.4 : 0)) * 4))
const bigHeadroom = (s: Stage, t: number) => Math.max(0, Math.ceil(-(6 + 10 * (top(s) - (t >= 9 ? 2.4 : 0)))))

export const makeLine = (line: Line): Job & { formName: (t: number) => string } => {
  const stageAt = (t: number) => line.stages[stageOf(t)]!
  return {
    key: line.key,
    name: line.name,
    icon: line.icon,
    gear: line.gear,
    melee: line.melee,
    formName: t => stageAt(t).name,
    small: (t, pose) => {
      const s = stageAt(t)
      return figure(s, pose) + (t >= 3 ? crestMark(line.crest.rows, line.crest.pal, s) : '') + glory(s, t, false)
    },
    hit: t => (t >= 10 ? '' : line.hit(t, stageOf(t))),
    big: (variant, t) => {
      const s = stageAt(t)
      return (
        '<g transform="translate(220 6) scale(10)">' +
        figure(s, 'stand', variant) +
        (t >= 3 ? crestMark(line.crest.rows, line.crest.pal, s) : '') +
        glory(s, t, true) +
        '</g>'
      )
    },
    smallHeadroom: t => smallHeadroom(stageAt(t), t),
    bigHeadroom: t => bigHeadroom(stageAt(t), t),
  }
}

// 직업의 현재 모습 이름 (디지몬 계열이면 진화 단계 이름, 아니면 직업 이름)
export const formName = (job: Job, t: number) => ('formName' in job ? (job as { formName: (t: number) => string }).formName(t) : job.name)
