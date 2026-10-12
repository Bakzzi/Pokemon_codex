// 레벨마다 Claude가 싸우는 몬스터 (픽셀아트, 4px 칸 단위)
// 전투 장면은 44 × 15칸이고, 몬스터는 오른쪽(x 22~43)에 서서 왼쪽의 Claude를 바라본다. 땅은 y = 13.
// 단계(tier) = 레벨 ÷ 10: 0 다람쥐 … 9 드래곤, 10(레벨 100)은 쓰러뜨린 황금 드래곤이 동료가 된다

export const MONSTER_NAMES = ['다람쥐', '토끼', '슬라임', '황소', '로봇', '유령', '골렘', '해골 기사', '마왕', '드래곤', '황금 드래곤']

// 한 번 주고받는 공격의 주기. Claude의 돌진, 몬스터가 맞는 순간, 데미지 숫자가 이 주기에 맞춰 움직인다
export const ATK = '1.8s'

const INK = '#1F1410'
const WHITE = '#FFFFFF'

const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"` + (inner ? `>${inner}</rect>` : '/>')

const loop = (attr: string, values: string, dur: string, extra = '') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}" repeatCount="indefinite"${extra}/>`

// begin: 짝이 되는 투명도 깜빡임과 같은 때에 시작해야 떠오르다가 중간에 툭 떨어지지 않는다
const bob = (values: string, dur: string, discrete = false, begin = '') =>
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${dur}" repeatCount="indefinite"${discrete ? ' calcMode="discrete"' : ''}${begin ? ` begin="${begin}"` : ''}/>`

// ── 몬스터들 ───────────────────────────────────────────────────────

const squirrel = () =>
  // 꼬리를 살랑살랑, 도토리를 꼭 쥐고 있다
  `<g>${bob('0 0;0 -0.4;0 0', '0.6s', true)}` +
  `<g>${bob('0 0;0.4 -0.3;0 0', '0.9s')}` +
  rect(32, 5, 3, 7, '#8B4513') + rect(33, 3.4, 3, 3, '#8B4513') + rect(34, 2.6, 2, 1.4, '#8B4513') + rect(33, 4.6, 1, 6.4, '#C68B59') +
  '</g>' +
  rect(27, 8, 5, 5, '#A0522D') + rect(27.3, 9.5, 2, 3, '#DEB887') +
  rect(25.5, 6.5, 4, 3.6, '#A0522D') + rect(26, 5.6, 1, 1.1, '#A0522D') + rect(28.2, 5.6, 1, 1.1, '#A0522D') +
  rect(26.3, 7.5, 0.8, 0.8, INK) + rect(25.2, 8.5, 0.6, 0.5, '#3F2A1D') +
  rect(25.7, 10, 1.6, 1.4, '#8B5A2B') + rect(25.5, 9.6, 2, 0.6, '#5A3A1C') +
  rect(27, 12.4, 1.6, 0.6, '#5A3A1C') + rect(30.4, 12.4, 1.6, 0.6, '#5A3A1C') +
  '</g>'

const rabbit = () =>
  // 깡충깡충 뛴다
  `<g>${bob('0 0;0 -1.2;0 0;0 0', '0.8s')}` +
  rect(27, 8.5, 6, 4.5, '#D9DCE1') + rect(33, 9, 1.6, 1.6, WHITE) +
  rect(25.5, 6, 4.5, 4, '#D9DCE1') +
  rect(26, 1.5, 1.3, 4.8, '#D9DCE1') + rect(28.3, 2, 1.3, 4.3, '#D9DCE1') +
  rect(26.35, 2.2, 0.6, 3.6, '#F9A8D4') + rect(28.65, 2.6, 0.6, 3.2, '#F9A8D4') +
  rect(26.2, 7.3, 0.8, 0.8, '#DC2626') + rect(25.3, 8.4, 0.6, 0.5, '#F472B6') +
  rect(27, 12.4, 2, 0.6, '#B8BDC6') + rect(31, 12.4, 2, 0.6, '#B8BDC6') +
  '</g>'

const slime = () =>
  // 말랑말랑 늘었다 줄었다
  '<g transform="translate(30.5 13)"><g>' +
  '<animateTransform attributeName="transform" type="scale" values="1 1;1.1 0.86;1 1" dur="0.8s" repeatCount="indefinite"/>' +
  '<g transform="translate(-30.5 -13)">' +
  rect(26, 9, 9, 4, '#4ADE80') + rect(27, 8, 7, 1, '#4ADE80') + rect(28, 7.2, 5, 0.8, '#4ADE80') +
  rect(28, 8.2, 1.5, 0.8, '#BBF7D0') + rect(26, 12.4, 9, 0.6, '#16A34A') +
  rect(28, 9.6, 1, 1.4, INK) + rect(31, 9.6, 1, 1.4, INK) + rect(29.3, 11.2, 1.4, 0.4, INK) +
  '</g></g></g>'

const bull = () => {
  // 콧김을 뿜는다
  const puff = (x: number, y: number, begin: string) =>
    `<g opacity="0">${loop('opacity', '0;0.8;0', '1.2s', ` begin="${begin}"`)}${bob(`0 0;-1.4 -0.6`, '1.2s', false, begin)}` +
    rect(x, y, 0.8, 0.6, '#CBD5E1') +
    '</g>'
  return (
    `<g>${bob('0 0;0 -0.3;0 0', '0.5s', true)}` +
    rect(28, 7, 8, 5, '#6B3E26') + rect(36, 7.4, 0.6, 3, '#6B3E26') +
    rect(24.5, 6, 5, 5, '#5A3220') +
    rect(24, 4.6, 1, 2, '#F3E8D2') + rect(23.3, 4.1, 1, 1, '#F3E8D2') + rect(28, 4.6, 1, 2, '#F3E8D2') + rect(28.7, 4.1, 1, 1, '#F3E8D2') +
    rect(25.4, 7.4, 0.9, 0.9, '#EF4444') + rect(24.2, 9, 2.6, 1.6, '#C08B6E') + rect(24.8, 10.4, 1.2, 0.5, '#E8B931') +
    [28.5, 30.5, 33, 35].map(x => rect(x, 12, 1.2, 1, '#3B2416')).join('') +
    '</g>' +
    puff(23.4, 9.4, '0s') +
    puff(23.4, 10, '0.6s')
  )
}

const robot = () =>
  // 안테나가 깜빡이고 눈이 좌우로 훑는다
  `<g>${bob('0 0;0 -0.3;0 0', '0.6s', true)}` +
  rect(28, 11, 1.4, 2, '#6B7280') + rect(32, 11, 1.4, 2, '#6B7280') +
  rect(25.8, 7, 1.2, 3.4, '#6B7280') + rect(35, 7, 1.2, 3.4, '#6B7280') + rect(25.2, 10.2, 2.2, 0.8, '#4B5563') +
  rect(27, 6.5, 8, 5, '#9CA3AF') + rect(29, 8, 4, 2, '#4B5563') +
  rect(29.5, 8.5, 1, 1, '#34D399', loop('opacity', '1;0.2;1', '0.6s')) +
  rect(28, 3, 6, 3.4, '#D1D5DB') + rect(28.5, 4, 5, 1.2, '#0C4A6E') +
  rect(28.6, 4.2, 1.4, 0.8, '#38BDF8', '<animate attributeName="x" values="28.6;31.9;28.6" dur="1.6s" repeatCount="indefinite"/>') +
  rect(30.8, 1.4, 0.4, 1.6, '#6B7280') + rect(30.6, 0.8, 0.8, 0.8, '#EF4444', loop('opacity', '1;0.2;1', '0.8s')) +
  '</g>'

const ghost = () =>
  // 둥실둥실 떠다니고 몸이 비친다
  `<g opacity="0.88">${bob('0 0;0 -1.2;0 0', '1.6s')}` +
  rect(28, 3, 5, 1, '#DBEAFE') + rect(27, 4, 7, 8, '#DBEAFE') +
  rect(27, 12, 1.4, 1, '#DBEAFE') + rect(29.8, 12, 1.4, 1, '#DBEAFE') + rect(32.6, 12, 1.4, 1, '#DBEAFE') +
  rect(25.6, 7, 1.6, 1, '#DBEAFE') + rect(33.8, 6, 1.6, 1, '#DBEAFE') +
  rect(28.5, 6, 1.2, 1.8, '#1E3A8A') + rect(31.5, 6, 1.2, 1.8, '#1E3A8A') +
  rect(29.8, 9, 1.4, 1.2, '#1E3A8A', loop('height', '1.2;0.4;1.2', '1.2s')) +
  '</g>'

const golem = () =>
  // 쿵쿵 무겁게 들썩이고 눈이 이글거린다
  `<g>${bob('0 0;0 0.4;0 0', '1s', true)}` +
  rect(27, 10.5, 3, 2.5, '#57534E') + rect(33, 10.5, 3, 2.5, '#57534E') +
  rect(23.5, 5, 2.6, 4.5, '#57534E') + rect(37, 5, 2.6, 4.5, '#57534E') +
  rect(23, 9, 3.5, 2.5, '#78716C') + rect(36.5, 9, 3.5, 2.5, '#78716C') +
  rect(26, 4.5, 11, 6.5, '#78716C') + rect(26, 4.5, 11, 1, '#65A30D') + rect(30, 7, 2, 1, '#65A30D') +
  rect(29, 6, 0.4, 3, '#44403C') + rect(33.5, 7.5, 2, 0.4, '#44403C') +
  rect(28.5, 1.8, 6, 3, '#A8A29E') +
  rect(29.5, 2.8, 1.2, 0.8, '#F97316', loop('opacity', '1;0.5;1', '1s')) +
  rect(32.3, 2.8, 1.2, 0.8, '#F97316', loop('opacity', '1;0.5;1', '1s')) +
  '</g>'

const skeleton = () =>
  // 칼을 겨누고 덜그럭거린다
  `<g>${bob('0 0;0 -0.3;0 0', '0.5s', true)}` +
  rect(28.5, 10.5, 0.8, 2.5, '#E7E5E4') + rect(31.5, 10.5, 0.8, 2.5, '#E7E5E4') +
  rect(28, 12.4, 1.6, 0.6, '#44403C') + rect(31, 12.4, 1.6, 0.6, '#44403C') +
  rect(33, 6.5, 2.6, 4, '#7C2D12') + rect(33.8, 7.6, 1, 1.6, '#E8B931') +
  rect(27, 6.5, 6.5, 4.5, '#64748B') + rect(28, 7.5, 4.5, 0.4, '#E7E5E4') + rect(28, 8.7, 4.5, 0.4, '#E7E5E4') +
  rect(27.6, 2.5, 5, 4, '#E7E5E4') + rect(27.3, 1.8, 5.6, 1, '#64748B') +
  rect(28.2, 3.6, 1.2, 1.2, INK) + rect(30.6, 3.6, 1.2, 1.2, INK) +
  rect(28.5, 3.9, 0.5, 0.5, '#EF4444') + rect(30.9, 3.9, 0.5, 0.5, '#EF4444') +
  rect(28.6, 5.8, 3, 0.6, '#D6D3D1') +
  rect(22, 8, 4.5, 0.6, '#CBD5E1') + rect(26.4, 7.5, 0.6, 1.6, '#78350F') +
  '</g>'

const demon = () =>
  // 보랏빛 기운이 일렁이고 손에 불덩이를 든다
  `<g>${bob('0 0;0 -0.4;0 0', '0.9s')}` +
  `<g opacity="0.5">${loop('opacity', '0.2;0.6;0.2', '0.9s')}` +
  rect(24.6, 6, 1, 4, '#A855F7') + rect(37.4, 5, 1, 5, '#A855F7') + rect(30.5, 0.6, 1, 1.2, '#A855F7') +
  '</g>' +
  rect(26, 4, 11, 9, '#3B0764') +
  rect(27, 5, 8, 7, '#7C3AED') +
  rect(27, 2, 1, 2.5, '#1F2937') + rect(26.3, 1.5, 1, 1, '#1F2937') + rect(33.8, 2, 1, 2.5, '#1F2937') + rect(34.5, 1.5, 1, 1, '#1F2937') +
  rect(28.3, 6.5, 1.4, 0.8, '#F87171', loop('opacity', '1;0.4;1', '0.7s')) +
  rect(31.8, 6.5, 1.4, 0.8, '#F87171', loop('opacity', '1;0.4;1', '0.7s')) +
  rect(29.5, 8.8, 3, 0.6, INK) + rect(30, 9.4, 0.4, 0.5, WHITE) + rect(31.6, 9.4, 0.4, 0.5, WHITE) +
  rect(28, 12, 1.5, 1, '#1F2937') + rect(32.5, 12, 1.5, 1, '#1F2937') +
  rect(24.4, 7.8, 1.8, 1.8, '#F97316', loop('opacity', '1;0.6;1', '0.5s')) + rect(24.8, 8.2, 1, 1, '#FDE68A') +
  '</g>'

// 드래곤: 날개를 퍼덕이고, 공격 주기 앞부분에 왼쪽(Claude 쪽)으로 불을 뿜는다. 황금이면 불 대신 하트
const dragon = (gold: boolean) => {
  const body = gold ? '#F59E0B' : '#DC2626'
  const dark = gold ? '#B45309' : '#991B1B'
  const belly = gold ? '#FEF3C7' : '#FCD34D'
  const fire = gold
    ? [0, 1, 2]
        .map(
          i =>
            `<g opacity="0">${loop('opacity', '0;1;0', '1.8s', ` begin="${i * 0.6}s"`)}${bob('0 0;0 -3', '1.8s', false, `${i * 0.6}s`)}` +
            rect(22 + i * 3, 1 + (i % 2), 0.8, 0.8, '#F472B6') + rect(23 + i * 3, 1 + (i % 2), 0.8, 0.8, '#F472B6') +
            rect(22.4 + i * 3, 1.6 + (i % 2), 1.2, 0.8, '#F472B6') +
            '</g>',
        )
        .join('')
    : '<g opacity="0">' +
      `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.08;0.12;0.3;0.36;1" dur="${ATK}" repeatCount="indefinite"/>` +
      rect(14, 4.4, 8, 1.6, '#F97316') + rect(16, 4.8, 6, 0.8, '#FDE68A') + rect(12.6, 4, 2, 2.4, '#FB923C') +
      '</g>'
  return (
    `<g>${bob('0 0;0 -0.5;0 0', '1.2s')}` +
    // 날개
    `<g>${bob('0 0;0 1.2;0 0', '0.6s')}` +
    rect(33, 0.5, 6, 5.5, dark) + rect(35, -0.6, 4, 1.4, dark) + rect(39, 1.4, 1.4, 3, dark) +
    '</g>' +
    rect(28, 6, 10, 6, body) + rect(29, 8.5, 7, 3, belly) +
    [29, 31.5, 34, 36.5].map(x => rect(x, 5.2, 1, 0.8, dark)).join('') +
    rect(38, 9, 4, 1.5, body) + rect(41, 8, 2, 1.5, body) + rect(42.4, 7.2, 1, 1, dark) +
    rect(25.5, 4, 3, 4, body) +
    rect(22, 2.5, 5, 3.5, body) + rect(22, 5, 4, 1, dark) +
    rect(25.5, 1.2, 0.8, 1.6, '#F3E8D2') + rect(26.6, 0.8, 0.8, 1.6, '#F3E8D2') +
    rect(23.5, 3.2, 0.9, 0.9, '#FACC15') +
    rect(22.4, 5.9, 0.4, 0.5, WHITE) + rect(23.6, 5.9, 0.4, 0.5, WHITE) +
    rect(29, 12, 2, 1, dark) + rect(35, 12, 2, 1, dark) +
    '</g>' +
    fire
  )
}

const DRAW = [squirrel, rabbit, slime, bull, robot, ghost, golem, skeleton, demon, () => dragon(false), () => dragon(true)]

// 몬스터 머리 위 체력 막대의 높이(몬스터 키가 다르다)
const BAR_Y = [4, 0.6, 5.8, 2.8, -0.6, 1.4, 0.4, 0.4, 0.2, -1.2, -1.2]

// 몬스터 한 마리 + 체력 막대 + 맞는 순간의 흔들림·깜빡임·데미지 숫자.
// hp: 몬스터에게 남은 체력(0~1). 레벨 100의 황금 드래곤은 싸우지 않고 동료로 그린다
export const monster = (t: number, hp: number, damage: number) => {
  const tier = Math.max(0, Math.min(10, t))
  const fill = Math.max(0, Math.min(1, hp))
  const bar =
    tier >= 10
      ? ''
      : rect(26, BAR_Y[tier]!, 8, 0.9, INK) +
        rect(26.15, BAR_Y[tier]! + 0.15, 7.7, 0.6, '#4B5563') +
        (fill > 0 ? rect(26.15, BAR_Y[tier]! + 0.15, 7.7 * fill, 0.6, '#EF4444') : '')
  if (tier >= 10) return DRAW[tier]!() + bar
  const hit =
    // 맞는 순간 좌우로 흔들리고 깜빡인다
    '<g>' +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;1 0;-0.6 0;0 0;0 0" keyTimes="0;0.6;0.65;0.7;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;1;0.35;1;0.35;1;1" keyTimes="0;0.6;0.64;0.68;0.72;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    DRAW[tier]!() +
    '</g>'
  // 데미지 숫자가 떠오른다
  const pop =
    '<g opacity="0" shape-rendering="auto">' +
    `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.6;0.64;0.88;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -2.6" keyTimes="0;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<text x="38.5" y="${BAR_Y[tier]! + 2.6}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="2.8" font-weight="900" fill="#EF4444" stroke="${WHITE}" stroke-width="0.5" paint-order="stroke">-${damage}</text>` +
    '</g>'
  return hit + bar + pop
}
