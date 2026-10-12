// 희망의 문장: 토코몬 → 파닥몬 → 엔젤몬 → 홀리엔젤몬 → 세라피몬
// 그림은 hooks/img/hope.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것)
import { elementHit, makeLine, sprite } from '../digi.ts'
import { HOPE } from '../img/hope.ts'
import { CRESTS } from '../img/crests.ts'

export const hope = makeLine({
  key: 'hope',
  name: '희망',
  icon: '😇',
  gear: ["", "파닥몬으로 진화", "에어 슛", "희망의 문장", "엔젤몬으로 진화", "헤븐즈 너클", "홀리엔젤몬으로 초진화", "헤븐즈 게이트", "엑스칼리버", "세라피몬으로 궁극진화", "세븐 헤븐즈·무지개 후광"],
  melee: false,
  stages: [
  sprite('토코몬', HOPE.tokomon!, 5.5, { attack: HOPE.tokomon_attack, flipAttack: false }),
  sprite('파닥몬', HOPE.patamon!, 8, { attack: HOPE.patamon_attack, flipAttack: false }),
  sprite('엔젤몬', HOPE.angemon!, 13.5, { attack: HOPE.angemon_attack }),
  sprite('홀리엔젤몬', HOPE.holyangemon!, 13.5, { attack: HOPE.holyangemon_attack }),
  sprite('세라피몬', HOPE.seraphimon!, 14, { attack: HOPE.seraphimon_attack }),
  ],
  crest: { image: CRESTS.hope! },
  hit: (_t, stage) => elementHit('holy', stage, false),
})
