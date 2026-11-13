// Pure game rules: movement, combat math, level-ups, enemy AI. No DOM access here.
import {
  CAST, CHAPTERS, CHARS, CLASSES, ENEMY_BASE, FANG_BASE, FANG_MAX, MAGIC, PROMOS, RANKS, RANK_PTS, STAT_KEYS, SUPPORTS, SUPPORT_BONUS, SUPPORT_CAP, SUPPORT_GAIN, SUPPORT_RANGE,
  S_LIMIT, S_LIMIT_DEFAULT, TERRAIN, TRIANGLE, WEAPONS, moveCost,
  type ArtId, type Chapter, type EnemyDef, type LoseCond, type PromoReq, type Stats, type SupportBonus, type SupportPair, type SupportRank, type TalkEvent, type TalkWhen, type Team, type Weapon,
} from './data';
import { idForName } from './render/who';

export interface Unit {
  uid: number; id: string; name: string; cls: string; team: Team;
  lv: number; exp: number; hp: number; st: Stats; gr?: Stats;
  wps: string[]; eq: number; x: number; y: number; done: boolean;
  /** charge: always advance. hold: move only to attack. guard: never leave its tile. */
  ai?: 'charge' | 'hold' | 'guard'; boss?: boolean; hair?: string; potions: number;
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
/** Bond progress per pair (key = pairKey). rank: 0 = none, 1 = C … 4 = S. */
export interface Bond { pts: number; rank: number }
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
  return { uid, id: e.cls, name: e.boss ?? (e.prefix ?? '野盗の') + CLASSES[e.cls].name, cls: e.cls, team: 'red', lv: e.lv, exp: 0, hp: st.hp, st, wps: [...e.wps], eq: 0, x: e.x, y: e.y, done: false, ai: e.ai, boss: !!e.boss, potions: e.boss ? 1 : 0, ...(e.defeat ? { defeat: e.defeat } : {}) };
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
  const ch = CHAPTERS[index];
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
  const ch = CHAPTERS[index];
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
  return { chapter: index, turn: 1, phase: 'blue', units, map: ch.map, bonds: initBonds(bonds), difficulty, bench, flags: {} };
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
  const ch = CHAPTERS[s.chapter];
  if (ch && (!Array.isArray(s.map) || s.map.join('/') !== ch.map.join('/'))) {
    const party = s.units.filter(u => u.team === 'blue' && !u.guest);
    const pool = [...party, ...s.bench].map(u => ({ ...clone(u), hp: u.st.hp, done: false, left: false }));
    return newChapter(s.chapter, pool, s.bonds, s.difficulty, party.map(u => u.id));
  }
  return s;
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
export const usable = (u: Unit): string[] =>
  hasType(u, 'fang') ? ['fang'] : u.wps.filter(w => WEAPONS[w] && WEAPONS[w].type !== 'staff' && hasType(u, WEAPONS[w].type));
/** Healing staves the unit may use. */
export const staves = (u: Unit): string[] => (hasType(u, 'staff') ? u.wps.filter(w => WEAPONS[w]?.type === 'staff') : []);
/** Might added to the fang attack: min(12, 3 + floor(effLv / 2)). */
export const fangMight = (u: Unit) => Math.min(FANG_MAX, FANG_BASE + Math.floor(effLv(u) / 2));
/** Effective might of a weapon for this unit (fang includes its level bonus). */
export const weaponMight = (u: Unit, w: Weapon) => w.mt + (w.type === 'fang' ? fangMight(u) : 0);
/** Display name: "牙爪（固有）威力N" for fang, otherwise the weapon's name. */
export const weaponLabel = (u: Unit, wid: string) => (WEAPONS[wid].type === 'fang' ? `牙爪（固有）威力${fangMight(u)}` : WEAPONS[wid].name);

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
  const dmg = Math.max(0, (magic ? att.st.mag : att.st.str) + weaponMight(att, w) + tri + sa.dmg - (magic ? def.st.res : def.st.def) - (flying ? 0 : t.def));
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
    if (from.hp <= 0 || to.hp <= 0) return;
    const hit = rnd() * 100 < sd.hit, crit = hit && rnd() * 100 < sd.crit;
    const dmg = hit ? Math.min(to.hp, sd.dmg * (crit ? 3 : 1)) : 0;
    to.hp -= dmg; out.push({ from, to, dmg, hit, crit });
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
  if (foe.hp <= 0 && strikes.some(k => k.from === u && k.hit)) return Math.max(15, Math.min(100, 40 + diff * 5 + (foe.boss ? 30 : 0)));
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
  const stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(s, u);
  const foes = alive(s, u.team === 'red' ? 'blue' : 'red');
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

// ---------- victory / defeat (systems.md §7) ----------

/** Lose condition with defaults: ルーデウス always counts. */
export function loseCond(ch: Chapter): LoseCond {
  const units = [...new Set(['rudeus', ...(ch.lose?.units ?? [])])];
  return { units, tile: ch.lose?.tile };
}
/** Turns limit for survive / defend chapters (null otherwise). */
export const turnLimit = (ch: Chapter) => (ch.win.type === 'survive' || ch.win.type === 'defend' ? ch.win.turns : null);
/** Turns left to hold out, counting the current one (null when the chapter has no turn limit). */
export function turnsLeft(s: State): number | null {
  const n = turnLimit(CHAPTERS[s.chapter]);
  return n === null ? null : Math.max(0, n - s.turn + 1);
}

/**
 * Reads the chapter's win / lose data. Call after every action and after each phase change.
 * Turn-based wins (survive / defend) fire once the last turn's enemy phase is over (turn > turns, blue phase).
 */
export function outcome(s: State): 'win' | 'lose' | null {
  const ch = CHAPTERS[s.chapter], lc = loseCond(ch);
  const blue = s.units.filter(u => u.team === 'blue');
  if (blue.some(u => u.hp <= 0 && (lc.units.includes(u.id) || u.guest))) return 'lose';
  if (!alive(s, 'blue').length && !blue.some(u => u.left)) return 'lose';
  if (lc.tile && alive(s, 'red').some(u => u.x === lc.tile![0] && u.y === lc.tile![1])) return 'lose';
  const w = ch.win;
  switch (w.type) {
    case 'rout': if (!alive(s, 'red').length) return 'win'; break;
    case 'boss': {
      const bosses = s.units.filter(u => u.team === 'red' && u.boss);
      if (bosses.length ? bosses.every(u => u.hp <= 0) : !alive(s, 'red').length) return 'win';
      break;
    }
    case 'seize': if (s.flags?.seized) return 'win'; break;
    case 'escape': if (blue.some(u => u.left) && !alive(s, 'blue').length) return 'win'; break;
    // Holding out also ends early once every enemy is down and no reinforcement is still due.
    case 'defend': case 'survive':
      if ((s.turn > w.turns && s.phase === 'blue') || (!alive(s, 'red').length && !reinforcementsPending(s))) return 'win';
      break;
  }
  return null;
}

/** Whether `u` may seize on its current tile (ルーデウス on a seize tile). */
export function canSeize(s: State, u: Unit): boolean {
  const w = CHAPTERS[s.chapter].win;
  return w.type === 'seize' && u.id === 'rudeus' && w.tiles.some(([x, y]) => x === u.x && y === u.y);
}
/** Whether `u` may leave the map from its current tile (escape chapters). */
export function canEscape(s: State, u: Unit): boolean {
  const w = CHAPTERS[s.chapter].win;
  return w.type === 'escape' && u.team === 'blue' && w.tiles.some(([x, y]) => x === u.x && y === u.y);
}

/** Whether any reinforcement of this chapter has not appeared yet. */
export function reinforcementsPending(s: State): boolean {
  return (CHAPTERS[s.chapter].reinforce ?? []).some((w, wi) => w.units.some((_, ei) => !s.flags[`rf${wi}_${ei}`]));
}

/**
 * Reinforcements due at the start of this enemy phase. A wave whose tile is occupied waits for the next turn
 * (per unit). Returns the units placed; `appeared` receives the index of each wave that appeared for the first time.
 */
export function spawnReinforcements(s: State, appeared?: number[]): Unit[] {
  const waves = CHAPTERS[s.chapter].reinforce ?? [], out: Unit[] = [];
  let uid = Math.max(0, ...s.units.map(u => u.uid)) + 1;
  waves.forEach((w, wi) => w.units.forEach((e, ei) => {
    const f = `rf${wi}_${ei}`;
    if (s.flags[f] || s.turn < w.turn || unitAt(s, e.x, e.y)) return;
    const first = !w.units.some((_, j) => s.flags[`rf${wi}_${j}`]);
    const u = makeEnemy(e, uid++);
    s.units.push(u); s.flags[f] = true; out.push(u);
    if (first) appeared?.push(wi);
  }));
  return out;
}

// ---------- battle conversations ----------

/** Flag (in State.flags, so it is saved) marking a battle conversation as played. */
export const talkKey = (scene: string) => `talk:${scene}`;
/** Character id of a boss unit (from its name, e.g. 野盗頭ガズ → gaz), or null. */
export const bossId = (u: Unit) => (u.boss && u.team === 'red' ? idForName(u.name) : null);
const TALK_ORDER: TalkWhen['type'][] = ['firstFight', 'bossFight'];
/**
 * This chapter's battle conversations that match `test` and have not played yet: data order, except that
 * firstFight comes before bossFight when one combat sets off both.
 */
export function dueTalks(s: State, test: (w: TalkWhen) => boolean): TalkEvent[] {
  const pri = (w: TalkWhen) => { const i = TALK_ORDER.indexOf(w.type); return i < 0 ? TALK_ORDER.length : i; };
  return (CHAPTERS[s.chapter].talks ?? []).filter(e => !s.flags[talkKey(e.scene)] && test(e.when)).sort((a, b) => pri(a.when) - pri(b.when));
}
/** Conversations a combat between `a` and `b` sets off (before the fight is shown). */
export const fightTalks = (s: State, a: Unit, b: Unit) => dueTalks(s, w =>
  (w.type === 'firstFight' && [a, b].some(u => u.team === 'blue' && u.id === w.unit)) ||
  (w.type === 'bossFight' && [a, b].some(u => bossId(u) === w.boss)));

const nameOf = (id: string) => CAST[id]?.name ?? CHARS[id]?.name ?? id;
/** The goal line shown under the map, generated from the chapter data. */
export function goalText(ch: Chapter): string {
  const w = ch.win;
  const win = w.type === 'rout' ? '敵の全滅' : w.type === 'boss' ? 'ボスの撃破' : w.type === 'seize' ? '指定地点の制圧'
    : w.type === 'escape' ? '全員の離脱' : w.type === 'defend' ? `${w.turns}ターン守り切る（敵の全滅でも勝利）` : `${w.turns}ターン耐える（敵の全滅でも勝利）`;
  const lc = loseCond(ch);
  const who = [...lc.units, ...ch.players.filter(p => p.guest && !lc.units.includes(p.id)).map(p => p.id)]; // guests always count
  const lose = (who.length <= 2 ? who.map(nameOf).join('または') + 'の敗走' : who.map(nameOf).join('、') + 'のいずれかの敗走') + (lc.tile ? '、または防衛地点への敵の侵入' : '');
  return `勝利条件：${win}　／　敗北条件：${lose}`;
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
    out[k] = b ? { pts: b.rank > 0 ? b.pts : Math.max(b.pts, p.start ?? 0), rank: b.rank } : { pts: p.start ?? 0, rank: 0 };
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
export type BondStatus = 'growing' | 'ready' | 'sBlocked' | 'max';
export function bondStatus(bonds: Bonds, p: SupportPair): BondStatus {
  const b = bondOf(bonds, p), need = nextNeed(p, b);
  if (need === null) return 'max';
  if (b.pts < need) return 'growing';
  if (b.rank === 3 && !sAllowed(bonds, p)) return 'sBlocked';
  return 'ready';
}
/** Pairs whose next support conversation can play now, in data order. */
export const readyPairs = (bonds: Bonds) => SUPPORTS.filter(p => bondStatus(bonds, p) === 'ready');

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
