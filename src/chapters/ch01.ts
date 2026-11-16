import type { Chapter } from '../data';

export const ch01: Chapter = {
  title: '第1章　帰郷',
  // 2段構成。前半：難民キャンプの食料の天幕(2,7)を6ターン守る（北の森・川向こうから波状に野盗）。
  // 後半：北東の砦のガズを討つ（天幕は引き続き守る：北から食料狙いの残党が来るので、留守番を残すか早く討つか）。
  win: { type: 'defend', turns: 6 }, lose: { units: ['rudeus', 'eris'], tile: [2, 7] },
  // 16×11。北東の山脈に野盗の砦、中央を北から南へ川（橋と浅瀬）、西にロアの崩れた城壁と廃墟、南西に難民キャンプ、南東に畑の跡。
  map: [
    'FFFYGUGGGWMMMMMM',
    'FFGGHHGUGWMMMMMM',
    'FYGGHGGUGWGMMCMM',
    'GUGGGGGGGWGGGRGM',
    'ZZUZZUZRRBRRRRGG',
    'GYGGGGGRGWGHHGFF',
    'GNGNGGGRGWWGGYFF',
    'NGNGNGGRGGWGAAAF',
    'GNGGGGGRRRPRAAAG',
    'NGGGNGGGGGWRAAGG',
    'GGYGGGGGYGWRGGYG',
  ],
  players: [
    { id: 'rudeus', x: 4, y: 8 }, { id: 'ghislaine', x: 3, y: 9 },
    { id: 'eris', x: 6, y: 8 }, { id: 'ruijerd', x: 7, y: 9 },
  ],
  enemies: [
    // キャンプに押し入ろうとしている先遣（城壁の北と、川沿いの道）
    { cls: 'soldier', lv: 1, x: 6, y: 5, wps: ['ironLance'], ai: 'charge' },
    { cls: 'fighter', lv: 1, x: 8, y: 6, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'archer', lv: 1, x: 7, y: 3, wps: ['ironBow'], ai: 'hold' },
    { cls: 'fighter', lv: 2, x: 3, y: 3, wps: ['ironAxe'], ai: 'target', goal: [2, 7], aiFrom: { turn: 4, ai: 'charge' } }, // 食料の天幕へまっすぐ
    // 城壁の北の廃墟で様子をうかがう後詰め（2・3ターン目から動き出す）
    { cls: 'soldier', lv: 2, x: 5, y: 2, wps: ['ironLance'], ai: 'hold', aiFrom: { turn: 2, ai: 'charge' } },
    { cls: 'archer', lv: 1, x: 7, y: 1, wps: ['ironBow'], ai: 'guard', aiFrom: { turn: 3, ai: 'charge' } },
    { cls: 'fighter', lv: 2, x: 1, y: 3, wps: ['ironAxe'], ai: 'guard', aiFrom: { turn: 3, ai: 'target', goal: [2, 7] } },
    // 砦の守り（前半は動かない。後半の相手）
    { cls: 'soldier', lv: 2, x: 12, y: 5, wps: ['ironLance'], ai: 'guard' }, // 丘の見張り
    { cls: 'fighter', lv: 3, x: 12, y: 3, wps: ['ironAxe'], ai: 'guard' },
    { cls: 'archer', lv: 2, x: 14, y: 3, wps: ['ironBow'], ai: 'guard' },
    // ガズ：砦に籠もる。11ターン目からは砦を出て、届く相手に槍を投げてくる。
    // 能力は Lv5 の重騎士とほぼ同じで、魔防と速さだけ少し上げる（山の上からルーデウスの魔術2発で溶けないように）。
    { cls: 'knight', lv: 5, x: 13, y: 2, wps: ['javelin'], ai: 'guard', boss: '野盗頭ガズ', defeat: 'captured', aiFrom: { turn: 11, ai: 'hold' },
      st: { hp: 30, str: 9, mag: 0, skl: 6, spd: 5, lck: 3, def: 10, res: 6 } },
  ],
  // 前半の増援：2ターン目に川向こうの別働隊（畑を荒らして浅瀬を渡る）、3・5ターン目に北の森から（城壁の切れ目を抜けてくる）、
  // 4ターン目に砦の脇から橋を渡ってくる。target の敵は食料の天幕を狙う（天幕が味方で塞がっているとその場で待つので、
  // 数ターン後に charge へ切り替えて、立ち止まったままにならないようにする）。
  reinforce: [
    { turn: 2, units: [
      { cls: 'fighter', lv: 2, x: 15, y: 8, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'soldier', lv: 2, x: 15, y: 9, wps: ['ironLance'], ai: 'target', goal: [2, 7], aiFrom: { turn: 7, ai: 'charge' } },
      { cls: 'archer', lv: 1, x: 15, y: 10, wps: ['ironBow'], ai: 'charge' },
    ] },
    { turn: 3, units: [
      { cls: 'fighter', lv: 2, x: 4, y: 0, wps: ['ironAxe'], ai: 'target', goal: [2, 7], aiFrom: { turn: 6, ai: 'charge' } },
      { cls: 'soldier', lv: 2, x: 7, y: 0, wps: ['ironLance'], ai: 'charge' },
    ] },
    { turn: 4, units: [
      { cls: 'fighter', lv: 2, x: 15, y: 4, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'archer', lv: 1, x: 14, y: 4, wps: ['ironBow'], ai: 'charge' },
    ] },
    { turn: 5, units: [
      { cls: 'soldier', lv: 3, x: 6, y: 0, wps: ['ironLance'], ai: 'charge' },
      { cls: 'fighter', lv: 2, x: 4, y: 0, wps: ['ironAxe'], ai: 'target', goal: [2, 7], aiFrom: { turn: 8, ai: 'charge' } },
      { cls: 'archer', lv: 1, x: 8, y: 0, wps: ['ironBow'], ai: 'charge' },
    ] },
  ],
  stages: [{
    // 後半：砦へ攻め上がる。天幕を守る条件（lose）は前半を引き継ぐ。
    win: { type: 'boss' },
    enemies: [
      { cls: 'soldier', lv: 3, x: 10, y: 3, wps: ['ironLance'], ai: 'hold' }, // 橋のたもとの見張り
      { cls: 'knight', lv: 3, x: 13, y: 3, wps: ['ironLance'], ai: 'guard' }, // 砦の門番（砦へは山を越えるか、ここを抜く）
    ],
    reinforce: [
      { turn: 8, units: [ // 砦の脇から、橋を渡ってくる攻め手を迎え撃つ
        { cls: 'fighter', lv: 3, x: 15, y: 4, wps: ['ironAxe'], ai: 'charge' },
        { cls: 'soldier', lv: 3, x: 14, y: 4, wps: ['ironLance'], ai: 'charge' },
      ] },
      { turn: 9, units: [ // 手薄になったキャンプを北の森から狙う残党
        { cls: 'fighter', lv: 3, x: 4, y: 0, wps: ['ironAxe'], ai: 'target', goal: [2, 7], aiFrom: { turn: 12, ai: 'charge' } },
        { cls: 'soldier', lv: 2, x: 7, y: 0, wps: ['ironLance'], ai: 'charge' },
      ] },
    ],
  }],
  // 副目標（Chapter.bonus。ふつうの通しプレイの手数を見て、少し頑張れば届く線）
  bonus: [{ type: 'turns', max: 12, gold: 100 }, { type: 'noLoss', gold: 100 }],
  prologue: 'prologue', intro: 'ch1.intro', outro: 'ch1.outro', interlude: 'ch1.interlude',
  talks: [
    { scene: 'ch1.battle8', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch1.battle1', when: { type: 'firstFight', unit: 'eris' } },
    { scene: 'ch1.battle2', when: { type: 'firstFight', unit: 'ruijerd' } },
    { scene: 'ch1.battle3', when: { type: 'firstFight', unit: 'ghislaine' } },
    { scene: 'ch1.battle4', when: { type: 'turn', turn: 2, phase: 'blue' } },
    { scene: 'ch1.battle9', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch1.battle5', when: { type: 'turn', turn: 4, phase: 'blue' } },
    { scene: 'ch1.battle10', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch1.battle11', when: { type: 'reinforce', wave: 1, stage: 1 } },
    { scene: 'ch1.battle12', when: { type: 'turn', turn: 11, phase: 'red' }, needs: ['gaz'] },
    { scene: 'ch1.battle6', when: { type: 'bossFight', boss: 'gaz' } },
    { scene: 'ch1.battle7', when: { type: 'bossDefeat', boss: 'gaz' } },
  ],
};
