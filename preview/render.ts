// 미리보기: 직업(계열) 하나의 그림을 단계별 SVG로 뽑는다.
//   node --experimental-strip-types preview/render.ts <job key> [out dir]
// 쉬는 그림(idle), 전투 그림(run), 큰 알림(big: done/waiting/error)을 단계 0~10마다 쓴다
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { jobOf } from '../hooks/jobs/index.ts'
import { bigSvg, idleSvg, runSvg } from '../hooks/sprites.ts'
import { foeBig } from '../hooks/monsters.ts'

const key = process.argv[2] ?? 'adventurer'
const out = process.argv[3] ?? join('preview', 'out', key)
mkdirSync(out, { recursive: true })
const job = jobOf(key)
const hp = { five: 72, week: 40 }
const tiers = (process.argv[4] ?? '0,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number)
for (const t of tiers) {
  writeFileSync(join(out, `idle-${t}.svg`), idleSvg(t, job).source)
  writeFileSync(join(out, `run-${t}.svg`), runSvg(hp, t, Math.max(1, t * 10), 0.6, job).source)
}
for (const t of tiers.filter(t => [0, 1, 4, 6, 9, 10].includes(t))) {
  for (const v of ['done', 'waiting', 'error'] as const) {
    writeFileSync(join(out, `big-${v}-${t}.svg`), v === 'error' ? bigSvg(v, '기습!', '문제가 생겼어요', hp, false, t, job, '', foeBig(Math.min(10, t), 0)).source : bigSvg(v, '다 했어요!', '결과 확인해 주세요', hp, false, t, job).source)
  }
}
console.log(`${key}: wrote ${out}`)
