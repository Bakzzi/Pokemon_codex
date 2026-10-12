import type { BigVariant, Pose } from '../pixel.ts'

// 직업 하나: 이름, 단계별 장비 이름, 그리는 법. 한 달(시즌)마다 하나가 정해진다.
// 단계 t = 레벨 ÷ 10 (0~9), 레벨 100은 10. 장비는 단계마다 하나씩 쌓이고, 9는 왕관·후광급, 10은 무지개 후광
export type Job = {
  key: string
  // 화면에 보이는 이름 ("기사")과 알림에 붙이는 이모지
  name: string
  icon: string
  // 단계 0~10에서 얻는 장비 이름 (0은 빈 글자)
  gear: readonly string[]
  // true: 몬스터에게 돌진해 벤다. false: 제자리에서 쏜다(화살·총알·마법). hit이 그 효과를 그린다. 단계마다 다르면 함수
  melee: boolean | ((t: number) => boolean)
  // 작은 Claude (4px 칸 단위, pixel.ts의 좌표). run: 전투 중, stand: 쉬는 중
  small: (t: number, pose: Pose) => string
  // 전투 장면에서 공격이 몬스터에게 닿는 효과 (전투 좌표, 칸 단위). 몬스터는 ATK 주기의 0.6~0.76에 맞는다
  hit: (t: number) => string
  // 큰 Claude (1px 단위, pixel.ts의 좌표). 끝·대기·오류
  big: (variant: BigVariant, t: number) => string
  // 머리 위로 올라가는 장비 때문에 위에 더 둘 자리(px): 작은 전투 그림, 큰 그림
  smallHeadroom: (t: number) => number
  bigHeadroom: (t: number) => number
}
