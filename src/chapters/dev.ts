// Test chapters for the new mechanics (never part of the story). Entered from window.__game.devChapter(90 | 91),
// which builds a party from CHARS. They borrow existing screenplay scenes for their conversations.
import type { Chapter } from '../data';

/**
 * 試験の章・甲（index 90）：防衛 → 制圧の2段構成。
 * 1段目：防衛2ターン（敵が南西の家屋に乗ると敗北）。目標へ向かう敵（target）、途中で突撃に変わる敵（aiFrom）、
 * HP半分で撤退するボス、川を越える飛行の敵、結晶（壊すと増援が止まる）。
 * 2段目：城壁の門が道に変わり（地形の変化）、ペルギウスとゲストのオルステッドが加わる。北の砦で制圧。
 */
export const DEV_A: Chapter = {
  title: '試験の章・甲',
  map: [
    'GGGGGWGGCG',
    'GGFGGWGGGG',
    'GGGGGWGGGG',
    'ZZZZZZZZZZ',
    'GGGGGGGGWG',
    'GGNGGGGHWG',
    'GGDGGGGGWG',
    'GGGGGGGGWG',
  ],
  players: [
    { id: 'rudeus', x: 3, y: 6 }, { id: 'eris', x: 2, y: 5 }, { id: 'roxy', x: 1, y: 6 }, { id: 'sylphiette', x: 3, y: 7 },
  ],
  enemies: [
    { cls: 'soldier', lv: 2, x: 7, y: 6, wps: ['ironLance'], ai: 'target', goal: [2, 6] },
    { cls: 'mercenary', lv: 6, x: 7, y: 4, wps: ['steelSword'], ai: 'guard', boss: 'オーベール', retreatAt: 0.5, aiFrom: { turn: 2, ai: 'charge' } },
    { cls: 'bird', lv: 2, x: 9, y: 4, wps: ['birdTalon'], ai: 'charge' },
    { cls: 'crystal', lv: 3, x: 9, y: 7, wps: [], ai: 'guard', tag: 'c1' },
  ],
  reinforce: [
    { turn: 2, from: 'c1', units: [{ cls: 'wolf', lv: 2, x: 9, y: 6, wps: ['wolfFang'], ai: 'charge' }] },
  ],
  win: { type: 'defend', turns: 2 }, lose: { units: ['rudeus'], tile: [2, 6] },
  stages: [
    {
      win: { type: 'seize', tiles: [[8, 0]] }, lose: { units: ['rudeus'] }, remove: 'all',
      allies: [{ id: 'perugius', x: 4, y: 4 }, { id: 'orsted', x: 6, y: 4, guest: true }],
      enemies: [
        { cls: 'soldier', lv: 1, x: 6, y: 1, wps: ['ironLance'], ai: 'hold' },
        { cls: 'knight', lv: 3, x: 7, y: 0, wps: ['ironLance'], ai: 'guard', boss: 'ダリウス', defeat: 'captured' },
      ],
      bgm: { blue: 'map_final' },
    },
  ],
  terrainChanges: [{ stage: 1, tiles: [[4, 3], [5, 3]], to: 'R' }],
  intro: 'ch9.intro', outro: 'ch9.outro',
  talks: [
    { scene: 'ch3.battle7', when: { type: 'turn', turn: 1, phase: 'blue' }, needs: ['paul'] }, // パウロがいないので飛ぶ
    { scene: 'ch4.battle5', when: { type: 'bossFight', boss: 'auber' } },
    { scene: 'ch4.battle6', when: { type: 'bossDefeat', boss: 'auber' } },
    { scene: 'ch9.battle4', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch9.battle9', when: { type: 'bossFight', boss: 'darius', unit: 'eris' } }, // 専用版
    { scene: 'ch9.battle8', when: { type: 'bossFight', boss: 'darius' } }, // 汎用版
  ],
};

/**
 * 試験の章・乙（index 91、最終章扱い）：耐久 → 離脱の2段構成。
 * 1段目：耐久2ターン。撃破不可のオルステッド（敵）。2段目：オルステッドが敵から下がり、ゲストとして加わる。
 * 生存者全員（ゲストを含む）が東端の道から離脱すれば勝利。クリア後にエピローグへ進む。
 */
export const DEV_B: Chapter = {
  title: '試験の章・乙',
  map: [
    'GGGGGGGGGR',
    'GFGGGGGGGR',
    'GGGGUGGGGR',
    'GGGGGGGGGR',
    'GGGHGGGGGR',
    'GGGGGGGGGR',
  ],
  players: [{ id: 'rudeus', x: 1, y: 2 }, { id: 'eris', x: 1, y: 3 }],
  enemies: [
    { cls: 'dragonGod', lv: 10, x: 5, y: 2, wps: ['dragonPalm'], ai: 'charge', boss: 'オルステッド', unkillable: true,
      st: { hp: 60, str: 9, mag: 5, skl: 20, spd: 12, lck: 10, def: 15, res: 12 } },
  ],
  win: { type: 'survive', turns: 2 },
  stages: [
    { win: { type: 'escape', tiles: [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5]] }, remove: ['orsted'], allies: [{ id: 'orsted', x: 5, y: 2, guest: true }],
      bgm: { blue: 'orsted' } },
  ],
  intro: 'ch10.intro', outro: 'ch10.outro',
  talks: [{ scene: 'ch10.battle5', when: { type: 'stageStart', stage: 1 } }],
  bgm: { blue: 'orsted', boss: 'final_boss' },
  ending: true,
};
