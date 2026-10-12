// 계열(문장) 목록. 한 달(시즌)마다 이 중 하나가 정해지고, 8달 동안 겹치지 않게 돈다
import { courage } from './courage.ts'
import { friendship } from './friendship.ts'
import { love } from './love.ts'
import { sincerity } from './sincerity.ts'
import { knowledge } from './knowledge.ts'
import { reliability } from './reliability.ts'
import { hope } from './hope.ts'
import { light } from './light.ts'
import type { Job } from './types.ts'

export const JOBS: readonly Job[] = [courage, friendship, love, sincerity, knowledge, reliability, hope, light]

export const jobOf = (key: string | undefined): Job => JOBS.find(j => j.key === key) ?? courage

// 이달의 문장 고르기: 이번 돌림(8달)에 아직 안 나온 문장 가운데 하나. 지난달 문장은 다음 돌림 첫 달에도 빼서
// 두 달 연속 같은 문장이 나오지 않게 한다. 달 이름("2026-10")으로 섞어 고르므로 모든 창이 같은 문장을 고른다
export const pickJob = (monthKey: string, used: readonly string[], last: string | undefined) => {
  const left = JOBS.filter(j => !used.includes(j.key) && j.key !== last)
  const pool = left.length > 0 ? left : JOBS.filter(j => j.key !== last)
  let h = 2166136261
  for (const ch of monthKey) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
  return pool[((h ^ (h >>> 16)) >>> 0) % pool.length]!.key
}

// 새 시즌의 문장과, 이번 돌림에 나온 문장 목록. 8개가 다 나왔으면 새 돌림을 시작한다
export const nextJobs = (monthKey: string, prevUsed: readonly string[] | undefined, last: string | undefined) => {
  const used = !prevUsed || prevUsed.length >= JOBS.length ? [] : prevUsed
  const job = pickJob(monthKey, used, last)
  return { job, jobsUsed: [...used, job] }
}
