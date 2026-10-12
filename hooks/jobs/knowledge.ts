// 지식의 문장: 모티몬 → 텐타몬 → 캅테리몬 → 아트라캅테리몬 → 헤라클레스캅테리몬. preview/gen-lines.py가 만든다 (손으로 고치지 말 것)
import { makeLine, sprite } from '../digi.ts'
import * as fx from '../fx.ts'
import { KNOWLEDGE } from '../img/knowledge.ts'
import { OMEGA } from '../img/omega.ts'

export const knowledge = makeLine({
  key: 'knowledge',
  name: '지식',
  icon: '💡',
  gear: ["", "텐타몬으로 진화", "쁘띠 썬더", "캅테리몬으로 진화", "일렉트로 쇼커", "아트라캅테리몬으로 초진화", "혼 버스터", "울트라 썬더", "헤라클레스캅테리몬으로 궁극진화", "메가 블래스터·후광", "무지개 후광"],
  stages: [
    sprite('모티몬', KNOWLEDGE.mochimon!, 4.5, { flip: true, mouth: [0.78, 0.5], fx: (t, from) => fx.bubble(from) }),
    sprite('텐타몬', KNOWLEDGE.tentomon!, 9, { flip: false, mouth: [0.88, 0.36], fx: (t, from) => fx.sparks(from, t >= 2 ? 1 : 0.8) }),
    sprite('캅테리몬', KNOWLEDGE.kabuterimon!, 12.5, { flip: false, mouth: [0.72, 0.45], fx: (t, from) => fx.orb(from, '#38BDF8', '#F0F9FF', t >= 4 ? 1.5 : 1.3) }),
    sprite('아트라캅테리몬', KNOWLEDGE.atlurkabuterimon!, 13.5, { flip: false, mouth: [0.8, 0.12], fx: (t, from) => fx.beam(from, '#38BDF8', '#F0F9FF', 1.4) }),
    sprite('헤라클레스캅테리몬', KNOWLEDGE.heraklekabuterimon!, 14, { flip: false, mouth: [0.9, 0.26], fx: (t, from) => fx.beam(from, '#38BDF8', '#F0F9FF', 1.9) + (t >= 9 ? fx.lightning(fx.BODY_X, '#38BDF8', '#F0F9FF') : '') }),
  ],
  omega: sprite('오메가몬', OMEGA.omegamon!, 14, { flip: false, mouth: [0.3, 0.42], fx: (t, from) => fx.beam(from, '#93C5FD', '#E0F2FE', 1.6) + fx.strike('#FDE68A', '#FFFFFF') }),
})
