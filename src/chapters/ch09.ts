import type { Chapter, EnemyAI, EnemyDef, Tile } from '../data';

const CAMP: Tile = [12, 13];
const MANOR: Tile = [12, 0];

const guard = (cls: string, wp: string) => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef =>
  ({ cls, lv, x, y, wps: [wp], ai, prefix: '私兵の', ...(ai === 'target' ? { goal: CAMP } : {}) });
const soldier = guard('soldier', 'ironLance'), sword = guard('mercenary', 'ironSword');
const bow = guard('archer', 'ironBow'), cavalry = guard('cavalier', 'ironLance');
const knight = guard('knight', 'ironLance'), mage = guard('mage', 'fire'), healer = guard('healer', 'healStaff');

export const ch09: Chapter = {
  title: '第9章　ロアの城壁',
  // 24×16。南の畑と丘で本陣を守り、北のロアへ攻め返す。東西の城壁には崩れ口と通用口が一つずつ。
  // 城内は中央の大通りと廃墟を抜ける脇道で分かれ、北の館は二つの見張り砦から射程に入る。
  map: [
    'FFYUUUGHGGGRCRGGUGUYYFFF',
    'FYUGDGURGGCRRRCGGDDUGYFF',
    'YUGDUGURRRRKRKRRRUUGDGYF',
    'UGGUURRRDGGRRRGGURRUGGUU',
    'GUUGGRUDGGGRRRGDGURUGUUG',
    'YRRRRRRRRRRRRRRRRRRRRRRY',
    'FRUGGDURUGGRRRGGURUGDURG',
    'ZZZUZZZRZZZZZZZZRZZZUZZZ',
    'FGUUGGURGGGRRRGGRUGUUGFY',
    'GGRGGGHRGGGRRRGGRHGGGRGG',
    'YGRRAAHHGGGRGRGGRHAGRRRY',
    'YAAARRAAGGGRGRGAARRRAAAY',
    'MAAAARRRRGRRRRRGRRRAAAYM',
    'MMYFAAGGNRRRCRRRNGGAFYMM',
    'MMFYGGGGNNGRGRGNNGGGFYMM',
    'MMFFYYGGRRRRRRRRRGYYFFMM',
  ],
  players: [{ id: 'rudeus', x: 11, y: 14 }, { id: 'eris', x: 10, y: 12 }, { id: 'ariel', x: 12, y: 15 }],
  slots: [{ x: 8, y: 12 }, { x: 14, y: 11 }, { x: 10, y: 13 }, { x: 15, y: 12 }, { x: 12, y: 13 }, { x: 13, y: 13 }],
  sortie: 9,
  win: { type: 'defend', turns: 6, strictTurns: true },
  lose: { units: ['rudeus', 'ariel'], tile: CAMP },
  enemies: [
    // 城外。騎馬は外周、重い歩兵隊は二つの通用口から本陣へ。
    cavalry(13, 2, 9, 'hold'), soldier(13, 5, 9, 'target'), sword(13, 8, 8, 'hold'),
    soldier(14, 7, 7, 'target'), bow(13, 4, 8, 'hold'), sword(13, 3, 8, 'hold'),
    soldier(13, 17, 10, 'target'), sword(13, 15, 8, 'hold'), cavalry(13, 21, 9, 'hold'),
    soldier(14, 16, 7, 'target'), bow(13, 19, 8, 'hold'), mage(13, 18, 8, 'hold'),
    // 城内。街路の守備隊と館の護衛。
    bow(13, 8, 4, 'hold'), bow(14, 16, 4, 'hold'), mage(14, 15, 3, 'hold'), healer(13, 12, 2, 'hold'),
    knight(14, 11, 0, 'guard'), knight(14, 13, 0, 'guard'),
    { cls: 'swordKing', lv: 18, x: 12, y: 4, wps: ['steelSword'], ai: 'guard', aiFrom: { turn: 7, ai: 'charge' },
      boss: 'ガル・ファリオン', retreatAt: 0.5, defeat: 'retreat',
      st: { hp: 54, str: 13, mag: 2, skl: 21, spd: 16, lck: 9, def: 12, res: 10 } },
    { cls: 'mage', lv: 14, x: MANOR[0], y: MANOR[1], wps: ['fire'], ai: 'guard', boss: 'ダリウス', defeat: 'captured',
      st: { hp: 34, str: 3, mag: 10, skl: 10, spd: 8, lck: 6, def: 9, res: 12 } },
  ],
  reinforce: [{ turn: 3, units: [
    knight(13, 3, 7, 'target'), cavalry(14, 3, 6, 'hold'),
    knight(13, 20, 7, 'target'), cavalry(14, 20, 6, 'hold'),
  ] }],
  stages: [{
    win: { type: 'seize', tiles: [MANOR] },
    lose: { units: ['rudeus', 'ariel'] },
    allies: [{ id: 'perugius', x: 12, y: 8 }],
    enemies: [
      soldier(14, 10, 5, 'hold'), sword(14, 14, 5, 'hold'),
      bow(14, 10, 1, 'hold'), mage(14, 14, 1, 'hold'),
    ],
    bgm: { blue: 'map_final' },
  }],
  terrainChanges: [{ stage: 1, tiles: [[11, 7], [12, 7], [13, 7]], to: 'R' }],
  intro: 'ch9.intro', outro: 'ch9.outro', interlude: 'ch9.interlude',
  bgm: { blue: 'crisis', red: 'map_enemy', boss: 'boss' },
  talks: [
    { scene: 'ch9.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch9.battle2', when: { type: 'firstFight', unit: 'eris' } },
    { scene: 'ch9.battle3', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch9.battle4', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch9.battle5', when: { type: 'bossFight', boss: 'gall' } },
    { scene: 'ch9.battle9', when: { type: 'bossFight', boss: 'gall', unit: 'eris' } },
    { scene: 'ch9.battle6', when: { type: 'bossDefeat', boss: 'gall' } },
    { scene: 'ch9.battle7', when: { type: 'bossFight', boss: 'darius' } },
    { scene: 'ch9.battle8', when: { type: 'bossDefeat', boss: 'darius' } },
  ],
};
