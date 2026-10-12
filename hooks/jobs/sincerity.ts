// 순수의 문장: 타네몬 → 팔몬 → 니드몬 → 릴리몬 → 로제몬
// 그림은 hooks/img/sincerity.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것)
import { elementHit, makeLine, sprite } from '../digi.ts'
import { SINCERITY } from '../img/sincerity.ts'
import { CRESTS } from '../img/crests.ts'

export const sincerity = makeLine({
  key: 'sincerity',
  name: '순수',
  icon: '🌸',
  gear: ["", "팔몬으로 진화", "포이즌 아이비", "순수의 문장", "니드몬으로 진화", "니들 스프레이", "릴리몬으로 초진화", "플라워 캐논", "템프테이션", "로제몬으로 궁극진화", "포비든 템프테이션·무지개 후광"],
  melee: true,
  stages: [
  sprite('타네몬', SINCERITY.tanemon!, 5.5, { attack: SINCERITY.tanemon_attack }),
  sprite('팔몬', SINCERITY.palmon!, 9, { attack: SINCERITY.palmon_attack }),
  sprite('니드몬', SINCERITY.togemon!, 13, { attack: SINCERITY.togemon_attack }),
  sprite('릴리몬', SINCERITY.lilimon!, 12, { attack: SINCERITY.lilimon_attack }),
  sprite('로제몬', SINCERITY.rosemon!, 13, { attack: SINCERITY.rosemon_attack }),
  ],
  crest: { image: CRESTS.sincerity! },
  hit: (_t, stage) => elementHit('leaf', stage, true),
})
