// 빛의 문장: 야옹몬 → 플롯몬 → 가트몬 → 엔젤우몬 → 홀리드라몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { LIGHT } from '../img/light.ts'
import { OMEGA } from '../img/omega.ts'

export const light = makeLine({
  key: 'light',
  name: '빛',
  icon: '✨',
  gear: ["", "플롯몬으로 진화", "퍼피 하울링", "가트몬으로 진화", "냥냥펀치", "엔젤우몬으로 초진화", "천국의 화살", "천국의 미소", "홀리드라몬으로 궁극진화", "홀리 플레임·후광", "무지개 후광"],
  stages: [
    sprite('야옹몬', LIGHT.nyaromon!, 5.5, { flip: true, mouth: [0.85, 0.5], fx: (t, from) => fx.bubble(from) }),
    sprite('플롯몬', LIGHT.plotmon!, 8, { flip: true, mouth: [0.62, 0.42], fx: (t, from) => fx.soundWave(from) }),
    sprite('가트몬', LIGHT.tailmon!, 9.5, { flip: false, mouth: [0.85, 0.3], melee: true, fx: (t, from) => fx.strike('#F9A8D4', '#FFFFFF', true) }),
    sprite('엔젤우몬', LIGHT.angewomon!, 13.5, { flip: false, mouth: [0.86, 0.45], fx: (t, from) => fx.holyArrow(from) + (t >= 7 ? fx.strike('#F9A8D4', '#FFFFFF') : '') }),
    sprite('홀리드라몬', LIGHT.holydramon!, 13.5, { flip: false, mouth: [0.92, 0.3], fx: (t, from) => fx.fireball(from, 2) + fx.pillar('#FDE68A', '#FFFFFF', 2.2) }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
