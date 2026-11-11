// Static game data: weapons, classes, terrain, characters, chapters.

export interface Stats { hp: number; str: number; mag: number; skl: number; spd: number; lck: number; def: number; res: number }
export type WType = 'sword' | 'lance' | 'axe' | 'bow' | 'anima' | 'light' | 'dark';
export type MoveType = 'foot' | 'armor' | 'horse' | 'fly';
export type Team = 'blue' | 'red';

export interface Weapon { name: string; type: WType; mt: number; hit: number; crit: number; rng: [number, number] }
export interface ClassDef { name: string; mov: number; mtype: MoveType; sprite: string }
export interface Terrain { name: string; def: number; avo: number; heal?: boolean }

export const STAT_KEYS: (keyof Stats)[] = ['hp', 'str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'];
export const STAT_NAMES: Record<keyof Stats, string> = { hp: 'HP', str: '力', mag: '魔力', skl: '技', spd: '速さ', lck: '幸運', def: '守備', res: '魔防' };

export const WEAPONS: Record<string, Weapon> = {
  ironSword: { name: '鉄の剣', type: 'sword', mt: 5, hit: 90, crit: 0, rng: [1, 1] },
  rapier: { name: '細身の剣', type: 'sword', mt: 4, hit: 95, crit: 10, rng: [1, 1] },
  ironLance: { name: '鉄の槍', type: 'lance', mt: 6, hit: 80, crit: 0, rng: [1, 1] },
  javelin: { name: '手槍', type: 'lance', mt: 5, hit: 65, crit: 0, rng: [1, 2] },
  ironAxe: { name: '鉄の斧', type: 'axe', mt: 8, hit: 70, crit: 0, rng: [1, 1] },
  ironBow: { name: '鉄の弓', type: 'bow', mt: 6, hit: 85, crit: 0, rng: [2, 2] },
  steelSword: { name: '鋼の剣', type: 'sword', mt: 8, hit: 85, crit: 0, rng: [1, 1] },
  whiteSpear: { name: '白槍', type: 'lance', mt: 7, hit: 90, crit: 5, rng: [1, 1] },
  stoneCannon: { name: '岩砲弾', type: 'anima', mt: 6, hit: 85, crit: 5, rng: [1, 2] },
  waterBall: { name: '水弾', type: 'anima', mt: 3, hit: 95, crit: 0, rng: [1, 2] },
  wind: { name: 'ウィンド', type: 'anima', mt: 3, hit: 90, crit: 5, rng: [1, 2] },
  fire: { name: 'ファイアー', type: 'anima', mt: 5, hit: 85, crit: 0, rng: [1, 2] },
};
export const MAGIC: WType[] = ['anima', 'light', 'dark'];
/** key beats value */
export const TRIANGLE: Partial<Record<WType, WType>> = { sword: 'axe', axe: 'lance', lance: 'sword', anima: 'light', light: 'dark', dark: 'anima' };
export const WTYPE_NAMES: Record<WType, string> = { sword: '剣', lance: '槍', axe: '斧', bow: '弓', anima: '理', light: '光', dark: '闇' };

export const CLASSES: Record<string, ClassDef> = {
  spellblade: { name: '魔法剣士', mov: 5, mtype: 'foot', sprite: 'sword' },
  sorcerer: { name: '魔術師', mov: 5, mtype: 'foot', sprite: 'mage' },
  swordKing: { name: '剣王', mov: 6, mtype: 'foot', sprite: 'sword' },
  superd: { name: 'スペルドの戦士', mov: 6, mtype: 'foot', sprite: 'lancer' },
  myrmidon: { name: '剣士', mov: 5, mtype: 'foot', sprite: 'sword' },
  cavalier: { name: '槍騎士', mov: 7, mtype: 'horse', sprite: 'lancer' },
  mage: { name: '魔道士', mov: 5, mtype: 'foot', sprite: 'mage' },
  soldier: { name: '槍兵', mov: 5, mtype: 'foot', sprite: 'lancer' },
  fighter: { name: '戦士', mov: 5, mtype: 'foot', sprite: 'axe' },
  archer: { name: '弓兵', mov: 5, mtype: 'foot', sprite: 'archer' },
  knight: { name: '重騎士', mov: 4, mtype: 'armor', sprite: 'armor' },
};

export const TERRAIN: Record<string, Terrain> = {
  G: { name: '平地', def: 0, avo: 0 },
  R: { name: '道', def: 0, avo: 0 },
  B: { name: '橋', def: 0, avo: 0 },
  F: { name: '森', def: 1, avo: 20 },
  M: { name: '山', def: 2, avo: 30 },
  W: { name: '川', def: 0, avo: 0 },
  C: { name: '砦', def: 2, avo: 20, heal: true },
};

export function moveCost(t: string, m: MoveType): number {
  if (m === 'fly') return 1;
  if (t === 'W') return Infinity;
  if (t === 'M') return m === 'foot' ? 4 : Infinity;
  if (t === 'F') return m === 'horse' ? 3 : 2;
  return 1;
}

export interface CharDef { id: string; name: string; cls: string; lv: number; st: Stats; gr: Stats; wps: string[]; hair: string }

const S = (hp: number, str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number): Stats => ({ hp, str, mag, skl, spd, lck, def, res });

export const CHARS: Record<string, CharDef> = {
  rudeus: { id: 'rudeus', name: 'ルーデウス', cls: 'sorcerer', lv: 1, st: S(20, 2, 9, 7, 7, 5, 4, 6), gr: S(60, 15, 70, 55, 45, 40, 30, 50), wps: ['stoneCannon', 'waterBall'], hair: '#b08a5a' },
  eris: { id: 'eris', name: 'エリス', cls: 'myrmidon', lv: 1, st: S(21, 8, 0, 8, 10, 5, 5, 2), gr: S(75, 60, 5, 55, 65, 40, 35, 20), wps: ['ironSword'], hair: '#c22a2a' },
  ruijerd: { id: 'ruijerd', name: 'ルイジェルド', cls: 'superd', lv: 8, st: S(30, 11, 2, 12, 10, 4, 9, 6), gr: S(60, 35, 10, 40, 35, 20, 35, 30), wps: ['whiteSpear'], hair: '#2f9a63' },
  ghislaine: { id: 'ghislaine', name: 'ギレーヌ', cls: 'swordKing', lv: 10, st: S(32, 13, 0, 12, 12, 5, 8, 3), gr: S(65, 40, 0, 40, 40, 25, 30, 15), wps: ['steelSword'], hair: '#b9b4ac' },
};

export interface EnemyDef { cls: string; lv: number; x: number; y: number; wps: string[]; ai: 'charge' | 'hold' | 'guard'; boss?: string }
export interface Line { who: string; text: string }
export interface Chapter {
  title: string; goal: string; map: string[];
  players: { id: string; x: number; y: number }[];
  enemies: EnemyDef[];
  intro: Line[]; outro: Line[];
}

/** Base stats for generic enemies at level 1, plus per-level gains. */
export const ENEMY_BASE: Record<string, Stats> = {
  soldier: S(17, 4, 0, 3, 3, 1, 3, 0),
  fighter: S(19, 4, 0, 2, 3, 0, 2, 0),
  archer: S(16, 4, 0, 4, 3, 1, 2, 0),
  knight: S(22, 6, 0, 3, 1, 2, 8, 1),
};

export const CHAPTERS: Chapter[] = [
  {
    title: '第1章　帰郷',
    goal: '勝利条件：敵の全滅　／　敗北条件：ルーデウスまたはエリスの敗走',
    map: [
      'GGGFFGGGGMMMGGG',
      'GGFFGGRRRGMMGGC',
      'GGFGGGRGGGGMGGG',
      'WWGGGGRGGFGGGGG',
      'WWWBWWRWWWGGFGG',
      'GWWWWGRGWWWGFFG',
      'GGGGGGRGGGWWGGG',
      'GGFGGGRRRGGWWGG',
      'GFFGGGGGRGGGGGG',
      'GGGGGGGGRRRGGGG',
    ],
    players: [
      { id: 'rudeus', x: 4, y: 8 }, { id: 'ghislaine', x: 3, y: 9 },
      { id: 'eris', x: 6, y: 8 }, { id: 'ruijerd', x: 7, y: 9 },
    ],
    enemies: [
      { cls: 'soldier', lv: 1, x: 6, y: 5, wps: ['ironLance'], ai: 'charge' },
      { cls: 'fighter', lv: 1, x: 9, y: 6, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'archer', lv: 1, x: 7, y: 3, wps: ['ironBow'], ai: 'charge' },
      { cls: 'fighter', lv: 2, x: 3, y: 3, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'soldier', lv: 2, x: 5, y: 2, wps: ['ironLance'], ai: 'charge' },
      { cls: 'soldier', lv: 2, x: 11, y: 3, wps: ['ironLance'], ai: 'hold' },
      { cls: 'fighter', lv: 3, x: 12, y: 3, wps: ['ironAxe'], ai: 'hold' },
      { cls: 'archer', lv: 2, x: 12, y: 1, wps: ['ironBow'], ai: 'guard' },
      { cls: 'knight', lv: 5, x: 14, y: 1, wps: ['javelin'], ai: 'guard', boss: '野盗頭ガズ' },
    ],
    intro: [
      { who: '', text: '魔大陸から歩きつづけて、三年。' },
      { who: '', text: 'ようやく帰りついた故郷フィットア領は、見わたすかぎりの草原になっていた。' },
      { who: 'ルーデウス', text: '……何も、ない。ロアの城壁も、ブエナ村も。' },
      { who: 'エリス', text: 'ふん。だったら建て直せばいいじゃない！ ……建て直すのよ。絶対に。' },
      { who: 'ルイジェルド', text: '待て。難民キャンプのほうから煙が上がっている。……武器の音だ。' },
      { who: 'ギレーヌ', text: 'お嬢様！ ルーデウス！ 生きていたか。話は後だ、野盗どもが復興の物資を狙ってきている。' },
      { who: 'エリス', text: 'ギレーヌ！ ちょうどいいわ、三年分の修行の成果、見せてあげる！' },
      { who: 'ルーデウス', text: '（前の人生なら、布団をかぶって震えていただろうな）' },
      { who: 'ルーデウス', text: '（でも今は違う。帰る場所は、自分で守る）――いきます。援護は任せてください。' },
    ],
    outro: [
      { who: 'ギレーヌ', text: '見事だ。二人とも、強くなったな。' },
      { who: 'エリス', text: '当然でしょ！ ……ねえギレーヌ。お祖父様と、お父様たちは？' },
      { who: 'ギレーヌ', text: '…………。それも、後で話す。' },
      { who: 'ルイジェルド', text: 'ルーデウス。野盗にしては装備が揃いすぎていた。後ろに誰かいるぞ。' },
      { who: 'ルーデウス', text: 'ええ。この土地を欲しがっている誰かが。……父さまたち捜索団にも、知らせないと。' },
      { who: 'ルーデウス', text: '（家族を探す。故郷を取り戻す。やることは山ほどある）' },
      { who: 'ルーデウス', text: '（上等だ。今度の人生は、本気で生きると決めたんだから）' },
      { who: '', text: '第1章　クリア。　続きは制作中です。' },
    ],
  },
];
