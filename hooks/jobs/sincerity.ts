// 순수의 문장: 시드몬 → 팔몬 → 니드몬 → 릴리몬 → 로제몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { SINCERITY } from '../img/sincerity.ts'
import { OMEGA } from '../img/omega.ts'

export const sincerity = makeLine({
  key: 'sincerity',
  name: '순수',
  icon: '🌸',
  gear: ["", "팔몬으로 진화", "독줄기 공격", "니드몬으로 진화", "바늘뿜기", "릴리몬으로 초진화", "플라워 캐논", "릴리몬의 유혹", "로제몬으로 궁극진화", "포비든 템프테이션 강화", "포비든 템프테이션 극대화"],
  stages: [
    sprite('시드몬', SINCERITY.tanemon!, 5.5, { flip: true, mouth: [0.82, 0.66], fx: (t, from) => fx.bubble(from) }),
    sprite('팔몬', SINCERITY.palmon!, 9, { flip: false, mouth: [0.92, 0.55], fx: (t, from) => fx.vine(from) }),
    sprite('니드몬', SINCERITY.togemon!, 13, { flip: false, mouth: [0.85, 0.5], fx: (t, from) => fx.needleSpray(from, t >= 4 ? 8 : 6) }),
    sprite('릴리몬', SINCERITY.lilimon!, 12, { flip: false, mouth: [0.78, 0.55], fx: (t, from) => fx.flowerCannon(from) }),
    sprite('로제몬', SINCERITY.rosemon!, 13, { flip: false, mouth: [0.88, 0.55], fx: (t, from) => fx.whip(from, '#EC4899', '#FBCFE8') }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
