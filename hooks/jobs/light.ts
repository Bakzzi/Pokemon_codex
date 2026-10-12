// 빛의 문장: 뉴몬 → 플롯몬 → 가트몬 → 엔젤우몬 → 오파니몬
// 그림은 hooks/img/light.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { LIGHT } from '../img/light.ts'
import { CRESTS } from '../img/crests.ts'

export const light = makeLine({
  key: 'light',
  name: '빛',
  icon: '✨',
  gear: ["", "플롯몬으로 진화", "퍼피 하울링", "빛의 문장", "가트몬으로 진화", "캣 펀치", "엔젤우몬으로 초진화", "홀리 애로우", "헤븐즈 참", "오파니몬으로 궁극진화", "에덴즈 재블린·무지개 후광"],
  melee: false,
  stages: [
  sprite('뉴몬', LIGHT.nyaromon!, 5.5, { flip: false, mouth: [0.85, 0.5], fx: (t, from) => fx.bubble(from) }),
  sprite('플롯몬', LIGHT.plotmon!, 8, { flip: true, fx: (t, from) => fx.soundWave(from) }),
  sprite('가트몬', LIGHT.tailmon!, 9.5, { flip: false, melee: true, fx: (t, from) => fx.strike('#F9A8D4', '#FFFFFF', true) }),
  sprite('엔젤우몬', LIGHT.angewomon!, 13.5, { flipAttack: false, flip: false, mouth: [0.9, 0.3], fx: (t, from) => fx.holyArrow(from) + (t >= 8 ? fx.strike('#F9A8D4', '#FFFFFF') : '') }),
  sprite('오파니몬', LIGHT.ofanimon!, 13.5, { flip: true, mouth: [0.9, 0.3], fx: (t, from) => fx.beam(from, '#FDE68A', '#FFFFFF', 1.2) + fx.pillar('#FDE68A', '#FFFFFF', 2.2) }),
  ],
  crest: { image: CRESTS.light! },
  hit: (_t, stage, from) => elementHit('light', stage, false, from)})
