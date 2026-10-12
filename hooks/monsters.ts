// 레벨마다 싸우는 상대: 디지몬 어드벤처의 빌런들 (hooks/img/monsters.ts의 디지몬 스토리 전투 스프라이트)
// 전투 장면은 44 × 15칸이고, 상대는 오른쪽(x 22~41)에 서서 왼쪽의 내 디지몬을 바라본다. 땅은 y = 13.
// 단계(tier) = 레벨 ÷ 10: 0 쿠와가몬 … 9 아포카리몬, 10(레벨 100)은 오메가몬이 동료로 합류한다
import { MONSTERS } from './img/monsters.ts'

export const MONSTER_NAMES = ['쿠가몬', '데블몬', '에테몬', '묘티스몬', '베놈묘티스몬', '메탈시드라몬', '피노키몬', '무겐드라몬', '피에몬', '아포카리몬', '오메가몬']
// 그림 키와 키(칸). 너비는 원본 비율대로
const FOES: readonly (readonly [string, number])[] = [
  ['kuwagamon', 9.5],
  ['devimon', 12.5],
  ['etemon', 11],
  ['vamdemon', 13],
  ['venomvamdemon', 13.5],
  ['metalseadramon', 13.5],
  ['pinochimon', 11.5],
  ['mugendramon', 13.5],
  ['piemon', 13],
  ['apocalymon', 13.5],
  ['omegamon', 13.5],
]
const CENTER = 31.5
const GROUND = 13

// 한 번 주고받는 공격의 주기. 내 디지몬의 돌진, 상대가 맞는 순간, 데미지 숫자가 이 주기에 맞춰 움직인다
export const ATK = '1.8s'

const INK = '#1F1410'
const WHITE = '#FFFFFF'

const at = (v: number) => Math.round(v * 100) / 100
const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"` + (inner ? `>${inner}</rect>` : '/>')

// 상대의 자리(칸): 발은 땅, 가운데는 CENTER. 너비가 19칸을 넘으면 키를 줄인다
const box = (tier: number) => {
  const [key, wantH] = FOES[tier]!
  const img = MONSTERS[key]!
  let h = wantH
  let w = at((h * img.w) / img.h)
  if (w > 19) {
    w = 19
    h = at((w * img.h) / img.w)
  }
  return { img, x: at(CENTER - w / 2), y: at(GROUND - h), w, h }
}

// 상대 한 마리: 숨 쉬듯 들썩인다. 동료(오메가몬)는 조금 더 느긋하게
const draw = (tier: number) => {
  const b = box(tier)
  const dur = tier >= 10 ? '1.6s' : tier >= 5 ? '1s' : '0.7s'
  return (
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3;0 0" dur="${dur}" repeatCount="indefinite"/>` +
    `<image href="${b.img.href}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="none"/>` +
    '</g>'
  )
}

// 상대 머리 위 체력 막대의 높이 (키가 다르다). 키가 크면 머리에 살짝 겹친다
const barY = (tier: number) => Math.max(-0.4, at(box(tier).y - 1.3))

// 상대 하나 + 체력 막대 + 맞는 순간의 흔들림·깜빡임·데미지 숫자.
// hp: 상대에게 남은 체력(0~1). 레벨 100의 오메가몬은 싸우지 않고 동료로 그린다
export const monster = (t: number, hp: number, damage: number) => {
  const tier = Math.max(0, Math.min(10, t))
  const fill = Math.max(0, Math.min(1, hp))
  const y = barY(tier)
  const bar =
    tier >= 10
      ? ''
      : rect(26, y, 8, 0.9, INK) + rect(26.15, y + 0.15, 7.7, 0.6, '#4B5563') + (fill > 0 ? rect(26.15, y + 0.15, 7.7 * fill, 0.6, '#EF4444') : '')
  if (tier >= 10) return draw(tier) + bar
  const hit =
    // 맞는 순간 좌우로 흔들리고 깜빡인다
    '<g>' +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;1 0;-0.6 0;0 0;0 0" keyTimes="0;0.6;0.65;0.7;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;1;0.35;1;0.35;1;1" keyTimes="0;0.6;0.64;0.68;0.72;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    draw(tier) +
    '</g>'
  // 데미지 숫자가 떠오른다
  const pop =
    '<g opacity="0" shape-rendering="auto">' +
    `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.6;0.64;0.88;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -2.6" keyTimes="0;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<text x="38.5" y="${y + 2.6}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="2.8" font-weight="900" fill="#EF4444" stroke="${WHITE}" stroke-width="0.5" paint-order="stroke">-${damage}</text>` +
    '</g>'
  return hit + bar + pop
}
