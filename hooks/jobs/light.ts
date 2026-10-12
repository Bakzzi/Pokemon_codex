// 빛의 문장: 뉴몬 → 플롯몬 → 가트몬 → 엔젤우몬 → 오파니몬
// 그림은 hooks/img/light.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { LIGHT } from '../img/light.ts'

export const light = makeLine({
  key: 'light',
  name: '빛',
  icon: '✨',
  gear: ["", "플롯몬으로 진화", "퍼피 하울링", "플롯몬 단련", "가트몬으로 진화", "냥냥펀치", "엔젤우몬으로 초진화", "성스러운 화살", "헤븐즈 참", "오파니몬으로 궁극진화", "에덴즈 재블린·무지개 후광"],
  stages: [
  sprite('뉴몬', LIGHT.nyaromon!, 5.5, { flip: true, mouth: [0.85, 0.5], fx: (t, from) => fx.bubble(from) }),
  sprite('플롯몬', LIGHT.plotmon!, 8, { flip: true, mouth: [0.62, 0.42], fx: (t, from) => fx.soundWave(from) }),
  sprite('가트몬', LIGHT.tailmon!, 9.5, { flip: false, mouth: [0.85, 0.3], melee: true, fx: (t, from) => fx.strike('#F9A8D4', '#FFFFFF', true) }),
  sprite('엔젤우몬', LIGHT.angewomon!, 13.5, { flipAttack: false, flip: false, mouth: [0.86, 0.45], fx: (t, from) => fx.holyArrow(from) + (t >= 8 ? fx.strike('#F9A8D4', '#FFFFFF') : '') }),
  sprite('오파니몬', LIGHT.ofanimon!, 13.5, { flip: true, mouth: [0.96, 0.4], fx: (t, from) => fx.javelin(from) + fx.pillar('#FDE68A', '#FFFFFF', 2.2) }),
  ],
})
