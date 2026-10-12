// 설치할 때 node scripts/seed.mjs를 돌리면 이 파일을 이번 달 사용 기록으로 바꿔 쓴다.
// 그대로 두면(null) 설치한 날 이번 주 사용량부터 센다
import type { Seed } from '../types'

export const SEED: Seed | null = null
