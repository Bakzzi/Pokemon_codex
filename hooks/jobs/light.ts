// 빛의 문장: 뉴몬 → 플롯몬 → 가트몬 → 엔젤우몬 → 오파니몬
// 그림은 hooks/img/light.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것)
import { elementHit, makeLine, sprite } from '../digi.ts'
import { LIGHT } from '../img/light.ts'
import { CRESTS } from '../img/crests.ts'

export const light = makeLine({
  key: 'light',
  name: '빛',
  icon: '✨',
  gear: ["", "플롯몬으로 진화", "퍼피 하울링", "빛의 문장", "가트몬으로 진화", "캣 펀치", "엔젤우몬으로 초진화", "홀리 애로우", "헤븐즈 참", "오파니몬으로 궁극진화", "에덴즈 재블린·무지개 후광"],
  melee: false,
  stages: [
  sprite('뉴몬', LIGHT.nyaromon!, 5.5, { attack: LIGHT.nyaromon_attack, flip: false }),
  sprite('플롯몬', LIGHT.plotmon!, 8, { attack: LIGHT.plotmon_attack }),
  sprite('가트몬', LIGHT.tailmon!, 9.5, { attack: LIGHT.tailmon_attack, flipAttack: false }),
  sprite('엔젤우몬', LIGHT.angewomon!, 13.5, { attack: LIGHT.angewomon_attack, flipAttack: false }),
  sprite('오파니몬', LIGHT.ofanimon!, 13.5, { attack: LIGHT.ofanimon_attack }),
  ],
  crest: { image: CRESTS.light! },
  hit: (_t, stage) => elementHit('light', stage, false),
})
