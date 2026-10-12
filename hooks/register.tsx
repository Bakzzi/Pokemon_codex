import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Cycle, Digivice, Hp, Limit, Limits, Phase, WaitKind } from '../types'
import { MONSTER_NAMES, foeBig, foeSkill } from './monsters.ts'
import {
  HOUR_MS,
  KST,
  MAX_XP,
  SEED_FRESH_MS,
  digiviceRoll,
  firstBase,
  foeHp,
  fromSeed,
  levelOf,
  monthOf,
  rankOf,
  tierOf,
  weekKey,
  xpOf,
} from './season.ts'
import { SEED } from './seed.ts'
import { bigSvg, hpBarSvg, hpColor, idleSvg, runSvg, xpBarSvg } from './sprites.ts'
import { jobOf, nextJobs } from './jobs/index.ts'
import { boostTier, formName } from './digi.ts'

// 입력창 위 띠(밴드)는 상태가 바뀔 때만 다시 그린다. 데스크톱 앱은 띠를 다시 그릴 때마다
// 움직이는 그림 칸을 새로 만들어서 그림이 처음부터 다시 돈다. 그래서 띠를 그리는 훅은
// phase·waitKind·lastMs·shown·shownXp·introUntil·spent(·쉬는 중의 limits·xp)만 읽고, 자주 바뀌는
// 하는 일과 한마디는 앱의 진행 표시줄(Spinner) 뒤에 붙인다. 같은 값을 다시 적어도 다시 그려지므로
// 띠가 읽는 값은 바뀔 때만 적는다.

const phase = atom({ plugin: 'digimon-buddy', key: 'phase' } as const, 'idle')
const waitKind = atom({ plugin: 'digimon-buddy', key: 'waitKind' } as const, 'permission')
const asking = atom({ plugin: 'digimon-buddy', key: 'asking' } as const, false)
const introUntil = atom({ plugin: 'digimon-buddy', key: 'introUntil' } as const, 0)
const mode = atom({ plugin: 'digimon-buddy', key: 'mode' } as const, 'default')
const syncedAt = atom({ plugin: 'digimon-buddy', key: 'syncedAt' } as const, 0)
const startedAt = atom({ plugin: 'digimon-buddy', key: 'startedAt' } as const, 0)
const lastMs = atom({ plugin: 'digimon-buddy', key: 'lastMs' } as const, 0)
const activity = atom({ plugin: 'digimon-buddy', key: 'activity' } as const, '')
const limits = atom({ plugin: 'digimon-buddy', key: 'limits' } as const, { five: null, week: null })
const shown = atom({ plugin: 'digimon-buddy', key: 'shown' } as const, { five: null, week: null })
// 경험치(0~200)와 시즌 끝 시각. xp는 최신 값, shownXp는 캐릭터에 입힌 값(턴의 시작과 끝에만 바꾼다)
const xp = atom({ plugin: 'digimon-buddy', key: 'xp' } as const, 0)
const shownXp = atom({ plugin: 'digimon-buddy', key: 'shownXp' } as const, 0)
const seasonEnd = atom({ plugin: 'digimon-buddy', key: 'seasonEnd' } as const, 0)
// 이달의 계열(문장) (시즌 기록의 job). 그림과 진화·기술 이름이 이 계열을 따른다
const job = atom({ plugin: 'digimon-buddy', key: 'job' } as const, '')
// 이달의 디지바이스: 찾고 아직 안 썼는지, 써서 임시 진화 중인지 (모든 창이 $.store 'digivice'에서 같은 값을 읽는다)
const digiReady = atom({ plugin: 'digimon-buddy', key: 'digiReady' } as const, false)
const digiOn = atom({ plugin: 'digimon-buddy', key: 'digiOn' } as const, false)
// 방금 끝난 턴이 디지바이스를 찾았는지 (그 끝 알림에만 띄운다. 예전에 찾았거나 다른 창에서 찾은 것은 쉬는 띠에)
const digiFound = atom({ plugin: 'digimon-buddy', key: 'digiFound' } as const, false)
// 캐릭터에 입힌 계열: 턴의 시작과 끝에만 바꾼다 (자정에 달이 바뀌어도 싸우는 도중 그림이 바뀌지 않게)
const shownJob = atom({ plugin: 'digimon-buddy', key: 'shownJob' } as const, '')
// 히든 진화: 용기(워그레이몬)·우정(메탈가루몬) 시즌에서 각각 Lv.80(궁극체)에 닿으면 열린다 ($.store 'maxed'에 닿은 계열을 모은다). 열린 뒤에는 어느 시즌이든 Lv.100에 오메가몬
const omega = atom({ plugin: 'digimon-buddy', key: 'omega' } as const, false)
const OMEGA_LINES = ['courage', 'friendship']
const omegaReady = (maxed: readonly string[] | undefined) => OMEGA_LINES.every(k => maxed?.includes(k))
// Lv.80에 닿은 계열을 기록하고, 둘 다 닿았으면 알린다
async function noteMaxed($: any, lineKey: string | undefined, level: number) {
  const maxed = ((await $.store.get('maxed')) as string[] | undefined) ?? []
  const wasReady = omegaReady(maxed)
  if (level >= 80 && lineKey && OMEGA_LINES.includes(lineKey) && !maxed.includes(lineKey)) {
    maxed.push(lineKey)
    await $.store.set('maxed', maxed)
  }
  const ready = omegaReady(maxed)
  if ((await read($, omega)) !== ready) await update($, omega, () => ready)
  if (ready && !wasReady) await $.ui.toast('🌟 워그레이몬과 메탈가루몬이 모두 깨어났어요! 이제 어느 시즌이든 Lv.100에는 오메가몬으로 조그레스 진화!')
}
// 그릴 단계: 히든 진화가 열렸고 Lv.100이면 11(오메가몬). 디지바이스 임시 진화 중이면 한 단계 위
const drawTier = (tier: number, ready: boolean, boosted = false) => (ready && tier >= 10 ? 11 : boosted ? boostTier(tier) : tier)
// 사람에게 묻는 중인 도구 호출들 (여럿이 같이 돌 때 하나가 끝났다고 기다림을 풀지 않게). 띠는 읽지 않는다
const pendingAsks = atom({ plugin: 'digimon-buddy', key: 'pendingAsks' } as const, [] as string[])

// ── 이번 응답의 점수 ────────────────────────────────────────────────
// 끝 알림에 이번 응답(턴)에서 쓴 양을 점수로 적는다. 사용률은 1% 단위라 응답 하나로는 거의 움직이지 않으므로,
// 응답마다 앱이 알려 주는 토큰 수(context.breakdown.apiUsage)에 공개 가격의 비율로 무게를 준다
// (scripts/seed.mjs와 같은 비율. 구독 계정 데스크톱 앱에서는 세션 비용 cost.usd가 늘지 않아 쓰지 않는다). 가중 토큰 1,000개 = 1점.
// 앱의 측정 이벤트는 응답 중에 오지 않아 턴의 시작과 끝에 센다. 전투 중 데미지 숫자는 sprites.ts의 연출용 값이다
// 토큰 종류별 무게 (입력 대비 가격 비율): 출력 5배, 캐시 읽기 0.05배, 캐시 쓰기 1.25배
const WEIGHT = { input: 1, output: 5, cacheRead: 0.05, cacheWrite: 1.25 }
const TOKENS_PER_POINT = 1000

// 턴을 시작할 때의 점수와 이번 턴에 쓴 점수
const turnFrom = atom({ plugin: 'digimon-buddy', key: 'turnFromPoints' } as const, null as number | null)
const spent = atom({ plugin: 'digimon-buddy', key: 'spentPoints' } as const, null as number | null)
// 이 창이 지금까지 쓴 점수와 마지막으로 센 응답 (같은 응답을 두 번 세지 않게)
const pointsTotal = atom({ plugin: 'digimon-buddy', key: 'pointsTotal' } as const, 0)
const lastUsage = atom({ plugin: 'digimon-buddy', key: 'lastUsage' } as const, '')

type ApiUsage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
const pointsOfUsage = (a: ApiUsage) =>
  (a.input_tokens * WEIGHT.input + a.output_tokens * WEIGHT.output + a.cache_read_input_tokens * WEIGHT.cacheRead + a.cache_creation_input_tokens * WEIGHT.cacheWrite) /
  TOKENS_PER_POINT

// 마지막 응답의 토큰 수를 읽어 아직 안 센 응답이면 이 창의 점수에 더한다. 지금까지 쓴 점수를 돌려준다.
// breakdown 'summary'는 앱 안에서 어림하므로 요청을 보내지 않는다. 메인 대화의 응답만 잡힌다(서브에이전트는 빠진다)
async function countUsage($: any): Promise<number> {
  const u = await $.session.usage({ breakdown: 'summary' })
  const a = u.context?.breakdown?.apiUsage as ApiUsage | null | undefined
  if (a) {
    const sig = JSON.stringify([a.input_tokens, a.output_tokens, a.cache_read_input_tokens, a.cache_creation_input_tokens, u.context.tokens ?? 0])
    if (sig !== (await read($, lastUsage))) {
      await update($, lastUsage, () => sig)
      await update($, pointsTotal, v => v + pointsOfUsage(a))
    }
  }
  return read($, pointsTotal)
}

// 점수 세기가 실패해도 띠와 다른 훅은 그대로 돌게 한다 (끝 알림에 점수만 빠진다)
async function guard(f: () => Promise<unknown>) {
  try {
    await f()
  } catch {}
}

// 턴을 시작할 때: 지금 점수를 출발점으로 적고 지난 턴의 점수를 비운다
async function startSpent($: any) {
  await update($, turnFrom, () => null)
  if ((await read($, spent)) !== null) await update($, spent, () => null)
  const total = await countUsage($)
  await update($, turnFrom, () => total)
}

// 턴이 끝날 때: 이번 턴에 쓴 점수
async function noteSpent($: any) {
  const total = await countUsage($)
  const base = await read($, turnFrom)
  const points = base === null ? null : Math.max(0, Math.round(total - base))
  if ((await read($, spent)) !== points) await update($, spent, () => points)
}
// 끝 알림에 붙이는 한 줄: "이번 응답 26점" (못 셌으면 빈 글자)
const spentLine = (s: number | null) => (s === null ? '' : `이번 응답 ${s.toLocaleString('en-US')}점`)

// ── 경험치와 레벨 ──────────────────────────────────────────────────
// 계산은 season.ts에 있다. 한 시즌은 한 달(한국 시간 1일 0시부터)이고, 달이 바뀌면 레벨 1부터 다시 시작한다.
// 한도는 계정 전체의 값이라, 모든 세션이 $.store의 'season' 하나를 같이 쓴다.
// 주(週)마다 본 가장 큰 사용률만 남기므로 여러 세션이 같은 사용량을 두 번 세지 않는다.

// 주간 한도 값을 받아 시즌 기록을 고치고, 진화·기술을 얻으면 알린다
async function gainXp($: any, list: readonly RateLimit[]) {
  const t = await $.clock.now()
  const month = monthOf(t)
  const saved = (await $.store.get('season')) as Cycle | undefined
  // 예전 28일 시즌 기록(month 없음)은 새 기준(이번 달 1일부터)으로 다시 센다
  const old = saved !== undefined && saved.month === undefined
  const expired = saved !== undefined && !old && saved.month !== month.key
  // 다시 차는 시각이 지난 주간 값은 끝난 창의 것이라 세지 않는다
  const week = list.find(w => w.kind === 'seven_day' && w.resetsAt !== undefined && Date.parse(w.resetsAt) > t)
  // 새 시즌이면 이번 돌림에 아직 안 나온 계열 가운데 하나를 고른다 (지난달 계열은 빼고)
  const fresh = !saved || old || expired
  const picked = fresh ? nextJobs(month.key, expired ? saved?.jobsUsed : undefined, expired ? saved?.job : undefined) : null
  if (fresh && !week) {
    // 새 달인데 아직 주간 사용률을 못 봤으면 지난달 기록을 그대로 둔다(걸친 주에서 지난달 몫을 빼려면 필요하다).
    // 보여 주는 값만 새 달로 바꾼다
    if ((await read($, xp)) !== 0) await update($, xp, () => 0)
    if ((await read($, seasonEnd)) !== month.end) await update($, seasonEnd, () => month.end)
    if ((await read($, job)) !== picked!.job) await update($, job, () => picked!.job)
    return
  }
  let c: Cycle =
    saved && !fresh
      ? saved
      : { month: month.key, start: month.start, weeks: {}, carry: 0, tier: old ? saved.tier : 0, ...picked }
  // 계열이 없는 이번 달 기록(예전 판에서 만든 것)이면 지금 고른다
  const newJob = fresh || !c.job
  if (!c.job) c = { ...c, ...nextJobs(month.key, undefined, undefined) }
  const myJob = jobOf(c.job)
  let seeded = false
  let seedMissed = false
  if (week?.resetsAt) {
    const key = weekKey(week.resetsAt)
    const prev = c.weeks[key]
    // 처음 보는 주는 시즌(이번 달) 전에 쓴 양을 빼고 센다. 지난달 기록에 같은 주가 있으면 참고한다
    const before = expired ? saved?.weeks[key]?.max : undefined
    const base = prev ? prev.base : firstBase(week.percentUsed, week.resetsAt, c.start, t, before)
    const max = Math.max(prev?.max ?? 0, week.percentUsed)
    c = { ...c, weeks: { ...c.weeks, [key]: { base, max } } }
    // 설치할 때 남긴 사용 기록(seed.ts)으로 이번 달 1일부터 쓴 양을 채운다. 기록 하나는 그 뒤 처음 본 주간 값에
    // 한 번만 쓴다(나중에 쓰면 그사이 쓴 양이 이번 주 사용률에만 들어가 비율이 틀어진다).
    // 모드가 이미 본 주는 그대로 두고, 못 본 주만 기록으로 채운다
    if (SEED && SEED.made > (c.seed ?? 0) && monthOf(SEED.made).key === month.key) {
      const s = t - SEED.made < SEED_FRESH_MS ? fromSeed(SEED, c.start, week) : null
      c = { ...c, seed: SEED.made }
      if (s) {
        const filled: Cycle['weeks'] = {}
        for (const [k, v] of Object.entries(s.weeks)) if (!(k in c.weeks)) filled[k] = { base: 0, max: v }
        const cur = prev ? { base: prev.base, max } : { base: Math.min(week.percentUsed, Math.max(s.base, before ?? 0)), max }
        c = { ...c, weeks: { ...filled, ...c.weeks, [key]: cur } }
        seeded = true
      } else {
        seedMissed = true
      }
    }
  }
  const x = xpOf(c)
  const level = levelOf(x)
  const tier = tierOf(level)
  const foe = tier >= 10 ? `최종 보스 ${MONSTER_NAMES[10]}과 결전!` : `상대는 ${MONSTER_NAMES[tier]}`
  const who = `${myJob.icon} ${myJob.name}`
  if (seeded) {
    await $.ui.toast(`📜 이번 달 1일부터 쓴 양을 어림했어요 · 이달의 문장 ${who} · XP ${x} · Lv.${level}부터 시작! ${foe}`)
  } else if (seedMissed) {
    await $.ui.toast(
      '📜 모아 둔 사용 기록으로 1일부터 어림하지 못했어요(이번 주 사용량이 5% 미만이거나 기록이 하루 넘게 지남). 조금 쓴 뒤 seed.mjs를 다시 실행하고 /reload-plugins 해 주세요',
    )
  } else if (expired) {
    await $.ui.toast(`🔄 새 시즌 시작! 이달의 문장은 ${who} · 경험치를 다시 세요 · Lv.${level} · ${foe}`)
  } else if (newJob) {
    await $.ui.toast(`🎲 이달의 문장은 ${who}! Lv.${level} · ${foe}`)
  } else if (tier >= 10 && c.tier < 10) {
    await $.ui.toast(`🏆 Lv.100! ${MONSTER_NAMES[9]} 격파 · ${myJob.gear[10]} · 최종 보스 ${MONSTER_NAMES[10]} 등장!`)
  } else if (tier > c.tier) {
    await $.ui.toast(`⚔️ Lv.${level}! ${MONSTER_NAMES[tier - 1]} 격파 · ${myJob.gear[tier]} · 다음 상대 ${MONSTER_NAMES[tier]}`)
  }
  c = { ...c, tier }
  await $.store.set('season', c)
  await noteMaxed($, c.job, level)
  if ((await read($, xp)) !== x) await update($, xp, () => x)
  if ((await read($, seasonEnd)) !== month.end) await update($, seasonEnd, () => month.end)
  if ((await read($, job)) !== c.job) await update($, job, () => c.job ?? '')
}

// ── 다른 창(세션)과 나누기 ─────────────────────────────────────────
// 한도는 각 창이 자기 응답에서만 본다. 그래서 창마다 본 한도를 $.store 'limits'에 모으고,
// 쉬고 있는 창도 1분마다 그 기록과 시즌 기록을 읽어 HP와 경험치를 맞춘다.
// (데스크톱 앱은 띠를 맨 왼쪽 칸에만 그리니, 다른 칸에서 일한 만큼도 거기에 보여야 한다)
const SYNC_MS = 60_000

// 같은 한도를 두 창이 봤을 때 더 새것: 다시 차는 시각이 늦은 쪽, 같은 창이면 더 많이 쓴(HP가 적은) 쪽
const fresher = (a: Limit | null, b: Limit | null): Limit | null => {
  if (!a || !b) return a ?? b
  const ta = a.resetsAt ? Date.parse(a.resetsAt) : NaN
  const tb = b.resetsAt ? Date.parse(b.resetsAt) : NaN
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && Math.abs(ta - tb) >= HOUR_MS) return ta > tb ? a : b
  return a.left <= b.left ? a : b
}
// 다시 차는 시각이 지난 한도는 다 찬 것(HP 100)으로 본다. 다음 응답이 새 창의 값을 알려 줄 때까지
const settle = (l: Limit | null, now: number): Limit | null =>
  l && l.resetsAt && Date.parse(l.resetsAt) <= now ? { left: 100, resetsAt: null } : l
const mergeLimits = (a: Limits, b: Limits | undefined, now: number): Limits => ({
  five: settle(fresher(a.five, b?.five ?? null), now),
  week: settle(fresher(a.week, b?.week ?? null), now),
})
const sameLimits = (a: Limits, b: Limits) => JSON.stringify(a) === JSON.stringify(b)

// 이 창이 본 한도를 모든 창의 기록에 더하고, 합친 값을 이 창의 HP로 쓴다
async function shareLimits($: any, seen: Limits) {
  const merged = mergeLimits(seen, (await $.store.get('limits')) as Limits | undefined, await $.clock.now())
  await $.store.set('limits', merged)
  if (!sameLimits(merged, await read($, limits))) await update($, limits, () => merged)
  return merged
}

// 모든 창이 같이 쓰는 기록에서 HP와 경험치를 가져온다 (바뀐 값만 적는다)
async function syncShared($: any) {
  const t = await $.clock.now()
  // /clear 등으로 타이머가 둘 돌게 되어도 1분에 한 번만 일한다
  if (t - (await read($, syncedAt)) < SYNC_MS / 2) return
  await update($, syncedAt, () => t)
  const cur: Limits = await read($, limits)
  const merged = mergeLimits(cur, (await $.store.get('limits')) as Limits | undefined, t)
  if (!sameLimits(merged, cur)) await update($, limits, () => merged)
  const month = monthOf(t)
  const c = (await $.store.get('season')) as Cycle | undefined
  if (c?.month === month.key) {
    const x = xpOf(c)
    if ((await read($, xp)) !== x) await update($, xp, () => x)
    if ((await read($, seasonEnd)) !== month.end) await update($, seasonEnd, () => month.end)
    if (c.job && (await read($, job)) !== c.job) await update($, job, () => c.job ?? '')
    await noteMaxed($, c.job, levelOf(x))
  } else if (merged.week) {
    // 달이 바뀌었는데(또는 예전 기록) 아직 아무 창도 새 시즌을 열지 않았으면 이 창이 연다
    const used = { kind: 'seven_day', percentUsed: 100 - merged.week.left, resetsAt: merged.week.resetsAt ?? undefined }
    await gainXp($, [used])
  }
  await syncDigivice($, month.key)
}

// ── 디지바이스 (임시 진화) ─────────────────────────────────────────
// 일을 잘 마칠 때 1% 확률로 디지바이스가 나온다(한 달에 한 번까지, 아직 궁극체가 아닐 때만). 확인을 누르면 빛나며
// 한 진화 단계 위 모습이 되고, 그달 남은 기간 동안 유지된다(모습과 기술만 위고 레벨·상대·경험치는 그대로. 레벨로 그 단계에
// 닿으면 자연히 흡수된다). 다른 창에서 찾은 디지바이스는 1분 안에 이 창의 쉬는 띠에도 나온다

// 모든 창이 같이 쓰는 기록에서 이달의 디지바이스를 읽어 이 창에 맞춘다 (지난달 것이면 없앤다)
async function syncDigivice($: any, monthKey: string) {
  const saved = (await $.store.get('digivice')) as Digivice | undefined
  const mine = saved?.month === monthKey ? saved : undefined
  const ready = mine !== undefined && !mine.on
  const on = mine?.on === true
  if ((await read($, digiReady)) !== ready) await update($, digiReady, () => ready)
  if ((await read($, digiOn)) !== on) {
    await update($, digiOn, () => on)
    // 진화 장면을 띄워 둔 채 달이 바뀌어 효과가 끝났으면 그 장면도 닫는다
    if (!on && (await read($, phase)) === 'evolve') await update($, phase, () => 'idle')
  }
}

// 일을 마친 턴마다 굴린다. 이달에 이미 찾았거나 이미 궁극체면 굴리지 않는다. 이번에 새로 찾았으면 true
async function rollDigivice($: any, salt: number, level: number) {
  const t = await $.clock.now()
  const monthKey = monthOf(t).key
  const saved = (await $.store.get('digivice')) as Digivice | undefined
  const found = saved?.month !== monthKey && level < 80 && digiviceRoll(t, salt)
  if (found) await $.store.set('digivice', { month: monthKey, at: t })
  await syncDigivice($, monthKey)
  return found
}

// 디지바이스를 쓴다: 임시 진화를 켜고 진화 장면으로 바꾼다
async function useDigivice($: any) {
  const t = await $.clock.now()
  const monthKey = monthOf(t).key
  const saved = (await $.store.get('digivice')) as Digivice | undefined
  if (saved?.month !== monthKey) {
    // 자정이 지나 지난달 것이 되었다
    await syncDigivice($, monthKey)
    if ((await read($, phase)) !== 'idle') await update($, phase, () => 'idle')
    await $.ui.toast('📱 달이 바뀌어 지난달 디지바이스는 빛을 잃었어요. 이번 달에 다시 찾아봐요!')
    return
  }
  if (!saved.on) await $.store.set('digivice', { ...saved, on: true })
  await update($, introUntil, () => t + INTRO_MS)
  await syncDigivice($, monthKey)
  await update($, phase, () => 'evolve')
}

// 1분마다 맞추는 타이머. 모드를 다시 불러오면(/reload-plugins) 엔진이 타이머를 없애고 이 변수도 새로 시작하므로,
// 타이머가 없으면 새로 건다. $.state의 값은 다시 불러와도 남아서 타이머가 살아 있는지 알려 주지 못한다
let syncTimer: { cancel: () => void } | undefined
// 쉬는 띠가 그려질 때 타이머가 없으면 한 번만 걸어 달라고 부탁해 둔다 (다시 불러온 뒤 아무 일도 없는 창)
let syncKicked = false

// 1분마다 맞추기를 시작한다. 이미 돌고 있으면 그대로 두고, 오래 못 맞췄으면(타이머가 끊겼으면) 다시 건다
async function startSync($: any) {
  const t = await $.clock.now()
  if (syncTimer && t - (await read($, syncedAt)) > SYNC_MS * 1.5) {
    syncTimer.cancel()
    syncTimer = undefined
  }
  if (syncTimer) return
  syncTimer = $.clock.every(SYNC_MS, () => {
    void syncShared($)
  })
  await syncShared($)
}

// ── 사람을 기다릴 때 ──────────────────────────────────────────────
// 질문과 계획 승인은 사람이 답할 때까지 멈추므로 tool.call에서 바로 크게 알린다
const askKindOf = (tool: string): WaitKind | undefined =>
  tool === 'AskUserQuestion' ? 'question' : tool === 'ExitPlanMode' ? 'plan' : undefined
// 이 권한 모드들에서는 'ask'를 사람에게 묻지 않는다 (auto는 분류기가 정하고, 나머지는 묻지 않고 정한다)
const NO_PROMPT_MODES = ['auto', 'bypassPermissions', 'dontAsk']

// 권한 요청은 모드가 스스로 허용하기도 하니, 1.5초 넘게 기다릴 때만 크게 알린다
const WAIT_DELAY_MS = 1500
// 큰 그림의 등장 동작(커지기·말풍선·색종이)이 끝나는 시간. 이 뒤로는 등장 없이 그린다
const INTRO_MS = 1600

async function noteMode($: any, m: string | undefined) {
  if (m && (await read($, mode)) !== m) await update($, mode, () => m)
}

// 사람에게 묻는 권한 요청이 열렸다: 1.5초 뒤에도 답을 기다리면 크게 알린다
async function askLater($: any) {
  await update($, asking, () => true)
  $.clock.after(WAIT_DELAY_MS, () => {
    void showWaiting($)
  })
}

async function showWaiting($: any) {
  // 그사이 답했거나, 이미 질문·계획으로 기다리는 중이면 그대로 둔다
  if (!(await read($, asking)) || (await read($, phase)) !== 'running') return
  const t = await $.clock.now()
  await update($, waitKind, () => 'permission')
  await update($, introUntil, () => t + INTRO_MS)
  await update($, phase, () => 'waiting')
}
// 띠의 그림 높이(px). 달리는 그림(HP 이름표 포함)과 같게 맞춰서 어떤 상태에서도 띠 높이가 늘지 않게 한다
const BAND_H = 86
// HP가 이만큼(%) 이하로 남으면 지친 한마디로 바꾼다
const LOW_HP = 20

const GREEN = '#22A06B'
const AMBER = '#E8A317'
const RED = '#E5484D'

// 싸우는 동안 12초마다 바뀌는 한마디
const QUIPS = [
  '필살기 모으는 중',
  '빈틈 노리는 중',
  '진화 에너지 모으는 중',
  '파트너와 호흡 맞추는 중',
  '디지바이스가 빛나는 중',
  '공격 피하는 중',
  '기합 넣는 중',
  '연속 기술 이어가는 중',
]
const TIRED_QUIPS = ['헉헉… HP가 얼마 안 남았어요', '고기 먹고 싶어요…', '퇴화할 것 같아요', '마지막 힘을 짜내는 중']

const activityOf = (tool: string) => {
  if (tool === 'Bash' || tool === 'PowerShell') return '명령 실행 중'
  if (tool === 'Read') return '파일 읽는 중'
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') return '코드 고치는 중'
  if (tool === 'Grep' || tool === 'Glob') return '코드 뒤지는 중'
  if (tool === 'WebSearch' || tool === 'WebFetch') return '웹 찾아보는 중'
  if (tool === 'Agent' || tool === 'Task') return '서브에이전트랑 같이 뛰는 중'
  if (tool === 'TodoWrite' || tool.startsWith('Task')) return '할 일 정리 중'
  if (tool === 'Skill') return '스킬 펼쳐 보는 중'
  if (tool.startsWith('mcp__')) return '외부 도구 쓰는 중'
  return '도구 쓰는 중'
}

// "12초", "3분 5초", "1시간 2분"
const elapsedText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s % 60}초`
  return `${s}초`
}

// ── 한도를 HP로 ──────────────────────────────────────────────────
// 사용률(percentUsed)을 남은 비율로 뒤집어 HP로 본다

type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

const limitOf = (list: readonly RateLimit[], kind: string): Limit | null => {
  const w = list.find(x => x.kind === kind)
  return w ? { left: Math.max(0, Math.min(100, Math.round(100 - w.percentUsed))), resetsAt: w.resetsAt ?? null } : null
}
const limitsOf = (list: readonly RateLimit[]): Limits => ({
  five: limitOf(list, 'five_hour'),
  week: limitOf(list, 'seven_day'),
})
const hpOf = (l: Limits): Hp => ({ five: l.five?.left ?? null, week: l.week?.left ?? null })
const isTired = (hp: Hp) => (hp.five !== null && hp.five <= LOW_HP) || (hp.week !== null && hp.week <= LOW_HP)

const DAYS =['일', '월', '화', '수', '목', '금', '토']

// 다시 차는 시각: "오후 1:30 회복", 주간은 요일까지 "(월) 오후 10:00 회복" (한국 시간)
// 남은 시간을 세지 않고 시각으로 보여 줘서, 쉬는 동안 띠를 다시 그릴 일이 없다
const resetText = (resetsAt: string | null, nowMs: number, withDay: boolean) => {
  if (!resetsAt) return ''
  const t = Date.parse(resetsAt)
  if (Number.isNaN(t)) return ''
  if (t <= nowMs) return '곧 회복'
  const d = new Date(t + KST)
  const h24 = d.getUTCHours()
  const ampm = h24 < 12 ? '오전' : '오후'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${withDay ? `(${DAYS[d.getUTCDay()]}) ` : ''}${ampm} ${h12}:${mm} 회복`
}

// 쉬는 동안 보여 줄 HP 줄들
type HpRow = { key: string; label: string; v: number; detail: string }
const hpRowsOf = (l: Limits, nowMs: number) => {
  const rows: HpRow[] = []
  if (l.five) rows.push({ key: 'five', label: '5시간 HP', v: l.five.left, detail: resetText(l.five.resetsAt, nowMs, false) })
  if (l.week) rows.push({ key: 'week', label: '주간 HP', v: l.week.left, detail: resetText(l.week.resetsAt, nowMs, true) })
  return rows
}

// "HP · 5시간 59% · 주간 56%" (한도 정보가 없으면 빈 문자열)
const hpLine = (hp: Hp) => {
  const parts: string[] = []
  if (hp.five !== null) parts.push(`5시간 ${hp.five}%`)
  if (hp.week !== null) parts.push(`주간 ${hp.week}%`)
  return parts.length > 0 ? `HP · ${parts.join(' · ')}` : ''
}

const hpTextBar = (v: number, cells: number) => {
  const filled = Math.round((v / 100) * cells)
  return '█'.repeat(filled) + '░'.repeat(cells - filled)
}

// 기다리는 이유별 말풍선과 안내
const WAIT: Record<WaitKind, { bubble: [string, string]; title: string; hint: string; icon: string }> = {
  permission: { bubble: ['잠깐만요!', '허락이 필요해요'], title: '잠깐만요! 허락이 필요해요', hint: '권한 요청에 답하면 다시 달려요', icon: '✋' },
  question: { bubble: ['질문 있어요!', '답을 골라 주세요'], title: 'Claude가 질문했어요', hint: '답을 고르면 다시 달려요', icon: '🙋' },
  plan: { bubble: ['계획 나왔어요!', '확인해 주세요'], title: '계획을 확인해 주세요', hint: '승인하면 다시 달려요', icon: '📝' },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    const l = await shareLimits($, limitsOf(usage.rateLimits))
    await update($, shown, () => l)
    await gainXp($, usage.rateLimits)
    const x = await read($, xp)
    const j = await read($, job)
    await update($, shownXp, () => x)
    await update($, shownJob, () => j)
    await startSync($)
    return result
  })

  // /clear, /resume 뒤에는 상태가 처음으로 돌아가니 한도와 경험치를 다시 읽는다
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    const usage = await $.session.usage()
    const l = await shareLimits($, limitsOf(usage.rateLimits))
    await update($, shown, () => l)
    await gainXp($, usage.rateLimits)
    await startSync($)
    return next(e)
  })

  // 한도가 1%p 이상 움직이면 최신 값과 경험치를 고친다 (캐릭터 그림은 턴의 시작과 끝에 맞춘다)
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await shareLimits($, limitsOf(e.rateLimits))
      await gainXp($, e.rateLimits)
    }
    return next(e)
  })

  // 권한 모드는 클래식 훅 입력에만 있다. 프롬프트를 보낼 때와 도구를 마칠 때 적어 둔다
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await noteMode($, e.permission_mode)
    return next(e)
  })
  on('classic.PostToolUse', async ($, e, next) => {
    await noteMode($, e.permission_mode)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await startSync($)
    const t = await $.clock.now()
    const l = await read($, limits)
    const x = await read($, xp)
    const j = await read($, job)
    await update($, startedAt, () => t)
    await update($, activity, () => '생각하는 중')
    await update($, asking, () => false)
    await update($, pendingAsks, () => [])
    await update($, shown, () => l)
    await update($, shownXp, () => x)
    await update($, shownJob, () => j)
    await update($, phase, () => 'running')
    // 이번 응답의 점수를 셀 출발점 (실패해도 전투는 돈다)
    await guard(() => startSpent($))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const asks = askKindOf(e.tool)
    if (asks) {
      const t = await $.clock.now()
      await update($, waitKind, () => asks)
      await update($, introUntil, () => t + INTRO_MS)
      if ((await read($, phase)) === 'running') await update($, phase, () => 'waiting')
    } else {
      await update($, activity, () => activityOf(e.tool))
    }
    try {
      return await next(e)
    } finally {
      // 이 호출이 묻던 권한이면 목록에서 뺀다. 같이 돌던 다른 호출(병렬 도구, 다른 서브에이전트)이 아직 사람을
      // 기다리면 기다림을 풀지 않는다. next를 오래 기다린 뒤의 그냥 읽기는 이 호출이 시작될 때의 값을 돌려줄 수 있어서,
      // 먼저 현재 값으로 고치고(update) 그 뒤에 읽는다
      const id = e.tool_use_id
      let mine = false
      await update($, pendingAsks, list => {
        mine = id !== undefined && list.includes(id)
        return mine ? list.filter(x => x !== id) : list
      })
      const left = (await read($, pendingAsks)).length
      const p = await read($, phase)
      const kind = await read($, waitKind)
      if (left === 0) {
        if (mine && (await read($, asking))) await update($, asking, () => false)
        // 바뀔 때만 적는다: 같은 값을 적어도 달리는 그림이 다시 그려져 처음부터 다시 돈다
        if (p === 'waiting' && ((mine && kind === 'permission') || (asks !== undefined && asks === kind))) {
          await update($, phase, () => 'running')
        }
      } else if (asks && p === 'waiting') {
        // 질문은 끝났지만 다른 호출의 권한 요청이 아직 열려 있다
        await update($, waitKind, () => 'permission')
      }
    }
  })

  on('tool.check', async ($, e, next) => {
    const decided = await next(e)
    // 실제 호출(tool_use_id 있음)이 사람에게 물어야 할 때만. 질문·계획은 tool.call에서 이미 알렸다
    const id = e.tool_use_id
    if (decided.decision === 'ask' && id !== undefined && !askKindOf(e.tool)) {
      if (!(await read($, pendingAsks)).includes(id)) await update($, pendingAsks, list => [...list, id])
      // 자동 모드 등에서 'ask'는 사람이 아니라 분류기가 정한다 (사람에게 물으면 classic.PermissionRequest가 알린다)
      if (!NO_PROMPT_MODES.includes(await read($, mode))) await askLater($)
    }
    return decided
  })

  // 자동 모드에서도 분류기가 정하지 못해 사람에게 묻는 창을 띄울 때 (다른 훅이 대신 답하지 않았으면)
  on('classic.PermissionRequest', async ($, e, next) => {
    const answer = await next(e)
    await noteMode($, e.permission_mode)
    const decided = (answer as { decision?: unknown } | undefined)?.decision !== undefined
    if (!decided && !askKindOf(e.tool_name) && !(await read($, asking))) await askLater($)
    return answer
  })

  on('turn.complete', async ($, e, next) => {
    // 서브에이전트의 턴은 무시하고 메인 턴이 끝날 때만 알린다
    if (e.agentId === undefined) {
      const failed = e.reason === 'error' || e.reason === 'refusal'
      const t = await $.clock.now()
      const l = await read($, limits)
      const x = await read($, xp)
      const j = await read($, job)
      // 그림이 한 번만 그려지도록 phase보다 먼저 채운다
      await guard(() => noteSpent($))
      await update($, lastMs, () => e.durationMs)
      await update($, shown, () => l)
      await update($, shownXp, () => x)
      await update($, shownJob, () => j)
      await update($, asking, () => false)
      await update($, pendingAsks, () => [])
      await update($, introUntil, () => t + INTRO_MS)
      // 잘 마친 턴이면 디지바이스를 굴린다 (끝 알림이 처음 그려질 때 같이 나오게 phase보다 먼저).
      // 이번 턴이 찾았을 때만 끝 알림에 띄운다
      const found = !e.isAborted && !failed ? await rollDigivice($, e.durationMs, levelOf(x)) : false
      if ((await read($, digiFound)) !== found) await update($, digiFound, () => found)
      await update($, phase, () => (e.isAborted ? 'idle' : failed ? 'error' : 'done'))
      await startSync($)
    }
    return next(e)
  })

  // 다음 지시를 보내면 끝 알림을 치운다 (끝·오류·진화 장면일 때만 적는다. 안 쓴 디지바이스는 쉬는 띠에 남는다)
  on('prompt.submit', async ($, e, next) => {
    const p = await read($, phase)
    if (p === 'done' || p === 'error' || p === 'evolve') await update($, phase, () => 'idle')
    await startSync($)
    return next(e)
  })

  // 앱의 진행 표시줄 뒤에 한마디(터미널은 하는 일도)를 붙인다. 이 줄은 원래 자주 바뀌니 깜빡임과 상관없다
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'terminal') return next(e)
    const p: Phase = await read($, phase)
    if (p !== 'running' && p !== 'waiting') return next(e)
    const t = await $.clock.now()
    const quips = isTired(hpOf(await read($, limits))) ? TIRED_QUIPS : QUIPS
    const quip = quips[Math.floor((t - (await read($, startedAt))) / 12000) % quips.length]
    // 데스크톱은 진행 표시줄이 이미 지금 하는 일을 말하니 한마디만, 터미널은 하는 일도 붙인다
    const extra = e.surface === 'terminal' ? ` · ${(await read($, activity)) || '생각하는 중'} · ${quip}` : ` · ${quip}`
    return next({ ...e, props: { ...e.props, suffix: e.props.suffix + extra } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (e.surface !== 'desktop' && e.surface !== 'terminal')) return next(e)

    const p: Phase = await read($, phase)
    // 상태와 실제 작업 여부가 어긋나면(모드가 중간에 다시 불린 경우 등) 작업 여부를 따른다
    const known = p === 'running' || p === 'waiting'
    const view: Phase = known ? (e.props.isWorking ? p : 'idle') : e.props.isWorking ? 'running' : p
    // 디지바이스 임시 진화 중인지 (전투·쉬는 띠·알림 모두 한 단계 위 모습으로 그린다)
    const boosted = await read($, digiOn)
    const evolve = () => {
      void useDigivice($)
    }
    // 모드를 다시 불러온 뒤 아무 일도 없는 창에서도 1분 맞추기가 돌게 한다 (그리는 동안에는 상태를 못 적으니 잠시 뒤에)
    if (!syncTimer && !syncKicked) {
      syncKicked = true
      $.clock.after(0, () => {
        void startSync($)
      })
    }

    // 쉬는 중: 입력창 위에 HP 막대 두 줄 (5시간·주간 한도)과 레벨·경험치 줄
    if (view === 'idle') {
      // 아직 안 쓴 디지바이스 (이 창이나 다른 창에서 찾은 것)
      const digi = await read($, digiReady)
      const lim: Limits = await read($, limits)
      const nowMs = await $.clock.now()
      const rows = hpRowsOf(lim, nowMs)
      if (rows.length === 0 && !digi) return next(e)
      const x = await read($, xp)
      const r = rankOf(x)
      const me = jobOf(await read($, job))
      const rt = drawTier(r.tier, await read($, omega), boosted)
      const days = Math.max(0, Math.ceil(((await read($, seasonEnd)) - nowMs) / 86_400_000))
      // 주간 한도 정보가 있을 때만 경험치가 쌓이니 그때만 레벨 줄을 보여 준다. 안 쓴 디지바이스가 있으면 그 줄에서 쓴다
      const lv = lim.week
        ? {
            label: `Lv.${r.level} ${formName(me, rt)} ⚔ ${r.foe}`,
            detail: digi
              ? '📱 디지바이스를 찾았어요!'
              : r.next
                ? `상대 HP ${r.foeHp}% · 시즌 ${days}일 남음`
                : `최종 보스와 결전 중 · 시즌 ${days}일 남음`,
            value: `XP ${x}/${MAX_XP}`,
          }
        : null
      // 레벨 줄이 없으면(주간 한도 정보가 없는 계정) 디지바이스는 따로 한 줄에 보여 준다
      const companion = !lv && digi ? '📱 디지바이스를 찾았어요!' : ''
      const theirs = await next(e)
      const tail = theirs ? [theirs] : []
      if (e.surface === 'terminal') {
        const { Box, Text, Button } = $.ui.resolve(e)
        return (
          <Box flexDirection="column">
            {rows.map(row => (
              <Box key={row.key}>
                <Text>{row.label.padEnd(8)} </Text>
                <Text color={hpColor(row.v)}>{hpTextBar(row.v, 20)}</Text>
                <Text bold> {row.v}%</Text>
                <Text dimColor>  {row.detail}</Text>
              </Box>
            ))}
            {lv
              ? [
                  <Box key="level">
                    <Text bold>{`${lv.label}  ${lv.value}  `}</Text>
                    <Text dimColor>{lv.detail}</Text>
                    {digi ? [<Button key="digimon-buddy-digi" label="진화" onPress={evolve} />] : []}
                  </Box>,
                ]
              : []}
            {companion
              ? [
                  <Box key="companion">
                    <Text bold>{companion}  </Text>
                    {digi ? [<Button key="digimon-buddy-digi" label="진화" onPress={evolve} />] : []}
                  </Box>,
                ]
              : []}
            {tail}
          </Box>
        )
      }
      const { Box, Text, Button, Svg } = $.ui.resolve(e)
      // 왼쪽에는 지금 모습의 디지몬을 늘 세워 둔다
      const stand = idleSvg(rt, me)
      const company = digi ? ' · 디지바이스' : boosted ? ' · 디지바이스 진화 중' : ''
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" alignItems="center" columnGap={2}>
            <Svg
              source={stand.source}
              alt={`쉬고 있는 ${formName(me, rt)} · Lv.${r.level}${company}`}
              width={stand.width}
              height={stand.height}
              isInteractive={true}
            />
            <Box flexDirection="column" flexGrow={1}>
              {rows.map(row => (
                <Box key={row.key} flexDirection="column">
                  <Box flexDirection="row">
                    <Box flexGrow={1}>
                      <Text>{row.label}</Text>
                    </Box>
                    <Text dimColor>{row.detail}  </Text>
                    <Text bold>{`${row.v}%`}</Text>
                  </Box>
                  <Svg source={hpBarSvg(row.v)} alt={`${row.label} ${row.v}% 남음`} />
                </Box>
              ))}
              {lv
                ? [
                    <Box key="level" flexDirection="column">
                      <Box flexDirection="row" alignItems="center">
                        <Box flexGrow={1}>
                          <Text bold>{lv.label}</Text>
                        </Box>
                        <Text dimColor>{lv.detail}  </Text>
                        {digi ? [<Button key="digimon-buddy-digi" label="진화" onPress={evolve} />] : [<Text key="digimon-buddy-xp" bold>{lv.value}</Text>]}
                      </Box>
                      <Svg source={xpBarSvg(x / MAX_XP, r.level)} alt={`경험치 ${x}/${MAX_XP}`} />
                    </Box>,
                  ]
                : []}
              {companion
                ? [
                    <Box key="companion" flexDirection="row" alignItems="center">
                      <Box flexGrow={1}>
                        <Text bold>{companion}</Text>
                      </Box>
                      {digi ? [<Button key="digimon-buddy-digi" label="진화" onPress={evolve} />] : []}
                    </Box>,
                  ]
                : []}
            </Box>
          </Box>
          {tail}
        </Box>
      )
    }

    const theirs = await next(e)
    const tail = theirs ? [theirs] : []
    const hp = hpOf(await read($, shown))
    const sx = await read($, shownXp)
    const rank = rankOf(sx)
    // 레벨과 같이 턴의 시작과 끝에 입힌 계열 (모드를 다시 불러와 아직 없으면 이달의 계열)
    const me = jobOf((await read($, shownJob)) || (await read($, job)))
    const dt = drawTier(rank.tier, await read($, omega), boosted)
    const hpText = hpLine(hp)
    const hpTail = hpText ? [hpText] : []
    // 이번 턴이 찾은 디지바이스면 끝 알림에 띄우고 확인이 진화시킨다 (끝 알림일 때만 읽는다: 전투 그림이 괜히 다시 그려지지 않게)
    const withDigi = view === 'done' && (await read($, digiReady)) && (await read($, digiFound))
    const ack = withDigi
      ? evolve
      : () => {
          void update($, phase, () => 'idle')
        }

    if (e.surface === 'terminal') {
      const { Box, Text, Button } = $.ui.resolve(e)
      let line
      if (view === 'running') {
        line = <Text>{[`⚔ Lv.${rank.level} ${formName(me, dt)}${boosted ? ' 📱' : ''} vs ${rank.foe}`, ...hpTail].join(' · ')}</Text>
      } else if (view === 'waiting') {
        const wait = WAIT[await read($, waitKind)]
        line = <Text bold color={AMBER}>{`${wait.icon} ${wait.title} · ${wait.hint}`}</Text>
      } else {
        const used = spentLine(await read($, spent))
        const ranFor = elapsedText(await read($, lastMs)) + (used ? ` · ${used}` : '')
        const text =
          view === 'evolve'
            ? `📱 ${formName(me, dt)}(으)로 진화! 이달 남은 기간 동안 한 단계 위 모습으로 싸워요`
            : withDigi
              ? `📱 디지바이스를 찾았어요! 확인을 누르면 진화해요 · ${ranFor}`
              : view === 'done'
                ? `🎉 다 했어요! 결과를 확인해 주세요 · ${ranFor}`
                : `⚠ ${rank.foe}의 ${foeSkill(rank.tier)}! 문제가 생겼어요 · ${ranFor}`
        line = (
          <Box flexDirection="row" columnGap={2}>
            <Text bold color={view === 'error' ? RED : view === 'evolve' || withDigi ? AMBER : GREEN}>
              {text}
            </Text>
            <Button key="digimon-buddy-ack" label="확인" onPress={ack} />
          </Box>
        )
      }
      return (
        <Box flexDirection="column">
          {line}
          {tail}
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)

    // 일하는 중: 내 디지몬이 레벨에 맞는 상대와 싸운다 (경과 시간·하는 일은 앱의 진행 표시줄에)
    if (view === 'running') {
      const run = runSvg(hp, dt, rank.level, foeHp(sx), me)
      // JSX가 쓰는 h와 겹치지 않게 다른 이름을 쓴다
      const artH = Math.min(BAND_H, run.height)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" alignItems="center" columnGap={2}>
            <Svg source={run.source} alt="상대와 싸우는 내 디지몬" width={Math.round((run.width * artH) / run.height)} height={artH} isInteractive={true} />
            <Box flexDirection="column">
              <Text bold>{`Lv.${rank.level} ${formName(me, dt)} vs ${rank.foe}`}</Text>
              {hpTail.map(t => (
                <Text key="digimon-buddy-hp" dimColor>{t}</Text>
              ))}
              <Text dimColor>
                {rank.next ? `상대 HP ${rank.foeHp}% · Lv.${rank.next}에 ${me.gear[rank.tier + 1]}` : `최종 보스와 결전 중 · ${me.gear[10]}`}
              </Text>
            </Box>
          </Box>
          {tail}
        </Box>
      )
    }

    // 끝·기다림·오류·진화: 확 커진 디지몬과 말풍선
    // 등장 동작이 끝난 뒤에 다시 그려지면(스크롤 등) 다 나온 모습으로 그린다.
    // 시각만 비교하고 따로 적지 않으므로, 등장이 끝났다고 띠가 다시 그려지지는 않는다
    const intro = (await $.clock.now()) < (await read($, introUntil))
    let big
    if (view === 'waiting') {
      const wait = WAIT[await read($, waitKind)]
      big = { art: bigSvg('waiting', wait.bubble[0], wait.bubble[1], hp, intro, dt, me), alt: `기다리는 ${formName(me, dt)}: ${wait.title}`, color: AMBER, title: wait.title, sub: wait.hint }
    } else if (view === 'evolve') {
      const evolved = formName(me, dt)
      big = { art: bigSvg('done', `${evolved}(으)로 진화!`, '디지바이스의 빛으로', hp, intro, dt, me), alt: `디지바이스로 ${evolved}(으)로 진화한 내 디지몬`, color: AMBER, title: `📱 ${evolved}(으)로 진화!`, sub: '이달 남은 기간 동안 한 단계 위 모습으로 싸워요' }
    } else {
      const ranFor = elapsedText(await read($, lastMs))
      // 이번 응답에서 쓴 사용률 (한도 정보가 없으면 레벨과 모습)
      const used = spentLine(await read($, spent)) || `Lv.${rank.level} ${formName(me, dt)}`
      big =
        view === 'error'
          ? { art: bigSvg('error', `${rank.foe}의 ${foeSkill(rank.tier)}!`, '문제가 생겼어요', hp, intro, dt, me, dx => foeBig(rank.tier, dx)), alt: `${rank.foe}에게 맞은 내 디지몬`, color: RED, title: `${rank.foe}의 ${foeSkill(rank.tier)}! 문제가 생겼어요`, sub: `${ranFor} 싸우다 한 대 맞음 · ${used}` }
          : withDigi
            ? { art: bigSvg('done', '디지바이스 발견!', '확인을 눌러 진화해요', hp, intro, dt, me), alt: '일을 마치고 디지바이스를 찾은 내 디지몬', color: AMBER, title: '📱 디지바이스를 찾았어요!', sub: `${ranFor} 전투 · ${used} · 확인을 누르면 진화해요` }
            : { art: bigSvg('done', '다 했어요!', '결과 확인해 주세요', hp, intro, dt, me), alt: '일을 마친 내 디지몬', color: GREEN, title: '작업 끝! 확인해 주세요', sub: `${ranFor} 전투 · ${used}` }
    }

    return (
      <Box flexDirection="column">
        {/* 띠가 넘쳐 스크롤되면 앱이 그림을 다시 만들어 동작이 처음부터 재생되므로,
            달리는 그림과 같은 높이(BAND_H) 안에 그림과 글자를 모두 넣는다 */}
        <Box flexDirection="row" alignItems="center" columnGap={2}>
          <Svg source={big.art.source} alt={big.alt} width={Math.round((big.art.width * BAND_H) / big.art.height)} height={BAND_H} isInteractive={true} />
          <Box flexDirection="column">
            {/* 좁은 창에서도 잘리지 않게 짧은 줄 셋으로 나눈다: 제목 / 요약 / HP와 확인 버튼 */}
            <Text bold color={big.color}>{big.title}</Text>
            <Text dimColor>{big.sub}</Text>
            <Box flexDirection="row" alignItems="center" columnGap={1}>
              {hpTail.map(t => (
                <Text key="digimon-buddy-hp" dimColor>{t.replace('HP · ', 'HP ')}</Text>
              ))}
              {view === 'waiting' ? [] : [<Button key="digimon-buddy-ack" label="확인" onPress={ack} />]}
            </Box>
          </Box>
        </Box>
        {tail}
      </Box>
    )
  })
}