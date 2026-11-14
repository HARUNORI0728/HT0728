// Pure game rules: movement, combat math, level-ups, enemy AI. No DOM access here.
import {
  CAST, CHARS, chapterDef, CLASSES, ENEMY_BASE, FANG_BASE, FANG_MAX, MAGIC, PROMOS, RANKS, RANK_PTS, STAT_KEYS, SUPPORTS, SUPPORT_BONUS, SUPPORT_CAP, SUPPORT_GAIN, SUPPORT_RANGE,
  S_LIMIT, S_LIMIT_DEFAULT, TERRAIN, TRIANGLE, WEAPONS, moveCost,
  type AllyDef, type ArtId, type Chapter, type EnemyAI, type EnemyDef, type LoseCond, type Reinforce, type Tile, type WinCond, type PromoReq, type Stats, type SupportBonus, type SupportPair, type SupportRank, type TalkEvent, type TalkWhen, type Team, type Weapon,
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
}
/**
 * Bond progress per pair (key = pairKey). rank: 0 = none, 1 = C … 4 = S.
 * deferred = 告白に「応えられない」と答えた章（camp.cleared の値）。その章のあいだは告白が起きず、次の章のクリア後にまた起きる。
 */
export interface Bond { pts: number; rank: number; deferred?: number }
export type Bonds = Record<string, Bond>;
export type Difficulty = 'casual' | 'classic';
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { casual: 'カジュアル', classic: 'クラシック' };
/**
 * bench = 出撃しなかった名簿の仲間（離脱者を含む）。章クリア時に名簿へ戻す。
 * flags = 章の進行フラグ（seized・増援の出現済みなど）。
 */
export interface State {
  chapter: number; turn: number; phase: Team; units: Unit[]; map: string[]; bonds: Bonds;
  difficulty: Difficulty; bench: Unit[]; flags: Record<string, number | boolean>;
}

export const key = (x: number, y: number) => x + ',' + y;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const onMap = (u: Unit) => u.hp > 0 && !u.left;
export const unitAt = (s: State, x: number, y: number) => s.units.find(u => onMap(u) && u.x === x && u.y === y);
export const alive = (s: State, team: Team) => s.units.filter(u => onMap(u) && u.team === team);
export const terrainAt = (s: State, x: number, y: number) => TERRAIN[s.map[y][x]];

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** A fresh player unit from CHARS (null when the character has no stats yet). */
export function makeUnit(id: string): Unit | null {
  const c = CHARS[id];
  if (!c) return null;
  return { uid: 0, id: c.id, name: c.name, cls: c.cls, team: 'blue', lv: c.lv, exp: 0, hp: c.st.hp, st: { ...c.st }, gr: { ...c.gr }, wps: [...c.wps], eq: 0, x: 0, y: 0, done: false, hair: c.hair, potions: 3 };
}

/** An enemy unit built from ENEMY_BASE + per-level growth. Bosses carry one potion (systems.md §1). */
export function makeEnemy(e: EnemyDef, uid: number): Unit {
  const b = ENEMY_BASE[e.cls] ?? ENEMY_BASE.soldier, st = { ...b };
  for (const k of STAT_KEYS) st[k] += Math.floor((e.lv - 1) * (k === 'hp' ? 1.5 : k === 'lck' || k === 'res' ? 0.3 : 0.7));
  if (e.st) Object.assign(st, e.st);
  const u: Unit = { uid, id: e.cls, name: e.boss ?? (e.prefix ?? '野盗の') + CLASSES[e.cls].name, cls: e.cls, team: 'red', lv: e.lv, exp: 0, hp: st.hp, st, wps: [...e.wps], eq: 0, x: e.x, y: e.y, done: false, ai: e.ai, boss: !!e.boss, potions: e.boss ? 1 : 0, ...(e.defeat ? { defeat: e.defeat } : {}) };
  if (e.goal) u.goal = [...e.goal] as Tile;
  if (e.aiFrom) u.aiFrom = { ...e.aiFrom };
  if (e.retreatAt) u.retreatAt = e.retreatAt;
  if (e.unkillable) u.unkillable = true;
  if (e.tag) u.tag = e.tag;
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
export function newChapter(index: number, roster?: Unit[], bonds?: Bonds, difficulty: Difficulty = 'casual', picks?: string[]): State {
  const ch = chapterDef(index);
  let uid = 1;
  const pool = roster ? clone(roster) : [];
  const units: Unit[] = [], used = new Set<string>();
  const deploy = (base: Unit, x: number, y: number, guest = false) => {
    used.add(base.id);
    units.push({ ...base, uid: uid++, x, y, hp: base.st.hp, done: false, potions: 3, left: false, guest: guest || undefined });
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
  (ch.slots ?? []).slice(0, plan.free).forEach((sl, i) => { if (order[i]) deploy(order[i], sl.x, sl.y); });
  const bench = pool.filter(r => !used.has(r.id) && !r.guest);
  for (const e of ch.enemies) units.push(makeEnemy(e, uid++));
  return { chapter: index, turn: 1, phase: 'blue', units, map: [...ch.map], bonds: initBonds(bonds), difficulty, bench, flags: {} };
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
  s.bench = Array.isArray(s.bench) ? s.bench : [];
  s.flags = s.flags && typeof s.flags === 'object' ? s.flags : {};
  const ch = chapterDef(s.chapter);
  if (ch && !mapMatches(s.map, ch)) {
    const party = s.units.filter(u => u.team === 'blue' && !u.guest);
    const pool = [...party, ...s.bench].map(u => ({ ...clone(u), hp: u.st.hp, done: false, left: false }));
    return newChapter(s.chapter, pool, s.bonds, s.difficulty, party.map(u => u.id));
  }
  return s;
}

/** Whether a saved map is this chapter's map (tiles changed by its terrainChanges may hold either terrain). */
function mapMatches(map: unknown, ch: Chapter): boolean {
  if (!Array.isArray(map) || map.length !== ch.map.length) return false;
  return ch.map.every((row, y) => typeof map[y] === 'string' && map[y].length === row.length && [...row].every((t, x) =>
    map[y][x] === t || (ch.terrainChanges ?? []).some(c => c.to === map[y][x] && c.tiles.some(([tx, ty]) => tx === x && ty === y))));
}

/** Dijkstra over the map. Returns reachable tiles (cost) and the predecessor of each. */
export function reachable(s: State, u: Unit, mov = CLASSES[u.cls].mov, ignoreUnits = false) {
  const cost = new Map<string, number>([[key(u.x, u.y), 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[u.x, u.y, 0]];
  const mt = CLASSES[u.cls].mtype;
  while (open.length) {
    open.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = open.shift()!;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= s.map.length || nx < 0 || nx >= s.map[0].length) continue;
      const other = unitAt(s, nx, ny);
      if (!ignoreUnits && other && other.team !== u.team) continue;
      const nc = c + moveCost(s.map[ny][nx], mt);
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

export interface Side { dmg: number; hit: number; crit: number; double: boolean; w: Weapon; sup: SupportInfo }
export interface Forecast { a: Side; d: Side | null }

function side(s: State, att: Unit, w: Weapon, def: Unit, dw: Weapon | null): Side {
  const tri = dw ? (TRIANGLE[w.type] === dw.type ? 1 : TRIANGLE[dw.type] === w.type ? -1 : 0) : 0;
  const magic = MAGIC.includes(w.type), t = terrainAt(s, def.x, def.y);
  const flying = CLASSES[def.cls].mtype === 'fly';
  const sa = supportBonus(s, att), sd = supportBonus(s, def);
  const dmg = Math.max(0, (magic ? att.st.mag : att.st.str) + weaponMight(att, w) * (effective(w, def) ? 2 : 1) + tri + sa.dmg - (magic ? def.st.res : def.st.def) - (flying ? 0 : t.def));
  const hit = Math.round(w.hit + att.st.skl * 2 + att.st.lck / 2 + tri * 15 + sa.hit - (def.st.spd * 2 + def.st.lck + (flying ? 0 : t.avo) + sd.avo));
  const crit = Math.round(w.crit + att.st.skl / 2 + (CLASSES[att.cls].crit ?? 0) + sa.crit - def.st.lck);
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return { dmg, hit: clamp(hit), crit: clamp(crit), double: att.st.spd - def.st.spd >= 4, w, sup: sa };
}

/** The weapon the defender counters with: equipped if it reaches, else the first that does. Staves never counter. */
export function counterWeapon(def: Unit, d: number): Weapon | null {
  const own = usable(def), order = [def.wps[def.eq], ...own].filter(w => w && own.includes(w));
  for (const id of order) if (id && inRange(WEAPONS[id], d)) return WEAPONS[id];
  return null;
}

export function forecast(s: State, att: Unit, wid: string, def: Unit, from = { x: att.x, y: att.y }): Forecast {
  const w = WEAPONS[wid], dw = counterWeapon(def, dist(from, def));
  // Evaluate terrain at the tile the attacker will stand on.
  const moved = { ...att, x: from.x, y: from.y };
  return { a: side(s, moved, w, def, dw), d: dw ? side(s, def, dw, moved, w) : null };
}

export interface Strike { from: Unit; to: Unit; dmg: number; hit: boolean; crit: boolean }

/** Resolves a full round of combat and applies HP changes. */
export function fight(s: State, att: Unit, wid: string, def: Unit, rnd = Math.random): Strike[] {
  if (att.wps.includes(wid)) att.eq = att.wps.indexOf(wid);
  const f = forecast(s, att, wid, def), out: Strike[] = [];
  const strike = (from: Unit, to: Unit, sd: Side) => {
    if (from.hp <= 0 || to.hp <= 0 || from.retreated || to.retreated) return;
    const hit = rnd() * 100 < sd.hit, crit = hit && rnd() * 100 < sd.crit;
    // 撃破不可（M3）：HP は 1 で止まる。撤退するボスも倒れずに撤退する（「撃破＝撤退」。HP は 1 以上残る）。
    const dmg = hit ? Math.min(to.unkillable || to.retreatAt ? to.hp - 1 : to.hp, sd.dmg * (crit ? 3 : 1)) : 0;
    to.hp -= dmg; out.push({ from, to, dmg, hit, crit });
    // 撤退（M3）：HP が retreatAt の割合以下になったら、その場で戦いをやめて盤面から下がる。
    if (to.retreatAt && to.hp > 0 && to.hp <= to.st.hp * to.retreatAt) { to.retreated = true; to.left = true; }
  };
  strike(att, def, f.a);
  if (f.d) strike(def, att, f.d);
  if (f.a.double) strike(att, def, f.a);
  if (f.d?.double) strike(def, att, f.d);
  return out;
}

/** Experience a player unit earns from a round against `foe`. */
export function expGain(u: Unit, foe: Unit, strikes: Strike[]): number {
  const diff = effLv(foe) - effLv(u);
  if ((foe.hp <= 0 || foe.retreated) && strikes.some(k => k.from === u && k.hit)) return Math.max(15, Math.min(100, 40 + diff * 5 + (foe.boss ? 30 : 0)));
  if (strikes.some(k => k.from === u && k.dmg > 0)) return Math.max(5, Math.min(30, 12 + diff * 2));
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
  return Math.max(0, Math.min(t.st.hp - t.hp, (w.heal ?? 0) + Math.floor(u.st.mag / 2)));
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
      const amt = healAmount(u, sid, t), full = (WEAPONS[sid].heal ?? 0) + Math.floor(u.st.mag / 2);
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
      const score = out + kill - back * 0.4 + terrainAt(s, x, y).avo / 20 + (staves(t).length ? 6 : 0);
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
    return c;
  });
  return [...deployed, ...clone(s.bench ?? [])].map(u => ({ ...u, hp: u.st.hp, done: false, left: false, x: 0, y: 0 }));
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
  const u: Unit = { ...clone(base), uid: Math.max(0, ...s.units.map(v => v.uid)) + 1, hp: base.st.hp, done: false, left: false, potions: 3, guest: a.guest || undefined };
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
  const foes = (st.enemies ?? []).map(e => { const u = makeEnemy(e, uid++); [u.x, u.y] = freeTileNear(s, e.x, e.y, u); s.units.push(u); return u; });
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
  (curChapter(s).terrainChanges ?? []).forEach(c => {
    const due = c.stage !== undefined ? stageOf(s) >= c.stage : c.turn !== undefined && s.turn >= c.turn && when !== 'stage';
    if (!due) return;
    for (const [x, y] of c.tiles) {
      if (s.map[y]?.[x] === undefined || s.map[y][x] === c.to || unitAt(s, x, y)) continue;
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
    case 'escape': won = blue.some(u => u.left) && !alive(s, 'blue').length; break;
    // Holding out also ends early once every enemy is down and no reinforcement is still due.
    case 'defend': case 'survive':
      won = (s.turn > w.turns && s.phase === 'blue') || (!foesToBeat(s).length && !reinforcementsPending(s)) || (!!w.orBoss && s.units.some(u => u.team === 'red' && u.boss) && bossesDown(s));
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
      const u = makeEnemy(e, uid++);
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
  const win = w.type === 'rout' ? '敵の全滅' : w.type === 'boss' ? 'ボスの撃破' : w.type === 'seize' ? (w.by && w.by !== 'rudeus' ? `${nameOf(w.by)}が` : '') + '指定地点（金の枠）の制圧'
    : w.type === 'escape' ? '全員が離脱地点（金の枠）から離脱' : w.type === 'defend' ? `${w.turns}ターン守り切る（敵の全滅${orBoss}でも勝利）` : `${w.turns}ターン耐える（敵の全滅${orBoss}でも勝利）`;
  const lc = loseCond(ch, stage);
  const guests = [...ch.players.filter(p => p.guest).map(p => p.id), ...(ch.stages ?? []).slice(0, stage).flatMap(st => (st.allies ?? []).filter(a => a.guest).map(a => a.id))];
  const who = [...lc.units, ...guests.filter(id => !lc.units.includes(id))]; // guests always count
  const tileWho = lc.tileBy ? `${nameOf(lc.tileBy)}の` : '敵の';
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
  if (c.gift && !u.wps.some(w => WEAPONS[w].type === WEAPONS[c.gift!].type)) { u.wps.push(c.gift); gift = c.gift; }
  if (!usable(u).includes(u.wps[u.eq])) u.eq = Math.max(0, u.wps.findIndex(w => usable(u).includes(w)));
  return { gains, gift, oldLv };
}
