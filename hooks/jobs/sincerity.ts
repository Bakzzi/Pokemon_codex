// 순수의 문장: 타네몬 → 팔몬 → 니드몬 → 릴리몬 → 로제몬
// 그림은 hooks/img/sincerity.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { SINCERITY } from '../img/sincerity.ts'
import { CRESTS } from '../img/crests.ts'

export const sincerity = makeLine({
  key: 'sincerity',
  name: '순수',
  icon: '🌸',
  gear: ["", "팔몬으로 진화", "포이즌 아이비", "팔몬 단련", "니드몬으로 진화", "니들 스프레이 강화", "릴리몬으로 초진화", "플라워 캐논", "템프테이션", "로제몬으로 궁극진화", "포비든 템프테이션·무지개 후광"],
  melee: false,
  stages: [
  sprite('타네몬', SINCERITY.tanemon!, 5.5, { flip: true, mouth: [0.82, 0.66], fx: (t, from) => fx.bubble(from) }),
  sprite('팔몬', SINCERITY.palmon!, 9, { flip: false, mouth: [0.92, 0.55], fx: (t, from) => fx.vine(from) }),
  sprite('니드몬', SINCERITY.togemon!, 13, { flip: false, mouth: [0.85, 0.5], fx: (t, from) => fx.needleSpray(from) }),
  sprite('릴리몬', SINCERITY.lilimon!, 12, { flip: false, mouth: [0.78, 0.55], fx: (t, from) => fx.flowerCannon(from) }),
  sprite('로제몬', SINCERITY.rosemon!, 13, { flip: false, mouth: [0.88, 0.55], fx: (t, from) => fx.whip(from, '#EC4899', '#FBCFE8') }),
  ],
  crest: { image: CRESTS.sincerity! },
  hit: (_t, stage, from) => elementHit('leaf', stage, false, from)})
