// 직업 목록. 한 달(시즌)마다 이 중 하나가 정해지고, 12달 동안 겹치지 않게 돈다
import { adventurer } from './adventurer.ts'
import { knight } from './knight.ts'
import { warrior } from './warrior.ts'
import { warlock } from './warlock.ts'
import { spellblade } from './spellblade.ts'
import { druid } from './druid.ts'
import { hunter } from './hunter.ts'
import { gunner } from './gunner.ts'
import { mechanic } from './mechanic.ts'
import { healer } from './healer.ts'
import { priest } from './priest.ts'
import { necromancer } from './necromancer.ts'
import type { Job } from './types.ts'

export const JOBS: readonly Job[] = [adventurer, knight, warrior, warlock, spellblade, druid, hunter, gunner, mechanic, healer, priest, necromancer]

export const jobOf = (key: string | undefined): Job => JOBS.find(j => j.key === key) ?? adventurer

// 이달의 직업 고르기: 이번 돌림(12달)에 아직 안 나온 직업 가운데 하나. 지난달 직업은 다음 돌림 첫 달에도 빼서
// 두 달 연속 같은 직업이 나오지 않게 한다. 달 이름("2026-10")으로 섞어 고르므로 모든 창이 같은 직업을 고른다
export const pickJob = (monthKey: string, used: readonly string[], last: string | undefined) => {
  const left = JOBS.filter(j => !used.includes(j.key) && j.key !== last)
  const pool = left.length > 0 ? left : JOBS.filter(j => j.key !== last)
  let h = 2166136261
  for (const ch of monthKey) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
  return pool[((h ^ (h >>> 16)) >>> 0) % pool.length]!.key
}

// 새 시즌의 직업과, 이번 돌림에 나온 직업 목록. 12개가 다 나왔으면 새 돌림을 시작한다
export const nextJobs = (monthKey: string, prevUsed: readonly string[] | undefined, last: string | undefined) => {
  const used = !prevUsed || prevUsed.length >= JOBS.length ? [] : prevUsed
  const job = pickJob(monthKey, used, last)
  return { job, jobsUsed: [...used, job] }
}
