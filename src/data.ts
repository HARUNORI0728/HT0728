// Static game data: weapons, classes, terrain, characters, chapters.

export interface Stats { hp: number; str: number; mag: number; skl: number; spd: number; lck: number; def: number; res: number }
/** fang = 獣族の固有攻撃（武器欄なし）。staff = 回復の杖（攻撃・反撃には使わない）。 */
export type WType = 'sword' | 'lance' | 'axe' | 'bow' | 'anima' | 'light' | 'dark' | 'fang' | 'staff';
export type MoveType = 'foot' | 'armor' | 'horse' | 'fly';
export type Team = 'blue' | 'red';

/** heal = 杖の回復値（staff のみ）。 */
export interface Weapon { name: string; type: WType; mt: number; hit: number; crit: number; rng: [number, number]; heal?: number }
/**
 * tier 1 = base class, tier 2 = promoted. wtypes = weapon types the class may use.
 * bonus = stats added on promotion into this class; crit = class crit bonus; gift = weapon granted on promotion
 * when the unit owns nothing of a newly allowed type.
 */
export interface ClassDef {
  /** sprite = 見た目の型（render/units.ts）。騎馬（mtype horse）は自動で馬に乗せる。 */
  name: string; mov: number; mtype: MoveType; sprite: string;
  tier?: 1 | 2; wtypes: WType[]; bonus?: Partial<Stats>; crit?: number; gift?: string; desc?: string;
}
/** note = 情報欄に添える移動の説明（通行不可・移動しにくい など）。 */
export interface Terrain { name: string; def: number; avo: number; heal?: boolean; note?: string }

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
  // ペルギウス専用の理魔術（systems.md §4。名前は仮）。「章ごと8回」の回数制は未実装（所持品・回数制の作業で入れる）。
  summon: { name: '召喚術', type: 'anima', mt: 9, hit: 85, crit: 0, rng: [1, 3] },
  // 獣族の牙爪：全員共通の仮想武器。威力は logic.ts fangMight() が Lv から足す。wps には入れない。
  fang: { name: '牙爪', type: 'fang', mt: 0, hit: 90, crit: 10, rng: [1, 1] },
  // 杖（systems.md §1）。名称は仮（原作の呪文名は要確認）。遠隔治癒の「章ごと3回」は未実装。結界の杖は未実装（実装メモ参照）。
  healStaff: { name: '初級治癒の杖', type: 'staff', mt: 0, hit: 0, crit: 0, rng: [1, 1], heal: 10 },
  midHealStaff: { name: '中級治癒の杖', type: 'staff', mt: 0, hit: 0, crit: 0, rng: [1, 1], heal: 18 },
  farHealStaff: { name: '遠隔治癒の杖', type: 'staff', mt: 0, hit: 0, crit: 0, rng: [1, 3], heal: 10 },
};
export const MAGIC: WType[] = ['anima', 'light', 'dark'];
/** key beats value */
export const TRIANGLE: Partial<Record<WType, WType>> = { sword: 'axe', axe: 'lance', lance: 'sword', anima: 'light', light: 'dark', dark: 'anima' };
export const WTYPE_NAMES: Record<WType, string> = { sword: '剣', lance: '槍', axe: '斧', bow: '弓', anima: '理', light: '光', dark: '闇', fang: '牙爪', staff: '杖' };
/** 牙爪の威力 = min(FANG_MAX, FANG_BASE + floor(実効Lv / 2))（systems.md §2）。 */
export const FANG_BASE = 3, FANG_MAX = 12;

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
  mercenary: { name: '傭兵', mov: 5, mtype: 'foot', sprite: 'merc', tier: 1, wtypes: ['sword'] },
  waterMage: { name: '水王級魔術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 1, wtypes: ['anima'] },
  shieldFencer: { name: '盾剣士', mov: 5, mtype: 'foot', sprite: 'shield', tier: 1, wtypes: ['sword'] },
  healer: { name: '治癒術師', mov: 5, mtype: 'foot', sprite: 'healer', tier: 1, wtypes: ['anima', 'light', 'staff'] }, // 敵用（シルフィエットは魔導護衛へ）
  horseKnight: { name: '騎士', mov: 7, mtype: 'horse', sprite: 'lancer', tier: 1, wtypes: ['sword', 'lance'] },
  strongman: { name: '重装', mov: 4, mtype: 'armor', sprite: 'brute', tier: 1, wtypes: ['axe'] },
  priest: { name: '神撃術師', mov: 5, mtype: 'foot', sprite: 'priest', tier: 1, wtypes: ['light', 'staff'] },
  thief: { name: '盗賊', mov: 6, mtype: 'foot', sprite: 'thief', tier: 1, wtypes: ['fang'] },
  // 打合せ後の新職（world.md §3.1）。名前はすべて仮名。移動力は既存の歩兵に合わせた仮置き。
  magicGuard: { name: '魔導護衛', mov: 5, mtype: 'foot', sprite: 'healer', tier: 1, wtypes: ['anima', 'light', 'staff'] },
  princess: { name: '王女', mov: 5, mtype: 'foot', sprite: 'princess', tier: 1, wtypes: ['sword'] },
  beastWarrior: { name: '獣戦士', mov: 6, mtype: 'foot', sprite: 'beast', tier: 1, wtypes: ['fang'] },
  // ---- promoted classes (tier 2) ----
  archmage: { name: '大魔術師', mov: 6, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima', 'light'], bonus: B(3, 0, 3, 1, 1, 0, 1, 3), gift: 'lightning', desc: '魔力と魔防が伸びる。光魔術も扱える。' },
  magicArmor: { name: '魔導鎧', mov: 5, mtype: 'armor', sprite: 'armor', tier: 2, wtypes: ['anima', 'axe'], bonus: B(6, 4, 1, 0, 0, 0, 5, 1), gift: 'ironAxe', desc: '魔力で動く鎧をまとう。重く硬い。斧も振るえる。' },
  swordSaint: { name: '剣聖', mov: 6, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(4, 2, 0, 3, 3, 0, 1, 1), crit: 10, desc: '速さと技を極める剣。必殺+10。' },
  gladiator: { name: '闘剣士', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['sword', 'axe'], bonus: B(6, 3, 0, 1, 1, 0, 2, 0), gift: 'ironAxe', desc: '力で押し切る前衛。斧も扱える。' },
  superdWarlord: { name: 'スペルドの戦鬼', mov: 7, mtype: 'foot', sprite: 'lancer', tier: 2, wtypes: ['lance', 'sword'], bonus: B(4, 2, 0, 2, 2, 0, 2, 2), gift: 'ironSword', desc: '戦場を駆ける歴戦の戦士。剣も使う。' },
  swordEmperor: { name: '剣帝', mov: 7, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(4, 2, 0, 2, 2, 0, 2, 1), crit: 10, desc: '剣王のさらに上。必殺+10。' },
  swordMaster: { name: '剣豪', mov: 6, mtype: 'foot', sprite: 'merc', tier: 2, wtypes: ['sword', 'axe'], bonus: B(5, 2, 0, 2, 2, 0, 2, 1), gift: 'ironAxe', desc: '三流派をこなす万能の剣士。' },
  waterEmperor: { name: '水帝級魔術師', mov: 5, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima'], bonus: B(3, 0, 4, 2, 1, 0, 1, 3), desc: '水魔術を極める。魔力が大きく伸びる。' },
  sage: { name: '賢者', mov: 5, mtype: 'foot', sprite: 'mage', tier: 2, wtypes: ['anima', 'light', 'staff'], bonus: B(4, 0, 2, 1, 1, 0, 2, 4), gift: 'lightning', desc: '攻撃と治癒の両方に通じる。魔防が高い。' },
  guardian: { name: '守護剣士', mov: 6, mtype: 'foot', sprite: 'shield', tier: 2, wtypes: ['sword', 'lance'], bonus: B(5, 2, 0, 1, 2, 0, 3, 2), gift: 'ironLance', desc: '仲間を守る盾役。槍も扱える。' },
  saintHealer: { name: '聖級治癒術師', mov: 5, mtype: 'foot', sprite: 'healer', tier: 2, wtypes: ['anima', 'light', 'staff'], bonus: B(4, 0, 2, 1, 1, 0, 1, 4), gift: 'lightning', desc: '治癒魔術の聖級。魔防が高い。' },
  paladin: { name: '聖騎士', mov: 8, mtype: 'horse', sprite: 'lancer', tier: 2, wtypes: ['sword', 'lance', 'axe'], bonus: B(5, 2, 0, 1, 1, 0, 2, 2), gift: 'ironAxe', desc: '騎馬の上級職。剣・槍・斧を使う。' },
  sniper: { name: '狙撃手', mov: 6, mtype: 'foot', sprite: 'archer', tier: 2, wtypes: ['bow'], bonus: B(4, 2, 0, 3, 1, 0, 2, 1), crit: 10, desc: '弓を極める。必殺+10。' },
  bowRider: { name: '弓騎兵', mov: 8, mtype: 'horse', sprite: 'archer', tier: 2, wtypes: ['bow', 'sword'], bonus: B(4, 1, 0, 2, 2, 0, 1, 1), gift: 'ironSword', desc: '馬上から弓を射る。剣も使う。' },
  colossus: { name: '剛力将', mov: 5, mtype: 'armor', sprite: 'brute', tier: 2, wtypes: ['axe', 'lance'], bonus: B(6, 3, 0, 1, 0, 0, 3, 2), gift: 'ironLance', desc: '怪力と装甲。槍も扱える。' },
  highPriest: { name: '大司祭', mov: 6, mtype: 'foot', sprite: 'priest', tier: 2, wtypes: ['light', 'anima', 'staff'], bonus: B(4, 0, 2, 1, 1, 0, 1, 4), gift: 'wind', desc: '神撃の上級職。理魔術も使う。' },
  assassin: { name: '暗殺者', mov: 7, mtype: 'foot', sprite: 'sword', tier: 2, wtypes: ['sword'], bonus: B(3, 1, 0, 3, 2, 0, 1, 1), crit: 10, desc: '急所を突く。必殺+10。' },
  rogue: { name: '義賊', mov: 7, mtype: 'foot', sprite: 'archer', tier: 2, wtypes: ['sword', 'bow'], bonus: B(4, 1, 0, 2, 2, 2, 1, 1), gift: 'ironBow', desc: '身軽な万能職。弓も使う。' },
  halberdier: { name: '重槍兵', mov: 6, mtype: 'foot', sprite: 'lancer', tier: 2, wtypes: ['lance'], bonus: B(5, 2, 0, 1, 1, 0, 3, 1), desc: '槍兵の上級職。' },
  berserker: { name: '狂戦士', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['axe'], bonus: B(6, 3, 0, 1, 2, 0, 1, 0), crit: 15, desc: '必殺+15。' },
  warrior: { name: '戦士長', mov: 6, mtype: 'foot', sprite: 'axe', tier: 2, wtypes: ['axe', 'bow'], bonus: B(6, 2, 0, 1, 1, 0, 2, 1), gift: 'ironBow', desc: '斧と弓を使う。' },
  // ---- 打合せ後の新上級職（仮。候補・名前・数値はクラスチェンジ担当と要調整） ----
  // 魔導護衛の前衛寄りの上級職（もう一方の候補は賢者）。
  guardMage: { name: '守護魔導士', mov: 6, mtype: 'foot', sprite: 'healer', tier: 2, wtypes: ['anima', 'light', 'staff'], bonus: B(5, 1, 2, 1, 1, 0, 3, 2), gift: 'lightning', desc: '仲間の前に立つ魔導護衛の上級職。HPと守備が伸びる。' },
  // 牙爪系の上級職。gift は持たない（牙爪は武器欄を使わない）。
  shadowFang: { name: '影牙', mov: 7, mtype: 'foot', sprite: 'thief', tier: 2, wtypes: ['fang'], bonus: B(3, 1, 0, 3, 3, 1, 1, 1), crit: 10, desc: '身軽さを極めた牙爪の使い手。必殺+10。' },
  fierceFang: { name: '猛牙', mov: 7, mtype: 'foot', sprite: 'fang', tier: 2, wtypes: ['fang'], bonus: B(5, 3, 0, 1, 2, 0, 2, 0), desc: '攻めに徹する牙爪の使い手。力とHPが伸びる。' },
  // ペルギウス専用。最初から上級職でクラスチェンジなし（PROMOS に載せない）。
  summoner: { name: '召喚術師', mov: 5, mtype: 'foot', sprite: 'summoner', tier: 2, wtypes: ['anima'], desc: '使い魔を呼ぶ甲龍王の術。上級職固定。' },
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
  magicGuard: P('sage', 'guardMage'),
  beastWarrior: P('fierceFang'),
  horseKnight: P('paladin'),
  archer: P('sniper', 'bowRider'),
  strongman: P('colossus'),
  priest: P('highPriest'),
  thief: P('shadowFang'), // 暗殺者・義賊は剣・弓なので牙爪の盗賊からは外した（敵の剣盗賊を作るときに使う）
  soldier: P('halberdier'),
  fighter: P('berserker', 'warrior'),
  knight: P('general'),
  cavalier: P('paladin'),
  mage: P('archmage'),
  spellblade: P('swordSaint', 'archmage'),
};

/**
 * 地形。記号は各章の map: の1文字。V（村の訪問）と T（宝箱）は systems.md §6 で予約済みなので使わない。
 * 移動コストは moveCost()。効果は控えめに：遮蔽は守備+1・回避+10〜20、通れない地形は飛行のみ。
 */
export const TERRAIN: Record<string, Terrain> = {
  G: { name: '平地', def: 0, avo: 0 },
  R: { name: '道', def: 0, avo: 0 },
  B: { name: '橋', def: 0, avo: 0 },
  F: { name: '森', def: 1, avo: 20, note: '移動コスト2（騎馬3）' },
  M: { name: '山', def: 2, avo: 30, note: '歩兵のみ・移動コスト4' },
  W: { name: '川', def: 0, avo: 0, note: '通行不可' },
  C: { name: '砦', def: 2, avo: 20, heal: true },
  H: { name: '丘', def: 1, avo: 10, note: '移動コスト2' },
  X: { name: '崖', def: 0, avo: 0, note: '通行不可' },
  A: { name: '畑', def: 0, avo: 5, note: '騎馬・重装は移動コスト2' },
  D: { name: '家屋', def: 1, avo: 20 },
  N: { name: '天幕', def: 0, avo: 10 },
  Y: { name: '茂み', def: 0, avo: 10, note: '騎馬は移動コスト2' },
  U: { name: '廃墟', def: 1, avo: 15, note: '移動コスト2（騎馬3）' },
  Z: { name: '城壁', def: 0, avo: 0, note: '通行不可' },
  L: { name: '柵', def: 0, avo: 0, note: '通行不可' },
  P: { name: '浅瀬', def: 0, avo: 0, note: '移動コスト3（重装4）' },
};

export function moveCost(t: string, m: MoveType): number {
  if (m === 'fly') return 1;
  switch (t) {
    case 'W': case 'X': case 'Z': case 'L': return Infinity;
    case 'M': return m === 'foot' ? 4 : Infinity;
    case 'F': case 'U': return m === 'horse' ? 3 : 2;
    case 'H': return 2;
    case 'A': return m === 'foot' ? 1 : 2;
    case 'Y': return m === 'horse' ? 2 : 1;
    case 'P': return m === 'armor' ? 4 : 3;
    default: return 1;
  }
}

export interface CharDef { id: string; name: string; cls: string; lv: number; st: Stats; gr: Stats; wps: string[]; hair: string }

const S = (hp: number, str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number): Stats => ({ hp, str, mag, skl, spd, lck, def, res });

export const CHARS: Record<string, CharDef> = {
  rudeus: { id: 'rudeus', name: 'ルーデウス', cls: 'sorcerer', lv: 1, st: S(20, 2, 9, 7, 7, 5, 4, 6), gr: S(60, 15, 70, 55, 45, 40, 30, 50), wps: ['stoneCannon', 'waterBall'], hair: '#b08a5a' },
  eris: { id: 'eris', name: 'エリス', cls: 'myrmidon', lv: 1, st: S(21, 8, 0, 8, 10, 5, 5, 2), gr: S(75, 60, 5, 55, 65, 40, 35, 20), wps: ['ironSword'], hair: '#c22a2a' },
  ruijerd: { id: 'ruijerd', name: 'ルイジェルド', cls: 'superd', lv: 8, st: S(30, 11, 2, 12, 10, 4, 9, 6), gr: S(60, 35, 10, 40, 35, 20, 35, 30), wps: ['whiteSpear'], hair: '#2f9a63' },
  ghislaine: { id: 'ghislaine', name: 'ギレーヌ', cls: 'swordKing', lv: 10, st: S(32, 13, 0, 12, 12, 5, 8, 3), gr: S(65, 40, 0, 40, 40, 25, 30, 15), wps: ['steelSword'], hair: '#b9b4ac' },
  // ---- 2章以降に加入（能力値・成長率はすべて仮。加入Lvは systems.md §6 の「味方の平均Lv」、年長者は +2〜3） ----
  // 2章（平均Lv3）。年長者なので成長率は低め。
  paul: { id: 'paul', name: 'パウロ', cls: 'mercenary', lv: 6, st: S(28, 10, 1, 11, 11, 7, 7, 3), gr: S(55, 35, 5, 35, 35, 30, 25, 15), wps: ['ironSword'], hair: '#7a5230' },
  // 3章（平均Lv4）。
  roxy: { id: 'roxy', name: 'ロキシー', cls: 'waterMage', lv: 6, st: S(22, 1, 12, 10, 9, 6, 3, 10), gr: S(45, 5, 50, 40, 35, 30, 15, 45), wps: ['waterBall', 'fire'], hair: '#5aa0e0' },
  elinalise: { id: 'elinalise', name: 'エリナリーゼ', cls: 'shieldFencer', lv: 7, st: S(26, 8, 2, 11, 13, 10, 8, 6), gr: S(50, 30, 10, 35, 40, 40, 30, 25), wps: ['rapier'], hair: '#f0d27a' },
  // 4章（平均Lv6）。シルフィエットは万能型：魔力・速さ高め、HP・守備は中程度。
  sylphiette: { id: 'sylphiette', name: 'シルフィエット', cls: 'magicGuard', lv: 6, st: S(25, 4, 9, 9, 11, 7, 6, 8), gr: S(65, 25, 55, 45, 55, 45, 35, 40), wps: ['wind', 'healStaff'], hair: '#eeeef4' },
  luke: { id: 'luke', name: 'ルーク', cls: 'horseKnight', lv: 6, st: S(26, 9, 0, 8, 9, 6, 7, 3), gr: S(65, 45, 5, 40, 40, 35, 35, 20), wps: ['ironSword', 'ironLance'], hair: '#8a6440' },
  // 打たれ弱い指揮役。
  ariel: { id: 'ariel', name: 'アリエル', cls: 'princess', lv: 6, st: S(20, 7, 4, 9, 10, 10, 4, 7), gr: S(50, 35, 25, 50, 50, 60, 20, 40), wps: ['rapier'], hair: '#f2c94c' },
  // 5章（平均Lv7）。
  sara: { id: 'sara', name: 'サラ', cls: 'archer', lv: 7, st: S(25, 9, 0, 11, 11, 6, 6, 3), gr: S(60, 45, 5, 55, 50, 35, 25, 20), wps: ['ironBow'], hair: '#e6cf7a' },
  // 6章（平均Lv9）。ザノバは力と守備が突出、速さは最低。
  zanoba: { id: 'zanoba', name: 'ザノバ', cls: 'strongman', lv: 9, st: S(36, 15, 0, 7, 2, 5, 14, 2), gr: S(85, 65, 0, 30, 10, 30, 55, 10), wps: ['ironAxe'], hair: '#b8956a' },
  cliff: { id: 'cliff', name: 'クリフ', cls: 'priest', lv: 9, st: S(23, 2, 12, 11, 9, 8, 4, 12), gr: S(50, 10, 55, 45, 40, 40, 20, 50), wps: ['lightning', 'healStaff'], hair: '#4a3426' },
  // 7章（平均Lv10）。獣族の格闘は武器を持たない（wps: []、牙爪で戦う）。リニアは回避型、プルセナは攻め寄り。
  linia: { id: 'linia', name: 'リニア', cls: 'thief', lv: 10, st: S(28, 10, 0, 13, 16, 12, 6, 4), gr: S(60, 40, 5, 50, 65, 50, 25, 20), wps: [], hair: '#c9a46a' },
  // プルセナの外見・得意分野は原作要確認。髪色は仮。
  pursena: { id: 'pursena', name: 'プルセナ', cls: 'beastWarrior', lv: 10, st: S(30, 12, 0, 12, 14, 7, 7, 3), gr: S(65, 50, 5, 45, 55, 35, 30, 15), wps: [], hair: '#9a8a7a' },
  // 8章（平均Lv12）。受けて返す反撃型。種族・階位・外見は原作要確認。髪色は仮。
  isolde: { id: 'isolde', name: 'イゾルテ', cls: 'myrmidon', lv: 12, st: S(32, 13, 1, 16, 14, 8, 10, 6), gr: S(60, 40, 10, 55, 45, 35, 35, 25), wps: ['steelSword'], hair: '#6a7a9a' },
  // 9章。上級職固定（上級Lv4＝実効Lv14）。成長率は全体に低い。
  perugius: { id: 'perugius', name: 'ペルギウス', cls: 'summoner', lv: 4, st: S(38, 8, 20, 18, 14, 12, 12, 18), gr: S(35, 15, 30, 25, 20, 20, 20, 30), wps: ['summon'], hair: '#d8dce4' },
  // ---- ゲスト（章ごとの護衛対象。名簿には残らない。CAST・支援には入れない） ----
  // 2章：捜索団の治療師（本作オリジナル）。杖しか持たないので攻撃できない。能力値は仮。
  lotta: { id: 'lotta', name: 'ロッタ', cls: 'healer', lv: 3, st: S(22, 1, 6, 5, 6, 6, 4, 6), gr: S(50, 5, 45, 40, 40, 40, 20, 40), wps: ['healStaff'], hair: '#a0643c' },
};

/** prefix = 一般兵の名前の頭（省略時「野盗の」。例：「私兵の」→「私兵の槍兵」）。 */
export interface EnemyDef { cls: string; lv: number; x: number; y: number; wps: string[]; ai: 'charge' | 'hold' | 'guard'; boss?: string; prefix?: string }
/**
 * One line of a conversation. face = 立ち絵の表情（省略時 normal。その表情の絵が無ければ normal）。
 * pos = 立ち絵を出す側（省略時は自動：すでに出ていればその側、なければ空いている側）。
 */
export interface Line { who: string; text: string; face?: 'normal' | 'smile' | 'angry' | 'sad' | 'dere'; pos?: 'left' | 'right' }
/**
 * 話者名・ユニット名 → 立ち絵とマップ用絵の ID（assets/portraits/<ID>_<表情>.png, assets/units/<ID>.png）。
 * 仲間（CHARS / CAST の名前）は自動で引けるので、ここには名前のある敵・ゲスト・NPC を足す。
 * 完全一致のあと「名前の末尾」で照合するので、肩書きつき（「野盗頭ガズ」）は短い名前だけでよい。
 */
export const SPEAKER_IDS: Record<string, string> = {
  'ガズ': 'gaz', 'ドルガン': 'dolgan', 'ロッタ': 'lotta',
  'オーベール': 'auber', 'ガル・ファリオン': 'gall', 'ダリウス': 'darius', 'オルステッド': 'orsted',
  '傭兵団長': 'mercboss', '使徒': 'apostle', '迷宮の主': 'labyrinth',
};
export type Tile = [number, number];
/**
 * 勝利条件（systems.md §7）。rout = 全滅、boss = boss フラグの敵をすべて撃破、seize = ルーデウスが tiles で制圧、
 * escape = 生存者全員が tiles から離脱、defend = turns ターン守り切る（敵が lose.tile に乗ると敗北）、
 * survive = turns ターン目の敵軍フェイズを終えたら勝利。
 */
export type WinCond =
  | { type: 'rout' } | { type: 'boss' }
  | { type: 'seize'; tiles: Tile[] } | { type: 'escape'; tiles: Tile[] }
  | { type: 'defend'; turns: number } | { type: 'survive'; turns: number };
/** 敗北条件：units の誰かが倒れる（ルーデウスは常に含む）、または敵が tile に乗る（defend 用）。 */
export interface LoseCond { units: string[]; tile?: Tile }
/** 指定ターンの敵軍フェイズ開始時に出現。出現マスが埋まっていれば次のターンに持ち越す。 */
export interface Reinforce { turn: number; units: EnemyDef[] }
export interface Chapter {
  title: string; map: string[];
  /** 必ず出撃する仲間（新規加入・物語上の必須メンバー）。guest は護衛対象など：倒れると敗北、次章へ持ち越さない。 */
  players: { id: string; x: number; y: number; guest?: boolean }[];
  /**
   * 名簿から出撃させる残りの枠の配置。sortie = 出撃の上限（players を含み、guest は数えない）。
   * 名簿の仲間が残り枠より多いときは出撃準備の画面で選ぶ（少なければ名簿順で自動）。
   */
  slots?: { x: number; y: number }[]; sortie?: number;
  enemies: EnemyDef[];
  win: WinCond; lose?: LoseCond; reinforce?: Reinforce[];
  intro: Line[]; outro: Line[];
}

/** Base stats for generic enemies at level 1, plus per-level gains. */
export const ENEMY_BASE: Record<string, Stats> = {
  soldier: S(17, 4, 0, 3, 3, 1, 3, 0),
  fighter: S(19, 4, 0, 2, 3, 0, 2, 0),
  archer: S(16, 4, 0, 4, 3, 1, 2, 0),
  knight: S(22, 6, 0, 3, 1, 2, 8, 1),
  healer: S(15, 0, 4, 3, 4, 2, 1, 4), // 3章以降の「野盗の治癒術師」用（仮）
  // 2章の貴族の私兵・傭兵隊長用（仮）
  myrmidon: S(17, 4, 0, 5, 6, 1, 2, 0),
  cavalier: S(20, 5, 0, 3, 4, 1, 4, 0),
  mercenary: S(20, 6, 0, 6, 6, 2, 4, 1),
};

export const CHAPTERS: Chapter[] = [
  {
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
      { cls: 'knight', lv: 5, x: 13, y: 2, wps: ['javelin'], ai: 'guard', boss: '野盗頭ガズ' },
    ],
    intro: [
      { who: '', text: '魔大陸から歩きつづけて、三年。' },
      { who: '', text: 'ようやく帰りついた故郷フィットア領は、見わたすかぎりの草原になっていた。' },
      { who: 'ルーデウス', text: '……何も、ない。ロアの城壁も、ブエナ村も。', face: 'sad' },
      { who: 'エリス', text: 'ふん。だったら建て直せばいいじゃない！ ……建て直すのよ。絶対に。', face: 'angry' },
      { who: 'ルイジェルド', text: '待て。難民キャンプのほうから煙が上がっている。……武器の音だ。' },
      { who: 'ギレーヌ', text: 'お嬢様！ ルーデウス！ 生きていたか。話は後だ、野盗どもが復興の物資を狙ってきている。', face: 'smile' },
      { who: 'エリス', text: 'ギレーヌ！ ちょうどいいわ、三年分の修行の成果、見せてあげる！', face: 'smile' },
      { who: 'ルーデウス', text: '（前の人生なら、布団をかぶって震えていただろうな）', face: 'sad' },
      { who: 'ルーデウス', text: '（でも今は違う。帰る場所は、自分で守る）――いきます。援護は任せてください。', face: 'angry' },
    ],
    outro: [
      { who: 'ギレーヌ', text: '見事だ。二人とも、強くなったな。', face: 'smile' },
      { who: 'エリス', text: '当然でしょ！ ……ねえギレーヌ。お祖父様と、お父様たちは？', face: 'sad' },
      { who: 'ギレーヌ', text: '…………。それも、後で話す。', face: 'sad' },
      { who: 'ルイジェルド', text: 'ルーデウス。野盗にしては装備が揃いすぎていた。後ろに誰かいるぞ。' },
      { who: 'ルーデウス', text: 'ええ。この土地を欲しがっている誰かが。……父さまたち捜索団にも、知らせないと。', face: 'angry' },
      { who: 'ルーデウス', text: '（家族を探す。故郷を取り戻す。やることは山ほどある）' },
      { who: 'ルーデウス', text: '（上等だ。今度の人生は、本気で生きると決めたんだから）', face: 'smile' },
      { who: '', text: '第1章　クリア。' },
    ],
  },
  {
    // 2章（systems.md §6・§7）：ターン耐久8・捜索団員ロッタをゲストとして護衛。出撃5（ゲスト除く）、最初の敵11＋増援4。
    // マップは依頼により 20×14（§6 の表は 15×10）。敵の約半数は hold / guard。川の東は橋2本と浅瀬1か所で渡る。
    title: '第2章　捜索団の灯',
    win: { type: 'survive', turns: 8 }, lose: { units: ['rudeus', 'paul'] },
    // 20×14。廃村を柵が囲み、門は北・南・西・東の4か所（南の柵は一部崩れている）。中央の砦跡にロッタとパウロ。
    // 北の森と南の林から野盗、東の川（橋2本と浅瀬）を渡って私兵が来る。北東の砦に傭兵隊長。
    map: [
      'MMFFFGFGFFFGGGGWXXMM',
      'MFFHGGGFGFFYGGGWGGXM',
      'FFHHGFFGGGGGGGGWGRRC',
      'FGHGGFFGYGRRRRRBRRGG',
      'GGGGGGLLLGRLLLGWGGGG',
      'GGGYGGLDDGRGDLGWGGFF',
      'GGGGGGLGGGRGGLGWWGFF',
      'RRRRRRRRRCRRRRRRBRRR',
      'GGGGGGLGGGGGGLGGWGGG',
      'GGFGGGLDDGGUDLGGPGGG',
      'AAAGGGLLLGLGLLGGWGGG',
      'AAAGGFFGGGGFFGGWWGMM',
      'GAAGGFFFGGGFFGGWGGMM',
      'GGGGFFFGGGGGFGGWGMMM',
    ],
    players: [
      { id: 'rudeus', x: 1, y: 7 }, { id: 'paul', x: 10, y: 7 }, { id: 'lotta', x: 9, y: 7, guest: true },
    ],
    slots: [{ x: 2, y: 8 }, { x: 0, y: 8 }, { x: 1, y: 6 }, { x: 0, y: 6 }, { x: 1, y: 9 }],
    sortie: 5,
    enemies: [
      // 北の森から野盗
      { cls: 'fighter', lv: 3, x: 7, y: 1, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'fighter', lv: 2, x: 11, y: 1, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'soldier', lv: 2, x: 4, y: 2, wps: ['ironLance'], ai: 'charge' },
      { cls: 'archer', lv: 3, x: 9, y: 2, wps: ['ironBow'], ai: 'hold' },
      // 南の林から野盗
      { cls: 'fighter', lv: 2, x: 7, y: 12, wps: ['ironAxe'], ai: 'charge' },
      { cls: 'soldier', lv: 3, x: 11, y: 12, wps: ['ironLance'], ai: 'hold' },
      // 川の東から貴族の私兵
      { cls: 'soldier', lv: 3, x: 17, y: 4, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
      { cls: 'cavalier', lv: 3, x: 17, y: 7, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
      { cls: 'myrmidon', lv: 4, x: 17, y: 9, wps: ['ironSword'], ai: 'hold', prefix: '私兵の' },
      { cls: 'archer', lv: 3, x: 18, y: 10, wps: ['ironBow'], ai: 'hold', prefix: '私兵の' },
      { cls: 'mercenary', lv: 7, x: 19, y: 2, wps: ['steelSword'], ai: 'guard', boss: '傭兵隊長ドルガン' },
    ],
    reinforce: [
      { turn: 3, units: [
        { cls: 'fighter', lv: 3, x: 6, y: 0, wps: ['ironAxe'], ai: 'charge' },
        { cls: 'soldier', lv: 3, x: 11, y: 0, wps: ['ironLance'], ai: 'charge' },
      ] },
      { turn: 5, units: [
        { cls: 'cavalier', lv: 4, x: 19, y: 9, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
        { cls: 'soldier', lv: 4, x: 19, y: 7, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' },
      ] },
    ],
    intro: [
      { who: '', text: 'ギレーヌの案内で、捜索団が拠点にしている村跡へ向かう途中。丘の向こうで角笛が鳴った。' },
      { who: 'ルイジェルド', text: '村跡が囲まれている。野盗と……揃いの鎧を着た兵だ。', face: 'angry' },
      { who: 'ギレーヌ', text: 'あの旗は捜索団のものだ。砦にいるのは――' },
      { who: 'パウロ', text: 'ロッタ、砦から出るな！ 怪我人の手当てを続けろ！ ……くそ、きりがねえ。', face: 'angry' },
      { who: 'ルーデウス', text: '……父さま？' },
      { who: 'パウロ', text: 'あ？ なんだお前……いや、その目つき。……ルディ、なのか？' },
      { who: 'ルーデウス', text: 'ええ。三年ぶりです、父さま。', face: 'smile' },
      { who: 'パウロ', text: '三年だぞ！ 三年も便りひとつよこさないで、どこをほっつき歩いてた！', face: 'angry' },
      { who: 'ルーデウス', text: '魔大陸から歩いて帰ってきたんです！ そっちこそ、捜索団ごと袋のねずみじゃないですか！', face: 'angry' },
      { who: 'エリス', text: '親子げんかは後にしなさい！ 敵が来るわよ！', face: 'angry' },
      { who: '傭兵隊長ドルガン', text: '涙の再会か、結構なこった。まとめて片づけろ！ この土地は伯爵さまがお買い上げだ！', face: 'angry' },
      { who: 'パウロ', text: '……ちっ。ルディ、話は終わってねえからな。日が沈むまで粘れば、あいつらは引く。', face: 'angry' },
      { who: 'ルーデウス', text: '望むところです。ロッタさんと怪我人は、僕たちが守ります。', face: 'smile' },
      { who: 'ルーデウス', text: '（言いたいことは山ほどある。でも、死なせたら一言も言えなくなる）', face: 'sad' },
    ],
    outro: [
      { who: '', text: '日が傾くころ、傭兵たちは旗を巻いて引きあげていった。' },
      { who: 'ロッタ', text: '団長、怪我人は全員無事です。……あの魔術師さんたちのおかげですね。' },
      { who: 'パウロ', text: 'さっきの岩の魔術。俺の背中を狙った槍を、きっちり弾いてたな。', face: 'smile' },
      { who: 'ルーデウス', text: '父さまこそ。僕の前に出た剣士を、二人まとめて。腕はなまってないんですね。', face: 'smile' },
      { who: 'パウロ', text: '当たり前だ。……なあルディ。三年ぶん、言うことを考えてたんだ。説教も、謝るのも。', face: 'sad' },
      { who: 'パウロ', text: '……お前の顔を見たら、全部忘れた。', face: 'sad' },
      { who: 'ルーデウス', text: '奇遇ですね。僕も道中ずっと練習してたんですけど、きれいに飛びました。', face: 'smile' },
      { who: '', text: '二人の声が、ぴたりと重なった。「――ごめん」' },
      { who: 'パウロ', text: '……おい。今のは俺が先だったろ。', face: 'angry' },
      { who: 'ルーデウス', text: 'いえ、僕のほうが半拍早かったです。', face: 'smile' },
      { who: 'エリス', text: 'どっちでもいいわよ！ ……もう、そういうところがそっくりなんだから。', face: 'smile' },
      { who: 'ギレーヌ', text: '三年たっても変わらんな、この親子は。', face: 'smile' },
      { who: 'パウロ', text: 'よし、今夜は飲むぞ。三年ぶんだ。', face: 'smile' },
      { who: 'ルーデウス', text: '僕は水でいいです。……でも、隣には座りますよ。', face: 'smile' },
      { who: 'ルイジェルド', text: '捕らえた傭兵が吐いた。雇い主はアスラの貴族、この一帯を丸ごと狙っているそうだ。', face: 'angry' },
      { who: '', text: '第2章　クリア。' },
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
  sylphiette: { name: 'シルフィエット', cls: 'magicGuard' },
  luke: { name: 'ルーク', cls: 'horseKnight' },
  sara: { name: 'サラ', cls: 'archer' },
  zanoba: { name: 'ザノバ', cls: 'strongman' },
  cliff: { name: 'クリフ', cls: 'priest' },
  linia: { name: 'リニア', cls: 'thief' },
  ariel: { name: 'アリエル', cls: 'princess' },
  pursena: { name: 'プルセナ', cls: 'beastWarrior' },
  isolde: { name: 'イゾルテ', cls: 'myrmidon' },
  perugius: { name: 'ペルギウス', cls: 'summoner' },
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
  { who: 'エリス', text: '十分じゃないわ。あの斧の男、一撃で倒せなかった。', face: 'angry' },
  { who: 'ルーデウス', text: '倒せてましたよ。二撃で。', face: 'smile' },
  { who: 'エリス', text: 'それじゃだめなの！ 一撃で倒せてたら、あんたが前に出なくてすんだのよ。', face: 'angry' },
  { who: 'ルーデウス', text: '……ああ。俺をかばおうとして、無理してたんですね。', face: 'smile' },
  { who: 'エリス', text: 'ち、違うわよ！ 魔術師は後ろにいるものなの。そういう決まりなの！', face: 'angry' },
  { who: 'ルーデウス', text: 'じゃあ明日は、決まりどおり後ろから援護します。エリスが一撃で決められるように。', face: 'smile' },
  { who: 'エリス', text: '……ふん。外したら承知しないんだから。', face: 'smile' },
];
const TALK_RUDEUS_RUIJERD_C: Line[] = [
  { who: 'ルイジェルド', text: 'ルーデウス。キャンプの子どもたちに水を配っていたな。' },
  { who: 'ルーデウス', text: '魔術で出せば井戸を掘るまでのつなぎになりますから。見てたんですか。', face: 'smile' },
  { who: 'ルイジェルド', text: '子どもが列に割り込んでも、お前は叱らなかった。' },
  { who: 'ルーデウス', text: '喉が渇いてる子を叱っても、水は増えませんからね。', face: 'smile' },
  { who: 'ルイジェルド', text: 'そうだ。だが、後ろに並んでいた小さい子が泣いていた。', face: 'sad' },
  { who: 'ルーデウス', text: '……気づきませんでした。明日は列の後ろから配ります。', face: 'sad' },
  { who: 'ルイジェルド', text: 'それでいい。戦士は強い者より、先に弱い者を見るものだ。', face: 'smile' },
  { who: 'ルーデウス', text: '旅の間にさんざん教わったのに、まだまだですね、俺。', face: 'sad' },
  { who: 'ルイジェルド', text: '気づけば直せる。お前はいつもそうしてきた。', face: 'smile' },
];
const TALK_RUDEUS_GHISLAINE_C: Line[] = [
  { who: 'ギレーヌ', text: 'ルーデウス。字を教えてくれ。……いや、思い出させてくれ、か。' },
  { who: 'ルーデウス', text: '昔、一緒に練習しましたよね。読めなくなったんですか？' },
  { who: 'ギレーヌ', text: '三年、剣しか握っていなかった。物資の帳簿が読めんのだ。', face: 'sad' },
  { who: 'ルーデウス', text: 'なるほど。じゃあ今夜から、帳簿を教科書にしましょう。', face: 'smile' },
  { who: 'ギレーヌ', text: '助かる。数字はまだ覚えている。……たぶんな。', face: 'smile' },
  { who: 'ルーデウス', text: '「小麦　十二袋」。はい、読んでみてください。', face: 'smile' },
  { who: 'ギレーヌ', text: 'こむぎ……じゅうに、ふくろ。……ふん。剣より手強いな。', face: 'angry' },
  { who: 'ルーデウス', text: '剣王が言うと説得力がありますね。でも、ちゃんと読めてますよ。', face: 'smile' },
];
const TALK_ERIS_GHISLAINE_C: Line[] = [
  { who: 'エリス', text: 'ギレーヌ、稽古をつけて！ 今すぐ！', face: 'angry' },
  { who: 'ギレーヌ', text: '今日はもう二度相手をしたぞ、お嬢様。' },
  { who: 'エリス', text: '二度とも負けたから三度目なの！ それと、お嬢様はやめて。', face: 'angry' },
  { who: 'ギレーヌ', text: '……では、エリス。踏み込みが半歩早い。焦っているな。' },
  { who: 'エリス', text: '焦ってないわ。早く強くならなきゃいけないだけよ。', face: 'angry' },
  { who: 'ギレーヌ', text: 'それを焦りと言う。サウロス様も、よくそう言われていた。', face: 'sad' },
  { who: 'エリス', text: '……お祖父様が？', face: 'sad' },
  { who: 'ギレーヌ', text: 'ああ。座れ。稽古の前に、少し昔の話をしてやろう。', face: 'smile' },
];
const TALK_ERIS_RUIJERD_C: Line[] = [
  { who: 'エリス', text: 'ルイジェルド！ その槍、ちょっと貸しなさいよ。' },
  { who: 'ルイジェルド', text: '断る。お前には長すぎる。' },
  { who: 'エリス', text: '使いたいんじゃないわ。どうしてあんなに速く突けるのか知りたいの。' },
  { who: 'ルイジェルド', text: '速く突こうとは思っていない。無駄を削っているだけだ。' },
  { who: 'エリス', text: '無駄……。あたしの剣、そんなに無駄が多い？', face: 'sad' },
  { who: 'ルイジェルド', text: '多い。だが、旅を始めたころの半分になった。', face: 'smile' },
  { who: 'エリス', text: '半分！？ ……ふ、ふん。じゃあ、あと半分削ればいいのね。', face: 'smile' },
  { who: 'ルイジェルド', text: 'そうだ。焦らずにな。', face: 'smile' },
];

/** world.md §4 — 全43組（S 9・A 34）。並び順 = 章クリア後に支援会話を再生する順。 */
export const SUPPORTS: SupportPair[] = [
  // 会話本文のある組（第1章の4人）
  pair('rudeus', 'eris', 'S', '', { C: TALK_RUDEUS_ERIS_C }, 10),
  pair('rudeus', 'ruijerd', 'A', '', { C: TALK_RUDEUS_RUIJERD_C }),
  pair('rudeus', 'ghislaine', 'A', '', { C: TALK_RUDEUS_GHISLAINE_C }),
  pair('eris', 'ghislaine', 'A', '師弟', { C: TALK_ERIS_GHISLAINE_C }, 10),
  pair('eris', 'ruijerd', 'A', '', { C: TALK_ERIS_RUIJERD_C }),
  // ルーデウス（15組。うちSは結婚候補7人）
  pair('rudeus', 'sylphiette', 'S', '幼なじみ', {}, 10),
  pair('rudeus', 'roxy', 'S', '師弟', {}, 10),
  pair('rudeus', 'sara', 'S', 'IF'),
  pair('rudeus', 'ariel', 'S', 'IF'),
  pair('rudeus', 'linia', 'S', 'IF', {}, 30),
  pair('rudeus', 'pursena', 'S', 'IF', {}, 30),
  pair('rudeus', 'paul', 'A', '親子', {}, 10),
  pair('rudeus', 'zanoba', 'A', '師弟'),
  pair('rudeus', 'cliff', 'A'),
  pair('rudeus', 'luke', 'A'),
  pair('rudeus', 'elinalise', 'A'),
  pair('rudeus', 'perugius', 'A'),
  // エリス
  pair('eris', 'roxy', 'A'),
  pair('eris', 'sylphiette', 'A'),
  pair('eris', 'ariel', 'A', 'IF'),
  pair('eris', 'isolde', 'A', '剣神流と水神流'),
  // ロキシー
  pair('roxy', 'sylphiette', 'A'),
  pair('roxy', 'elinalise', 'A'),
  pair('roxy', 'paul', 'A', '元仲間'),
  // シルフィエット
  pair('sylphiette', 'ariel', 'A', '主従', {}, 10),
  pair('luke', 'sylphiette', 'A', '元同僚'),
  pair('sylphiette', 'elinalise', 'A', '血縁'),
  pair('sylphiette', 'paul', 'A', '幼いころの顔なじみ'),
  // アリエル
  pair('ariel', 'luke', 'A', '主従'),
  pair('ariel', 'perugius', 'A'),
  // パウロ
  pair('paul', 'elinalise', 'A', '元仲間'),
  pair('paul', 'ghislaine', 'A', '元仲間'),
  pair('paul', 'isolde', 'A'),
  // エリナリーゼ
  pair('cliff', 'elinalise', 'S'), // 未決：打合せで扱いが決まっていない。現状維持（S可）
  // ギレーヌ
  pair('ghislaine', 'pursena', 'A', '獣族同士'),
  pair('ghislaine', 'isolde', 'A'),
  // ルーク
  pair('luke', 'sara', 'S', 'IF'), // 未決：打合せで扱いが決まっていない。現状維持（S可）
  // リニア
  pair('linia', 'pursena', 'A', '相棒', {}, 10),
  pair('zanoba', 'linia', 'A'),
  pair('sara', 'linia', 'A'),
  // プルセナ・ザノバ・ペルギウス
  pair('pursena', 'cliff', 'A'),
  pair('zanoba', 'cliff', 'A'),
  pair('perugius', 'ruijerd', 'A', 'ラプラス戦役'), // 経緯は原作要確認
];
