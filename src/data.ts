// Static game data: weapons, classes, terrain, characters, chapters.

export interface Stats { hp: number; str: number; mag: number; skl: number; spd: number; lck: number; def: number; res: number }
export type WType = 'sword' | 'lance' | 'axe' | 'bow' | 'anima' | 'light' | 'dark';
export type MoveType = 'foot' | 'armor' | 'horse' | 'fly';
export type Team = 'blue' | 'red';

export interface Weapon { name: string; type: WType; mt: number; hit: number; crit: number; rng: [number, number] }
/**
 * tier 1 = base class, tier 2 = promoted. wtypes = weapon types the class may use.
 * bonus = stats added on promotion into this class; crit = class crit bonus; gift = weapon granted on promotion
 * when the unit owns nothing of a newly allowed type.
 */
export interface ClassDef {
  name: string; mov: number; mtype: MoveType; sprite: string;
  tier?: 1 | 2; wtypes: WType[]; bonus?: Partial<Stats>; crit?: number; gift?: string; desc?: string;
}
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
  lightning: { name: 'ライトニング', type: 'light', mt: 4, hit: 95, crit: 5, rng: [1, 2] },
};
export const MAGIC: WType[] = ['anima', 'light', 'dark'];
/** key beats value */
export const TRIANGLE: Partial<Record<WType, WType>> = { sword: 'axe', axe: 'lance', lance: 'sword', anima: 'light', light: 'dark', dark: 'anima' };
export const WTYPE_NAMES: Record<WType, string> = { sword: '剣', lance: '槍', axe: '斧', bow: '弓', anima: '理', light: '光', dark: '闇' };

const B = (hp: number, str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number): Partial<Stats> => ({ hp, str, mag, skl, spd, lck, def, res });

export const CLASSES: Record<string, ClassDef> = {
  // ---- base classes (tier 1) ----
  spellblade: { name: '魔法剣士', mov: 5, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword', 'anima'] },
  sorcerer: { name: '魔術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['anima'] },
  swordKing: { name: '剣王', mov: 6, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword'] },
  superd: { name: 'スペルドの戦士', mov: 6, mtype: 'foot', sprite: 'lancer', tier: 1, wtypes: ['lance'] },
  myrmidon: { name: '剣士', mov: 5, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword'] },
  cavalier: { name: '槍騎士', mov: 7, mtype: 'horse', sprite: 'lancer', tier: 1, wtypes: ['lance'] },
  mage: { name: '魔道士', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['anima'] },
  soldier: { name: '槍兵', mov: 5, mtype: 'foot', sprite: 'lancer', tier: 1, wtypes: ['lance'] },
  fighter: { name: '戦士', mov: 5, mtype: 'foot', sprite: 'axe', tier: 1, wtypes: ['axe'] },
  archer: { name: '弓兵', mov: 5, mtype: 'foot', sprite: 'archer', tier: 1, wtypes: ['bow'] },
  knight: { name: '重騎士', mov: 4, mtype: 'armor', sprite: 'armor', tier: 1, wtypes: ['lance'] },
  mercenary: { name: '傭兵', mov: 5, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword'] },
  waterMage: { name: '水王級魔術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['anima'] },
  shieldFencer: { name: '盾剣士', mov: 5, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword'] },
  healer: { name: '治癒術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['anima', 'light'] },
  horseKnight: { name: '騎士', mov: 7, mtype: 'horse', sprite: 'lancer', tier: 1, wtypes: ['sword', 'lance'] },
  strongman: { name: '重装', mov: 4, mtype: 'armor', sprite: 'armor', tier: 1, wtypes: ['axe'] },
  priest: { name: '神撃術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['light'] },
  thief: { name: '盗賊', mov: 6, mtype: 'foot', sprite: 'sword', tier: 1, wtypes: ['sword'] },
  // ---- promoted classes (tier 2) ----
  archmage: { name: '大魔術師', mov: 6, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima', 'light'], bonus: B(3, 0, 3, 1, 1, 0, 1, 3), gift: 'lightning', desc: '魔力と魔防が伸びる。光魔術も扱える。' },
  magicArmor: { name: '魔導鎧', mov: 5, mtype: 'armor', sprite: 'armor', tier: 2, wtypes: ['anima', 'axe'], bonus: B(6, 4, 1, 0, 0, 0, 5, 1), gift: 'ironAxe', desc: '魔力で動く鎧をまとう。重く硬い。斧も振るえる。' },
  swordSaint: { name: '剣聖', mov: 6, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(4, 2, 0, 3, 3, 0, 1, 1), crit: 10, desc: '速さと技を極める剣。必殺+10。' },
  gladiator: { name: '闘剣士', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['sword', 'axe'], bonus: B(6, 3, 0, 1, 1, 0, 2, 0), gift: 'ironAxe', desc: '力で押し切る前衛。斧も扱える。' },
  superdWarlord: { name: 'スペルドの戦鬼', mov: 7, mtype: 'foot', sprite: 'lancer', tier: 2, wtypes: ['lance', 'sword'], bonus: B(4, 2, 0, 2, 2, 0, 2, 2), gift: 'ironSword', desc: '戦場を駆ける歴戦の戦士。剣も使う。' },
  swordEmperor: { name: '剣帝', mov: 7, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(4, 2, 0, 2, 2, 0, 2, 1), crit: 10, desc: '剣王のさらに上。必殺+10。' },
  swordMaster: { name: '剣豪', mov: 6, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword', 'axe'], bonus: B(5, 2, 0, 2, 2, 0, 2, 1), gift: 'ironAxe', desc: '三流派をこなす万能の剣士。' },
  waterEmperor: { name: '水帝級魔術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima'], bonus: B(3, 0, 4, 2, 1, 0, 1, 3), desc: '水魔術を極める。魔力が大きく伸びる。' },
  sage: { name: '賢者', mov: 5, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima', 'light'], bonus: B(4, 0, 2, 1, 1, 0, 2, 4), gift: 'lightning', desc: '攻撃と治癒の両方に通じる。魔防が高い。' },
  guardian: { name: '守護剣士', mov: 6, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword', 'lance'], bonus: B(5, 2, 0, 1, 2, 0, 3, 2), gift: 'ironLance', desc: '仲間を守る盾役。槍も扱える。' },
  saintHealer: { name: '聖級治癒術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima', 'light'], bonus: B(4, 0, 2, 1, 1, 0, 1, 4), gift: 'lightning', desc: '治癒魔術の聖級。魔防が高い。' },
  paladin: { name: '聖騎士', mov: 8, mtype: 'horse', sprite: 'lancer', tier: 2, wtypes: ['sword', 'lance', 'axe'], bonus: B(5, 2, 0, 1, 1, 0, 2, 2), gift: 'ironAxe', desc: '騎馬の上級職。剣・槍・斧を使う。' },
  sniper: { name: '狙撃手', mov: 6, mtype: 'foot', sprite: 'archer', tier: 2, wtypes: ['bow'], bonus: B(4, 2, 0, 3, 1, 0, 2, 1), crit: 10, desc: '弓を極める。必殺+10。' },
  bowRider: { name: '弓騎兵', mov: 8, mtype: 'horse', sprite: 'archer', tier: 2, wtypes: ['bow', 'sword'], bonus: B(4, 1, 0, 2, 2, 0, 1, 1), gift: 'ironSword', desc: '馬上から弓を射る。剣も使う。' },
  colossus: { name: '剛力将', mov: 5, mtype: 'armor', sprite: 'armor', tier: 2, wtypes: ['axe', 'lance'], bonus: B(6, 3, 0, 1, 0, 0, 3, 2), gift: 'ironLance', desc: '怪力と装甲。槍も扱える。' },
  highPriest: { name: '大司祭', mov: 6, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['light', 'anima'], bonus: B(4, 0, 2, 1, 1, 0, 1, 4), gift: 'wind', desc: '神撃の上級職。理魔術も使う。' },
  assassin: { name: '暗殺者', mov: 7, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(3, 1, 0, 3, 2, 0, 1, 1), crit: 10, desc: '急所を突く。必殺+10。' },
  rogue: { name: '義賊', mov: 7, mtype: 'foot', sprite: 'archer', tier: 2, wtypes: ['sword', 'bow'], bonus: B(4, 1, 0, 2, 2, 2, 1, 1), gift: 'ironBow', desc: '身軽な万能職。弓も使う。' },
  halberdier: { name: '重槍兵', mov: 6, mtype: 'foot', sprite: 'lancer', tier: 2, wtypes: ['lance'], bonus: B(5, 2, 0, 1, 1, 0, 3, 1), desc: '槍兵の上級職。' },
  berserker: { name: '狂戦士', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['axe'], bonus: B(6, 3, 0, 1, 2, 0, 1, 0), crit: 15, desc: '必殺+15。' },
  warrior: { name: '戦士長', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['axe', 'bow'], bonus: B(6, 2, 0, 1, 1, 0, 2, 1), gift: 'ironBow', desc: '斧と弓を使う。' },
  general: { name: '将軍', mov: 5, mtype: 'armor', sprite: 'armor', tier: 2, wtypes: ['lance', 'sword', 'axe'], bonus: B(5, 2, 0, 1, 1, 0, 3, 3), gift: 'ironSword', desc: '重騎士の上級職。' },
};

/** Ladder shared by magic ranks and sword-school licences: 1 = 初級 … 7 = 神級. */
export const ART_LEVELS = ['', '初級', '中級', '上級', '聖級', '王級', '帝級', '神級'];
export type ArtId = 'water' | 'earth' | 'fire' | 'wind' | 'heal' | 'god' | 'swordGod' | 'waterGod' | 'northGod';
export const ART_NAMES: Record<ArtId, string> = { water: '水魔術', earth: '土魔術', fire: '火魔術', wind: '風魔術', heal: '治癒魔術', god: '神撃', swordGod: '剣神流', waterGod: '水神流', northGod: '北神流' };
/** A class-change condition. Only 'lv' is used by the data today; 'art' is checked against Unit.arts when present. */
export type PromoReq = { kind: 'lv'; min: number } | { kind: 'art'; art: ArtId; min: number };
export interface Promo { to: string; req: PromoReq[] }
const LV10: PromoReq[] = [{ kind: 'lv', min: 10 }];
const P = (...to: string[]): Promo[] => to.map(t => ({ to: t, req: LV10 }));
/** Base class id → promotion choices. */
export const PROMOS: Record<string, Promo[]> = {
  sorcerer: P('archmage', 'magicArmor'),
  myrmidon: P('swordSaint', 'gladiator'),
  superd: P('superdWarlord'),
  swordKing: P('swordEmperor'),
  mercenary: P('swordMaster'),
  waterMage: P('waterEmperor', 'sage'),
  shieldFencer: P('guardian'),
  healer: P('saintHealer', 'sage'),
  horseKnight: P('paladin'),
  archer: P('sniper', 'bowRider'),
  strongman: P('colossus'),
  priest: P('highPriest'),
  thief: P('assassin', 'rogue'),
  soldier: P('halberdier'),
  fighter: P('berserker', 'warrior'),
  knight: P('general'),
  cavalier: P('paladin'),
  mage: P('archmage'),
  spellblade: P('swordSaint', 'archmage'),
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

// ---------- cast & supports ----------

/** Everyone in world.md ch.3 with their starting class (CHARS holds stats only for those already playable). */
export const CAST: Record<string, { name: string; cls: string }> = {
  rudeus: { name: 'ルーデウス', cls: 'sorcerer' },
  eris: { name: 'エリス', cls: 'myrmidon' },
  ruijerd: { name: 'ルイジェルド', cls: 'superd' },
  ghislaine: { name: 'ギレーヌ', cls: 'swordKing' },
  paul: { name: 'パウロ', cls: 'mercenary' },
  roxy: { name: 'ロキシー', cls: 'waterMage' },
  elinalise: { name: 'エリナリーゼ', cls: 'shieldFencer' },
  sylphiette: { name: 'シルフィエット', cls: 'healer' },
  luke: { name: 'ルーク', cls: 'horseKnight' },
  sara: { name: 'サラ', cls: 'archer' },
  zanoba: { name: 'ザノバ', cls: 'strongman' },
  cliff: { name: 'クリフ', cls: 'priest' },
  linia: { name: 'リニア', cls: 'thief' },
};

export type SupportRank = 'C' | 'B' | 'A' | 'S';
export const RANKS: SupportRank[] = ['C', 'B', 'A', 'S'];
/** Cumulative bond points needed for each rank. */
export const RANK_PTS: Record<SupportRank, number> = { C: 30, B: 80, A: 150, S: 240 };
/** Points a pair earns when one of them fights while the other stands adjacent. */
export const SUPPORT_GAIN = 10;
/** Partners within this Manhattan distance grant their combat bonus. */
export const SUPPORT_RANGE = 2;
export interface SupportBonus { hit: number; avo: number; crit: number; dmg: number }
export const SUPPORT_BONUS: Record<SupportRank, SupportBonus> = {
  C: { hit: 5, avo: 5, crit: 2, dmg: 0 },
  B: { hit: 10, avo: 10, crit: 4, dmg: 0 },
  A: { hit: 15, avo: 15, crit: 6, dmg: 0 },
  S: { hit: 20, avo: 20, crit: 8, dmg: 1 },
};
export const SUPPORT_CAP: SupportBonus = { hit: 30, avo: 30, crit: 15, dmg: 1 };
/** How many S (romance) partners a character may have. Default 1. */
export const S_LIMIT: Record<string, number> = { rudeus: 3 };
export const S_LIMIT_DEFAULT = 1;

export interface SupportPair { a: string; b: string; max: 'A' | 'S'; tag?: string; start?: number; talks: Partial<Record<SupportRank, Line[]>> }

const pair = (a: string, b: string, max: 'A' | 'S', tag = '', talks: Partial<Record<SupportRank, Line[]>> = {}, start = 0): SupportPair => ({ a, b, max, tag, start, talks });

// Conversations are original to this game (not taken from the novels).
const TALK_RUDEUS_ERIS_C: Line[] = [
  { who: '', text: '夜。難民キャンプの外れで、エリスがひとり剣を振っている。' },
  { who: 'ルーデウス', text: 'まだ起きてたんですか。今日はもう十分戦ったでしょう。' },
  { who: 'エリス', text: '十分じゃないわ。あの斧の男、一撃で倒せなかった。' },
  { who: 'ルーデウス', text: '倒せてましたよ。二撃で。' },
  { who: 'エリス', text: 'それじゃだめなの！ 一撃で倒せてたら、あんたが前に出なくてすんだのよ。' },
  { who: 'ルーデウス', text: '……ああ。俺をかばおうとして、無理してたんですね。' },
  { who: 'エリス', text: 'ち、違うわよ！ 魔術師は後ろにいるものなの。そういう決まりなの！' },
  { who: 'ルーデウス', text: 'じゃあ明日は、決まりどおり後ろから援護します。エリスが一撃で決められるように。' },
  { who: 'エリス', text: '……ふん。外したら承知しないんだから。' },
];
const TALK_RUDEUS_RUIJERD_C: Line[] = [
  { who: 'ルイジェルド', text: 'ルーデウス。キャンプの子どもたちに水を配っていたな。' },
  { who: 'ルーデウス', text: '魔術で出せば井戸を掘るまでのつなぎになりますから。見てたんですか。' },
  { who: 'ルイジェルド', text: '子どもが列に割り込んでも、お前は叱らなかった。' },
  { who: 'ルーデウス', text: '喉が渇いてる子を叱っても、水は増えませんからね。' },
  { who: 'ルイジェルド', text: 'そうだ。だが、後ろに並んでいた小さい子が泣いていた。' },
  { who: 'ルーデウス', text: '……気づきませんでした。明日は列の後ろから配ります。' },
  { who: 'ルイジェルド', text: 'それでいい。戦士は強い者より、先に弱い者を見るものだ。' },
  { who: 'ルーデウス', text: '旅の間にさんざん教わったのに、まだまだですね、俺。' },
  { who: 'ルイジェルド', text: '気づけば直せる。お前はいつもそうしてきた。' },
];
const TALK_RUDEUS_GHISLAINE_C: Line[] = [
  { who: 'ギレーヌ', text: 'ルーデウス。字を教えてくれ。……いや、思い出させてくれ、か。' },
  { who: 'ルーデウス', text: '昔、一緒に練習しましたよね。読めなくなったんですか？' },
  { who: 'ギレーヌ', text: '三年、剣しか握っていなかった。物資の帳簿が読めんのだ。' },
  { who: 'ルーデウス', text: 'なるほど。じゃあ今夜から、帳簿を教科書にしましょう。' },
  { who: 'ギレーヌ', text: '助かる。数字はまだ覚えている。……たぶんな。' },
  { who: 'ルーデウス', text: '「小麦　十二袋」。はい、読んでみてください。' },
  { who: 'ギレーヌ', text: 'こむぎ……じゅうに、ふくろ。……ふん。剣より手強いな。' },
  { who: 'ルーデウス', text: '剣王が言うと説得力がありますね。でも、ちゃんと読めてますよ。' },
];
const TALK_ERIS_GHISLAINE_C: Line[] = [
  { who: 'エリス', text: 'ギレーヌ、稽古をつけて！ 今すぐ！' },
  { who: 'ギレーヌ', text: '今日はもう二度相手をしたぞ、お嬢様。' },
  { who: 'エリス', text: '二度とも負けたから三度目なの！ それと、お嬢様はやめて。' },
  { who: 'ギレーヌ', text: '……では、エリス。踏み込みが半歩早い。焦っているな。' },
  { who: 'エリス', text: '焦ってないわ。早く強くならなきゃいけないだけよ。' },
  { who: 'ギレーヌ', text: 'それを焦りと言う。サウロス様も、よくそう言われていた。' },
  { who: 'エリス', text: '……お祖父様が？' },
  { who: 'ギレーヌ', text: 'ああ。座れ。稽古の前に、少し昔の話をしてやろう。' },
];
const TALK_ERIS_RUIJERD_C: Line[] = [
  { who: 'エリス', text: 'ルイジェルド！ その槍、ちょっと貸しなさいよ。' },
  { who: 'ルイジェルド', text: '断る。お前には長すぎる。' },
  { who: 'エリス', text: '使いたいんじゃないわ。どうしてあんなに速く突けるのか知りたいの。' },
  { who: 'ルイジェルド', text: '速く突こうとは思っていない。無駄を削っているだけだ。' },
  { who: 'エリス', text: '無駄……。あたしの剣、そんなに無駄が多い？' },
  { who: 'ルイジェルド', text: '多い。だが、旅を始めたころの半分になった。' },
  { who: 'エリス', text: '半分！？ ……ふ、ふん。じゃあ、あと半分削ればいいのね。' },
  { who: 'ルイジェルド', text: 'そうだ。焦らずにな。' },
];

/** world.md ch.4 — every pair. Order = order support talks play after a chapter. */
export const SUPPORTS: SupportPair[] = [
  pair('rudeus', 'eris', 'S', '', { C: TALK_RUDEUS_ERIS_C }, 10),
  pair('rudeus', 'ruijerd', 'A', '', { C: TALK_RUDEUS_RUIJERD_C }),
  pair('rudeus', 'ghislaine', 'A', '', { C: TALK_RUDEUS_GHISLAINE_C }),
  pair('eris', 'ghislaine', 'A', '師弟', { C: TALK_ERIS_GHISLAINE_C }, 10),
  pair('eris', 'ruijerd', 'A', '', { C: TALK_ERIS_RUIJERD_C }),
  pair('rudeus', 'sylphiette', 'S'),
  pair('rudeus', 'roxy', 'S'),
  pair('rudeus', 'sara', 'S', 'IF'),
  pair('rudeus', 'paul', 'A', '親子'),
  pair('rudeus', 'zanoba', 'A', '師弟'),
  pair('rudeus', 'cliff', 'A'),
  pair('rudeus', 'luke', 'A'),
  pair('rudeus', 'linia', 'A'),
  pair('eris', 'roxy', 'A'),
  pair('eris', 'sylphiette', 'A'),
  pair('roxy', 'sylphiette', 'A'),
  pair('roxy', 'elinalise', 'A'),
  pair('roxy', 'paul', 'A', '元仲間'),
  pair('cliff', 'elinalise', 'S'),
  pair('paul', 'elinalise', 'A', '元仲間'),
  pair('paul', 'ghislaine', 'A', '元仲間'),
  pair('luke', 'sara', 'S', 'IF'),
  pair('luke', 'sylphiette', 'A', '元同僚'),
  pair('zanoba', 'linia', 'A'),
  pair('zanoba', 'cliff', 'A'),
  pair('sara', 'linia', 'A'),
];
