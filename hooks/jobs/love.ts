// 사랑의 문장: 뿌카몬 → 피요몬 → 버드라몬 → 가루다몬 → 피닉스몬
// 그림은 hooks/img/love.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것)
import { elementHit, makeLine, sprite } from '../digi.ts'
import { LOVE } from '../img/love.ts'
import { CRESTS } from '../img/crests.ts'

export const love = makeLine({
  key: 'love',
  name: '사랑',
  icon: '❤️',
  gear: ["", "피요몬으로 진화", "매지컬 파이어", "사랑의 문장", "버드라몬으로 진화", "메테오 윙", "가루다몬으로 초진화", "섀도 윙", "이글 클로", "피닉스몬으로 궁극진화", "스타라이트 익스플로전·무지개 후광"],
  melee: false,
  stages: [
  sprite('뿌카몬', LOVE.pyocomon!, 5.5, { attack: LOVE.pyocomon_attack }),
  sprite('피요몬', LOVE.piyomon!, 9, { attack: LOVE.piyomon_attack }),
  sprite('버드라몬', LOVE.birdramon!, 12, { attack: LOVE.birdramon_attack }),
  sprite('가루다몬', LOVE.garudamon!, 14, { attack: LOVE.garudamon_attack }),
  sprite('피닉스몬', LOVE.hououmon!, 13, { attack: LOVE.hououmon_attack }),
  ],
  crest: { image: CRESTS.love! },
  hit: (_t, stage) => elementHit('fire', stage, false),
})
