// 디지몬 계열이 같이 쓰는 그림 틀: 도트 스프라이트(hooks/img/*.ts) 놓기, 진화 단계, 움직임, 후광, 계열 → Job.
// 각 계열 파일(jobs/*.ts)은 진화 단계 5개(유년기·성장기·성숙기·완전체·궁극체)와 히든 진화를 적고 makeLine으로 Job을 만든다.
// 격자는 발바닥이 y = 11칸(원본 Claude의 발 위치)에 닿고 x ≈ 14.5칸을 중심으로 놓인다. 작은 그림 칸: x 5~23.5, y -3~11.5
import { ATK } from './atk.ts'
import { GOLD, STAND_STEP, STEP, halo, sparkle } from './pixel.ts'
import type { BigVariant, Pose } from './pixel.ts'
import type { Job } from './jobs/types.ts'

const at = (v: number) => Math.round(v * 100) / 100

// 도트 PNG 스프라이트 (preview/pixelate-all.py가 art/*.png에서 만들고 preview/embed.py가 심는다). w·h는 원본 px
export type Sprite = { href: string; w: number; h: number }

// 장비 단계 t(레벨 ÷ 10) → 진화 단계: 0 유년기(1~9), 1 성장기(10~29), 2 성숙기(30~49), 3 완전체(50~79), 4 궁극체(80~). 11은 히든 진화(조그레스체)
export const stageOf = (t: number) => (t >= 8 ? 4 : t >= 5 ? 3 : t >= 3 ? 2 : t >= 1 ? 1 : 0)

export type Stage = {
  name: string
  image: Sprite
  // 화면에서의 키(칸). 너비는 원본 비율대로
  height: number
  // 원본이 왼쪽을 보면 true (오른쪽의 상대를 보게 뒤집는다). 기본 true
  flip?: boolean
  // 기술이 나가는 자리(입·손): 그림 너비·높이에 대한 비율 (0~1, 오른쪽을 본 상태 기준). 기본 (0.85, 0.3)
  mouth?: readonly [number, number]
  // 이 모습의 고유 기술 효과 (hooks/fx.ts 부품으로). from = 입(기술이 나가는 자리)의 전투 좌표
  fx?: (t: number, from: readonly [number, number]) => string
  // 이 모습이 근접 공격이면 true (돌진했다 돌아온다)
  melee?: boolean
}
export const sprite = (name: string, image: Sprite, height: number, extra: Partial<Stage> = {}): Stage => ({ name, image, height, ...extra })

// 그림이 차지하는 칸 상자: 가운데 x = 14.5, 발 y = 11
const origin = (s: Stage) => {
  const hc = s.height
  const wc = at((hc * s.image.w) / s.image.h)
  return { x: at(14.5 - wc / 2), y: at(11 - hc), wc, hc }
}
const top = (s: Stage) => origin(s).y

// 오류 때 빛이 바랜다 (이미지라 눈을 바꿀 수 없어서 몸 전체로 표현한다)
const FADE = '<filter id="digi-fade"><feColorMatrix type="saturate" values="0.25"/></filter>'

// 디지몬 한 마리. 전투(run)는 발끝을 축으로 앞뒤로 기울이며 뛰고 공격 순간 몸을 움찔한다. 쉴 때는 숨 쉰다
export const figure = (s: Stage, pose: Pose, variant?: BigVariant) => {
  const run = pose === 'run'
  const o = origin(s)
  const img = `<image href="${s.image.href}" x="0" y="0" width="${o.wc}" height="${o.hc}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`
  let frames = (s.flip ?? true) ? `<g transform="translate(${o.wc} 0) scale(-1 1)">${img}</g>` : img
  if (run) {
    // 뒤로 살짝 움츠렸다 앞으로 내민다 (발 가운데가 축)
    frames =
      `<g transform="translate(${at(o.wc / 2)} ${o.hc})">` +
      `<g><animateTransform attributeName="transform" type="scale" values="1 1;1 1;0.95 1.04;1.07 0.96;1 1;1 1" keyTimes="0;0.34;0.42;0.47;0.58;1" dur="${ATK}" repeatCount="indefinite"/>` +
      `<g transform="translate(${at(-o.wc / 2)} ${at(-o.hc)})">${frames}</g></g></g>`
    frames = `<g><animateTransform attributeName="transform" type="rotate" values="-4 ${at(o.wc / 2)} ${o.hc};4 ${at(o.wc / 2)} ${o.hc}" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>${frames}</g>`
  }
  const body = variant === 'error' ? `<defs>${FADE}</defs><g filter="url(#digi-fade)">${frames}</g>` : frames
  const bob = run
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.5" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`
    : `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3" dur="${STAND_STEP}" calcMode="discrete" repeatCount="indefinite"/>`
  return `<g transform="translate(${o.x} ${o.y})"><g>${bob}${body}</g></g>`
}

// 레벨 90~: 머리 위 후광과 반짝이. 100은 무지개 (궁극체 Lv.80 뒤의 보상)
const glory = (s: Stage, t: number) => {
  if (t < 9) return ''
  const o = origin(s)
  return halo(14.5, top(s) + 0.6, o.wc / 2.6, 0.7, 0.4, t) + sparkle(o.x - 1, o.y + 1, 1.2, GOLD, '0.3s') + sparkle(o.x + o.wc + 1, o.y, 1.2, GOLD, '1.1s')
}

// 단계의 입(기술이 나가는 자리)을 전투 좌표로: 전투 그림에서 디지몬은 (-5, 2)칸 옮겨 그려진다
export const mouthOf = (s: Stage): readonly [number, number] => {
  const o = origin(s)
  const [fx, fy] = s.mouth ?? [0.85, 0.3]
  return [at(o.x - 5 + o.wc * fx), at(o.y + 2 + o.hc * fy)]
}

// ── 계열 하나를 Job으로 ─────────────────────────────────────────────
export type Line = {
  key: string
  // 문장 이름("용기")과 이모지
  name: string
  icon: string
  gear: readonly string[]
  // 유년기 → 성장기 → 성숙기 → 완전체 → 궁극체
  stages: readonly [Stage, Stage, Stage, Stage, Stage]
  // 히든 진화 (장비 단계 11로 그린다: 조건을 채운 뒤의 레벨 100)
  omega?: Stage
}

// 머리 위로 올라가는 만큼 위에 더 둘 자리(px). 전투 그림은 y = -2칸 위부터, 큰 그림은 (6 + 10y)px 위부터 잘린다
const smallHeadroom = (s: Stage, t: number) => Math.max(0, Math.ceil((-2 - top(s) + (t >= 9 ? 1 : 0)) * 4))
const bigHeadroom = (s: Stage, t: number) => Math.max(0, Math.ceil(-(6 + 10 * (top(s) - (t >= 9 ? 1 : 0)))))

export const makeLine = (line: Line): Job & { formName: (t: number) => string } => {
  const stageAt = (t: number) => (t >= 11 && line.omega ? line.omega : line.stages[stageOf(t)]!)
  return {
    key: line.key,
    name: line.name,
    icon: line.icon,
    gear: line.gear,
    melee: t => stageAt(t).melee ?? false,
    formName: t => stageAt(t).name,
    small: (t, pose) => figure(stageAt(t), pose) + glory(stageAt(t), t),
    hit: t => {
      const s = stageAt(t)
      return s.fx ? s.fx(t, mouthOf(s)) : ''
    },
    big: (variant, t) => `<g transform="translate(220 6) scale(10)">${figure(stageAt(t), 'stand', variant)}${glory(stageAt(t), t)}</g>`,
    smallHeadroom: t => smallHeadroom(stageAt(t), t),
    bigHeadroom: t => bigHeadroom(stageAt(t), t),
  }
}

// 직업의 현재 모습 이름 (디지몬 계열이면 진화 단계 이름, 아니면 직업 이름)
export const formName = (job: Job, t: number) => ('formName' in job ? (job as { formName: (t: number) => string }).formName(t) : job.name)
