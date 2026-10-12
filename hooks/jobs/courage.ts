// 용기의 문장: 코로몬 → 아구몬 → 그레이몬 → 메탈그레이몬 → 워그레이몬
// 그림은 hooks/img/courage.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { COURAGE } from '../img/courage.ts'
import { CRESTS } from '../img/crests.ts'

export const courage = makeLine({
  key: 'courage',
  name: '용기',
  icon: '🔥',
  gear: ["", "아구몬으로 진화", "페퍼 브레스", "용기의 문장", "그레이몬으로 진화", "메가 플레임", "메탈그레이몬으로 초진화", "기가 디스트로이어", "트라이던트 암", "워그레이몬으로 궁극진화", "가이아 포스·무지개 후광"],
  melee: false,
  stages: [
  sprite('코로몬', COURAGE.koromon!, 5.5, { flip: false, mouth: [0.82, 0.62], fx: (t, from) => fx.bubble(from) }),
  sprite('아구몬', COURAGE.agumon!, 9.5, { flip: false, mouth: [0.9, 0.36], fx: (t, from) => fx.fireball(from, t >= 2 ? 1.3 : 0.9) }),
  sprite('그레이몬', COURAGE.greymon!, 13, { flip: false, mouth: [0.93, 0.3], fx: (t, from) => fx.fireball(from, 1.8) }),
  sprite('메탈그레이몬', COURAGE.metalgreymon!, 14, { flip: false, mouth: [0.62, 0.55], fx: (t, from) => fx.missiles(from, 2) + (t >= 8 ? fx.tridentArm([from[0] + 1, from[1] + 2.5]) : '') }),
  sprite('워그레이몬', COURAGE.wargreymon!, 13, { flip: false, mouth: [0.55, 0.03], fx: (t, from) => fx.gaiaForce(from) }),
  ],
  crest: { image: CRESTS.courage! },
  hit: (_t, stage, from) => elementHit('fire', stage, false, from)})
