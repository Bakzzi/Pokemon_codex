// 우정의 문장: 원뿔몬 → 파피몬 → 가루몬 → 워가루몬 → 메탈가루몬
// 그림은 hooks/img/friendship.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { FRIENDSHIP } from '../img/friendship.ts'
import { CRESTS } from '../img/crests.ts'

export const friendship = makeLine({
  key: 'friendship',
  name: '우정',
  icon: '🐺',
  gear: ["", "파피몬으로 진화", "파란불꽃", "파피몬 단련", "가루몬으로 진화", "폭스 파이어", "워가루몬으로 초진화", "카이저 네일", "가루루 킥", "메탈가루몬으로 궁극진화", "코큐토스 브레스·무지개 후광"],
  melee: false,
  stages: [
  sprite('원뿔몬', FRIENDSHIP.tsunomon!, 5.5, { flip: false, mouth: [0.88, 0.6], fx: (t, from) => fx.bubble(from) }),
  sprite('파피몬', FRIENDSHIP.gabumon!, 9.5, { flip: false, mouth: [0.9, 0.33], fx: (t, from) => fx.blueFlame(from, t >= 2 ? 1.2 : 0.9) }),
  sprite('가루몬', FRIENDSHIP.garurumon!, 12, { flip: false, mouth: [0.95, 0.58], fx: (t, from) => fx.blueFlame(from, 1.7) }),
  sprite('워가루몬', FRIENDSHIP.weregarurumon!, 13, { flip: false, mouth: [0.85, 0.4], melee: true, fx: (t, from) => fx.strike('#93C5FD', '#E0F2FE', true) + (t >= 8 ? fx.impact('#E0F2FE', 30, 9.5, 1.4) : '') }),
  sprite('메탈가루몬', FRIENDSHIP.metalgarurumon!, 14, { flip: false, mouth: [0.95, 0.42], fx: (t, from) => fx.cocytus(from) }),
  ],
  crest: { image: CRESTS.friendship! },
  hit: (_t, stage, from) => elementHit('ice', stage, false, from)})
