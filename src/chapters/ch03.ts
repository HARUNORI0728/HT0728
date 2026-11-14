import type { Chapter } from '../data';

export const ch03: Chapter = {
  // 3章（plot.md §2・systems.md §6）：ボス撃破。分断された二隊の合流戦。出撃6（強制3＋選択3）、最初の敵15＋増援6。
  title: '第3章　師との再会',
  win: { type: 'boss' }, lose: { units: ['rudeus', 'roxy'] },
  // 20×14。西端の旧街道から本隊。中央を北から南へ小川（北と南に浅瀬、街道に橋）。
  // 川の東の丘に崩れた見張り台（廃墟と石壁）があり、ロキシーとエリナリーゼが籠もる（ロキシーは壁に守られ、口は西の1マス）。
  // 北東に白い窪地（北と東を山、西と南を茂みに囲まれた平地。中心は白く褪せた地面＝石床）に残光の大熊、岩人形が口を固める。北と南は深い森（増援の出所）。
  // 西の森の空き地に木こり小屋（柵）と荒れた畑。街道は丘の南を回って東へ抜ける。
  map: [
    'FFFFYFFFFWFFFFMMMMMM',
    'FFYGFFFFYWFFFMYGGYMM',
    'FYGGGFFFYPGFFMGUGUGM',
    'AAGGGYFGGWGFYYGGUGYM',
    'AALDLGGGWWGYGYYGGYMM',
    'FGGGGYFGWGGHHHHYGHHM',
    'FGYGGGGGWGGHUZZHGFHM',
    'RRRRRRRRBRRHUUZHGYHM',
    'GGGGYGGGWGRHHUHGFYHM',
    'GYGGHHFGWWRGHHGGYFGM',
    'FGGGFFFGGWRRRRRRRRRR',
    'FFGFFFFYGPGFFGYFFGYF',
    'FFFFYFFFFWWFFFFFYFFF',
    'FFFFFGFFFFWFFFFYFFFF',
  ],
  players: [
    { id: 'rudeus', x: 2, y: 7 }, { id: 'roxy', x: 13, y: 7 }, { id: 'elinalise', x: 13, y: 8 },
  ],
  slots: [{ x: 3, y: 6 }, { x: 3, y: 8 }, { x: 1, y: 6 }, { x: 1, y: 8 }],
  sortie: 6,
  enemies: [
    // 丘を囲む狼（突撃）
    { cls: 'wolf', lv: 4, x: 17, y: 8, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    { cls: 'wolf', lv: 4, x: 15, y: 9, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    { cls: 'wolf', lv: 4, x: 11, y: 10, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    { cls: 'wolf', lv: 4, x: 11, y: 4, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    // 森をうろつく狼
    { cls: 'wolf', lv: 4, x: 10, y: 2, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 4, x: 5, y: 1, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 5, x: 7, y: 1, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 4, x: 6, y: 11, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 5, x: 13, y: 11, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    // 窪地の口を固める岩人形
    { cls: 'golem', lv: 4, x: 13, y: 3, wps: ['golemFist'], ai: 'hold', prefix: '' },
    { cls: 'golem', lv: 5, x: 14, y: 2, wps: ['golemFist'], ai: 'guard', prefix: '' },
    { cls: 'golem', lv: 5, x: 15, y: 4, wps: ['golemFist'], ai: 'guard', prefix: '' },
    { cls: 'golem', lv: 4, x: 17, y: 4, wps: ['golemFist'], ai: 'guard', prefix: '' },
    { cls: 'golem', lv: 4, x: 18, y: 2, wps: ['golemFist'], ai: 'guard', prefix: '' },
    { cls: 'bear', lv: 9, x: 16, y: 2, wps: ['bearClaw'], ai: 'guard', boss: '残光の大熊' },
  ],
  reinforce: [
    { turn: 3, units: [ // 北の森から
      { cls: 'wolf', lv: 4, x: 4, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 5, x: 6, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 4, x: 8, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    ] },
    { turn: 5, units: [ // 南の森から
      { cls: 'wolf', lv: 4, x: 5, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 5, x: 7, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 4, x: 15, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    ] },
  ],
  intro: 'ch3.intro', outro: 'ch3.outro', interlude: 'ch3.interlude',
  talks: [
    { scene: 'ch3.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch3.battle2', when: { type: 'firstFight', unit: 'roxy' } },
    { scene: 'ch3.battle3', when: { type: 'firstFight', unit: 'elinalise' } },
    { scene: 'ch3.battle4', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch3.battle5', when: { type: 'bossFight', boss: 'residue_bear' } },
    { scene: 'ch3.battle6', when: { type: 'bossDefeat', boss: 'residue_bear' } },
    { scene: 'ch3.battle7', when: { type: 'turn', turn: 5, phase: 'blue' }, needs: ['eris'] },
  ],
};
