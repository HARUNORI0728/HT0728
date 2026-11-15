import type { Chapter, EnemyDef } from '../data';

const P = '私兵の';
const sw = (lv: number, x: number, y: number, ai: EnemyDef['ai'], wp = 'ironSword'): EnemyDef => ({ cls: 'myrmidon', lv, x, y, wps: [wp], ai, prefix: P });

export const ch04: Chapter = {
  // 4章（plot.md §2・systems.md §6）：制圧。アリエル隊（礼拝堂）と本隊（西端）が分かれて始まる。出撃7（強制4＋選択3）、最初の敵17＋増援7（3・5・7ターン目）。
  title: '第4章　白い髪の護衛',
  win: { type: 'seize', tiles: [[10, 1]] }, lose: { units: ['rudeus', 'ariel'] },
  // 20×14。東西に旧街道が通る宿場町（家屋・廃墟・柵）。北は山あいの関所跡（城壁と崖で囲まれた砦。南の門と西の崩れた壁から入る）。
  // 東寄りに崩れた礼拝堂（石壁で囲んだ一角。西の扉と東の裏口。アリエルの立つ祭壇＝家屋は南からしか近づけない）にアリエル隊。北東は丘と林（弓兵の高所）、南は柵で区切った畑の跡。
  map: [
    'MMMMFMMZZZZZZMHHFFHF',
    'MFFMFFMZZUCNZMHGFHHG',
    'FFGFGYMZGGRGZMHHGGHG',
    'FGGGYGGZUZRZZGGHYGGG',
    'GGUGGGYGGGRGUGYGGFGG',
    'FGGLDLGDUGRGDLGGHHGF',
    'GGGGGUGGGGRGGUGYGHGG',
    'RRRRRRRRRRRRRRRRRRRR',
    'GGGGUGDGGUGGDGZZZZZG',
    'FGYLDLGGDGULDGZZDZZG',
    'FGGGGGYGGGGGGGUGGGUG',
    'AAAAGAAAGYAAGYZNGYZF',
    'AAAAGAAAGGAAYFZZZZZF',
    'AADAGAAAYFAAFFFFFYFF',
  ],
  players: [
    { id: 'rudeus', x: 1, y: 7 },
    { id: 'ariel', x: 16, y: 9 }, { id: 'sylphiette', x: 15, y: 10 }, { id: 'luke', x: 17, y: 10 },
  ],
  slots: [{ x: 1, y: 6 }, { x: 1, y: 8 }, { x: 2, y: 7 }, { x: 0, y: 6 }],
  sortie: 7,
  enemies: [
    // 関所跡（門の前の傭兵と中庭の弓兵・治癒術師が守る）
    { cls: 'knight', lv: 9, x: 10, y: 1, wps: ['javelin'], ai: 'guard', prefix: P },
    { cls: 'archer', lv: 6, x: 9, y: 2, wps: ['ironBow'], ai: 'guard', prefix: P },
    { cls: 'healer', lv: 6, x: 11, y: 2, wps: ['healStaff'], ai: 'hold', prefix: P },
    { cls: 'mercenary', lv: 7, x: 10, y: 4, wps: ['steelSword'], ai: 'guard', prefix: '刺客の' },
    // 関所の崩れた西の壁と、門の内側
    { cls: 'soldier', lv: 6, x: 8, y: 3, wps: ['ironLance'], ai: 'guard', prefix: P }, sw(6, 10, 2, 'guard'),
    { cls: 'mage', lv: 6, x: 12, y: 4, wps: ['fire'], ai: 'guard', prefix: P },
    // 宿場町の西側（本隊を迎え撃つ）
    sw(6, 8, 5, 'hold'),
    { cls: 'mercenary', lv: 6, x: 9, y: 8, wps: ['ironSword'], ai: 'guard', prefix: '刺客の' },
    { cls: 'mage', lv: 6, x: 6, y: 9, wps: ['fire'], ai: 'hold', prefix: P },
    // 礼拝堂へ向かう刺客
    sw(6, 11, 6, 'charge'), sw(6, 10, 10, 'charge'),
    // 町の辻を見張る刺客
    sw(6, 9, 4, 'guard'), sw(6, 5, 10, 'guard'),
    // 北東の丘の弓兵
    { cls: 'archer', lv: 6, x: 14, y: 2, wps: ['ironBow'], ai: 'hold', prefix: P },
    { cls: 'archer', lv: 6, x: 17, y: 5, wps: ['ironBow'], ai: 'guard', prefix: P },
    { cls: 'myrmidon', lv: 11, x: 13, y: 3, wps: ['ironSword'], ai: 'guard', boss: '北帝オーベール', retreatAt: 0.5, defeat: 'retreat',
      aiFrom: { turn: 2, ai: 'charge' } },
  ],
  reinforce: [
    { turn: 3, units: [ // 礼拝堂の裏（地下の抜け道の出口＝南東の林）から
      sw(6, 17, 13, 'charge'), sw(6, 19, 13, 'charge'),
      { cls: 'mercenary', lv: 5, x: 18, y: 13, wps: ['ironSword'], ai: 'charge', prefix: '刺客の' },
    ] },
    { turn: 5, units: [ // 北の丘から騎馬
      { cls: 'horseKnight', lv: 6, x: 15, y: 1, wps: ['ironLance'], ai: 'charge', prefix: P },
      { cls: 'horseKnight', lv: 6, x: 19, y: 2, wps: ['ironSword'], ai: 'charge', prefix: P },
    ] },
    { turn: 7, units: [ // 西の旧街道から、本隊の背後を突く騎馬
      { cls: 'horseKnight', lv: 6, x: 0, y: 7, wps: ['ironLance'], ai: 'charge', prefix: P },
      { cls: 'cavalier', lv: 6, x: 0, y: 6, wps: ['ironLance'], ai: 'charge', prefix: P },
    ] },
  ],
  intro: 'ch4.intro', outro: 'ch4.outro', interlude: 'ch4.interlude',
  talks: [
    { scene: 'ch4.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch4.battle2', when: { type: 'firstFight', unit: 'sylphiette' } },
    { scene: 'ch4.battle3', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch4.battle4', when: { type: 'turn', turn: 4, phase: 'blue' } },
    { scene: 'ch4.battle5', when: { type: 'bossFight', boss: 'auber' } },
    { scene: 'ch4.battle6', when: { type: 'bossDefeat', boss: 'auber' } },
    { scene: 'ch4.battle7', when: { type: 'firstFight', unit: 'ariel' } },
  ],
};
