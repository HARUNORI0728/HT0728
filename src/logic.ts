// Pure game rules: movement, combat math, level-ups, enemy AI. No DOM access here.
import {
  CAST, CHARS, chapterDef, CLASSES, ENEMY_BASE, FANG_BASE, FANG_MAX, MAGIC, PROMOS, RANKS, RANK_PTS, STAT_KEYS, SUPPORTS, SUPPORT_BONUS, SUPPORT_CAP, SUPPORT_GAIN, SUPPORT_RANGE,
  SKILLS, SKILL_LIMIT, S_LIMIT, S_LIMIT_DEFAULT, TERRAIN, TRIANGLE, WEAPONS, moveCost,
  type AllyDef, type ArtId, type Chapter, type EnemyAI, type EnemyDef, type LoseCond, type Objective, type Reinforce, type Tile, type WinCond, type PromoReq, type Stats, type SupportBonus, type SupportPair, type SupportRank, type TalkEvent, type TalkWhen, type Team, type TerrainChange, type VisitDef, type Weapon,
} from './data';
import { idForName } from './render/who';

export interface Unit {
  uid: number; id: string; name: string; cls: string; team: Team;
  lv: number; exp: number; hp: number; st: Stats; gr?: Stats;
  wps: string[]; eq: number; x: number; y: number; done: boolean;
  /** charge: always advance. hold: move only to attack. guard: never leave its tile. target: head for `goal`. */
  ai?: EnemyAI; boss?: boolean;
  /** ai 'target' の目標マス。aiFrom = 指定ターンからのAI切り替え（EnemyDef と同じ）。 */
  goal?: Tile; aiFrom?: EnemyDef['aiFrom'];
  /** 撤退するHPの割合・撃破不可・印（EnemyDef と同じ）。retreated = 撤退した（left も立つ）。 */
  retreatAt?: number; unkillable?: boolean; tag?: string; retreated?: boolean; hair?: string; potions: number;
  /** Magic ranks / sword-school licences (future class-change conditions). */
  arts?: Partial<Record<ArtId, number>>;
  /** クラシックで倒れた仲間：以後出撃できない（名簿・会話には残る）。 */
  out?: boolean;
  /** 護衛対象などのゲスト：倒れると敗北。次章へ持ち越さない。 */
  guest?: boolean;
  /** 離脱マスから離脱した（盤面から外し、判定から除く）。 */
  left?: boolean;
  /** ボスが倒されたときの扱い（EnemyDef.defeat）。 */
  defeat?: 'captured' | 'retreat';
  /** 道具枠（systems.md §2。最大2枠・1枠3個まで）。いまは店の傷薬だけ。章ごとに配られる3個とは別。 */
  items?: { id: string; n: number }[];
  /** 出撃した時点の累計経験値（totalXp）。章クリア時の控えの経験値の計算に使う。 */
  xp0?: number;
  /** ボスのスキル（EnemyDef.skills）。味方のスキルは skillsOf() が CHARS と CLASSES から組み立てる。 */
  skills?: string[];
  /** 剣の流派（パウロが出撃準備で選んだもの。未設定なら CharDef.school）。セーブにそのまま残る。 */
  school?: string;
  /** 泥沼（ルーデウス）：次の敵軍フェイズの移動力の減少。敵軍フェイズの終わりに消す（clearSlow）。 */
  slow?: number;
  /** この行動で動いたマス数（始点からの距離。突撃・狙い澄まし用）。 */
  mv?: number;
}
/**
 * Bond progress per pair (key = pairKey). rank: 0 = none, 1 = C … 4 = S.
 * deferred = 告白に「応えられない」と答えた章（camp.cleared の値）。その章のあいだは告白が起きず、次の章のクリア後にまた起きる。
 */
export interface Bond { pts: number; rank: number; deferred?: number }
export type Bonds = Record<string, Bond>;
export type Difficulty = 'casual' | 'classic';
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { casual: 'カジュアル', classic: 'クラシック' };
/** 難易度（カジュアル／クラシックとは別の軸）：ふつう／むずかしい。State.hard・Camp.hard（v6 の任意項目。無ければふつう）。 */
export const levelName = (hard?: boolean) => (hard ? 'むずかしい' : 'ふつう');
/**
 * bench = 出撃しなかった名簿の仲間（離脱者を含む）。章クリア時に名簿へ戻す。
 * flags = 章の進行フラグ（seized・増援の出現済みなど）。
 */
export interface State {
  chapter: number; turn: number; phase: Team; units: Unit[]; map: string[]; bonds: Bonds;
  difficulty: Difficulty; bench: Unit[]; flags: Record<string, number | boolean>;
  /** 出撃準備で選んだ（空き枠に出した）仲間。「章の最初から」で同じメンバーにする。 */
  picks?: string[];
  /** むずかしい（敵の能力が上がる。makeEnemy の hardBonus）。無ければふつう。 */
  hard?: boolean;
}

export const key = (x: number, y: number) => x + ',' + y;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const onMap = (u: Unit) => u.hp > 0 && !u.left;
export const unitAt = (s: State, x: number, y: number) => s.units.find(u => onMap(u) && u.x === x && u.y === y);
export const alive = (s: State, team: Team) => s.units.filter(u => onMap(u) && u.team === team);
export const terrainAt = (s: State, x: number, y: number) => TERRAIN[s.map[y][x]];

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- 所持枠（systems.md §2） ----------
/** 武器枠（武器・魔術・杖を合わせて）・道具枠・1枠に重ねられる数。 */
export const WEAPON_SLOTS = 4, ITEM_SLOTS = 2, ITEM_STACK = 3;
/** 章の初めに無料で配られる傷薬の数（従来どおり）。買った傷薬はこれに上乗せされる。 */
export const FREE_POTIONS = 3;
export const itemCount = (u: Unit, id: string) => (u.items ?? []).filter(i => i.id === id).reduce((a, i) => a + i.n, 0);
/** 道具 `id` を `n` 個にそろえ直す（ITEM_STACK ごとに枠へ詰める。ほかの道具の枠はそのまま）。 */
export function setItemCount(u: Unit, id: string, n: number) {
  const rest = (u.items ?? []).filter(i => i.id !== id);
  for (let left = Math.max(0, n); left > 0; left -= ITEM_STACK) rest.push({ id, n: Math.min(ITEM_STACK, left) });
  u.items = rest;
}
/** 出撃時の傷薬の数：配られる3個 + 持っている傷薬。 */
const potionsAtStart = (u: Unit) => FREE_POTIONS + itemCount(u, 'potion');

/** A fresh player unit from CHARS (null when the character has no stats yet). */
export function makeUnit(id: string): Unit | null {
  const c = CHARS[id];
  if (!c) return null;
  return { uid: 0, id: c.id, name: c.name, cls: c.cls, team: 'blue', lv: c.lv, exp: 0, hp: c.st.hp, st: { ...c.st }, gr: { ...c.gr }, wps: [...c.wps], eq: 0, x: 0, y: 0, done: false, hair: c.hair, potions: 3 };
}

/**
 * むずかしい：敵の能力への上乗せ（Lv+2 相当）。`index` = 章（0 = 第1章）。力/魔力は攻撃に使うほう（大きいほう）だけ、
 * もともと 0 の能力は上げない。
 * 一般の敵：HP+4・力/魔力+2・技・速さ・守備・魔防 +1。6章から HP・速さ +1、7章から技 +1 をさらに足す。
 * ただし8章（迷宮。崩落で道が狭まり、連戦で逃げ場が無い）は 6章からの HP・速さ +1 を足さない（むずかしいで突出して重かったため）。
 * ボス：HP+4・力/魔力・速さ・守備 +1。9・10章のボス（ガル・ファリオン、ダリウス、オルステッド、使徒）は HP+2・力/魔力 +1 だけ。
 * 武器を持たない置物（10章の結晶）は上げない。
 */
export function hardBonus(e: EnemyDef, index: number): Partial<Stats> {
  if (!e.wps.length) return {};
  if (e.boss) return index >= 8 ? { hp: 2, str: 1, mag: 1 } : { hp: 4, str: 1, mag: 1, spd: 1, def: 1 };
  const late = index >= 5 && index !== 7 ? 1 : 0, later = index >= 6 ? 1 : 0;
  return { hp: 4 + late, str: 2, mag: 2, skl: 1 + later, spd: 1 + late, def: 1, res: 1 };
}

/**
 * An enemy unit built from ENEMY_BASE + per-level growth. Bosses carry one potion (systems.md §1).
 * `hardIndex` = むずかしいのときの章（hardBonus を足す）。ふつうは undefined。
 */
export function makeEnemy(e: EnemyDef, uid: number, hardIndex?: number): Unit {
  const b = ENEMY_BASE[e.cls] ?? ENEMY_BASE.soldier, st = { ...b };
  for (const k of STAT_KEYS) st[k] += Math.floor((e.lv - 1) * (k === 'hp' ? 1.5 : k === 'lck' || k === 'res' ? 0.3 : 0.7));
  if (e.st) Object.assign(st, e.st);
  if (hardIndex !== undefined) {
    const atk: keyof Stats = st.mag > st.str ? 'mag' : 'str'; // 力/魔力は攻撃に使うほうだけ
    for (const [k, v] of Object.entries(hardBonus(e, hardIndex)) as [keyof Stats, number][]) if ((k === 'hp' || st[k] > 0) && ((k !== 'str' && k !== 'mag') || k === atk)) st[k] += v;
  }
  const u: Unit = { uid, id: e.cls, name: e.boss ?? (e.prefix ?? '野盗の') + CLASSES[e.cls].name, cls: e.cls, team: 'red', lv: e.lv, exp: 0, hp: st.hp, st, wps: [...e.wps], eq: 0, x: e.x, y: e.y, done: false, ai: e.ai, boss: !!e.boss, potions: e.boss ? 1 : 0, ...(e.defeat ? { defeat: e.defeat } : {}) };
  if (e.goal) u.goal = [...e.goal] as Tile;
  if (e.aiFrom) u.aiFrom = { ...e.aiFrom };
  if (e.retreatAt) u.retreatAt = e.retreatAt;
  if (e.unkillable) u.unkillable = true;
  if (e.tag) u.tag = e.tag;
  if (e.skills?.length) u.skills = [...e.skills];
  return u;
}

/** Who goes into a chapter before any choice: fixed members, the free slots, and who may fill them. */
export interface SortiePlan {
  /** Fixed members who will deploy (roster copy, or a fresh recruit), guests included. */
  fixed: { unit: Unit; guest: boolean; recruit: boolean }[];
  /** Fixed members who cannot deploy (classic `out`). */
  fixedOut: Unit[];
  /** Sortie cap (guests not counted) and slots left after the fixed members. */
  cap: number; free: number;
  /** Roster members that may fill the free slots (out units included; they can't be picked). */
  pool: Unit[];
  /** Default picks: the first `free` deployable pool members in roster order. */
  picks: string[];
  /** True when there are more deployable candidates than free slots (show the sortie screen). */
  choose: boolean;
}

export function sortiePlan(index: number, roster: Unit[] = []): SortiePlan {
  const ch = chapterDef(index);
  const fixed: SortiePlan['fixed'] = [], fixedOut: Unit[] = [], used = new Set<string>();
  for (const p of ch.players) {
    const kept = roster.find(r => r.id === p.id);
    used.add(p.id);
    if (kept?.out) { fixedOut.push(kept); continue; }
    const unit = kept ?? makeUnit(p.id);
    if (unit) fixed.push({ unit, guest: !!p.guest, recruit: !kept });
  }
  const nonGuest = fixed.filter(f => !f.guest).length;
  const cap = ch.sortie ?? nonGuest + (ch.slots?.length ?? 0);
  const free = Math.max(0, Math.min(cap - nonGuest, ch.slots?.length ?? 0));
  const pool = roster.filter(r => !used.has(r.id) && !r.guest);
  const ready = pool.filter(r => !r.out);
  return { fixed, fixedOut, cap, free, pool, picks: ready.slice(0, free).map(r => r.id), choose: free > 0 && ready.length > free };
}

/**
 * Builds a chapter. `roster` = the party carried over (absent on a new game).
 * Fixed `players` deploy first (recruits come from CHARS), then `slots` fill up to `sortie` (guests not counted):
 * from `picks` when given (the sortie screen), otherwise from the roster in order.
 * Units marked `out` never deploy; everyone not deployed waits on the bench.
 */
export function newChapter(index: number, roster?: Unit[], bonds?: Bonds, difficulty: Difficulty = 'casual', picks?: string[], hard = false): State {
  const ch = chapterDef(index);
  let uid = 1;
  const pool = roster ? clone(roster) : [];
  const units: Unit[] = [], used = new Set<string>();
  const deploy = (base: Unit, x: number, y: number, guest = false) => {
    used.add(base.id);
    units.push({ ...base, uid: uid++, x, y, hp: base.st.hp, done: false, potions: potionsAtStart(base), eq: 0, left: false, guest: guest || undefined, xp0: totalXp(base) });
  };
  for (const p of ch.players) {
    const kept = pool.find(r => r.id === p.id);
    used.add(p.id);
    if (kept?.out) continue;
    const base = kept ?? makeUnit(p.id);
    if (base) deploy(base, p.x, p.y, p.guest);
  }
  const plan = sortiePlan(index, pool);
  const order = (picks ?? plan.picks).map(id => pool.find(r => r.id === id)).filter((r): r is Unit => !!r && !used.has(r.id) && !r.out && !r.guest);
  const picked: string[] = [];
  (ch.slots ?? []).slice(0, plan.free).forEach((sl, i) => { if (order[i]) { deploy(order[i], sl.x, sl.y); picked.push(order[i].id); } });
  const bench = pool.filter(r => !used.has(r.id) && !r.guest);
  for (const e of ch.enemies) units.push(makeEnemy(e, uid++, hard ? index : undefined));
  return { chapter: index, turn: 1, phase: 'blue', units, map: [...ch.map], bonds: initBonds(bonds), difficulty, bench, flags: {}, picks: picked, ...(hard ? { hard: true } : {}) };
}

/**
 * Fills fields added after save v2 so older states keep working.
 * A mid-chapter save made on an older version of the chapter's map (the maps were redrawn) would put units on
 * tiles that may now be walls or water, so it restarts that chapter instead: same party (healed), same bonds
 * and difficulty, same chosen members, everyone back on the new starting tiles.
 */
export function upgradeState(s: State): State {
  s.bonds = initBonds(s.bonds);
  s.difficulty = s.difficulty === 'classic' ? 'classic' : 'casual';
  if (s.hard !== true) delete s.hard;
  s.bench = Array.isArray(s.bench) ? s.bench : [];
  s.flags = s.flags && typeof s.flags === 'object' ? s.flags : {};
  const ch = chapterDef(s.chapter);
  if (ch && !mapMatches(s.map, ch)) {
    const party = s.units.filter(u => u.team === 'blue' && !u.guest);
    const pool = [...party, ...s.bench].map(u => ({ ...clone(u), hp: u.st.hp, done: false, left: false }));
    return newChapter(s.chapter, pool, s.bonds, s.difficulty, s.picks ?? party.map(u => u.id), !!s.hard);
  }
  return s;
}

/** Whether a saved map is this chapter's map (tiles changed by its terrainChanges may hold either terrain). */
function mapMatches(map: unknown, ch: Chapter): boolean {
  if (!Array.isArray(map) || map.length !== ch.map.length) return false;
  return ch.map.every((row, y) => typeof map[y] === 'string' && map[y].length === row.length && [...row].every((t, x) =>
    map[y][x] === t || (ch.terrainChanges ?? []).some(c => c.to === map[y][x] && c.tiles.some(([tx, ty]) => tx === x && ty === y))));
}

// ---------- スキル（systems.md §4） ----------
/**
 * 戦闘中に有効なスキル（最大 SKILL_LIMIT 個）。味方：CharDef.skills（素質・固有）＋職業スキル（'school' は本人の流派）。
 * 敵：ボスの Unit.skills だけ（一般の敵は持たない）。
 */
export function skillsOf(u: Unit): string[] {
  if (u.team === 'red') return (u.skills ?? []).slice(0, SKILL_LIMIT);
  const c = CHARS[u.id], school = u.school ?? c?.school;
  const cls = (CLASSES[u.cls].skills ?? []).map(k => (k === 'school' ? school : k)).filter((k): k is string => !!k && !!SKILLS[k]);
  return [...(c?.skills ?? []), ...(u.skills ?? []), ...cls].filter((k, i, a) => a.indexOf(k) === i).slice(0, SKILL_LIMIT + (CLASSES[u.cls].tier === 2 ? 1 : 0));
}
export const hasSkill = (u: Unit, id: string) => skillsOf(u).includes(id);
/** 移動力（泥沼の減少込み。最低1）。 */
export const moveOf = (u: Unit) => Math.max(1, CLASSES[u.cls].mov - (u.slow ?? 0));
/** このユニットにとっての地形の移動コスト（獣の脚：森は1）。 */
export const moveCostFor = (u: Unit, t: string) => (t === 'F' && CLASSES[u.cls].mtype !== 'fly' && hasSkill(u, 'beastLegs') ? 1 : moveCost(t, CLASSES[u.cls].mtype));
/** マスを動く（突撃・狙い澄ましのために動いた距離を覚える）。 */
export function moveTo(u: Unit, x: number, y: number) { u.mv = dist(u, { x, y }); u.x = x; u.y = y; }
/** 敵軍フェイズの終わり：泥沼の効果を消す。 */
export function clearSlow(s: State) { for (const u of s.units) delete u.slow; }
/** 経験値のスキル補正：師の教え（隣のロキシー、本人以外）・自称天才。各 +20%。 */
export function expBoost(s: State, u: Unit, amount: number): number {
  let k = 1;
  if (hasSkill(u, 'genius')) k += 0.2;
  if (alive(s, u.team).some(a => a.uid !== u.uid && dist(a, u) === 1 && hasSkill(a, 'teacher'))) k += 0.2;
  return k === 1 ? amount : Math.round(amount * k);
}
/** 癒しの風：杖で `t` を回復したあと、t に隣接する他の味方を HP+3。回復した相手と量を返す（反映済み）。 */
export function healingWind(s: State, u: Unit, t: Unit): { unit: Unit; hp: number }[] {
  if (!hasSkill(u, 'healingWind')) return [];
  const out: { unit: Unit; hp: number }[] = [];
  for (const a of alive(s, u.team)) if (a !== t && dist(a, t) === 1 && a.hp < a.st.hp) { const h = Math.min(3, a.st.hp - a.hp); a.hp += h; out.push({ unit: a, hp: h }); }
  return out;
}
/** 使い魔の加護：`team` のフェイズ開始時、持ち主の2マス以内の味方（本人以外）を HP+3。回復した相手と量を返す（反映済み）。 */
export function familiarHeal(s: State, team: Team): { unit: Unit; hp: number }[] {
  const src = alive(s, team).filter(u => hasSkill(u, 'familiar'));
  if (!src.length) return [];
  const out: { unit: Unit; hp: number }[] = [];
  for (const a of alive(s, team)) if (a.hp < a.st.hp && src.some(p => p !== a && dist(p, a) <= 2)) { const h = Math.min(3, a.st.hp - a.hp); a.hp += h; out.push({ unit: a, hp: h }); }
  return out;
}

/** Dijkstra over the map. Returns reachable tiles (cost) and the predecessor of each. */
export function reachable(s: State, u: Unit, mov = moveOf(u), ignoreUnits = false) {
  const cost = new Map<string, number>([[key(u.x, u.y), 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[u.x, u.y, 0]];
  const mt = CLASSES[u.cls].mtype, legs = mt !== 'fly' && hasSkill(u, 'beastLegs');
  while (open.length) {
    open.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = open.shift()!;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= s.map.length || nx < 0 || nx >= s.map[0].length) continue;
      const other = unitAt(s, nx, ny);
      if (!ignoreUnits && other && other.team !== u.team) continue;
      const tt = s.map[ny][nx], nc = c + (legs && tt === 'F' ? 1 : moveCost(tt, mt));
      if (nc > mov || nc >= (cost.get(key(nx, ny)) ?? Infinity)) continue;
      cost.set(key(nx, ny), nc); prev.set(key(nx, ny), key(x, y)); open.push([nx, ny, nc]);
    }
  }
  return { cost, prev };
}

/** Tiles the unit may end its move on (reachable and not occupied by someone else). */
export function stopTiles(s: State, u: Unit) {
  const out = new Set<string>();
  for (const k of reachable(s, u).cost.keys()) {
    const [x, y] = k.split(',').map(Number);
    const o = unitAt(s, x, y);
    if (!o || o === u) out.add(k);
  }
  return out;
}

export const inRange = (w: Weapon, d: number) => d >= w.rng[0] && d <= w.rng[1];
const hasType = (u: Unit, t: string) => (CLASSES[u.cls].wtypes as string[]).includes(t);
/**
 * Attack weapons the unit's class allows: staves never attack or counter.
 * Fang classes always fight with the built-in 'fang' (they hold no weapons).
 */
export const usable = (u: Unit): string[] => {
  const own = u.wps.filter(w => WEAPONS[w] && WEAPONS[w].type !== 'staff' && hasType(u, WEAPONS[w].type));
  // Beast-kin with no fang weapon of their own fight with the shared 牙爪; monsters carry their own fangs.
  return hasType(u, 'fang') && !own.some(w => WEAPONS[w].type === 'fang') ? ['fang', ...own] : own;
};
/** Healing staves the unit may use. */
export const staves = (u: Unit): string[] => (hasType(u, 'staff') ? u.wps.filter(w => WEAPONS[w]?.type === 'staff') : []);
/** Might added to the fang attack: min(12, 3 + floor(effLv / 2)). */
export const fangMight = (u: Unit) => Math.min(FANG_MAX, FANG_BASE + Math.floor(effLv(u) / 2));
/** Effective might of a weapon for this unit (fang includes its level bonus). */
export const weaponMight = (u: Unit, w: Weapon) => w.mt + (w === WEAPONS.fang ? fangMight(u) : 0);
/** 特効（systems.md §2）：弓は飛行に、光魔術は魔物に、ほかは Weapon.eff に書いた種類に。 */
export function effective(w: Weapon, def: Unit): boolean {
  const c = CLASSES[def.cls];
  if (w.type === 'bow' && c.mtype === 'fly') return true;
  if (w.type === 'light' && c.monster) return true;
  return !!w.eff?.some(k => (k === 'monster' ? !!c.monster : c.mtype === k));
}
/** Display name: "牙爪（固有）威力N" for fang, otherwise the weapon's name. */
export const weaponLabel = (u: Unit, wid: string) => (wid === 'fang' ? `牙爪（固有）威力${fangMight(u)}` : WEAPONS[wid].name);

/** Every tile the unit could attack this turn from any stop tile (for range display). */
export function threatTiles(s: State, u: Unit, stops = stopTiles(s, u)) {
  const out = new Set<string>();
  const wps = usable(u);
  if (!wps.length) return out;
  const max = Math.max(...wps.map(w => WEAPONS[w].rng[1]));
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number);
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy), tx = x + dx, ty = y + dy;
      if (ty < 0 || ty >= s.map.length || tx < 0 || tx >= s.map[0].length) continue;
      if (wps.some(w => inRange(WEAPONS[w], d))) out.add(key(tx, ty));
    }
  }
  return out;
}

/**
 * 危険範囲：敵全員について、次の敵軍フェイズに攻撃が届くマスの和集合。待機型（guard）は今いるマスからの射程だけ。
 * 杖しか持たない敵は数えない。
 */
export function dangerTiles(s: State, team: Team = 'red') {
  const out = new Set<string>();
  for (const u of alive(s, team)) {
    if (u.retreated) continue;
    const st = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(s, u);
    for (const k of threatTiles(s, u, st)) out.add(k);
  }
  return out;
}

/**
 * block = 盾受け（守る側のエリナリーゼ）の発動率%。skills = この側に効いたスキル名（確定の補正。予測欄の補足）。
 */
export interface Side { dmg: number; hit: number; crit: number; double: boolean; w: Weapon; sup: SupportInfo; block: number; skills: string[] }
export interface Forecast { a: Side; d: Side | null }

/** 2マス以内の味方に王女の器を持つ者がいるか（本人を除く。複数いても +5 は1回）。 */
const royalNear = (s: State, u: Unit) => alive(s, u.team).some(a => a.uid !== u.uid && dist(a, u) <= 2 && hasSkill(a, 'royalVessel'));

/**
 * One direction of a combat. init = att is the one who started the fight (false for the counter).
 * mv = tiles att moved before attacking (突撃・狙い澄まし。init のときだけ使う)。
 */
function side(s: State, att: Unit, w: Weapon, def: Unit, dw: Weapon | null, init = true, mv = 0): Side {
  const A = skillsOf(att), D = skillsOf(def), used: string[] = [];
  const on = (id: string) => { used.push(SKILLS[id].name); return true; };
  let tri = dw ? (TRIANGLE[w.type] === dw.type ? 1 : TRIANGLE[dw.type] === w.type ? -1 : 0) : 0;
  if (tri < 0 && A.includes('northGod') && on('northGod')) tri = 0;
  const magic = MAGIC.includes(w.type), t = terrainAt(s, def.x, def.y);
  const flying = CLASSES[def.cls].mtype === 'fly';
  const sa = supportBonus(s, att), sd = supportBonus(s, def);
  let dmgB = 0, hitB = 0, critB = 0, avoB = 0, guard = 0, spdB = 0;
  // 攻める側
  if (init && A.includes('swordGod') && on('swordGod')) { hitB += 10; dmgB += 1; }
  if (!magic && A.includes('sore') && att.hp * 2 <= att.st.hp && on('sore')) dmgB += 3;
  if (A.includes('kingFlash')) critB += 10;
  if (A.includes('pride') && att.hp >= att.st.hp && on('pride')) hitB += 10;
  if (A.includes('monsterHunter') && CLASSES[def.cls].monster && on('monsterHunter')) { dmgB += 3; hitB += 10; }
  if (!magic && A.includes('godStrength')) guard -= Math.min(3, def.st.def);
  if (A.includes('preyScent') && def.hp * 2 <= def.st.hp && on('preyScent')) { hitB += 10; dmgB += 2; }
  if (!init && A.includes('stillWater') && on('stillWater')) hitB += 15;
  if (w.type === 'lance' && A.includes('spearEdge')) hitB += 10;
  if (w.type === 'anima' && A.includes('highMagic')) dmgB += 2;
  if (w.type === 'light' && A.includes('divineArts')) hitB += 10;
  if (init && mv >= 4 && A.includes('charge') && on('charge')) dmgB += 2;
  if (init && mv === 0 && A.includes('aim') && on('aim')) hitB += 15;
  if (magic && A.includes('muei')) spdB += 2;
  if (royalNear(s, att)) hitB += 5;
  if (alive(s, def.team).some(e => { const p = e.uid === def.uid ? def : e; return dist(p, att) === 1 && hasSkill(p, 'kingAura'); })) hitB -= 10;
  // 上級職の職業スキル（systems.md §4「上級職の職業スキル」）
  if (magic && A.includes('arcaneFocus') && on('arcaneFocus')) hitB += 10;
  if (init && A.includes('fightSpirit') && on('fightSpirit')) dmgB += 2;
  if (A.includes('warDemon') && att.hp * 2 <= att.st.hp && on('warDemon')) hitB += 10;
  if (!init && A.includes('counterBlade') && on('counterBlade')) dmgB += 2;
  if (A.includes('veteran')) hitB += 5;
  if (dist(att, def) === 2 && A.includes('torrent') && on('torrent')) dmgB += 2;
  if (magic && A.includes('wisdom') && on('wisdom')) critB += 10;
  if (init && A.includes('ferocity') && on('ferocity')) critB += 10;
  if (w.type === 'bow' && A.includes('trueShot') && on('trueShot')) hitB += 10;
  if (init && mv >= 4 && A.includes('horseArchery') && on('horseArchery')) hitB += 10;
  if (w.type === 'axe' && A.includes('mightyArm') && on('mightyArm')) dmgB += 2;
  if (w.type === 'light' && A.includes('holyLight') && on('holyLight')) dmgB += 2;
  if (alive(s, att.team).some(a => a.uid !== att.uid && dist(a, att) <= 2 && hasSkill(a, 'royalMight'))) critB += 5;
  const terrAvo = flying || A.includes('thirdEye') ? 0 : t.avo;
  if (D.includes('foresight')) avoB += 10;
  if (D.includes('warDemon') && def.hp * 2 <= def.st.hp) avoB += 10;
  if (D.includes('veteran')) avoB += 5;
  if (!magic && D.includes('bulwark') && alive(s, def.team).some(a => a.uid !== def.uid && dist(a, def) === 1)) guard += 2;
  if (init && D.includes('saintWard')) avoB += 10;
  if (!init && D.includes('shadowStep')) avoB += 10;
  if (!magic && init && D.includes('knightShield')) guard += 2;
  if (alive(s, def.team).some(a => a.uid !== def.uid && dist(a, def) === 1 && hasSkill(a, 'guardVow'))) avoB += 10;
  // 守る側
  if (D.includes('forestFolk') && s.map[def.y]?.[def.x] === 'F') avoB += 10;
  if (D.includes('pride') && def.hp >= def.st.hp) avoB += 10;
  if (royalNear(s, def)) avoB += 5;
  if (init && D.includes('waterGod')) dmgB -= 2;
  if (!magic && alive(s, def.team).some(a => a.uid !== def.uid && dist(a, def) === 1 && hasSkill(a, 'guardian'))) guard += 2;
  if (!magic && dist(att, def) === 2 && D.includes('shieldStance')) guard += 3;
  const dmg = Math.max(0, (magic ? att.st.mag : att.st.str) + weaponMight(att, w) * (effective(w, def) ? 2 : 1) + tri + sa.dmg + dmgB - (magic ? def.st.res + (D.includes('manaBarrier') ? 3 : 0) : def.st.def + guard) - (flying ? 0 : t.def));
  const hit = Math.round(w.hit + att.st.skl * 2 + att.st.lck / 2 + tri * 15 + sa.hit + hitB - (def.st.spd * 2 + def.st.lck + terrAvo + sd.avo + avoB));
  const crit = Math.round(w.crit + att.st.skl / 2 + (CLASSES[att.cls].crit ?? 0) + sa.crit + critB - def.st.lck);
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const block = init && D.includes('shieldBlock') ? Math.max(0, Math.min(30, def.st.skl)) : 0;
  const need = A.includes('beastInstinct') ? 3 : 4;
  return { dmg, hit: clamp(hit), crit: w.noCrit ? 0 : clamp(crit), double: att.st.spd + spdB - def.st.spd >= need, w, sup: sa, block, skills: used };
}

/** The weapon the defender counters with: equipped if it reaches, else the first that does. Staves never counter. */
export function counterWeapon(def: Unit, d: number): Weapon | null {
  const own = usable(def), order = [def.wps[def.eq], ...own].filter(w => w && own.includes(w));
  for (const id of order) if (id && inRange(WEAPONS[id], d)) return WEAPONS[id];
  return null;
}

/**
 * `from` = the tile the attacker will attack from (planning); omitted = where it stands now, having moved `att.mv` tiles.
 */
export function forecast(s: State, att: Unit, wid: string, def: Unit, from?: { x: number; y: number }): Forecast {
  const at = from ?? { x: att.x, y: att.y }, mv = from ? dist(att, from) : (att.mv ?? 0);
  const w = WEAPONS[wid], dw = counterWeapon(def, dist(at, def));
  // Evaluate terrain at the tile the attacker will stand on.
  const moved = { ...att, x: at.x, y: at.y };
  return { a: side(s, moved, w, def, dw, true, mv), d: dw ? side(s, def, dw, moved, w, false) : null };
}

/**
 * 連携攻撃：自軍から仕掛けたとき、仕掛けた本人に隣接する支援A以上（結婚＝S を含む）の相手が、敵に武器が届くなら
 * 最初の打ち合いのあとに確率で1回だけ攻撃を加える。発動率 = min(LINK_MAX, 5 + 相手の技)。複数いれば率の高い1人。
 */
export const LINK_RANK = 3, LINK_MAX = 25, LINK_NAME = '連携';
export interface Link { u: Unit; wid: string; rate: number; side: Side }
export function linkPartner(s: State, att: Unit, def: Unit): Link | null {
  if (att.team !== 'blue' || def.team === 'blue' || !s.bonds) return null;
  let best: Link | null = null;
  for (const p of alive(s, 'blue')) {
    if (p.uid === att.uid || p.out || dist(p, att) !== 1) continue;
    const pr = findPair(att.id, p.id);
    if (!pr || bondOf(s.bonds, pr).rank < LINK_RANK) continue;
    const d = dist(p, def), ws = usable(p).filter(w => inRange(WEAPONS[w], d));
    if (!ws.length) continue;
    const wid = ws.includes(p.wps[p.eq]) ? p.wps[p.eq] : ws[0];
    const rate = Math.min(LINK_MAX, 5 + p.st.skl);
    if (!best || rate > best.rate) best = { u: p, wid, rate, side: side(s, p, WEAPONS[wid], def, null, true, 1) };
  }
  return best;
}

/** skill = この一撃で出た確率発動などのスキル名（盾受け・泥沼。戦闘中に短く表示する）。 */
export interface Strike { from: Unit; to: Unit; dmg: number; hit: boolean; crit: boolean; skill?: string }
/** 抜け目なし：撃破1体ごとの銀（State.flags.loot にためて、章クリア時に所持金へ足す）。 */
export const SHREWD_GOLD = 30;

/** Resolves a full round of combat and applies HP changes. */
export function fight(s: State, att: Unit, wid: string, def: Unit, rnd = Math.random): Strike[] {
  if (att.wps.includes(wid)) att.eq = att.wps.indexOf(wid);
  const f = forecast(s, att, wid, def), out: Strike[] = [];
  const strike = (from: Unit, to: Unit, sd: Side) => {
    if (from.hp <= 0 || to.hp <= 0 || from.retreated || to.retreated) return;
    const hit = rnd() * 100 < sd.hit, crit = hit && rnd() * 100 < sd.crit;
    // 盾受け（確率で半減）・頑強（必殺は2倍）。
    const block = hit && sd.block > 0 && rnd() * 100 < sd.block;
    let raw = sd.dmg * (crit ? (hasSkill(to, 'sturdy') ? 2 : 3) : 1);
    if (block) raw = Math.floor(raw / 2);
    // 撃破不可（M3）：HP は 1 で止まる。撤退するボスも倒れずに撤退する（「撃破＝撤退」。HP は 1 以上残る）。
    const dmg = hit ? Math.min(to.unkillable || to.retreatAt ? to.hp - 1 : to.hp, raw) : 0;
    to.hp -= dmg;
    // 泥沼：魔術が当たった相手は次の敵軍フェイズの移動力 -2。
    const mud = hit && to.hp > 0 && MAGIC.includes(sd.w.type) && hasSkill(from, 'mudslide');
    if (mud) to.slow = 2;
    out.push({ from, to, dmg, hit, crit, ...(block ? { skill: SKILLS.shieldBlock.name } : mud ? { skill: SKILLS.mudslide.name } : {}) });
    // 撤退（M3）：HP が retreatAt の割合以下になったら、その場で戦いをやめて盤面から下がる。
    if (to.retreatAt && to.hp > 0 && to.hp <= to.st.hp * to.retreatAt) { to.retreated = true; to.left = true; }
  };
  strike(att, def, f.a);
  if (f.d) strike(def, att, f.d);
  const link = linkPartner(s, att, def);
  if (link && def.hp > 0 && !def.retreated && att.hp > 0 && rnd() * 100 < link.rate) {
    const n = out.length;
    strike(link.u, def, link.side);
    if (out.length > n) out[n].skill = LINK_NAME;
  }
  if (f.a.double) strike(att, def, f.a);
  if (f.d?.double) strike(def, att, f.d);
  for (const [k, v] of [[att, def], [def, att]] as const) if (v.hp <= 0 && k.hp > 0 && hasSkill(k, 'shrewd')) s.flags.loot = (Number(s.flags.loot) || 0) + SHREWD_GOLD;
  return out;
}

/** Experience a player unit earns from a round against `foe`. */
export function expGain(u: Unit, foe: Unit, strikes: Strike[]): number {
  // 格上の相手ほど多く（追いつきやすく）、格下は控えめに（balance-report.md）。
  const diff = effLv(foe) - effLv(u), up = Math.max(0, diff), down = Math.min(0, diff);
  if ((foe.hp <= 0 || foe.retreated) && strikes.some(k => k.from === u && k.hit)) return Math.max(15, Math.min(100, 40 + up * 8 + down * 5 + (foe.boss ? 30 : 0)));
  if (strikes.some(k => k.from === u && k.dmg > 0)) return Math.max(5, Math.min(36, 12 + up * 3 + down * 2));
  return 1;
}

/** Adds exp; on level-up rolls each stat against its growth rate and returns the gains. */
export function addExp(u: Unit, amount: number, rnd = Math.random): Partial<Stats> | null {
  if (!u.gr || u.lv >= 20) return null;
  u.exp += amount;
  if (u.exp < 100) return null;
  u.exp -= 100; u.lv++;
  const gains: Partial<Stats> = {};
  for (const k of STAT_KEYS) if (rnd() * 100 < u.gr[k]) { u.st[k]++; gains[k] = 1; }
  if (gains.hp) u.hp++;
  return gains;
}

// ---------- healing (systems.md §1) ----------

/** HP a staff restores on `t`: staff value + floor(mag / 2), capped at the target's missing HP. */
export function healAmount(u: Unit, wid: string, t: Unit): number {
  const w = WEAPONS[wid];
  return Math.max(0, Math.min(t.st.hp - t.hp, (w.heal ?? 0) + Math.floor(u.st.mag / 2) + (hasSkill(u, 'healArts') ? 2 : 0) + (hasSkill(u, 'graceLight') ? 3 : 0)));
}
/** Experience for a heal: 10 + floor(healed / 2), at most 25. */
export const healExp = (healed: number) => Math.min(25, 10 + Math.floor(healed / 2));
/** Wounded allies (not the user) within the staff's range from `from`. Full-HP allies can't be targeted. */
export function healTargets(s: State, u: Unit, wid: string, from = { x: u.x, y: u.y }): Unit[] {
  const w = WEAPONS[wid];
  return alive(s, u.team).filter(t => t !== u && t.hp < t.st.hp && inRange(w, dist(from, t)));
}
/** Applies a heal and returns the HP restored. */
export function heal(u: Unit, wid: string, t: Unit): number {
  const h = healAmount(u, wid, t);
  t.hp += h;
  return h;
}
/** Potion strength (傷薬). */
export const POTION_HEAL = 10;

export interface Plan { x: number; y: number; target?: Unit; wid?: string; heal?: Unit; potion?: boolean }

/** Healer AI: best heal reachable this turn (systems.md §1), or null. */
function planHeal(s: State, u: Unit, stops: Set<string>, foes: Unit[]): Plan | null {
  let best: Plan | null = null, bestScore = -Infinity, bestSafe = -Infinity;
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number);
    const safe = foes.length ? Math.min(...foes.map(f => dist({ x, y }, f))) : 0;
    for (const sid of staves(u)) for (const t of healTargets(s, u, sid, { x, y })) {
      const amt = healAmount(u, sid, t), full = (WEAPONS[sid].heal ?? 0) + Math.floor(u.st.mag / 2) + (hasSkill(u, 'healArts') ? 2 : 0) + (hasSkill(u, 'graceLight') ? 3 : 0);
      if (t.st.hp - t.hp < full / 2) continue;
      const score = amt + (t.boss ? 8 : 0);
      if (score > bestScore || (score === bestScore && safe > bestSafe)) { bestScore = score; bestSafe = safe; best = { x, y, heal: t, wid: sid }; }
    }
  }
  return best;
}

/** Decides what an enemy does: heal (healers), best attack it can reach, a boss potion, otherwise advance (unless guarding). */
export function planEnemy(s: State, u: Unit): Plan {
  const foes = alive(s, u.team === 'red' ? 'blue' : 'red');
  if (u.ai === 'target' && u.goal) return planTarget(s, u, foes);
  const stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(s, u);
  if (staves(u).length) {
    const h = planHeal(s, u, stops, foes);
    if (h) return h;
  }
  let best: Plan | null = null, bestScore = -Infinity, canKill = false;
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number);
    for (const t of foes) for (const wid of usable(u)) {
      if (!inRange(WEAPONS[wid], dist({ x, y }, t))) continue;
      const f = forecast(s, u, wid, t, { x, y });
      const out = Math.min(t.hp, f.a.dmg * (f.a.double ? 2 : 1)) * f.a.hit / 100;
      const back = f.d ? f.d.dmg * (f.d.double ? 2 : 1) * f.d.hit / 100 : 0;
      const kills = f.a.dmg * (f.a.double ? 2 : 1) >= t.hp;
      const kill = kills ? 40 * f.a.hit / 100 : 0;
      if (kills && f.a.hit > 0) canKill = true;
      // 御身大事（王女）：撃破できないなら狙いにくい。
      const score = out + kill - back * 0.4 + terrainAt(s, x, y).avo / 20 + (staves(t).length ? 6 : 0) - (!kills && hasSkill(t, 'protectMe') ? 5 : 0);
      if (score > bestScore) { bestScore = score; best = { x, y, target: t, wid }; }
    }
  }
  // Boss potion: at 1/3 HP or less, when no attack looks like a kill.
  if (u.boss && u.potions > 0 && u.hp <= u.st.hp / 3 && !canKill) return { x: u.x, y: u.y, potion: true };
  if (best) return best;
  if (u.ai !== 'charge' || !foes.length) return { x: u.x, y: u.y };
  if (staves(u).length) {
    // Healer with nothing to heal: stand next to the nearest ally, on the tile farthest from the foes.
    const allies = alive(s, u.team).filter(a => a !== u).sort((a, b) => dist(a, u) - dist(b, u));
    if (allies.length) {
      const a = allies[0];
      const cands = [...stops].map(k => k.split(',').map(Number)).filter(([x, y]) => dist({ x, y }, a) === 1);
      if (cands.length) {
        const far = (x: number, y: number) => Math.min(...foes.map(f => dist({ x, y }, f)));
        cands.sort((p, q) => far(q[0], q[1]) - far(p[0], p[1]));
        return { x: cands[0][0], y: cands[0][1] };
      }
    }
  }
  // Advance: walk the shortest path toward the nearest foe as far as this turn allows.
  const full = reachable(s, u, 99, true);
  const near = foes.map(t => ({ t, c: full.cost.get(key(t.x, t.y)) ?? Infinity })).sort((a, b) => a.c - b.c)[0];
  if (near.c === Infinity) return { x: u.x, y: u.y };
  let k: string | undefined = key(near.t.x, near.t.y);
  while (k && !stops.has(k)) k = full.prev.get(k);
  const [x, y] = (k ?? key(u.x, u.y)).split(',').map(Number);
  return { x, y };
}

/** The tile on the way to (gx, gy) farthest along the shortest path that `u` can stop on this turn (null if unreachable). */
function stepToward(s: State, u: Unit, gx: number, gy: number, stops = stopTiles(s, u)): Tile | null {
  const full = reachable(s, u, 99, true);
  if (!full.cost.has(key(gx, gy))) return null;
  let k: string | undefined = key(gx, gy);
  while (k && !stops.has(k)) k = full.prev.get(k);
  return k ? (k.split(',').map(Number) as Tile) : null;
}
/**
 * ai 'target'（M2）：目標マスへ最短で向かう（7章のバラクの逃走、6章の食糧庫）。攻撃は、止まったマスから届く相手にだけ。
 * 目標に着いたらそこに留まり、届く相手がいれば攻撃する。
 */
function planTarget(s: State, u: Unit, foes: Unit[]): Plan {
  const [gx, gy] = u.goal!;
  const stops = stopTiles(s, u);
  // 目標マスを相手がふさいでいるときは、その相手に届くマスまで寄って攻撃する（立ち止まらない）。
  const blocker = foes.find(f => f.x === gx && f.y === gy);
  if (blocker && !(u.x === gx && u.y === gy)) {
    let best: Plan | null = null, bestScore = -Infinity;
    for (const k of stops) {
      const [x, y] = k.split(',').map(Number);
      for (const wid of usable(u)) {
        if (!inRange(WEAPONS[wid], dist({ x, y }, blocker))) continue;
        const f = forecast(s, u, wid, blocker, { x, y });
        const score = Math.min(blocker.hp, f.a.dmg * (f.a.double ? 2 : 1)) * f.a.hit / 100 - (f.d ? f.d.dmg * (f.d.double ? 2 : 1) * f.d.hit / 100 : 0) * 0.4;
        if (score > bestScore) { bestScore = score; best = { x, y, target: blocker, wid }; }
      }
    }
    if (best) return best;
  }
  const to = stepToward(s, u, gx, gy, stops) ?? [u.x, u.y];
  let best: Plan = { x: to[0], y: to[1] }, bestScore = -Infinity;
  for (const t of foes) for (const wid of usable(u)) {
    if (!inRange(WEAPONS[wid], dist({ x: to[0], y: to[1] }, t))) continue;
    const f = forecast(s, u, wid, t, { x: to[0], y: to[1] });
    const score = Math.min(t.hp, f.a.dmg * (f.a.double ? 2 : 1)) * f.a.hit / 100;
    if (score > bestScore) { bestScore = score; best = { x: to[0], y: to[1], target: t, wid }; }
  }
  return best;
}
/** M2：aiFrom のターンに達した敵のAIを切り替える（敵軍フェイズの開始時に呼ぶ）。切り替えた敵を返す。 */
export function applyAiSwitch(s: State): Unit[] {
  const out: Unit[] = [];
  for (const u of alive(s, 'red')) {
    if (!u.aiFrom || s.turn < u.aiFrom.turn) continue;
    u.ai = u.aiFrom.ai;
    if (u.aiFrom.goal) u.goal = [...u.aiFrom.goal] as Tile;
    delete u.aiFrom;
    out.push(u);
  }
  return out;
}

/**
 * The party carried into the next chapter: deployed units plus the bench, healed and ready.
 * Fallen units come back next chapter on casual; on classic they are marked `out` for good. Guests leave.
 */
export function rosterOf(s: State): Unit[] {
  const deployed = s.units.filter(u => u.team === 'blue' && !u.guest).map(u => {
    const c = clone(u);
    if (u.hp <= 0 && s.difficulty === 'classic') c.out = true;
    // 使った傷薬は配られた分から減らし、買った傷薬は残りの数までにする。
    if (itemCount(c, 'potion')) setItemCount(c, 'potion', Math.min(itemCount(c, 'potion'), Math.max(0, u.potions)));
    return c;
  });
  return [...deployed, ...clone(s.bench ?? [])].map(u => ({ ...u, hp: u.st.hp, done: false, left: false, x: 0, y: 0 }));
}

/** The members picked for the free slots of this chapter (older states: everyone deployed who isn't a guest). */
export const chapterPicks = (s: State): string[] => (Array.isArray(s.picks) ? [...s.picks] : s.units.filter(u => u.team === 'blue' && !u.guest).map(u => u.id));

// ---------- bench experience (systems.md §5) ----------

/** 控えが得る割合：出撃した仲間がその章で得た経験値の平均 × 0.3。 */
export const BENCH_SHARE = 0.3;
/** 累計経験値（実効Lv × 100 + EXP）。 */
export const totalXp = (u: Unit) => effLv(u) * 100 + u.exp;
export interface BenchGain { id: string; name: string; exp: number; fromLv: number; lv: number; ups: Partial<Stats>[] }
/**
 * 章クリア時：出撃しなかった名簿の仲間（離脱中・ゲストは除く）に、出撃した仲間（ゲスト除く）がこの章で得た経験値の
 * 平均の30%を与える。レベルアップは addExp の通常の成長の抽選。`roster` は rosterOf(s) の結果（書き換える）。
 */
export function benchExp(s: State, roster: Unit[], rnd = Math.random): BenchGain[] {
  const blue = s.units.filter(u => u.team === 'blue' && !u.guest);
  const fought = blue.filter(u => u.gr && typeof u.xp0 === 'number');
  if (!fought.length) return [];
  const avg = fought.reduce((a, u) => a + Math.max(0, totalXp(u) - u.xp0!), 0) / fought.length;
  const share = Math.floor(avg * BENCH_SHARE);
  if (share <= 0) return [];
  const went = new Set(blue.map(u => u.id));
  return roster.filter(u => !went.has(u.id) && !u.out && !u.guest && u.gr && u.lv < 20).map(u => {
    const fromLv = u.lv, ups: Partial<Stats>[] = [];
    let left = share;
    while (left > 0 && u.lv < 20) {
      const step = Math.min(left, 100 - u.exp);
      left -= step;
      const g = addExp(u, step, rnd);
      if (g) ups.push(g);
    }
    return { id: u.id, name: u.name, exp: share, fromLv, lv: u.lv, ups };
  });
}

// ---------- stages (M1) ----------

/** The current stage (0 = the chapter's own win/enemies; 1… = Chapter.stages[n - 1]). Kept in State.flags so it is saved. */
export const stageOf = (s: State) => (typeof s.flags?.stage === 'number' ? s.flags.stage : 0);
/** Win / lose / reinforcements / music of a stage (later stages inherit lose and bgm from the stage before). */
export function stageWin(ch: Chapter, stage: number): WinCond { return stage > 0 && ch.stages?.[stage - 1] ? ch.stages[stage - 1].win : ch.win; }
export function stageLose(ch: Chapter, stage: number): LoseCond | undefined {
  for (let i = stage; i > 0; i--) { const l = ch.stages?.[i - 1]?.lose; if (l) return l; }
  return ch.lose;
}
export function stageReinforce(ch: Chapter, stage: number): Reinforce[] { return (stage > 0 ? ch.stages?.[stage - 1]?.reinforce : ch.reinforce) ?? []; }
export function stageBgm(ch: Chapter, stage: number): Chapter['bgm'] {
  let out: Chapter['bgm'] = { ...(ch.bgm ?? {}) };
  for (let i = 1; i <= stage; i++) out = { ...out, ...(ch.stages?.[i - 1]?.bgm ?? {}) };
  return out;
}
export const stageCount = (ch: Chapter) => 1 + (ch.stages?.length ?? 0);
const curChapter = (s: State) => chapterDef(s.chapter);
export const curWin = (s: State) => stageWin(curChapter(s), stageOf(s));

/** The nearest free, walkable tile to (x, y) for `mtype` (for allies joining on an occupied tile). */
function freeTileNear(s: State, x: number, y: number, mtype: Unit): Tile {
  const ok = (tx: number, ty: number) => ty >= 0 && ty < s.map.length && tx >= 0 && tx < s.map[0].length && !unitAt(s, tx, ty) && isFinite(moveCost(s.map[ty][tx], CLASSES[mtype.cls].mtype));
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.abs(dx) + Math.abs(dy) !== r) continue;
    if (ok(x + dx, y + dy)) return [x + dx, y + dy];
  }
  return [x, y];
}
/** Puts an ally on the map mid-chapter (stage change): a roster member if benched, else a fresh unit from CHARS. */
export function addAlly(s: State, a: AllyDef): Unit | null {
  const fromBench = s.bench.findIndex(b => b.id === a.id && !b.out);
  const base = fromBench >= 0 ? s.bench.splice(fromBench, 1)[0] : makeUnit(a.id);
  if (!base || s.units.some(u => u.team === 'blue' && u.id === a.id && onMap(u))) return null;
  const u: Unit = { ...clone(base), uid: Math.max(0, ...s.units.map(v => v.uid)) + 1, hp: base.st.hp, done: false, left: false, potions: potionsAtStart(base), eq: 0, guest: a.guest || undefined, xp0: totalXp(base) };
  [u.x, u.y] = freeTileNear(s, a.x, a.y, u);
  s.units.push(u);
  return u;
}
export interface StageChange { stage: number; added: Unit[]; removed: Unit[]; foes: Unit[]; terrain: Tile[] }
/**
 * Moves to the next stage: removes the listed enemies, adds allies and enemies, applies the stage's terrain changes.
 * Turn numbering carries on. Units that have not acted keep their action.
 */
export function advanceStage(s: State): StageChange | null {
  const ch = curChapter(s), next = stageOf(s) + 1, st = ch.stages?.[next - 1];
  if (!st) return null;
  s.flags.stage = next;
  const removed: Unit[] = [];
  for (const u of alive(s, 'red')) if (st.remove === 'all' || (st.remove ?? []).includes(bossId(u) ?? '')) { u.left = true; removed.push(u); }
  const added = (st.allies ?? []).map(a => addAlly(s, a)).filter((u): u is Unit => !!u);
  let uid = Math.max(0, ...s.units.map(u => u.uid)) + 1;
  const foes = (st.enemies ?? []).map(e => { const u = makeEnemy(e, uid++, s.hard ? s.chapter : undefined); [u.x, u.y] = freeTileNear(s, e.x, e.y, u); s.units.push(u); return u; });
  const terrain = applyTerrainChanges(s, 'stage');
  return { stage: next, added, removed, foes, terrain };
}

// ---------- terrain changes (M5) ----------

/**
 * Applies due terrain changes: those of the current stage (`when` = 'stage') or of turns reached so far ('turn').
 * Tiles with a unit on them wait (they change at a later call, once empty). Returns the tiles changed.
 */
export function applyTerrainChanges(s: State, when: 'stage' | 'turn' | 'both' = 'both'): Tile[] {
  const out: Tile[] = [];
  const dueOf = (c: TerrainChange) => c.stage !== undefined ? stageOf(s) >= c.stage : c.turn !== undefined && s.turn >= c.turn && when !== 'stage';
  // 崩落（通れない地形への変化）で味方が閉じ込められないように：変化する一帯の中にいる味方から、崩れない場所までの最短の道は残す
  // （そのマスは味方が抜けたあとのフェイズで変わる。8章の崩落）。
  const keep = new Set<string>();
  const closing = new Set<string>();
  const doomed = new Set<string>(); // これから通れなくなるマス（まだ時期が来ていないものも含む）。逃げ先はその外。
  for (const c of curChapter(s).terrainChanges ?? []) if (moveCost(c.to, 'foot') === Infinity) for (const [x, y] of c.tiles) {
    doomed.add(x + ',' + y);
    if (dueOf(c) && s.map[y]?.[x] !== c.to) closing.add(x + ',' + y);
  }
  if (closing.size) for (const u of s.units) {
    if (u.team !== 'blue' || !onMap(u) || !closing.has(u.x + ',' + u.y)) continue;
    const mt = CLASSES[u.cls].mtype, prev = new Map<string, string>([[u.x + ',' + u.y, '']]), q: Tile[] = [[u.x, u.y]];
    let end = '';
    while (q.length && !end) {
      const [x, y] = q.shift()!;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Tile[]) {
        const k = nx + ',' + ny;
        if (prev.has(k) || s.map[ny]?.[nx] === undefined || moveCost(s.map[ny][nx], mt) === Infinity) continue;
        prev.set(k, x + ',' + y);
        if (!doomed.has(k)) { end = k; break; }
        q.push([nx, ny]);
      }
    }
    for (let k = end && prev.get(end)!; k; k = prev.get(k)!) keep.add(k);
  }
  (curChapter(s).terrainChanges ?? []).forEach(c => {
    if (!dueOf(c)) return;
    for (const [x, y] of c.tiles) {
      if (s.map[y]?.[x] === undefined || s.map[y][x] === c.to || unitAt(s, x, y) || keep.has(x + ',' + y)) continue;
      s.map[y] = s.map[y].slice(0, x) + c.to + s.map[y].slice(x + 1);
      out.push([x, y]);
    }
  });
  return out;
}

// ---------- victory / defeat (systems.md §7) ----------

/** Lose condition of the current stage with defaults: ルーデウス always counts. */
export function loseCond(ch: Chapter, stage = 0): LoseCond {
  const l = stageLose(ch, stage);
  const units = [...new Set(['rudeus', ...(l?.units ?? [])])];
  return { units, tile: l?.tile, tiles: l?.tiles, tileBy: l?.tileBy };
}
/** Tiles enemies must not reach (lose.tile + lose.tiles). */
export const guardTiles = (lc: LoseCond): Tile[] => [...(lc.tile ? [lc.tile] : []), ...(lc.tiles ?? [])];
/** Turns limit for survive / defend stages (null otherwise). */
export const turnLimit = (w: WinCond) => (w.type === 'survive' || w.type === 'defend' ? w.turns : null);
/** Turns left to hold out, counting the current one (null when the stage has no turn limit). */
export function turnsLeft(s: State): number | null {
  const n = turnLimit(curWin(s));
  return n === null ? null : Math.max(0, n - s.turn + 1);
}
/** Enemies that count for rout / hold-out wins (unkillable ones never fall). */
const foesToBeat = (s: State) => alive(s, 'red').filter(u => !u.unkillable);
/** Boss-flag enemies of the current stage that can fall all fell (or retreated). */
function bossesDown(s: State): boolean {
  const bosses = s.units.filter(u => u.team === 'red' && u.boss && !u.unkillable && !(u.left && !u.retreated));
  return bosses.length ? bosses.every(u => u.hp <= 0 || u.retreated) : !foesToBeat(s).length;
}

/**
 * Reads the stage's win / lose data. Call after every action and after each phase change.
 * Turn-based wins (survive / defend) fire once the last turn's enemy phase is over (turn > turns, blue phase).
 * 'stage' = this stage is won and another follows (call advanceStage).
 */
export function outcome(s: State): 'win' | 'lose' | 'stage' | null {
  const ch = curChapter(s), stage = stageOf(s), lc = loseCond(ch, stage);
  const blue = s.units.filter(u => u.team === 'blue');
  if (blue.some(u => u.hp <= 0 && (lc.units.includes(u.id) || u.guest))) return 'lose';
  if (!alive(s, 'blue').length && !blue.some(u => u.left)) return 'lose';
  const gt = guardTiles(lc);
  if (gt.length && alive(s, 'red').some(u => (!lc.tileBy || bossId(u) === lc.tileBy) && gt.some(([x, y]) => u.x === x && u.y === y))) return 'lose';
  const w = stageWin(ch, stage);
  let won = false;
  switch (w.type) {
    case 'rout': won = !foesToBeat(s).length; break;
    case 'boss': won = bossesDown(s); break;
    case 'seize': won = !!s.flags?.[`seized${stage || ''}`]; break;
    case 'escape':
      won = blue.some(u => u.left) && !alive(s, 'blue').length;
      // 手詰まり：残っている味方の誰も、地形の上で出口へたどり着けなくなったら（崩落で道が塞がった等）敗北。
      // 敵は倒せば通れるので数えない（地形だけで判定）。
      if (!won && alive(s, 'blue').length && !alive(s, 'blue').some(u => {
        const { cost } = reachable(s, u, Infinity, true);
        return w.tiles.some(([x, y]) => cost.has(key(x, y)));
      })) return 'lose';
      break;
    // Holding out also ends early once every enemy is down and no reinforcement is still due.
    case 'defend': case 'survive':
      won = (s.turn > w.turns && s.phase === 'blue') || (!w.strictTurns && ((!foesToBeat(s).length && !reinforcementsPending(s)) || (!!w.orBoss && s.units.some(u => u.team === 'red' && u.boss) && bossesDown(s))));
      break;
  }
  if (!won) return null;
  return stage + 1 < stageCount(ch) ? 'stage' : 'win';
}
/** Flag name set by the 制圧 command (per stage, so a seize stage after another works). */
export const seizeFlag = (s: State) => `seized${stageOf(s) || ''}`;

/** Whether `u` may seize on its current tile (ルーデウス, or win.by, on a seize tile). */
export function canSeize(s: State, u: Unit): boolean {
  const w = curWin(s);
  return w.type === 'seize' && u.team === 'blue' && u.id === (w.by ?? 'rudeus') && w.tiles.some(([x, y]) => x === u.x && y === u.y);
}
/** Whether `u` may leave the map from its current tile (escape stages). */
export function canEscape(s: State, u: Unit): boolean {
  const w = curWin(s);
  return w.type === 'escape' && u.team === 'blue' && w.tiles.some(([x, y]) => x === u.x && y === u.y);
}
/** Tiles to highlight on the map: goal (seize / escape) and guard (tiles enemies must not reach). */
export function markedTiles(s: State): { goal: Tile[]; guard: Tile[] } {
  const w = curWin(s);
  return { goal: w.type === 'seize' || w.type === 'escape' ? w.tiles : [], guard: guardTiles(loseCond(curChapter(s), stageOf(s))) };
}

// ---------- 宝箱・訪問マス（M13。VisitDef） ----------
/** 開けた・訪問したの印（State.flags。章の途中のセーブにそのまま残る）。 */
export const visitFlag = (v: VisitDef) => `visit:${v.x},${v.y}`;
export const visitDone = (s: State, v: VisitDef) => !!s.flags[visitFlag(v)];
/** 失われた（崩落などでマスが通れなくなった）。 */
export const visitLost = (s: State, v: VisitDef) => moveCost(s.map[v.y]?.[v.x] ?? 'Q', 'foot') === Infinity;
/** 盤面に描くもの：まだ残っているもの（open = 開けた後）。失われたものは描かない。 */
export const shownVisits = (s: State) => (curChapter(s).visits ?? []).filter(v => !visitLost(s, v)).map(v => ({ v, open: visitDone(s, v) }));
/**
 * `u` がいまの位置で開けられる・訪問できるもの。味方だけ（敵は開けない）。
 * 村は同じマスで。宝箱は同じマスで、鍵開け（リニア）なら隣のマスからでも。
 */
export function visitsFor(s: State, u: Unit): VisitDef[] {
  if (u.team !== 'blue' || !onMap(u)) return [];
  const pick = hasSkill(u, 'lockpick');
  return (curChapter(s).visits ?? []).filter(v => !visitDone(s, v) && !visitLost(s, v) &&
    (dist(u, v) === 0 || (v.kind === 'chest' && pick && dist(u, v) === 1)));
}

// ---------- 副目標（章の評価。Chapter.bonus） ----------
export interface ObjState { o: Objective; text: string; ok: boolean; failed: boolean }
/** 各副目標のいまの状態。ok = いま章を終えれば達成、failed = もう達成できない。 */
export function objectives(s: State): ObjState[] {
  const ch = curChapter(s);
  return (ch.bonus ?? []).map(o => {
    let ok = false, failed = false, text = '';
    if (o.type === 'turns') { ok = s.turn <= o.max; failed = !ok; text = `${o.max}ターン以内にクリア`; }
    else if (o.type === 'noLoss') { failed = s.units.some(u => u.team === 'blue' && !u.guest && u.hp <= 0); ok = !failed; text = '誰も倒れずにクリア'; }
    else if (o.type === 'visits') {
      const vs = (ch.visits ?? []).filter(v => !o.kind || v.kind === o.kind), n = vs.filter(v => visitDone(s, v)).length;
      ok = n === vs.length; failed = vs.some(v => !visitDone(s, v) && visitLost(s, v));
      text = `${o.kind === 'village' ? '訪問マス' : o.kind === 'chest' ? '宝箱' : '宝箱・訪問マス'}をすべて調べる（${n}/${vs.length}）`;
    } else {
      const b = s.units.find(u => bossId(u) === o.boss);
      ok = !!b && (b.hp <= 0 || !!b.retreated); text = `${b?.name ?? o.boss}を倒す`;
    }
    return { o, text: o.label ? o.label.replace('{n}', text.match(/（\d+\/\d+）/)?.[0] ?? '') : text, ok, failed };
  });
}

const rfFlag = (stage: number, wi: number, ei: number) => (stage ? `rf${stage}.${wi}_${ei}` : `rf${wi}_${ei}`);
/** Whether a wave's source (Reinforce.from) is gone, so it will never come. */
const sourceGone = (s: State, w: Reinforce) => !!w.from && !alive(s, 'red').some(u => u.tag === w.from);
/** Whether any reinforcement of the current stage may still appear. */
export function reinforcementsPending(s: State): boolean {
  const st = stageOf(s);
  return stageReinforce(curChapter(s), st).some((w, wi) => !sourceGone(s, w) && w.units.some((_, ei) => !s.flags[rfFlag(st, wi, ei)]));
}

/**
 * Reinforcements due at the start of this enemy phase. A wave whose tile is occupied waits for the next turn
 * (per unit); a wave whose source (from) has fallen never comes. Returns the units placed; `appeared` receives the
 * index of each wave that appeared for the first time.
 */
export function spawnReinforcements(s: State, appeared?: number[]): Unit[] {
  const st = stageOf(s), waves = stageReinforce(curChapter(s), st), out: Unit[] = [];
  let uid = Math.max(0, ...s.units.map(u => u.uid)) + 1;
  waves.forEach((w, wi) => {
    if (sourceGone(s, w)) return;
    w.units.forEach((e, ei) => {
      const f = rfFlag(st, wi, ei);
      if (s.flags[f] || s.turn < w.turn || unitAt(s, e.x, e.y)) return;
      const first = !w.units.some((_, j) => s.flags[rfFlag(st, wi, j)]);
      const u = makeEnemy(e, uid++, s.hard ? s.chapter : undefined);
      s.units.push(u); s.flags[f] = true; out.push(u);
      if (first) appeared?.push(wi);
    });
  });
  return out;
}

// ---------- battle conversations ----------

/** Flag (in State.flags, so it is saved) marking a battle conversation as played. */
export const talkKey = (scene: string) => `talk:${scene}`;
/** Character id of a boss unit (from its name, e.g. 野盗頭ガズ → gaz), or null. */
export const bossId = (u: Unit) => (u.boss && u.team === 'red' ? idForName(u.name) : null);
const TALK_ORDER: TalkWhen['type'][] = ['firstFight', 'bossFight'];
/** Whether everyone in `needs` is on the map (allies by id, enemies by boss id). */
export function needsMet(s: State, needs?: string[]): boolean {
  return !needs?.length || needs.every(id => s.units.some(u => onMap(u) && (u.team === 'blue' ? u.id === id : bossId(u) === id)));
}
/**
 * This chapter's battle conversations that match `test` and have not played yet: data order, except that
 * firstFight comes before bossFight when one combat sets off both. Talks whose `needs` are not on the map are left out.
 */
export function dueTalks(s: State, test: (w: TalkWhen) => boolean): TalkEvent[] {
  const pri = (w: TalkWhen) => { const i = TALK_ORDER.indexOf(w.type); return i < 0 ? TALK_ORDER.length : i; };
  return (curChapter(s).talks ?? []).filter(e => !s.flags[talkKey(e.scene)] && test(e.when) && needsMet(s, e.needs)).sort((a, b) => pri(a.when) - pri(b.when));
}
/**
 * Conversations a combat between `a` and `b` sets off (before the fight is shown). A boss fight with a member who
 * has a dedicated version (bossFight.unit) plays only that version; `skip` receives the generic ones to mark as played.
 */
export function fightTalks(s: State, a: Unit, b: Unit, skip: TalkEvent[] = []): TalkEvent[] {
  const blue = [a, b].filter(u => u.team === 'blue').map(u => u.id), bosses = [a, b].map(bossId).filter((x): x is string => !!x);
  const all = dueTalks(s, w =>
    (w.type === 'firstFight' && blue.includes(w.unit)) ||
    (w.type === 'bossFight' && bosses.includes(w.boss) && (!w.unit || blue.includes(w.unit))));
  const special = new Set(all.filter(e => e.when.type === 'bossFight' && e.when.unit).map(e => (e.when as { boss: string }).boss));
  return all.filter(e => {
    if (e.when.type === 'bossFight' && !e.when.unit && special.has(e.when.boss)) { skip.push(e); return false; }
    return true;
  });
}

const nameOf = (id: string) => CAST[id]?.name ?? CHARS[id]?.name ?? id;
/** The goal line shown under the map, generated from the current stage's data. */
export function goalText(ch: Chapter, stage = 0): string {
  const w = stageWin(ch, stage);
  const orBoss = (w.type === 'survive' || w.type === 'defend') && w.orBoss ? '・ボスの撃破' : '';
  const early = (w.type === 'survive' || w.type === 'defend') && w.strictTurns ? '' : `（敵の全滅${orBoss}でも勝利）`;
  const win = w.type === 'rout' ? '敵の全滅' : w.type === 'boss' ? 'ボスの撃破' : w.type === 'seize' ? (w.by && w.by !== 'rudeus' ? `${nameOf(w.by)}が` : '') + '指定地点（金の枠）の制圧'
    : w.type === 'escape' ? '全員が離脱地点（金の枠）から離脱' : w.type === 'defend' ? `${w.turns}ターン守り切る${early}` : `${w.turns}ターン耐える${early}`;
  const lc = loseCond(ch, stage);
  const guests = [...ch.players.filter(p => p.guest).map(p => p.id), ...(ch.stages ?? []).slice(0, stage).flatMap(st => (st.allies ?? []).filter(a => a.guest).map(a => a.id))];
  const who = [...lc.units, ...guests.filter(id => !lc.units.includes(id))]; // guests always count
  const tileBoss = lc.tileBy && [...ch.enemies, ...(ch.stages ?? []).flatMap(st => st.enemies ?? [])].find(e => e.boss && idForName(e.boss) === lc.tileBy)?.boss;
  const tileWho = lc.tileBy ? `${tileBoss ?? nameOf(lc.tileBy)}の` : '敵の';
  const lose = (who.length <= 2 ? who.map(nameOf).join('または') + 'の敗走' : who.map(nameOf).join('、') + 'のいずれかの敗走') + (guardTiles(lc).length ? `、または${tileWho}防衛地点（赤の枠）への侵入` : '');
  const n = stageCount(ch);
  return `${n > 1 ? `【${stage === 0 ? '前半' : n === 2 ? '後半' : `第${stage + 1}段`}】` : ''}勝利条件：${win}　／　敗北条件：${lose}`;
}


// ---------- supports ----------

export const pairKey = (a: string, b: string) => (a < b ? a + '+' + b : b + '+' + a);
export const findPair = (a: string, b: string) => SUPPORTS.find(p => pairKey(p.a, p.b) === pairKey(a, b));
export const rankName = (r: number) => (r > 0 ? RANKS[r - 1] : '—');
export const maxRank = (p: SupportPair) => RANKS.indexOf(p.max) + 1;

/** Fills in every defined pair (with its starting points) so saves always hold the full table. */
export function initBonds(src?: Bonds): Bonds {
  const out: Bonds = {};
  for (const p of SUPPORTS) {
    const k = pairKey(p.a, p.b), b = src?.[k];
    // `start` is a floor: pairs whose start was raised after a save was made still get it.
    out[k] = b ? { pts: b.rank > 0 ? b.pts : Math.max(b.pts, p.start ?? 0), rank: b.rank, ...(typeof b.deferred === 'number' ? { deferred: b.deferred } : {}) } : { pts: p.start ?? 0, rank: 0 };
  }
  return out;
}
const bondOf = (bonds: Bonds, p: SupportPair): Bond => bonds[pairKey(p.a, p.b)] ?? { pts: p.start ?? 0, rank: 0 };

export const sLimit = (id: string) => S_LIMIT[id] ?? S_LIMIT_DEFAULT;
export function sCount(bonds: Bonds, id: string) {
  return SUPPORTS.filter(p => (p.a === id || p.b === id) && bondOf(bonds, p).rank >= 4).length;
}
/** Both partners still have room for another S (romance) partner. */
export const sAllowed = (bonds: Bonds, p: SupportPair) => sCount(bonds, p.a) < sLimit(p.a) && sCount(bonds, p.b) < sLimit(p.b);

/** Points needed for the next rank this pair can reach, or null when it is maxed out. */
export function nextNeed(p: SupportPair, b: Bond): number | null {
  return b.rank >= maxRank(p) ? null : RANK_PTS[RANKS[b.rank]];
}
/** deferred = 告白を保留した章のあいだ（cleared を渡したときだけ判定）。 */
export type BondStatus = 'growing' | 'ready' | 'sBlocked' | 'deferred' | 'max';
export function bondStatus(bonds: Bonds, p: SupportPair, cleared?: number): BondStatus {
  const b = bondOf(bonds, p), need = nextNeed(p, b);
  if (need === null) return 'max';
  if (b.pts < need) return 'growing';
  if (b.rank === 3 && !sAllowed(bonds, p)) return 'sBlocked';
  if (b.rank === 3 && cleared !== undefined && b.deferred === cleared) return 'deferred';
  return 'ready';
}
/** Pairs whose next support conversation can play now, in data order (a confession deferred this chapter waits). */
export const readyPairs = (bonds: Bonds, cleared?: number) => SUPPORTS.filter(p => bondStatus(bonds, p, cleared) === 'ready');

// ---------- confession & marriage (world.md §5) ----------

/** 結婚候補：ルーデウスと S まで行ける組の相手（world.md §5.1 の7人）。データ順。 */
export const CANDIDATES: string[] = SUPPORTS.filter(p => p.max === 'S' && (p.a === 'rudeus' || p.b === 'rudeus')).map(p => (p.a === 'rudeus' ? p.b : p.a));
/** ルーデウス×候補の S 会話は告白イベント（選択肢つき）。 */
export const isConfession = (p: SupportPair) => p.max === 'S' && (p.a === 'rudeus' || p.b === 'rudeus');
/** 結婚している相手（ルーデウスと S の候補）。候補の順。 */
export const marriedTo = (bonds: Bonds): string[] => CANDIDATES.filter(id => (bonds[pairKey('rudeus', id)]?.rank ?? 0) >= 4);
/** 告白の答え。accept = 応える：S・結婚確定。defer = 応えられない：A のまま、次の章のクリア後にもう一度。 */
export function answerConfession(bonds: Bonds, p: SupportPair, accept: boolean, cleared: number): SupportRank | null {
  if (accept) { const r = rankUp(bonds, p); if (r) delete bonds[pairKey(p.a, p.b)].deferred; return r; }
  const k = pairKey(p.a, p.b);
  bonds[k] = { ...bondOf(bonds, p), deferred: cleared };
  return null;
}
/** Makes sure every id in `ids` is married (repairs a save whose married list and bonds disagree). */
export function ensureMarried(bonds: Bonds, ids: string[]) {
  for (const id of ids) {
    const p = findPair('rudeus', id);
    if (!p || !isConfession(p) || marriedTo(bonds).length >= sLimit('rudeus')) continue;
    const k = pairKey(p.a, p.b);
    bonds[k] = { pts: Math.max(bonds[k]?.pts ?? 0, RANK_PTS.S), rank: 4 };
  }
}

/** Confirms the next rank (call after its conversation). Returns the new rank letter. */
export function rankUp(bonds: Bonds, p: SupportPair): SupportRank | null {
  if (bondStatus(bonds, p) !== 'ready') return null;
  const k = pairKey(p.a, p.b), b = bonds[k] = { ...bondOf(bonds, p) };
  b.rank++;
  return RANKS[b.rank - 1];
}

/** Adds points to a pair, stopping at the threshold of the next reachable rank. Returns points actually added. */
export function addBond(bonds: Bonds, p: SupportPair, amount: number): number {
  const k = pairKey(p.a, p.b), b = bonds[k] = { ...bondOf(bonds, p) };
  const need = nextNeed(p, b);
  if (need === null) return 0;
  const before = b.pts;
  b.pts = Math.min(need, b.pts + amount);
  return b.pts - before;
}

export interface SupportInfo extends SupportBonus { from: { id: string; name: string; rank: SupportRank }[] }

/** Combat bonus from supported allies within SUPPORT_RANGE of `u` (u's x/y may be a planned tile). */
export function supportBonus(s: State, u: Unit): SupportInfo {
  const out: SupportInfo = { hit: 0, avo: 0, crit: 0, dmg: 0, from: [] };
  if (u.team !== 'blue' || !s.bonds) return out;
  for (const o of s.units) {
    if (o.uid === u.uid || o.team !== u.team || o.hp <= 0 || dist(o, u) > SUPPORT_RANGE) continue;
    const p = findPair(u.id, o.id);
    if (!p) continue;
    const r = bondOf(s.bonds, p).rank;
    if (!r) continue;
    const rk = RANKS[r - 1], b = SUPPORT_BONUS[rk];
    out.hit += b.hit; out.avo += b.avo; out.crit += b.crit; out.dmg += b.dmg;
    out.from.push({ id: o.id, name: o.name, rank: rk });
  }
  out.hit = Math.min(out.hit, SUPPORT_CAP.hit); out.avo = Math.min(out.avo, SUPPORT_CAP.avo);
  out.crit = Math.min(out.crit, SUPPORT_CAP.crit); out.dmg = Math.min(out.dmg, SUPPORT_CAP.dmg);
  return out;
}

export interface BondGain { unit: Unit; partner: Unit; pair: SupportPair; added: number; ready: boolean }

/** After a combat: each surviving blue fighter earns points with every adjacent surviving partner. */
export function gainBonds(s: State, fighters: Unit[]): BondGain[] {
  const out: BondGain[] = [];
  const seen = new Set<string>();
  for (const u of fighters) {
    if (u.team !== 'blue' || u.hp <= 0 || u.out) continue;
    for (const o of alive(s, 'blue')) {
      if (o === u || o.out || dist(o, u) !== 1) continue;
      const p = findPair(u.id, o.id);
      if (!p || seen.has(pairKey(p.a, p.b))) continue;
      seen.add(pairKey(p.a, p.b));
      const added = addBond(s.bonds, p, SUPPORT_GAIN);
      if (added > 0) out.push({ unit: u, partner: o, pair: p, added, ready: bondStatus(s.bonds, p) === 'ready' });
    }
  }
  return out;
}

// ---------- class change ----------

export const tierOf = (cls: string) => CLASSES[cls].tier ?? 1;
/** Level used for experience maths: promoted units count as +10. */
export const effLv = (u: Unit) => u.lv + (tierOf(u.cls) === 2 ? 10 : 0);

export function reqMet(u: Unit, r: PromoReq): boolean {
  if (r.kind === 'lv') return u.lv >= r.min;
  return (u.arts?.[r.art] ?? 0) >= r.min;
}
export interface PromoOption { to: string; ok: boolean; unmet: PromoReq[] }
/** Promotion choices for a unit (empty when its class has none or it is already promoted). */
export function promoOptions(u: Unit): PromoOption[] {
  if (tierOf(u.cls) !== 1) return [];
  return (PROMOS[u.cls] ?? []).map(p => {
    const unmet = p.req.filter(r => !reqMet(u, r));
    return { to: p.to, ok: !unmet.length, unmet };
  });
}
export const canPromote = (u: Unit) => promoOptions(u).some(o => o.ok);

export interface PromoResult { gains: Partial<Stats>; gift: string | null; oldLv: number }
/** Applies a class change: new class, Lv 1 / EXP 0, stat bonus, and a starter weapon for a new weapon type. */
export function promote(u: Unit, to: string): PromoResult | null {
  const opt = promoOptions(u).find(o => o.to === to);
  if (!opt?.ok) return null;
  const c = CLASSES[to], gains = { ...(c.bonus ?? {}) }, oldLv = u.lv;
  for (const k of STAT_KEYS) u.st[k] += gains[k] ?? 0;
  u.hp = Math.min(u.st.hp, u.hp + (gains.hp ?? 0));
  u.cls = to; u.lv = 1; u.exp = 0;
  let gift: string | null = null;
  if (c.gift && u.wps.length < WEAPON_SLOTS && !u.wps.some(w => WEAPONS[w].type === WEAPONS[c.gift!].type)) { u.wps.push(c.gift); gift = c.gift; }
  if (!usable(u).includes(u.wps[u.eq])) u.eq = Math.max(0, u.wps.findIndex(w => usable(u).includes(w)));
  return { gains, gift, oldLv };
}
