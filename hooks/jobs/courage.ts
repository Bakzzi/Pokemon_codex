// 용기의 문장: 코로몬 → 아구몬 → 그레이몬 → 메탈그레이몬 → 워그레이몬
import { ATK } from '../monsters.ts'
import { WHITE, rect } from '../pixel.ts'
import { glowBox, impact, makeLine, shot } from '../digi.ts'
import type { Palette, Stage } from '../digi.ts'

// ── 코로몬 (유년기): 분홍 덩어리, 큰 입, 뒤로 흩날리는 귀 ─────────────────
const KORO: Palette = {
  p: '#F5A0B0',
  l: '#FBC4CF',
  d: '#D97A8E',
  r: '#D7263D',
  m: '#8B1E3F',
  w: '#FFFFFF',
}
const koromon: Stage = {
  name: '코로몬',
  pal: KORO,
  rows: [
    'pp..................',
    'ppp.ppp.............',
    '.ppp.ppp............',
    '..pppppppppppppp....',
    '...dppppppppppppp...',
    '.....ppllpppppppppp.',
    '....pppllppppppppppp',
    '....pppprrppppprrppp',
    '....pppprrppppprrppp',
    '....pppppppppppppppp',
    '....pmmmmmmmmmmmmmmp',
    '....ppmwmmwmmwmmwmpp',
    '....dpmmmmmmmmmmmmpd',
    '.....ddppppppppppdd.',
  ],
  eyes: { at: [[8, 7], [15, 7]], w: 2, h: 2, lid: '#F5A0B0' },
}

// ── 아구몬 (성장기): 노란 공룡, 초록 눈, 세 발톱 ─────────────────────────
const AGU: Palette = {
  y: '#F2C14E',
  o: '#D9A030',
  g: '#1E9E5A',
  n: '#F3EEE0',
  k: '#1F1410',
}
const agumon: Stage = {
  name: '아구몬',
  pal: AGU,
  rows: [
    '........yyyyyyyy......',
    '.......yyyyyyyyyy.....',
    '......yyyyyyyyyyyy....',
    '......yyyyyyggyyyyy...',
    '......yyyyyyggyyyyyyy.',
    '......yyyyyyyyyyyyyyyy',
    '......yyyyyyyyyoooooooo',
    '.......yyyyyyyyknknknk',
    '........yyyyyyyoooooo.',
    '.........ooyyyyyyyo...',
    'y.........yyyyyyyy....',
    'yy.......yyyyyyyyyy...',
    'yyy.....yyyyyyyyyyyyy.',
    '.yyyy...yyyyyyyyyyoyyn',
    '..yyyy.yyyyyyyyyyyonnn',
    '...yyyyyyyyyyyyyyyyy..',
    '....yyyyyyyyyyyyyyy...',
    '.....yyyyyoyyyyyyy....',
    '......yyyyyo.yyyyy....',
    '......yyyyyo.yyyyy....',
    '.....yyyyyyo.yyyyyy...',
    '....nyyyyyyn.nyyyyyn..',
  ],
  eyes: { at: [[12, 3]], w: 2, h: 2, lid: '#F2C14E' },
}

// ── 그레이몬 (성숙기): 주황 몸에 파란 줄무늬, 갈색 해골 투구와 뿔 셋 ───────────
const GREY: Palette = {
  o: '#E8893A',
  d: '#C26A20',
  b: '#3B5BDB',
  s: '#8C6239',
  S: '#5A3A20',
  h: '#F3EEE0',
  g: '#1E9E5A',
  k: '#1F1410',
}
const greymon: Stage = {
  name: '그레이몬',
  pal: GREY,
  rows: [
    '..............h.......h.....',
    '.............hh.......hh....',
    '.............shh.....hhs....',
    '............sssssssssssss...',
    '...........sssssssssssssss..',
    '...........ssssssggsssssssshh',
    '...........ssssssggssssssssshh',
    '...........sssssssssssssssss.',
    '............SSSSSSSSSSSSSSS.',
    '............ooohohohohohooo.',
    '............dooooooooooooo..',
    'o............ddoooooooood...',
    'oo..........ooooooooooooo...',
    'ooo........oooobbooooobbooooo',
    '.oooo.....oooobboooooobboooooo',
    '..ooooo..ooooobbooooobboooooo',
    '...ooooooooooooooooooooooooo.',
    '....ooooooooooooooooooooddooh',
    '.....ddooooooooooooooooddhhh.',
    '......ddooooooooooooooooo...',
    '.......oooooooodd.ooooooo...',
    '.......ooooooodd...oooooo...',
    '.......ooooooodd...oooooo...',
    '......hoooooooh...hooooooh..',
  ],
  eyes: { at: [[17, 5]], w: 2, h: 2, lid: '#8C6239' },
}

// ── 메탈그레이몬 (완전체): 쇠 가면과 트라이던트 암, 등의 찢어진 날개, 가슴의 미사일 해치 ──
const METAL: Palette = {
  o: '#E8893A',
  d: '#C26A20',
  b: '#3B5BDB',
  m: '#AEB7C2',
  M: '#5F6B78',
  r: '#D7263D',
  h: '#F3EEE0',
  g: '#1E9E5A',
  v: '#6B4FA8',
  V: '#3B2A5E',
  k: '#1F1410',
}
const metalgreymon: Stage = {
  name: '메탈그레이몬',
  pal: METAL,
  rows: [
    '..............rr..mm....mm....',
    '.............rrrrmmmm..mmm....',
    '............rrrrmmmmmmmmmmmm..',
    '...........rrrmmmmmmmmmmmmmmm.',
    '...........rrmmmmmmmmmmmmmmmmm',
    '............rmmmmmmmmmmmmmmmmhh',
    '.............mmmmmmgggmmmmmmmmhh',
    '.............mmmmmmgggmmmmmmmm.',
    '.............mMMMMMMMMMMMMMMM.',
    '..............ooohohohohohoo..',
    '.vv...........ddoooooooooood..',
    'vvvv...........ddoooooooooo...',
    'vVvvv.........ooooooooooooo...',
    '.vVvvvv......oooobboooobboooo.',
    '..vVvvvvv...ooooobboooobbooooo',
    '...vVvvvvv..ooooMMMMMMMMMoooooo',
    '....vVvvvvv.ooooMmmmrrmmMoooooo',
    '.....vVVVV..ooooMmmmrrmmMoooMMM',
    '......ooooooooooMMMMMMMMMooMmmmmh',
    '.......oooooooooooooooooooMmmmmhh',
    '........ooooooooooooooooooMMMMMh.',
    '.........ddoooooooooooooooo......',
    '..........ddooooooodd.oooooo.....',
    '..........oooooooodd...ooooo.....',
    '..........oooooooodd...ooooo.....',
    '.........hooooooooh...hoooooh....',
  ],
  eyes: { at: [[19, 6]], w: 3, h: 2, lid: '#AEB7C2' },
}

// ── 워그레이몬 (궁극체): 크롬디지조이드 갑옷, 드라몬 킬러, 등의 브레이브 실드 ─────
const WAR: Palette = {
  y: '#F2C14E',
  o: '#D9A030',
  m: '#C3CCD6',
  M: '#6E7A86',
  h: '#F3EEE0',
  r: '#D7263D',
  g: '#1E9E5A',
  c: '#F26B21',
  k: '#1F1410',
}
const wargreymon: Stage = {
  name: '워그레이몬',
  pal: WAR,
  rows: [
    '...........h....h.......',
    '..........hh....hh......',
    '..........mmmmmmmmmm....',
    '.........mmmmmmmmmmmm...',
    '.........mmmmyyggyyymm..',
    '.........mmmmyyggyyyymmh',
    '.........mmmmyyyyyyyymmm',
    '..........mmmMMMMMMMmm..',
    '...........myyyyyyyy....',
    '..mmmm.....ooyyyyyyoo...',
    '.mmmmmm...mmmmmmmmmmmm..',
    'mmmccmmm.mmmMyyyyyyMmmm.',
    'mmcccmmm.mmMyyccyyyMmmmm',
    'mmcccmmm.MMyyccccyyMMMMhhhh',
    'mmmccmmm.MMyyccccyyMMMMhhhh',
    '.mmmmmm..MMyyyccyyyMMMMhhhh',
    '..mmmm...Myyyyyyyyyymmm.',
    '.........hhyyyyyyyyy....',
    '........hhhMMyyyyMM.....',
    '........hh.MMyyyyMM.....',
    '...........yyyy.yyyy....',
    '...........yyyy.yyyy....',
    '...........yyyy.yyyy....',
    '..........mmmmm.mmmmm...',
    '..........mmmmm.mmmmm...',
    '.........hmmmmmhmmmmmh..',
  ],
  eyes: { at: [[15, 4]], w: 2, h: 2, lid: '#F2C14E' },
}

// ── 문장: 용기 (주황 태양) ───────────────────────────────────────────
const CREST = { rows: ['.o.o.', 'ooooo', '.ooo.', 'ooooo', '.o.o.'], pal: { o: '#F26B21' } }

// ── 공격 효과 ─────────────────────────────────────────────────────
const FIRE: Palette = { r: '#F26B21', y: '#FDE047', w: '#FFF7D6' }
const bubble = ['.pp.', 'pwpp', 'pppp', '.pp.']
const flame = ['..rr', '.ryr', 'rywr', '.ryr', '..rr']
const bigFlame = ['....rrr.', '..rryyrr', 'rryywwyr', '..rryyrr', '....rrr.']
const megaFlame = ['......rrrr', '....rryyyr', '..rryywwyyr', 'rryywwwwyyr', '..rryywwyyr', '....rryyyr', '......rrrr']
const MISSILE: Palette = { m: '#9AA3AE', M: '#5F6B78', r: '#D7263D', y: '#FDE047' }
const missile = ['yMmmmmmr', 'yMmmmmmr']
const GAIA: Palette = { r: '#F26B21', y: '#FDE047', w: '#FFF7D6' }
const gaia = [
  '....rrrr....',
  '..rryyyyrr..',
  '.ryyywwyyyr.',
  'rryywwwwyyrr',
  'ryywwwwwwyyr',
  'ryywwwwwwyyr',
  'rryywwwwyyrr',
  '.ryyywwyyyr.',
  '..rryyyyrr..',
  '....rrrr....',
]

const hit = (t: number, stage: number) => {
  if (stage === 0) return shot(bubble, { p: '#F9C0CC', w: WHITE }, 7.5) + impact('#F9C0CC', 25.7, 7.9, 0.7)
  if (stage === 1) return shot(t >= 2 ? bigFlame : flame, FIRE, 7, 9, glowBox(t >= 2 ? 8 : 4, 5, '#F26B21')) + impact('#F26B21')
  if (stage === 2) return shot(megaFlame, FIRE, 6.5, 9, glowBox(11, 7, '#F26B21')) + impact('#F26B21', 25.7, 7.5, 1.3)
  if (stage === 3) {
    // 기가 디스트로이어: 가슴 해치에서 미사일 둘이 날아간다. 80부터 트라이던트 암(집게 발톱)이 같이 뻗는다
    const claw =
      t >= 8
        ? '<g opacity="0">' +
          `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.52;0.7;0.74;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
          rect(18, 8.4, 7, 0.5, '#5F6B78') +
          rect(24.6, 7.2, 1.2, 0.6, '#F3EEE0') +
          rect(24.6, 9, 1.2, 0.6, '#F3EEE0') +
          rect(25.4, 7.8, 1.2, 1.2, '#9AA3AE') +
          '</g>'
        : ''
    return shot(missile, MISSILE, 5.5, 9) + shot(missile, MISSILE, 7.2, 9) + claw + impact('#FDE047', 25.7, 6.5, 1.1) + impact('#F26B21', 26.3, 8.6, 1.1)
  }
  return shot(gaia, GAIA, 6, 9, glowBox(12, 10, '#F26B21')) + impact('#FDE047', 25.7, 7.2, 1.8)
}

export const courage = makeLine({
  key: 'courage',
  name: '용기',
  icon: '🔥',
  gear: [
    '',
    '아구몬으로 진화',
    '페퍼 브레스',
    '용기의 문장',
    '그레이몬으로 진화',
    '메가 플레임',
    '메탈그레이몬으로 초진화',
    '기가 디스트로이어',
    '트라이던트 암',
    '워그레이몬으로 궁극진화',
    '가이아 포스·무지개 후광',
  ],
  melee: false,
  stages: [koromon, agumon, greymon, metalgreymon, wargreymon],
  crest: CREST,
  hit,
})
