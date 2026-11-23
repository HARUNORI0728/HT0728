import type { Chapter, EnemyAI, EnemyDef } from '../data';

// 魔物の名前は「森の狼」など。結晶は prefix なしで「残滓の結晶」。
const mon = (cls: string, wp: string) => (lv: number, x: number, y: number, ai: EnemyAI): EnemyDef => ({ cls, lv, x, y, wps: [wp], ai, prefix: '森の' });
const wolf = mon('wolf', 'wolfFang'), bird = mon('bird', 'birdTalon'), golem = mon('golem', 'golemFist');
const crystal = (x: number, y: number, tag: string): EnemyDef => ({ cls: 'crystal', lv: 5, x, y, wps: [], ai: 'guard', prefix: '', tag });

export const ch05: Chapter = {
  // 5章（plot.md §2・systems.md §6）：出撃7（ルーデウス・サラ＋5）。最初の敵17＋増援。
  // 2段構成。前半（1〜4T）：逃げてきた冒険者たちが手当てを受けている野営地の天幕(3,13)を守る（獣が血の匂いを追ってくる）。
  // 後半（5T〜）：全滅（結晶を含む）。結晶が生きていれば 3・6・8T に各結晶から1体。森の主は 10T から泉を離れる。
  title: '第5章　弓の冒険者',
  win: { type: 'defend', turns: 4 }, lose: { units: ['rudeus'], tile: [3, 13] },
  // 20×14。交易路を通す予定の森。南西の冒険者の野営地（天幕）から、草に埋もれた古い交易路が北東へ抜ける。
  // 北東の泉から小川が流れ出し、森を東から西へ横切る（橋は交易路の1本、浅瀬は西と東に1か所ずつ）。
  // 中央北に岩山（北と西は山、東は崖）の上の丘にサラ。登り口は南だけ。北西・東・南の森の空き地に結晶。泉のほとりの塚に森の主。
  // 西の小川の手前に古い宿駅の廃墟、交易路沿いに見張り塚（丘）。
  map: [
    'FFFFFYFFMMFFRFFYFFMM',
    'FFYGFFGFMMFGRGFWWWMM',
    'FGGGGFFMMMFGRFWWWWFM',
    'FGGGGYFXHHXYRFGWWHFM',
    'FFGGYFUYHHXFRFFGWHFF',
    'FFFYFUUGGGRRRFYFWFFH',
    'FYFFGGFGGRRGWWWPWGHH',
    'GFFYGGYWWBWWWYGGFFGG',
    'GGWWPWWWGRGYFFFGGGFF',
    'WWWGGHUGGRGFFYFGGGFF',
    'GYGFFHRRRRYGGGFYGFFM',
    'GGGYRRRFFYFGGGYFFFMM',
    'RRRRRGFHHFFYGUFFYFMM',
    'NGGNYFFFHFYFFFFYFFFM',
  ],
  players: [{ id: 'rudeus', x: 2, y: 12 }, { id: 'sara', x: 9, y: 3 }],
  slots: [{ x: 1, y: 12 }, { x: 3, y: 12 }, { x: 2, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 13 }],
  sortie: 7,
  enemies: [
    // 結晶（増援の発生源）
    crystal(3, 3, 'c1'), crystal(16, 9, 'c2'), crystal(12, 11, 'c3'),
    // 北西の空き地
    wolf(7, 2, 2, 'hold'), golem(8, 4, 4, 'guard'),
    // サラの岩山のまわり（7ターン目から動く。前半は本隊が野営地を守るあいだ、サラが岩山で持ちこたえられるように。
    // 後半に本隊が森へ入って、岩山へ近づくころに動き出す）
    { ...bird(7, 6, 1, 'guard'), aiFrom: { turn: 7, ai: 'charge' } }, { ...wolf(8, 7, 5, 'guard'), aiFrom: { turn: 7, ai: 'charge' } }, { ...bird(7, 3, 6, 'guard'), aiFrom: { turn: 7, ai: 'hold' } },
    // 森の中ほど・南の空き地
    wolf(7, 10, 10, 'charge'), wolf(8, 13, 8, 'charge'), wolf(7, 11, 11, 'hold'), golem(8, 13, 11, 'hold'),
    // 東の空き地と泉
    wolf(8, 15, 9, 'hold'), golem(8, 17, 9, 'guard'), { ...bird(8, 14, 4, 'guard'), aiFrom: { turn: 6, ai: 'hold' } }, bird(8, 18, 7, 'hold'),
    // 森の主（苔の大鹿。大熊の職で代用）
    // 森の主：前半は泉のほとりの塚から動かない。10Tから泉を離れ、届く相手に角を向ける（戦闘中⑪）。
    { cls: 'bear', lv: 12, x: 17, y: 4, wps: ['bearClaw'], ai: 'guard', boss: '森の主', aiFrom: { turn: 10, ai: 'hold' } },
  ],
  // 前半の増援：3T 結晶から各1体（戦闘中②）、2T 南の森から野営地へ血の匂いを追う狼（戦闘中⑨）、4T 西の川べりから怪鳥。
  // 天幕を狙う（target）獣は、天幕が塞がっているとその場で待つので、数ターン後に charge へ切り替える。
  reinforce: [
    // 結晶から湧いた獣も、血の匂いを追って野営地へ向かう（前半は岩山のサラへ飛んでいかないよう、鳥ではなく狼）
    { turn: 3, from: 'c1', units: [{ ...wolf(7, 2, 4, 'target'), goal: [3, 13], aiFrom: { turn: 6, ai: 'charge' } }] },
    { turn: 3, from: 'c2', units: [{ ...wolf(7, 16, 10, 'target'), goal: [3, 13], aiFrom: { turn: 6, ai: 'charge' } }] },
    { turn: 3, from: 'c3', units: [{ ...wolf(7, 12, 12, 'target'), goal: [3, 13], aiFrom: { turn: 6, ai: 'charge' } }] },
    { turn: 2, units: [
      { ...wolf(7, 10, 13, 'target'), goal: [3, 13], aiFrom: { turn: 5, ai: 'charge' } },
      wolf(7, 11, 13, 'charge'),
    ] },
    { turn: 4, units: [
      { ...bird(7, 0, 7, 'target'), goal: [3, 13], aiFrom: { turn: 6, ai: 'charge' } },
      bird(7, 0, 9, 'charge'),
    ] },
  ],
  stages: [{
    // 後半：森を掃討する（結晶を含む全滅）。lose は天幕を外す（負傷者は手当てを終えて森の外へ下がった）。
    win: { type: 'rout' }, lose: { units: ['rudeus'] },
    reinforce: [
      { turn: 6, from: 'c1', units: [wolf(8, 3, 2, 'charge')] },
      { turn: 6, from: 'c2', units: [wolf(8, 16, 8, 'charge')] },
      { turn: 6, from: 'c3', units: [bird(8, 11, 10, 'charge')] },
      { turn: 8, from: 'c1', units: [wolf(8, 2, 4, 'charge')] },
      { turn: 8, from: 'c2', units: [bird(8, 16, 10, 'charge')] },
      { turn: 8, from: 'c3', units: [wolf(8, 12, 12, 'charge')] },
    ],
  }],
  // 寄り道の宝箱（M13）：北西の森の隅。持てる者がいなければ銀に換わる。
  visits: [{ x: 0, y: 0, kind: 'chest', item: 'steelBow' }],
  // 副目標（Chapter.bonus。ふつうの通しプレイの手数を見て、少し頑張れば届く線）
  bonus: [{ type: 'turns', max: 13, gold: 200 }, { type: 'noLoss', gold: 150 }],
  intro: 'ch5.intro', outro: 'ch5.outro', interlude: 'ch5.interlude',
  talks: [
    { scene: 'ch5.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch5.battle8', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch5.battle9', when: { type: 'reinforce', wave: 3 } },
    // 3ターン目の結晶の増援のうち、最初に出たもの（早く砕いた結晶の分は出ない）
    { scene: 'ch5.battle2', when: { type: 'reinforce', wave: [0, 1, 2] } },
    { scene: 'ch5.battle3', when: { type: 'firstFight', unit: 'sara' } },
    { scene: 'ch5.battle4', when: { type: 'firstHeal', unit: 'sylphiette', target: 'sara' } },
    { scene: 'ch5.battle10', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch5.battle5', when: { type: 'turn', turn: 7, phase: 'blue' } },
    { scene: 'ch5.battle11', when:{ type: 'turn', turn: 10, phase: 'red' }, needs: ['forest_lord'] },
    { scene: 'ch5.battle6', when: { type: 'bossFight', boss: 'forest_lord' } },
    { scene: 'ch5.battle7', when: { type: 'bossDefeat', boss: 'forest_lord' } },
  ],
};
