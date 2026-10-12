import type { BigVariant, Pose } from '../pixel.ts'

// 진화 계열 하나(문장): 이름, 단계별로 얻는 진화·기술 이름, 그리는 법. 한 달(시즌)마다 하나가 정해진다.
// 단계 t = 레벨 ÷ 10 (0~9), 레벨 100은 10, 히든 진화(오메가몬)는 11. 9는 기술 강화, 10은 기술 극대화
export type Job = {
  key: string
  // 화면에 보이는 문장 이름 ("용기")과 알림에 붙이는 이모지
  name: string
  icon: string
  // 단계 0~10에서 얻는 진화·기술 이름 (0은 빈 글자)
  gear: readonly string[]
  // true: 상대에게 돌진해 친다. false: 제자리에서 쏜다. hit이 그 효과를 그린다. 단계마다 다르면 함수
  melee: boolean | ((t: number) => boolean)
  // 작은 디지몬 (4px 칸 단위). run: 전투 중, stand: 쉬는 중
  small: (t: number, pose: Pose) => string
  // 전투 장면에서 기술이 상대에게 닿는 효과 (전투 좌표, 칸 단위). 상대는 ATK 주기의 0.6~0.76에 맞는다
  hit: (t: number) => string
  // 큰 디지몬 (1px 단위). 끝·대기·오류
  big: (variant: BigVariant, t: number) => string
  // 머리가 그림 칸 위로 넘칠 때 위에 더 둘 자리(px): 작은 전투 그림, 큰 그림
  smallHeadroom: (t: number) => number
  bigHeadroom: (t: number) => number
}
