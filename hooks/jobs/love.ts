// 사랑의 문장: 어니몬 → 피요몬 → 버드라몬 → 가루다몬 → 페닉스몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { LOVE } from '../img/love.ts'
import { OMEGA } from '../img/omega.ts'

export const love = makeLine({
  key: 'love',
  name: '사랑',
  icon: '❤️',
  gear: ["", "피요몬으로 진화", "빙빙 회오리", "버드라몬으로 진화", "메테오 윙", "가루다몬으로 초진화", "불새 출격", "이글 클로", "페닉스몬으로 궁극진화", "스타라이트 익스플로전·후광", "무지개 후광"],
  stages: [
    sprite('어니몬', LOVE.pyocomon!, 5.5, { flip: false, mouth: [0.82, 0.7], fx: (t, from) => fx.bubble(from) }),
    sprite('피요몬', LOVE.piyomon!, 9, { flip: false, mouth: [0.74, 0.34], fx: (t, from) => fx.greenFlame(from, t >= 2 ? 1.1 : 0.9) }),
    sprite('버드라몬', LOVE.birdramon!, 12, { flip: false, mouth: [0.9, 0.28], fx: (t, from) => fx.meteorWing(from, t >= 4 ? 4 : 3) }),
    sprite('가루다몬', LOVE.garudamon!, 14, { flip: false, mouth: [0.7, 0.38], fx: (t, from) => fx.fireball(from, 2.2) + (t >= 7 ? fx.strike('#F26B21', '#FDE047', true) : '') }),
    sprite('페닉스몬', LOVE.hououmon!, 13, { flip: false, mouth: [0.92, 0.32], fx: (t, from) => fx.starlight(6) }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
