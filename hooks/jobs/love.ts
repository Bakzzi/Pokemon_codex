// 사랑의 문장: 뿌카몬 → 피요몬 → 버드라몬 → 가루다몬 → 피닉스몬
// 그림은 hooks/img/love.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { LOVE } from '../img/love.ts'
import { CRESTS } from '../img/crests.ts'

export const love = makeLine({
  key: 'love',
  name: '사랑',
  icon: '❤️',
  gear: ["", "피요몬으로 진화", "매지컬 파이어", "피요몬 단련", "버드라몬으로 진화", "메테오 윙", "가루다몬으로 초진화", "섀도 윙", "이글 클로", "피닉스몬으로 궁극진화", "스타라이트 익스플로전·무지개 후광"],
  melee: false,
  stages: [
  sprite('뿌카몬', LOVE.pyocomon!, 5.5, { flip: false, mouth: [0.82, 0.7], fx: (t, from) => fx.bubble(from) }),
  sprite('피요몬', LOVE.piyomon!, 9, { flip: false, mouth: [0.74, 0.34], fx: (t, from) => fx.greenFlame(from, t >= 2 ? 1.1 : 0.9) }),
  sprite('버드라몬', LOVE.birdramon!, 12, { flip: false, mouth: [0.9, 0.28], fx: (t, from) => fx.meteorWing(from, t >= 5 ? 4 : 3) }),
  sprite('가루다몬', LOVE.garudamon!, 14, { flip: false, mouth: [0.7, 0.38], fx: (t, from) => fx.fireball(from, 2.2) + (t >= 8 ? fx.strike('#F26B21', '#FDE047', true) : '') }),
  sprite('피닉스몬', LOVE.hououmon!, 13, { flip: false, mouth: [0.92, 0.32], fx: (t, from) => fx.starlight(6) }),
  ],
  crest: { image: CRESTS.love! },
  hit: (_t, stage, from) => elementHit('fire', stage, false, from)})
