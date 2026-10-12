// 설치할 때 한 번 돌린다: node scripts/seed.mjs
// 이번 달 1일부터 쓴 양으로 레벨을 미리 맞추려고, 로컬 대화 기록(~/.claude/projects)에서
// 시간별 사용량을 모아 hooks/seed.ts에 적는다. 사용률(%)로 바꾸는 일은 모드가 한다:
// 모드는 이번 주 실제 사용률과 이번 주 기록의 비율로 지난 주들의 사용률을 어림한다.
import { createReadStream, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const H = 3_600_000
const KST = 9 * H
const WEEK = 7 * 24 * H

const now = Date.now()
const d = new Date(now + KST)
const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - KST
// 이번 달에 걸친 주간 창은 지난달에 시작했을 수도 있고, 한 주가 100%를 넘는지 보려면 그 주 전체가 필요하니
// 1일보다 일주일 앞서부터 모은다
const from = monthStart - WEEK

const root = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects')
// 데스크톱 앱의 Cowork(로컬 에이전트) 세션은 앱 데이터 폴더에 따로 기록을 남긴다
const appData =
  process.platform === 'win32'
    ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'Claude')
    : process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support', 'Claude')
      : join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'Claude')
const cowork = join(appData, 'local-agent-mode-sessions')
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'seed.ts')

// 한도는 쓴 돈에 비례한다고 보고, 공개 가격으로 토큰에 무게를 준다.
// 모델별 100만 토큰당 [입력, 출력, 캐시 읽기] 달러. 캐시 쓰기는 입력의 1.25배(5분), 2배(1시간).
// 더 구체적인 이름부터 맞춘다 (opus-5가 opus-5-5를 먼저 잡지 않게)
const PRICES = [
  [/fable|mythos/, [10, 50, 0.25]],
  [/opus-5-5/, [4, 20, 0.2]],
  [/opus-5|opus-4-[5-8]/, [5, 25, 0.5]],
  [/opus/, [15, 75, 1.5]],
  [/sonnet-5/, [2, 10, 0.2]],
  [/sonnet/, [3, 15, 0.3]],
  [/haiku-5/, [0.1, 0.5, 0.01]],
  [/haiku/, [1, 5, 0.1]],
]
const priceOf = model => (PRICES.find(([re]) => re.test(model)) ?? [null, [4, 20, 0.2]])[1]
const costOf = (model, u) => {
  const [input, output, cacheRead] = priceOf(model)
  const c1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0
  const c5m = Math.max(0, (u.cache_creation_input_tokens ?? 0) - c1h)
  return (
    ((u.input_tokens ?? 0) * input +
      c5m * input * 1.25 +
      c1h * input * 2 +
      (u.cache_read_input_tokens ?? 0) * cacheRead +
      (u.output_tokens ?? 0) * output) /
    1e6
  )
}

// 대화 기록 파일들 (하위 에이전트 기록 포함). 시작 시각 전에 마지막으로 고친 파일은 건너뛴다
const files = []
const walk = dir => {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.jsonl')) {
      try {
        if (statSync(p).mtimeMs >= from) files.push(p)
      } catch {}
    }
  }
}
walk(root)
walk(cowork)

// 같은 응답이 여러 줄·여러 파일(이어 하기, 갈래)에 다시 적히므로 응답 id로 한 번만 센다
const seen = new Map()
let skipped = 0
for (const p of files) {
  // 읽는 사이 지워졌거나 잠긴 파일은 건너뛴다
  try {
    const lines = createInterface({ input: createReadStream(p, 'utf8'), crlfDelay: Infinity })
    for await (const line of lines) {
      if (!line.includes('"usage"') || !line.includes('"assistant"')) continue
      let o
      try {
        o = JSON.parse(line)
      } catch {
        continue
      }
      const m = o.message
      if (o.type !== 'assistant' || !m?.usage || !o.timestamp) continue
      const t = Date.parse(o.timestamp)
      if (!(t >= from) || t > now) continue
      const id = m.id || o.requestId || o.uuid
      const cost = costOf(m.model ?? '', m.usage)
      const prev = seen.get(id)
      if (!prev || cost > prev.cost) seen.set(id, { t, cost })
    }
  } catch {
    skipped++
  }
}

const hours = new Map()
for (const { t, cost } of seen.values()) {
  const h = Math.floor(t / H)
  hours.set(h, (hours.get(h) ?? 0) + cost)
}
const list = [...hours.entries()]
  .filter(([, v]) => v > 0)
  .sort((a, b) => a[0] - b[0])
  .map(([h, v]) => [h, Math.round(v * 1000) / 1000])

const seed = { made: now, hours: list }
writeFileSync(
  out,
  `// scripts/seed.mjs가 만든 파일. 설치 전 이번 달에 쓴 양(로컬 대화 기록의 시간별 사용량, 가격 비율로 환산)\n` +
    `import type { Seed } from '../types'\n\n` +
    `export const SEED: Seed | null = ${JSON.stringify(seed)}\n`,
)

// 날짜별 합계를 보여 준다 (한국 시간)
const days = new Map()
for (const [h, v] of list) {
  const day = new Date(h * H + KST).toISOString().slice(0, 10)
  days.set(day, (days.get(day) ?? 0) + v)
}
console.log(`기록 파일 ${files.length}개, 응답 ${seen.size}개를 읽었어요.${skipped ? ` (읽지 못해 건너뛴 파일 ${skipped}개)` : ''}`)
for (const [day, v] of days) console.log(`  ${day}  ${v.toFixed(1)}`)
console.log(`${out} 에 적었어요.`)
console.log('24시간 안에 /reload-plugins 하거나 앱을 다시 시작하세요. 이번 주 주간 사용량이 5% 이상이 되면 레벨이 맞춰져요.')
const recent = list.filter(([h]) => h * H >= now - 2 * 24 * H).reduce((s, [, v]) => s + v, 0)
if (recent === 0) console.log('※ 최근 이틀 동안 이 컴퓨터의 Claude Code 사용 기록이 없어요. 이번 주에 조금 쓴 뒤 다시 실행하면 더 정확해요.')
