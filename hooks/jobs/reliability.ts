// 성실의 문장: 푸카몬 → 파피몬 → 이크몬 → 쥬드몬 → 플레시오몬
// 그림은 hooks/img/reliability.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import { RELIABILITY } from '../img/reliability.ts'
import { CRESTS } from '../img/crests.ts'

export const reliability = makeLine({
  key: 'reliability',
  name: '성실',
  icon: '🐾',
  gear: ["", "파피몬으로 진화", "마칭 피시즈", "성실의 문장", "이크몬으로 진화", "하푼 발칸", "쥬드몬으로 초진화", "해머 스파크", "발칸 해머", "플레시오몬으로 궁극진화", "소로 블루·무지개 후광"],
  melee: true,
  stages: [
  sprite('푸카몬', RELIABILITY.pukamon!, 5.5, { mouth: [0.85, 0.5] }),
  sprite('파피몬', RELIABILITY.gomamon!, 8.5, { attack: RELIABILITY.gomamon_attack, flipAttack: false }),
  sprite('이크몬', RELIABILITY.ikkakumon!, 13, { attack: RELIABILITY.ikkakumon_attack }),
  sprite('쥬드몬', RELIABILITY.zudomon!, 13.5, { attack: RELIABILITY.zudomon_attack }),
  sprite('플레시오몬', RELIABILITY.plesiomon!, 13.5, { attack: RELIABILITY.plesiomon_attack }),
  ],
  crest: { image: CRESTS.reliability! },
  hit: (_t, stage, from) => elementHit('water', stage, true, from),
})
