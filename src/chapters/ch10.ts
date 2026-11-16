import type { Chapter, EnemyAI, EnemyDef, Reinforce, Tile } from '../data';

const monster = (cls: string, wp: string) => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef =>
  ({ cls, lv, x, y, wps: [wp], ai, prefix: '白い' });
const wolf = monster('wolf', 'wolfFang'), shade = monster('shade', 'shadeBolt'), golem = monster('golem', 'golemFist');
const wedges: { tag: string; tile: Tile; echo: Tile }[] = [
  { tag: 'west', tile: [11, 3], echo: [11, 4] },
  { tag: 'south', tile: [15, 3], echo: [15, 4] },
  { tag: 'east', tile: [19, 4], echo: [20, 4] },
  { tag: 'north', tile: [17, 1], echo: [18, 1] },
];
const wedgeWaves: Reinforce[] = wedges.flatMap(({ tag, echo: [x, y] }) => [
  { turn: 9, from: tag, units: [wolf(14, x, y, 'charge')] },
  { turn: 11, from: tag, units: [shade(15, x, y, 'charge')] },
]);

export const ch10: Chapter = {
  title: '第10章　本気で生きる',
  landmarks: [{ tile: [16, 1], label: '苗木' }],
  // 24×16。南西の街道から廃宿を経て、北東のブエナ村の丘へ。
  // 廃宿の砦と林で前半を凌ぐ。丘へは西の斜面、南の村跡、東へ回る街道の三方向から近づける。
  map: [
    'MMMFFFFYHHFFYHHHHHHFFYMM',
    'MMFFFFYGHHUGHHHHHHHHYFMM',
    'MFFFYFGGHHGUHHHHCHHHHFMM',
    'FFFFYFGGHGGGUHHHRHGGGYFM',
    'FFYGFFGGGGGGGHHGRHUUGDYF',
    'FYGGGGFGGGGGGYGURGUDUGYF',
    'YGGGGFFUGGGGRRRRRGDUGUYF',
    'FFGGGGUDCGGGRGGUFFFGYYYF',
    'FFFGGUGRRRRRRYAGYFFFGYFF',
    'FYFGRRRRGGRGGAAGYFGGYYFF',
    'YGGGRGGFGGRGGUYFGGYYFFFF',
    'YGGGRGGFGGRGUDGGGGYFGYFM',
    'RRRRRFFGGURGGUGGYYGGYFMM',
    'YCGGGYGGGGRUGGGGYFGGFFMM',
    'YFGGGGGYGDRUGGGGFFFFFYMM',
    'FFGGYGGYGGRGGGGFFYFYYMMM',
  ],
  players: [{ id: 'rudeus', x: 5, y: 12 }, { id: 'eris', x: 6, y: 11 }, { id: 'sylphiette', x: 4, y: 13 }],
  slots: [{ x: 4, y: 11 }, { x: 5, y: 10 }, { x: 7, y: 12 }, { x: 4, y: 14 }, { x: 6, y: 13 }, { x: 3, y: 12 }, { x: 3, y: 13 }],
  sortie: 10,
  enemies: [{
    cls: 'dragonGod', lv: 20, x: 9, y: 8, wps: ['dragonPalm'], ai: 'charge', boss: 'オルステッド', unkillable: true,
    st: { hp: 72, str: 9, mag: 18, skl: 24, spd: 12, lck: 10, def: 18, res: 15 },
  }],
  win: { type: 'survive', turns: 6, strictTurns: true },
  lose: { units: ['rudeus'] },
  reinforce: [
    { turn: 3, units: [
      wolf(14, 3, 4, 'charge'), shade(14, 5, 3, 'charge'),
      wolf(14, 8, 3, 'charge'), shade(14, 9, 2, 'charge'),
    ] },
    { turn: 5, units: [
      golem(15, 3, 3, 'charge'), shade(15, 6, 3, 'charge'),
      golem(15, 8, 2, 'charge'), shade(15, 10, 2, 'charge'),
    ] },
  ],
  stages: [{
    win: { type: 'boss' },
    lose: { units: ['rudeus', 'orsted'] },
    remove: ['orsted'],
    allies: [{ id: 'orsted', x: 9, y: 7, guest: true }],
    enemies: [
      wolf(14, 9, 5, 'hold'), shade(15, 11, 5, 'hold'),
      golem(14, 13, 4, 'hold'), wolf(15, 13, 6, 'hold'),
      golem(15, 17, 5, 'hold'), shade(15, 18, 3, 'hold'),
      wolf(14, 20, 3, 'hold'), shade(16, 15, 1, 'hold'),
      ...wedges.map(({ tag, tile: [x, y] }): EnemyDef => ({ cls: 'crystal', lv: 6, x, y, wps: [], ai: 'guard', prefix: '', tag })),
      { cls: 'mage', lv: 20, x: 16, y: 2, wps: ['shadeBolt'], ai: 'guard', boss: '使徒', skills: ['muei'],
        st: { hp: 51, str: 3, mag: 20, skl: 18, spd: 15, lck: 9, def: 14, res: 17 } },
    ],
    reinforce: wedgeWaves,
    bgm: { blue: 'map_final', boss: 'final_boss' },
  }],
  // 副目標（Chapter.bonus。ふつうの通しプレイの手数を見て、少し頑張れば届く線）
  bonus: [{ type: 'turns', max: 11, gold: 0 }, { type: 'noLoss', gold: 0 }],
  intro: 'ch10.intro', outro: 'ch10.outro',
  bgm: { blue: 'orsted', red: 'map_enemy', boss: 'orsted' },
  talks: [
    { scene: 'ch10.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch10.battle2', when: { type: 'bossFight', boss: 'orsted' } },
    { scene: 'ch10.battle9', when: { type: 'bossFight', boss: 'orsted', unit: 'rudeus' } },
    { scene: 'ch10.battle3', when: { type: 'firstFight', unit: 'eris' } },
    { scene: 'ch10.battle4', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch10.battle5', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch10.battle6', when: { type: 'turn', turn: 8, phase: 'blue' } },
    { scene: 'ch10.battle7', when: { type: 'bossFight', boss: 'apostle' } },
    { scene: 'ch10.battle8', when: { type: 'bossDefeat', boss: 'apostle' } },
  ],
  ending: true,
};
