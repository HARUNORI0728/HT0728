import type { Chapter } from '../data';

export const ch01: Chapter = {
  title: '第1章　帰郷',
  win: { type: 'rout' }, lose: { units: ['rudeus', 'eris'] },
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
    { cls: 'soldier', lv: 1, x: 6, y: 5, wps: ['ironLance'], ai: 'charge' },
    { cls: 'fighter', lv: 1, x: 8, y: 6, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'archer', lv: 1, x: 7, y: 3, wps: ['ironBow'], ai: 'charge' },
    { cls: 'fighter', lv: 2, x: 3, y: 3, wps: ['ironAxe'], ai: 'charge' },
    { cls: 'soldier', lv: 2, x: 5, y: 2, wps: ['ironLance'], ai: 'charge' },
    { cls: 'soldier', lv: 2, x: 11, y: 3, wps: ['ironLance'], ai: 'hold' },
    { cls: 'fighter', lv: 3, x: 12, y: 3, wps: ['ironAxe'], ai: 'hold' },
    { cls: 'archer', lv: 2, x: 14, y: 3, wps: ['ironBow'], ai: 'guard' },
    { cls: 'knight', lv: 5, x: 13, y: 2, wps: ['javelin'], ai: 'guard', boss: '野盗頭ガズ', defeat: 'captured' },
  ],
  prologue: 'prologue', intro: 'ch1.intro', outro: 'ch1.outro', interlude: 'ch1.interlude',
  talks: [
    { scene: 'ch1.battle1', when: { type: 'firstFight', unit: 'eris' } },
    { scene: 'ch1.battle2', when: { type: 'firstFight', unit: 'ruijerd' } },
    { scene: 'ch1.battle3', when: { type: 'firstFight', unit: 'ghislaine' } },
    { scene: 'ch1.battle4', when: { type: 'turn', turn: 2, phase: 'blue' } },
    { scene: 'ch1.battle5', when: { type: 'turn', turn: 3, phase: 'blue' } },
    { scene: 'ch1.battle6', when: { type: 'bossFight', boss: 'gaz' } },
    { scene: 'ch1.battle7', when: { type: 'bossDefeat', boss: 'gaz' } },
  ],
};
