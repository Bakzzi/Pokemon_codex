// 모든 직업이 같이 쓰는 그림 조각: 색, 칸 그리기, Claude의 몸·눈·다리·팔, 후광
// 직업 파일(jobs/*.ts)은 이 조각들 위에 자기 장비를 얹어 Claude 한 명을 그린다

export const ORANGE = '#D97757'
export const ORANGE_DARK = '#B4583D'
export const BLUSH = '#F2A48E'
export const INK = '#1F1410'
export const WHITE = '#FFFFFF'
export const GOLD = '#E8B931'
export const GOLD_DARK = '#B8891A'
export const GOLD_LIGHT = '#FFF1B8'
export const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"

export const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"` + (inner ? `>${inner}</rect>` : '/>')

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 1.6초마다 깜빡이는 반짝이 (+ 모양)
export const sparkle = (x: number, y: number, size: number, color: string, begin: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${begin}" repeatCount="indefinite"/>` +
  rect(x - size * 0.15, y - size / 2, size * 0.3, size, color) +
  rect(x - size / 2, y - size * 0.15, size, size * 0.3, color) +
  '</g>'

// 후광: 레벨 90은 금빛으로 숨 쉬듯 빛나고, 레벨 100은 색이 무지개처럼 돈다. color로 다른 빛도 쓸 수 있다
export const halo = (cx: number, cy: number, rx: number, ry: number, w: number, t: number, color = GOLD) => {
  const colors =
    t >= 10 ? `<animate attributeName="stroke" values="${color};#F472B6;#60A5FA;#34D399;${color}" dur="2.4s" repeatCount="indefinite"/>` : ''
  return (
    `<g shape-rendering="auto">` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${w * 2.6}" opacity="0.3">` +
    '<animate attributeName="opacity" values="0.15;0.45;0.15" dur="1.6s" repeatCount="indefinite"/>' +
    colors +
    '</ellipse>' +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${w}">${colors}</ellipse>` +
    '</g>'
  )
}

// 숨 쉬듯 빛이 오르내린다 (마법 무기·보석 등)
export const glow = (dur = '1.2s') => `<animate attributeName="opacity" values="0.15;0.55;0.15" dur="${dur}" repeatCount="indefinite"/>`

// ── 작은 그림 (4px 칸 단위) ──────────────────────────────────────────
// 몸은 (11, 3)에서 8 × 6칸, 눈은 (13, 4)·(16, 4), 다리 넷은 x = 11, 13, 16, 18이고 발끝은 y = 11.
// 팔: 왼팔 (9, 5.5~6.5), 오른팔 (19, 5.5~6.5), 오른손 끝은 x ≈ 21. 머리 꼭대기는 y = 3.
// 그림 전체가 x 5~23.5, y -3~11.5 안에 들어가야 한다 (쉬는 그림의 칸).

export const STEP = '0.36s' // 다리 두 장면이 한 번 도는 시간 (달릴 때)
export const STAND_STEP = '1.4s' // 쉬는 동안의 흔들림

export const swap = (attr: string, a: number | string, b: number | string) =>
  `<animate attributeName="${attr}" values="${a};${b}" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`

// 오른손에 든 것이 팔과 같이 흔들리게 하는 움직임 (무기 묶음 <g> 안에 넣는다)
export const handSwing = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -1" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`

// 3.2초마다 한 번 눈을 깜빡인다
export const blink =
  '<animate attributeName="height" values="2;2;2;2;2;2;2;2;2;0.4" dur="3.2s" calcMode="discrete" repeatCount="indefinite"/>' +
  '<animate attributeName="y" values="4;4;4;4;4;4;4;4;4;4.8" dur="3.2s" calcMode="discrete" repeatCount="indefinite"/>'

export type Boot = { color: string; stripe?: string; sole?: string }
export type Glove = { color: string; shine?: string }

// 다리 넷: 땅을 디딘 다리는 2칸, 든 다리는 1칸. boot가 있으면 발끝에 신발을 신긴다
export const legs = (down: number[], boot?: Boot) =>
  [11, 13, 16, 18]
    .map(x => {
      const h = down.includes(x) ? 2 : 1
      const bottom = 9 + h
      return (
        rect(x, 9, 1, h, ORANGE) +
        (boot
          ? rect(x - 0.4, bottom - 0.9, 1.8, 0.9, boot.color) +
            (boot.stripe ? rect(x - 0.4, bottom - 0.6, 1.8, 0.2, boot.stripe) : '') +
            (boot.sole ? rect(x - 0.4, bottom - 0.2, 1.8, 0.2, boot.sole) : '')
          : '')
      )
    })
    .join('')

// 팔 하나: 달릴 때는 다리와 엇갈리게 흔든다(a ↔ b). glove가 있으면 장갑을 끼운다
export const smallArm = (x: number, a: number, b: number, gloveX: number, glove?: Glove) =>
  rect(x, a, 2, 1, ORANGE, swap('y', a, b)) +
  (glove
    ? rect(gloveX - 0.3, a - 0.3, 1.5, 1.6, glove.color, swap('y', a - 0.3, b - 0.3)) +
      (glove.shine ? rect(gloveX - 0.1, a - 0.15, 0.5, 0.4, glove.shine, swap('y', a - 0.15, b - 0.15)) : '')
    : '')

// 작은 Claude 한 명. 장비는 겹 순서대로: 등 뒤(back) → 다리·신발 → 몸 → 몸 위(body) → 눈 → 머리(head)
// → 팔·장갑 → 오른손(hand, 무기) → 맨 위(over, 후광 등). legsOverride로 다리 대신 다른 것(로봇 다리 등)을 그릴 수 있다
export type SmallParts = {
  back?: string
  boot?: Boot
  body?: string
  head?: string
  glove?: Glove
  hand?: string
  over?: string
  legsOverride?: string
  hideArms?: boolean
}

export type Pose = 'run' | 'stand'

export const smallClawd = (pose: Pose, p: SmallParts) => {
  const run = pose === 'run'
  const legsPart =
    p.legsOverride ??
    (run
      ? `<g>${swap('opacity', 1, 0)}${legs([11, 16], p.boot)}</g><g opacity="0">${swap('opacity', 0, 1)}${legs([13, 18], p.boot)}</g>`
      : legs([11, 13, 16, 18], p.boot))
  const arms = p.hideArms
    ? ''
    : run
      ? smallArm(9, 5.5, 6.5, 9, p.glove) + smallArm(19, 6.5, 5.5, 20.1, p.glove)
      : smallArm(9, 6, 6, 9, p.glove) + smallArm(19, 6, 6, 20.1, p.glove)
  const figure =
    '<g>' +
    // 달릴 때는 한 걸음마다 몸이 살짝 뜨고, 쉴 때는 천천히 숨 쉰다 (장비도 같이)
    (run
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.5" dur="${STEP}" calcMode="discrete" repeatCount="indefinite"/>`
      : `<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3" dur="${STAND_STEP}" calcMode="discrete" repeatCount="indefinite"/>`) +
    (p.back ?? '') +
    legsPart +
    rect(11, 3, 8, 6, ORANGE) +
    (p.body ?? '') +
    rect(13, 4, 1, 2, INK, blink) +
    rect(16, 4, 1, 2, INK, blink) +
    (p.head ?? '') +
    arms +
    (p.hand ?? '') +
    (p.over ?? '') +
    '</g>'
  // 쉬는 동안에는 망토·끈·무기도 달릴 때보다 느리게 흔들린다
  return run ? figure : figure.replaceAll(`dur="${STEP}"`, `dur="${STAND_STEP}"`)
}

// ── 큰 그림 (1px 단위, 작은 그림 칸 × 10 + (220, 6)) ─────────────────────
// 몸은 (330, 36)에서 80 × 60, 다리는 x = 330, 350, 380, 400 (폭 10, y 96~116), 발밑은 y = 116~120.
// 왼팔은 (262, 68)의 말풍선 꼬리를 손가락으로 가리키고, 오른팔은 끝·대기 때 번쩍 들고(손 x 409~433, y 27~47)
// 오류 때 축 늘어뜨린다(손 x 411~429, y 88~104). 머리 위 장비는 y가 0보다 위로 올라갈 수 있다(headroom 만큼).
// 그림 전체는 x 262~458 안에 들어가야 한다.

export type BigVariant = 'done' | 'waiting' | 'error'

export const eyes = (variant: BigVariant) => {
  if (variant === 'done') {
    // 웃는 눈 ^ ^ 와 볼터치
    return (
      [346, 376].map(x => rect(x, 57, 6, 6, INK) + rect(x + 6, 51, 6, 6, INK) + rect(x + 12, 57, 6, 6, INK)).join('') +
      rect(336, 70, 12, 6, BLUSH) +
      rect(392, 70, 12, 6, BLUSH)
    )
  }
  if (variant === 'waiting') {
    // 동그랗게 뜬 눈
    return [349, 379].map(x => rect(x, 44, 12, 22, INK) + rect(x + 3, 47, 4, 5, WHITE)).join('')
  }
  // 어질어질한 X 눈
  return [355, 385]
    .map(c => [[-8, -8], [4, -8], [-2, -2], [-8, 4], [4, 4]].map(([dx, dy]) => rect(c + dx!, 56 + dy!, 6, 6, INK)).join(''))
    .join('')
}

export const bigShoes = (boot: Boot) =>
  [330, 350, 380, 400]
    .map(
      x =>
        rect(x - 4, 102, 18, 14, boot.color) +
        (boot.stripe ? rect(x - 4, 107, 18, 3, boot.stripe) : '') +
        (boot.sole ? rect(x - 4, 113, 18, 3, boot.sole) : ''),
    )
    .join('')

// 왼팔을 쭉 뻗어 말풍선을 콕콕 찌르는 손 (장갑을 끼면 큰 장갑)
export const pointingArm = (glove?: Glove, crease = '#991B1B') => {
  const hand = glove ? glove.color : ORANGE
  return (
    // 찌를 때 팔이 왼쪽으로 7px 나가도 몸과 떨어져 보이지 않게, 어깨 쪽 팔 끝은 제자리에 둔다
    rect(322, 66, 8, 10, ORANGE) +
    '<g>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;-7 0;0 0" keyTimes="0;0.35;1" dur="0.6s" begin="0.75s" repeatCount="indefinite"/>' +
    rect(296, 66, 34, 10, ORANGE) +
    (glove
      ? rect(276, 56, 24, 30, hand) + (glove.shine ? rect(280, 59, 8, 6, glove.shine) : '')
      : rect(280, 60, 18, 22, hand)) +
    rect(262, 64, 20, 9, hand) +
    rect(286, 53, 8, 8, hand) +
    rect(282, 74, 14, 2, glove ? crease : ORANGE_DARK) +
    rect(282, 78, 14, 2, glove ? crease : ORANGE_DARK) +
    '</g>'
  )
}

// 오른팔(손에 든 것 없이). 끝·대기는 번쩍 들고, 오류는 축 늘어뜨린다. 무기는 직업 파일이 손 위치에 맞춰 얹는다:
// 든 손의 손잡이는 x ≈ 421, y 27~47 (무기는 그 위로 y ≈ -20까지), 늘어뜨린 손은 x ≈ 420, y 88~104 (무기는 아래로 y ≈ 137까지)
export const rightArm = (variant: BigVariant, glove?: Glove) => {
  const hand = glove ? glove.color : ORANGE
  if (variant === 'error') {
    return rect(410, 72, 12, 8, ORANGE) + rect(416, 72, 8, 24, ORANGE) + (glove ? rect(411, 88, 18, 16, hand) : '')
  }
  return (
    rect(410, 66, 12, 10, ORANGE) +
    rect(416, 42, 10, 28, ORANGE) +
    (glove ? rect(409, 27, 24, 20, hand) + (glove.shine ? rect(412, 29, 7, 5, glove.shine) : '') : rect(413, 32, 16, 12, hand))
  )
}

// 큰 Claude 한 명. 겹 순서: 등 뒤(back) → 몸·다리 → 신발 → 몸 위(body) → 눈 → 머리(head)
// → 오른팔·무기(arm: 없으면 맨손 오른팔) → 가리키는 왼팔 → 맨 위(over)
export type BigParts = {
  back?: string
  boot?: Boot
  body?: string
  head?: string
  glove?: Glove
  // 가리키는 장갑의 손가락 주름 색 (장갑을 꼈을 때). 없으면 짙은 빨강
  crease?: string
  arm?: string
  over?: string
  legsOverride?: string
}

export const bigClawd = (variant: BigVariant, p: BigParts) =>
  (p.back ?? '') +
  rect(330, 36, 80, 60, ORANGE) +
  (p.legsOverride ?? [330, 350, 380, 400].map(x => rect(x, 96, 10, 20, ORANGE)).join('') + (p.boot ? bigShoes(p.boot) : '')) +
  (p.body ?? '') +
  eyes(variant) +
  (p.head ?? '') +
  (p.arm ?? rightArm(variant, p.glove)) +
  pointingArm(p.glove, p.crease) +
  (p.over ?? '')

// 큰 그림의 펄럭임 (망토 끝 등)
export const flutter = (from: number, to: number) =>
  `<animate attributeName="height" values="${from};${to};${from}" dur="0.8s" repeatCount="indefinite"/>`
