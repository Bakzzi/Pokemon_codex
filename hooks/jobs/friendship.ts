// 우정의 문장: 츠노몬 → 가브몬 → 가루몬 → 워가루몬 → 메탈가루몬
// 그림은 hooks/img/friendship.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import { FRIENDSHIP } from '../img/friendship.ts'
import { CRESTS } from '../img/crests.ts'

export const friendship = makeLine({
  key: 'friendship',
  name: '우정',
  icon: '🐺',
  gear: ["", "가브몬으로 진화", "블루 블래스터", "우정의 문장", "가루몬으로 진화", "폭스 파이어", "워가루몬으로 초진화", "카이저 네일", "가루루 킥", "메탈가루몬으로 궁극진화", "코큐토스 브레스·무지개 후광"],
  melee: false,
  stages: [
  sprite('츠노몬', FRIENDSHIP.tsunomon!, 5.5, { mouth: [0.85, 0.5] }),
  sprite('가브몬', FRIENDSHIP.gabumon!, 9.5),
  sprite('가루몬', FRIENDSHIP.garurumon!, 12, { attack: FRIENDSHIP.garurumon_attack }),
  sprite('워가루몬', FRIENDSHIP.weregarurumon!, 13, { attack: FRIENDSHIP.weregarurumon_attack }),
  sprite('메탈가루몬', FRIENDSHIP.metalgarurumon!, 14),
  ],
  crest: { image: CRESTS.friendship! },
  hit: (_t, stage, from) => elementHit('ice', stage, false, from),
})
