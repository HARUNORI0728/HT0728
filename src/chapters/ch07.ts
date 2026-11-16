import type { Chapter, EnemyAI, EnemyDef, Tile } from '../data';

// 船着き場の桟橋の先（バラクが乗ると敗北）。7ターン目の敵軍フェイズから、バラクはここを目指す。
const DOCK: Tile = [19, 11];
const foe = (cls: string, wp: string, prefix = '密猟者の') => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef =>
  ({ cls, lv, x, y, wps: [wp], ai, prefix });
const lance = foe('soldier', 'ironLance'), axe = foe('fighter', 'ironAxe'), archer = foe('archer', 'ironBow');
const mage = foe('mage', 'fire'), healer = foe('healer', 'healStaff');
// 密猟団が手なずけた残滓の魔物（狼の絵。会話では「猟犬」）
const hound = foe('wolf', 'wolfFang', '密猟団の');

export const ch07: Chapter = {
  // 7章（plot.md §2・systems.md §6）：ボス撃破（バラク）。ルーデウスが倒れるか、バラクが東の船着き場に着くと敗北。
  // 出撃8（ルーデウス・リニア・プルセナ＋5）。最初の敵19＋増援6（4ターン目に南の森から猟犬3、6ターン目に北の獣道から密猟者3）＝25。
  title: '第7章　獣の牙',
  win: { type: 'boss' }, lose: { units: ['rudeus'], tile: DOCK, tileBy: 'barak' },
  // 22×15。川沿いの湿地と森にある密猟団の野営地。西の街道から本隊が入る。
  // 中央に柵で囲った野営地（門は西の正門と北の獣道の門。南に柵の破れ目＝バラクの逃げ口）。中に天幕と、子どもを閉じこめた檻（家屋で代用）3つ。
  // 野営地の真ん中に頭目の囲い（見張り台＝砦にバラク）。入口は東の1マスだけで、近接で殴れるのは一人ずつ（魔術・弓は柵越しに届く）。
  // 北西は岩山と丘の高台、北は深い森を獣道が抜ける。北東の丘に見張りの弓兵。
  // 東は葦の茂みと浅瀬の湿地で、その先を川が流れる。バラクは柵の破れ目から沼のほとりを東へ抜け、小沼を回りこむ木道（一部が水に浸かる）で船着き場の桟橋へ向かう（逃げ切りまで約4ターン）。
  // 南西に沼（浅瀬と茂みで囲む）、南は森で、その中の空き地から猟犬が出る。
  map: [
    'FFFHHMMFFFFFFRFFFFFYWW',
    'FFHHHMXFYFFFRRFFFFYFWW',
    'FYGHHGGFFFYFRGFFHHFGWW',
    'FGGGHGYFYGGRRGGFHHGYPW',
    'GGYGUHGLLLLRLLLLGGYPWW',
    'GYGGHHGLNDGGGDNLGYPPWW',
    'RRGGGGGLYGLLLGULYGPWWW',
    'GRRRRRRRGGLCGGGLGYYPWW',
    'GGYGFFGLNGLLLNGLYPPPWW',
    'GYGFFYGLGDGNGNYLYYPWWW',
    'GFFGYGGLLULLLLLLGYPPWW',
    'FFGYPWWPYRRRRRRPPRBBWW',
    'FGYPWWWPYGFFYGRRPRWWWW',
    'FFGYPPWYGFFFFYGGFYWWWW',
    'FFFFYFFFGGGFFFFFFFYWWW',
  ],
  players: [{ id: 'rudeus', x: 1, y: 7 }, { id: 'linia', x: 2, y: 6 }, { id: 'pursena', x: 2, y: 8 }],
  slots: [{ x: 0, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 8 }, { x: 0, y: 6 }, { x: 0, y: 8 }],
  sortie: 8,
  enemies: [
    // 西の正門
    lance(10, 8, 7, 'hold'), axe(10, 8, 8, 'hold'), archer(10, 9, 6, 'hold'),
    // 北の門と獣道（森の猟犬が先に来る）
    lance(10, 11, 5, 'guard'), hound(10, 8, 2, 'charge'), hound(10, 9, 3, 'charge'), axe(10, 6, 2, 'hold'),
    // 野営地の中（頭目の囲いの入口を斧が固める）
    axe(11, 13, 7, 'guard'), lance(11, 13, 8, 'guard'), archer(10, 14, 6, 'hold'), mage(10, 9, 8, 'hold'), healer(10, 12, 9, 'hold'),
    axe(11, 14, 9, 'hold'), lance(11, 10, 9, 'guard'),
    // 北東の丘の見張り、南の沼、船着き場への木道
    archer(10, 17, 2, 'hold'), axe(10, 9, 11, 'hold'), hound(11, 12, 11, 'charge'), lance(10, 17, 12, 'guard'),
    { cls: 'mercenary', lv: 15, x: 11, y: 7, wps: ['steelSword'], ai: 'guard',
      // 頭目は打たれ強いが鈍い（ルーデウスを一度の戦闘で倒しきらない程度に力と速さを抑える）
      st: { hp: 60, str: 13, mag: 0, skl: 12, spd: 9, lck: 5, def: 13, res: 9 }, boss: '密猟団の頭目バラク', defeat: 'captured',
      aiFrom: { turn: 7, ai: 'target', goal: DOCK } },
  ],
  reinforce: [
    { turn: 4, units: [hound(11, 8, 14, 'charge'), hound(11, 9, 14, 'charge'), hound(11, 10, 14, 'charge')] },
    { turn: 6, units: [lance(10, 13, 0, 'charge'), axe(10, 12, 1, 'charge'), archer(10, 13, 1, 'charge')] },
  ],
  // 檻3つ（M13の訪問マス。地形は家屋のまま、檻の絵を重ねる）。訪問すると子どもを助ける短い会話と、奪われた荷（銀・傷薬）。
  visits: [
    { x: 9, y: 5, kind: 'village', gold: 200, talk: 'ch7.battle8' },
    { x: 13, y: 5, kind: 'village', item: 'potion', gold: 100, talk: 'ch7.battle9' },
    { x: 9, y: 9, kind: 'village', gold: 250, talk: 'ch7.battle10' },
  ],
  // 副目標（Chapter.bonus。ふつうの通しプレイの手数を見て、少し頑張れば届く線）
  bonus: [{ type: 'visits', kind: 'village', gold: 200, label: '檻の子どもを全員助ける{n}' }, { type: 'turns', max: 6, gold: 200 }],
  intro: 'ch7.intro', outro: 'ch7.outro', interlude: 'ch7.interlude',
  talks: [
    { scene: 'ch7.battle1', when: { type: 'firstFight', unit: 'linia' } },
    { scene: 'ch7.battle2', when: { type: 'firstFight', unit: 'pursena' } },
    { scene: 'ch7.battle3', when: { type: 'turn', turn: 3, phase: 'blue' } },
    { scene: 'ch7.battle4', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch7.battle5', when: { type: 'bossFight', boss: 'barak' } },
    { scene: 'ch7.battle6', when: { type: 'turn', turn: 7, phase: 'red' }, needs: ['barak'] },
    { scene: 'ch7.battle7', when: { type: 'bossDefeat', boss: 'barak' } },
  ],
};
