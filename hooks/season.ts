import type { Cycle, Seed } from '../types'
import { MONSTER_NAMES } from './monsters.ts'

// ── 경험치와 레벨 ──────────────────────────────────────────────────
// 주간 한도 사용률(%)이 곧 경험치다. 2주 동안 매주 한도를 다 쓰면 200 XP = 레벨 100 (2 XP마다 1레벨).
// 한 시즌은 한 달(한국 시간 1일 0시부터 다음 달 1일 0시까지)이고, 달이 바뀌면 레벨 1부터 다시 시작한다.

export const HOUR_MS = 3_600_000
export const KST = 9 * HOUR_MS
export const WEEK_MS = 7 * 24 * HOUR_MS
export const MAX_XP = 200

// 시각 t가 든 달: "2026-10", 그 달 1일 0시, 다음 달 1일 0시 (한국 시간)
export const monthOf = (t: number) => {
  const d = new Date(t + KST)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  return { key: `${y}-${String(m + 1).padStart(2, '0')}`, start: Date.UTC(y, m, 1) - KST, end: Date.UTC(y, m + 1, 1) - KST }
}

// 같은 주간 창은 다시 차는 시각(시 단위)으로 알아본다
const keyAt = (ms: number) => String(Math.round(ms / HOUR_MS))
export const weekKey = (resetsAt: string) => keyAt(Date.parse(resetsAt))
// 주간 창이 시작된 시각 (다시 차는 시각의 일주일 전, 시 단위로 맞춤)
export const weekStartOf = (resetsAt: string) => Math.round((Date.parse(resetsAt) - WEEK_MS) / HOUR_MS) * HOUR_MS

export const xpOf = (c: Cycle) =>
  Math.min(
    MAX_XP,
    Math.round((c.carry ?? 0) + Object.values(c.weeks).reduce((sum, w) => sum + Math.max(0, w.max - w.base), 0)),
  )
export const levelOf = (x: number) => Math.min(100, 1 + Math.floor(x / 2))
export const tierOf = (level: number) => (level >= 100 ? 10 : Math.floor(level / 10))
// 단계 t가 시작되는 경험치 (레벨 10t에 닿는 값)
const tierStart = (t: number) => (t <= 0 ? 0 : (10 * t - 1) * 2)
// 지금 상대하는 몬스터에게 남은 체력(0~1) = 다음 장비까지 남은 경험치의 비율
export const foeHp = (x: number) => {
  const t = tierOf(levelOf(x))
  if (t >= 10) return 1
  const a = tierStart(t)
  return 1 - (x - a) / (tierStart(t + 1) - a)
}
// 레벨, 장비 단계, 상대 몬스터 이름 등 한 번에
export const rankOf = (x: number) => {
  const level = levelOf(x)
  const tier = tierOf(level)
  return { level, tier, foe: MONSTER_NAMES[tier]!, foeHp: Math.round(foeHp(x) * 100), next: tier >= 10 ? null : (tier + 1) * 10 }
}

// 처음 보는 주간 창에서 시즌 전에 쓴 양(base, 경험치에서 뺄 값).
// 이번 달에 시작한 주는 0: 설치하기 전에 쓴 양도 다 센다.
// 지난달에 시작한 주는 지금까지 쓴 양을 지난 시간에 비례해 나눠 지난달 몫을 뺀다.
// 지난달 기록에서 그 주를 본 적이 있으면(seenBefore) 그보다 적게 빼지 않는다
export const firstBase = (percentUsed: number, resetsAt: string, seasonStart: number, now: number, seenBefore = 0) => {
  const ws = weekStartOf(resetsAt)
  if (Number.isNaN(ws) || ws >= seasonStart) return 0
  // 시즌 전에 다 끝난 창이면 전부 지난달 몫이다
  if (Date.parse(resetsAt) <= seasonStart) return percentUsed
  const share = now > ws ? Math.min(1, (seasonStart - ws) / (now - ws)) : 1
  return Math.min(percentUsed, Math.max(seenBefore, Math.round(percentUsed * share)))
}

// ── 보물상자 ──────────────────────────────────────────────────────
// 일을 잘 마칠 때마다 1% 확률로 보물상자가 나온다(한 달에 한 번까지). 상자를 열면 펫 넷 가운데 하나가 나온다.
// 끝난 시각과 걸린 시간을 섞어 굴리므로 Math.random 없이도 턴마다 결과가 다르다
export const DIGIVICE_CHANCE = 0.01

const mix = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}
export const digiviceRoll = (t: number, salt: number) => mix(`chest:${t}:${salt}`) / 4294967296 < DIGIVICE_CHANCE

// ── 설치 전 사용량 어림 ────────────────────────────────────────────
// 설치할 때 scripts/seed.mjs가 로컬 대화 기록에서 시간별 사용량(가격 비율로 환산)을 남긴다.
// 이번 주의 실제 사용률 ÷ 이번 주 기록 = 기록 1만큼이 몇 %인지. 이 비율로 이번 달 1일부터
// 이번 주 전까지 쓴 양을 사용률로 바꾼다. 기록에 없는 사용(웹·앱 채팅 등)도 비율에 녹아든다.

// 설치 기록은 만든 뒤 이 시간 안에 처음 반영한다. 늦게 반영하면 그사이 쓴 양이 이번 주 사용률에만 들어가 비율이 틀어진다
export const SEED_FRESH_MS = 24 * HOUR_MS
// 이번 주 사용률이 이만큼(%)은 되어야 비율을 믿는다. 그 전에는 기다렸다가 다시 해 본다
const MIN_CALIBRATION = 5

// 돌려주는 값: 이번 주의 시즌 전 몫(base)과, 이번 주 앞의 주들이 이번 달에 쓴 사용률(주간 창 열쇠별)
export const fromSeed = (seed: Seed, monthStart: number, week: { percentUsed: number; resetsAt: string }) => {
  const end = Date.parse(week.resetsAt)
  if (Number.isNaN(end) || !(week.percentUsed >= MIN_CALIBRATION)) return null
  const weekStart = weekStartOf(week.resetsAt)
  // 기록을 만든 뒤 주간 한도가 다시 찼으면 이번 주 기록이 없어 비율을 못 구한다
  if (seed.made < weekStart) return null
  const sum = (a: number, b: number) => seed.hours.reduce((s, [h, v]) => (h * HOUR_MS >= a && h * HOUR_MS < b ? s + v : s), 0)
  const cur = sum(weekStart, end)
  if (!(cur > 0)) return null
  const rate = week.percentUsed / cur
  // 이번 주가 지난달에 시작했으면 달이 바뀌기 전에 쓴 양은 빼고 센다
  const base = weekStart < monthStart ? Math.min(week.percentUsed, Math.round(rate * sum(weekStart, monthStart))) : 0
  // 이번 주 앞의 주들은 이번 달에 든 부분만 센다. 한 주에 100%를 넘을 수 없으니 넘게 나오면 그 비율로 줄인다
  const weeks: Record<string, number> = {}
  for (let s = weekStart - WEEK_MS; s + WEEK_MS > monthStart; s -= WEEK_MS) {
    const all = rate * sum(s, s + WEEK_MS)
    if (all <= 0) continue
    weeks[keyAt(s + WEEK_MS)] = Math.round(rate * sum(Math.max(s, monthStart), s + WEEK_MS) * Math.min(1, 100 / all))
  }
  return { base, weeks }
}
