// 지식의 문장: 모티몬 → 텐타몬 → 캅테리몬 → 메가캅테리몬 → 헤라클레스캅테리몬
// 그림은 hooks/img/knowledge.ts (위키몬의 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것). preview/gen-lines.py가 만든다
import { elementHit, makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { KNOWLEDGE } from '../img/knowledge.ts'
import { CRESTS } from '../img/crests.ts'

export const knowledge = makeLine({
  key: 'knowledge',
  name: '지식',
  icon: '💡',
  gear: ["", "텐타몬으로 진화", "프티 썬더", "지식의 문장", "캅테리몬으로 진화", "일렉트로 쇼커", "메가캅테리몬으로 초진화", "호른 버스터", "울트라 썬더", "헤라클레스캅테리몬으로 궁극진화", "메가 블래스터·무지개 후광"],
  melee: false,
  stages: [
  sprite('모티몬', KNOWLEDGE.mochimon!, 4.5, { flip: true, mouth: [0.85, 0.5], fx: (t, from) => fx.bubble(from) }),
  sprite('텐타몬', KNOWLEDGE.tentomon!, 9, { flip: false, fx: (t, from) => fx.beam(from, '#FDE047', '#FFFBEB', t >= 2 ? 0.7 : 0.5) }),
  sprite('캅테리몬', KNOWLEDGE.kabuterimon!, 12.5, { flip: false, fx: (t, from) => fx.orb(from, '#FDE047', '#FFFBEB', 1.3) }),
  sprite('메가캅테리몬', KNOWLEDGE.atlurkabuterimon!, 13.5, { flip: false, fx: (t, from) => fx.beam(from, '#FDE047', '#FFFBEB', 1.4) }),
  sprite('헤라클레스캅테리몬', KNOWLEDGE.heraklekabuterimon!, 14, { flip: false, fx: (t, from) => fx.beam(from, '#FDE047', '#FFFBEB', 1.9) + (t >= 8 ? fx.lightning() : '') }),
  ],
  crest: { image: CRESTS.knowledge! },
  hit: (_t, stage, from) => elementHit('thunder', stage, false, from)})
