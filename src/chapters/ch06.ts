import type { Chapter, EnemyAI, EnemyDef } from '../data';

// 食糧庫（敵が乗ると敗北）。目標へ向かう敵（target）はここを目指す。
const STORE: [number, number] = [8, 10];
const foe = (cls: string, wp: string, prefix: string) => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef =>
  ({ cls, lv, x, y, wps: [wp], ai, prefix, ...(ai === 'target' ? { goal: STORE } : {}) });
const merc = foe('mercenary', 'ironSword', '傭兵の'), smerc = foe('mercenary', 'steelSword', '傭兵の');
const lance = foe('soldier', 'ironLance', '私兵の'), archer = foe('archer', 'ironBow', '傭兵の');
const cav = foe('cavalier', 'ironLance', '私兵の'), mage = foe('mage', 'fire', '傭兵の'), healer = foe('healer', 'healStaff', '傭兵の');

export const ch06: Chapter = {
  // 6章（plot.md §2・systems.md §6）：防衛12ターン（敵の全滅でも勝利）。敵が食糧庫に乗るか、ルーデウスが倒れると敗北。
  // 出撃8（ルーデウス・ザノバ・クリフ＋5）。最初の敵17＋増援8（4ターン目東3、6ターン目西3、8ターン目オーベールと刺客）＝25。
  title: '第6章　神子と天才',
  win: { type: 'defend', turns: 12 }, lose: { units: ['rudeus'], tile: STORE },
  // 22×15。1章の難民キャンプの1年後。北にロアの崩れた城壁（崩れ目は3か所と街道の門跡）、東に北から南へ流れる川
  // （城壁沿いの道に橋、東の門からの道に浅瀬＝1章と同じ並び）。キャンプは魔道具の柵で囲まれ、門は北・西・東。
  // 門の脇に見張り台（砦）。西側に1章から続く天幕の列、東側に新しい家屋と畑、中央に食糧庫。柵の外の南と川向こうにも畑。
  // 北は丘と林（主攻。丘の上にヴェラ）、東は川向こうの畑から私兵、西の街道から増援。7ターン目に東の柵の一角が壊れる。
  map: [
    'FFHHFFYGRGHHHFFGWGFMMM',
    'FHHGFGGYRGHHHFFYWGGUMM',
    'FGGGYGFFRYGHGFYGWAAGMM',
    'GYGUGGFGRGYGGUFGWAAGGF',
    'ZZUZZZUZRZZUZZZGWGAAGF',
    'GYGGAAGYRRRRRRRRBRRRRR',
    'GGFLLLLLRCLLLLGYWGAAGG',
    'GFGLNGNGRGDGDLGGWWAAGH',
    'YGGCGNGNRGGAALGYGWGGHH',
    'RRRRRRRRRRRRRRRRRPRRRR',
    'GGYLNGNGDGDGDCGGGWGAAG',
    'FGGLGNGNGGGAALGYGWGAAG',
    'FFGLNGNGGDGAALGGYWGGFF',
    'FFGLLLLLLLLLLLGFGWGFFF',
    'FGAAAAGAAAAGAAGFFWFFFM',
  ],
  // 開幕の時点で、仲間は食糧庫のまわりと3つの門の近くに散っている。
  players: [{ id: 'rudeus', x: 8, y: 8 }, { id: 'zanoba', x: 11, y: 9 }, { id: 'cliff', x: 9, y: 10 }],
  slots: [{ x: 7, y: 7 }, { x: 5, y: 9 }, { x: 9, y: 8 }, { x: 4, y: 8 }, { x: 12, y: 10 }],
  sortie: 8,
  enemies: [
    // 北の丘と林（主攻）
    smerc(9, 7, 2, 'target'), merc(9, 9, 3, 'target'), lance(9, 4, 3, 'target'), lance(9, 12, 3, 'hold'),
    archer(9, 13, 0, 'hold'), archer(8, 5, 0, 'hold'), mage(9, 10, 0, 'hold'), healer(9, 12, 1, 'hold'),
    { cls: 'mercenary', lv: 12, x: 5, y: 2, wps: ['steelSword'], ai: 'hold', boss: '傭兵隊長ドルガン', defeat: 'retreat' },
    { cls: 'mercenary', lv: 14, x: 11, y: 1, wps: ['steelSword'], ai: 'hold', boss: '傭兵団長ヴェラ', aiFrom: { turn: 10, ai: 'charge' } },
    // 川向こう（東）
    cav(8, 19, 7, 'target'), cav(9, 20, 10, 'target'), lance(8, 19, 5, 'charge'), smerc(10, 18, 8, 'hold'), archer(8, 20, 8, 'hold'),
    // 西の街道
    lance(8, 0, 8, 'target'), merc(8, 1, 11, 'target'),
  ],
  reinforce: [
    { turn: 4, units: [cav(9, 21, 5, 'target'), lance(9, 21, 9, 'target'), archer(9, 21, 4, 'charge')] },
    { turn: 6, units: [merc(9, 0, 9, 'target'), lance(10, 0, 10, 'target'), foe('fighter', 'ironAxe', '傭兵の')(9, 0, 7, 'charge')] },
    { turn: 8, units: [
      { cls: 'myrmidon', lv: 13, x: 21, y: 5, wps: ['steelSword'], ai: 'charge', boss: 'オーベール', retreatAt: 0.5, defeat: 'retreat' },
      { cls: 'myrmidon', lv: 10, x: 21, y: 9, wps: ['steelSword'], ai: 'charge', prefix: '刺客の' },
    ] },
  ],
  terrainChanges: [{ turn: 7, tiles: [[13, 11], [13, 12]], to: 'U' }],
  intro: 'ch6.intro', outro: 'ch6.outro', interlude: 'ch6.interlude',
  bgm: { blue: 'crisis' },
  talks: [
    { scene: 'ch6.battle1', when: { type: 'firstFight', unit: 'zanoba' } },
    { scene: 'ch6.battle2', when: { type: 'firstFight', unit: 'cliff' } },
    { scene: 'ch6.battle3', when: { type: 'bossFight', boss: 'dolgan' } },
    { scene: 'ch6.battle4', when: { type: 'turn', turn: 7, phase: 'blue' } },
    { scene: 'ch6.battle5', when: { type: 'reinforce', wave: 2 } },
    { scene: 'ch6.battle6', when: { type: 'bossDefeat', boss: 'auber' } },
    { scene: 'ch6.battle7', when: { type: 'bossFight', boss: 'mercboss' } },
    { scene: 'ch6.battle8', when: { type: 'bossDefeat', boss: 'dolgan' } },
  ],
};
