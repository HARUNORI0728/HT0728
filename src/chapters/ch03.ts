import type { Chapter } from '../data';

export const ch03: Chapter = {
  // 3章（plot.md §2・systems.md §6）：分断された二隊の合流戦。出撃6（強制3＋選択3）。
  // 2段構成。前半（1〜5T）：丘の見張り台に籠もるロキシーたちが持ちこたえるあいだに、本隊が川を渡って合流する（5ターン耐える）。
  // 後半（6T〜）：光の柱が強まり、窪地の岩人形が動き出す。窪地の主「残光の大熊」と魔物を一掃する（全滅。大熊は10Tから窪地を出てくる）。
  title: '第3章　師との再会',
  win: { type: 'survive', turns: 5 }, lose: { units: ['rudeus', 'roxy'] },
  // 20×14。西端の旧街道から本隊。中央を北から南へ小川（北と南に浅瀬、街道に橋）。
  // 川の東の丘に崩れた見張り台（廃墟と石壁）があり、ロキシーとエリナリーゼが籠もる（ロキシーは壁に守られ、口は西の1マス）。
  // 北東に白い窪地（北と東を山、西と南を茂みに囲まれた平地。中心に崩れた古い石＝廃墟）に残光の大熊、岩人形が口を固める（1体だけ hold、ほかは guard）。北と南は深い森（増援の出所）。
  // 西の森の空き地に木こり小屋（柵）と荒れた畑、川べりにロキシーたちが残した天幕。街道は丘の南を回って東へ抜ける。
  map: [
    'FFFFYFFFFWFFFFMMMMMM',
    'FFYGFFFFYWFFFMYGGYMM',
    'FYGGGFFFYPGFFMGUGUGM',
    'AAGGGYFGGWGFYYGGUGYM',
    'AALDLGGGWWGYGYYGGYMM',
    'FGGGGYFGWGGHHHHYGHHM',
    'FGYGGGGGWGGHUZZHGFHM',
    'RRRRRRRRBRRHUUZHGYHM',
    'GGGGYGNGWGRHHUHGFYHM',
    'GYGGHHFNWWRGHHGGYFGM',
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
    // 丘を囲む狼（2ターン目から突撃。開幕の1ターンは、ロキシーたちが身構える間がある）
    { cls: 'wolf', lv: 4, x: 17, y: 8, wps: ['wolfFang'], ai: 'guard', prefix: '', aiFrom: { turn: 2, ai: 'charge' } },
    { cls: 'wolf', lv: 4, x: 15, y: 9, wps: ['wolfFang'], ai: 'guard', prefix: '', aiFrom: { turn: 2, ai: 'charge' } },
    { cls: 'wolf', lv: 4, x: 11, y: 12, wps: ['wolfFang'], ai: 'guard', prefix: '', aiFrom: { turn: 3, ai: 'hold' } },
    { cls: 'wolf', lv: 4, x: 11, y: 4, wps: ['wolfFang'], ai: 'guard', prefix: '', aiFrom: { turn: 3, ai: 'hold' } },
    // 森をうろつく狼
    { cls: 'wolf', lv: 4, x: 10, y: 2, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 4, x: 11, y: 1, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 5, x: 12, y: 0, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 4, x: 6, y: 11, wps: ['wolfFang'], ai: 'hold', prefix: '' },
    { cls: 'wolf', lv: 5, x: 14, y: 12, wps: ['wolfFang'], ai: 'guard', prefix: '', aiFrom: { turn: 3, ai: 'hold' } },
    // 窪地の口を固める岩人形
    // （後半＝6Tから、光の柱が強まって口の岩人形が動き出す）
    { cls: 'golem', lv: 4, x: 13, y: 3, wps: ['golemFist'], ai: 'hold', prefix: '', aiFrom: { turn: 6, ai: 'charge' } },
    { cls: 'golem', lv: 5, x: 14, y: 2, wps: ['golemFist'], ai: 'guard', prefix: '' },
    { cls: 'golem', lv: 5, x: 15, y: 4, wps: ['golemFist'], ai: 'guard', prefix: '', aiFrom: { turn: 6, ai: 'hold' } },
    { cls: 'golem', lv: 4, x: 17, y: 4, wps: ['golemFist'], ai: 'guard', prefix: '', aiFrom: { turn: 7, ai: 'charge' } },
    { cls: 'golem', lv: 4, x: 18, y: 2, wps: ['golemFist'], ai: 'guard', prefix: '' },
    // 大熊：前半は窪地の中心で動かない。10Tから窪地を出て、届く相手に襲いかかる（戦闘中⑩）。
    { cls: 'bear', lv: 9, x: 16, y: 2, wps: ['bearClaw'], ai: 'guard', boss: '残光の大熊', aiFrom: { turn: 10, ai: 'hold' },
      st: { hp: 50, str: 13, mag: 0, skl: 9, spd: 8, lck: 2, def: 10, res: 7 } }, // 魔術で一気に溶けないよう、HPと魔防を少し厚く
  ],
  // 前半の増援：3T 北の森から（戦闘中④）、2T 南の森から丘の見張り台の裏へ回り込む2頭（戦闘中⑧）、5T 北東の森から。
  reinforce: [
    { turn: 3, units: [ // 北の森から
      { cls: 'wolf', lv: 4, x: 4, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 5, x: 6, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 4, x: 8, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    ] },
    { turn: 2, units: [ // 南の森から、丘の裏へ
      { cls: 'wolf', lv: 4, x: 13, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 4, x: 17, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    ] },
    { turn: 5, units: [ // 北東の森から（窪地の脇を抜けてくる）
      { cls: 'wolf', lv: 5, x: 10, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      { cls: 'wolf', lv: 4, x: 12, y: 1, wps: ['wolfFang'], ai: 'charge', prefix: '' },
    ] },
  ],
  stages: [{
    // 後半：窪地の主と、光に引き寄せられた魔物を一掃する（全滅）。ロキシーが倒れると敗北（lose は前半を引き継ぐ）。
    win: { type: 'rout' },
    enemies: [ // 光の柱から、窪地の口に新しい岩人形が這い出す
      { cls: 'golem', lv: 5, x: 16, y: 5, wps: ['golemFist'], ai: 'hold', prefix: '' },
    ],
    reinforce: [
      { turn: 7, units: [ // 南の森から
        { cls: 'wolf', lv: 4, x: 5, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
        { cls: 'wolf', lv: 5, x: 7, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
        { cls: 'wolf', lv: 4, x: 15, y: 13, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      ] },
      { turn: 9, units: [ // ふたたび北の森から
        { cls: 'wolf', lv: 5, x: 4, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
        { cls: 'wolf', lv: 5, x: 8, y: 0, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      ] },
      { turn: 11, units: [ // 東の街道から（光に引かれた群れの最後）
        { cls: 'wolf', lv: 5, x: 19, y: 10, wps: ['wolfFang'], ai: 'charge', prefix: '' },
        { cls: 'wolf', lv: 5, x: 19, y: 11, wps: ['wolfFang'], ai: 'charge', prefix: '' },
      ] },
    ],
  }],
  // 寄り道の宝箱（M13）：南西の森の奥。
  visits: [{ x: 0, y: 12, kind: 'chest', gold: 200 }],
  // 副目標（Chapter.bonus。ふつうの通しプレイの手数を見て、少し頑張れば届く線）
  bonus: [{ type: 'turns', max: 11, gold: 150 }, { type: 'visits', kind: 'chest', gold: 100 }],
  intro: 'ch3.intro', outro: 'ch3.outro', interlude: 'ch3.interlude',
  talks: [
    { scene: 'ch3.battle1', when: { type: 'turn', turn: 1, phase: 'blue' } },
    { scene: 'ch3.battle2', when: { type: 'firstFight', unit: 'roxy' } },
    { scene: 'ch3.battle3', when: { type: 'firstFight', unit: 'elinalise' } },
    { scene: 'ch3.battle4', when: { type: 'reinforce', wave: 0 } },
    { scene: 'ch3.battle8', when: { type: 'reinforce', wave: 1 } },
    { scene: 'ch3.battle9', when: { type: 'stageStart', stage: 1 } },
    { scene: 'ch3.battle10', when: { type: 'turn', turn: 10, phase: 'red' }, needs: ['residue_bear'] },
    { scene: 'ch3.battle5', when: { type: 'bossFight', boss: 'residue_bear' } },
    { scene: 'ch3.battle6', when: { type: 'bossDefeat', boss: 'residue_bear' } },
    { scene: 'ch3.battle7', when: { type: 'turn', turn: 4, phase: 'blue' }, needs: ['eris'] },
  ],
};
