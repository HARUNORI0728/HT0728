import type { Chapter, EnemyAI, EnemyDef, Tile } from '../data';

// 船着き場の桟橋の先（バラクが乗ると敗北）。6ターン目の敵軍フェイズから、バラクはここを目指す。
const DOCK: Tile = [19, 11];
const foe = (cls: string, wp: string, prefix = '密猟者の') => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef =>
  ({ cls, lv, x, y, wps: [wp], ai, prefix });
const lance = foe('soldier', 'ironLance'), axe = foe('fighter', 'ironAxe'), archer = foe('archer', 'ironBow');
const mage = foe('mage', 'fire'), healer = foe('healer', 'healStaff');
// 密猟団が手なずけた残滓の魔物（狼の絵。会話では「猟犬」）
const hound = foe('wolf', 'wolfFang', '密猟団の');

export const ch07: Chapter = {
  // 7章（plot.md §2・systems.md §6）：ボス撃破（バラク）。ルーデウスが倒れるか、バラクが東の船着き場に着くと敗北。
  // 出撃8（ルーデウス・リニア・プルセナ＋5）。最初の敵17＋増援6（4ターン目に南の森から猟犬3、7ターン目に北の獣道から密猟者3）＝23。
  title: '第7章　獣の牙',
  win: { type: 'boss' }, lose: { units: ['rudeus'], tile: DOCK, tileBy: 'barak' },
  // 22×15。川沿いの湿地と森にある密猟団の野営地。西の街道から本隊が入る。
  // 中央に柵で囲った野営地（門は西の正門・北の獣道の門・南東の船着き場への門、南に柵の破れ目）。中に天幕と、子どもを閉じこめた檻（家屋で代用）3つ。
  // 北西は岩山と丘の高台、北は深い森を獣道が抜ける。北東の丘に見張りの弓兵。
  // 東は葦の茂みと浅瀬の湿地で、その先を川が流れる。南東の門から湿地を回りこむ木道が船着き場の桟橋へ続く（バラクの逃げ道）。
  // 南西に沼（浅瀬と茂みで囲む）、南は森で、その中の空き地から猟犬が出る。
  map: [
    'FFFHHMMFFFFFFRFFFFFYWW',
    'FFHHHMXFYFFFRRFFFFYFWW',
    'FYGHHGGFFFYFRGFFHHFGWW',
    'FGGGHGYFYGGRRGGFHHGYPW',
    'GGYGUHGLLLLRLLLLGGYPWW',
    'GYGGHHGLNDGGGDNLGYPPWW',
    'RRGGGGGLYGNGNGULYGPWWW',
    'GRRRRRRRGGGGGGGLGYYPWW',
    'GGYGFFGLNGGNGNGLYPPPWW',
    'GYGFFYGLGDGNGNYLYYPWWW',
    'GFFGYGGLLULLLLRLGYPPWW',
    'FFGYPWWPYGYGYYRPPRBBWW',
    'FGYPWWWPYGFFYGRRRRWWWW',
    'FFGYPPWYGFFFFYGGFYWWWW',
    'FFFFYFFFGGGFFFFFFFYWWW',
  ],
  players: [{ id: 'rudeus', x: 1, y: 7 }, { id: 'linia', x: 2, y: 6 }, { id: 'pursena', x: 2, y: 8 }],
  slots: [{ x: 0, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 8 }, { x: 0, y: 6 }, { x: 0, y: 8 }],
  sortie: 8,
  enemies: [
    // 西の正門
    lance(10, 8, 7, 'hold'), axe(10, 8, 8, 'hold'), archer(10, 10, 6, 'hold'),
    // 北の門と獣道（森の猟犬と斧の見回りが先に来る）
    lance(10, 11, 5, 'hold'), hound(10, 8, 2, 'charge'), hound(10, 9, 3, 'charge'), axe(10, 6, 2, 'charge'),
    // 野営地の中（バラクの天幕のまわり）
    axe(11, 12, 7, 'hold'), lance(11, 13, 8, 'hold'), archer(11, 14, 6, 'hold'), mage(11, 10, 8, 'hold'), healer(10, 12, 9, 'hold'),
    // 北東の丘の見張り、南の沼、船着き場への木道
    archer(10, 17, 2, 'hold'), axe(11, 9, 11, 'hold'), hound(10, 12, 11, 'charge'), lance(11, 17, 12, 'hold'),
    { cls: 'mercenary', lv: 15, x: 11, y: 7, wps: ['steelSword'], ai: 'guard', boss: '密猟団の頭目バラク', defeat: 'captured',
      aiFrom: { turn: 6, ai: 'target', goal: DOCK } },
  ],
  reinforce: [
    { turn: 4, units: [hound(10, 8, 14, 'charge'), hound(10, 9, 14, 'charge'), hound(11, 10, 14, 'charge')] },
    { turn: 7, units: [lance(11, 13, 0, 'charge'), axe(11, 12, 1, 'charge'), archer(10, 13, 1, 'charge')] },
  ],
  intro: 'ch7.intro', outro: 'ch7.outro', interlude: 'ch7.interlude',
  talks: [
    { scene: 'ch7.battle1', when: { type: 'firstFight', unit: 'linia' } },
    { scene: 'ch7.battle2', when: { type: 'firstFight', unit: 'pursena' } },
    { scene: 'ch7.battle3', when: { type: 'turn', turn: 3, phase: 'blue' } },
    { scene: 'ch7.battle4', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch7.battle5', when: { type: 'bossFight', boss: 'barak' } },
    { scene: 'ch7.battle6', when: { type: 'turn', turn: 6, phase: 'red' }, needs: ['barak'] },
    { scene: 'ch7.battle7', when: { type: 'bossDefeat', boss: 'barak' } },
  ],
};
