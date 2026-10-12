// 희망의 문장: 토코몬 → 파닥몬 → 엔젤몬 → 홀리엔젤몬 → 세라피몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { HOPE } from '../img/hope.ts'
import { OMEGA } from '../img/omega.ts'

export const hope = makeLine({
  key: 'hope',
  name: '희망',
  icon: '😇',
  gear: ["", "파닥몬으로 진화", "공기팡", "엔젤몬으로 진화", "천사의 손", "홀리엔젤몬으로 초진화", "천국의 문", "엑스칼리버", "세라피몬으로 궁극진화", "세븐 헤븐즈 강화", "세븐 헤븐즈 극대화"],
  stages: [
    sprite('토코몬', HOPE.tokomon!, 5.5, { flip: true, mouth: [0.82, 0.6], fx: (t, from) => fx.bubble(from) }),
    sprite('파닥몬', HOPE.patamon!, 8, { flip: false, mouth: [0.8, 0.66], fx: (t, from) => fx.airShot(from) }),
    sprite('엔젤몬', HOPE.angemon!, 13.5, { flip: false, mouth: [0.82, 0.5], fx: (t, from) => fx.beam(from, '#F59E0B', '#FDE68A', 1.1) }),
    sprite('홀리엔젤몬', HOPE.holyangemon!, 13.5, { flip: false, mouth: [0.9, 0.4], fx: (t, from) => fx.pillar('#FDE68A', '#FFFFFF', 3) + (t >= 7 ? fx.strike('#FDE68A', '#FFFFFF') : '') }),
    sprite('세라피몬', HOPE.seraphimon!, 14, { flip: false, mouth: [0.9, 0.4], fx: (t, from) => fx.sevenHeavens() }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
