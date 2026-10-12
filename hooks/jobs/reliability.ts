// 성실의 문장: 둥실몬 → 쉬라몬 → 원뿔몬 → 쥬드몬 → 바이킹몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { RELIABILITY } from '../img/reliability.ts'
import { OMEGA } from '../img/omega.ts'

export const reliability = makeLine({
  key: 'reliability',
  name: '성실',
  icon: '🐾',
  gear: ["", "쉬라몬으로 진화", "물고기 행진", "원뿔몬으로 진화", "뿔 날리기", "쥬드몬으로 초진화", "해머 스파크", "발칸 해머", "바이킹몬으로 궁극진화", "아크틱 블리자드 강화", "아크틱 블리자드 극대화"],
  stages: [
    sprite('둥실몬', RELIABILITY.pukamon!, 5.5, { flip: true, mouth: [0.88, 0.5], fx: (t, from) => fx.bubble(from) }),
    sprite('쉬라몬', RELIABILITY.gomamon!, 8.5, { flip: false, mouth: [0.85, 0.4], fx: (t, from) => fx.marchingFishes(from, t >= 2 ? 5 : 3) }),
    sprite('원뿔몬', RELIABILITY.ikkakumon!, 12.5, { flip: false, mouth: [0.56, 0.08], fx: (t, from) => fx.harpoon(from, t >= 4 ? 2 : 1) }),
    sprite('쥬드몬', RELIABILITY.zudomon!, 13.5, { flip: false, mouth: [0.85, 0.4], melee: true, fx: (t, from) => fx.strike('#CBD5E1', '#FFFFFF') + fx.lightning() }),
    sprite('바이킹몬', RELIABILITY.vikemon!, 14, { flip: false, mouth: [0.85, 0.4], melee: true, fx: (t, from) => fx.strike('#CBD5E1', '#FFFFFF') + fx.strike('#93C5FD', '#E0F2FE', true) + fx.impact('#E0F2FE', 30, 9.5, 1.6) }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
