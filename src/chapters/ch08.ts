import type { Chapter, EnemyAI, EnemyDef, Tile } from '../data';

// 迷宮の魔物（残滓の魔物。名前は「迷宮の岩人形」など）。結晶は prefix なしで「残滓の結晶」。
const mon = (cls: string, wp: string) => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef => ({ cls, lv, x, y, wps: [wp], ai, prefix: '迷宮の' });
const golem = mon('golem', 'golemFist'), wolf = mon('wolf', 'wolfFang');
const shade = (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef => ({ cls: 'shade', lv, x, y, wps: ['shadeBolt'], ai, prefix: '' });
const crystal = (x: number, y: number, tag: string): EnemyDef => ({ cls: 'crystal', lv: 12, x, y, wps: [], ai: 'guard', prefix: '', tag });

// 24×16。旧鉱山の跡にできた迷宮（K 石床・Q 岩壁。見た目は今は道と崖で代用）。南の中央が核の間（開始位置）、北の中央に地上への出口（3マス）。
// 近道（東）：核の間から細い坑道を北へ上がり、迷宮の主の広間（東）を抜けて、北の大広間へ出る。広間の出口の1マスの通路を迷宮の主が塞ぐ。
// 遠回り（西）：核の間から西の坑道を抜け、地下水の流れる西の縦穴を北へ登る（流れは橋か浅瀬で渡る）。西の上の坑道から北の大広間へ。
// 真ん中は地底湖と裂け目（崖）と岩の塊で通れない。大広間・縦穴・主の広間には古い坑道の残骸（廃墟）と崩れた土砂（丘）、坑道沿いの岩棚（山＝歩兵だけ登れる高所）。
// 出口のまわりだけ地上の森と茂み。
const MAP = [
  'MMMFFYQQQQFGKGFQQQYFFMMM',
  'MMQQQQQQHUYGKGYUHQQQQMMM',
  'MQKKKUKKKKKKKKKKKQQQQQMM',
  'QKKQQQQQQUGHKGUGKKKKUGQM',
  'QGKUQMMMQQQQKQQQQQKHGUGQ',
  'QPBWWWXMMXWWWXMMMQKGWGUQ',
  'QHKGQXMWWWWWWWMXMQKGWGGQ',
  'QUKYQMWWWWWWWWMMQQKHGKHQ',
  'QGKHQXMWWWWWWMXXQQKGUGYQ',
  'QYKGQMXXMMWWMMXQKKKGHGQQ',
  'QGKPQMMMMQMMQMMQKQQQQQQM',
  'QGKUQQMMQQMMMMQKKQQMMXXM',
  'QKKKKKUKGYUHGKYKQMMMXXMM',
  'QQQQMMQKKKKKKKKQMMMMXXMM',
  'MMMMMMQGUKHKGUGQMMMMMXMM',
  'MMMMQMMQMUGKGUMMMMMMMMMM',
];
// 崩落（plot.md §2 の 4・7・10 ターン目、南から順に3行ずつ）：通れる床（石床・廃墟・丘・浅瀬・橋）が岩壁になる。
const PASSABLE = new Set(['K', 'U', 'H', 'P', 'B', 'G', 'F', 'Y']);
const band = (y0: number, y1: number): Tile[] =>
  MAP.flatMap((row, y) => (y >= y0 && y <= y1 ? [...row].flatMap((c, x) => (PASSABLE.has(c) ? [[x, y] as Tile] : [])) : []));

export const ch08: Chapter = {
  // 8章（plot.md §2・systems.md §6）：離脱（生存者全員が北の出口から）。ルーデウスが倒れると敗北。迷宮の主は倒さなくてもよい。
  // 出撃9（ルーデウス・イゾルテ・シルフィエット＋6）。最初の敵19（岩人形5・狼6・影4・結晶3・迷宮の主）＋増援最大6（結晶が生きていれば3・6ターン目に各1）。
  title: '第8章　残滓の迷宮',
  win: { type: 'escape', tiles: [[11, 0], [12, 0], [13, 0]] }, lose: { units: ['rudeus'] },
  map: MAP,
  // 核の間。シルフィエットは殿として一番後ろ。
  players: [{ id: 'rudeus', x: 11, y: 13 }, { id: 'isolde', x: 12, y: 12 }, { id: 'sylphiette', x: 11, y: 14 }],
  slots: [{ x: 10, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 }, { x: 10, y: 12 }, { x: 13, y: 12 }, { x: 12, y: 14 }],
  sortie: 9,
  enemies: [
    // 結晶（増援の発生源）：西の縦穴・北の大広間の窪み・主の広間
    crystal(1, 10, 'c1'), crystal(12, 4, 'c2'), crystal(21, 7, 'c3'),
    // 西の縦穴と西の上の坑道
    wolf(11, 1, 12, 'charge'), wolf(11, 2, 9, 'charge'), wolf(11, 1, 8, 'hold'), shade(12, 3, 7, 'hold'),
    golem(12, 2, 6, 'hold'), golem(12, 2, 3, 'hold'), shade(12, 6, 2, 'hold'),
    // 北の大広間（出口の手前）
    golem(13, 12, 2, 'hold'), wolf(12, 9, 1, 'hold'), shade(13, 15, 1, 'hold'),
    // 近道：東の細い坑道と主の広間
    golem(12, 16, 10, 'hold'), golem(13, 19, 4, 'hold'), shade(13, 19, 6, 'hold'), wolf(12, 19, 8, 'charge'), wolf(12, 21, 9, 'hold'),
    { cls: 'golem', lv: 17, x: 17, y: 3, wps: ['golemFist'], ai: 'guard', boss: '迷宮の主',
      st: { hp: 52, str: 17, mag: 0, skl: 8, spd: 5, lck: 3, def: 14, res: 6 } },
  ],
  reinforce: [
    { turn: 3, from: 'c1', units: [shade(12, 1, 11, 'charge')] },
    { turn: 3, from: 'c2', units: [shade(12, 12, 3, 'hold')] },
    { turn: 3, from: 'c3', units: [shade(12, 21, 6, 'charge')] },
    { turn: 6, from: 'c1', units: [shade(12, 1, 11, 'charge')] },
    { turn: 6, from: 'c2', units: [shade(12, 12, 3, 'hold')] },
    { turn: 6, from: 'c3', units: [shade(12, 21, 6, 'charge')] },
  ],
  terrainChanges: [
    { turn: 4, tiles: band(13, 15), to: 'Q' },
    { turn: 7, tiles: band(10, 12), to: 'Q' },
    { turn: 10, tiles: band(7, 9), to: 'Q' },
  ],
  intro: 'ch8.intro', outro: 'ch8.outro', interlude: 'ch8.interlude',
  talks: [
    { scene: 'ch8.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch8.battle2', when: { type: 'firstFight', unit: 'isolde' } },
    { scene: 'ch8.battle3', when: { type: 'reinforce', wave: [0, 1, 2] } },
    { scene: 'ch8.battle4', when: { type: 'turn', turn: 4, phase: 'blue' } },
    { scene: 'ch8.battle5', when: { type: 'bossFight', boss: 'labyrinth' } },
    { scene: 'ch8.battle6', when: { type: 'bossDefeat', boss: 'labyrinth' } },
    { scene: 'ch8.battle7', when: { type: 'turn', turn: 8, phase: 'blue' } },
  ],
};
