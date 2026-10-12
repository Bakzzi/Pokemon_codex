// 용기의 문장: 코로몬 → 아구몬 → 그레이몬 → 메탈그레이몬 → 워그레이몬
import { ATK } from '../monsters.ts'
import { WHITE, rect } from '../pixel.ts'
import { glowBox, impact, makeLine, shot } from '../digi.ts'
import type { Palette, Stage } from '../digi.ts'

// ── 코로몬 (유년기): 분홍 덩어리, 큰 입과 뾰족한 이, 뒤로 흩날리는 귀 ─────────
const KORO: Palette = {
  p: '#F5A0B0',
  d: '#D97A8E',
  r: '#D7263D',
  m: '#7A1230',
  w: '#FFFFFF',
  k: '#1F1410',
}
const koromon: Stage = {
  name: '코로몬',
  pal: KORO,
  rows: [
    '.pp.................',
    '.ppp.pp.............',
    '..ppp.ppp...........',
    '...pppppppppppp.....',
    '....pppppppppppppp..',
    '...ppppppppppppppppp',
    '..ppppprrwpppppprrwp',
    '..ppppprrrpppppprrrp',
    '..ppppprrrpppppprrrp',
    '..pppppppppppppppppp',
    '..pkkkkkkkkkkkkkkkkp',
    '..pkmwmmwmmwmmwmmwkp',
    '..pkmmmmmmmmmmmmmmkp',
    '...pkmmmmmmmmmmmmkp.',
    '....ppkkkkkkkkkkpp..',
    '......pppppppppp....',
  ],
  eyes: { at: [[7, 6], [15, 6]], w: 3, h: 3, lid: '#F5A0B0' },
}

// ── 아구몬 (성장기): 노란 공룡, 벌린 입과 이, 세 발톱, 굵은 꼬리 ─────────────
const AGU: Palette = {
  y: '#F2C14E',
  o: '#D9A030',
  g: '#1E9E5A',
  n: '#F3EEE0',
  m: '#7A1230',
  w: '#FFFFFF',
  k: '#1F1410',
}
const agumon: Stage = {
  name: '아구몬',
  pal: AGU,
  rows: [
    '.........yyyyyyyy.......',
    '.......yyyyyyyyyyyy.....',
    '......yyyyyyyyyyyyyy....',
    '.....yyyyyyyyyyyyyyyy...',
    '.....yyyyyyyggyyyyyyyy..',
    '.....yyyyyyygkyyyyyyyyyy',
    '.....yyyyyyyyyyyyyyyyyyy',
    '......yyyyyyyyyymwmwmwmw',
    '.......yyyyyyyyymmmmmmmm',
    '........yyyyyyyyywmwmwmy',
    '.........yyyyyyyyyyyyyy.',
    '..........yyyyyyyyyyy...',
    'y..........ooyyyyyyo....',
    'yy.........yyyyyyyyy....',
    'yyy.......yyyyyyyykkkk..',
    '.yyyy....yyyyyyyyykyyyyn',
    '..yyyyy.yyyyyyyyyykyyynn',
    '...yyyyyyyyyyyyyyyyyy...',
    '....yyyyyyyyyyyyyyyy....',
    '.....yyyyyyyyyyyyyy.....',
    '......yyyyyykyyyyyy.....',
    '......yyyyyykyyyyyy.....',
    '......yyyyyykyyyyyy.....',
    '.....nyyyyyn.nyyyyyn....',
  ],
  eyes: { at: [[12, 4]], w: 2, h: 2, lid: '#F2C14E' },
}

// ── 그레이몬 (성숙기): 갈색 해골 투구와 뿔 셋, 주황 몸에 파란 줄무늬, 벌린 입 ──────
const GREY: Palette = {
  o: '#E8893A',
  d: '#C26A20',
  b: '#3B5BDB',
  s: '#8C6239',
  S: '#5A3A20',
  h: '#F3EEE0',
  g: '#1E9E5A',
  m: '#7A1230',
  w: '#FFFFFF',
  k: '#1F1410',
}
const greymon: Stage = {
  name: '그레이몬',
  pal: GREY,
  rows: [
    '...............h........h.....',
    '..............hh.......hh.....',
    '..............shh.....hhs.....',
    '.............sssssssssssss....',
    '............sssssssssssssss...',
    '............sssssssssssssssss.',
    '............ssssssggssssssssshh',
    '............ssssssgkssssssssshh',
    '............sssssssssssssssss.',
    '............SSSSSSSSSSSSSSSSS.',
    '.............ooomwmwmwmwmwmo..',
    '.............ooommmmmmmmmmoo..',
    '..............oowmwmwmwmwoo...',
    '...............ooooooooooo....',
    'o..............dooooooood.....',
    'oo............ooooooooooo.....',
    'ooo..........oooobboooobboooo.',
    '.oooo.......ooooobboooobbooooo',
    '..ooooo....oooooobboooobbooooo',
    '...ooooooooooooooooooooooooooo',
    '....ooooooooooooooooooookkkooh',
    '.....dddoooooooooooooooooohhh.',
    '......ddoooooooooooooooooooo..',
    '.......ooooooookkooooooooo....',
    '.......oooooooo..oooooooo.....',
    '......hooooooooh.hoooooooooh..',
  ],
  eyes: { at: [[18, 6]], w: 2, h: 2, lid: '#8C6239' },
}

// ── 메탈그레이몬 (완전체): 쇠 가면과 붉은 갈기, 트라이던트 암, 가슴의 미사일 해치, 찢어진 날개 ──
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
  n: '#7A1230',
  w: '#FFFFFF',
  k: '#1F1410',
}
const metalgreymon: Stage = {
  name: '메탈그레이몬',
  pal: METAL,
  rows: [
    '...............rr...mm.....mm....',
    '..............rrrr.mmmm...mmm....',
    '.............rrrrrmmmmmmmmmmmm...',
    '............rrrrmmmmmmmmmmmmmmm..',
    '............rrrmmmmmmmmmmmmmmmmm.',
    '.............rrmmmmmmmmmmmmmmmmhh',
    '..............mmmmmmgggmmmmmmmmhh',
    '..............mmmmmmgkgmmmmmmmm..',
    '..............mMMMMMMMMMMMMMMMM..',
    '...............ooonwnwnwnwnwno...',
    '.vv.............ooonnnnnnnnnoo...',
    'vvvv.............oownwnwnwnwoo...',
    'vVvvv.............ooooooooooo....',
    '.vVvvvv..........ddoooooooood....',
    '..vVvvvvv.......ooooobboooobbooo.',
    '...vVvvvvvv....oooooobboooobbooo.',
    '....vVvvvvv...ooooMMMMMMMMMoooooo',
    '.....vVVVV....ooooMmmmrrmmmMooooo',
    '......oo......ooooMmmmrrmmmMooMMM',
    '.......oooooooooooMMMMMMMMMoMmmmmh',
    '........ooooooooooooooooooooMmmmmhh',
    '.........dddooooooooooooooooMMMMMh',
    '..........ddoooooooooooooooo.....',
    '...........oooooooooookkoooooo...',
    '...........ooooooooo..oooooo.....',
    '...........ooooooooo..oooooo.....',
    '..........hoooooooooh.hooooooh...',
  ],
  eyes: { at: [[20, 6]], w: 3, h: 2, lid: '#AEB7C2' },
}

// ── 워그레이몬 (궁극체): 뿔 달린 쇠 투구, 가슴의 용기 문장, 드라몬 킬러, 등의 브레이브 실드 ──
const WAR: Palette = {
  y: '#F2C14E',
  o: '#D9A030',
  m: '#C3CCD6',
  M: '#6E7A86',
  h: '#F3EEE0',
  g: '#1E9E5A',
  c: '#F26B21',
  k: '#1F1410',
}
const wargreymon: Stage = {
  name: '워그레이몬',
  pal: WAR,
  rows: [
    '............h....h..........',
    '...........hh....hh.........',
    '...........mmmmmmmmmm.......',
    '..........mmmmmmmmmmmm......',
    '..........mmmmmyyggyymm.....',
    '..........mmmmmyygkyyymmh...',
    '..........mmmmmyyyyyyymmm...',
    '...........mmmmkkkkkkmm.....',
    '............mmyyyyyyym......',
    '..mmmmm.......yyyyyyy.......',
    '.mmmmmmm....mmmmmmmmmmmm....',
    'mmmmccmmm..mmmMMyyyyMMmmmm..',
    'mmmcccmmm..mmMyyccyyyMmmmm..',
    'mmcccccmm..MMyyccccyyMMMMhhhh',
    'mmmcccmmm..MMyyccccyyMMMMhhhh',
    'mmmmccmmm..MMyyyccyyyMMMMhhhh',
    '.mmmmmmm...Myyyyyyyyyymmm...',
    '..mmmmm...hhyyyyyyyyyy......',
    '.........hhhMMyyyyyyMM......',
    '.........hh.MMyyyyyyMM......',
    '............yyyyykyyyy......',
    '............yyyyykyyyy......',
    '...........mmmmmkmmmmm......',
    '...........mmmmmkmmmmm......',
    '..........hmmmmmhmmmmmh.....',
  ],
  eyes: { at: [[17, 4]], w: 2, h: 2, lid: '#F2C14E' },
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
