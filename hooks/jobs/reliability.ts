// 성실의 문장: 푸카몬 → 쉬라몬 → 원뿔몬 → 쥬드몬 → 플레시오몬
// 그림은 hooks/img/reliability.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { RELIABILITY } from '../img/reliability.ts'

export const reliability = makeLine({
  key: 'reliability',
  name: '성실',
  icon: '🐾',
  gear: ["", "쉬라몬으로 진화", "물고기 행진", "쉬라몬 단련", "원뿔몬으로 진화", "뿔 날리기", "쥬드몬으로 초진화", "해머 스파크", "발칸 해머", "플레시오몬으로 궁극진화", "소로 블루·무지개 후광"],
  stages: [
  sprite('푸카몬', RELIABILITY.pukamon!, 5.5, { flip: true, mouth: [0.88, 0.5], fx: (t, from) => fx.bubble(from) }),
  sprite('쉬라몬', RELIABILITY.gomamon!, 8.5, { flip: false, mouth: [0.85, 0.4], fx: (t, from) => fx.marchingFishes(from, t >= 2 ? 5 : 3) }),
  sprite('원뿔몬', RELIABILITY.ikkakumon!, 12.5, { flip: false, mouth: [0.56, 0.08], fx: (t, from) => fx.harpoon(from, t >= 5 ? 2 : 1) }),
  sprite('쥬드몬', RELIABILITY.zudomon!, 13.5, { flip: false, mouth: [0.85, 0.4], melee: true, fx: (t, from) => fx.strike('#CBD5E1', '#FFFFFF') + fx.lightning() }),
  sprite('플레시오몬', RELIABILITY.plesiomon!, 13.5, { flip: false, mouth: [0.93, 0.28], fx: (t, from) => fx.beam(from, '#38BDF8', '#E0F2FE', 1.6) }),
  ],
})
