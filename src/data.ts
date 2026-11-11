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
  wind: { name: 'ウィンド', type: 'anima', mt: 3, hit: 90, crit: 5, rng: [1, 2] },
  fire: { name: 'ファイアー', type: 'anima', mt: 5, hit: 85, crit: 0, rng: [1, 2] },
};
export const MAGIC: WType[] = ['anima', 'light', 'dark'];
/** key beats value */
export const TRIANGLE: Partial<Record<WType, WType>> = { sword: 'axe', axe: 'lance', lance: 'sword', anima: 'light', light: 'dark', dark: 'anima' };
export const WTYPE_NAMES: Record<WType, string> = { sword: '剣', lance: '槍', axe: '斧', bow: '弓', anima: '理', light: '光', dark: '闇' };

export const CLASSES: Record<string, ClassDef> = {
  spellblade: { name: '魔法剣士', mov: 5, mtype: 'foot', sprite: 'sword' },
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
  ren: { id: 'ren', name: 'レン', cls: 'spellblade', lv: 1, st: S(22, 6, 6, 7, 8, 6, 6, 4), gr: S(70, 45, 50, 50, 50, 45, 35, 35), wps: ['ironSword', 'wind'], hair: '#2a3050' },
  serena: { id: 'serena', name: 'セレナ', cls: 'myrmidon', lv: 1, st: S(20, 6, 2, 9, 10, 7, 5, 3), gr: S(65, 45, 20, 60, 65, 55, 30, 30), wps: ['rapier'], hair: '#cfd6e6' },
  kai: { id: 'kai', name: 'カイ', cls: 'cavalier', lv: 3, st: S(24, 8, 0, 7, 7, 4, 8, 1), gr: S(80, 50, 5, 45, 40, 30, 50, 20), wps: ['ironLance', 'javelin'], hair: '#a8452f' },
  mira: { id: 'mira', name: 'ミラ', cls: 'mage', lv: 1, st: S(17, 1, 8, 6, 6, 5, 3, 6), gr: S(55, 10, 65, 50, 45, 45, 15, 50), wps: ['fire'], hair: '#e58a4f' },
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
    title: '第1章　星蝕の夜',
    goal: '勝利条件：敵の全滅　／　敗北条件：レンまたはセレナの敗走',
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
      { id: 'ren', x: 4, y: 8 }, { id: 'mira', x: 3, y: 9 },
      { id: 'serena', x: 6, y: 8 }, { id: 'kai', x: 7, y: 9 },
    ],
    enemies: [
      { cls: 'soldier', lv: 1, x: 6, y: 5, wps: ['ironLance'], ai: 'charge' },
      { cls: 'fighter', lv: 1, x: 9, y: 6, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'archer', lv: 1, x: 7, y: 3, wps: ['ironBow'], ai: 'charge' },
      { cls: 'fighter', lv: 2, x: 3, y: 3, wps: ['ironAxe'], ai: 'hold' },
      { cls: 'soldier', lv: 2, x: 11, y: 3, wps: ['ironLance'], ai: 'hold' },
      { cls: 'archer', lv: 2, x: 12, y: 1, wps: ['ironBow'], ai: 'guard' },
      { cls: 'knight', lv: 4, x: 14, y: 1, wps: ['javelin'], ai: 'guard', boss: '隊長ドルガ' },
    ],
    intro: [
      { who: '', text: '――前の人生の最後に覚えているのは、誰にも「ありがとう」を言えなかったことだ。' },
      { who: '', text: '三十四年、逃げてばかりいた。だから二度目の産声をあげたとき、決めた。今度こそ、本気で生きると。' },
      { who: '', text: 'それから十七年。ルミナス王国の辺境、ノルン村。蒼星が欠ける「星蝕」の夜――' },
      { who: 'ミラ', text: 'レン！ 北の街道に松明がいっぱい……あれ、帝国の旗だよ！' },
      { who: 'レン', text: '（先遣隊か。村の自警団じゃ、もたない……）ミラ、僕の後ろに。詠唱する時間は、僕が稼ぐ。' },
      { who: 'ミラ', text: 'またそうやって。無詠唱だからって、一人で格好つけないでよね！' },
      { who: 'セレナ', text: 'そこの二人、下がりなさい！ ここはルミナス王女セレナが引き受けます。カイ！' },
      { who: 'カイ', text: 'はっ。……姫、敵は七。砦に指揮官がいます。' },
      { who: 'レン', text: '王女殿下。この村の地形なら僕が一番詳しい。一緒に戦わせてください。' },
      { who: 'セレナ', text: '……いい目をしているわね。名前は？' },
      { who: 'レン', text: 'レン。ただの村人です。――今は、まだ。' },
    ],
    outro: [
      { who: 'セレナ', text: '退いていく……。助かったわ、レン、ミラ。あなたたちがいなければ村は焼かれていた。' },
      { who: 'ミラ', text: 'えへへ。でもレン、さっきの魔術、また詠唱してなかったでしょ。王女さまの前で！' },
      { who: 'カイ', text: '無詠唱……王国の魔術師長でも成し得ぬ業だ。貴様、何者だ。' },
      { who: 'レン', text: '（前世の理科の知識です、とは言えないよな……）ええと、独学で。' },
      { who: 'セレナ', text: 'カイ、詮索は後。……先遣隊がここまで来たなら、王都が危ない。レン、力を貸してくれる？' },
      { who: 'レン', text: '（逃げない。今度こそ）――はい。行きましょう、王都へ。' },
      { who: '', text: '第1章　クリア。　続きは開発中です。' },
    ],
  },
];
