import type { Chapter } from '../data';

export const ch02: Chapter = {
  // 2章（systems.md §6・§7）：ターン耐久8・捜索団員ロッタをゲストとして護衛。出撃5（ゲスト除く）、最初の敵11＋増援4。
  // マップは依頼により 20×14（§6 の表は 15×10）。敵の約半数は hold / guard。川の東は橋2本と浅瀬1か所で渡る。
  title: '第2章　捜索団の灯',
  // ドルガン（唯一のボス）を倒したら、その時点で勝利（「野郎ども、引くぞ！」の台詞に合わせた決定）。
  win: { type: 'survive', turns: 8, orBoss: true }, lose: { units: ['rudeus', 'paul'] },
  // 20×14。廃村を柵が囲み、門は北・南・西・東の4か所（北門は廃墟の脇の1マス、南の柵は一部崩れている）。西門そばの砦跡にロッタとパウロ。
  // 北の森と南の林から野盗、東の川（橋2本と浅瀬）を渡って私兵が来る。北東の砦に傭兵隊長。
  map: [
    'MMFFFGFGFFFGGGGWXXMM',
    'MFFHGGGFGFFYGGGWGGXM',
    'FFHHGFFGGGGGGGGWGRRC',
    'FGHGGFFGYGGGGGRBRRGG',
    'GGGGGGLLLGLLLLRWGGGG',
    'GGGYGGLDDUGGDLRWGGFF',
    'GGGGGGLGGGGDGLRWWGFF',
    'RRRRRRRCRRRRRRRRBRRR',
    'GGGGGGLDGGGGGLGGWGGG',
    'GGFGGGLDDGGUDLGGPGGG',
    'AAAGGGLLLGLGLLGGWGGG',
    'AAAGGFFGGGGFFGGWWGMM',
    'GAAGGFFFGGGFFGGWGGMM',
    'GGGGFFFGGGGGFGGWGMMM',
  ],
  players: [
    { id: 'rudeus', x: 1, y: 7 }, { id: 'paul', x: 8, y: 7 }, { id: 'lotta', x: 7, y: 7, guest: true },
  ],
  slots: [{ x: 2, y: 8 }, { x: 0, y: 8 }, { x: 1, y: 6 }, { x: 0, y: 6 }, { x: 1, y: 9 }],
  sortie: 5,
  enemies: [
    // 北の森から野盗
    { cls: 'fighter', lv: 3, x: 7, y: 1, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'fighter', lv: 2, x: 11, y: 1, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'soldier', lv: 2, x: 4, y: 2, wps: ['ironLance'], ai: 'charge' },
    { cls: 'archer', lv: 3, x: 8, y: 1, wps: ['ironBow'], ai: 'hold' },
    // 南の林から野盗
    { cls: 'fighter', lv: 2, x: 7, y: 12, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'soldier', lv: 3, x: 11, y: 12, wps: ['ironLance'], ai: 'hold' },
    // 川の東から貴族の私兵
    { cls: 'soldier', lv: 3, x: 18, y: 4, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
    { cls: 'cavalier', lv: 3, x: 18, y: 7, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
    { cls: 'myrmidon', lv: 4, x: 17, y: 9, wps: ['ironSword'], ai: 'hold', prefix: '私兵の' },
    { cls: 'archer', lv: 3, x: 18, y: 10, wps: ['ironBow'], ai: 'hold', prefix: '私兵の' },
    { cls: 'mercenary', lv: 7, x: 19, y: 2, wps: ['steelSword'], ai: 'guard', boss: '傭兵隊長ドルガン', defeat: 'retreat' },
  ],
  reinforce: [
    { turn: 3, units: [
      { cls: 'fighter', lv: 3, x: 6, y: 0, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'soldier', lv: 3, x: 11, y: 0, wps: ['ironLance'], ai: 'charge' },
    ] },
    { turn: 5, units: [
      { cls: 'cavalier', lv: 4, x: 19, y: 9, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
      { cls: 'soldier', lv: 4, x: 19, y: 7, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
    ] },
  ],
  intro: 'ch2.intro', outro: 'ch2.outro', interlude: 'ch2.interlude',
  bgm: { blue: 'crisis' }, // 耐久戦：自軍フェイズも追い詰められた曲
  talks: [
    { scene: 'ch2.battle1', when: { type: 'firstFight', unit: 'paul' } },
    { scene: 'ch2.battle2', when: { type: 'turn', turn: 2, phase: 'blue' } },
    { scene: 'ch2.battle3', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch2.battle4', when: { type: 'firstHeal', unit: 'lotta' } },
    { scene: 'ch2.battle5', when: { type: 'reinforce', wave: 1 } },
    { scene: 'ch2.battle6', when: { type: 'bossFight', boss: 'dolgan' } },
    { scene: 'ch2.battle7', when: { type: 'bossDefeat', boss: 'dolgan' } },
    { scene: 'ch2.battle8', when: { type: 'turn', turn: 7, phase: 'blue' } },
  ],
};
