// 희망의 문장: 토코몬 → 파닥몬 → 엔젤몬 → 홀리엔젤몬 → 세라피몬
// 그림은 hooks/img/hope.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { HOPE } from '../img/hope.ts'
import { CRESTS } from '../img/crests.ts'

export const hope = makeLine({
  key: 'hope',
  name: '희망',
  icon: '😇',
  gear: ["", "파닥몬으로 진화", "에어 슛", "희망의 문장", "엔젤몬으로 진화", "헤븐즈 너클", "홀리엔젤몬으로 초진화", "헤븐즈 게이트", "엑스칼리버", "세라피몬으로 궁극진화", "세븐 헤븐즈·무지개 후광"],
  melee: false,
  stages: [
  sprite('토코몬', HOPE.tokomon!, 5.5, { flip: false, mouth: [0.82, 0.6], fx: (t, from) => fx.bubble(from) }),
  sprite('파닥몬', HOPE.patamon!, 8, { flip: false, mouth: [0.8, 0.66], fx: (t, from) => fx.airShot(from) }),
  sprite('엔젤몬', HOPE.angemon!, 13.5, { flip: false, mouth: [0.82, 0.5], fx: (t, from) => fx.beam(from, '#FDE68A', '#FFFFFF', 1.1) }),
  sprite('홀리엔젤몬', HOPE.holyangemon!, 13.5, { flip: false, mouth: [0.9, 0.4], fx: (t, from) => fx.pillar('#FDE68A', '#FFFFFF', 3) + (t >= 8 ? fx.strike('#FDE68A', '#FFFFFF') : '') }),
  sprite('세라피몬', HOPE.seraphimon!, 14, { flip: false, mouth: [0.9, 0.4], fx: (t, from) => fx.sevenHeavens() }),
  ],
  crest: { image: CRESTS.hope! },
  hit: (_t, stage, from) => elementHit('holy', stage, false, from)})
