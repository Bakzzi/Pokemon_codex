// evolve: 디지바이스로 진화하는 장면
export type Phase = 'idle' | 'running' | 'waiting' | 'done' | 'error' | 'evolve'

// 이달의 디지바이스($.store 'digivice', 모든 창이 같이 쓴다): 찾은 달과 시각, 썼으면(진화했으면) on
export type Digivice = { month: string; at: number; on?: boolean }
export type WaitKind = 'permission' | 'question' | 'plan'

// 한도 하나의 남은 비율(HP, 0~100)과 다시 차는 시각(ISO 8601)
export type Limit = { left: number; resetsAt: string | null }
export type Limits = { five: Limit | null; week: Limit | null }

// 그림에 넘기는 HP: 5시간·주간 한도의 남은 비율, 정보가 없으면 null
export type Hp = { five: number | null; week: number | null }

// 레벨 시즌(한 달) 기록: 달("2026-10")과 그 달 1일 0시(한국 시간), 주간 창마다 시즌 전에 쓴 사용률(base)과
// 본 가장 큰 사용률(max), 설치 전 지난 주들에서 어림한 경험치(carry), 반영한 설치 기록(만든 시각),
// 마지막으로 알린 장비 단계. 모든 세션이 $.store 'season' 하나를 같이 쓴다.
// 예전(28일 시즌) 기록에는 month와 carry가 없다
export type Cycle = {
  month?: string
  start: number
  weeks: Record<string, { base: number; max: number }>
  carry?: number
  seed?: number
  tier: number
  // 이달의 직업(jobs/index.ts의 key)과 이번 돌림(12달)에 나온 직업들
  job?: string
  jobsUsed?: string[]
}

// scripts/seed.mjs가 남기는 설치 전 사용량: 만든 시각과 [시(時) 번호, 그 한 시간 사용량(가격 비율로 환산)] 목록
export type Seed = { made: number; hours: [number, number][] }

declare module 'claude-code' {
  interface PluginState {
    'run-buddy': {
      phase: Phase
      waitKind: WaitKind
      // 권한 요청에 답을 기다리는 중인지 (1.5초 뒤에도 그러면 크게 알린다)
      asking: boolean
      // 큰 그림의 등장 동작이 끝나는 시각. 그 뒤에 다시 그려지면 등장 동작 없이 그린다.
      // 끝/기다림/오류로 바뀔 때 같이 적기만 하므로, 이 값 때문에 따로 다시 그려지지 않는다
      introUntil: number
      // 권한 모드(default, acceptEdits, auto, …). auto에서 'ask'는 사람이 아니라 분류기가 정한다
      mode: string
      // 다른 창이 쌓은 경험치·HP를 마지막으로 가져온 시각 (1분마다)
      syncedAt: number
      startedAt: number
      lastMs: number
      activity: string
      // 한도의 최신 값
      limits: Limits
      // 캐릭터 머리 위에 띄운 값: 턴 시작과 끝에만 바꿔서, 달리는 도중에 그림을 다시 그리지 않는다
      shown: Limits
      // 경험치(0~200) 최신 값과 캐릭터에 입힌 값, 시즌이 끝나는 시각
      xp: number
      shownXp: number
      seasonEnd: number
      // 이달의 직업 key (모든 창이 시즌 기록에서 같은 값을 읽는다)
      job: string
      // 이달에 찾았지만 아직 안 쓴 디지바이스가 있는지, 디지바이스로 임시 진화 중인지
      digiReady: boolean
      digiOn: boolean
      // 히든 진화가 열렸는지 (용기·우정 계열이 각각 Lv.80에 닿음, $.store 'maxed')
      omega: boolean
      // 방금 끝난 턴이 디지바이스를 찾았는지 (그 끝 알림에만 띄운다)
      digiFound: boolean
      // 캐릭터에 입힌 직업 (턴의 시작과 끝에만 바꾼다)
      shownJob: string
      // 사람에게 묻는 중인 도구 호출들의 tool_use_id (띠는 읽지 않는다)
      pendingAsks: string[]
    }
  }
}
